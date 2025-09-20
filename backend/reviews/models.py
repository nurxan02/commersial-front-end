from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from catalog.models import Product

User = get_user_model()


class ProductReview(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating from 1 to 5 stars"
    )
    comment = models.TextField(max_length=1000, help_text="Review comment")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'product')  # One review per user per product
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.email} - {self.product.name} ({self.rating}★)"

    @property
    def user_name(self):
        """Return user's display name for public viewing"""
        return self.user.get_full_name() or self.user.first_name or self.user.email.split('@')[0]
