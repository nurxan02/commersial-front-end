from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count
from .models import ProductReview
from .serializers import ProductReviewSerializer, ProductReviewCreateSerializer
from catalog.models import Product


class ProductReviewViewSet(viewsets.ModelViewSet):
    queryset = ProductReview.objects.all()
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'create':
            return ProductReviewCreateSerializer
        return ProductReviewSerializer

    def get_queryset(self):
        queryset = ProductReview.objects.all()
        product_id = self.request.query_params.get('product_id')
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def update(self, request, *args, **kwargs):
        # Only allow user to update their own review
        review = self.get_object()
        if review.user != request.user:
            return Response(
                {'detail': 'Yalnız öz şərhlərinizi redaktə edə bilərsiniz.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Only allow user to delete their own review
        review = self.get_object()
        if review.user != request.user:
            return Response(
                {'detail': 'Yalnız öz şərhlərinizi silə bilərsiniz.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def product_stats(self, request):
        """Get review statistics for a product"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response({'detail': 'product_id parametri tələb olunur'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Məhsul tapılmadı'}, status=status.HTTP_404_NOT_FOUND)

        reviews = ProductReview.objects.filter(product=product)
        stats = reviews.aggregate(
            average_rating=Avg('rating'),
            total_reviews=Count('id')
        )
        
        # Rating distribution
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[str(i)] = reviews.filter(rating=i).count()

        return Response({
            'product_id': product_id,
            'average_rating': round(stats['average_rating'], 1) if stats['average_rating'] else 0,
            'total_reviews': stats['total_reviews'],
            'rating_distribution': rating_distribution
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def user_review(self, request):
        """Get current user's review for a specific product"""
        product_id = request.query_params.get('product_id')
        if not product_id:
            return Response({'detail': 'product_id parametri tələb olunur'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            review = ProductReview.objects.get(user=request.user, product_id=product_id)
            serializer = ProductReviewSerializer(review, context={'request': request})
            return Response(serializer.data)
        except ProductReview.DoesNotExist:
            return Response({'detail': 'Şərh tapılmadı'}, status=status.HTTP_404_NOT_FOUND)
