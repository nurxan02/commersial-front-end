from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Test email delivery and spam score'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            help='Email address to send test email to',
            required=True
        )

    def handle(self, *args, **options):
        test_email = options['email']
        
        self.stdout.write(self.style.SUCCESS(f'🧪 Testing email delivery to: {test_email}'))
        
        # Test email content with anti-spam measures
        subject = "Depod.az - Test Email Delivery"
        
        html_content = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">DEPOD.AZ</h1>
            <p style="margin: 10px 0 0 0;">Test Email Delivery</p>
        </div>
        
        <div style="background: white; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #1a202c;">Email Test Successful! ✅</h2>
            
            <p>This is a test email from Depod.az e-commerce system.</p>
            
            <p><strong>Test Details:</strong></p>
            <ul>
                <li>Sent at: """ + timezone.now().strftime('%d %B %Y, %H:%M') + """</li>
                <li>From: """ + settings.DEFAULT_FROM_EMAIL + """</li>
                <li>To: """ + test_email + """</li>
                <li>Email Backend: """ + settings.EMAIL_BACKEND + """</li>
            </ul>
            
            <p>If you received this email, the delivery system is working correctly.</p>
        </div>
        
        <div style="background: #2d3748; color: white; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; margin-top: 10px;">
            <p style="margin: 0; font-size: 14px;">DEPOD.AZ E-commerce System</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">info@depod.az</p>
        </div>
    </div>
</body>
</html>
        """
        
        text_content = f"""
DEPOD.AZ - Test Email Delivery

Email Test Successful! ✅

This is a test email from Depod.az e-commerce system.

Test Details:
- Sent at: {timezone.now().strftime('%d %B %Y, %H:%M')}
- From: {settings.DEFAULT_FROM_EMAIL}
- To: {test_email}
- Email Backend: {settings.EMAIL_BACKEND}

If you received this email, the delivery system is working correctly.

DEPOD.AZ E-commerce System
info@depod.az
        """
        
        try:
            # Create professional email with anti-spam headers
            default_email = settings.DEFAULT_FROM_EMAIL
            if '<' in default_email and '>' in default_email:
                from_email = default_email
            else:
                from_email = f"Depod System <{default_email}>"
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=[test_email],
                headers={
                    'Reply-To': 'info@depod.az',
                    'X-Mailer': 'Depod E-commerce System',
                    'X-Priority': '3',
                    'X-MSMail-Priority': 'Normal',
                    'Importance': 'Normal',
                    'Message-ID': f'<test_{timezone.now().timestamp()}@depod.az>',
                }
            )
            email.attach_alternative(html_content, "text/html")
            
            # Import the retry function
            from orders.email_utils import _send_email_with_retry
            
            # Send email with retry logic
            success = _send_email_with_retry(email, max_retries=3, delay=1)
            
            if success:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Test email sent successfully to {test_email}')
                )
            else:
                self.stdout.write(
                    self.style.ERROR(f'❌ Failed to send test email to {test_email} after 3 retries')
                )
            
            self.stdout.write(
                self.style.WARNING('📝 Tips to avoid spam:')
            )
            self.stdout.write('1. Use a professional SMTP service (SendGrid, Mailgun, SES)')
            self.stdout.write('2. Set up SPF, DKIM, and DMARC records for your domain')
            self.stdout.write('3. Use a real domain email address (not Gmail)')
            self.stdout.write('4. Maintain good sender reputation')
            self.stdout.write('5. Monitor spam complaints and bounces')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Failed to send test email: {str(e)}')
            )
            logger.error(f"Test email failed: {str(e)}")
