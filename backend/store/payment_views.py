
import hmac
import hashlib
import logging
from decimal import Decimal

import razorpay

from django.conf import settings
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import Order, RazorpayWebhookEvent
from .payment_services import (
    process_successful_payment,
    refund_razorpay_payment,
)


logger = logging.getLogger(__name__)


# --------------------------------------------------
# RAZORPAY HELPERS
# --------------------------------------------------

def get_razorpay_client():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise ValueError("Razorpay API keys are not configured.")

    return razorpay.Client(
        auth=(
            settings.RAZORPAY_KEY_ID,
            settings.RAZORPAY_KEY_SECRET,
        )
    )


def get_amount_in_paise(amount):
    return int(
        (Decimal(str(amount)) * Decimal("100")).quantize(
            Decimal("1")
        )
    )


# --------------------------------------------------
# 1. CREATE RAZORPAY ORDER
# --------------------------------------------------

class CreateRazorpayOrderAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")

        if not order_id:
            return Response(
                {"error": "Order ID is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                order = Order.objects.select_for_update().get(
                    id=order_id,
                    customer=request.user,
                )

                if order.payment_method != "online":
                    return Response(
                        {"error": "This is not an online payment order."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if order.payment_status != "pending":
                    return Response(
                        {"error": "This order cannot be paid."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                amount_paise = get_amount_in_paise(
                    order.total_amount
                )

                if amount_paise <= 0:
                    return Response(
                        {"error": "Invalid payment amount."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Reuse the existing Razorpay order on retries.
                if not order.razorpay_order_id:
                    client = get_razorpay_client()

                    razorpay_order = client.order.create({
                        "amount": amount_paise,
                        "currency": "INR",
                        "receipt": f"freshmeat_{order.id}",
                    })

                    order.razorpay_order_id = razorpay_order["id"]
                    order.save(update_fields=["razorpay_order_id"])

                return Response({
                    "key": settings.RAZORPAY_KEY_ID,
                    "razorpay_order_id": order.razorpay_order_id,
                    "amount": amount_paise,
                    "currency": "INR",
                    "order_id": order.id,
                })

        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception:
            logger.exception("Razorpay order creation failed.")
            return Response(
                {"error": "Unable to create payment. Please try again."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


# --------------------------------------------------
# 2. VERIFY RAZORPAY PAYMENT
# --------------------------------------------------

class VerifyRazorpayPaymentAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        payment_id = request.data.get("razorpay_payment_id")
        razorpay_order_id = request.data.get("razorpay_order_id")
        signature = request.data.get("razorpay_signature")

        if not all([
            order_id,
            payment_id,
            razorpay_order_id,
            signature,
        ]):
            return Response(
                {"error": "All payment details are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = get_razorpay_client()

            # Verify the payment signature.
            client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            })

            # Fetch payment details directly from Razorpay.
            payment = client.payment.fetch(payment_id)

            with transaction.atomic():
                order = Order.objects.select_for_update().get(
                    id=order_id,
                    customer=request.user,
                )

                if order.payment_method != "online":
                    return Response(
                        {"error": "This is not an online payment order."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if order.razorpay_order_id != razorpay_order_id:
                    return Response(
                        {"error": "Razorpay order ID mismatch."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if order.payment_status == "paid":
                    if order.razorpay_payment_id == payment_id:
                        return Response({
                            "message": "Payment already verified.",
                            "payment_status": "paid",
                            "order_id": order.id,
                        })

                    return Response(
                        {"error": "Order has already been paid."},
                        status=status.HTTP_409_CONFLICT,
                    )

                # Allow the same captured payment to continue through
                # the refund flow if the webhook processed it first.
                if order.payment_status == "refund_pending":
                    if order.razorpay_payment_id != payment_id:
                        return Response(
                            {"error": "Payment ID does not match this order."},
                            status=status.HTTP_409_CONFLICT,
                        )

                elif order.payment_status == "pending":
                    expected_amount = get_amount_in_paise(
                        order.total_amount
                    )

                    if (
                        payment.get("order_id") != order.razorpay_order_id
                        or payment.get("amount") != expected_amount
                        or payment.get("currency") != "INR"
                        or payment.get("status") != "captured"
                    ):
                        return Response(
                            {"error": "Payment details are invalid."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    order = process_successful_payment(
                        order_id=order.id,
                        payment_id=payment_id,
                        razorpay_order_id=razorpay_order_id,
                    )

                else:
                    return Response(
                        {"error": "This order cannot be paid."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # The database transaction has finished.
            # Call Razorpay's refund API outside the transaction.
            if order.refund_status == "required":
                try:
                    order = refund_razorpay_payment(order)
                    order.refresh_from_db()

                except Exception:
                    logger.exception(
                        "Refund processing needs attention for order %s",
                        order.id,
                    )
                    order.refresh_from_db()

                    return Response({
                        "message": "Payment captured. Refund processing needs attention.",
                        "payment_status": order.payment_status,
                        "refund_status": order.refund_status,
                        "order_id": order.id,
                    }, status=status.HTTP_202_ACCEPTED)

                return Response({
                    "message": "Payment captured. Refund request submitted.",
                    "payment_status": order.payment_status,
                    "refund_status": order.refund_status,
                    "refund_id": order.razorpay_refund_id,
                    "order_id": order.id,
                }, status=status.HTTP_202_ACCEPTED)

            return Response({
                "message": "Payment verified successfully.",
                "payment_status": order.payment_status,
                "order_id": order.id,
            })

        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        except razorpay.errors.SignatureVerificationError:
            return Response(
                {"error": "Invalid payment signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except ValueError as error:
            return Response(
                {"error": str(error)},
                status=status.HTTP_409_CONFLICT,
            )

        except Exception:
            logger.exception("Razorpay payment verification failed.")
            return Response(
                {"error": "Payment verification failed."},
                status=status.HTTP_502_BAD_GATEWAY,
            )


# --------------------------------------------------
# 3. RAZORPAY WEBHOOK
# --------------------------------------------------

@method_decorator(csrf_exempt, name="dispatch")
class RazorpayWebhookAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        webhook_signature = request.headers.get(
            "X-Razorpay-Signature"
        )

        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET

        if not webhook_signature or not webhook_secret:
            return Response(
                {"error": "Webhook configuration is missing."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify signature using the original request body.
        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"),
            request.body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(
            expected_signature,
            webhook_signature,
        ):
            return Response(
                {"error": "Invalid webhook signature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            event_data = request.data
            event = event_data.get("event")

            event_id = request.headers.get(
                "X-Razorpay-Event-Id"
            )

            if not event_id:
                return Response(
                    {"error": "Webhook event ID is missing."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            payment_id = None
            razorpay_order_id = None
            order = None

            # Fetch and validate captured payment outside
            # the database transaction.
            if event == "payment.captured":
                payment_entity = (
                    event_data.get("payload", {})
                    .get("payment", {})
                    .get("entity", {})
                )

                payment_id = payment_entity.get("id")
                razorpay_order_id = payment_entity.get("order_id")

                if not payment_id or not razorpay_order_id:
                    return Response(
                        {"error": "Payment details are missing."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                order = Order.objects.filter(
                    razorpay_order_id=razorpay_order_id,
                    payment_method="online",
                ).first()

                if not order:
                    return Response(
                        {"error": "Order not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                client = get_razorpay_client()
                payment = client.payment.fetch(payment_id)

                expected_amount = get_amount_in_paise(
                    order.total_amount
                )

                if (
                    payment.get("order_id") != order.razorpay_order_id
                    or payment.get("amount") != expected_amount
                    or payment.get("currency") != "INR"
                    or payment.get("status") != "captured"
                ):
                    return Response(
                        {"error": "Payment details do not match."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            # Process the event once and record it.
            with transaction.atomic():
                webhook_record, created = (
                    RazorpayWebhookEvent.objects.get_or_create(
                        event_id=event_id,
                        defaults={
                            "event_type": event or "unknown",
                            "processed": False,
                        },
                    )
                )

                webhook_record = (
                    RazorpayWebhookEvent.objects.select_for_update()
                    .get(id=webhook_record.id)
                )

                if webhook_record.processed:
                    return Response(
                        {"status": "already processed"},
                        status=status.HTTP_200_OK,
                    )

                if event == "payment.captured":
                    order = Order.objects.select_for_update().get(
                        id=order.id
                    )

                    order = process_successful_payment(
                        order_id=order.id,
                        payment_id=payment_id,
                        razorpay_order_id=razorpay_order_id,
                    )

                elif event == "payment.failed":
                    # A failed attempt may be retried by the customer.
                    # Keep the order pending.
                    pass

                # Other events are acknowledged without changing
                # the order's payment status in this version.
                webhook_record.processed = True
                webhook_record.save(update_fields=["processed"])

            # Process a required refund after the database transaction.
            if event == "payment.captured" and order:
                order.refresh_from_db()

                if order.refund_status == "required":
                    try:
                        order = refund_razorpay_payment(order)

                    except Exception:
                        logger.exception(
                            "Webhook refund needs manual reconciliation for order %s",
                            order.id,
                        )

                        order.refresh_from_db()

                        return Response({
                            "status": "received",
                            "payment_status": order.payment_status,
                            "refund_status": order.refund_status,
                            "message": "Refund needs manual reconciliation.",
                        }, status=status.HTTP_200_OK)

            return Response(
                {"status": "received"},
                status=status.HTTP_200_OK,
            )

        except Order.DoesNotExist:
            return Response(
                {"error": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        except Exception:
            logger.exception("Razorpay webhook processing failed.")
            return Response(
                {"error": "Webhook processing failed."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

