from rest_framework import serializers
from .models import Order, OrderItem
from accounts.serializers import DeliveryAddressSerializer


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(source='product.id', read_only=True)

    class Meta:
        model = OrderItem
        fields = ['product_id', 'name', 'image', 'quantity', 'unit_price', 'subtotal']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    delivery_address = DeliveryAddressSerializer(read_only=True)
    product_id = serializers.SerializerMethodField()
    product_name = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ['id', 'status', 'total_price', 'created_at', 'estimated_delivery', 'items', 
                 'product_id', 'product_name', 'product_image', 'delivery_address']
    
    def get_product_id(self, obj):
        # Get the first item's product_id (assuming single product orders for now)
        first_item = obj.items.first()
        return first_item.product.id if first_item else None
    
    def get_product_name(self, obj):
        first_item = obj.items.first()
        return first_item.name if first_item else None
    
    def get_product_image(self, obj):
        first_item = obj.items.first()
        return first_item.image if first_item else None


class CreateOrderSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    delivery_address_id = serializers.IntegerField()
    pricing_snapshot = serializers.JSONField(required=False)

    def validate_delivery_address_id(self, value):
        user = self.context['request'].user
        try:
            from accounts.models import DeliveryAddress
            address = DeliveryAddress.objects.get(id=value, user=user)
            return value
        except DeliveryAddress.DoesNotExist:
            raise serializers.ValidationError("Delivery address not found or does not belong to user")
