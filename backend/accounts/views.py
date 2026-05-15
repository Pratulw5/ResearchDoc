from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.utils import timezone
from .models import User
from dj_rest_auth.registration.views import SocialLoginView
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.github.views import GitHubOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client


class _SocialLoginBase(SocialLoginView):
    client_class = OAuth2Client

    def get_response(self):
        response = super().get_response()
        user = self.user
        if not user.role:
            user.role = "viewer"
            user.save(update_fields=["role"])
        response.data.update({
            "role":       user.role,
            "first_name": user.first_name,
        })
        return response


class GoogleLoginView(_SocialLoginBase):
    adapter_class = GoogleOAuth2Adapter
    callback_url  = settings.GOOGLE_CALLBACK_URL


class GitHubLoginView(_SocialLoginBase):
    adapter_class = GitHubOAuth2Adapter
    callback_url  = settings.GITHUB_CALLBACK_URL


def _token_pair(user):
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


def _archive_payload(user):
    """Returns the archive status dict included in 403 responses."""
    return {
        "archived":       True,
        "archive_reason": user.archive_reason,
        "archive_message": user.archive_message,
        "archived_at":    user.archived_at,
        "archived_until": user.archived_until,
    }


# ─────────────────────────────────────────
#  Auth
# ─────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def signup(request):
    data = request.data
    email      = data.get("email", "").strip().lower()
    password   = data.get("password", "")
    first_name = data.get("first_name", "").strip()
    last_name  = data.get("last_name", "").strip()
    role       = data.get("role", "viewer")
    orcid      = data.get("orcid", "").strip()

    if not email or not password:
        return Response({"error": "Email and password are required."}, status=status.HTTP_400_BAD_REQUEST)
    if not first_name or not last_name:
        return Response({"error": "First name and last name are required."}, status=status.HTTP_400_BAD_REQUEST)

    valid_roles = {"student", "professor", "lab", "organisation", "viewer", "independent"}
    if role not in valid_roles:
        return Response({"error": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({"error": "An account with this email already exists."}, status=status.HTTP_409_CONFLICT)

    user = User.objects.create_user(
        username=email, email=email, password=password,
        first_name=first_name, last_name=last_name,
        role=role, orcid=orcid,
    )
    return Response(_token_pair(user), status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get("username", "").strip().lower()
        password = request.data.get("password", "")

        user = authenticate(request, username=email, password=password)
        if user is None:
            if not User.objects.filter(email=email).exists():
                return Response({"error": "Account does not exist."}, status=status.HTTP_404_NOT_FOUND)
            return Response({"error": "Incorrect password."}, status=status.HTTP_401_UNAUTHORIZED)

        # ── Auto-unarchive if the archive period has expired ──────────────────
        if user.is_archived and user.archived_until and user.archived_until <= timezone.now():
            user.is_archived     = False
            user.archive_reason  = ""
            user.archive_message = ""
            user.archived_at     = None
            user.archived_until  = None
            user.save(update_fields=["is_archived", "archive_reason", "archive_message", "archived_at", "archived_until"])

        # ── Block archived users from logging in ──────────────────────────────
        if user.is_archived:
            return Response(
                {"error": "account_archived", **_archive_payload(user)},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {**_token_pair(user), "role": user.role, "first_name": user.first_name},
            status=status.HTTP_200_OK,
        )


class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data["refresh"])
            token.blacklist()
        except Exception:
            pass
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────
#  Account — GET / PATCH  /accounts/me/
# ─────────────────────────────────────────

class MeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        u = request.user

        # ── Auto-unarchive if period expired ─────────────────────────────────
        if u.is_archived and u.archived_until and u.archived_until <= timezone.now():
            u.is_archived     = False
            u.archive_reason  = ""
            u.archive_message = ""
            u.archived_at     = None
            u.archived_until  = None
            u.save(update_fields=["is_archived", "archive_reason", "archive_message", "archived_at", "archived_until"])

        # ── Return 403 with archive info for archived users ───────────────────
        if u.is_archived:
            return Response(
                {"error": "account_archived", **_archive_payload(u)},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response({
            "first_name":   u.first_name,
            "last_name":    u.last_name,
            "email":        u.email,
            "orcid":        u.orcid,
            "role":         u.role,
            "is_admin":     u.role == "admin",
        })

    def delete(self, request):
        user = request.user
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request):
        u    = request.user
        data = request.data

        valid_roles = {"student", "professor", "lab", "organisation", "viewer", "independent"}

        if "first_name" in data:
            v = data["first_name"].strip()
            if not v:
                return Response({"error": "First name cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            u.first_name = v

        if "last_name" in data:
            v = data["last_name"].strip()
            if not v:
                return Response({"error": "Last name cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)
            u.last_name = v

        if "orcid" in data:
            u.orcid = data["orcid"].strip()

        if "role" in data:
            if data["role"] not in valid_roles:
                return Response({"error": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)
            u.role = data["role"]

        u.save()
        return Response({
            "first_name": u.first_name,
            "last_name":  u.last_name,
            "email":      u.email,
            "orcid":      u.orcid,
            "role":       u.role,
        })


# ─────────────────────────────────────────
#  Change password — POST /accounts/change-password/
# ─────────────────────────────────────────

class ChangePasswordAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        u                = request.user
        current_password = request.data.get("current_password", "")
        new_password     = request.data.get("new_password", "")

        if not u.check_password(current_password):
            return Response({"error": "Current password is incorrect."}, status=status.HTTP_401_UNAUTHORIZED)

        if len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters."}, status=status.HTTP_400_BAD_REQUEST)

        u.set_password(new_password)
        u.save()
        return Response(_token_pair(u), status=status.HTTP_200_OK)


from .permissions import IsAdminRole
from projects.models import Project
from papers.models import Paper


# ─────────────────────────────────────────
#  Admin — /accounts/admin/users/
# ─────────────────────────────────────────

class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        users = User.objects.all().order_by("date_joined")
        data = [
            {
                "id":            u.id,
                "first_name":    u.first_name,
                "last_name":     u.last_name,
                "email":         u.email,
                "role":          u.role,
                "orcid":         u.orcid,
                "date_joined":   u.date_joined,
                "is_active":     u.is_active,
                "is_archived":   u.is_archived,
                "archive_reason": u.archive_reason,
                "archive_message": u.archive_message,
                "archived_at":   u.archived_at,
                "archived_until": u.archived_until,
            }
            for u in users
        ]
        return Response(data)


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get_user(self, pk):
        try:
            return User.objects.get(pk=pk)
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        u = self._get_user(pk)
        if not u:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            "id": u.id, "first_name": u.first_name, "last_name": u.last_name,
            "email": u.email, "role": u.role, "orcid": u.orcid,
            "date_joined": u.date_joined, "is_active": u.is_active,
            "is_archived": u.is_archived, "archive_reason": u.archive_reason,
            "archive_message": u.archive_message,
            "archived_at": u.archived_at, "archived_until": u.archived_until,
        })

    def patch(self, request, pk):
        u = self._get_user(pk)
        if not u:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        valid_roles = {"student", "professor", "lab", "organisation", "viewer", "independent", "admin"}
        data = request.data

        if "first_name" in data: u.first_name = data["first_name"].strip()
        if "last_name"  in data: u.last_name  = data["last_name"].strip()
        if "orcid"      in data: u.orcid      = data["orcid"].strip()
        if "is_active"  in data: u.is_active  = bool(data["is_active"])
        if "role" in data:
            if data["role"] not in valid_roles:
                return Response({"error": "Invalid role."}, status=status.HTTP_400_BAD_REQUEST)
            if u.role == "admin" and data["role"] != "admin":
                if User.objects.filter(role="admin").count() <= 1:
                    return Response({"error": "Cannot demote the last admin."}, status=status.HTTP_400_BAD_REQUEST)
            u.role = data["role"]

        u.save()
        return Response({"id": u.id, "email": u.email, "role": u.role, "is_active": u.is_active})

    def delete(self, request, pk):
        u = self._get_user(pk)
        if not u:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)
        if u == request.user:
            return Response({"error": "Cannot delete your own account here."}, status=status.HTTP_400_BAD_REQUEST)
        u.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────
#  Admin — Archive / Unarchive a user
#  POST /accounts/admin/users/<pk>/archive/
#  POST /accounts/admin/users/<pk>/unarchive/
# ─────────────────────────────────────────

ARCHIVE_REASON_LABELS = {
    "subscription_expired":     "Subscription Expired",
    "subscription_not_renewed": "Subscription Not Renewed",
    "subscription_removed":     "Subscription Removed",
    "security_violation":       "Security Violation",
    "harmful_content":          "Harmful / Abusive Content",
    "terms_violation":          "Terms of Service Violation",
    "fraud":                    "Fraudulent Activity",
    "inactivity":               "Extended Inactivity",
    "admin_decision":           "Administrative Decision",
    "other":                    "Other",
}


class AdminArchiveUserView(APIView):
    """
    POST /accounts/admin/users/<pk>/archive/
    Body:
      {
        "reason":          "subscription_expired",   // required — key from ARCHIVE_REASON_LABELS
        "message":         "Your plan lapsed on …",  // optional custom note
        "archived_until":  "2025-12-31T23:59:59Z"   // optional ISO datetime; omit = indefinite
      }
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            u = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if u == request.user:
            return Response({"error": "You cannot archive your own account."}, status=status.HTTP_400_BAD_REQUEST)

        reason = request.data.get("reason", "").strip()
        if reason not in ARCHIVE_REASON_LABELS:
            return Response(
                {"error": f"Invalid reason. Valid values: {list(ARCHIVE_REASON_LABELS.keys())}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        message        = request.data.get("message", "").strip()
        archived_until = request.data.get("archived_until")   # ISO string or None

        parsed_until = None
        if archived_until:
            from django.utils.dateparse import parse_datetime
            parsed_until = parse_datetime(archived_until)
            if parsed_until is None:
                return Response(
                    {"error": "Invalid archived_until format. Use ISO 8601, e.g. 2025-12-31T23:59:59Z"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if parsed_until <= timezone.now():
                return Response(
                    {"error": "archived_until must be in the future."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        u.is_archived     = True
        u.archive_reason  = reason
        u.archive_message = message
        u.archived_at     = timezone.now()
        u.archived_until  = parsed_until
        u.save(update_fields=["is_archived", "archive_reason", "archive_message", "archived_at", "archived_until"])

        return Response({
            "id":             u.id,
            "email":          u.email,
            "is_archived":    u.is_archived,
            "archive_reason": u.archive_reason,
            "archive_message": u.archive_message,
            "archived_at":    u.archived_at,
            "archived_until": u.archived_until,
        })


class AdminUnarchiveUserView(APIView):
    """
    POST /accounts/admin/users/<pk>/unarchive/
    No body required.
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        try:
            u = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response({"error": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        u.is_archived     = False
        u.archive_reason  = ""
        u.archive_message = ""
        u.archived_at     = None
        u.archived_until  = None
        u.save(update_fields=["is_archived", "archive_reason", "archive_message", "archived_at", "archived_until"])

        return Response({"id": u.id, "email": u.email, "is_archived": False})


# ─────────────────────────────────────────
#  Admin — /accounts/admin/projects/
# ─────────────────────────────────────────

class AdminProjectListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        projects = Project.objects.select_related("user").all().order_by("-created_at")
        return Response([
            {
                "id": p.id, "title": p.title, "description": p.description,
                "created_at": p.created_at, "paper_count": p.paper_count,
                "owner": {"id": p.user.id, "email": p.user.email, "name": f"{p.user.first_name} {p.user.last_name}".strip()},
            }
            for p in projects
        ])


class AdminProjectDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request, pk):
        try:
            Project.objects.get(pk=pk).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Project.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────
#  Admin — /accounts/admin/papers/
# ─────────────────────────────────────────

class AdminPaperListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        papers = Paper.objects.select_related("project__user").all().order_by("-created_at")
        return Response([
            {
                "id": p.id, "title": p.title, "paper_type": p.paper_type,
                "status": p.status, "created_at": p.created_at,
                "project": {"id": p.project.id, "title": p.project.title},
                "owner": {"id": p.project.user.id, "email": p.project.user.email},
            }
            for p in papers
        ])


class AdminPaperDetailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request, pk):
        try:
            Paper.objects.get(pk=pk).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Paper.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────
#  Admin — stats overview
# ─────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        from django.db.models import Count
        role_counts = dict(User.objects.values_list("role").annotate(c=Count("id")))
        return Response({
            "total_users":    User.objects.count(),
            "total_projects": Project.objects.count(),
            "total_papers":   Paper.objects.count(),
            "users_by_role":  role_counts,
            "active_users":   User.objects.filter(is_active=True).count(),
            "archived_users": User.objects.filter(is_archived=True).count(),
        })
    
# accounts/views_plans.py
# Add these views to accounts/views.py and wire up in urls.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import SubscriptionPlan
from .permissions import IsAdminRole


def _serialize_plan(p: SubscriptionPlan) -> dict:
    return {
        "id":          p.id,
        "value":       p.value,
        "label":       p.label,
        "description": p.description,
        "color":       p.color,
        "is_archived": p.is_archived,
        "order":       p.order,
        "created_at":  str(p.created_at),
        "updated_at":  str(p.updated_at),
    }


class AdminPlanListCreateView(APIView):
    """
    GET  /accounts/admin/plans/       → list all plans (including archived)
    POST /accounts/admin/plans/       → create a new plan
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        plans = SubscriptionPlan.objects.all()
        return Response([_serialize_plan(p) for p in plans])

    def post(self, request):
        value = request.data.get("value", "").strip().lower().replace(" ", "_")
        label = request.data.get("label", "").strip()

        if not value or not label:
            return Response({"error": "value and label are required."}, status=400)

        if SubscriptionPlan.objects.filter(value=value).exists():
            return Response({"error": f"A plan with key '{value}' already exists."}, status=409)

        plan = SubscriptionPlan.objects.create(
            value=value,
            label=label,
            description=request.data.get("description", "").strip(),
            color=request.data.get("color", "slate"),
            order=request.data.get("order", SubscriptionPlan.objects.count()),
        )
        return Response(_serialize_plan(plan), status=201)


class AdminPlanDetailView(APIView):
    """
    GET    /accounts/admin/plans/<pk>/   → retrieve
    PATCH  /accounts/admin/plans/<pk>/   → edit label / description / color / order / is_archived
    DELETE /accounts/admin/plans/<pk>/   → hard delete (only if no users on this plan)
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def _get(self, pk):
        try:
            return SubscriptionPlan.objects.get(pk=pk)
        except SubscriptionPlan.DoesNotExist:
            return None

    def get(self, request, pk):
        p = self._get(pk)
        if not p:
            return Response({"error": "Not found."}, status=404)
        return Response(_serialize_plan(p))

    def patch(self, request, pk):
        p = self._get(pk)
        if not p:
            return Response({"error": "Not found."}, status=404)

        data = request.data
        if "label"       in data: p.label       = data["label"].strip()
        if "description" in data: p.description = data["description"].strip()
        if "color"       in data: p.color       = data["color"]
        if "order"       in data: p.order       = int(data["order"])
        if "is_archived" in data: p.is_archived = bool(data["is_archived"])

        # Don't allow editing the value key (it maps to User.role)
        p.save()
        return Response(_serialize_plan(p))

    def delete(self, request, pk):
        from .models import User
        p = self._get(pk)
        if not p:
            return Response({"error": "Not found."}, status=404)

        # Safety: refuse if users are on this plan
        user_count = User.objects.filter(role=p.value).count()
        if user_count > 0:
            return Response(
                {"error": f"Cannot delete — {user_count} user(s) are on this plan. Archive it instead."},
                status=400,
            )

        p.delete()
        return Response(status=204)


# ── URL additions (add to accounts/urls.py) ───────────────────────────────────
#
# from .views_plans import AdminPlanListCreateView, AdminPlanDetailView
#
# urlpatterns += [
#     path("admin/plans/",          AdminPlanListCreateView.as_view(), name="admin_plans"),
#     path("admin/plans/<int:pk>/", AdminPlanDetailView.as_view(),     name="admin_plan_detail"),
# ]