from django.urls import path
from .views import LoginAPIView, LogoutAPIView, signup
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('login/signin/', LoginAPIView.as_view(), name='login'),
    path('login/logout/', LogoutAPIView.as_view(), name='logout'),
    path('login/signup/', signup, name='signup'),
    path('login/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]