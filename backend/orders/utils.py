from django.db import transaction
from catalog.models import Product


def restore_order_stock(order):
    """
    Atomically restore product stock for all items in the order.
    - Skips products with stock is None (no stock tracking).
    - Ensures in_stock is True if resulting stock > 0.
    """
    with transaction.atomic():
        for item in order.items.all():
            prod = Product.objects.select_for_update().get(pk=item.product_id)
            if prod.stock is None:
                continue
            prod.stock = (prod.stock or 0) + item.quantity
            if prod.stock > 0:
                prod.in_stock = True
            prod.save(update_fields=["stock", "in_stock"])
