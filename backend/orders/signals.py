from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Order
from depod_api.integrations.telegram import notify_new_order


@receiver(post_save, sender=Order)
def order_created_notify(sender, instance: Order, created: bool, **kwargs):
    if created:
        # Fire async notification; best-effort
        notify_new_order(instance)
