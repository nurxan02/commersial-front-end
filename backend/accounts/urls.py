from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    UpdatePhoneView,
    ChangePasswordView,
    UploadStudentDocumentView,
    StudentQrView,
    StudentDiscountView,
    StudentPromoCodeListCreateView,
    StudentPromoCodeVerifyView,
    DeliveryAddressViewSet,
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

router = DefaultRouter()
router.register(r'delivery-addresses', DeliveryAddressViewSet, basename='deliveryaddress')

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('password-reset/', PasswordResetRequestView.as_view()),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view()),
    path('profile/', ProfileView.as_view()),
    path('update-phone/', UpdatePhoneView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
    path('upload-student-document/', UploadStudentDocumentView.as_view()),
    path('student-qr/', StudentQrView.as_view()),
    path('student-discount/', StudentDiscountView.as_view()),
    path('student-codes/', StudentPromoCodeListCreateView.as_view()),
    path('student-codes/verify/', StudentPromoCodeVerifyView.as_view()),
    path('', include(router.urls)),
]
