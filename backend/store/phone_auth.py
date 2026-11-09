
import hashlib
import hmac
import logging
import re
import secrets

import requests

from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken


logger = logging.getLogger(__name__)

SMS_API_URL = "https://2factor.in/API/R1/Bulk/"

OTP_EXPIRY_SECONDS = 300
OTP_COOLDOWN_SECONDS = 60
MAX_OTP_ATTEMPTS = 5


# --------------------------------------------------
# Phone number helper
# Accepts 9876543210 or 919876543210
# --------------------------------------------------

def normalize_phone(value):
    digits = re.sub(r"\D", "", str(value or ""))

    if len(digits) == 10:
        digits = "91" + digits

    if len(digits) != 12 or not digits.startswith("91"):
        return None

    return digits


# --------------------------------------------------
# Hash OTP before storing it
# --------------------------------------------------

def otp_hash(phone, otp):
    value = f"{phone}:{otp}:{settings.SECRET_KEY}"
    return hashlib.sha256(value.encode()).hexdigest()


# --------------------------------------------------
# Send OTP through 2Factor Bulk SMS API
# POST /api/auth/phone/send-otp/
# --------------------------------------------------

class SendPhoneOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone = normalize_phone(request.data.get("phone"))

        if not phone:
            return Response(
                {
                    "detail": (
                        "Enter a valid 10-digit Indian mobile number."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "TWOFACTOR_API_KEY", None)

        if not api_key:
            logger.error("TWOFACTOR_API_KEY is not configured.")

            return Response(
                {"detail": "SMS service is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        cooldown_key = f"phone_otp_cooldown:{phone}"
        otp_hash_key = f"phone_otp_hash:{phone}"
        attempts_key = f"phone_otp_attempts:{phone}"

        if cache.get(cooldown_key):
            return Response(
                {
                    "detail": (
                        "Please wait 60 seconds before requesting "
                        "another OTP."
                    )
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Generate a secure six-digit OTP.
        otp = f"{secrets.randbelow(1_000_000):06d}"

        # Bulk API requires module, apikey, and messages.
        payload = {
            "module": "TRANS_SMS",
            "apikey": api_key,
            "messages": [
                {
                    "smsFrom": "FRESHM",
                    "smsTo": "+" + phone,
                    "smsText": (
                        f"Your FreshMeat login OTP is {otp}. "
                        "It expires in 5 minutes. Do not share it."
                    ),
                }
            ],
        }

        try:
            response = requests.post(
                SMS_API_URL,
                json=payload,
                timeout=20,
            )

            logger.info(
                "2Factor HTTP status: %s",
                response.status_code,
            )

            try:
                result = response.json()
            except ValueError:
                logger.error(
                    "2Factor returned a non-JSON response. HTTP status: %s",
                    response.status_code,
                )

                return Response(
                    {"detail": "Invalid response from SMS provider."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        except requests.Timeout:
            logger.warning("2Factor request timed out.")

            return Response(
                {
                    "detail": (
                        "SMS provider timed out. Please try again later."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except requests.RequestException as exc:
            logger.error(
                "2Factor request failed: %s",
                type(exc).__name__,
            )

            return Response(
                {"detail": "Could not connect to the SMS provider."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Check HTTP errors and provider-level errors.
        if not response.ok or not isinstance(result, dict):
            logger.error(
                "2Factor HTTP %s response: %s",
                response.status_code,
                str(result)[:1000],
            )

            return Response(
                {
                    "detail": (
                        f"SMS provider returned HTTP "
                        f"{response.status_code}. "
                        "Check the Django terminal."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if result.get("success") is not True:
            # Do not log the API key or OTP.
            logger.error(
                "2Factor rejected the SMS request: %s",
                str(result)[:1000],
            )

            return Response(
                {
                    "detail": (
                        "2Factor rejected the SMS request. "
                        "Check the provider response in the terminal."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Store the OTP hash only after provider acceptance.
        cache.set(
            otp_hash_key,
            otp_hash(phone, otp),
            timeout=OTP_EXPIRY_SECONDS,
        )

        cache.set(
            attempts_key,
            0,
            timeout=OTP_EXPIRY_SECONDS,
        )

        cache.set(
            cooldown_key,
            True,
            timeout=OTP_COOLDOWN_SECONDS,
        )

        return Response(
            {
                "detail": (
                    "SMS request accepted. Check your messages."
                )
            },
            status=status.HTTP_200_OK,
        )


# --------------------------------------------------
# Verify OTP and issue JWT tokens
# POST /api/auth/phone/verify-otp/
# --------------------------------------------------

class VerifyPhoneOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        phone = normalize_phone(request.data.get("phone"))
        otp = str(request.data.get("otp", "")).strip()

        if not phone or not re.fullmatch(r"\d{6}", otp):
            return Response(
                {
                    "detail": (
                        "Enter a valid Indian mobile number "
                        "and six-digit OTP."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_hash_key = f"phone_otp_hash:{phone}"
        attempts_key = f"phone_otp_attempts:{phone}"

        expected = cache.get(otp_hash_key)
        attempts = cache.get(attempts_key)

        if expected is None or attempts is None:
            return Response(
                {
                    "detail": (
                        "OTP expired. Please request a new one."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if attempts >= MAX_OTP_ATTEMPTS:
            cache.delete(otp_hash_key)
            cache.delete(attempts_key)

            return Response(
                {
                    "detail": (
                        "Too many attempts. Request a new OTP."
                    )
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Count each verification attempt.
        cache.set(
            attempts_key,
            attempts + 1,
            timeout=OTP_EXPIRY_SECONDS,
        )

        submitted = otp_hash(phone, otp)

        if not hmac.compare_digest(expected, submitted):
            return Response(
                {"detail": "Incorrect OTP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Consume OTP after successful verification.
        cache.delete(otp_hash_key)
        cache.delete(attempts_key)

        User = get_user_model()
        username = "+" + phone

        # Support existing accounts in either phone-number format.
        user = User.objects.filter(username=username).first()

        if user is None:
            user = User.objects.filter(username=phone).first()

        if user is None:
            user = User(username=username)
            user.set_unusable_password()
            user.save()

        if not user.is_active:
            return Response(
                {"detail": "This account is disabled."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Issue JWT tokens for the React frontend and checkout.
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": {
                    "id": user.pk,
                    "phone": username,
                    "label": username,
                },
            },
            status=status.HTTP_200_OK,
        )
