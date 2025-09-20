import os
import time
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
from django.templatetags.static import static
from django.urls import reverse_lazy
from django.utils.translation import gettext_lazy as _

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-me')
DEBUG = os.getenv('DEBUG', '1') == '1'

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')
# Allow Django test client host during development
if DEBUG and 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

INSTALLED_APPS = [
    'unfold',  # before django.contrib.admin
    'unfold.contrib.forms',  # optional, special form elements
    'unfold.contrib.inlines',  # optional, special inlines
    # 'unfold.contrib.filters',  # enable if needed later
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'rest_framework',
    'corsheaders',
    'rest_framework_simplejwt',

    'accounts',
    'catalog',
    'orders',
    'offers',
    'cms',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'depod_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'depod_api.wsgi.application'

# Database
USE_SQLITE = os.getenv('USE_SQLITE', '0') == '1'
if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('POSTGRES_DB', 'depod'),
            'USER': os.getenv('POSTGRES_USER', 'depod'),
            'PASSWORD': os.getenv('POSTGRES_PASSWORD', 'depod'),
            'HOST': os.getenv('POSTGRES_HOST', '127.0.0.1'),
            'PORT': os.getenv('POSTGRES_PORT', '5432'),
        }
    }

AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Languages available in admin (will be shown in Unfold switcher)
LANGUAGES = (
    ('az', _('Azerbaijani')),
    ('en', _('English')),
    ('ru', _('Russian')),
    ('tr', _('Turkish')),
    ('fr', _('French')),
)

# Optional: place project-specific .po/.mo files here if you customize strings
LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    # Project-level static path for brand assets and others
    (BASE_DIR / 'static'),
    # Expose existing repo assets if still needed elsewhere
    (BASE_DIR.parent / 'favicon'),
    (BASE_DIR.parent / 'image'),
]

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
    # API uses only JWT authentication; admin panel still uses Django sessions (not DRF)
    'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 12,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'EXCEPTION_HANDLER': 'depod_api.utils.custom_exception_handler',
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_MINUTES', '60'))),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.getenv('CORS_ALLOWED_ORIGINS', 'http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000').split(',') if o.strip()
]
CORS_ALLOW_HEADERS = list(os.getenv('CORS_ALLOW_HEADERS', 'authorization,content-type,accept,x-requested-with,x-csrftoken').split(','))

# CSRF trusted origins (must include scheme)
CSRF_TRUSTED_ORIGINS = [
    o.strip() for o in os.getenv('CSRF_TRUSTED_ORIGINS', 'http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8000').split(',') if o.strip()
]

# Cookie SameSite defaults (override via env if needed)
SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax')
CSRF_COOKIE_SAMESITE = os.getenv('CSRF_COOKIE_SAMESITE', 'Lax')

# Security hardening (prod)
if not DEBUG:
    # Enforce HTTPS
    SECURE_SSL_REDIRECT = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # Strict transport security
    SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

    # Secure cookies
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    # In prod, prefer HttpOnly for CSRF cookie (templates/forms still work)
    CSRF_COOKIE_HTTPONLY = True

    # Sensible defaults
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    X_FRAME_OPTIONS = 'DENY'

# Static assets cache busting for admin logos/icons
# If env var not provided, default to server start timestamp to force refresh
STATIC_ASSETS_VERSION = os.getenv('STATIC_ASSETS_VERSION', str(int(time.time())))

