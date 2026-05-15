# ResearchDoc/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('projects/', include('projects.urls')),
    path('projects/<int:project_pk>/', include('papers.urls')),  # ← add this
    path('comparisons/', include('comparisons.urls')),
]