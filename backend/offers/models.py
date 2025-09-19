from django.db import models
from django.conf import settings
from catalog.models import Product


class Offer(models.Model):
    STATUS_CHOICES = [
        ('new', 'New'),
        ('reviewed', 'Reviewed'),
        ('closed', 'Closed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=32)
    email = models.EmailField(null=True, blank=True)
    city = models.CharField(max_length=120)
    offer_text = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='new')
    created_at = models.DateTimeField(auto_now_add=True)
