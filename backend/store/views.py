
from django.http import JsonResponse
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Product, DeliveryApartment
from .serializers import ProductSerializer, DeliveryApartmentSerializer


def health_check(request):
    return JsonResponse({
        "success": True,
        "message": "FreshMeat API is running!",
    })


class ProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Product.objects.filter(
            is_active=True,
            category__is_active=True,
        ).select_related("category").order_by("name")


class DeliveryApartmentListAPIView(generics.ListAPIView):
    serializer_class = DeliveryApartmentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return DeliveryApartment.objects.filter(
            is_active=True
        ).order_by("name")
