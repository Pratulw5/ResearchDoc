from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Project
from papers.models import Paper

class ProjectListCreateView(APIView):

    def get(self, request):
        projects = Project.objects.filter(user=request.user)

        data = [
            {
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "created_at": p.created_at,
            }
            for p in projects
        ]

        return Response(data)

    def post(self, request):
        title = request.data.get("title")
        description = request.data.get("description", "")

        if not title:
            return Response(
                {"error": "Title is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        project = Project.objects.create(
            user=request.user,
            title=title,
            description=description
        )

        return Response(
            {
                "id": project.id,
                "title": project.title,
                "description": project.description,
            },
            status=status.HTTP_201_CREATED
        )
class ProjectDeleteView(APIView):

    def delete(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        project.delete()  # deletes papers + chunks + (chats if FK cascade)
        
        return Response(
            {"message": "Project deleted successfully"},
            status=status.HTTP_200_OK
        )


class AddPaperView(APIView):

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response(
                {"error": "Project not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        file = request.FILES.get("file")
        title = request.data.get("title")
        authors = request.data.get("authors", "")
        abstract = request.data.get("abstract", "")

        if not file or not title:
            return Response(
                {"error": "file and title are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        paper = Paper.objects.create(
            project=project,
            file=file,
            title=title,
            authors=authors,
            abstract=abstract,
            status="pending",
        )

        return Response(
            {
                "id": paper.id,
                "title": paper.title,
                "status": paper.status,
            },
            status=status.HTTP_201_CREATED
        )