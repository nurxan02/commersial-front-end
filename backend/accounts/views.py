from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import login as django_login
from django.utils import timezone
from django.http import HttpResponseForbidden
from django.db.models.deletion import ProtectedError
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.contrib.auth.tokens import default_token_generator
import qrcode
import io

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    UpdatePhoneSerializer,
    ChangePasswordSerializer,
    UploadStudentDocumentSerializer,
    StudentPromoCodeSerializer,
    CreateStudentPromoCodeSerializer,
    VerifyStudentPromoCodeSerializer,
    DeliveryAddressSerializer,
    DeliveryAddressChoicesSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from .models import User, StudentPromoCode, DeliveryAddress


class RegisterView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Issue JWT similar to login for consistency
            token = AccessToken.for_user(user)
            return Response({
                'message': 'Registered',
                'access_token': str(token),
                'user': UserSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        return Response({'message': 'Validation error', 'errors': serializer.errors}, status=400)


class LoginView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            # Issue JWT access token
            token = AccessToken.for_user(user)
            data = {
                'access_token': str(token),
                'user': UserSerializer(user).data,
            }
            return Response(data)
        return Response({'message': 'İstifadəçi adı və ya parol yanlışdır!'}, status=400)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UpdatePhoneView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ser = UpdatePhoneSerializer(data=request.data)
        if ser.is_valid():
            request.user.phone = ser.validated_data['phone']
            request.user.save(update_fields=['phone'])
            return Response({'message': 'Phone updated'})
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ser = ChangePasswordSerializer(data=request.data, context={'request': request})
        if ser.is_valid():
            request.user.set_password(ser.validated_data['new_password'])
            request.user.save(update_fields=['password'])
            return Response({'message': 'Password changed'})
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)


class UploadStudentDocumentView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        ser = UploadStudentDocumentSerializer(data=request.data)
        if ser.is_valid():
            request.user.student_document = ser.validated_data['student_document']
            request.user.student_status = 'pending'
            request.user.save(update_fields=['student_document', 'student_status'])
            return Response({'message': 'Uploaded', 'student_status': 'pending'})
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)


class StudentQrView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user: User = request.user
        if user.student_status != 'approved':
            return Response({'message': 'Not approved'}, status=403)
        # Ensure a valid (latest) promo code exists for user
        code = StudentPromoCode.objects.filter(user=user, is_valid=True).first()
        if not code:
            code = StudentPromoCode.objects.create(user=user)
        # Generate a QR payload containing the UUID code
        payload = f"DEPOD-STUDENT:{user.id}:{user.email}:{code.code}"
        img = qrcode.make(payload)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        # In production you might store and return a URL; here return a data URL for simplicity
        import base64
        b64 = base64.b64encode(buf.read()).decode('ascii')
        return Response({'qr_image_url': f"data:image/png;base64,{b64}"})


class StudentDiscountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user: User = request.user
        is_student = user.student_status == 'approved'
        return Response({
            'is_student': is_student,
            'status': user.student_status,
        })


class StudentPromoCodeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Admins can see all; users see only their codes
        qs = StudentPromoCode.objects.all() if request.user.is_staff else StudentPromoCode.objects.filter(user=request.user)
        return Response(StudentPromoCodeSerializer(qs, many=True).data)

    def post(self, request):
        ser = CreateStudentPromoCodeSerializer(data=request.data, context={'request': request})
        if ser.is_valid():
            code = ser.save()
            return Response(StudentPromoCodeSerializer(code).data, status=status.HTTP_201_CREATED)
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)


class StudentPromoCodeVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only admin/staff should verify codes
        if not request.user.is_staff:
            return Response({'message': 'Forbidden'}, status=403)
        ser = VerifyStudentPromoCodeSerializer(data=request.data)
        if ser.is_valid():
            promo: StudentPromoCode = ser.validated_data['promo']
            # Mark scanned and optionally invalidate for one-time use
            if promo.is_valid:
                promo.mark_scanned()
                promo.is_valid = False
                promo.save(update_fields=['is_valid'])
            return Response(StudentPromoCodeSerializer(promo).data)
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)


