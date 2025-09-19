from django.urls import path
from .views import SocialLinksView, LegalDocsView, FooterView, AboutView, ContactView, ContactMessageView, VisitTrackView, HomeSettingsView

urlpatterns = [
    path('settings/social-links/', SocialLinksView.as_view()),
    path('settings/home/', HomeSettingsView.as_view()),
    path('settings/legal-docs/', LegalDocsView.as_view()),
    path('footer/', FooterView.as_view()),
    path('about/', AboutView.as_view()),
    path('contact/', ContactView.as_view()),
    path('contact-messages/', ContactMessageView.as_view()),
    path('visit/track/', VisitTrackView.as_view()),
]
