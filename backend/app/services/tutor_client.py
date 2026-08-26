"""
HTTP client for the tutor grading + hint service
(github.com/Parallaxxx25/intelligent-tutor), called server-to-server with
X-Service-Key.

This platform's own SQLite sandbox (app/services/grading_service.py) is
still what decides the verdict a student sees — see
https://github.com/Parallaxxx25/intelligent-tutor/blob/feat/partner-integration/docs/adr/0006-partner-primary-dual-grade.md
for why. Every function here is off the critical path: any failure (service
disabled, timeout, non-2xx) returns None rather than raising, so a tutor
outage degrades to "no hint available", never a broken submission.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger("app.tutor_client")

# /grade runs deterministic SQL — no LLM — so 5s is generous. /hint calls
# Gemini and can legitimately take several seconds; the tutor service's own
# outer bound is 20s, so give it a little headroom rather than racing it.
_GRADE_TIMEOUT = 5.0
_HINT_TIMEOUT = 25.0


async def grade(
    *,
    external_user_id: str,
    problem_id: int,
    query: str,
    partner_verdict: str,
    client_submission_id: str,
) -> dict[str, Any] | None:
    """POST /api/v1/grade. Returns the response body, or None on any
    failure — callers must treat None as "no hint_token", never propagate
    an error to the student for this."""
    settings = get_settings()
    if not settings.TUTOR_SERVICE_URL:
        return None

    try:
        async with httpx.AsyncClient(timeout=_GRADE_TIMEOUT) as client:
            resp = await client.post(
                f"{settings.TUTOR_SERVICE_URL}/api/v1/grade",
                headers={"X-Service-Key": settings.TUTOR_SERVICE_KEY},
                json={
                    "external_user_id": external_user_id,
                    "problem_id": problem_id,
                    "query": query,
                    "partner_verdict": partner_verdict,
                    "client_submission_id": client_submission_id,
                },
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.warning("Tutor /grade call failed — no hint_token this submission.", exc_info=True)
        return None


async def hint(hint_token: str) -> dict[str, Any] | None:
    """POST /api/v1/hint. Returns the response body, or None on any
    failure — callers must degrade to "hint unavailable", never raise."""
    settings = get_settings()
    if not settings.TUTOR_SERVICE_URL:
        return None

    try:
        async with httpx.AsyncClient(timeout=_HINT_TIMEOUT) as client:
            resp = await client.post(
                f"{settings.TUTOR_SERVICE_URL}/api/v1/hint",
                headers={"X-Service-Key": settings.TUTOR_SERVICE_KEY},
                json={"hint_token": hint_token},
            )
            resp.raise_for_status()
            return resp.json()
    except Exception:
        logger.warning("Tutor /hint call failed.", exc_info=True)
        return None
