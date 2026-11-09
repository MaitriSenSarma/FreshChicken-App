
import logging
from decimal import Decimal

import razorpay

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Order, Product, Coupon


logger = logging.getLogger(__name__)


def get_razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise ValueError("Razorpay API keys are not configured.")

    return razorpay.Client(
        auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET,
        )
    )


def process_successful_payment(order_id, payment_id, razorpay_order_id):
    """
    Process a Razorpay payment that has already been verified
    as captured by Razorpay.
    """

    with transaction.atomic():

        order = Order.objects.select_for_update().get(id=order_id)

        # Prevent duplicate processing.
        if order.payment_status == "paid":
            if order.razorpay_payment_id == payment_id:
                return order

            raise ValueError("Order has already been paid.")

        if order.payment_status == "refund_pending":
            if order.razorpay_payment_id == payment_id:
                return order

            raise ValueError("Order is awaiting a refund.")

        if order.payment_status != "pending":
            raise ValueError("Order cannot be paid.")

        if order.payment_method != "online":
            raise ValueError("Order is not an online payment.")

        if order.razorpay_order_id != razorpay_order_id:
            raise ValueError("Razorpay order ID does not match.")

        # Calculate required product quantities.
        quantities = {}

        for item in order.items.all():
            quantities[item.product_id] = (
                quantities.get(item.product_id, 0) + item.quantity
            )

        # Lock products and check stock.
        products = {
            product.id: product
            for product in Product.objects.select_for_update().filter(
                id__in=quantities.keys()
            )
            .order_by("id")
        }

        stock_available = all(
            product_id in products
            and products[product_id].stock_quantity >= quantity
            for product_id, quantity in quantities.items()
        )

        # Check coupon validity before using it.
        coupon = None
        coupon_valid = True

        if order.coupon_id:
            coupon = Coupon.objects.select_for_update().get(
                id=order.coupon_id
            )

            coupon_valid = coupon.is_valid(order.subtotal_amount)

        # If stock or coupon is invalid, record the captured
        # payment and require a refund.
        if not stock_available or not coupon_valid:

            order.razorpay_payment_id = payment_id
            order.payment_verified_at = timezone.now()
            order.payment_status = "refund_pending"
            order.refund_status = "required"
            order.status = "cancelled"

            order.save(update_fields=[
                "razorpay_payment_id",
                "payment_verified_at",
                "payment_status",
                "refund_status",
                "status",
            ])

            return order

        # Deduct stock only after all checks pass.
        for product_id, quantity in quantities.items():
            product = products[product_id]
            product.stock_quantity -= quantity
            product.save(update_fields=["stock_quantity"])

        # Update coupon usage.
        if coupon:
            coupon.used_count += 1
            coupon.save(update_fields=["used_count"])

        # Mark payment successful.
        order.payment_status = "paid"
        order.razorpay_payment_id = payment_id
        order.payment_verified_at = timezone.now()
        order.status = "confirmed"

        order.save(update_fields=[
            "payment_status",
            "razorpay_payment_id",
            "payment_verified_at",
            "status",
        ])

        return order



def refund_razorpay_payment(order):
    """
    Request a full refund for an order marked refund_pending.

    Important:
    - Never automatically retry an uncertain refund request.
    - Reconcile uncertain or failed refunds with Razorpay first.
    """

    order_id = order.id

    # Prepare everything that can fail before reserving the refund.
    client = get_razorpay_client()

    with transaction.atomic():

        order = Order.objects.select_for_update().get(id=order_id)

        if not order.razorpay_payment_id:
            raise ValueError("Payment ID is missing.")

        if order.payment_status != "refund_pending":
            raise ValueError("Order is not awaiting a refund.")

        # A failed refund must be checked in Razorpay Dashboard.
        # Do not automatically create another refund.
        if order.refund_status == "failed":
            raise ValueError(
                "Refund failed. Reconcile with Razorpay before retrying."
            )

        if order.razorpay_refund_id:
            return order

        if order.refund_status == "pending":
            raise ValueError(
                "Refund is already pending or its result needs reconciliation."
            )

        if order.refund_status == "processed":
            return order

        if order.refund_status != "required":
            raise ValueError("Refund is not marked as required.")

        payment_id = order.razorpay_payment_id

        amount_paise = int(
            (
                Decimal(str(order.total_amount)) * Decimal("100")
            ).quantize(Decimal("1"))
        )

        # Reserve the refund request before contacting Razorpay.
        order.refund_status = "pending"
        order.save(update_fields=["refund_status"])

    # Contact Razorpay outside the database transaction.
    try:

        refund = client.payment.refund(
            payment_id,
            {"amount": amount_paise},
        )

        refund_id = refund.get("id")
        gateway_status = refund.get("status", "pending")

        if not refund_id:
            raise ValueError(
                "Razorpay did not return a refund ID. "
                "The result must be reconciled."
            )

        if gateway_status not in ["pending", "processed", "failed"]:
            gateway_status = "pending"

        with transaction.atomic():

            order = Order.objects.select_for_update().get(id=order_id)

            if order.razorpay_refund_id and (
                order.razorpay_refund_id != refund_id
            ):
                raise ValueError(
                    "A different refund ID is already saved."
                )

            order.razorpay_refund_id = refund_id
            order.refund_status = gateway_status

            if gateway_status == "processed":
                order.payment_status = "refunded"

            order.save(update_fields=[
                "razorpay_refund_id",
                "refund_status",
                "payment_status",
            ])

        return order

    except Exception:
        logger.exception(
            "Refund result needs reconciliation for order %s",
            order_id,
        )
        raise
