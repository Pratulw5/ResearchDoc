# projects/urls.py
from django.urls import path, include
from .views import (
    ProjectListCreateView,
    ProjectDeleteView,
    ProjectEditView,
    TaskListCreateView,
    TaskDetailView,
)
from papers.views import SearchView
from comparisons.views import CompareView   # ← ad-hoc compare (no save)

urlpatterns = [
    # Global search
    path("search/",  SearchView.as_view(),  name="global-search"),

    # Ad-hoc compare (Search page uses this; does NOT save)
    path("compare/", CompareView.as_view(), name="ad-hoc-compare"),

    # Project list / create
    path("", ProjectListCreateView.as_view(), name="project-list-create"),

    # ── Tasks ──
    path("<int:pk>/tasks/",                  TaskListCreateView.as_view(), name="task-list-create"),
    path("<int:pk>/tasks/<int:task_pk>/",    TaskDetailView.as_view(),     name="task-detail"),

    # ── Project edit / delete ──
    path("<int:pk>/edit/",   ProjectEditView.as_view(),   name="project-edit"),
    path("<int:pk>/delete/", ProjectDeleteView.as_view(), name="project-delete"),

    # ── Papers + References (mounted per-project) ──
    path("<int:project_pk>/", include("papers.urls")),
]