from django.urls import path
from .views import (
    LoginAPIView, LogoutAPIView, signup, MeAPIView, ChangePasswordAPIView,
    GoogleLoginView, GitHubLoginView,
    AdminUserListView, AdminUserDetailView,
    AdminArchiveUserView, AdminUnarchiveUserView,   # ← new
    AdminProjectListView, AdminProjectDetailView,
    AdminPaperListView, AdminPaperDetailView,
    AdminStatsView,AdminPlanListCreateView, AdminPlanDetailView
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path("login/signin/",        LoginAPIView.as_view(),          name="login"),
    path("login/logout/",        LogoutAPIView.as_view(),         name="logout"),
    path("login/signup/",        signup,                          name="signup"),
    path("login/token/refresh/", TokenRefreshView.as_view(),      name="token_refresh"),
    # account
    path("me/",                  MeAPIView.as_view(),             name="me"),
    path("change-password/",     ChangePasswordAPIView.as_view(), name="change_password"),
    path("social/google/",       GoogleLoginView.as_view(),       name="social_google"),
    path("social/github/",       GitHubLoginView.as_view(),       name="social_github"),
    # admin
    path("admin/stats/",                        AdminStatsView.as_view(),           name="admin_stats"),
    path("admin/users/",                        AdminUserListView.as_view(),        name="admin_users"),
    path("admin/users/<int:pk>/",               AdminUserDetailView.as_view(),      name="admin_user_detail"),
    path("admin/users/<int:pk>/archive/",       AdminArchiveUserView.as_view(),     name="admin_user_archive"),    # ← new
    path("admin/users/<int:pk>/unarchive/",     AdminUnarchiveUserView.as_view(),   name="admin_user_unarchive"),  # ← new
    path("admin/projects/",                     AdminProjectListView.as_view(),     name="admin_projects"),
    path("admin/projects/<int:pk>/",            AdminProjectDetailView.as_view(),   name="admin_project_detail"),
    path("admin/papers/",                       AdminPaperListView.as_view(),       name="admin_papers"),
    path("admin/papers/<int:pk>/",              AdminPaperDetailView.as_view(),     name="admin_paper_detail"),
     path("admin/plans/",          AdminPlanListCreateView.as_view(), name="admin_plans"),
   path("admin/plans/<int:pk>/", AdminPlanDetailView.as_view(),     name="admin_plan_detail"),
]