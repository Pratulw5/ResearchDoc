from django.urls import path, include
from .views import ProjectListCreateView, ProjectDeleteView, ProjectEditView

urlpatterns = [
    path("", ProjectListCreateView.as_view(), name="project-list-create"),
    path("<int:pk>/", ProjectDeleteView.as_view(), name="project-delete"),
    path("<int:pk>/edit/", ProjectEditView.as_view(), name="project-edit"),
    # Nest all paper actions under /projects/<id>/papers/
    path("<int:project_pk>/papers/", include("papers.urls")),
]