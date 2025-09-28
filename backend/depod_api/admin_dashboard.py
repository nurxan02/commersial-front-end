from django.urls import path
from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.http import JsonResponse
from django.db.models import Sum, Count, F, Q
from django.db.models.functions import TruncDate, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import datetime, timedelta
from orders.models import Order, OrderItem
from catalog.models import Product, Category
from accounts.models import User
import json


@staff_member_required
def monthly_profit_data(request):
    """Monthly profit chart data (price - cost_price) - only delivered orders."""
    # Get orders from last 12 months
    twelve_months_ago = timezone.now() - timedelta(days=365)
    
    # Calculate monthly profit from order items - only delivered orders
    monthly_data = (
        OrderItem.objects
        .filter(
            order__created_at__gte=twelve_months_ago,
            order__status='delivered'
        )
        .annotate(month=TruncMonth('order__created_at'))
        .values('month')
        .annotate(
            total_revenue=Sum('subtotal'),
            total_cost=Sum(F('quantity') * F('product__cost_price'))
        )
        .annotate(profit=F('total_revenue') - F('total_cost'))
        .order_by('month')
    )
    
    # Format data for Chart.js
    labels = []
    profits = []
    
    for data in monthly_data:
        if data['month']:
            labels.append(data['month'].strftime('%Y-%m'))
            profits.append(float(data['profit'] or 0))
    
    return JsonResponse({
        'labels': labels,
        'datasets': [{
            'label': 'Mənfəət',
            'data': profits,
            'backgroundColor': 'rgba(59, 130, 246, 0.5)',
            'borderColor': 'rgb(59, 130, 246)',
            'borderWidth': 1
        }]
    })


