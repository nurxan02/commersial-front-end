from django.contrib import admin
from django.utils.html import format_html
from django import forms
from depod_api.admin_mixins import RichTextAdminMixin
from .models import ProductReview


class ProductReviewForm(forms.ModelForm):
    rating = forms.ChoiceField(
        choices=[(i, f'{i} ulduz') for i in range(1, 6)],
        widget=forms.Select(attrs={'class': 'form-control'}),
        label='Reytinq'
    )
    
    class Meta:
        model = ProductReview
        fields = '__all__'
        widgets = {
            'comment': forms.Textarea(attrs={
                'rows': 4, 
                'cols': 50, 
                'placeholder': 'Şərhinizi yazın...'
            }),
        }


@admin.register(ProductReview)
class ProductReviewAdmin(RichTextAdminMixin, admin.ModelAdmin):
    form = ProductReviewForm
    list_display = ['id', 'user_display', 'product_display', 'rating_display', 'comment_preview', 'created_at']
    list_filter = ['rating', 'created_at', 'product__category']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'product__name', 'comment']
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20
    ordering = ['-created_at']
    
    fieldsets = (
        ('Şərh Məlumatları', {
            'fields': ('user', 'product', 'rating', 'comment')
        }),
        ('Tarix Məlumatları', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def user_display(self, obj):
        return format_html(
            '<strong>{}</strong><br><small>{}</small>',
            obj.user_name,
            obj.user.email
        )
    user_display.short_description = 'İstifadəçi'

    def product_display(self, obj):
        return format_html(
            '<strong>{}</strong><br><small>ID: {}</small>',
            obj.product.name,
            obj.product.id
        )
    product_display.short_description = 'Məhsul'

    def rating_display(self, obj):
        stars = '★' * obj.rating + '☆' * (5 - obj.rating)
        color = '#28a745' if obj.rating >= 4 else '#ffc107' if obj.rating >= 3 else '#dc3545'
        return format_html(
            '<span style="color: {}; font-size: 16px;">{}</span> ({})',
            color, stars, obj.rating
        )
    rating_display.short_description = 'Reytinq'

    def comment_preview(self, obj):
        if obj.comment:
            preview = obj.comment[:80] + '...' if len(obj.comment) > 80 else obj.comment
            return format_html('<div style="max-width: 200px;">{}</div>', preview)
        return '-'
    comment_preview.short_description = 'Şərh'

    def has_add_permission(self, request):
        return True  # Admin paneldən şərh əlavə etmək mümkündür

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'product')
