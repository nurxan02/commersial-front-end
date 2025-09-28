from django.urls import path, include
from accounts.views import StudentDiscountView
from rest_framework.routers import DefaultRouter

# Routers for ViewSets
router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    # Auth endpoints
    path('auth/', include('accounts.urls')),
    # Student discount (top-level for frontend helper)
    path('student-discount/', StudentDiscountView.as_view()),
    # Catalog endpoints
    path('', include('catalog.urls')),
    # Orders endpoints
    path('', include('orders.urls')),
    # Offers endpoint
    path('', include('offers.urls')),
    # CMS endpoints
    path('', include('cms.urls')),
    # Reviews endpoints
    path('', include('reviews.urls')),
    # Payments endpoints
    path('', include('payments.urls')),
]
