from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from .serializers import OfferSerializer


class OfferCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = OfferSerializer(data=request.data)
        if ser.is_valid():
            offer = ser.save(user=request.user if request.user.is_authenticated else None)
            return Response({'message': 'Offer received'}, status=status.HTTP_201_CREATED)
        return Response({'message': 'Validation error', 'errors': ser.errors}, status=400)
