
from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDeleteView,
    AddPaperView,
)

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="projects"),
    path("<int:pk>/", ProjectDeleteView.as_view(), name="project-delete"),
    path("<int:pk>/papers/", AddPaperView.as_view(), name="add-paper"),
]