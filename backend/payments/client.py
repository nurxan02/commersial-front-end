import hmac
import hashlib
import base64
from urllib.parse import urljoin
from django.conf import settings


class OderoClient:
    def __init__(self):
        # Sandbox API gateway base (for server-side API calls)
        self.api_base = settings.ODERO_BASE_URL.rstrip('/') + '/'
        # Some providers use a separate hosted payment page base; if not provided, fall back to API base
        self.base_url = getattr(settings, 'ODERO_PAYMENT_BASE_URL', self.api_base).rstrip('/') + '/'
        self.merchant_id = settings.ODERO_MERCHANT_ID
        self.api_key = getattr(settings, 'ODERO_API_KEY', '')
        self.secret_key = settings.ODERO_SECRET_KEY.encode('utf-8') if settings.ODERO_SECRET_KEY else b''
        self.currency = settings.ODERO_CURRENCY

    def sign(self, payload: str) -> str:
        # Placeholder HMAC signature (verify with Odero docs)
        hm = hmac.new(self.secret_key, payload.encode('utf-8'), hashlib.sha256)
        return base64.b64encode(hm.digest()).decode('utf-8')

    def create_session_payload(self, *, order_id: int, amount: str, description: str, success_url: str, fail_url: str, cancel_url: str):
        # Build payload expected by Odero; exact fields may differ by API
        data = {
            'merchant_id': self.merchant_id,
            'api_key': self.api_key,
            'order_id': str(order_id),
            'amount': str(amount),
            'currency': self.currency,
            'description': description,
            'success_url': success_url,
            'fail_url': fail_url,
            'cancel_url': cancel_url,
        }
        # Depending on Odero requirements, the signature could be over concatenated values
        signature_base = '|'.join([data['merchant_id'], data['order_id'], data['amount'], data['currency']])
        data['signature'] = self.sign(signature_base)
        return data

    def build_redirect_url(self, params: dict) -> str:
        # Some gateways prefer GET redirect with signed query; others require POST form.
        # For now, construct a GET URL for redirect.
        from urllib.parse import urlencode
        return self.base_url + '?' + urlencode(params)
