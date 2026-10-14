
from rest_framework import serializers
from .models import Product, DeliveryApartment


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "description",
            "category",
            "category_name",
            "pack_size",
            "price",
            "original_price",
            "stock_quantity",
            "image",
            "is_active",
        ]


class DeliveryApartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryApartment
        fields = ["id", "name", "area"]
