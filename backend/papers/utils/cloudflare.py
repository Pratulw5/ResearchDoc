import uuid
import tempfile
from io import BytesIO

import boto3
from django.conf import settings


s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=settings.R2_ACCESS_KEY_ID,
    aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
    region_name="auto",
)


def upload_paper(file, project_id, user_id):
    """Upload Django UploadedFile (PDF) to Cloudflare R2."""
    return upload_asset(file=file, project_id=project_id, user_id=user_id, prefix="papers")


def upload_asset(file, project_id, user_id, prefix="assets"):
    """
    Generic uploader for Django UploadedFile objects.
    Stores at <prefix>/<user_id>/<project_id>/<uuid>.<ext>
    Returns { key, url }.
    """
    ext = file.name.split(".")[-1]
    key = f"{prefix}/{user_id}/{project_id}/{uuid.uuid4()}.{ext}"
    file_stream = BytesIO(file.read())
    s3.upload_fileobj(
        Fileobj=file_stream,
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        ExtraArgs={"ContentType": file.content_type},
    )
    return {
        "key": key,
        "url": get_file_url(key),
    }


def upload_raw_bytes(img_bytes: bytes, key: str, content_type: str = "image/png") -> str:
    """
    Upload raw bytes (e.g. images extracted from a PDF) directly to R2.
    Returns the public (or presigned) URL.
    """
    buf = BytesIO(img_bytes)
    s3.upload_fileobj(
        Fileobj=buf,
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
        ExtraArgs={"ContentType": content_type},
    )
    return get_file_url(key)


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """
    Generate a presigned URL for a private R2 object.
    expires_in = seconds (default 1 hour).
    """
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key},
        ExpiresIn=expires_in,
    )
    return url


def _download_from_r2(r2_key: str) -> bytes:
    """Download a file from Cloudflare R2. Works with private buckets."""
    buf = tempfile.SpooledTemporaryFile(max_size=50 * 1024 * 1024)
    s3.download_fileobj(Bucket=settings.R2_BUCKET_NAME, Key=r2_key, Fileobj=buf)
    buf.seek(0)
    return buf.read()


def delete_file(key):
    """Delete a file from R2."""
    s3.delete_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
    )


def get_file_url(key):
    """
    Get the URL for a key.
    If R2_PUBLIC_URL is set (Public Development URL or custom domain), use it.
    Otherwise fall back to a presigned URL so images actually load.
    """
    public_base = getattr(settings, "R2_PUBLIC_URL", "").strip()
    if public_base:
        return f"{public_base}/{key}"
    return get_presigned_url(key, expires_in=3600)