from django.contrib import admin
from django.urls import path
from .admin_dashboard import (
    monthly_profit_data,
    sales_units_data,
    category_distribution_data,
    recent_orders_data,
    revenue_widget_data,
    profit_widget_data
)

# Include default admin URLs and dashboard data URLs
urlpatterns = [
    # Dashboard URLs first (more specific)
    path('dashboard/monthly-profit/', monthly_profit_data, name='monthly_profit_data'),
    path('dashboard/sales-units/', sales_units_data, name='sales_units_data'),
    path('dashboard/category-distribution/', category_distribution_data, name='category_distribution_data'),
    path('dashboard/recent-orders/', recent_orders_data, name='recent_orders_data'),
    path('dashboard/revenue-widget/', revenue_widget_data, name='revenue_widget_data'),
    path('dashboard/profit-widget/', profit_widget_data, name='profit_widget_data'),
    # Admin URLs (catch-all, must be last)
    path('', admin.site.urls),
]
