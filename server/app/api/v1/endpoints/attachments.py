import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.config import SERVER_DIR, settings
from app.db.session import get_db_session
from app.models.attachment import TicketAttachment
from app.models.ticket import Ticket
from app.models.notification import NotificationOutbox
from app.models.history import TicketHistory
from app.repositories.tickets import tickets_repo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tickets", tags=["Attachments"])

# Verified by file signature, never by the client-supplied filename or content type alone.
SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/gif": (b"GIF87a", b"GIF89a"),
    "image/webp": (b"RIFF",),
    "application/pdf": (b"%PDF-",),
}
EXTENSIONS = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}
ATTACHMENT_TYPES = {"complaint", "diagnostic", "resolution"}


class AttachmentRead(BaseModel):
    attachment_id: str
    ticket_id: str
    attachment_type: str
    file_name: str
    mime_type: str
    file_size_bytes: int
    url: str


def _upload_root() -> Path:
    root = Path(settings.UPLOAD_DIR)
    return root if root.is_absolute() else SERVER_DIR / root


def _detect_mime(head: bytes) -> str | None:
    for mime, prefixes in SIGNATURES.items():
        if any(head.startswith(p) for p in prefixes):
            if mime == "image/webp" and head[8:12] != b"WEBP":
                continue
            return mime
    return None


def _to_read(row: TicketAttachment) -> AttachmentRead:
    is_cloud = (row.storage_key or "").startswith("http://") or (row.storage_key or "").startswith("https://")
    return AttachmentRead(
        attachment_id=str(row.attachment_id),
        ticket_id=str(row.ticket_id),
        attachment_type=row.attachment_type,
        file_name=row.file_name,
        mime_type=row.mime_type,
        file_size_bytes=row.file_size_bytes,
        url=row.storage_key if is_cloud else f"/api/v1/tickets/{row.ticket_id}/attachments/{row.attachment_id}/file",
    )


class AttachmentRejected(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _ensure_supabase_bucket(client) -> bool:
    """Attempt to create the storage bucket if it doesn't exist yet."""
    try:
        bucket_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/bucket"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            "apiKey": settings.SUPABASE_KEY,
            "Content-Type": "application/json",
        }
        res = client.post(
            bucket_url,
            headers=headers,
            json={"id": settings.SUPABASE_STORAGE_BUCKET, "name": settings.SUPABASE_STORAGE_BUCKET, "public": True},
        )
        if res.status_code in (200, 201):
            logger.info("Automatically created Supabase storage bucket '%s'", settings.SUPABASE_STORAGE_BUCKET)
            return True
    except Exception as e:
        logger.debug("Bucket creation attempt notice: %s", e)
    return False


def _upload_to_supabase_storage(file_path_key: str, data: bytes, mime: str) -> str | None:
    """Uploads file directly to free Supabase Storage (1GB tier) and returns public CDN URL."""
    if not (settings.SUPABASE_URL and settings.SUPABASE_KEY):
        return None
    try:
        import httpx

        url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{file_path_key}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_KEY}",
            "apiKey": settings.SUPABASE_KEY,
            "Content-Type": mime,
            "x-upsert": "true",
        }
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, headers=headers, content=data)
            if resp.status_code in (200, 201):
                public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}/{file_path_key}"
                logger.info("Uploaded attachment %s to Supabase Storage: %s", file_path_key, public_url)
                return public_url

            # If bucket is missing, try to auto-create the public bucket and retry upload
            if resp.status_code in (400, 404) and "NoSuchBucket" in resp.text:
                if _ensure_supabase_bucket(client):
                    retry_resp = client.post(url, headers=headers, content=data)
                    if retry_resp.status_code in (200, 201):
                        public_url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{settings.SUPABASE_STORAGE_BUCKET}/{file_path_key}"
                        logger.info("Uploaded attachment %s to newly created Supabase Storage: %s", file_path_key, public_url)
                        return public_url

            logger.warning("Supabase storage upload responded with status %s: %s", resp.status_code, resp.text)
    except Exception as exc:
        logger.warning("Failed to upload to Supabase storage (%s), falling back to local disk: %s", file_path_key, exc)
    return None


