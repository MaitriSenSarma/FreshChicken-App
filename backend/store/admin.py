
from django.contrib import admin
from .models import (
    Category,
    Product,
    ProductPack,
    DeliveryApartment,
    Order,
    OrderItem,
    Review,
)


admin.site.register(ProductPack)
admin.site.register(Review)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "created_at")
    search_fields = ("name",)
    list_filter = ("is_active",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "category",
        "pack_size",
        "price",
        "stock_quantity",
        "is_active",
    )
    search_fields = ("name",)
    list_filter = ("category", "is_active")


@admin.register(DeliveryApartment)
class DeliveryApartmentAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "area",
        "pincode",
        "is_approved",
        "is_active",
    )
    search_fields = ("name", "area", "pincode", "full_address")
    list_filter = ("is_approved", "is_active", "area")


admin.site.register(Order)
admin.site.register(OrderItem)
