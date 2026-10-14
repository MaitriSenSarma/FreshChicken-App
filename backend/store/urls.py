
from django.urls import path

from .views import (
    health_check,
    ProductListAPIView,
    DeliveryApartmentListAPIView,
)
from .auth_view import (
    RegisterAPIView, 
    LoginAPIView,
)
urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("products/", ProductListAPIView.as_view(), name="products"),
    path(
        "apartments/",
        DeliveryApartmentListAPIView.as_view(),
        name="apartments",
    ),
    path("auth/register/", RegisterAPIView.as_view(), name="register"),
path("auth/login/", LoginAPIView.as_view(), name="login"),
]
