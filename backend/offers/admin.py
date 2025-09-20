from django.contrib import admin
from unfold.admin import ModelAdmin
from depod_api.admin_mixins import RichTextAdminMixin
from .models import Offer


@admin.register(Offer)
class OfferAdmin(RichTextAdminMixin, ModelAdmin):
    list_display = (
        "id",
        "user",
        "product",
        "first_name",
        "last_name",
        "phone_number",
        "city",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("first_name", "last_name", "phone_number", "email")
