from django.db import models
from django.conf import settings
from typing import TYPE_CHECKING
from django.db.models import QuerySet


class Project(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    if TYPE_CHECKING:
        from papers.models import Paper
        papers: QuerySet["Paper"]

    @property
    def paper_count(self) -> int:
        return self.papers.count()

    def __str__(self) -> str:
        return self.title