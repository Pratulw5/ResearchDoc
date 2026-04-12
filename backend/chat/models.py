from django.db import models
from django.conf import settings
from projects.models import Project

class ChatHistory(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    query = models.TextField()
    response = models.TextField()
    sources = models.JSONField(default=list) # Store list of PaperChunk IDs
    timestamp = models.DateTimeField(auto_now_add=True)