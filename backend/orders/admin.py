from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from depod_api.admin_mixins import RichTextAdminMixin, RichTextTabularInlineMixin
from .models import Order, OrderItem


class OrderItemInline(RichTextTabularInlineMixin, TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(RichTextAdminMixin, ModelAdmin):
    list_display = ("id", "user", "status", "total_price", "created_at", "estimated_delivery")
    list_filter = ("status", "created_at")
    search_fields = ("user__email", "id")
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(RichTextAdminMixin, ModelAdmin):
    list_display = ("id", "order", "product", "quantity", "unit_price", "subtotal")
    search_fields = ("order__id", "product__name")
