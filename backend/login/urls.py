from django.urls import path
from .views import LoginAPIView, LogoutAPIView, signup
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('signin/', LoginAPIView.as_view(), name='login'),
    path('logout/', LogoutAPIView.as_view(), name='logout'),
    path('signup/', signup, name='signup'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]