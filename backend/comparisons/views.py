"""
comparison/views.py

Endpoints:
  GET  /comparisons/                  → list saved comparisons for the user
  POST /comparisons/                  → save a comparison (after generating it on the frontend)
  GET  /comparisons/<pk>/             → get one saved comparison
  PATCH /comparisons/<pk>/            → rename
  DELETE /comparisons/<pk>/           → delete

  POST /projects/compare/             → ad-hoc generate (NOT saved) — used by Search page
"""

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response

from papers.models import Paper, ReferenceItem
from papers.utils.openai import _paper_summary, _ref_summary, _generate_comparison
from .models import SavedComparison


# ── helpers ───────────────────────────────────────────────────────────────────

def _serialize(c: SavedComparison) -> dict:
    return {
        "id":         c.id,
        "title":      c.title,
        "items":      c.items,
        "criteria":   c.criteria,
        "resolved":   c.resolved,
        "created_at": str(c.created_at),
        "updated_at": str(c.updated_at),
    }


def _build_summaries(items: list[dict], user) -> tuple[list[dict], list[dict]]:
    """
    Resolve item list → (summaries_for_openai, resolved_items_for_storage).
    Items cross projects — we just require project__user == request.user.
    """
    summaries = []
    resolved  = []

    for item in items:
        itype = item.get("type")
        iid   = item.get("id")

        if itype == "paper":
            try:
                paper = Paper.objects.get(pk=iid, project__user=user)
            except Paper.DoesNotExist:
                continue
            summaries.append({"title": paper.title, "summary": _paper_summary(paper)})
            resolved.append({
                "id":            paper.id,
                "type":          "paper",
                "title":         paper.title,
                "project_id":    paper.project_id,
                "project_title": paper.project.title,
                "authors":       paper.authors,
                "paper_type":    paper.paper_type,
            })

        elif itype == "reference":
            try:
                ref = ReferenceItem.objects.get(pk=iid, project__user=user)
            except ReferenceItem.DoesNotExist:
                continue
            summaries.append({"title": ref.title or ref.url, "summary": _ref_summary(ref)})
            resolved.append({
                "id":            ref.id,
                "type":          "reference",
                "title":         ref.title or ref.url or "Untitled",
                "project_id":    ref.project_id,
                "project_title": ref.project.title,
                "authors":       ref.authors,
                "item_type":     ref.item_type,
            })

    return summaries, resolved


# ── ad-hoc compare (used by Search page, no save) ────────────────────────────

class CompareView(APIView):
    """POST /projects/compare/"""

    def post(self, request):
        items = request.data.get("items", [])
        if len(items) < 2:
            return Response({"error": "At least 2 items required."}, status=400)

        summaries, resolved = _build_summaries(items, request.user)
        if len(summaries) < 2:
            return Response({"error": "Could not resolve enough items."}, status=400)

        try:
            comparison = _generate_comparison(summaries)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

        criteria = comparison.get("criteria", [])
        cells_map = comparison.get("cells", {})

        # Attach cells to each resolved item
        for item in resolved:
            title = item["title"]
            item["cells"] = cells_map.get(title, {})

        return Response({
            "criteria": criteria,
            "items":    resolved,
        })


# ── saved comparisons ─────────────────────────────────────────────────────────

class SavedComparisonListCreateView(APIView):
    """GET /comparisons/   POST /comparisons/"""

    def get(self, request):
        comps = SavedComparison.objects.filter(user=request.user)
        return Response([_serialize(c) for c in comps])

    def post(self, request):
        """
        Save a comparison that was already generated on the frontend.
        Body: { title, criteria, items (resolved), raw_items }
        """
        title    = request.data.get("title", "").strip() or "Untitled Comparison"
        criteria = request.data.get("criteria", [])
        resolved = request.data.get("resolved", [])
        raw_items = request.data.get("items", [])

        if len(resolved) < 2:
            return Response({"error": "At least 2 resolved items required."}, status=400)

        comp = SavedComparison.objects.create(
            user=request.user,
            title=title,
            items=raw_items,
            criteria=criteria,
            resolved=resolved,
        )
        return Response(_serialize(comp), status=201)


class SavedComparisonDetailView(APIView):
    """GET / PATCH / DELETE /comparisons/<pk>/"""

    def _get(self, pk, user):
        return get_object_or_404(SavedComparison, pk=pk, user=user)

    def get(self, request, pk):
        return Response(_serialize(self._get(pk, request.user)))

    def patch(self, request, pk):
        c = self._get(pk, request.user)
        if "title" in request.data:
            c.title = request.data["title"]
        if "criteria" in request.data:
            c.criteria = request.data["criteria"]
        if "resolved" in request.data:
            c.resolved = request.data["resolved"]
        c.save()
        return Response(_serialize(c))

    def delete(self, request, pk):
        c = self._get(pk, request.user)
        c.delete()
        return Response({"message": "Deleted"})


class SavedComparisonRegenerateView(APIView):
    """POST /comparisons/<pk>/regenerate/"""

    def post(self, request, pk):
        c = get_object_or_404(SavedComparison, pk=pk, user=request.user)

        summaries, resolved = _build_summaries(c.items, request.user)
        if len(summaries) < 2:
            return Response({"error": "Could not resolve items."}, status=400)

        try:
            comparison = _generate_comparison(summaries)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

        criteria  = comparison.get("criteria", [])
        cells_map = comparison.get("cells", {})
        for item in resolved:
            item["cells"] = cells_map.get(item["title"], {})

        c.criteria = criteria
        c.resolved = resolved
        c.save()
        return Response(_serialize(c))