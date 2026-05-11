import os
from django.http import FileResponse, Http404
from rest_framework.views import APIView
from rest_framework.response import Response
from projects.models import Project
from .models import Paper


def _get_project(pk, user):
    try:
        return Project.objects.get(pk=pk, user=user)
    except Project.DoesNotExist:
        return None


class PaperListCreateView(APIView):
    def get(self, request, project_pk):
        project = _get_project(project_pk, request.user)
        if not project:
            return Response({"error": "Project not found"}, status=404)
        papers = project.papers.all().order_by("-created_at")
        return Response([
            {
                "id": p.id,
                "title": p.title,
                "authors": p.authors,
                "abstract": p.abstract,
                "status": p.status,
                "created_at": str(p.created_at),
                "file_name": os.path.basename(p.file.name) if p.file else None,
                "file_size": p.file.size if p.file else None,
            }
            for p in papers
        ])

    def post(self, request, project_pk):
        project = _get_project(project_pk, request.user)
        if not project:
            return Response({"error": "Project not found"}, status=404)

        file     = request.FILES.get("file")
        title    = request.data.get("title")
        authors  = request.data.get("authors", "")
        abstract = request.data.get("abstract", "")

        if not file or not title:
            return Response({"error": "file and title are required"}, status=400)

        paper = Paper.objects.create(
            project=project, file=file, title=title,
            authors=authors, abstract=abstract, status="pending",
        )
        return Response(
            {
                "id": paper.id,
                "title": paper.title,
                "authors": paper.authors,
                "abstract": paper.abstract,
                "status": paper.status,
                "created_at": str(paper.created_at),
                "file_name": os.path.basename(paper.file.name),
                "file_size": paper.file.size,
            },
            status=201,
        )


class PaperDeleteView(APIView):
    def delete(self, request, project_pk, pk):
        try:
            paper = Paper.objects.get(pk=pk, project__pk=project_pk, project__user=request.user)
        except Paper.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        paper.file.delete(save=False)  # remove file from storage
        paper.delete()
        return Response({"message": "Deleted"})


class PaperDownloadView(APIView):
    def get(self, request, project_pk, pk):
        try:
            paper = Paper.objects.get(pk=pk, project__pk=project_pk, project__user=request.user)
        except Paper.DoesNotExist:
            raise Http404
        # TODO: when Cloudflare R2 is added, return a signed URL redirect here instead:
        # from django.shortcuts import redirect
        # return redirect(generate_signed_url(paper.file.name))
        response = FileResponse(
            paper.file.open("rb"),
            as_attachment=True,
            filename=os.path.basename(paper.file.name),
        )
        return response