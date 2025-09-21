# Email Notification System

Bu sistem müştərilərə avtomatik olaraq sifariş təsdiqi və çatdırılma təsdiqi mailləri göndərir.

## Xüsusiyyətlər

### 1. Avtomatik Email Göndərmə

- **Sifariş yaradıldığında**: Avtomatik olaraq təsdiq maili göndərilir
- **Sifariş çatdırıldığında**: Status "delivered"-ə dəyişən zaman avtomatik çatdırılma maili göndərilir

### 2. HTML Email Şablonları

- Responziv dizayn (mobil və desktop)
- Depod.az branding ilə peşəkar görünüş
- Sifariş məlumatları və məhsul təfərrüatları

### 3. Admin Panel Əməliyyatları

Admin paneldən əl ilə email göndərmək üçün:

1. Orders bölümünə gedin
2. Sifarişləri seçin
3. "Actions" dropdown-dan email növünü seçin:
   - "Seçilən sifarişlər üçün təsdiq maili göndər"
   - "Seçilən sifarişlər üçün çatdırılma maili göndər"

### 4. Management Command

Terminal vasitəsilə test mailləri göndərmək üçün:

```bash
# Xüsusi sifariş üçün təsdiq maili
python manage.py send_test_emails --order_id 123 --type confirmation

# Xüsusi sifariş üçün çatdırılma maili
python manage.py send_test_emails --order_id 123 --type delivered

# Son 5 sifariş üçün təsdiq mailləri
python manage.py send_test_emails --type confirmation

# Son 5 sifariş üçün çatdırılma mailləri
python manage.py send_test_emails --type delivered
```

## Email Şablonları

### 1. Order Confirmation (`templates/emails/order_confirmation.html`)

- Sifariş təfərrüatları
- Məhsul siyahısı (şəkil, ad, miqdar, qiymət)
- Çatdırılma ünvanı
- Ümumi məbləğ

### 2. Order Delivered (`templates/emails/order_delivered.html`)

- Çatdırılma təsdiqi
- Təşəkkür mesajı
- Məhsul siyahısı
- Reytinq və rəy bildirmə dəvəti

## Email Konfiqurasiyası

Email ayarları `depod_api/settings.py` faylında:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # və ya digər provider
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'your-email@depod.az'
EMAIL_HOST_PASSWORD = 'your-password'
DEFAULT_FROM_EMAIL = 'no-reply@depod.az'
```

Environment variable kimi də təyin edilə bilər:

- `EMAIL_HOST`
- `EMAIL_HOST_USER`
- `EMAIL_HOST_PASSWORD`
- `DEFAULT_FROM_EMAIL`

## Test Etmək

Development mühitində email-ləri test etmək üçün console backend istifadə edin:

```python
# settings.py-də
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
```

Bu halda email-lər terminal-da göstəriləcək.

## Debugging

Email göndərmə problemləri üçün:

1. Django logs-larına baxın
2. Email provider ayarlarını yoxlayın
3. Management command ilə test edin
4. Gmail üçün "App Password" istifadə edin

## Əlavə Qeydlər

- Email-lər həm HTML həm də plain text formatında göndərilir
- Responsive dizayn mobil cihazlarda düzgün görünür
- Bütün email-lər Azərbaycan dilindədir
- SMTP server konfiqurasiyası lazımdır
- Email göndərmə uğursuz olduqda error log yazılır
