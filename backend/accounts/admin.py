from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from depod_api.admin_mixins import RichTextAdminMixin
from .models import User, StudentPromoCode, DeliveryAddress


@admin.register(User)
class UserAdmin(RichTextAdminMixin, ModelAdmin):
    list_display = ('id', 'email', 'phone', 'first_name', 'last_name', 'student_status', 'created_at')
    search_fields = ('email', 'phone', 'first_name', 'last_name')
    list_filter = ('student_status',)


@admin.register(StudentPromoCode)
class StudentPromoCodeAdmin(RichTextAdminMixin, ModelAdmin):
    change_list_template = 'admin/accounts/studentpromocode/change_list.html'
    list_display = ('code', 'user', 'created_at', 'scanned_at', 'is_valid')
    search_fields = ('code', 'user__email', 'user__phone')
    list_filter = ('is_valid',)

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('scanner/', self.admin_site.admin_view(self.scanner_view), name='student_code_scanner'),
        ]
        return custom + urls

    def scanner_view(self, request):
        # Simple page with camera scanner and manual input
        context = dict(
            self.admin_site.each_context(request),
            title='Student Code Scanner',
        )
        return TemplateResponse(request, 'admin/accounts/student_code_scanner.html', context)


@admin.register(DeliveryAddress)
class DeliveryAddressAdmin(RichTextAdminMixin, ModelAdmin):
    list_display = ('id', 'user', 'receiver_name', 'formatted_address', 'phone', 'is_default', 'created_at')
    search_fields = ('user__email', 'receiver_first_name', 'receiver_last_name', 'street', 'phone')
    list_filter = ('city', 'is_default', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Alıcı məlumatları', {
            'fields': ('user', 'receiver_first_name', 'receiver_last_name', 'phone')
        }),
        ('Ünvan məlumatları', {
            'fields': ('city', 'district', 'street', 'building', 'postal_code')
        }),
        ('Ayarlar', {
            'fields': ('is_default',)
        }),
        ('Tarixlər', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def receiver_name(self, obj):
        return f"{obj.receiver_first_name} {obj.receiver_last_name}"
    receiver_name.short_description = "Alıcı"

    def formatted_address(self, obj):
        district_choices = dict(obj.get_district_choices())
        district_display = district_choices.get(obj.district, obj.district)
        return f"{obj.get_city_display()}, {district_display}, {obj.street}, {obj.building}"
    formatted_address.short_description = "Ünvan"
