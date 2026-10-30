"""
Mailbox transport (IMAP in, SMTP out) built on the standard library.

`parse_message` is pure and unit-tested; `ImapSmtpMailClient` does the network I/O and is blocking,
so callers run it through `asyncio.to_thread`.
"""

import email
import html
import imaplib
import re
import smtplib
from dataclasses import dataclass, field
from email.header import decode_header, make_header
from email.message import Message
from email.mime.text import MIMEText
from email.utils import formataddr, make_msgid, parseaddr

from app.config import settings

IMAGE_TYPES = {"image/png", "image/jpeg", "image/gif", "image/webp"}


@dataclass
class InboundMessage:
    uid: int
    message_id: str
    from_address: str
    from_name: str
    subject: str
    body: str
    is_auto_generated: bool = False
    images: list[tuple[str, bytes]] = field(default_factory=list)  # (file name, bytes)


def _decode(value: str | None) -> str:
    if not value:
        return ""
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return value


def _html_to_text(markup: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?</\1>", " ", markup)
    text = re.sub(r"(?i)<br\s*/?>|</p>|</div>", "\n", text)
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(text)


def _clean_body(text: str) -> str:
    """Drop quoted replies and signatures so only the complaint itself reaches the pipeline."""
    lines = []
    for line in text.replace("\r\n", "\n").split("\n"):
        stripped = line.strip()
        if stripped == "--" or re.match(r"^On .+ wrote:$", stripped):
            break
        if stripped.startswith(">"):
            continue
        lines.append(line.rstrip())
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def _payload_text(part: Message) -> str:
    payload = part.get_payload(decode=True) or b""
    return payload.decode(part.get_content_charset() or "utf-8", errors="replace")


def _is_auto_generated(msg: Message) -> bool:
    auto = (msg.get("Auto-Submitted") or "no").strip().lower()
    precedence = (msg.get("Precedence") or "").strip().lower()
    return auto != "no" or bool(msg.get("X-Autoreply")) or bool(msg.get("X-Autorespond")) or precedence in (
        "bulk", "junk", "list", "auto_reply",
    )


def parse_message(uid: int, raw: bytes) -> InboundMessage:
    msg = email.message_from_bytes(raw)
    name, address = parseaddr(_decode(msg.get("From")))

    plain, markup, images = "", "", []
    parts = msg.walk() if msg.is_multipart() else [msg]
    for part in parts:
        if part.is_multipart():
            continue
        ctype = part.get_content_type()
        disposition = (part.get("Content-Disposition") or "").lower()
        if ctype in IMAGE_TYPES:
            data = part.get_payload(decode=True)
            if data:
                images.append((_decode(part.get_filename()) or f"image{len(images) + 1}", data))
        elif ctype == "text/plain" and "attachment" not in disposition and not plain:
            plain = _payload_text(part)
        elif ctype == "text/html" and "attachment" not in disposition and not markup:
            markup = _payload_text(part)

    body = _clean_body(plain or _html_to_text(markup))
    return InboundMessage(
        uid=uid,
        message_id=(msg.get("Message-ID") or "").strip() or f"<uid-{uid}@local>",
        from_address=address.strip().lower(),
        from_name=name.strip(),
        subject=_decode(msg.get("Subject")).strip(),
        body=body,
        is_auto_generated=_is_auto_generated(msg),
        images=images,
    )


class ImapSmtpMailClient:
    """Thin blocking client around imaplib/smtplib (one connection per call, like the original script)."""

    def __init__(self) -> None:
        if not settings.EMAIL_ADDRESS or not settings.EMAIL_APP_PASSWORD:
            raise RuntimeError("EMAIL_ADDRESS and EMAIL_APP_PASSWORD must be set to use email intake")
        self.address = settings.EMAIL_ADDRESS
        self._password = settings.EMAIL_APP_PASSWORD

    def latest_uid(self) -> int:
        with imaplib.IMAP4_SSL(settings.IMAP_SERVER, timeout=30) as mail:
            mail.login(self.address, self._password)
            mail.select("INBOX", readonly=True)
            status, data = mail.uid("search", None, "ALL")
            if status != "OK" or not data or not data[0]:
                return 0
            return int(data[0].split()[-1])

    def fetch_new(self, after_uid: int) -> list[InboundMessage]:
        messages: list[InboundMessage] = []
        with imaplib.IMAP4_SSL(settings.IMAP_SERVER, timeout=30) as mail:
            mail.login(self.address, self._password)
            mail.select("INBOX")
            status, data = mail.uid("search", None, f"UID {after_uid + 1}:*")
            if status != "OK" or not data or not data[0]:
                return messages
            for raw_uid in data[0].split():
                uid = int(raw_uid)
                if uid <= after_uid:  # Gmail returns the last UID for "n:*" even when nothing is newer
                    continue
                status, msg_data = mail.uid("fetch", raw_uid, "(BODY.PEEK[])")
                if status != "OK" or not msg_data or not isinstance(msg_data[0], tuple):
                    continue
                messages.append(parse_message(uid, msg_data[0][1]))
        return sorted(messages, key=lambda m: m.uid)

    def send(self, to: str, subject: str, body: str, in_reply_to: str | None = None) -> str:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = formataddr(("IT Helpdesk", self.address))
        msg["To"] = to
        msg["Message-ID"] = make_msgid(domain=self.address.split("@")[-1])
        # Marks our mail as automatic so other autoresponders (and our own listener) don't reply to it.
        msg["Auto-Submitted"] = "auto-replied"
        if in_reply_to:
            msg["In-Reply-To"] = in_reply_to
            msg["References"] = in_reply_to
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT, timeout=30) as server:
            server.starttls()
            server.login(self.address, self._password)
            server.sendmail(self.address, [to], msg.as_string())
        return msg["Message-ID"]
