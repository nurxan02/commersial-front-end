from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import SiteSettings, AboutContent, ContactContent, ContactMessage
from .forms import AboutAdminForm


@admin.register(SiteSettings)
class SiteSettingsAdmin(ModelAdmin):
    list_display = ("id", "instagram", "tiktok", "facebook", "footer_email", "footer_phone")


@admin.register(AboutContent)
class AboutContentAdmin(ModelAdmin):
    form = AboutAdminForm
    list_display = ("id", "title", "experience_years", "product_models", "happy_customers")
    search_fields = ("title",)


@admin.register(ContactContent)
class ContactContentAdmin(ModelAdmin):
    list_display = ("id", "hero_title", "email_primary", "phone_primary")
    search_fields = ("hero_title",)


@admin.register(ContactMessage)
class ContactMessageAdmin(ModelAdmin):
    list_display = ("id", "first_name", "last_name", "email", "phone", "subject", "created_at")
    search_fields = ("first_name", "last_name", "email", "phone", "subject")
    list_filter = ("created_at",)