@staff_member_required
def sales_units_data(request):
    """Daily, weekly, and monthly unit sales data - only delivered orders."""
    now = timezone.now()
    
    # Daily sales (today) - only delivered orders
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    daily_sales = OrderItem.objects.filter(
        order__created_at__gte=today_start,
        order__status='delivered'
    ).aggregate(total=Sum('quantity'))['total'] or 0
    
    # Weekly sales (last 7 days) - only delivered orders
    week_start = now - timedelta(days=7)
    weekly_sales = OrderItem.objects.filter(
        order__created_at__gte=week_start,
        order__status='delivered'
    ).aggregate(total=Sum('quantity'))['total'] or 0
    
    # Monthly sales (last 30 days) - only delivered orders
    month_start = now - timedelta(days=30)
    monthly_sales = OrderItem.objects.filter(
        order__created_at__gte=month_start,
        order__status='delivered'
    ).aggregate(total=Sum('quantity'))['total'] or 0
    
    # Daily chart data (last 7 days) - only delivered orders
    daily_chart_data = []
    daily_labels = []
    
    for i in range(7):
        day = now - timedelta(days=6-i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_sales = OrderItem.objects.filter(
            order__created_at__gte=day_start,
            order__created_at__lt=day_end,
            order__status='delivered'
        ).aggregate(total=Sum('quantity'))['total'] or 0
        
        daily_chart_data.append(day_sales)
        daily_labels.append(day.strftime('%m/%d'))
    
    return JsonResponse({
        'daily': daily_sales,
        'weekly': weekly_sales,
        'monthly': monthly_sales,
        'daily_chart': {
            'labels': daily_labels,
            'datasets': [{
                'label': 'Satış',
                'data': daily_chart_data,
                'backgroundColor': 'rgba(16, 185, 129, 0.5)',
                'borderColor': 'rgb(16, 185, 129)',
                'borderWidth': 1
            }]
        }
    })


@staff_member_required
def category_distribution_data(request):
    """Category distribution pie chart data - only delivered orders."""
    # Get sales by category - only delivered orders
    category_data = (
        OrderItem.objects
        .filter(order__status='delivered')
        .values('product__category__name')
        .annotate(total_quantity=Sum('quantity'))
        .order_by('-total_quantity')
    )
    
    labels = []
    data = []
    
    for item in category_data:
        if item['product__category__name']:
            labels.append(item['product__category__name'])
            data.append(item['total_quantity'])
    
    return JsonResponse({
        'labels': labels,
        'datasets': [{
            'data': data,
            'backgroundColor': [
                '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
                '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
            ]
        }]
    })


@staff_member_required
def recent_orders_data(request):
    """Recent orders table data."""
    recent_orders = Order.objects.select_related('user').prefetch_related('items__product').order_by('-created_at')[:10]
    
    orders_data = []
    for order in recent_orders:
        # Get first product name (simplified)
        first_product = order.items.first()
        product_name = first_product.product.name if first_product else 'No items'
        
        orders_data.append({
            'id': order.id,
            'customer_name': f"{order.user.first_name} {order.user.last_name}",
            'customer_email': order.user.email,
            'product': product_name,
            'total': float(order.total_price),
            'status': order.status,
            'status_display': order.get_status_display(),
            'created_at': order.created_at.strftime('%d.%m.%Y %H:%M')
        })
    
    return JsonResponse({
        'orders': orders_data
    })


@staff_member_required
def revenue_widget_data(request):
    """Total revenue widget data - only delivered orders."""
    # Calculate total revenue from delivered orders only
    total_revenue = Order.objects.filter(
        status='delivered'
    ).aggregate(
        total=Sum('total_price')
    )['total'] or 0
    
    # Revenue from last 30 days - only delivered orders
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_revenue = Order.objects.filter(
        created_at__gte=thirty_days_ago,
        status='delivered'
    ).aggregate(
        total=Sum('total_price')
    )['total'] or 0
    
    # Get revenue trend data for last 7 days - only delivered orders
    now = timezone.now()
    revenue_trend_data = []
    revenue_trend_labels = []
    
    for i in range(6, -1, -1):  # Last 7 days
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_revenue = Order.objects.filter(
            created_at__gte=day_start,
            created_at__lt=day_end,
            status='delivered'
        ).aggregate(
            total=Sum('total_price')
        )['total'] or 0
        
        revenue_trend_data.append(float(day_revenue))
        revenue_trend_labels.append(day.strftime('%d/%m'))
    
    return JsonResponse({
        'total_revenue': float(total_revenue),
        'recent_revenue': float(recent_revenue),
        'currency': 'AZN',
        'trend_chart': {
            'labels': revenue_trend_labels,
            'data': revenue_trend_data
        }
    })


@staff_member_required
def profit_widget_data(request):
    """Total profit widget data (price - cost_price) - only delivered orders."""
    from django.db.models import F
    
    # Calculate total profit from delivered order items only
    total_profit = OrderItem.objects.filter(
        order__status='delivered'
    ).aggregate(
        total=Sum(F('subtotal') - (F('quantity') * F('product__cost_price')))
    )['total'] or 0
    
    # Profit from last 30 days - only delivered orders
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_profit = OrderItem.objects.filter(
        order__created_at__gte=thirty_days_ago,
        order__status='delivered'
    ).aggregate(
        total=Sum(F('subtotal') - (F('quantity') * F('product__cost_price')))
    )['total'] or 0
    
    # Get profit trend data for last 7 days - only delivered orders
    now = timezone.now()
    profit_trend_data = []
    profit_trend_labels = []
    
    for i in range(6, -1, -1):  # Last 7 days
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_profit = OrderItem.objects.filter(
            order__created_at__gte=day_start,
            order__created_at__lt=day_end,
            order__status='delivered'
        ).aggregate(
            total=Sum(F('subtotal') - (F('quantity') * F('product__cost_price')))
        )['total'] or 0
        
        profit_trend_data.append(float(day_profit))
        profit_trend_labels.append(day.strftime('%d/%m'))
    
    return JsonResponse({
        'total_profit': float(total_profit),
        'recent_profit': float(recent_profit),
        'currency': 'AZN',
        'trend_chart': {
            'labels': profit_trend_labels,
            'data': profit_trend_data
        }
    })
