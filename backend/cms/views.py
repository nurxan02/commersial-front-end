from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from .models import SiteSettings, AboutContent, ContactContent, ContactMessage
from .serializers import SocialLinksSerializer, FooterSerializer, AboutSerializer, ContactSerializer, ContactMessageSerializer, HomeSettingsSerializer


class SocialLinksView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        obj = SiteSettings.objects.first()
        if not obj:
            return Response({'instagram': None, 'tiktok': None, 'facebook': None})
        return Response(SocialLinksSerializer(obj).data)


class LegalDocsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        obj = SiteSettings.objects.first()
        if not obj:
            return Response({'terms_pdf_url': None, 'privacy_pdf_url': None, 'distance_sale_pdf_url': None, 'delivery_returns_pdf_url': None})
        def abs_url(f):
            if not f:
                return None
            return request.build_absolute_uri(f.url)
        return Response({
            'terms_pdf_url': abs_url(obj.terms_pdf),
            'privacy_pdf_url': abs_url(obj.privacy_pdf),
            'distance_sale_pdf_url': abs_url(obj.distance_sale_pdf),
            'delivery_returns_pdf_url': abs_url(obj.delivery_returns_pdf),
        })


class FooterView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        obj = SiteSettings.objects.first()
        if not obj:
            return Response({'description': '', 'email': '', 'phone': '', 'bottom_text': ''})
        data = FooterSerializer(obj).data
        return Response({
            'description': data['footer_description'],
            'email': data['footer_email'],
            'phone': data['footer_phone'],
            'bottom_text': data['footer_bottom_text'],
        })


class HomeSettingsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        obj = SiteSettings.objects.first()
        if not obj:
            return Response({'home_hero_title': '', 'home_hero_subtitle': ''})
        return Response(HomeSettingsSerializer(obj).data)


class AboutView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        obj = AboutContent.objects.first()
        if not obj:
            return Response({})
        return Response(AboutSerializer(obj).data)


class ContactView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        obj = ContactContent.objects.first()
        if not obj:
            return Response({})
        return Response(ContactSerializer(obj).data)


class ContactMessageView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = ContactMessageSerializer(data=request.data)
        if ser.is_valid():
            ser.save()
            return Response({'message': 'Received'}, status=201)
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)


class VisitTrackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # No-op analytics endpoint to satisfy frontend pings
        return Response(status=204)
