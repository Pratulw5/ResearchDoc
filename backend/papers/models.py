from django.db import models
from projects.models import Project
from pgvector.django import VectorField

class Paper(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='papers')
    file = models.FileField(upload_to='papers/')
    title = models.CharField(max_length=500)
    authors = models.CharField(max_length=1000, blank=True)
    abstract = models.TextField(blank=True)
    metadata = models.JSONField(default=dict) # Comparison data goes here
    status = models.CharField(max_length=20, default='pending') # pending, processing, complete
    created_at = models.DateTimeField(auto_now_add=True)

class PaperChunk(models.Model):
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name='chunks')
    content = models.TextField()
    page_number = models.IntegerField()
    embedding = VectorField(dimensions=1536) # Default for OpenAI models