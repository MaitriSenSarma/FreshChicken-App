
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.db import models, transaction
from decimal import Decimal, InvalidOperation
from django.db.models import Q
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated,IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from .models import (
    Product,
    ProductPack,
    Category,
    DeliveryApartment,
    Order,
    OrderStatusHistory,
    Banner,
    Review,
    Coupon,
)
from .serializers import (
    ProductSerializer,
    ProductPackSerializer,
    DeliveryApartmentSerializer,
    CheckoutSerializer,
    CustomerOrderSerializer,
    OrderStatusHistorySerializer,
    AdminOrderSerializer,
    AdminOrderStatusUpdateSerializer,
    AdminProductSerializer,
    AdminDeliveryApartmentSerializer,
    AdminCustomerSerializer,
AdminCustomerStatusSerializer,
AdminBannerSerializer,
CustomerReviewSerializer,
AdminReviewSerializer,
PublicReviewSerializer,
AdminReviewCreateSerializer,
CouponSerializer,
)
User = get_user_model()

def health_check(request):
    return JsonResponse({
        "success": True,
        "message": "FreshMeat API is running!",
    })


class ProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return (
            Product.objects.filter(
                is_active=True,
                category__is_active=True,
            )
            .select_related("category")
            .prefetch_related("packs")
            .order_by("name")
        )


class DeliveryApartmentListAPIView(generics.ListAPIView):
    serializer_class = DeliveryApartmentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return DeliveryApartment.objects.filter(
            is_active=True,
            is_approved=True,
            pincode__gt="",
        ).order_by("name")


class CheckoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        return Response(
            CheckoutSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )

class MyOrdersAPIView(generics.ListAPIView):
    serializer_class = CustomerOrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(customer=self.request.user)
            .prefetch_related("items")
            .order_by("-created_at")
        )


class CustomerOrderTrackingAPIView(generics.GenericAPIView):
    serializer_class = OrderStatusHistorySerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        # Only allow customers to access their own orders
        order = get_object_or_404(
            Order,
            id=order_id,
            customer=request.user,
        )

        history = OrderStatusHistory.objects.filter(
            order=order
        ).order_by("created_at")

        serializer = self.get_serializer(history, many=True)

        return Response({
            "order_id": order.id,
            "current_status": order.status,
            "current_status_display": order.get_status_display(),
            "created_at": order.created_at,
            "updated_at": order.updated_at,
            "history": serializer.data,
        })

class AdminOrderListAPIView(generics.ListAPIView):
    serializer_class = AdminOrderSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = (
            Order.objects
            .select_related("customer", "apartment")
            .prefetch_related("items")
            .order_by("-created_at")
        )

        order_status = self.request.query_params.get("status")
        search = self.request.query_params.get("search")

        if order_status:
            valid_statuses = dict(Order.STATUS_CHOICES)

            if order_status not in valid_statuses:
                raise ValidationError({
                    "status": "Invalid order status."
                })

            queryset = queryset.filter(status=order_status)

        if search:
            if search.isdigit():
                queryset = queryset.filter(id=int(search))
            else:
                queryset = queryset.filter(
                    customer__email__icontains=search
                )

        return queryset


class AdminOrderStatusUpdateAPIView(APIView):
    permission_classes = [IsAdminUser]

    @transaction.atomic
    def patch(self, request, order_id):
        serializer = AdminOrderStatusUpdateSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        order = get_object_or_404(
            Order.objects.select_for_update(),
            id=order_id,
        )

        new_status = serializer.validated_data["status"]
        note = serializer.validated_data["note"]

        if order.status == "cancelled" or order.status == "delivered":
            raise ValidationError({
                "status": "This order can no longer be updated."
            })

        if order.status == new_status:
            return Response(
                AdminOrderSerializer(order).data,
                status=status.HTTP_200_OK,
            )

        # Prevent skipping delivery stages.
        allowed_transitions = {
            "pending": ["confirmed", "cancelled"],
            "confirmed": ["preparing", "cancelled"],
            "preparing": ["out_for_delivery", "cancelled"],
            "out_for_delivery": ["delivered"],
        }

        if new_status not in allowed_transitions.get(order.status, []):
            raise ValidationError({
                "status": (
                    f"Cannot change order from "
                    f"{order.status} to {new_status}."
                )
            })

        order.status = new_status
        order.save(update_fields=["status", "updated_at"])

        OrderStatusHistory.objects.create(
            order=order,
            status=new_status,
            note=note or f"Order status updated to {order.get_status_display()}.",
        )

        return Response(
            AdminOrderSerializer(order).data,
            status=status.HTTP_200_OK,
        )
class AdminCategoryListAPIView(generics.ListAPIView):
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Category.objects.filter(is_active=True).order_by("name")

    def list(self, request, *args, **kwargs):
        categories = self.get_queryset()
        return Response([
            {
                "id": category.id,
                "name": category.name,
            }
            for category in categories
        ])


class AdminProductListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return (
            Product.objects.all()
            .select_related("category")
            .prefetch_related("packs")
            .order_by("-created_at")
        )


class AdminProductDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminProductSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return (
            Product.objects.all()
            .select_related("category")
            .prefetch_related("packs")
        )

    def perform_destroy(self, instance):
        # Soft delete: preserve products used in previous orders.
        instance.is_active = False
        instance.save(update_fields=["is_active"])
class AdminDeliveryApartmentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AdminDeliveryApartmentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return DeliveryApartment.objects.all().order_by("-created_at")


class AdminDeliveryApartmentDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminDeliveryApartmentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return DeliveryApartment.objects.all()

    def perform_destroy(self, instance):
        # Soft delete: preserve apartment records used by previous orders.
        instance.is_active = False
        instance.save(update_fields=["is_active"])
class AdminCustomerListAPIView(generics.ListAPIView):
    serializer_class = AdminCustomerSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        queryset = User.objects.filter(is_staff=False, is_superuser=False)

        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                models.Q(username__icontains=search)
                | models.Q(first_name__icontains=search)
                | models.Q(last_name__icontains=search)
                | models.Q(email__icontains=search)
            )

        status = self.request.query_params.get("status")

        if status == "active":
            queryset = queryset.filter(is_active=True)
        elif status == "blocked":
            queryset = queryset.filter(is_active=False)

        return queryset.order_by("-date_joined")


class AdminCustomerStatusUpdateAPIView(generics.UpdateAPIView):
    serializer_class = AdminCustomerStatusSerializer
    permission_classes = [IsAdminUser]
    queryset = User.objects.filter(is_staff=False, is_superuser=False)
    http_method_names = ["patch", "options", "head"]

class AdminBannerListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AdminBannerSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Banner.objects.all().order_by("-created_at")


class AdminBannerDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminBannerSerializer
    permission_classes = [IsAdminUser]
    queryset = Banner.objects.all()
    parser_classes = [MultiPartParser, FormParser, JSONParser]


class PublicBannerListAPIView(generics.ListAPIView):
    serializer_class = AdminBannerSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Banner.objects.filter(is_active=True).order_by("-created_at")

class CustomerReviewListCreateAPIView(generics.ListCreateAPIView):

    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return CustomerReviewSerializer

        return PublicReviewSerializer

    def get_queryset(self):
        return (
            Review.objects.filter(approved=True)
            .select_related("customer", "product")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(
            customer=self.request.user,
            approved=False
        )

    def get_permissions(self):
        if self.request.method == "GET":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_queryset(self):
        return (
            Review.objects.filter(approved=True)
            .select_related("customer", "product")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(
            customer=self.request.user,
            approved=False
        )


class AdminReviewListAPIView(generics.ListCreateAPIView):

    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Review.objects.select_related(
            "customer", "product"
        ).order_by("-created_at")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminReviewCreateSerializer

        return AdminReviewSerializer

class AdminReviewDetailAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get_object(self, review_id):
        return get_object_or_404(
            Review.objects.select_related("customer", "product"),
            id=review_id
        )

    def patch(self, request, review_id):
        review = self.get_object(review_id)

        approved = request.data.get("approved")

        if not isinstance(approved, bool):
            return Response(
                {"error": "approved must be true or false."},
                status=status.HTTP_400_BAD_REQUEST
            )

        review.approved = approved
        review.save(update_fields=["approved"])

        return Response(
            AdminReviewSerializer(review).data,
            status=status.HTTP_200_OK
        )

    def delete(self, request, review_id):
        review = self.get_object(review_id)
        review.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

# ==========================================
# COUPON MANAGEMENT APIs
# ==========================================


class AdminCouponListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return Coupon.objects.all().order_by("-created_at")


class AdminCouponDetailAPIView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = CouponSerializer
    permission_classes = [IsAdminUser]
    queryset = Coupon.objects.all()


class PublicCouponListAPIView(generics.ListAPIView):
    serializer_class = CouponSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        today = timezone.localdate()

        return Coupon.objects.filter(
            is_active=True
        ).filter(
            Q(expires_at__isnull=True) | Q(expires_at__gte=today)
        ).filter(
            Q(max_uses__isnull=True) | Q(used_count__lt=models.F("max_uses"))
        ).order_by("-created_at")


class ValidateCouponAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code", "").strip().upper()
        subtotal_value = request.data.get("subtotal")

        if not code:
            return Response(
                {"valid": False, "message": "Please enter a coupon code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subtotal = Decimal(str(subtotal_value))
            if not subtotal.is_finite() or subtotal < 0:
                raise InvalidOperation
        except (InvalidOperation, TypeError, ValueError):
            return Response(
                {"valid": False, "message": "Invalid order subtotal."},
                status=status.HTTP_400_BAD_REQUEST
            )

        coupon = Coupon.objects.filter(code__iexact=code).first()

        if not coupon:
            return Response({
                "valid": False,
                "message": "Invalid coupon code."
            }, status=status.HTTP_404_NOT_FOUND)

        if not coupon.is_valid(subtotal):
            return Response({
                "valid": False,
                "message": (
                    "This coupon is expired, inactive, fully used, "
                    "or the minimum order amount is not met."
                )
            }, status=status.HTTP_400_BAD_REQUEST)

        discount = coupon.calculate_discount(subtotal)
        final_total = subtotal - discount

        return Response({
            "valid": True,
            "message": "Coupon applied successfully!",
            "code": coupon.code,
            "discount_type": coupon.discount_type,
            "discount_value": str(coupon.discount_value),
            "subtotal": str(subtotal),
            "discount_amount": str(discount),
            "final_amount": str(final_total),
        }, status=status.HTTP_200_OK)
