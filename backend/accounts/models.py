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
