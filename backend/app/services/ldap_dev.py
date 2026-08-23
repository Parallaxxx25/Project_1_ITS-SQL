"""
app/services/ldap_dev.py — LOCAL dev authenticator (no network / no AD).

Active only when settings.LDAP_DEV_MODE is True, or as a fallback when the real
AD is unreachable AND settings.LDAP_DEV_FALLBACK is True. Lets you exercise the
full login flow off-campus without VPN. Returns the same LdapProfile the real
authenticator produces, so everything downstream (JIT provisioning, JWT, audit)
is identical.

⚠️  This is an authentication bypass of Active Directory. Keep LDAP_DEV_MODE and
    LDAP_DEV_FALLBACK False in production.

SECURITY: there are intentionally NO built-in accounts/passwords in this file.
Test users MUST be supplied out-of-band via the gitignored .env as
LDAP_DEV_USERS, e.g.:

    LDAP_DEV_USERS={"it00000000": {"password": "…", "name": "…", "role": "instructor"}}

If LDAP_DEV_USERS is empty, dev auth always fails — so shipping code can never
grant access with committed credentials.
"""
from __future__ import annotations

from app.services.ldap_service import LdapProfile, LdapInvalidCredentials

# No hardcoded credentials. Supply accounts via settings.LDAP_DEV_USERS (.env).
DEFAULT_DEV_USERS: dict[str, dict] = {}


def dev_authenticate(settings, login: str, password: str) -> LdapProfile:
    login = (login or "").strip()
    if not login or not password:
        raise LdapInvalidCredentials()

    users = settings.LDAP_DEV_USERS or DEFAULT_DEV_USERS

    record = users.get(login) or users.get(login.lower())
    # Constant-ish check; same generic error as real auth — no user enumeration.
    if not record or record.get("password") != password:
        raise LdapInvalidCredentials()

    return LdapProfile(
        dn=f"CN={login},OU=Dev,DC=it,DC=kmitl,DC=ac,DC=th",
        username=login,
        email=record.get("email") or f"{login}@it.kmitl.ac.th",
        display_name=record.get("name") or login,
        department=record.get("department", ""),
        groups=list(record.get("groups", [])),
        role=record.get("role"),
    )
