from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework_simplejwt.tokens import RefreshToken
User = get_user_model()
# Helper to create JWT tokens
def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

# ------------------------
# Login View
# ------------------------
class LoginAPIView(APIView):
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"error": "Username and password required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if user exists
        try:
            user_obj = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"error": "User does not exist"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check password
        user = authenticate(request, username=username, password=password)

        if not user:
            return Response(
                {"error": "Incorrect password"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Success
        login(request, user)

        tokens = get_tokens_for_user(user)

        return Response({
            "message": "Login successful",
            **tokens
        }, status=status.HTTP_200_OK)

# ------------------------
# Logout View
# ------------------------
class LogoutAPIView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out"}, status=status.HTTP_200_OK)

# ------------------------
# Signup View
# ------------------------
@api_view(['POST'])
def signup(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')

    if not username or not password:
        return Response({"error": "Username and password required"}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"error": "User already exists"}, status=400)

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )

    # Optional: auto-login after signup (return tokens)
    tokens = get_tokens_for_user(user)
    return Response({
        "message": "User created successfully",
        **tokens
    }, status=201)