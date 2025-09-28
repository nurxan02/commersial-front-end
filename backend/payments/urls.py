from django.urls import path
from .views import OderoCreateSessionView, OderoCallbackView

urlpatterns = [
    path('payments/odero/create/', OderoCreateSessionView.as_view(), name='odero-create'),
    path('payments/odero/callback/', OderoCallbackView.as_view(), name='odero-callback'),
]
