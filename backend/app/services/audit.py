"""
app/services/audit.py — authentication audit logging.

Records who tried to log in, from where, and the outcome. Passwords are NEVER
accepted by these functions, so they cannot be logged by accident.
Logs go to stdout and to backend/logs/auth_audit.log (gitignored).
"""
from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

_LOG_DIR = Path(__file__).resolve().parents[2] / "logs"
_LOG_DIR.mkdir(exist_ok=True)

logger = logging.getLogger("auth.audit")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")

    file_handler = RotatingFileHandler(
        _LOG_DIR / "auth_audit.log", maxBytes=1_000_000, backupCount=5, encoding="utf-8"
    )
    file_handler.setFormatter(fmt)
    logger.addHandler(file_handler)

    stream = logging.StreamHandler()
    stream.setFormatter(fmt)
    logger.addHandler(stream)
    logger.propagate = False


def log_auth(event: str, *, username: str, ip: str, status: str, detail: str = "") -> None:
    """
    event  — e.g. "login"
    status — e.g. "success" | "invalid" | "locked" | "rate_limited" | "unavailable"
    """
    # username is user-controlled; keep it on one line and bounded.
    safe_user = (username or "-").replace("\n", " ").replace("\r", " ")[:64]
    logger.info(
        "event=%s status=%s user=%s ip=%s detail=%s",
        event, status, safe_user, ip or "-", detail or "-",
    )
