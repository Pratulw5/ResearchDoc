from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Project


class ProjectListCreateView(APIView):
    def get(self, request):
        projects = Project.objects.filter(user=request.user).order_by("-created_at")
        data = [
            {
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "paper_count": p.paper_count,
                "created_at": p.created_at,
            }
            for p in projects
        ]
        return Response(data)

    def post(self, request):
        title = request.data.get("title")
        description = request.data.get("description", "")
        if not title:
            return Response({"error": "Title is required"}, status=status.HTTP_400_BAD_REQUEST)
        project = Project.objects.create(
            user=request.user, title=title, description=description
        )
        return Response(
            {
                "id": project.id,
                "title": project.title,
                "description": project.description,
                "paper_count": 0,
                "created_at": project.created_at,
            },
            status=status.HTTP_201_CREATED,
        )


class ProjectEditView(APIView):
    def put(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        title = request.data.get("title", project.title)
        description = request.data.get("description", project.description)
        if not title:
            return Response({"error": "Title is required"}, status=status.HTTP_400_BAD_REQUEST)

        project.title = title
        project.description = description
        project.save()
        return Response({
            "id": project.id,
            "title": project.title,
            "description": project.description,
        })


class ProjectDeleteView(APIView):
    def delete(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)
        project.delete()
        return Response({"message": "Project deleted successfully"}, status=status.HTTP_200_OK)