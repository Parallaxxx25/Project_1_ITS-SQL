"""
HTTP client for the tutor grading + hint service
(github.com/Parallaxxx25/intelligent-tutor), called server-to-server with
X-Service-Key.

The live frontend's own client-side grading (DuckDB-WASM, App.jsx::handleSubmit)
is still what decides the verdict a student sees — see
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

# /grade runs deterministic SQL — no LLM — so 5s is generous once the tutor
# is warm. Cold is the case that actually breaks: on Render's free tier the
# tutor spins down after ~15min idle and the first call pays a container
# start. 10s absorbs that without being pointless — the browser aborts at
# 15s (lib/api.js::apiFetch default), so a longer bound here is never read.
# Keeping the tutor warm (cron ping) is the real fix for cold starts; this
# only stops a slow-but-alive service from reading as an outage.
_GRADE_TIMEOUT = 10.0
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
