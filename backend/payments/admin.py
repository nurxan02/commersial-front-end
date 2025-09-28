from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'provider', 'order', 'amount', 'currency', 'status', 'reference', 'created_at')
    list_filter = ('provider', 'status', 'currency', 'created_at')
    search_fields = ('id', 'order__id', 'reference')
    readonly_fields = ('created_at', 'updated_at', 'callback_payload')
