from django.urls import path
from .views import (
    PaperListCreateView,
    PaperDetailView,
    PaperUploadView,
    PaperImageUploadView,
    PaperDownloadView,
    ReferenceListCreateView,
    ReferenceDetailView,
    ReferenceFileUploadView,
    PaperConvertToBlocksView,
    PaperExtractRefsView,
    PaperBibliographyView,
    PaperCitationMarkersView,     
)

# These patterns are mounted under /projects/<project_pk>/
urlpatterns = [
    # ── Papers ────────────────────────────────────────────────────────────────
    path("papers/",
         PaperListCreateView.as_view(), name="paper-list-create"),
    path("papers/<int:pk>/",
         PaperDetailView.as_view(), name="paper-detail"),
    path("papers/<int:pk>/upload/",
         PaperUploadView.as_view(), name="paper-upload"),
    path("papers/<int:pk>/upload-image/",
         PaperImageUploadView.as_view(), name="paper-image-upload"),
    path("papers/<int:pk>/download/",
         PaperDownloadView.as_view(), name="paper-download"),
    path("papers/<int:pk>/convert-to-blocks/",
         PaperConvertToBlocksView.as_view(), name="paper-convert-to-blocks"),

    # Citation / ref sync
    path("papers/<int:pk>/extract-refs/",
         PaperExtractRefsView.as_view(), name="paper-extract-refs"),
    path("papers/<int:pk>/bibliography/",
         PaperBibliographyView.as_view(), name="paper-bibliography"),
    path("papers/<int:pk>/citation-markers/",
         PaperCitationMarkersView.as_view(), name="paper-citation-markers"),

    # ── Reference items ───────────────────────────────────────────────────────
    path("references/",
         ReferenceListCreateView.as_view(), name="reference-list-create"),
    path("references/<int:pk>/",
         ReferenceDetailView.as_view(), name="reference-detail"),
    path("references/<int:pk>/upload/",
         ReferenceFileUploadView.as_view(), name="reference-upload"),
        
]