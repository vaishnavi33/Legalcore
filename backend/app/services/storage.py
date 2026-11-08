"""Private document storage. Files live outside the web root under random keys and are only served
through an authorised download endpoint. Swap LocalStorage for an S3 implementation in production."""

import hashlib
import secrets
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
    def __init__(self, filename: str, content_type: str, size: int, sha256: str, key: str):
        self.filename, self.content_type, self.size, self.sha256, self.key = filename, content_type, size, sha256, key


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
        key = f"{secrets.token_hex(2)}/{secrets.token_urlsafe(24)}{ext}"
        p = self.path_for(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        return StoredFile(name, ALLOWED[ext], len(data), hashlib.sha256(data).hexdigest(), key)


_storage: LocalStorage | None = None


def get_storage() -> LocalStorage:
    global _storage
    if _storage is None:
        _storage = LocalStorage(get_settings().upload_dir)
    return _storage
