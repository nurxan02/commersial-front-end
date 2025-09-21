from django.core.management.base import BaseCommand
from orders.models import Order
from orders.email_utils import send_order_confirmation_email, send_order_delivered_email


class Command(BaseCommand):
    help = 'Send test emails for orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--order_id',
            type=int,
            help='Specific order ID to send email for',
        )
        parser.add_argument(
            '--type',
            choices=['confirmation', 'delivered'],
            default='confirmation',
            help='Type of email to send (confirmation or delivered)',
        )

    def handle(self, *args, **options):
        order_id = options.get('order_id')
        email_type = options.get('type')

        if order_id:
            try:
                order = Order.objects.get(id=order_id)
                
                if email_type == 'confirmation':
                    success = send_order_confirmation_email(order)
                    email_name = "order confirmation"
                else:
                    success = send_order_delivered_email(order)
                    email_name = "delivery confirmation"
                    
                if success:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Successfully sent {email_name} email for order #{order.id} to {order.user.email}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.ERROR(
                            f'Failed to send {email_name} email for order #{order.id}'
                        )
                    )
                    
            except Order.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Order with ID {order_id} does not exist')
                )
        else:
            # Send test emails for the most recent orders
            recent_orders = Order.objects.select_related('user').order_by('-created_at')[:5]
            
            if not recent_orders:
                self.stdout.write(self.style.WARNING('No orders found'))
                return
                
            self.stdout.write(f'Sending {email_type} emails for {len(recent_orders)} recent orders...')
            
            success_count = 0
            for order in recent_orders:
                if email_type == 'confirmation':
                    success = send_order_confirmation_email(order)
                else:
                    success = send_order_delivered_email(order)
                    
                if success:
                    success_count += 1
                    self.stdout.write(f'✓ Order #{order.id} -> {order.user.email}')
                else:
                    self.stdout.write(f'✗ Order #{order.id} -> {order.user.email}')
            
            self.stdout.write(
                self.style.SUCCESS(f'Sent {success_count}/{len(recent_orders)} emails successfully')
            )
