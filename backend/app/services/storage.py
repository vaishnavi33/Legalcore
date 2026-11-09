"""Private document storage. Files live outside the web root under random keys and are only served
through an authorised download endpoint. Swap LocalStorage for an S3 implementation in production."""

import hashlib
import secrets
import socket
import struct
from pathlib import Path

from fastapi import HTTPException, UploadFile

from app.core.config import get_settings

ALLOWED = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

MAGIC = {
    ".pdf": [b"%PDF"],
    ".jpg": [b"\xff\xd8\xff"],
    ".jpeg": [b"\xff\xd8\xff"],
    ".png": [b"\x89PNG\r\n\x1a\n"],
    ".doc": [b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
    ".docx": [b"PK\x03\x04"],
}


class StoredFile:
    def __init__(self, filename: str, content_type: str, size: int, sha256: str, key: str, scan_status: str):
        self.filename, self.content_type, self.size, self.sha256, self.key = filename, content_type, size, sha256, key
        self.scan_status = scan_status


def scan(data: bytes) -> str:
    """Virus scan through a ClamAV daemon when CLAMD_HOST is set. Returns clean, infected or not_scanned.
    If the scanner is configured but unreachable the upload is refused rather than accepted unscanned."""
    s = get_settings()
    if not s.clamd_host:
        return "not_scanned"
    try:
        with socket.create_connection((s.clamd_host, s.clamd_port), timeout=15) as sock:
            sock.sendall(b"zINSTREAM\0")
            for i in range(0, len(data), 8192):
                chunk = data[i : i + 8192]
                sock.sendall(struct.pack("!L", len(chunk)) + chunk)
            sock.sendall(struct.pack("!L", 0))
            reply = sock.recv(4096).decode(errors="replace")
    except OSError:
        raise HTTPException(status_code=503, detail="Our virus scanner is not available right now. Please try again shortly.") from None
    if "FOUND" in reply:
        return "infected"
    if reply.strip().endswith("OK"):
        return "clean"
    raise HTTPException(status_code=503, detail="We could not scan this file. Please try again shortly.")


class LocalStorage:
    def __init__(self, root: Path):
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def path_for(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root.resolve() not in p.parents:
            raise HTTPException(status_code=400, detail="Invalid file key")
        return p

    async def save(self, upload: UploadFile) -> StoredFile:
        s = get_settings()
        name = Path(upload.filename or "file").name[:200] or "file"
        ext = Path(name).suffix.lower()
        if ext not in ALLOWED:
            raise HTTPException(status_code=400, detail=f"{name}: only PDF, Word (.doc, .docx), JPG and PNG files are allowed.")
        data = await upload.read(s.max_upload_mb * 1024 * 1024 + 1)
        if len(data) > s.max_upload_mb * 1024 * 1024:
            raise HTTPException(status_code=400, detail=f"{name} is larger than {s.max_upload_mb} MB.")
        if not data:
            raise HTTPException(status_code=400, detail=f"{name} is empty.")
        if not any(data.startswith(m) for m in MAGIC[ext]):
            raise HTTPException(status_code=400, detail=f"{name} does not look like a real {ext} file.")
        result = scan(data)
        if result == "infected":
            raise HTTPException(status_code=400, detail=f"{name} was blocked by our virus scanner.")
        key = f"{secrets.token_hex(2)}/{secrets.token_urlsafe(24)}{ext}"
        p = self.path_for(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        return StoredFile(name, ALLOWED[ext], len(data), hashlib.sha256(data).hexdigest(), key, result)


_storage: LocalStorage | None = None


def get_storage() -> LocalStorage:
    global _storage
    if _storage is None:
        _storage = LocalStorage(get_settings().upload_dir)
    return _storage
