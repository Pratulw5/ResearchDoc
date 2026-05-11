from django.urls import path
from .views import PaperListCreateView, PaperDeleteView, PaperDownloadView

urlpatterns = [
    path("", PaperListCreateView.as_view(), name="paper-list-create"),
    path("<int:pk>/", PaperDeleteView.as_view(), name="paper-delete"),
    path("<int:pk>/download/", PaperDownloadView.as_view(), name="paper-download"),
]