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
    delivery_address = models.ForeignKey('accounts.DeliveryAddress', on_delete=models.PROTECT, null=True, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending')
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    estimated_delivery = models.DateTimeField()
    pricing_snapshot = models.JSONField(null=True, blank=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Store the original status to detect changes
        self._original_status = self.status

    def save(self, *args, **kwargs):
        # Check if status changed to 'delivered' before saving
        status_changed_to_delivered = (
            self.pk and  # Existing order
            self._original_status != 'delivered' and 
            self.status == 'delivered'
        )
        
        # Save the model first
        super().save(*args, **kwargs)
        
        # Update the original status after saving
        self._original_status = self.status
        
        # Trigger delivery email asynchronously if status changed to delivered
        if status_changed_to_delivered:
            import threading
            from .email_utils import send_order_delivered_email
            import logging
            
            logger = logging.getLogger(__name__)
            
            def send_delivery_email():
                try:
                    send_order_delivered_email(self)
                    logger.info(f"Delivery confirmation email sent for order #{self.id}")
                except Exception as e:
                    logger.error(f"Failed to send delivery confirmation email for order #{self.id}: {str(e)}")
            
            # Start email sending in a separate thread
            email_thread = threading.Thread(target=send_delivery_email)
            email_thread.daemon = True
            email_thread.start()

    def refresh_from_db(self, using=None, fields=None):
        """Override to update original status when refreshing from database"""
        super().refresh_from_db(using, fields)
        self._original_status = self.status

    def __str__(self):
        try:
            user_label = getattr(self.user, 'email', str(self.user))
        except Exception:
            user_label = str(self.user_id)
        return f"Order #{self.id} — {user_label}"
    
    def get_total_profit(self):
        """Calculate total profit for this order (selling price - cost price)"""
        total_profit = 0
        for item in self.items.all():
            if item.product and item.product.cost_price:
                item_profit = (item.unit_price - item.product.cost_price) * item.quantity
                total_profit += item_profit
        return total_profit


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
    
    def get_unit_profit(self):
        """Calculate profit per unit (selling price - cost price)"""
        if self.product and self.product.cost_price:
            return self.unit_price - self.product.cost_price
        return 0
    
    def get_total_profit(self):
        """Calculate total profit for this item (unit profit × quantity)"""
        return self.get_unit_profit() * self.quantity
