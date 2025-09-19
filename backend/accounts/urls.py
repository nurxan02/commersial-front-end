from django.urls import path
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    UpdatePhoneView,
    ChangePasswordView,
    UploadStudentDocumentView,
    StudentQrView,
    StudentDiscountView
)

urlpatterns = [
    path('auth/register/', RegisterView.as_view()),
    path('auth/login/', LoginView.as_view()),
    path('auth/profile/', ProfileView.as_view()),
    path('auth/update-phone/', UpdatePhoneView.as_view()),
    path('auth/change-password/', ChangePasswordView.as_view()),
    path('auth/upload-student-document/', UploadStudentDocumentView.as_view()),
    path('auth/student-qr/', StudentQrView.as_view()),
    path('auth/student-discount/', StudentDiscountView.as_view()),
]
