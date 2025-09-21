from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
import logging
import socket
import time
from smtplib import SMTPException

logger = logging.getLogger(__name__)


def _send_email_with_retry(email_instance, max_retries=3, delay=1):
    """
    Helper function to send email with retry logic and better error handling
    """
    for attempt in range(max_retries):
        try:
            email_instance.send()
            return True
        except socket.timeout:
            logger.warning(f"Email timeout on attempt {attempt + 1}/{max_retries}")
            if attempt < max_retries - 1:
                time.sleep(delay * (attempt + 1))  # Exponential backoff
            continue
        except SMTPException as e:
            logger.error(f"SMTP error on attempt {attempt + 1}/{max_retries}: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(delay * (attempt + 1))
            continue
        except Exception as e:
            logger.error(f"Unexpected error on attempt {attempt + 1}/{max_retries}: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(delay * (attempt + 1))
            continue
    
    return False


def send_order_confirmation_email(order):
    """
    Send professional order confirmation email with anti-spam measures and retry logic
    """
    try:
        if not order.user.email:
            logger.warning(f"No email address for user {order.user.id}")
            return False
            
        # Professional subject line (avoid spam keywords)
        subject = f"Depod.az - Sifariş #{order.id} Təsdiqləndi"
        
        # Render HTML content
        html_content = render_to_string('emails/order_confirmation.html', {
            'order': order,
            'user': order.user,
            'site_name': 'Depod.az',
            'support_email': 'info@depod.az',
            'current_year': timezone.now().year,
        })
        
        # Create plain text version
        text_content = f"""
Hörmətli {order.user.first_name or order.user.email},

Sifarişiniz uğurla qəbul edildi!

Sifariş məlumatları:
- Sifariş nömrəsi: #{order.id}
- Tarix: {order.created_at.strftime('%d %B %Y, %H:%M')}
- Cəmi məbləğ: {order.total_price} AZN
- Status: Gözləyir

Məhsullar:
"""
        
        for item in order.items.all():
            text_content += f"- {item.name} × {item.quantity} = {item.subtotal} AZN\n"
        
        text_content += f"""
Təxmini çatdırılma tarixi: {order.estimated_delivery.strftime('%d %B %Y')}

Sifarişiniz barədə yenilik olduqda sizə məlumat veriləcək.

Əlaqə üçün: info@depod.az

Təşəkkürlər,
DEPOD.AZ
"""
        
        # Check if email backend is console (development)
        if hasattr(settings, 'EMAIL_BACKEND') and 'console' in settings.EMAIL_BACKEND.lower():
            logger.info(f"Console email backend detected. Order confirmation email content for #{order.id}:")
            logger.info(f"To: {order.user.email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"HTML length: {len(html_content)} characters")
            return True
        
        # Send email only if email backend is properly configured
        if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
            # Professional from address - fix format issue
            default_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'orders@depod.az')
            if '<' in default_email and '>' in default_email:
                from_email = default_email
            else:
                from_email = f"Depod Orders <{default_email}>"
            
            # Create email with anti-spam headers
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[order.user.email],
                headers={
                    'Reply-To': 'info@depod.az',
                    'X-Mailer': 'Depod E-commerce System',
                    'X-Priority': '3',  # Normal priority
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal',
                    'List-Unsubscribe': f'<mailto:unsubscribe@depod.az?subject=Unsubscribe_{order.user.id}>',
                    'Message-ID': f'<order_{order.id}_{timezone.now().timestamp()}@depod.az>',
                }
            )
            email.attach_alternative(html_content, "text/html")
            
            # Send email with retry logic
            success = _send_email_with_retry(email, max_retries=3, delay=2)
            
            if success:
                logger.info(f"Order confirmation email sent to {order.user.email} for order #{order.id}")
                return True
            else:
                logger.error(f"Failed to send order confirmation email for order #{order.id} after 3 retries")
                return False
        else:
            logger.info(f"Email not configured. Would send order confirmation to {order.user.email} for order #{order.id}")
            return True
            
    except Exception as e:
        logger.error(f"Failed to send order confirmation email for order #{order.id}: {str(e)}")
        # Don't let email errors break order creation
        return False


def send_order_delivered_email(order):
    """
    Send professional delivery confirmation email with anti-spam measures
    """
    try:
        if not order.user.email:
            logger.warning(f"No email address for user {order.user.id}")
            return False
            
        # Professional subject line (avoid spam keywords)
        subject = f"Depod.az - Sifariş #{order.id} Təslim Edildi"
        
        # Render HTML content
        html_content = render_to_string('emails/order_delivered.html', {
            'order': order,
            'user': order.user,
            'site_name': 'Depod.az',
            'support_email': 'info@depod.az',
            'current_year': timezone.now().year,
        })
        
        # Create plain text version
        text_content = f"""
Hörmətli {order.user.first_name or order.user.email},

Sifarişiniz uğurla çatdırıldı! 🎉

Sifariş məlumatları:
- Sifariş nömrəsi: #{order.id}
- Çatdırılma tarixi: {timezone.now().strftime('%d %B %Y')}
- Status: Təslim edildi

Çatdırılan məhsullar:
"""
        
        for item in order.items.all():
            text_content += f"- {item.name} × {item.quantity}\n"
        
        text_content += f"""
DEPOD.AZ-dan alış-veriş etdiyiniz üçün təşəkkür edirik!

Məhsullarımızdan razı qaldınız? Rəyinizi bildirərək digər müştərilərə kömək edin.

Əlaqə üçün:
📧 info@depod.az
📞 +994XX XXX XX XX

Təşəkkürlər,
DEPOD.AZ
"""
        
        # Check if email backend is console (development)
        if hasattr(settings, 'EMAIL_BACKEND') and 'console' in settings.EMAIL_BACKEND.lower():
            logger.info(f"Console email backend detected. Delivery confirmation email content for #{order.id}:")
            logger.info(f"To: {order.user.email}")
            logger.info(f"Subject: {subject}")
            logger.info(f"HTML length: {len(html_content)} characters")
            return True
        
        # Send email only if email backend is properly configured
        if hasattr(settings, 'EMAIL_HOST') and settings.EMAIL_HOST:
            # Professional from address - fix format issue
            default_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'orders@depod.az')
            if '<' in default_email and '>' in default_email:
                from_email = default_email
            else:
                from_email = f"Depod Delivery <{default_email}>"
            
            # Create email with anti-spam headers
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[order.user.email],
                headers={
                    'Reply-To': 'info@depod.az',
                    'X-Mailer': 'Depod E-commerce System',
                    'X-Priority': '3',  # Normal priority
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal',
                    'List-Unsubscribe': f'<mailto:unsubscribe@depod.az?subject=Unsubscribe_{order.user.id}>',
                    'Message-ID': f'<delivery_{order.id}_{timezone.now().timestamp()}@depod.az>',
                }
            )
            email.attach_alternative(html_content, "text/html")
            
            # Send email with retry logic
            success = _send_email_with_retry(email, max_retries=3, delay=2)
            
            if success:
                logger.info(f"Delivery confirmation email sent to {order.user.email} for order #{order.id}")
                return True
            else:
                logger.error(f"Failed to send delivery confirmation email for order #{order.id} after 3 retries")
                return False
        else:
            logger.info(f"Email not configured. Would send delivery confirmation to {order.user.email} for order #{order.id}")
            return True
            
    except Exception as e:
        logger.error(f"Failed to send delivery confirmation email for order #{order.id}: {str(e)}")
        # Don't let email errors break order status updates
        return False
