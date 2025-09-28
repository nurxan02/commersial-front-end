from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'provider', 'order', 'amount', 'currency', 'status', 'reference', 'session_url', 'created_at']
