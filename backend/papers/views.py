import json
import os
import uuid
import tempfile
import zipfile
from io import BytesIO
from xml.etree import ElementTree as ET

from django.db import models as django_models
from django.http import Http404
from django.shortcuts import redirect
from rest_framework.views import APIView
from rest_framework.response import Response

from projects.models import Project
from .models import Paper, PaperAsset, ReferenceItem
from .utils.cloudflare import upload_paper, upload_asset, upload_raw_bytes, delete_file, _download_from_r2
from .utils.openai import _semantic_search,_paper_summary,   _generate_comparison,  _embed, convert_plain_text, enrich_reference, _index_paper, _keyword_search_papers, _keyword_search_references, _merge, _ref_summary
# ─── DOCX namespaces ──────────────────────────────────────────────────────────
NS = {
    "w":   "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "wp":  "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
    "a":   "http://schemas.openxmlformats.org/drawingml/2006/main",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
    "r":   "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "v":   "urn:schemas-microsoft-com:vml",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _serialize_paper(paper: Paper) -> dict:
    asset = _paper_pdf_asset(paper)
    return {
        "id":              paper.id,
        "title":           paper.title,
        "paper_type":      paper.paper_type,
        "citation_format": paper.citation_format,
        "authors":         paper.authors,
        "abstract":        paper.abstract,
        "content":         paper.content,
        "status":          paper.status,
        "created_at":      str(paper.created_at),
        "updated_at":      str(paper.updated_at),
        "file_name":       asset.original_filename if asset else None,
        "file_url":        asset.file_url if asset else None,
    }


def _get_project(pk, user):
    try:
        return Project.objects.get(pk=pk, user=user)
    except Project.DoesNotExist:
        return None


def _get_paper(project_pk, paper_pk, user):
    try:
        return Paper.objects.get(
            pk=paper_pk,
            project__pk=project_pk,
            project__user=user,
        )
    except Paper.DoesNotExist:
        return None


def _get_reference(project_pk, ref_pk, user):
    try:
        return ReferenceItem.objects.get(
            pk=ref_pk,
            project__pk=project_pk,
            project__user=user,
        )
    except ReferenceItem.DoesNotExist:
        return None


def _paper_pdf_asset(paper: Paper):
    return paper.assets.filter(asset_type="pdf").order_by("-created_at").first()


def _serialize_reference(ref: ReferenceItem) -> dict:
    return {
        "id":         ref.id,
        "item_type":  ref.item_type,
        "title":      ref.title,
        "body":       ref.body,
        "url":        ref.url,
        "file_url":   ref.file_url,
        "file_name":  ref.file_name,
        "tags":       ref.tags,
        "authors":    ref.authors,
        "year":       ref.year,
        "journal":    ref.journal,
        "volume":     ref.volume,
        "issue":      ref.issue,
        "pages":      ref.pages,
        "doi":        ref.doi,
        "created_at": str(ref.created_at),
        "updated_at": str(ref.updated_at),
    }


# ─── Citation formatters ──────────────────────────────────────────────────────

def _format_citation(ref: ReferenceItem, fmt: str, number: int = 1) -> str:
    """
    Return an inline citation string (not the full bibliography entry).
    fmt is one of: ieee | apa | mla | chicago | vancouver | harvard
    """
    title   = ref.title or "Untitled"
    authors = ref.authors or ""
    year    = ref.year or "n.d."

    if fmt == "ieee":
        return f"[{number}]"

    elif fmt == "apa":
        # (Author, year)
        last = authors.split(",")[0].strip() if authors else "Author"
        return f"({last}, {year})"

    elif fmt == "mla":
        last = authors.split(",")[0].strip() if authors else "Author"
        return f"({last})"

    elif fmt == "chicago":
        last = authors.split(",")[0].strip() if authors else "Author"
        return f"({last} {year})"

    elif fmt == "vancouver":
        return f"({number})"

    elif fmt == "harvard":
        last = authors.split(",")[0].strip() if authors else "Author"
        return f"({last}, {year})"

    return f"[{number}]"


def _format_bibliography_entry(ref: ReferenceItem, fmt: str, number: int = 1) -> str:
    """
    Return a full bibliography / reference-list entry string.
    """
    title   = ref.title or "Untitled"
    authors = ref.authors or "Unknown Author"
    year    = ref.year or "n.d."
    url     = ref.url or ""
    journal = ref.journal or ""
    volume  = ref.volume or ""
    issue   = ref.issue or ""
    pages   = ref.pages or ""
    doi     = ref.doi or ""

    def _doi_or_url():
        if doi:
            return f"https://doi.org/{doi}"
        return url

    if fmt == "ieee":
        entry = f"[{number}] {authors}, \"{title},\""
        if journal:
            entry += f" {journal}"
            if volume:
                entry += f", vol. {volume}"
            if issue:
                entry += f", no. {issue}"
            if pages:
                entry += f", pp. {pages}"
        entry += f", {year}."
        if _doi_or_url():
            entry += f" [Online]. Available: {_doi_or_url()}"
        return entry

    elif fmt == "apa":
        entry = f"{authors} ({year}). {title}."
        if journal:
            entry += f" {journal}"
            if volume:
                entry += f", {volume}"
            if issue:
                entry += f"({issue})"
            if pages:
                entry += f", {pages}"
            entry += "."
        if doi:
            entry += f" https://doi.org/{doi}"
        elif url:
            entry += f" {url}"
        return entry

    elif fmt == "mla":
        entry = f"{authors}. \"{title}.\""
        if journal:
            entry += f" {journal}"
            if volume:
                entry += f", vol. {volume}"
            if issue:
                entry += f", no. {issue}"
            entry += f", {year}"
            if pages:
                entry += f", pp. {pages}"
        else:
            entry += f" {year}"
        entry += "."
        if url:
            entry += f" {url}."
        return entry

    elif fmt == "chicago":
        entry = f"{authors}. \"{title}.\""
        if journal:
            entry += f" {journal}"
            if volume:
                entry += f" {volume}"
            if issue:
                entry += f", no. {issue}"
            entry += f" ({year})"
            if pages:
                entry += f": {pages}"
        else:
            entry += f" {year}"
        entry += "."
        if doi:
            entry += f" https://doi.org/{doi}."
        elif url:
            entry += f" {url}."
        return entry

    elif fmt == "vancouver":
        entry = f"{number}. {authors}. {title}."
        if journal:
            entry += f" {journal}. {year}"
            if volume:
                entry += f";{volume}"
            if issue:
                entry += f"({issue})"
            if pages:
                entry += f":{pages}"
        else:
            entry += f" {year}"
        entry += "."
        if doi:
            entry += f" doi:{doi}"
        elif url:
            entry += f" Available from: {url}"
        return entry

    elif fmt == "harvard":
        entry = f"{authors} ({year}) '{title}',"
        if journal:
            entry += f" {journal}"
            if volume:
                entry += f", {volume}"
            if issue:
                entry += f"({issue})"
            if pages:
                entry += f", pp. {pages}"
        entry += "."
        if doi:
            entry += f" doi:{doi}."
        elif url:
            entry += f" Available at: {url}."
        return entry

    return f"[{number}] {authors}. {title}. {year}."


# ─── DOCX extraction ──────────────────────────────────────────────────────────

def _extract_docx_blocks(file_bytes: bytes, paper, user_id: int) -> list:
    blocks = []

    with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
        rel_to_media: dict[str, str] = {}
        try:
            rel_xml = zf.read("word/_rels/document.xml.rels")
            rel_tree = ET.fromstring(rel_xml)
            for rel in rel_tree:
                rel_id   = rel.attrib.get("Id", "")
                target   = rel.attrib.get("Target", "")
                rel_type = rel.attrib.get("Type", "")
                if "image" in rel_type and target:
                    full_path = f"word/{target}" if not target.startswith("word/") else target
                    rel_to_media[rel_id] = full_path
        except Exception:
            pass

        media_bytes: dict[str, bytes] = {}
        for rel_id, path in rel_to_media.items():
            try:
                media_bytes[rel_id] = zf.read(path)
            except Exception:
                pass

        doc_xml  = zf.read("word/document.xml")
        doc_tree = ET.fromstring(doc_xml)
        body     = doc_tree.find(".//w:body", NS)
        if body is None:
            return [{"type": "paragraph", "content": ""}]

        def _upload_image_block(rel_id: str, caption: str = "") -> dict | None:
            raw = media_bytes.get(rel_id)
            if not raw:
                return None
            path = rel_to_media.get(rel_id, "")
            ext  = path.rsplit(".", 1)[-1].lower() if "." in path else "png"
            if ext == "jpeg":
                ext = "jpg"
            content_type = f"image/{'jpeg' if ext == 'jpg' else ext}"
            img_key = f"images/{user_id}/{paper.project_id}/{uuid.uuid4()}.{ext}"
            try:
                img_url = upload_raw_bytes(img_bytes=raw, key=img_key, content_type=content_type)
                PaperAsset.objects.create(
                    paper=paper, asset_type="image",
                    r2_key=img_key, file_url=img_url,
                    original_filename=f"docx_img_{rel_id}.{ext}",
                )
                return {"type": "image", "url": img_url, "caption": caption, "alt": caption}
            except Exception:
                return None

        def _get_image_rel_ids(para_elem) -> list[str]:
            ids = []
            for blip in para_elem.findall(".//a:blip", NS):
                rid = blip.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed")
                if rid:
                    ids.append(rid)
            for imagedata in para_elem.findall(".//v:imagedata", NS):
                rid = imagedata.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
                if rid:
                    ids.append(rid)
            return ids

        def _para_text(para_elem) -> str:
            return "".join(t.text or "" for t in para_elem.findall(".//w:t", NS))

        def _heading_type(para_elem) -> str | None:
            pstyle = para_elem.find(".//w:pStyle", NS)
            if pstyle is None:
                return None
            val = pstyle.attrib.get("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}val", "").lower()
            if val in ("heading1", "title"):
                return "heading1"
            if val == "heading2":
                return "heading2"
            if val == "heading3":
                return "heading3"
            return None

        def _list_type(para_elem) -> str | None:
            return "bullet" if para_elem.find(".//w:numPr", NS) is not None else None

        for child in body:
            tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag

            if tag == "p":
                for rid in _get_image_rel_ids(child):
                    blk = _upload_image_block(rid)
                    if blk:
                        blocks.append(blk)

                text   = _para_text(child).strip()
                h_type = _heading_type(child)
                if h_type and text:
                    blocks.append({"type": h_type, "content": text})
                    continue
                l_type = _list_type(child)
                if l_type and text:
                    blocks.append({"type": "bullet", "content": text})
                    continue
                if text:
                    blocks.append({"type": "paragraph", "content": text})

            elif tag == "tbl":
                rows_data: list[list[str]] = []
                headers:   list[str]       = []
                for row_idx, row in enumerate(child.findall(".//w:tr", NS)):
                    cells = [
                        " ".join(_para_text(p).strip() for p in cell.findall(".//w:p", NS)).strip()
                        for cell in row.findall(".//w:tc", NS)
                    ]
                    if row_idx == 0:
                        headers = cells
                    else:
                        rows_data.append(cells)
                if headers:
                    col_count   = len(headers)
                    padded_rows = [r + [""] * (col_count - len(r)) for r in rows_data]
                    blocks.append({
                        "type": "table", "headers": headers,
                        "rows": padded_rows if padded_rows else [[""] * col_count],
                    })

    while blocks and blocks[0].get("type") == "paragraph" and not blocks[0].get("content"):
        blocks.pop(0)
    while blocks and blocks[-1].get("type") == "paragraph" and not blocks[-1].get("content"):
        blocks.pop()

    return blocks if blocks else [{"type": "paragraph", "content": ""}]


# ─── Paper: List / Create ─────────────────────────────────────────────────────

class PaperListCreateView(APIView):

    def get(self, request, project_pk):
        project = _get_project(project_pk, request.user)
        if not project:
            return Response({"error": "Project not found"}, status=404)
        papers = project.papers.all().order_by("-created_at")
        return Response([_serialize_paper(p) for p in papers])

    def post(self, request, project_pk):
        project = _get_project(project_pk, request.user)
        if not project:
            return Response({"error": "Project not found"}, status=404)
        title = request.data.get("title", "").strip()
        if not title:
            return Response({"error": "title is required"}, status=400)
        paper = Paper.objects.create(
            project=project, title=title,
            paper_type=request.data.get("paper_type", "notes"),
            citation_format=request.data.get("citation_format", "ieee"),
            authors=request.data.get("authors", ""),
            abstract=request.data.get("abstract", ""),
            content="[]", status="draft",
        )
        return Response(_serialize_paper(paper), status=201)


# ─── Paper: Retrieve / Update / Delete ───────────────────────────────────────

class PaperDetailView(APIView):

    def get(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)
        return Response(_serialize_paper(paper))

    def patch(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)
        for field in ("title", "authors", "abstract", "content", "status", "paper_type", "citation_format"):
            if field in request.data:
                setattr(paper, field, request.data[field])
        paper.save()
        try:
            _index_paper(paper)
        except Exception as e:
            print("INDEX ERROR:", e)

        return Response(_serialize_paper(paper))

    def delete(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)
        for asset in paper.assets.all():
            try:
                delete_file(asset.r2_key)
            except Exception:
                pass
        paper.delete()
        return Response({"message": "Deleted"})


# ─── Paper: Upload PDF ────────────────────────────────────────────────────────

class PaperUploadView(APIView):

    def post(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "file is required"}, status=400)
        upload_data = upload_paper(file=file, project_id=paper.project_id, user_id=request.user.id)
        old = paper.assets.filter(asset_type="pdf").order_by("-created_at").first()
        if old:
            try:
                delete_file(old.r2_key)
            except Exception:
                pass
            old.delete()
        PaperAsset.objects.create(
            paper=paper, asset_type="pdf",
            r2_key=upload_data["key"], file_url=upload_data["url"],
            original_filename=file.name,
        )
        paper.status = "pending"
        paper.save(update_fields=["status"])
        return Response(_serialize_paper(paper))


