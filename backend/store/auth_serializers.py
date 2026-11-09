
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["id", "username", "email", "password"]

    def validate_email(self, value):
        email = value.strip().lower()

        if not email:
            raise serializers.ValidationError(
                "Email is required."
            )

        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def create(self, validated_data):
        validated_data["email"] = (
            validated_data["email"].strip().lower()
        )
        return User.objects.create_user(**validated_data)

class EmailTokenObtainPairSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        trim_whitespace=False
    )

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        # Find the account using email
        user = User.objects.filter(
            email__iexact=email
        ).first()

        if not user:
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        # Check password and account status
        if not user.is_active or not user.check_password(password):
            raise serializers.ValidationError({
                "detail": "Invalid email or password."
            })

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)

        return {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }