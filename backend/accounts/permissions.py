# accounts/permissions.py
# Add IsNotArchived alongside your existing IsAdminRole permission.

from django.utils import timezone
from rest_framework.permissions import BasePermission
from rest_framework.exceptions import PermissionDenied


class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == "admin")


class IsNotArchived(BasePermission):
    """
    Blocks any authenticated request from an archived user.
    Auto-unarchives if archived_until has passed (same logic as LoginAPIView).
    Returns a 403 with the same archive payload the frontend already understands.
    """

    def has_permission(self, request, view):
        user = request.user

        # Unauthenticated requests are handled by IsAuthenticated — not our concern.
        if not user or not user.is_authenticated:
            return True

        # Auto-unarchive if the suspension period has expired.
        if user.is_archived and user.archived_until and user.archived_until <= timezone.now():
            user.is_archived     = False
            user.archive_reason  = ""
            user.archive_message = ""
            user.archived_at     = None
            user.archived_until  = None
            user.save(update_fields=[
                "is_archived", "archive_reason", "archive_message",
                "archived_at", "archived_until",
            ])

        if user.is_archived:
            raise PermissionDenied({
                "error":           "account_archived",
                "archive_reason":  user.archive_reason,
                "archive_message": user.archive_message,
                "archived_at":     user.archived_at,
                "archived_until":  user.archived_until,
            })

        return True