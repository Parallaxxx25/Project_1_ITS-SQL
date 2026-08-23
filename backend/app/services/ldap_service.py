"""
app/services/ldap_service.py — LDAP / Active Directory authentication.

Strategy (matches the known-working test_login.py):
  • Connect over LDAPS (port 636) with TLS 1.2, cert validation configurable.
  • Bind DIRECTLY as the user with their UPN  (username@it.kmitl.ac.th),
    derived from LDAP_BASE_DN. A successful bind == authenticated. No service
    account / 2-step lookup needed.
  • After binding, the user's own connection searches for their profile
    (sAMAccountName), escaping the input with escape_filter_chars (CWE-90).
  • Passwords are never logged. AD "data <code>" sub-errors map to typed
    exceptions so the API returns safe messages.

The authenticator accepts an optional ``connection_factory`` so unit tests can
inject an offline stub connection instead of hitting a real server.
"""
from __future__ import annotations

import re
import ssl
from dataclasses import dataclass, field

from ldap3 import Server, Connection, Tls, SUBTREE, SYNC, ALL
from ldap3.core.exceptions import (
    LDAPException,
    LDAPBindError,
    LDAPSocketOpenError,
    LDAPSocketReceiveError,
)
from ldap3.utils.conv import escape_filter_chars

from app.config import get_settings


# ── Typed errors ──────────────────────────────────────────────
class LdapError(Exception):
    """Base class. `.public_message` is safe to show an end user."""
    public_message = "ระบบยืนยันตัวตนขัดข้อง กรุณาลองใหม่อีกครั้ง"


class LdapConfigError(LdapError):
    public_message = "ระบบยืนยันตัวตนตั้งค่าไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ"


class LdapUnavailable(LdapError):
    public_message = "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ยืนยันตัวตนได้ กรุณาลองใหม่ภายหลัง"


class LdapInvalidCredentials(LdapError):
    public_message = "Username หรือ Password ไม่ถูกต้อง"


class LdapUserNotFound(LdapError):
    # Same message as InvalidCredentials — prevents user enumeration.
    public_message = "Username หรือ Password ไม่ถูกต้อง"


class LdapPasswordExpired(LdapError):
    public_message = "รหัสผ่านหมดอายุ กรุณาเปลี่ยนรหัสผ่านผ่านระบบขององค์กร"


class LdapMustResetPassword(LdapError):
    public_message = "ต้องเปลี่ยนรหัสผ่านก่อนเข้าใช้งาน กรุณาติดต่อ IT Service Desk"


class LdapAccountDisabled(LdapError):
    public_message = "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อ IT Service Desk"


class LdapAccountLocked(LdapError):
    public_message = "บัญชีถูกล็อกชั่วคราวเนื่องจากใส่รหัสผิดหลายครั้ง กรุณาลองใหม่ภายหลัง"


class LdapLoginNotPermitted(LdapError):
    public_message = "ไม่ได้รับอนุญาตให้เข้าสู่ระบบในขณะนี้ กรุณาติดต่อ IT Service Desk"


# AD Win32 "data <hex>" sub-status → exception class.
_AD_ERROR_MAP: dict[str, type[LdapError]] = {
    "525": LdapUserNotFound,        # user not found
    "52e": LdapInvalidCredentials,  # invalid credentials
    "530": LdapLoginNotPermitted,   # not permitted to logon at this time
    "531": LdapLoginNotPermitted,   # not permitted to logon at this workstation
    "532": LdapPasswordExpired,     # password expired
    "533": LdapAccountDisabled,     # account disabled
    "701": LdapAccountDisabled,     # account expired
    "773": LdapMustResetPassword,   # user must reset password
    "775": LdapAccountLocked,       # account locked out
}

_AD_DATA_RE = re.compile(r"data\s+([0-9a-fA-F]+)", re.IGNORECASE)


def ad_error_from_result(result_or_message) -> LdapError:
    """Translate an ldap3 result dict / message string into a typed error."""
    if isinstance(result_or_message, dict):
        message = result_or_message.get("message", "") or ""
    else:
        message = str(result_or_message or "")
    match = _AD_DATA_RE.search(message)
    if match:
        cls = _AD_ERROR_MAP.get(match.group(1).lower())
        if cls:
            return cls()
    # No recognizable AD code → treat as invalid credentials (safe default).
    return LdapInvalidCredentials()


# ── Result of a successful authentication ─────────────────────
@dataclass
class LdapProfile:
    dn: str
    username: str                 # sAMAccountName
    email: str
    display_name: str
    department: str = ""
    groups: list[str] = field(default_factory=list)
    role: str | None = None       # explicit role hint (dev users); real AD uses groups


