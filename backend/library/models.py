from django.db import models

class Paper(models.Model):
    title = models.CharField(max_length=255)
    authors = models.CharField(max_length=255)
    year = models.IntegerField()
    pages = models.IntegerField()
    size = models.CharField(max_length=20)

    def __str__(self):
        return self.title