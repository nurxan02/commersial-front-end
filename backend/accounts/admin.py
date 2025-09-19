from django.contrib import admin
from django.urls import path
from django.template.response import TemplateResponse
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from .models import User, StudentPromoCode


@admin.register(User)
class UserAdmin(ModelAdmin):
    list_display = ('id', 'email', 'phone', 'first_name', 'last_name', 'student_status', 'created_at')
    search_fields = ('email', 'phone', 'first_name', 'last_name')
    list_filter = ('student_status',)


@admin.register(StudentPromoCode)
class StudentPromoCodeAdmin(ModelAdmin):
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
