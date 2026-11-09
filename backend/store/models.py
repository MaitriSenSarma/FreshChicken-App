
from django.conf import settings
from django.db import models
from django.utils import timezone

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Product(models.Model):
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    pack_size = models.CharField(max_length=100, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to="products/", blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class DeliveryApartment(models.Model):
    name = models.CharField(max_length=200, unique=True)
    area = models.CharField(max_length=200, blank=True, default="")
    full_address = models.TextField(blank=True, default="")
    pincode = models.CharField(max_length=10, blank=True, default="")
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )
    is_approved = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "Delivery Apartment"
        verbose_name_plural = "Delivery Apartments"

    def __str__(self):
        return self.name


class Order(models.Model):

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("preparing", "Preparing"),
        ("out_for_delivery", "Out for Delivery"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("cod", "Cash on Delivery"),
        ("online", "Online Payment"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("failed", "Failed"),
        ("refund_pending", "Refund Pending"),
        ("refunded", "Refunded"),
    ]

    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
    )

    apartment = models.ForeignKey(
        DeliveryApartment,
        on_delete=models.PROTECT,
        related_name="orders",
    )

    apartment_name = models.CharField(max_length=200)
    delivery_pincode = models.CharField(max_length=10)
    flat_number = models.CharField(max_length=50)
    floor = models.CharField(max_length=50, blank=True, default="")
    landmark = models.CharField(max_length=255, blank=True, default="")
    phone = models.CharField(max_length=20)

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    default=0
)
    subtotal_amount = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    default=0
)

    discount_amount = models.DecimalField(
    max_digits=10,
    decimal_places=2,
    default=0
)

    coupon = models.ForeignKey(
    "Coupon",
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name="orders"
)

    coupon_code = models.CharField(
    max_length=50,
    blank=True,
    default=""
)


    # NEW: Customer's selected payment method
    payment_method = models.CharField(
        max_length=10,
        choices=PAYMENT_METHOD_CHOICES,
        default="cod",
    )

    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default="pending",
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="pending",
    )
    # Razorpay payment details
    razorpay_order_id = models.CharField(
    max_length=100,
    blank=True,
    default="",
)

    razorpay_payment_id = models.CharField(
    max_length=100,
    blank=True,
    default="",
)
    refund_status = models.CharField(
    max_length=20,
    choices=[
        ("not_required", "Not Required"),
        ("required", "Refund Required"),
        ("pending", "Refund Pending"),
        ("processed", "Processed"),
        ("failed", "Failed"),
    ],
    default="not_required",
)

    razorpay_refund_id = models.CharField(
    max_length=100,
    blank=True,
    default="",
)
    payment_verified_at = models.DateTimeField(
    null=True,
    blank=True,
)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk} - {self.customer}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="order_items",
    )

    product_name = models.CharField(max_length=200)
    pack_size = models.CharField(max_length=100, blank=True, default="")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"


class ProductPack(models.Model):
    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="packs",
    )

    pack_size = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["product__name", "price"]

    def __str__(self):
        return f"{self.product.name} - {self.pack_size}"

class OrderStatusHistory(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
    )

    status = models.CharField(
        max_length=30,
        choices=Order.STATUS_CHOICES,
    )

    note = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Order #{self.order_id} - {self.get_status_display()}"
class Banner(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True, default="")
    button_text = models.CharField(
        max_length=100,
        blank=True,
        default="Shop chicken"
    )
    image = models.ImageField(
        upload_to="banners/",
        blank=True,
        null=True
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Homepage Banner"
        verbose_name_plural = "Homepage Banners"

    def __str__(self):
        return self.title
class Review(models.Model):
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="product_reviews"
    )

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="reviews"
    )

    rating = models.PositiveSmallIntegerField()
    comment = models.TextField()

    approved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} - {self.rating}/5"
class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ("percentage", "Percentage"),
        ("fixed", "Fixed Amount"),
    ]

    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(
        max_length=20,
        choices=DISCOUNT_TYPE_CHOICES
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )
    minimum_order_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )
    expires_at = models.DateField(null=True, blank=True)
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.code

    def is_valid(self, subtotal):
        if not self.is_active:
            return False

        if self.expires_at and self.expires_at < timezone.localdate():
            return False

        if self.max_uses is not None and self.used_count >= self.max_uses:
            return False

        if subtotal < self.minimum_order_amount:
            return False

        return True

    def calculate_discount(self, subtotal):
        from decimal import Decimal

        if self.discount_type == "percentage":
            discount = subtotal * self.discount_value / Decimal("100")
        else:
            discount = self.discount_value

        return min(discount, subtotal).quantize(Decimal("0.01"))
class RazorpayWebhookEvent(models.Model):
    event_id = models.CharField(
        max_length=100,
        unique=True
    )

    event_type = models.CharField(max_length=100)

    processed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.event_id