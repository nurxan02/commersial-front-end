from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.contrib import messages
from unfold.admin import ModelAdmin, TabularInline
from depod_api.admin_mixins import RichTextAdminMixin, RichTextTabularInlineMixin
from .models import Order, OrderItem
from .email_utils import send_order_confirmation_email, send_order_delivered_email


class OrderItemInline(RichTextTabularInlineMixin, TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('subtotal',)


@admin.register(Order)
class OrderAdmin(RichTextAdminMixin, ModelAdmin):
    list_display = ("id", "user_link", "status", "status_display", "total_price", "student_discount_info", "created_at", "estimated_delivery")
    list_filter = ("status", "created_at")
    search_fields = ("user__email", "user__first_name", "user__last_name", "id")
    list_editable = ("status",)
    inlines = [OrderItemInline]
    readonly_fields = ('pricing_snapshot', 'discount_details')
    actions = ['send_confirmation_email', 'send_delivery_email']
    
    def send_confirmation_email(self, request, queryset):
        """Send order confirmation emails for selected orders."""
        success_count = 0
        for order in queryset:
            if send_order_confirmation_email(order):
                success_count += 1
            
        if success_count == queryset.count():
            self.message_user(
                request,
                f'Təsdiq maili {success_count} sifariş üçün uğurla göndərildi.',
                messages.SUCCESS
            )
        else:
            self.message_user(
                request,
                f'{success_count}/{queryset.count()} təsdiq maili göndərildi.',
                messages.WARNING
            )
    send_confirmation_email.short_description = "Seçilən sifarişlər üçün təsdiq maili göndər"
    
    def send_delivery_email(self, request, queryset):
        """Send delivery confirmation emails for selected orders."""
        success_count = 0
        for order in queryset:
            if send_order_delivered_email(order):
                success_count += 1
            
        if success_count == queryset.count():
            self.message_user(
                request,
                f'Çatdırılma maili {success_count} sifariş üçün uğurla göndərildi.',
                messages.SUCCESS
            )
        else:
            self.message_user(
                request,
                f'{success_count}/{queryset.count()} çatdırılma maili göndərildi.',
                messages.WARNING
            )
    send_delivery_email.short_description = "Seçilən sifarişlər üçün çatdırılma maili göndər"
    
    def user_link(self, obj):
        """Create a clickable link to the user admin page."""
        if obj.user:
            url = reverse('admin:accounts_user_change', args=[obj.user.pk])
            return format_html('<a href="{}">{}</a>', url, obj.user.email)
        return '-'
    user_link.short_description = 'User'
    user_link.admin_order_field = 'user__email'
    
    def status_display(self, obj):
        """Display status with colored badge."""
        status_colors = {
            'pending': '#F59E0B',
            'processing': '#3B82F6', 
            'shipped': '#10B981',
            'delivered': '#059669',
            'cancelled': '#EF4444',
        }
        color = status_colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = 'Status'
    status_display.admin_order_field = 'status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'delivery_address')
    
    def student_discount_info(self, obj):
        """Show if student discount was applied."""
        student_discount = obj.student_discount_applied()
        if student_discount:
            return format_html(
                '<span style="background: #10B981; color: white; padding: 2px 6px; border-radius: 8px; font-size: 11px;">Tələbə -%{}%</span>',
                student_discount
            )
        return '-'
    student_discount_info.short_description = 'Tələbə Endirimi'
    
    def discount_details(self, obj):
        """Show detailed discount information."""
        details = obj.get_discount_details()
        if not details:
            return "Məlumat yoxdur"
            
        info = []
        if details['original_price']:
            info.append(f"Orijinal qiymət: {details['original_price']} AZN")
        if details['final_unit_price']:
            info.append(f"Son qiymət: {details['final_unit_price']} AZN")
        if details['product_discount']:
            info.append(f"Məhsul endirimi: {details['product_discount']}%")
        if details['student_discount']:
            info.append(f"Tələbə endirimi: {details['student_discount']}%")
        if details['user_student_status']:
            info.append(f"İstifadəçi statusu: {details['user_student_status']}")
            
        return format_html('<br>'.join(info)) if info else "Məlumat yoxdur"
    discount_details.short_description = 'Endirim Təfərrüatları'


@admin.register(OrderItem)
class OrderItemAdmin(RichTextAdminMixin, ModelAdmin):
    list_display = ("id", "order_link", "product_link", "quantity", "unit_price", "subtotal")
    search_fields = ("order__id", "product__name", "name")
    list_filter = ("order__status", "order__created_at")
    
    def order_link(self, obj):
        """Create a clickable link to the order admin page."""
        if obj.order:
            url = reverse('admin:orders_order_change', args=[obj.order.pk])
            return format_html('<a href="{}">Order #{}</a>', url, obj.order.id)
        return '-'
    order_link.short_description = 'Order'
    order_link.admin_order_field = 'order__id'
    
    def product_link(self, obj):
        """Create a clickable link to the product admin page."""
        if obj.product:
            url = reverse('admin:catalog_product_change', args=[obj.product.pk])
            return format_html('<a href="{}">{}</a>', url, obj.product.name)
        return obj.name or '-'
    product_link.short_description = 'Product'
    product_link.admin_order_field = 'product__name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('order', 'product')
