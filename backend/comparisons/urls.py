# comparison/urls.py
from django.urls import path
from .views import (
    SavedComparisonListCreateView,
    SavedComparisonDetailView,
    SavedComparisonRegenerateView,
)

# Mounted at /comparisons/
urlpatterns = [
    path("",            SavedComparisonListCreateView.as_view()),
    path("<int:pk>/",   SavedComparisonDetailView.as_view()),
    path("<int:pk>/regenerate/", SavedComparisonRegenerateView.as_view()),
]