from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import User


@admin.register(User)
class UserAdmin(ModelAdmin):
    list_display = ('id', 'email', 'phone', 'first_name', 'last_name', 'student_status', 'created_at')
    search_fields = ('email', 'phone', 'first_name', 'last_name')
    list_filter = ('student_status',)
