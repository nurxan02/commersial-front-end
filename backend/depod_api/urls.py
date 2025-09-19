from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.templatetags.static import static as static_tag

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('depod_api.v1_urls')),
    # Root-level favicon convenience
    path('favicon.ico', RedirectView.as_view(url=static_tag('favicon.ico'), permanent=True)),
    path('favicon.svg', RedirectView.as_view(url=static_tag('favicon.svg'), permanent=True)),
]

# Serve media in dev
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
