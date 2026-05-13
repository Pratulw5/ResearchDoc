import uuid
from io import BytesIO

from r2 import CloudflareR2Bucket
from django.conf import settings


papers = CloudflareR2Bucket(
    name=settings.R2_BUCKET_NAME,
    account_id=settings.R2_ACCOUNT_ID,
    access_key_id=settings.R2_ACCESS_KEY_ID,
    secret_access_key=settings.R2_SECRET_ACCESS_KEY,
)


def upload_paper(file, project_id, user_id):
    """
    Upload Django UploadedFile to Cloudflare R2
    """

    ext = file.name.split(".")[-1]

    key = (
        f"papers/{user_id}/{project_id}/"
        f"{uuid.uuid4()}.{ext}"
    )

    # convert Django uploaded file to bytes stream
    file_stream = BytesIO(file.read())

    papers.bucket.upload_fileobj(
        Fileobj=file_stream,
        Key=key,
        ExtraArgs={
            "ContentType": file.content_type,
        },
    )

    public_url = f"{settings.R2_PUBLIC_URL}/{key}"

    return {
        "key": key,
        "url": public_url,
    }


def delete_file(key):
    """
    Delete file from R2
    """

    papers.client.delete_object(
        Bucket=settings.R2_BUCKET_NAME,
        Key=key,
    )


def get_file_url(key):
    """
    Get public URL
    """

    return f"{settings.R2_PUBLIC_URL}/{key}"