class DeliveryAddressViewSet(ModelViewSet):
    serializer_class = DeliveryAddressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DeliveryAddress.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='choices')
    def get_choices(self, request):
        """Return city and district choices"""
        data = {
            'cities': DeliveryAddress.CITY_CHOICES,
            'districts': {
                'baku': DeliveryAddress.BAKU_DISTRICTS,
                'absheron': DeliveryAddress.ABSHERON_DISTRICTS,
                'sumgayit': DeliveryAddress.SUMGAYIT_DISTRICTS,
            }
        }
        return Response(data)

    @action(detail=True, methods=['post'], url_path='set-default')
    def set_default(self, request, pk=None):
        """Set address as default"""
        address = self.get_object()
        # Unset other defaults
        DeliveryAddress.objects.filter(
            user=request.user, is_default=True
        ).update(is_default=False)
        # Set this as default
        address.is_default = True
        address.save()
        return Response(self.get_serializer(address).data)

    def destroy(self, request, *args, **kwargs):
        """Safely delete an address.

        If the address is referenced by any orders (PROTECT), return 409 Conflict
        with a clear message instead of a 500. If the deleted address was the
        default one, automatically promote another address (latest) to default.
        """
        address = self.get_object()
        # Quick pre-check via reverse relation to avoid raising ProtectedError
        try:
            has_orders = False
            # Default related name from Order.delivery_address (no related_name specified)
            if hasattr(address, 'order_set'):
                has_orders = address.order_set.exists()
            if has_orders:
                return Response(
                    {"message": "Bu adres sifarişlərdə istifadə edilib və silinə bilməz."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Choose a candidate to become default if we're deleting the default one
            was_default = bool(address.is_default)
            candidate = (
                DeliveryAddress.objects.filter(user=request.user)
                .exclude(pk=address.pk)
                .order_by('-created_at')
                .first()
            )

            try:
                self.perform_destroy(address)
            except ProtectedError:
                return Response(
                    {"message": "Bu adres sifarişlərdə istifadə edilib və silinə bilməz."},
                    status=status.HTTP_409_CONFLICT,
                )

            # Promote another address to default if needed
            if was_default and candidate:
                candidate.is_default = True
                candidate.save(update_fields=['is_default'])

            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            # Fallback: don't leak internals
            return Response(
                {"message": "Adres silinərkən gözlənilməz xəta baş verdi."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        ser = PasswordResetRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data.get('user')

        # Generate and send email if user exists
        dev_reset_url = None
        if user:
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            frontend_base = getattr(settings, 'FRONTEND_BASE_URL', '')
            reset_url = f"{frontend_base.rstrip('/')}/reset-password.html?uid={uidb64}&token={token}"
            subject = "Parol sıfırlama"
            message = (
                "Salam,\n\n"
                "Parolunuzu sıfırlamaq üçün aşağıdakı linkə klikləyin:\n"
                f"{reset_url}\n\n"
                "Əgər bu tələbi siz etməmisinizsə, bu mesajı nəzərə almayın.\n\n"
                "Depod"
            )
            try:
                send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
            except Exception as e:
                # In DEBUG, surface the reset URL to help manual testing even if SMTP fails
                if settings.DEBUG:
                    dev_reset_url = reset_url
                # Avoid exposing internals in production
                # Optionally log e here

        # Always return success to avoid leaking accounts
        payload = {"message": "Əgər email mövcuddursa, parol sıfırlama bağlantısı göndərildi."}
        if settings.DEBUG and dev_reset_url:
            payload["dev_reset_url"] = dev_reset_url
        return Response(payload)


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        ser = PasswordResetConfirmSerializer(data=request.data)
        if ser.is_valid():
            user = ser.validated_data['user']
            new_password = ser.validated_data['new_password']
            user.set_password(new_password)
            user.save(update_fields=['password'])
            return Response({"message": "Parol uğurla yeniləndi"})
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)
