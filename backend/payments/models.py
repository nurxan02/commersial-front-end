from django.db import models
from django.conf import settings


class Payment(models.Model):
    PROVIDER_CHOICES = [
        ('odero', 'OderoPay'),
    ]
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('pending', 'Pending'),
        ('authorized', 'Authorized'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    provider = models.CharField(max_length=32, choices=PROVIDER_CHOICES, default='odero')
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default='AZN')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='created')
    
    # Provider references
    reference = models.CharField(max_length=128, blank=True, null=True, help_text='Provider-side payment reference or transaction id')
    session_url = models.URLField(blank=True, null=True)
    callback_payload = models.JSONField(blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment #{self.id} — order #{self.order_id} — {self.status}"
