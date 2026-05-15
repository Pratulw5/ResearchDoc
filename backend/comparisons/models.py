# comparison/models.py
from django.db import models
from django.conf import settings


class SavedComparison(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name="comparisons",
        on_delete=models.CASCADE,
    )

    title = models.CharField(max_length=255, blank=True)
    items = models.JSONField(default=list)
    criteria = models.JSONField(default=list)
    resolved = models.JSONField(default=list)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.title or f"Comparison #{self.id}"