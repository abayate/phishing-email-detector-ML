from __future__ import annotations
import json
from cryptography.fernet import Fernet, InvalidToken
from .config import settings


def _fernet() -> Fernet:
    if not settings.tokens_fernet_key:
        raise RuntimeError(
            "TOKENS_FERNET_KEY is not set. Generate one and put it in .env."
        )
    return Fernet(settings.tokens_fernet_key.encode("utf-8"))


def encrypt_json(obj: dict) -> str:
    f = _fernet()
    data = json.dumps(obj).encode("utf-8")
    return f.encrypt(data).decode("utf-8")


def decrypt_json(token: str) -> dict:
    f = _fernet()
    data = f.decrypt(token.encode("utf-8"))
    return json.loads(data.decode("utf-8"))
