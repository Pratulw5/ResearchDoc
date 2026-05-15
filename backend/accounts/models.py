from django.contrib.auth.models import AbstractUser
from django.db import models

ARCHIVE_REASONS = [
        ("subscription_expired",  "Subscription Expired"),
        ("subscription_not_renewed", "Subscription Not Renewed"),
        ("subscription_removed",  "Subscription Removed"),
        ("security_violation",    "Security Violation"),
        ("harmful_content",       "Harmful / Abusive Content"),
        ("terms_violation",       "Terms of Service Violation"),
        ("fraud",                 "Fraudulent Activity"),
        ("inactivity",            "Extended Inactivity"),
        ("admin_decision",        "Administrative Decision"),
        ("other",                 "Other"),
    ]
class UserRole(models.TextChoices):
    STUDENT      = "student",      "Student"
    PROFESSOR    = "professor",    "Professor"
    LAB          = "lab",          "Lab"
    ORGANISATION = "organisation", "Organisation"
    VIEWER       = "viewer",       "Viewer"
    INDEPENDENT  = "independent",  "Independent Researcher"
    ADMIN        = "admin",        "Admin"


class User(AbstractUser):
    email = models.EmailField(unique=True)
    orcid = models.CharField(max_length=64, blank=True, default="")
    role  = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.VIEWER)
    is_archived      = models.BooleanField(default=False)
    archive_reason   = models.CharField(
        max_length=40, choices=ARCHIVE_REASONS, blank=True, default=""
    )
    archive_message  = models.TextField(blank=True, default="")   # optional custom note from admin
    archived_at      = models.DateTimeField(null=True, blank=True)
    archived_until   = models.DateTimeField(null=True, blank=True)  # None = indefinite
 
    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["username"]

    @property
    def is_admin_role(self):
        return self.role == UserRole.ADMIN

    def __str__(self):
        return self.email
    


class SubscriptionPlan(models.Model):
    """
    Admin-managed subscription plans.
    These replace (and seed from) the hardcoded SUBSCRIPTION_PLANS list.
    """
 
    COLOR_CHOICES = [
        ("slate",   "Slate"),
        ("teal",    "Teal"),
        ("emerald", "Emerald"),
        ("sky",     "Sky"),
        ("violet",  "Violet"),
        ("blue",    "Blue"),
        ("amber",   "Amber"),
        ("rose",    "Rose"),
        ("orange",  "Orange"),
        ("indigo",  "Indigo"),
    ]
 
    # role key that maps to User.role — must be unique
    value       = models.CharField(max_length=40, unique=True)
    label       = models.CharField(max_length=80)
    description = models.CharField(max_length=255, blank=True, default="")
    color       = models.CharField(max_length=20, choices=COLOR_CHOICES, default="slate")
 
    # soft-archive: archived plans can't be assigned to new users
    is_archived = models.BooleanField(default=False)
 
    # Display / sort order
    order = models.PositiveIntegerField(default=0)
 
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
 
    class Meta:
        ordering = ["order", "created_at"]
 
    def __str__(self):
        return f"{self.label} ({self.value})"
 
 
# ── Seed helper (call from a migration or management command) ─────────────────
 
DEFAULT_PLANS = [
    {"value": "viewer",       "label": "Free",         "description": "Read-only access",                "color": "slate",   "order": 0},
    {"value": "student",      "label": "Student",      "description": "Individual student researcher",   "color": "teal",    "order": 1},
    {"value": "independent",  "label": "Independent",  "description": "Self-directed researcher",        "color": "emerald", "order": 2},
    {"value": "professor",    "label": "Pro",          "description": "Faculty & academic researchers",  "color": "sky",     "order": 3},
    {"value": "lab",          "label": "Lab",          "description": "Research group (up to 20)",       "color": "violet",  "order": 4},
    {"value": "organisation", "label": "Organisation", "description": "Institution or company",          "color": "blue",    "order": 5},
    {"value": "admin",        "label": "Admin",        "description": "Full platform access",            "color": "amber",   "order": 6},
]
 
 
def seed_plans():
    for p in DEFAULT_PLANS:
        SubscriptionPlan.objects.get_or_create(value=p["value"], defaults=p)