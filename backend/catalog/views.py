from rest_framework import viewsets, decorators, response
from rest_framework.permissions import AllowAny
from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer, ProductPricingSerializer


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all().order_by('order_index', 'id')
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        # Ensure deterministic ordering for pagination
        qs = (
            Product.objects.all()
            .order_by('-id')
            .select_related('category')
            .prefetch_related('images')
        )
        category_key = self.request.query_params.get('category')
        if category_key:
            qs = qs.filter(category__key=category_key)
        return qs

    @decorators.action(detail=True, methods=['get'], url_path='pricing', permission_classes=[AllowAny])
    def pricing(self, request, pk=None):
        product = self.get_object()
        ser = ProductPricingSerializer(product)
        return response.Response(ser.data)
