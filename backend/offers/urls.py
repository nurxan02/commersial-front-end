from django.urls import path
from .views import OfferCreateView

urlpatterns = [
    path('offers/', OfferCreateView.as_view()),
]
