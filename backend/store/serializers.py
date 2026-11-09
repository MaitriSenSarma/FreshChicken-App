
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from .models import (
    Product,
    ProductPack,
    DeliveryApartment,
    Order,
    OrderItem,
    OrderStatusHistory,
    Category,
    Banner,
    Review,
    Coupon,
)
User = get_user_model()


class ProductPackSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductPack
        fields = ["id", "pack_size", "price", "original_price"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )
    packs = serializers.SerializerMethodField()

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
            "packs",
        ]

    def get_packs(self, obj):
        active_packs = obj.packs.filter(is_active=True)
        return ProductPackSerializer(active_packs, many=True).data
class DeliveryApartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryApartment
        fields = [
            "id",
            "name",
            "area",
            "full_address",
            "pincode",
            "latitude",
            "longitude",
        ]


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    pack_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=20)


class CheckoutSerializer(serializers.Serializer):
    apartment_id = serializers.IntegerField(min_value=1)
    delivery_pincode = serializers.CharField(max_length=10)
    flat_number = serializers.CharField(max_length=50)
    floor = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        default="",
    )
    landmark = serializers.CharField(
        max_length=200,
        required=False,
        allow_blank=True,
        default="",
    )
    phone = serializers.CharField(max_length=20)
    payment_method = serializers.ChoiceField(
        choices=Order.PAYMENT_METHOD_CHOICES,
        default="cod",
    )
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    coupon_code = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
    )

    def validate(self, attrs):
        apartment = DeliveryApartment.objects.filter(
            id=attrs["apartment_id"],
            is_active=True,
            is_approved=True,
        ).first()

        if not apartment:
            raise serializers.ValidationError({
                "apartment_id": (
                    "This apartment is not approved or is unavailable."
                )
            })

        if not apartment.pincode:
            raise serializers.ValidationError({
                "apartment_id": "This apartment has no configured PIN code."
            })

        if attrs["delivery_pincode"].strip() != apartment.pincode.strip():
            raise serializers.ValidationError({
                "delivery_pincode": (
                    "The PIN code does not match the selected apartment."
                )
            })

        if not attrs["flat_number"].strip():
            raise serializers.ValidationError({
                "flat_number": "Flat or house number is required."
            })

        if not attrs["phone"].strip():
            raise serializers.ValidationError({
                "phone": "A contact number is required."
            })

        item_keys = [
            (item["product_id"], item["pack_id"])
            for item in attrs["items"]
        ]

        if len(item_keys) != len(set(item_keys)):
            raise serializers.ValidationError({
                "items": "Each product pack can appear only once."
            })

        attrs["apartment"] = apartment
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request_items = validated_data.pop("items")
        apartment = validated_data.pop("apartment")
        coupon_code = validated_data.pop("coupon_code", "").strip().upper()

        # These fields are used for validation, not directly for Order creation.
        validated_data.pop("apartment_id")
        validated_data.pop("delivery_pincode")

        validated_data["customer"] = self.context["request"].user

        payment_method = validated_data["payment_method"]

        # Online payments must be verified with the payment gateway later.
        # Never mark an online order as paid just because checkout was submitted.
        validated_data["payment_status"] = "pending"

        product_ids = {item["product_id"] for item in request_items}
        pack_ids = {item["pack_id"] for item in request_items}

        products = {
            product.id: product
            for product in Product.objects.select_for_update().filter(
                id__in=product_ids,
                is_active=True,
                category__is_active=True,
            )
        }

        if len(products) != len(product_ids):
            raise serializers.ValidationError(
                "One or more products are unavailable."
            )

        packs = {
            pack.id: pack
            for pack in ProductPack.objects.select_for_update().filter(
                id__in=pack_ids,
                product_id__in=product_ids,
                is_active=True,
                product__is_active=True,
                product__category__is_active=True,
            )
        }

        if len(packs) != len(pack_ids):
            raise serializers.ValidationError(
                "One or more selected packs are unavailable."
            )

        order_lines = []
        quantities_by_product = {}
        total = Decimal("0.00")

        for item in request_items:
            product = products[item["product_id"]]
            pack = packs[item["pack_id"]]
            quantity = item["quantity"]

            if pack.product_id != product.id:
                raise serializers.ValidationError({
                    "items": "A selected pack does not belong to its product."
                })

            quantities_by_product[product.id] = (
                quantities_by_product.get(product.id, 0) + quantity
            )

            unit_price = pack.price
            line_total = unit_price * quantity
            total += line_total

            order_lines.append({
                "product": product,
                "pack": pack,
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
            })

        for product_id, quantity in quantities_by_product.items():
            product = products[product_id]

            if product.stock_quantity < quantity:
                raise serializers.ValidationError({
                    "items": f"Insufficient stock for {product.name}."
                })

        # Validate and calculate the coupon on the server using the actual
        # subtotal calculated from database product-pack prices.
        coupon = None
        discount = Decimal("0.00")

        if coupon_code:
            try:
                coupon = Coupon.objects.select_for_update().get(
                    code__iexact=coupon_code
                )
            except Coupon.DoesNotExist:
                raise serializers.ValidationError({
                    "coupon_code": "Invalid coupon code."
                })

            if not coupon.is_valid(total):
                raise serializers.ValidationError({
                    "coupon_code": (
                        "This coupon is expired, inactive, fully used, "
                        "or the minimum order amount is not met."
                    )
                })

            discount = coupon.calculate_discount(total)

        delivery_fee = Decimal("30.00") if total < Decimal("499.00") else Decimal("0.00")

        final_total = total - discount + delivery_fee

        order = Order.objects.create(
            apartment=apartment,
            apartment_name=apartment.name,
            delivery_pincode=apartment.pincode,
            subtotal_amount=total,
            discount_amount=discount,
            delivery_fee=delivery_fee,
            total_amount=final_total,
            coupon=coupon,
            coupon_code=coupon.code if coupon else "",
            **validated_data,
        )

        # Count a coupon use only after the order has been created.
        # This is part of the same atomic transaction as the order.
        if coupon:
            if order.payment_method == "cod":
                coupon.used_count += 1
                coupon.save(update_fields=["used_count"])

        OrderStatusHistory.objects.create(
            order=order,
            status="pending",
            note="Your order has been placed successfully.",
        )
        for line in order_lines:
            product = line["product"]
            pack = line["pack"]

            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=product.name,
                pack_size=pack.pack_size,
                unit_price=line["unit_price"],
                quantity=line["quantity"],
                line_total=line["line_total"],
            )

        if order.payment_method == "cod":
            for product_id, quantity in quantities_by_product.items():
                product = products[product_id]
                product.stock_quantity -= quantity
                product.save(update_fields=["stock_quantity"])

        return order

    def to_representation(self, instance):
        return {
            "order_id": instance.id,
            "status": instance.status,
            "payment_method": instance.payment_method,
            "payment_status": instance.payment_status,
            "subtotal_amount": str(instance.subtotal_amount),
            "discount_amount": str(instance.discount_amount),
            "coupon_code": instance.coupon_code,
            "total_amount": str(instance.total_amount),
            "created_at": instance.created_at,
            "delivery_fee": str(instance.delivery_fee),
        }

class OrderItemDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product_name",
            "pack_size",
            "unit_price",
            "quantity",
            "line_total",
        ]


class CustomerOrderSerializer(serializers.ModelSerializer):
    items = OrderItemDetailSerializer(many=True, read_only=True)
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    payment_method_display = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )
    apartment_name = serializers.CharField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "payment_status",
            "total_amount",
            "apartment_name",
            "delivery_pincode",
            "flat_number",
            "floor",
            "landmark",
            "phone",
            "items",
            "created_at",
            "updated_at",
        ]

from .models import OrderStatusHistory


class OrderStatusHistorySerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = OrderStatusHistory
        fields = [
            "id",
            "status",
            "status_display",
            "note",
            "created_at",
        ]

class AdminOrderSerializer(serializers.ModelSerializer):
    customer_email = serializers.EmailField(
        source="customer.email",
        read_only=True,
    )

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    payment_method_display = serializers.CharField(
        source="get_payment_method_display",
        read_only=True,
    )

    items = OrderItemDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "customer_email",
            "status",
            "status_display",
            "payment_method",
            "payment_method_display",
            "payment_status",
            "total_amount",
            "apartment_name",
            "delivery_pincode",
            "flat_number",
            "floor",
            "landmark",
            "phone",
            "items",
            "created_at",
            "updated_at",
        ]


class AdminOrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=Order.STATUS_CHOICES
    )

    note = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        default="",
    )

class AdminProductPackSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = ProductPack
        fields = [
            "id",
            "pack_size",
            "price",
            "original_price",
            "is_active",
        ]


class AdminProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(
        source="category.name",
        read_only=True
    )

    # Backward compatibility with the existing Admin form
    pack_size = serializers.CharField(
        write_only=True,
        required=False
    )
    pack_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        write_only=True,
        required=False
    )
    pack_original_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        write_only=True,
        required=False,
        allow_null=True
    )

    packs = AdminProductPackSerializer(
        many=True,
        required=False
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
            "pack_price",
            "pack_original_price",
            "price",
            "original_price",
            "stock_quantity",
            "image",
            "is_active",
            "packs",
        ]

    def validate_packs(self, value):
        ids = [
            pack["id"]
            for pack in value
            if "id" in pack
        ]

        if len(ids) != len(set(ids)):
            raise serializers.ValidationError(
                "Duplicate pack IDs are not allowed."
            )

        return value

    def sync_product_price(self, product):
        first_pack = product.packs.filter(
            is_active=True
        ).order_by("id").first()

        if first_pack:
            product.price = first_pack.price
            product.original_price = first_pack.original_price
            product.save(update_fields=[
                "price",
                "original_price"
            ])

    @transaction.atomic
    def create(self, validated_data):
        packs_data = validated_data.pop("packs", [])
        pack_size = validated_data.pop("pack_size", "")
        pack_price = validated_data.pop("pack_price", None)
        pack_original_price = validated_data.pop(
            "pack_original_price", None
        )

        product = Product.objects.create(**validated_data)

        if packs_data:
            for pack_data in packs_data:
                pack_data.pop("id", None)
                ProductPack.objects.create(
                    product=product,
                    **pack_data
                )

        elif pack_size and pack_price is not None:
            ProductPack.objects.create(
                product=product,
                pack_size=pack_size,
                price=pack_price,
                original_price=pack_original_price,
                is_active=True,
            )

        self.sync_product_price(product)
        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        has_packs = "packs" in validated_data
        packs_data = validated_data.pop("packs", [])

        pack_size = validated_data.pop("pack_size", None)
        pack_price = validated_data.pop("pack_price", None)

        has_original_price = "pack_original_price" in validated_data
        pack_original_price = validated_data.pop(
            "pack_original_price", None
        )

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        if has_packs:
            received_ids = []

            for pack_data in packs_data:
                pack_id = pack_data.pop("id", None)

                if pack_id:
                    pack = instance.packs.filter(
                        id=pack_id
                    ).first()

                    if not pack:
                        raise serializers.ValidationError({
                            "packs": f"Pack ID {pack_id} does not belong to this product."
                        })

                    for field, value in pack_data.items():
                        setattr(pack, field, value)

                    pack.save()
                    received_ids.append(pack_id)

                else:
                    new_pack = ProductPack.objects.create(
                        product=instance,
                        **pack_data
                    )
                    received_ids.append(new_pack.id)

            # Packs omitted from the submitted list become inactive.
            instance.packs.filter(
                is_active=True
            ).exclude(
                id__in=received_ids
            ).update(is_active=False)

        elif (
            pack_size is not None
            or pack_price is not None
            or has_original_price
        ):
            pack = instance.packs.filter(
                is_active=True
            ).order_by("id").first()

            if pack:
                if pack_size is not None:
                    pack.pack_size = pack_size

                if pack_price is not None:
                    pack.price = pack_price

                if has_original_price:
                    pack.original_price = pack_original_price

                pack.save()

            elif pack_size and pack_price is not None:
                ProductPack.objects.create(
                    product=instance,
                    pack_size=pack_size,
                    price=pack_price,
                    original_price=pack_original_price,
                    is_active=True,
                )

        self.sync_product_price(instance)
        return instance

class AdminDeliveryApartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryApartment
        fields = [
            "id",
            "name",
            "area",
            "full_address",
            "pincode",
            "latitude",
            "longitude",
            "is_approved",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
class AdminCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields


class AdminCustomerStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["is_active"]
class AdminBannerSerializer(serializers.ModelSerializer):
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = [
            "id",
            "title",
            "subtitle",
            "button_text",
            "image",
            "image_url",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "image_url", "created_at", "updated_at"]

    def get_image_url(self, obj):
        request = self.context.get("request")

        if obj.image:
            image_url = obj.image.url
            return request.build_absolute_uri(image_url) if request else image_url

        return None

class CustomerReviewSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True)
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "rating",
            "comment",
            "approved",
            "created_at",
        ]
        read_only_fields = ["id", "approved", "created_at"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )
        return value


class AdminReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    customer_email = serializers.EmailField(
        source="customer.email",
        read_only=True
    )
    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "customer_name",
            "customer_email",
            "product",
            "product_name",
            "rating",
            "comment",
            "approved",
            "created_at",
        ]
        read_only_fields = fields

    def get_customer_name(self, obj):
        return (
            obj.customer.get_full_name()
            or obj.customer.email
        )

class AdminReviewCreateSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            is_staff=False,
            is_superuser=False,
            is_active=True
        )
    )

    product = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True)
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "customer",
            "product",
            "rating",
            "comment",
            "approved",
            "created_at"
        ]
        read_only_fields = ["id", "created_at"]

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError(
                "Rating must be between 1 and 5."
            )
        return value

    def validate_comment(self, value):
        if not value.strip():
            raise serializers.ValidationError(
                "Review text cannot be empty."
            )
        return value.strip()
class PublicReviewSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    class Meta:
        model = Review
        fields = [
            "id",
            "customer_name",
            "product",
            "product_name",
            "rating",
            "comment",
            "created_at",
        ]

    def get_customer_name(self, obj):
        return (
            obj.customer.get_full_name()
            or obj.customer.email
        )

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = [
            "id",
            "code",
            "discount_type",
            "discount_value",
            "minimum_order_amount",
            "expires_at",
            "max_uses",
            "used_count",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "used_count", "created_at"]

    def validate_code(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        discount_type = attrs.get(
            "discount_type",
            getattr(self.instance, "discount_type", None)
        )
        discount_value = attrs.get(
            "discount_value",
            getattr(self.instance, "discount_value", None)
        )

        if discount_value is not None and discount_value <= 0:
            raise serializers.ValidationError({
                "discount_value": "Discount must be greater than zero."
            })

        if (
            discount_type == "percentage"
            and discount_value is not None
            and discount_value > 100
        ):
            raise serializers.ValidationError({
                "discount_value": "Percentage cannot exceed 100."
            })

        return attrs