# Unfold admin configuration: branding, colors, icons, and assets
UNFOLD = {
    # Titles and branding texts
    "SITE_TITLE": "Depod Admin",
    "SITE_HEADER": "Depod",
    "SITE_SUBHEADER": "E-ticarət idarə paneli",
    # Show language selector in top-right
    "SHOW_LANGUAGES": True,

    # Clickable logo target and "View site" link
    "SITE_URL": "https://depod.az",

    # Logo and icon (light/dark use same asset for now)
    # Icon used by header/sidebar (favicon-style)
    "SITE_ICON": {
        "light": lambda request: f"{static('brand/favicon.svg')}?v={STATIC_ASSETS_VERSION}",
        "dark": lambda request: f"{static('brand/favicon.svg')}?v={STATIC_ASSETS_VERSION}",
    },
    "SITE_LOGO": {
    # Provided from backend/static/brand/logo.png
    "light": lambda request: f"{static('brand/logo.png')}?v={STATIC_ASSETS_VERSION}",
    "dark": lambda request: f"{static('brand/logo.png')}?v={STATIC_ASSETS_VERSION}",
    },

    # Favicon set (re-use existing repo favicons)
    "SITE_FAVICONS": [
    {"rel": "icon", "type": "image/svg+xml", "href": lambda request: f"{static('brand/favicon.svg')}?v={STATIC_ASSETS_VERSION}"},
    {"rel": "icon", "sizes": "96x96", "type": "image/png", "href": lambda request: f"{static('brand/favicon-96x96.png')}?v={STATIC_ASSETS_VERSION}"},
    {"rel": "apple-touch-icon", "sizes": "180x180", "href": lambda request: f"{static('brand/apple-touch-icon.png')}?v={STATIC_ASSETS_VERSION}"},
    {"rel": "manifest", "href": lambda request: f"{static('brand/site.webmanifest')}?v={STATIC_ASSETS_VERSION}"},
    ],

    # Do not force THEME; leaving it unset enables the light/dark switcher.
    # "THEME": "dark",

    # Minimal custom colors: base as dark navy (slate-like), primary as light blue (sky-like)
    "COLORS": {
        "base": {
            "50": "#f8fafc",
            "100": "#f1f5f9",
            "200": "#e2e8f0",
            "300": "#cbd5e1",
            "400": "#94a3b8",
            "500": "#64748b",
            "600": "#475569",
            "700": "#334155",
            "800": "#1f2937",
            "900": "#0f172a",
            "950": "#020617",
        },
        "primary": {
            "50": "#f0f9ff",
            "100": "#e0f2fe",
            "200": "#bae6fd",
            "300": "#7dd3fc",
            "400": "#38bdf8",
            "500": "#0ea5e9",
            "600": "#0284c7",
            "700": "#0369a1",
            "800": "#075985",
            "900": "#0c4a6e",
            "950": "#082f49",
        },
    },

    # Sidebar navigation with icons for each model
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,
        "navigation": [
            {
                "title": _("İdarəetmə"),
                "separator": True,
                "items": [
                    {"title": _("Dashboard"), "icon": "dashboard", "link": reverse_lazy("admin:index")},
                ],
            },
            {
                "title": _("Kataloq"),
                "items": [
                    {"title": _("Kateqoriyalar"), "icon": "category", "link": reverse_lazy("admin:catalog_category_changelist")},
                    {"title": _("Məhsullar"), "icon": "inventory_2", "link": reverse_lazy("admin:catalog_product_changelist")},
                    {"title": _("Məhsul şəkilləri"), "icon": "image", "link": reverse_lazy("admin:catalog_productimage_changelist")},
                ],
            },
            {
                "title": _("Sifarişlər"),
                "items": [
                    {"title": _("Sifarişlər"), "icon": "receipt_long", "link": reverse_lazy("admin:orders_order_changelist")},
                    {"title": _("Sifariş bəndləri"), "icon": "list_alt", "link": reverse_lazy("admin:orders_orderitem_changelist")},
                ],
            },
            {
                "title": _("Təkliflər"),
                "items": [
                    {"title": _("Təkliflər"), "icon": "sell", "link": reverse_lazy("admin:offers_offer_changelist")},
                ],
            },
            {
                "title": _("Məzmun"),
                "items": [
                    {"title": _("Sayt ayarları"), "icon": "settings", "link": reverse_lazy("admin:cms_sitesettings_changelist")},
                    {"title": _("Haqqımızda"), "icon": "info", "link": reverse_lazy("admin:cms_aboutcontent_changelist")},
                    {"title": _("Əlaqə məzmunu"), "icon": "contact_support", "link": reverse_lazy("admin:cms_contactcontent_changelist")},
                    {"title": _("Mesajlar"), "icon": "mail", "link": reverse_lazy("admin:cms_contactmessage_changelist")},
                ],
            },
            {
                "title": _("İstifadəçilər"),
                "items": [
                    {"title": _("İstifadəçilər"), "icon": "person", "link": reverse_lazy("admin:accounts_user_changelist")},
                    {"title": _("Qruplar"), "icon": "groups", "link": reverse_lazy("admin:auth_group_changelist")},
                    {"title": _("Tələbə endirim kodları"), "icon": "qr_code", "link": reverse_lazy("admin:accounts_studentpromocode_changelist")},
                ],
            },
        ],
    },
}

