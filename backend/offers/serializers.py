from rest_framework import serializers
from .models import Offer


class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ['id', 'first_name', 'last_name', 'phone_number', 'email', 'city', 'product', 'offer_text']
