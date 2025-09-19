from rest_framework import serializers
from .models import Category, Product, ProductImage


class CategorySerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'key', 'name', 'description', 'image']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image:
            url = obj.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class ProductImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = ProductImage
        fields = ['image', 'is_main']

    def get_image(self, obj):
        request = self.context.get('request')
        url = obj.image.url
        if request is not None:
            return request.build_absolute_uri(url)
        return url


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    main_image = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'category', 'description', 'images', 'main_image',
            'specs', 'features', 'highlights', 'price', 'discounted_price',
            'discount', 'student_discount', 'in_stock', 'stock'
        ]

    def get_main_image(self, obj):
        request = self.context.get('request')
        if obj.main_image:
            url = obj.main_image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        # fallback to main ProductImage
        main = obj.images.filter(is_main=True).first()
        if main:
            url = main.image.url
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None

    def get_category(self, obj):
        return {'key': obj.category.key, 'name': obj.category.name}


class ProductPricingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['price', 'discounted_price', 'discount', 'student_discount', 'in_stock']
