from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Order
from depod_api.integrations.telegram import notify_new_order
from .email_utils import send_order_confirmation_email
import logging
import threading

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Order)
def order_created_notify(sender, instance: Order, created: bool, **kwargs):
    """
    Handle new order creation - send confirmation email and Telegram notification
    """
    if created:
        # Fire async Telegram notification; best-effort
        try:
            notify_new_order(instance)
        except Exception as e:
            logger.error(f"Failed to send Telegram notification for order #{instance.id}: {str(e)}")
        
        # Send order confirmation email asynchronously to avoid database locks
        def send_email():
            try:
                send_order_confirmation_email(instance)
                logger.info(f"Order confirmation email sent for order #{instance.id}")
            except Exception as e:
                logger.error(f"Failed to send order confirmation email for order #{instance.id}: {str(e)}")
        
        # Start email sending in a separate thread
        email_thread = threading.Thread(target=send_email)
        email_thread.daemon = True
        email_thread.start()
