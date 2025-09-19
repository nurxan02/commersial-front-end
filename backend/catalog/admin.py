from django.contrib import admin
from unfold.admin import ModelAdmin, TabularInline
from .models import Category, Product, ProductImage
from .forms import ProductAdminForm


@admin.register(Category)
class CategoryAdmin(ModelAdmin):
    list_display = ("id", "name", "key", "order_index")
    search_fields = ("name", "key")
    list_editable = ("order_index",)


class ProductImageInline(TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    form = ProductAdminForm
    list_display = (
        "id",
        "name",
        "category",
        "price",
        "discount",
        "student_discount",
        "in_stock",
        "stock",
    )
    search_fields = ("name",)
    list_filter = ("category", "in_stock")
    inlines = [ProductImageInline]


@admin.register(ProductImage)
class ProductImageAdmin(ModelAdmin):
    list_display = ("id", "product", "is_main")
