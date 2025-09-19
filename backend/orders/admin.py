from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Order, OrderItem


class OrderItemInline(TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(ModelAdmin):
    list_display = ("id", "user", "status", "total_price", "created_at", "estimated_delivery")
    list_filter = ("status", "created_at")
    search_fields = ("user__email", "id")
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(ModelAdmin):
    list_display = ("id", "order", "product", "quantity", "unit_price", "subtotal")
    search_fields = ("order__id", "product__name")
