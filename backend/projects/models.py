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

class TimelineTask(models.Model):
    TASK_TYPES = [
        ("research",    "Research"),
        ("experiment",  "Experiment"),
        ("conference",  "Conference"),
        ("meeting",     "Meeting"),
        ("writing",     "Writing"),
        ("submission",  "Submission"),
        ("milestone",   "Milestone"),
        ("other",       "Other"),
    ]
    STATUS_CHOICES = [
        ("todo",   "To Do"),
        ("active", "In Progress"),
        ("done",   "Done"),
    ]

    project     = models.ForeignKey(Project, related_name="tasks", on_delete=models.CASCADE)
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    task_type   = models.CharField(max_length=20, choices=TASK_TYPES, default="other")
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default="todo")
    progress    = models.IntegerField(default=0)          # 0–100
    start_date  = models.DateField(null=True, blank=True)
    end_date    = models.DateField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["start_date", "created_at"]

    def __str__(self):
        return f"[{self.task_type}] {self.title}"

