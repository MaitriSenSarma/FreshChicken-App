
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .payment_views import (CreateRazorpayOrderAPIView,VerifyRazorpayPaymentAPIView,RazorpayWebhookAPIView,)
from .views import (
    health_check,
    ProductListAPIView,
    DeliveryApartmentListAPIView,
    CheckoutAPIView,
     MyOrdersAPIView,
    CustomerOrderTrackingAPIView,
    AdminOrderListAPIView,
    AdminOrderStatusUpdateAPIView  ,
    AdminCategoryListAPIView,
    AdminProductListCreateAPIView,
    AdminProductDetailAPIView, 
    AdminDeliveryApartmentListCreateAPIView,
AdminDeliveryApartmentDetailAPIView,
 AdminCustomerListAPIView,
 AdminCustomerStatusUpdateAPIView,
  AdminBannerListCreateAPIView,
  AdminBannerDetailAPIView,
     PublicBannerListAPIView,
     CustomerReviewListCreateAPIView,
AdminReviewListAPIView,
AdminReviewDetailAPIView,
AdminCouponListCreateAPIView,
AdminCouponDetailAPIView,
PublicCouponListAPIView,
ValidateCouponAPIView,
)
from .phone_auth import SendPhoneOTPView, VerifyPhoneOTPView
from .auth_view import RegisterAPIView, LoginAPIView

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("products/", ProductListAPIView.as_view(), name="products"),
    path("apartments/", DeliveryApartmentListAPIView.as_view(), name="apartments"),

    path("auth/phone/send-otp/", SendPhoneOTPView.as_view(), name="send_phone_otp"),
    path("auth/phone/verify-otp/", VerifyPhoneOTPView.as_view(), name="verify_phone_otp"),

    path("auth/register/", RegisterAPIView.as_view(), name="register"),
    path("auth/login/", LoginAPIView.as_view(), name="login"),

    path("checkout/", CheckoutAPIView.as_view(), name="checkout"),
    path("orders/", MyOrdersAPIView.as_view(), name="my_orders"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
    "orders/<int:order_id>/tracking/",
    CustomerOrderTrackingAPIView.as_view(),
    name="order_tracking",
),
path(
    "admin/orders/",
    AdminOrderListAPIView.as_view(),
    name="admin_orders",
),

path(
    "admin/orders/<int:order_id>/status/",
    AdminOrderStatusUpdateAPIView.as_view(),
    name="admin_order_status_update",
),
path(
    "admin/categories/",
    AdminCategoryListAPIView.as_view(),
    name="admin_categories",
),
path(
    "admin/products/",
    AdminProductListCreateAPIView.as_view(),
    name="admin_products",
),
path(
    "admin/products/<int:pk>/",
    AdminProductDetailAPIView.as_view(),
    name="admin_product_detail",
),
path(
    "admin/apartments/",
    AdminDeliveryApartmentListCreateAPIView.as_view(),
    name="admin_apartments",
),
path(
    "admin/apartments/<int:pk>/",
    AdminDeliveryApartmentDetailAPIView.as_view(),
    name="admin_apartment_detail",
),
path(
    "admin/customers/",
    AdminCustomerListAPIView.as_view(),
    name="admin-customers",
),

path(
    "admin/customers/<int:pk>/status/",
    AdminCustomerStatusUpdateAPIView.as_view(),
    name="admin-customer-status",
),
path(
    "admin/banners/",
    AdminBannerListCreateAPIView.as_view(),
    name="admin-banners",
),

path(
    "admin/banners/<int:pk>/",
    AdminBannerDetailAPIView.as_view(),
    name="admin-banner-detail",
),

path(
    "banners/",
    PublicBannerListAPIView.as_view(),
    name="public-banners",
),
path(
    "reviews/",
    CustomerReviewListCreateAPIView.as_view(),
    name="reviews"
),
path(
    "admin/reviews/",
    AdminReviewListAPIView.as_view(),
    name="admin-reviews"
),
path(
    "admin/reviews/<int:review_id>/",
    AdminReviewDetailAPIView.as_view(),
    name="admin-review-detail"
),
# Admin coupon management
path(
    "admin/coupons/",
    AdminCouponListCreateAPIView.as_view(),
    name="admin-coupons",
),

path(
    "admin/coupons/<int:pk>/",
    AdminCouponDetailAPIView.as_view(),
    name="admin-coupon-detail",
),

# Public active coupons
path(
    "coupons/",
    PublicCouponListAPIView.as_view(),
    name="public-coupons",
),

# Customer coupon validation
path(
    "coupons/validate/",
    ValidateCouponAPIView.as_view(),
    name="validate-coupon",
),
path(
    "payments/create-order/",
    CreateRazorpayOrderAPIView.as_view(),
    name="create_razorpay_order",
),
path(
    "payments/verify/",
    VerifyRazorpayPaymentAPIView.as_view(),
    name="verify_razorpay_payment",
),
path(
    "payments/webhook/",
    RazorpayWebhookAPIView.as_view(),
    name="razorpay_webhook",
),
]
