from rest_framework import serializers
from .models import SiteSettings, AboutContent, ContactContent, ContactMessage


class SocialLinksSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['instagram', 'tiktok', 'facebook']


class FooterSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSettings
        fields = ['footer_description', 'footer_email', 'footer_phone', 'footer_bottom_text']


class AboutSerializer(serializers.ModelSerializer):
    class Meta:
        model = AboutContent
        fields = '__all__'


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactContent
        fields = '__all__'


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ['first_name', 'last_name', 'email', 'phone', 'subject', 'message', 'privacy_accepted']
