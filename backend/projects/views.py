from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Project, TimelineTask

def _serialize_task(t) -> dict:
    return {
        "id":          t.id,
        "title":       t.title,
        "description": t.description,
        "task_type":   t.task_type,
        "status":      t.status,
        "progress":    t.progress,
        "start_date":  str(t.start_date) if t.start_date else None,
        "end_date":    str(t.end_date)   if t.end_date   else None,
        "created_at":  str(t.created_at),
    }


class TaskListCreateView(APIView):
    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        tasks = project.tasks.all()
        return Response([_serialize_task(t) for t in tasks])

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        title = request.data.get("title", "").strip()
        if not title:
            return Response({"error": "title required"}, status=400)

        t = TimelineTask.objects.create(
            project=project,
            title=title,
            description=request.data.get("description", ""),
            task_type=request.data.get("task_type", "other"),
            status=request.data.get("status", "todo"),
            progress=int(request.data.get("progress", 0)),
            start_date=request.data.get("start_date") or None,
            end_date=request.data.get("end_date")   or None,
        )
        return Response(_serialize_task(t), status=201)


class TaskDetailView(APIView):
    def _get(self, pk, task_pk, user):
        return TimelineTask.objects.get(pk=task_pk, project__pk=pk, project__user=user)

    def patch(self, request, pk, task_pk):
        try:
            t = self._get(pk, task_pk, request.user)
        except TimelineTask.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

        for field in ("title", "description", "task_type", "status", "progress",
                      "start_date", "end_date"):
            if field in request.data:
                val = request.data[field]
                if field in ("start_date", "end_date") and val == "":
                    val = None
                setattr(t, field, val)
        t.save()
        return Response(_serialize_task(t))

    def delete(self, request, pk, task_pk):
        try:
            t = self._get(pk, task_pk, request.user)
        except TimelineTask.DoesNotExist:
            return Response({"error": "Not found"}, status=404)
        t.delete()
        return Response({"message": "Deleted"})


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