# ─── Paper: Upload inline image ───────────────────────────────────────────────

class PaperImageUploadView(APIView):

    def post(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "file is required"}, status=400)
        upload_data = upload_asset(file=file, project_id=paper.project_id, user_id=request.user.id, prefix="images")
        PaperAsset.objects.create(
            paper=paper, asset_type="image",
            r2_key=upload_data["key"], file_url=upload_data["url"],
            original_filename=file.name,
        )
        return Response({"url": upload_data["url"]}, status=201)


# ─── Paper: Download PDF ──────────────────────────────────────────────────────

class PaperDownloadView(APIView):

    def get(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            raise Http404
        asset = _paper_pdf_asset(paper)
        if not asset:
            return Response({"error": "No file attached"}, status=404)
        return redirect(asset.file_url)


# ─── Paper: Convert uploaded file → editor blocks ────────────────────────────

class PaperConvertToBlocksView(APIView):

    def post(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)
        asset = _paper_pdf_asset(paper)
        if not asset:
            return Response({"error": "No file attached to this paper"}, status=400)
        try:
            file_bytes = _download_from_r2(asset.r2_key)
        except Exception as e:
            return Response({"error": f"Failed to download file: {str(e)}"}, status=500)

        fname = (asset.original_filename or "").lower()

        try:
            final_blocks = []

            if fname.endswith(".docx"):
                final_blocks = _extract_docx_blocks(file_bytes=file_bytes, paper=paper, user_id=request.user.id)

            elif fname.endswith(".pdf"):
                import fitz
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(file_bytes)
                    tmp_path = tmp.name

                doc              = fitz.open(tmp_path)
                page_texts       = []
                page_image_blocks = []

                for page_index, page in enumerate(doc):
                    page_texts.append(page.get_text())
                    img_blocks_for_page = []
                    for img_info in page.get_images(full=True):
                        xref = img_info[0]
                        try:
                            base_image   = doc.extract_image(xref)
                            img_bytes    = base_image["image"]
                            ext          = base_image.get("ext", "png")
                            if ext == "jpeg":
                                ext = "jpg"
                            content_type = f"image/{'jpeg' if ext == 'jpg' else ext}"
                            img_key      = f"images/{request.user.id}/{paper.project_id}/{uuid.uuid4()}.{ext}"
                            img_url      = upload_raw_bytes(img_bytes=img_bytes, key=img_key, content_type=content_type)
                            PaperAsset.objects.create(
                                paper=paper, asset_type="image", r2_key=img_key,
                                file_url=img_url, original_filename=f"page{page_index + 1}_img{xref}.{ext}",
                            )
                            img_blocks_for_page.append({
                                "type": "image", "url": img_url,
                                "caption": f"Figure from page {page_index + 1}",
                                "alt": f"Page {page_index + 1} image",
                            })
                        except Exception:
                            pass
                    page_image_blocks.append(img_blocks_for_page)

                doc.close()
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

                extracted_text = "\n".join(page_texts)
                if not extracted_text.strip():
                    return Response({"error": "Could not extract any text from the file."}, status=422)

                result = convert_plain_text(extracted_text)
                if not result["success"]:
                    return Response({"error": result["error"]}, status=500)

                try:
                    text_blocks = json.loads(result["content"])
                    if not isinstance(text_blocks, list):
                        raise ValueError
                except Exception:
                    text_blocks = [{"type": "paragraph", "content": extracted_text}]

                if page_image_blocks:
                    total_pages   = len(page_texts)
                    total_blocks  = len(text_blocks)
                    blocks_per_pg = max(1, total_blocks // total_pages) if total_pages else total_blocks
                    for page_idx, img_blocks in enumerate(page_image_blocks):
                        start = page_idx * blocks_per_pg
                        end   = start + blocks_per_pg if page_idx < total_pages - 1 else total_blocks
                        final_blocks.extend(text_blocks[start:end])
                        final_blocks.extend(img_blocks)
                else:
                    final_blocks = text_blocks

            elif fname.endswith((".txt", ".md")):
                extracted_text = file_bytes.decode("utf-8", errors="replace")
                if not extracted_text.strip():
                    return Response({"error": "Could not extract any text from the file."}, status=422)
                result = convert_plain_text(extracted_text)
                if not result["success"]:
                    return Response({"error": result["error"]}, status=500)
                try:
                    final_blocks = json.loads(result["content"])
                    if not isinstance(final_blocks, list):
                        raise ValueError
                except Exception:
                    final_blocks = [{"type": "paragraph", "content": extracted_text}]

            else:
                extracted_text = file_bytes.decode("utf-8", errors="replace")
                final_blocks   = [{"type": "paragraph", "content": extracted_text}]

            if not final_blocks:
                return Response({"error": "Could not extract any content from the file."}, status=422)

            paper.content = json.dumps(final_blocks)
            paper.save(update_fields=["content"])

            try:
                _index_paper(paper)
            except Exception:
                pass

            return Response({"content": paper.content})

        except Exception as e:
            return Response({"error": str(e)}, status=500)


# ─── Paper: Sync ref{} citations (add + remove) ───────────────────────────────

class PaperExtractRefsView(APIView):
    """
    POST /projects/<project_pk>/papers/<pk>/extract-refs/
    Body: { "refs": ["some title or URL", ...] }

    Full sync:
    - Creates ReferenceItems for any new refs not already in the project.
    - Deletes ReferenceItems that were previously created via ref{} but are
      no longer present in the current paper content.
    - Returns ALL current refs for this paper so the frontend stays in sync.

    We track "paper-owned" refs via a lightweight approach: any ReferenceItem
    that has a matching title (case-insensitive) against the incoming set and
    was created with no manual body/url that the user might care about.
    To safely support removal we store the current ref set as a JSON metadata
    field on the paper — this avoids a separate join table.
    """

    def post(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)

        incoming_refs: list[str] = [r.strip() for r in request.data.get("refs", []) if r.strip()]

        # ── 1. Load or initialise the paper's tracked ref list ────────────────
        # We store the set of ref keys currently belonging to this paper in a
        # small JSON blob inside the paper.content metadata, using a dedicated
        # block type so it never renders in the editor.
        # Simpler: track via a hidden field stored in `paper.status` is bad.
        # We'll use a separate in-memory approach via ReferenceItem.body having
        # a sentinel marker so we can identify auto-created refs safely.

        SENTINEL = "__auto_ref__"

        # All auto-created refs currently on this project
        project_refs = paper.project.reference_items.all()
        auto_refs    = {r.title.lower(): r for r in project_refs if SENTINEL in r.body}

        # ── 2. Delete auto-refs no longer mentioned ───────────────────────────
        incoming_lower = {r.lower() for r in incoming_refs}
        to_delete = [r for key, r in auto_refs.items() if key not in incoming_lower]
        for ref in to_delete:
            if ref.r2_key:
                try:
                    delete_file(ref.r2_key)
                except Exception:
                    pass
            ref.delete()

        # ── 3. Create / retrieve refs still present ───────────────────────────
        results = []
        for raw in incoming_refs:
            key = raw.lower()

            # Check for existing auto-ref or manually-created ref (by title or URL)
            existing = paper.project.reference_items.filter(
                django_models.Q(title__iexact=raw) | django_models.Q(url=raw)
            ).first()

            if existing:
                results.append(_serialize_reference(existing))
                continue

            # Enrich via OpenAI
            try:
                enriched = enrich_reference(raw)
            except Exception:
                enriched = {}

            ref = ReferenceItem.objects.create(
                project=paper.project,
                item_type="link" if enriched.get("url") else "note",
                title=enriched.get("title") or raw,
                body=f"{SENTINEL}\n{enriched.get('abstract', '')}".strip(),
                url=enriched.get("url", ""),
                tags=enriched.get("tags", []),
                authors=enriched.get("authors", ""),
                year=enriched.get("year", ""),
                journal=enriched.get("journal", ""),
                volume=enriched.get("volume", ""),
                issue=enriched.get("issue", ""),
                pages=enriched.get("pages", ""),
                doi=enriched.get("doi", ""),
            )
            results.append(_serialize_reference(ref))

        return Response(results, status=200)


# ─── Paper: Generate bibliography block ──────────────────────────────────────

class PaperBibliographyView(APIView):
    """
    POST /projects/<project_pk>/papers/<pk>/bibliography/
    Body: { "refs": ["title or url", ...] }

    Returns a bibliography block (type="bibliography") with pre-formatted
    entries in the paper's citation_format.
    """

    def post(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)

        raw_refs: list[str] = [r.strip() for r in request.data.get("refs", []) if r.strip()]
        fmt = paper.citation_format or "ieee"

        entries = []
        for i, raw in enumerate(raw_refs, start=1):
            ref = paper.project.reference_items.filter(
                django_models.Q(title__iexact=raw) | django_models.Q(url=raw)
            ).first()
            if ref:
                entries.append({
                    "number": i,
                    "key":    raw,
                    "entry":  _format_bibliography_entry(ref, fmt, i),
                })
            else:
                entries.append({
                    "number": i,
                    "key":    raw,
                    "entry":  f"[{i}] {raw}",
                })

        return Response({
            "format":  fmt,
            "entries": entries,
            "block": {
                "type":    "bibliography",
                "format":  fmt,
                "entries": entries,
            },
        })


# ─── Paper: Get inline citation markers ──────────────────────────────────────

class PaperCitationMarkersView(APIView):
    """
    POST /projects/<project_pk>/papers/<pk>/citation-markers/
    Body: { "refs": ["title or url", ...] }

    Returns a mapping { raw_ref: formatted_inline_citation } for the paper's
    citation_format so the editor can replace ref{...} chips in real time.
    """

    def post(self, request, project_pk, pk):
        paper = _get_paper(project_pk, pk, request.user)
        if not paper:
            return Response({"error": "Not found"}, status=404)

        raw_refs: list[str] = [r.strip() for r in request.data.get("refs", []) if r.strip()]
        fmt = paper.citation_format or "ieee"

        markers = {}
        for i, raw in enumerate(raw_refs, start=1):
            ref = paper.project.reference_items.filter(
                django_models.Q(title__iexact=raw) | django_models.Q(url=raw)
            ).first()
            if ref:
                markers[raw] = _format_citation(ref, fmt, i)
            else:
                markers[raw] = f"[{i}]"

        return Response({"format": fmt, "markers": markers})


# ─── Reference Items ──────────────────────────────────────────────────────────

class ReferenceListCreateView(APIView):

    def get(self, request, project_pk):
        project = _get_project(project_pk, request.user)
        if not project:
            return Response({"error": "Project not found"}, status=404)
        refs = project.reference_items.all()
        return Response([_serialize_reference(r) for r in refs])

    def post(self, request, project_pk):
        project = _get_project(project_pk, request.user)
        if not project:
            return Response({"error": "Project not found"}, status=404)
        item_type = request.data.get("item_type", "note")
        if item_type not in dict(ReferenceItem.ITEM_TYPE_CHOICES):
            return Response({"error": "Invalid item_type"}, status=400)
        ref = ReferenceItem.objects.create(
            project=project,
            item_type=item_type,
            title=request.data.get("title", ""),
            body=request.data.get("body", ""),
            url=request.data.get("url", ""),
            tags=request.data.get("tags", []),
        )
        return Response(_serialize_reference(ref), status=201)


class ReferenceDetailView(APIView):

    def get(self, request, project_pk, pk):
        ref = _get_reference(project_pk, pk, request.user)
        if not ref:
            return Response({"error": "Not found"}, status=404)
        return Response(_serialize_reference(ref))

    def patch(self, request, project_pk, pk):
        ref = _get_reference(project_pk, pk, request.user)
        if not ref:
            return Response({"error": "Not found"}, status=404)
        for field in ("title", "body", "url", "tags"):
            if field in request.data:
                setattr(ref, field, request.data[field])
        ref.save()
        return Response(_serialize_reference(ref))

    def delete(self, request, project_pk, pk):
        """
        Auto-created refs (those with __auto_ref__ sentinel in body) should be
        deleted via the paper editor only — not directly. We still allow manual
        refs to be deleted from here.
        """
        ref = _get_reference(project_pk, pk, request.user)
        if not ref:
            return Response({"error": "Not found"}, status=404)

        SENTINEL = "__auto_ref__"
        if SENTINEL in (ref.body or ""):
            return Response(
                {"error": "This reference was added via ref{} in a paper. Remove it from the paper editor to delete it."},
                status=400,
            )

        if ref.r2_key:
            try:
                delete_file(ref.r2_key)
            except Exception:
                pass
        ref.delete()
        return Response({"message": "Deleted"})


class ReferenceFileUploadView(APIView):

    def post(self, request, project_pk, pk):
        ref = _get_reference(project_pk, pk, request.user)
        if not ref:
            return Response({"error": "Not found"}, status=404)
        file = request.FILES.get("file")
        if not file:
            return Response({"error": "file is required"}, status=400)
        if ref.r2_key:
            try:
                delete_file(ref.r2_key)
            except Exception:
                pass
        upload_data = upload_asset(file=file, project_id=ref.project_id, user_id=request.user.id, prefix="references")
        ref.r2_key   = upload_data["key"]
        ref.file_url = upload_data["url"]
        ref.file_name = file.name
        ref.save(update_fields=["r2_key", "file_url", "file_name"])
        return Response(_serialize_reference(ref))
    



class SearchView(APIView):
    """
    GET /projects/search/?q=<query>&mode=keyword|semantic|hybrid

    `mode` defaults to "hybrid".
    Hybrid = keyword results boosted by semantic scores where chunks exist.
    """

    def get(self, request):
        query = (request.query_params.get("q") or "").strip()
        mode = (request.query_params.get("mode") or "hybrid").lower()

        if not query:
            return Response({"results": [], "query": "", "mode": mode})

        results: list[dict] = []

        # ── keyword pass ──────────────────────────────────────────────────────
        if mode in ("keyword", "hybrid"):
            kw_papers = _keyword_search_papers(request.user, query)
            kw_refs = _keyword_search_references(request.user, query)
            results.extend(kw_papers)
            results.extend(kw_refs)

        # ── semantic pass ─────────────────────────────────────────────────────
        if mode in ("semantic", "hybrid"):
            try:
                query_vec = _embed(query)
                sem_results = _semantic_search(request.user, query_vec)

                if mode == "hybrid":
                    # Build a lookup of semantic scores by paper id
                    sem_scores = {(r["type"], r["id"]): r["score"] for r in sem_results}
                    # Boost keyword results that also have a semantic score
                    for r in results:
                        key = (r["type"], r["id"])
                        if key in sem_scores:
                            # Weighted blend: 40% keyword baseline + 60% semantic
                            r["score"] = round(0.4 * r["score"] + 0.6 * sem_scores[key], 4)
                    # Add semantic-only results (not found by keyword)
                    kw_keys = {(r["type"], r["id"]) for r in results}
                    for r in sem_results:
                        key = (r["type"], r["id"])
                        if key not in kw_keys:
                            results.append(r)
                else:
                    results = sem_results

            except Exception:
                # If embedding fails (e.g. no API key in dev), fall back silently
                pass

        merged = _merge(results)

        return Response({
            "query": query,
            "mode": mode,
            "count": len(merged),
            "results": merged,
        })