def store_attachment(int_id: int, file_name: str | None, data: bytes, attachment_type: str = "complaint") -> AttachmentRead:
    """Validate (type by signature, size) and store one attachment. Shared by the upload API and email intake."""
    if attachment_type not in ATTACHMENT_TYPES:
        raise AttachmentRejected(422, f"attachment_type must be one of {sorted(ATTACHMENT_TYPES)}")
    if len(data) > settings.MAX_UPLOAD_BYTES:
        raise AttachmentRejected(413, f"File exceeds the {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit")
    if not data:
        raise AttachmentRejected(422, "Empty file")
    mime = _detect_mime(bytes(data[:16]))
    if not mime:
        raise AttachmentRejected(415, "Unsupported file type. Allowed: PNG, JPEG, GIF, WebP, PDF")

    relative_key = f"{int_id}/{uuid.uuid4().hex}{EXTENSIONS[mime]}"
    supabase_public_url = _upload_to_supabase_storage(relative_key, data, mime)
    target = None

    if supabase_public_url:
        storage_key = supabase_public_url
    else:
        # Fallback to local disk storage
        storage_key = relative_key
        target = _upload_root() / storage_key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(bytes(data))

    safe_name = Path(file_name or "attachment").name[:255] or "attachment"
    now = datetime.now(timezone.utc)
    try:
        with get_db_session() as session:
            row = TicketAttachment(
                ticket_id=int_id,
                attachment_type=attachment_type,
                storage_key=storage_key,
                file_name=safe_name,
                mime_type=mime,
                file_size_bytes=len(data),
                created_at=now,
            )
            session.add(row)
            session.flush()

            file_access_url = supabase_public_url or f"/api/v1/tickets/{int_id}/attachments/{row.attachment_id}/file"

            # If the ticket has an assigned technician, dispatch a reference image notification to the outbox
            ticket = session.execute(select(Ticket).where(Ticket.ticket_id == int_id)).scalar_one_or_none()
            if ticket and ticket.assigned_to_user_id:
                is_img = mime.startswith("image/")
                notif = NotificationOutbox(
                    ticket_id=int_id,
                    recipient_user_id=ticket.assigned_to_user_id,
                    notification_type="REFERENCE_IMAGE_ADDED" if is_img else "ATTACHMENT_ADDED",
                    payload={
                        "ticket_id": str(int_id),
                        "attachment_id": str(row.attachment_id),
                        "file_name": safe_name,
                        "mime_type": mime,
                        "attachment_type": attachment_type,
                        "url": file_access_url,
                        "is_image": is_img,
                        "message": f"New reference {'image' if is_img else 'document'} '{safe_name}' added to ticket #{int_id} for technician reference.",
                    },
                    delivery_status="pending",
                    created_at=now,
                )
                session.add(notif)

            # Record audit event in ticket history
            hist = TicketHistory(
                ticket_id=int_id,
                old_status=ticket.status if ticket else None,
                new_status=ticket.status if ticket else None,
                event_type="ATTACHMENT_ADDED",
                actor_type="admin" if attachment_type == "diagnostic" else "complainant",
                note=f"Reference {'image' if mime.startswith('image/') else 'document'} attached: {safe_name} ({mime})",
                created_at=now,
            )
            session.add(hist)

            session.commit()
            session.refresh(row)
            return _to_read(row)
    except Exception:
        if target:
            target.unlink(missing_ok=True)
        logger.exception("Failed to record attachment for ticket %s", int_id)
        raise AttachmentRejected(500, "Attachment could not be saved")


@router.post("/{ticket_id}/attachments", response_model=AttachmentRead, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    ticket_id: str,
    file: UploadFile = File(...),
    attachment_type: str = Form("complaint"),
):
    """Store an image/PDF attachment for a ticket after verifying type (by signature) and size."""
    int_id = tickets_repo._parse_id(ticket_id)
    if attachment_type not in ATTACHMENT_TYPES:
        raise HTTPException(status_code=422, detail=f"attachment_type must be one of {sorted(ATTACHMENT_TYPES)}")
    if not int_id or not await tickets_repo.get_ticket(ticket_id):
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")

    data = bytearray()
    while chunk := await file.read(64 * 1024):
        data.extend(chunk)
        if len(data) > settings.MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413, detail=f"File exceeds the {settings.MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit"
            )
    try:
        return store_attachment(int_id, file.filename, bytes(data), attachment_type)
    except AttachmentRejected as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail)


@router.get("/{ticket_id}/attachments", response_model=list[AttachmentRead])
async def list_attachments(ticket_id: str):
    int_id = tickets_repo._parse_id(ticket_id)
    if not int_id:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found")
    with get_db_session() as session:
        rows = session.execute(
            select(TicketAttachment).where(TicketAttachment.ticket_id == int_id).order_by(TicketAttachment.created_at)
        ).scalars().all()
        return [_to_read(r) for r in rows]


@router.get("/{ticket_id}/attachments/{attachment_id}/file")
async def download_attachment(ticket_id: str, attachment_id: int):
    int_id = tickets_repo._parse_id(ticket_id)
    with get_db_session() as session:
        row = session.execute(
            select(TicketAttachment).where(
                TicketAttachment.attachment_id == attachment_id, TicketAttachment.ticket_id == int_id
            )
        ).scalar_one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Attachment not found")

        # If stored in Supabase Storage or cloud CDN, redirect to public URL
        if (row.storage_key or "").startswith("http://") or (row.storage_key or "").startswith("https://"):
            return RedirectResponse(url=row.storage_key)

        # Otherwise serve from local disk
        path = (_upload_root() / row.storage_key).resolve()
        if _upload_root().resolve() not in path.parents or not path.is_file():
            raise HTTPException(status_code=404, detail="Attachment file missing")
        return FileResponse(path, media_type=row.mime_type, filename=row.file_name)
