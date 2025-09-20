from rest_framework import serializers
from django.contrib.auth import authenticate
from django.db.models import Q
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from .models import User, DeliveryAddress
from .models import StudentPromoCode
from datetime import date


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email', 'phone', 'birth_date', 'student_status']


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone = serializers.CharField(max_length=32)
    birth_date = serializers.DateField()
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({'confirm_password': ['Passwords do not match']})
        # Age check 13-120
        bd: date = attrs['birth_date']
        today = date.today()
        age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
        if age < 13 or age > 120:
            raise serializers.ValidationError({'birth_date': ['Age must be between 13 and 120']})
        # Unique email/phone
        if User.objects.filter(email__iexact=attrs['email']).exists():
            raise serializers.ValidationError({'email': ['This email is already registered']})
        if User.objects.filter(phone=attrs['phone']).exists():
            raise serializers.ValidationError({'phone': ['This phone is already registered']})
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    remember_me = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        user = None
        # Allow login with email or phone
        if '@' in username:
            try:
                user = User.objects.get(email__iexact=username)
            except User.DoesNotExist:
                user = None
            if user and not user.check_password(password):
                user = None
        if user is None:
            try:
                user = User.objects.get(phone=username)
            except User.DoesNotExist:
                user = None
            if user and not user.check_password(password):
                user = None
        if user is None:
            raise serializers.ValidationError({'message': 'İstifadəçi adı və ya parol yanlışdır!'})
        attrs['user'] = user
        return attrs


class UpdatePhoneSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=32)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        user: User = self.context['request'].user
        if not user.check_password(attrs['current_password']):
            raise serializers.ValidationError({'current_password': ['Incorrect current password']})
        if attrs['current_password'] == attrs['new_password']:
            raise serializers.ValidationError({'new_password': ['New password must be different from current password']})
        return attrs


class UploadStudentDocumentSerializer(serializers.Serializer):
    student_document = serializers.FileField()

    def validate_student_document(self, f):
        if f.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('File too large (max 10MB)')
        if f.content_type not in ['application/pdf', 'image/jpeg', 'image/png']:
            raise serializers.ValidationError('Unsupported file type')
        return f


class StudentPromoCodeSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)

    class Meta:
        model = StudentPromoCode
        fields = ['id', 'code', 'user_id', 'user_email', 'created_at', 'scanned_at', 'is_valid']


class CreateStudentPromoCodeSerializer(serializers.Serializer):
    def create(self, validated_data):
        user = self.context['request'].user
        if user.student_status != 'approved':
            raise serializers.ValidationError({'message': 'User not approved for student discount'})
        code = StudentPromoCode.objects.create(user=user)
        return code


class VerifyStudentPromoCodeSerializer(serializers.Serializer):
    code = serializers.UUIDField()

    def validate(self, attrs):
        code = attrs['code']
        try:
            promo = StudentPromoCode.objects.get(code=code)
        except StudentPromoCode.DoesNotExist:
            raise serializers.ValidationError({'code': ['Code not found']})
        attrs['promo'] = promo
        return attrs


class DeliveryAddressSerializer(serializers.ModelSerializer):
    district_choices = serializers.SerializerMethodField()
    
    class Meta:
        model = DeliveryAddress
        fields = [
            'id', 'is_default', 'city', 'district', 'street', 'building',
            'postal_code', 'phone', 'receiver_first_name', 'receiver_last_name',
            'created_at', 'updated_at', 'district_choices'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'district_choices']

    def get_district_choices(self, obj):
        """Return available district choices for the selected city"""
        return obj.get_district_choices()

    def create(self, validated_data):
        # Set user from request context
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def validate(self, data):
        city = data.get('city')
        district = data.get('district')
        
        # Validate district choice based on city
        if city and district:
            valid_districts = dict(DeliveryAddress.BAKU_DISTRICTS + 
                                 DeliveryAddress.ABSHERON_DISTRICTS + 
                                 DeliveryAddress.SUMGAYIT_DISTRICTS)
            
            if city == 'baku':
                valid_choices = [choice[0] for choice in DeliveryAddress.BAKU_DISTRICTS]
            elif city == 'absheron':
                valid_choices = [choice[0] for choice in DeliveryAddress.ABSHERON_DISTRICTS]
            elif city == 'sumgayit':
                valid_choices = [choice[0] for choice in DeliveryAddress.SUMGAYIT_DISTRICTS]
            else:
                valid_choices = []
            
            if district not in valid_choices:
                raise serializers.ValidationError({
                    'district': f'Invalid district for {city}. Valid choices: {valid_choices}'
                })
        
        return data


class DeliveryAddressChoicesSerializer(serializers.Serializer):
    """Serializer to return city and district choices"""
    cities = serializers.SerializerMethodField()
    districts = serializers.SerializerMethodField()
    
    def get_cities(self, obj):
        return DeliveryAddress.CITY_CHOICES
    
    def get_districts(self, obj):
        return {
            'baku': DeliveryAddress.BAKU_DISTRICTS,
            'absheron': DeliveryAddress.ABSHERON_DISTRICTS,
            'sumgayit': DeliveryAddress.SUMGAYIT_DISTRICTS,
        }


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, attrs):
        # Always accept; do not leak account existence
        attrs['user'] = None
        try:
            user = User.objects.get(email__iexact=attrs['email'])
            attrs['user'] = user
        except User.DoesNotExist:
            pass
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)

    def validate(self, attrs):
        try:
            uid = force_str(urlsafe_base64_decode(attrs['uid']))
            user = User.objects.get(pk=uid)
        except Exception:
            raise serializers.ValidationError({'uid': ['Invalid link']})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({'token': ['Invalid or expired token']})

        # Validate new password with Django validators
        validate_password(attrs['new_password'], user)

        attrs['user'] = user
        return attrs
