"""Encryption utilities for storing API keys at rest."""
import base64
import hashlib

from cryptography.fernet import Fernet

from app.config import settings


def _get_fernet() -> Fernet:
    """Derive a Fernet key from the app secret key."""
    # Derive a 32-byte key from the secret key using SHA-256, then base64 encode
    key = hashlib.sha256(settings.secret_key.encode()).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_value(plaintext: str) -> str:
    """Encrypt a string value and return the encrypted token."""
    f = _get_fernet()
    return f.encrypt(plaintext.encode()).decode()


def decrypt_value(token: str) -> str:
    """Decrypt an encrypted token back to plaintext."""
    f = _get_fernet()
    return f.decrypt(token.encode()).decode()
