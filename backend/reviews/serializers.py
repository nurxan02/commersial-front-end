from rest_framework import serializers
from .models import ProductReview


class ProductReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    can_edit = serializers.SerializerMethodField()

    class Meta:
        model = ProductReview
        fields = ['id', 'user_id', 'user_name', 'product', 'rating', 'comment', 'created_at', 'can_edit']
        read_only_fields = ['id', 'user_id', 'user_name', 'created_at', 'can_edit']

    def get_can_edit(self, obj):
        """Check if current user can edit this review"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False

    def create(self, validated_data):
        # Set user from request
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ProductReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductReview
        fields = ['product', 'rating', 'comment']

    def validate(self, data):
        user = self.context['request'].user
        product = data['product']
        
        # Check if user already reviewed this product
        if ProductReview.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError("Siz artıq bu məhsul üçün şərh yazmısınız.")
        
        # Check if user has purchased this product and it's delivered
        from orders.models import Order, OrderItem
        has_purchased = OrderItem.objects.filter(
            order__user=user,
            product=product,
            order__status='delivered'  # Only delivered orders can review
        ).exists()
        
        if not has_purchased:
            raise serializers.ValidationError("Yalnız çatdırılmış məhsullar üçün şərh yaza bilərsiniz.")
        
        return data

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
