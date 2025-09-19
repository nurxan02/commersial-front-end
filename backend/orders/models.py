from django.db import models
from django.conf import settings
from catalog.models import Product


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    estimated_delivery = models.DateTimeField()
    pricing_snapshot = models.JSONField(null=True, blank=True)

    def __str__(self):
        try:
            user_label = getattr(self.user, 'email', str(self.user))
        except Exception:
            user_label = str(self.user_id)
        return f"Order #{self.id} — {user_label}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    name = models.CharField(max_length=255)
    image = models.URLField()
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        # Prefer stored name so it remains accurate even if product is renamed later
        base = self.name or (self.product.name if self.product_id else f"Item #{self.id}")
        return f"{base} × {self.quantity}"
