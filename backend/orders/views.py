from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from django.db import transaction
from .utils import restore_order_stock

from .models import Order, OrderItem
from .serializers import OrderSerializer, CreateOrderSerializer
from catalog.models import Product


class IsOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.user == request.user


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        ser = CreateOrderSerializer(data=request.data, context={'request': request})
        ser.is_valid(raise_exception=True)
        product_id = ser.validated_data['product_id']
        quantity = ser.validated_data['quantity']
        delivery_address_id = ser.validated_data['delivery_address_id']
        pricing_snapshot = ser.validated_data.get('pricing_snapshot')

        # Get delivery address
        from accounts.models import DeliveryAddress
        delivery_address = DeliveryAddress.objects.get(id=delivery_address_id, user=request.user)

        # Work in a transaction to avoid overselling; lock product row
        with transaction.atomic():
            product = (
                Product.objects.select_for_update()
                .select_related('category')
                .prefetch_related('images')
                .get(id=product_id)
            )

            # Server recompute unit price
            price = Decimal(product.price)
            original_price = price
            discount_applied = None
            student_discount_applied = None
            
            # Apply product discount first
            if product.discount and product.discounted_price:
                price = Decimal(product.discounted_price)
                discount_applied = product.discount

            # Student pricing if user approved
            if request.user.student_status == 'approved' and product.student_discount:
                price = (price * (Decimal('1.00') - Decimal(product.student_discount) / Decimal('100'))).quantize(Decimal('0.01'))
                student_discount_applied = product.student_discount

            unit_price = price
            subtotal = (unit_price * quantity).quantize(Decimal('0.01'))
            total_price = subtotal

            # Enhanced pricing snapshot to include discount details
            enhanced_snapshot = {
                'original_price': float(original_price),
                'final_unit_price': float(unit_price),
                'product_discount': discount_applied,
                'student_discount_applied': student_discount_applied,
                'user_student_status': request.user.student_status,
                'quantity': quantity,
                'subtotal': float(subtotal),
                'total': float(total_price),
                'timestamp': timezone.now().isoformat(),
            }
            
            # Merge with any frontend snapshot
            if pricing_snapshot:
                enhanced_snapshot.update(pricing_snapshot)

            # If stock tracking enabled, validate and deduct
            if product.stock is not None:
                if product.stock < quantity:
                    return Response({'message': 'Yetərli stok yoxdur'}, status=status.HTTP_400_BAD_REQUEST)
                product.stock = product.stock - quantity
                # Update in_stock flag accordingly
                if product.stock <= 0:
                    product.stock = 0
                    product.in_stock = False
                else:
                    product.in_stock = True
                product.save(update_fields=['stock', 'in_stock'])

            order = Order.objects.create(
                user=request.user,
                delivery_address=delivery_address,
                status='pending',
                total_price=total_price,
                estimated_delivery=timezone.now() + timedelta(days=3),
                pricing_snapshot=enhanced_snapshot,
            )

            # pick main image URL
            main_image_url = None
            if product.main_image:
                main_image_url = request.build_absolute_uri(product.main_image.url)
            else:
                main = product.images.filter(is_main=True).first()
                if main:
                    main_image_url = request.build_absolute_uri(main.image.url)

            OrderItem.objects.create(
                order=order,
                product=product,
                name=product.name,
                image=main_image_url or '',
                quantity=quantity,
                unit_price=unit_price,
                subtotal=subtotal,
            )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        order = self.get_object()
        status_value = request.data.get('status')
        # Allow user cancel
        if status_value == 'cancelled' and order.status == 'pending' and order.user == request.user:
            restore_order_stock(order)
            order.status = 'cancelled'
            order.save(update_fields=['status'])
            return Response(OrderSerializer(order).data)
        # Otherwise, forbid (admin-only in real app)
        return Response({'message': 'Forbidden'}, status=403)
