"""
The "enroll again after every login" bug: enrollment used to live only in the
browser's localStorage, so it never survived a new session. Enrollment now
lives in the enrollments table, and this asserts it survives a fresh login.

Also pins the course_ref resolution: course codes are all-digit strings, so
"06070999" must resolve by code, not as row id 6070999.

Run against a live backend:  BASE=http://localhost:8000 python -m backend.tests.test_enrollment_persists
"""
import os
import uuid

import requests

BASE = os.environ.get("BASE", "http://localhost:8000").rstrip("/")
COURSE_CODE = "06070999"
ACCESS_CODE = "ITSSQL2025"


def test_enrollment_survives_relogin():
    username = f"enrolltest_{uuid.uuid4().hex[:8]}"
    password = "pw123456"

    r = requests.post(f"{BASE}/api/auth/register", json={
        "username": username, "password": password,
        "name": "Enroll Test", "email": f"{username}@kmitl.ac.th",
    }, timeout=10)
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    auth = {"Authorization": f"Bearer {token}"}

    assert requests.get(f"{BASE}/api/courses", headers=auth, timeout=10).json() == []

    r = requests.post(f"{BASE}/api/courses/{COURSE_CODE}/enroll",
                      json={"access_code": ACCESS_CODE}, headers=auth, timeout=10)
    assert r.status_code == 200, r.text

    # Fresh login = fresh token = fresh browser. Enrollment must still be there.
    r = requests.post(f"{BASE}/api/auth/login",
                      json={"username": username, "password": password}, timeout=10)
    assert r.status_code == 200, r.text
    auth2 = {"Authorization": f"Bearer {r.json()['token']}"}

    codes = [c["code"] for c in requests.get(f"{BASE}/api/courses", headers=auth2, timeout=10).json()]
    assert COURSE_CODE in codes, codes


def test_wrong_access_code_rejected():
    username = f"enrollbad_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{BASE}/api/auth/register", json={
        "username": username, "password": "pw123456",
        "name": "Enroll Bad", "email": f"{username}@kmitl.ac.th",
    }, timeout=10)
    assert r.status_code == 200, r.text
    auth = {"Authorization": f"Bearer {r.json()['token']}"}

    r = requests.post(f"{BASE}/api/courses/{COURSE_CODE}/enroll",
                      json={"access_code": "WRONG"}, headers=auth, timeout=10)
    assert r.status_code == 400, r.text
    assert requests.get(f"{BASE}/api/courses", headers=auth, timeout=10).json() == []


if __name__ == "__main__":
    test_enrollment_survives_relogin()
    test_wrong_access_code_rejected()
    print("ok")
