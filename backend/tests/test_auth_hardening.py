"""
Auth-hardening regressions. Each test maps to a fix in the branch:

- client-supplied role is rejected on register (privilege escalation)
- login/register response carries student_id (header + session shape)
- the retired /api/signup + /api/login surface is gone
- role gating still holds for staff-only routes
- a tampered token is rejected (PyJWT decode path)
- the login throttle still trips

Run against a live backend (order matters — the throttle case is last
because it blocks this IP for ~60s):

    BASE=http://localhost:8000 python -m backend.tests.test_auth_hardening
"""
import os
import uuid

import httpx

BASE = os.environ.get("BASE", "http://localhost:8000").rstrip("/")


def _student(client):
    """Register a fresh student, return (username, password, token)."""
    username = f"authtest_{uuid.uuid4().hex[:8]}"
    password = "pw123456"
    r = client.post(f"{BASE}/api/auth/register", json={
        "username": username, "password": password,
        "name": "Auth Test", "email": f"{username}@kmitl.ac.th",
    })
    assert r.status_code == 200, r.text
    return username, password, r.json()


def test_register_rejects_admin_role():
    with httpx.Client(timeout=10) as client:
        r = client.post(f"{BASE}/api/auth/register", json={
            "username": f"esc_{uuid.uuid4().hex[:8]}", "password": "pw123456",
            "name": "Esc", "email": f"esc_{uuid.uuid4().hex[:6]}@kmitl.ac.th",
            "role": "admin",
        })
        assert r.status_code == 400, r.text


def test_register_rejects_instructor_role():
    with httpx.Client(timeout=10) as client:
        r = client.post(f"{BASE}/api/auth/register", json={
            "username": f"esc_{uuid.uuid4().hex[:8]}", "password": "pw123456",
            "name": "Instructor aj001", "email": f"esc_{uuid.uuid4().hex[:6]}@kmitl.ac.th",
            "role": "instructor",
        })
        assert r.status_code == 400, r.text


def test_response_shape_has_student_id():
    with httpx.Client(timeout=10) as client:
        username, _, body = _student(client)
        assert body["user"]["student_id"] == username, body["user"]
        me = client.get(f"{BASE}/api/auth/me",
                        headers={"Authorization": f"Bearer {body['token']}"})
        assert me.status_code == 200, me.text
        assert me.json()["role"] == "student"
        assert me.json()["student_id"] == username


def test_retired_endpoints_are_gone():
    with httpx.Client(timeout=10) as client:
        assert client.post(f"{BASE}/api/signup", json={}).status_code == 404
        assert client.post(f"{BASE}/api/login", json={}).status_code == 404


def test_student_cannot_create_course():
    with httpx.Client(timeout=10) as client:
        _, _, body = _student(client)
        r = client.post(f"{BASE}/api/courses",
                        headers={"Authorization": f"Bearer {body['token']}"},
                        json={"code": "00000001", "name": "x", "access_code": "x"})
        assert r.status_code == 403, r.text


def test_tampered_token_rejected():
    with httpx.Client(timeout=10) as client:
        _, _, body = _student(client)
        head, payload, _sig = body["token"].split(".")
        bad = f"{head}.{payload}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        r = client.get(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {bad}"})
        assert r.status_code == 401, r.text


def test_login_throttle_trips():
    """Last — this blocks the IP's auth calls for ~RATE_LIMIT_WINDOW seconds."""
    with httpx.Client(timeout=10) as client:
        codes = []
        for _ in range(8):
            r = client.post(f"{BASE}/api/auth/login",
                            json={"username": "nobody_here", "password": "wrong-pw"})
            codes.append(r.status_code)
            if r.status_code == 429:
                assert "Retry-After" in r.headers, r.headers
                break
        assert 429 in codes, codes


if __name__ == "__main__":
    test_register_rejects_admin_role()
    test_register_rejects_instructor_role()
    test_response_shape_has_student_id()
    test_retired_endpoints_are_gone()
    test_student_cannot_create_course()
    test_tampered_token_rejected()
    test_login_throttle_trips()
    print("ok")
