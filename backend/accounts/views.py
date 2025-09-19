from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import login as django_login
from django.utils import timezone
from django.http import HttpResponseForbidden
import qrcode
import io

from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    UpdatePhoneSerializer,
    ChangePasswordSerializer,
    UploadStudentDocumentSerializer,
)
from .models import User


class RegisterView(APIView):
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({'message': 'Registered'}, status=status.HTTP_201_CREATED)
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
        return Response({'message': 'Invalid credentials'}, status=400)


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
        # Generate a simple QR payload
        payload = f"DEPOD-STUDENT:{user.id}:{user.email}"
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