# ── Authenticator ─────────────────────────────────────────────
class LdapAuthenticator:
    def __init__(self, settings=None, connection_factory=None):
        self.s = settings or get_settings()
        # connection_factory(user, password, *, raise_on_bind) -> Connection
        # Injectable so tests can supply an offline stub connection.
        self._factory = connection_factory or self._real_connection
        # StartTLS only makes sense on a plaintext (non-LDAPS) connection.
        self._start_tls = getattr(self.s, "LDAP_START_TLS", False) and not getattr(self.s, "LDAP_USE_SSL", False)

    # -- server / connection --------------------------------------------------
    def _tls(self) -> Tls | None:
        if not getattr(self.s, "LDAP_USE_SSL", False) and not self._start_tls:
            return None
        validate = getattr(ssl, self.s.LDAP_TLS_VALIDATE, ssl.CERT_NONE)
        kwargs = {"validate": validate}
        # Match the proven-working client: force TLS 1.2.
        if hasattr(ssl, "PROTOCOL_TLSv1_2"):
            kwargs["version"] = ssl.PROTOCOL_TLSv1_2
        if getattr(self.s, "LDAP_CA_CERTS_FILE", ""):
            kwargs["ca_certs_file"] = self.s.LDAP_CA_CERTS_FILE
        return Tls(**kwargs)

    def _server(self) -> Server:
        return Server(
            host=self.s.LDAP_HOST,
            port=self.s.LDAP_PORT,
            use_ssl=getattr(self.s, "LDAP_USE_SSL", False),
            tls=self._tls(),
            connect_timeout=self.s.LDAP_TIMEOUT,
            get_info=ALL,
        )

    def _real_connection(self, user, password, *, raise_on_bind: bool) -> Connection:
        return Connection(
            self._server(),
            user=user,
            password=password,
            client_strategy=SYNC,
            auto_bind=False,
            raise_exceptions=raise_on_bind,
            receive_timeout=self.s.LDAP_TIMEOUT,
        )

    def _maybe_start_tls(self, conn) -> None:
        if self._start_tls:
            conn.open()
            conn.start_tls()

    # -- identity helpers -----------------------------------------------------
    def _domain(self) -> str:
        """DC=it,DC=kmitl,DC=ac,DC=th → it.kmitl.ac.th"""
        parts = [
            p.split("=", 1)[1]
            for p in (self.s.LDAP_BASE_DN or "").split(",")
            if p.strip().upper().startswith("DC=")
        ]
        return ".".join(parts)

    def _user_upn(self, login: str) -> str:
        if "@" in login or "\\" in login:
            return login              # already UPN or DOMAIN\user
        domain = self._domain()
        return f"{login}@{domain}" if domain else login

    # -- public API -----------------------------------------------------------
    def ping(self) -> bool:
        """Open a socket + TLS to the server (no bind). Raises on failure."""
        try:
            conn = self._factory(None, None, raise_on_bind=False)
            conn.open()
            conn.unbind()
            return True
        except (LDAPSocketOpenError, LDAPSocketReceiveError) as e:
            raise LdapUnavailable() from e
        except LDAPException as e:
            raise LdapUnavailable() from e

    def authenticate(self, login: str, password: str) -> LdapProfile:
        """Direct UPN bind + self-search. Raises an LdapError subclass on failure."""
        login = (login or "").strip()
        if not login or not password:
            raise LdapInvalidCredentials()

        upn = self._user_upn(login)

        # Bind as the user — this verifies the password.
        try:
            conn = self._factory(upn, password, raise_on_bind=False)
            self._maybe_start_tls(conn)
            bound = conn.bind()
        except LDAPBindError as e:
            raise ad_error_from_result(getattr(e, "result", None) or {}) from e
        except (LDAPSocketOpenError, LDAPSocketReceiveError) as e:
            raise LdapUnavailable() from e
        except LDAPException as e:
            raise LdapInvalidCredentials() from e

        if not bound:
            # ldap3 stores the AD sub-error in conn.result['message'].
            raise ad_error_from_result(conn.result)

        # Authenticated — enrich with the directory profile (best-effort).
        try:
            return self._search_self(conn, login, upn)
        finally:
            conn.unbind()

    # -- internals ------------------------------------------------------------
    def _search_self(self, conn: Connection, login: str, upn: str) -> LdapProfile:
        # CWE-90: escape the untrusted input before building the filter.
        safe = escape_filter_chars(login)
        search_filter = self.s.LDAP_USER_FILTER.format(login=safe)
        try:
            conn.search(
                search_base=self.s.LDAP_BASE_DN,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=[
                    "distinguishedName", "sAMAccountName", "displayName",
                    "cn", "mail", "userPrincipalName", "department", "memberOf",
                ],
            )
        except LDAPException:
            conn.entries = []

        if not conn.entries:
            # Bind already succeeded → the user IS authenticated even if the
            # profile search returns nothing. Return a minimal profile.
            return LdapProfile(dn=upn, username=login, email="", display_name=login)

        entry = conn.entries[0]

        def val(attr: str, default: str = "") -> str:
            try:
                v = entry[attr].value
            except Exception:
                return default
            return str(v) if v is not None else default

        def vals(attr: str) -> list[str]:
            try:
                v = entry[attr].values
            except Exception:
                return []
            return [str(x) for x in (v or [])]

        return LdapProfile(
            dn=val("distinguishedName") or entry.entry_dn,
            username=val("sAMAccountName") or login,
            email=val("mail") or val("userPrincipalName"),
            display_name=val("displayName") or val("cn") or login,
            department=val("department"),
            groups=vals("memberOf"),
        )


# Module-level convenience singleton.
_authenticator: LdapAuthenticator | None = None


def get_authenticator() -> LdapAuthenticator:
    global _authenticator
    if _authenticator is None:
        _authenticator = LdapAuthenticator()
    return _authenticator
