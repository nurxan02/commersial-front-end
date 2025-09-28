from decimal import Decimal
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from orders.models import Order
from .models import Payment
from .client import OderoClient


class OderoCreateSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({"detail": "order_id is required"}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, id=order_id, user=request.user)

        amount = Decimal(order.total_price).quantize(Decimal('0.01'))
        client = OderoClient()
        description = f"Depod Order #{order.id}"

        # Success/fail/cancel URLs with order context
        success_url = f"{settings.ODERO_SUCCESS_URL}?orderId={order.id}&status=success"
        fail_url = f"{settings.ODERO_FAIL_URL}?orderId={order.id}&status=failed"
        cancel_url = f"{settings.ODERO_CANCEL_URL}?orderId={order.id}&status=cancelled"

        payload = client.create_session_payload(
            order_id=order.id,
            amount=str(amount),
            description=description,
            success_url=success_url,
            fail_url=fail_url,
            cancel_url=cancel_url,
        )

        # For initial milestone, we will redirect via constructed GET URL
        redirect_url = client.build_redirect_url(payload)

        payment = Payment.objects.create(
            provider='odero',
            order=order,
            amount=amount,
            currency=settings.ODERO_CURRENCY,
            status='pending',
            session_url=redirect_url,
        )

        return Response({
            'payment_id': payment.id,
            'payment_url': redirect_url,
        }, status=status.HTTP_201_CREATED)


class OderoCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        # TODO: validate signature based on Odero docs
        data = request.data
        order_id = data.get('order_id') or data.get('orderId')
        status_str = (data.get('status') or '').lower()
        reference = data.get('reference') or data.get('transaction_id')

        if not order_id:
            return Response({"detail": "order_id missing"}, status=status.HTTP_400_BAD_REQUEST)

        order = get_object_or_404(Order, id=order_id)
        payment = order.payments.order_by('-id').first()
        if not payment:
            # create a record to keep callback payload
            payment = Payment.objects.create(provider='odero', order=order, amount=order.total_price, currency=settings.ODERO_CURRENCY)

        payment.callback_payload = data
        if reference:
            payment.reference = reference

        if status_str in ('paid', 'success', 'authorized'):
            payment.status = 'paid'
            # Do not auto-set order delivered here; mark as processing
            if order.status == 'pending':
                order.status = 'processing'
                order.save(update_fields=['status'])
        elif status_str in ('failed', 'error', 'declined'):
            payment.status = 'failed'
        elif status_str in ('cancelled', 'canceled'):
            payment.status = 'cancelled'
        else:
            payment.status = 'pending'

        payment.save()
        return Response({"ok": True})
