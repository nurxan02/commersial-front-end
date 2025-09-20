from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import uuid


class User(AbstractUser):
    username = None
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=32, unique=True)
    birth_date = models.DateField()

    STUDENT_STATUS_CHOICES = [
        ('none', 'None'),
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    student_status = models.CharField(max_length=16, choices=STUDENT_STATUS_CHOICES, default='none')
    student_document = models.FileField(upload_to='student_docs/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'phone', 'birth_date']

    def __str__(self):
        return self.email


class DeliveryAddress(models.Model):
    CITY_CHOICES = [
        ('baku', 'Bakı'),
        ('absheron', 'Abşeron'),
        ('sumgayit', 'Sumqayıt'),
    ]

    BAKU_DISTRICTS = [
        ('binagadi', 'Binəqədi'),
        ('garadagh', 'Qaradağ'),
        ('khazar', 'Xəzər'),
        ('khatai', 'Xətai'),
        ('nasimi', 'Nəsimi'),
        ('narimanov', 'Nərimanov'),
        ('nizami', 'Nizami'),
        ('pirallahi', 'Pirallahı'),
        ('sabail', 'Səbail'),
        ('sabunchu', 'Sabunçu'),
        ('surakhani', 'Suraxanı'),
        ('yasamal', 'Yasamal'),
    ]

    ABSHERON_DISTRICTS = [
        ('khirdalan', 'Xırdalan'),
        ('mehdiabad', 'Mehdiabad'),
    ]

    SUMGAYIT_DISTRICTS = [
        ('sumgayit', 'Sumqayıt şəhəri'),
    ]

    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='delivery_addresses')
    is_default = models.BooleanField(default=False)
    
    # Address fields
    city = models.CharField(max_length=20, choices=CITY_CHOICES)
    district = models.CharField(max_length=20)
    street = models.CharField(max_length=255)
    building = models.CharField(max_length=100)  # Mənzil/ev
    postal_code = models.CharField(max_length=10, blank=True, null=True)
    
    # Contact info
    phone = models.CharField(max_length=20)
    receiver_first_name = models.CharField(max_length=150)
    receiver_last_name = models.CharField(max_length=150)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-is_default', '-created_at']

    def save(self, *args, **kwargs):
        # If this is being set as default, unset other defaults
        if self.is_default:
            DeliveryAddress.objects.filter(
                user=self.user, is_default=True
            ).update(is_default=False)
        super().save(*args, **kwargs)

    def get_district_choices(self):
        """Return district choices based on city"""
        if self.city == 'baku':
            return self.BAKU_DISTRICTS
        elif self.city == 'absheron':
            return self.ABSHERON_DISTRICTS
        elif self.city == 'sumgayit':
            return self.SUMGAYIT_DISTRICTS
        return []

    def __str__(self):
        return f"{self.receiver_first_name} {self.receiver_last_name} - {self.street}, {self.get_city_display()}"


class StudentPromoCode(models.Model):
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='student_codes')
    code = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    scanned_at = models.DateTimeField(null=True, blank=True)
    is_valid = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def mark_scanned(self):
        self.scanned_at = timezone.now()
        self.save(update_fields=['scanned_at'])

    def __str__(self):
        return f"{self.code} — {self.user.email}"
