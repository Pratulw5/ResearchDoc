from django.db import models
from projects.models import Project
from pgvector.django import VectorField


# ─── Paper (main research document) ──────────────────────────────────────────

class Paper(models.Model):
    """
    The primary research document for a project.
    `content` stores a JSON array of rich-text blocks (see BlockType below).
    """

    PAPER_TYPES = [
        ("research", "Research Paper"),
        ("literature_review", "Literature Review"),
        ("notes", "Research Notes"),
        ("reference_notes", "Reference Notes"),
        ("conference_notes", "Conference Notes"),
        ("meeting_notes", "Meeting Notes"),
        ("experiment_log", "Experiment Log"),
        ("technical_doc", "Technical Documentation"),
        ("proposal", "Proposal"),
        ("thesis", "Thesis"),
        ("dataset_doc", "Dataset Documentation"),
    ]

    CITATION_FORMATS = [
        ("ieee",     "IEEE"),
        ("apa",      "APA 7th"),
        ("mla",      "MLA 9th"),
        ("chicago",  "Chicago 17th"),
        ("vancouver","Vancouver"),
        ("harvard",  "Harvard"),
    ]

    project = models.ForeignKey(
        Project, related_name="papers", on_delete=models.CASCADE
    )
    title   = models.CharField(max_length=255)
    authors = models.TextField(blank=True)
    abstract = models.TextField(blank=True)
    paper_type = models.CharField(
        max_length=50,
        choices=PAPER_TYPES,
        default="notes",
    )
    citation_format = models.CharField(
        max_length=20,
        choices=CITATION_FORMATS,
        default="ieee",
    )

    # Rich-content blocks: JSON array  [{ type, …attrs }]
    content = models.TextField(default="[]")

    status = models.CharField(max_length=20, default="draft")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class PaperAsset(models.Model):
    """
    A file (PDF, image, …) stored in Cloudflare R2 and attached to a paper.
    Images embedded in the rich editor are stored here too.
    """
    ASSET_TYPE_CHOICES = [
        ("pdf",   "PDF document"),
        ("image", "Embedded image"),
        ("other", "Other"),
    ]
    paper             = models.ForeignKey(Paper, related_name="assets", on_delete=models.CASCADE)
    asset_type        = models.CharField(max_length=10, choices=ASSET_TYPE_CHOICES, default="pdf")
    r2_key            = models.TextField()
    file_url          = models.TextField()
    original_filename = models.TextField()
    created_at        = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.asset_type}: {self.original_filename}"


class PaperChunk(models.Model):
    paper = models.ForeignKey(Paper, on_delete=models.CASCADE, related_name="chunks")
    chunk_index = models.IntegerField(default=0)
    content = models.TextField()
    page_number = models.IntegerField(default=1)
    embedding = VectorField(dimensions=1536)

    def __str__(self):
        return f"Chunk p{self.page_number} – {self.paper.title}"


# ─── Reference items (quick notes, links, videos, …) ─────────────────────────

class ReferenceItem(models.Model):
    """ß
    Lightweight reference material attached to a project.
    Not the main paper — just supporting material the researcher wants handy.
    """
    ITEM_TYPE_CHOICES = [
        ("note",  "Quick Note"),
        ("link",  "Web Link"),
        ("video", "Video"),
        ("file",  "File / Attachment"),
        ("quote", "Quote / Excerpt"),
    ]

    project    = models.ForeignKey(Project, related_name="reference_items", on_delete=models.CASCADE)
    item_type  = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES)
    title      = models.CharField(max_length=255, blank=True)

    # Plain text body (notes, quotes)
    body       = models.TextField(blank=True)

    # URL (links, videos)
    url        = models.TextField(blank=True)

    # Optional file stored in R2 (attachments)
    r2_key     = models.TextField(blank=True)
    file_url   = models.TextField(blank=True)
    file_name  = models.TextField(blank=True)

    # User-defined tags  e.g. ["methodology", "background"]
    tags       = models.JSONField(default=list, blank=True)

    # Extra bibliographic metadata (populated by enrich_reference)
    authors    = models.TextField(blank=True)
    year       = models.CharField(max_length=10, blank=True)
    journal    = models.TextField(blank=True)
    volume     = models.CharField(max_length=50, blank=True)
    issue      = models.CharField(max_length=50, blank=True)
    pages      = models.CharField(max_length=50, blank=True)
    doi        = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.item_type}] {self.title or self.url or 'untitled'}"
    
