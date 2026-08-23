"""
Deterministic unit tests for the LDAP auth core — no network required.

Run:  python -m tests.test_ldap_auth      (from the backend/ directory)

Covers:
  • CWE-90 — user input is escaped before entering the search filter
  • 2-step service-bind flow returns the expected profile
  • wrong password → LdapInvalidCredentials
  • AD "data <code>" mapping → correct typed exceptions
  • sliding-window rate limiter (allow N, block N+1, reset)
"""
import sys
from types import SimpleNamespace

from app.services import ldap_service
from app.services.ldap_service import (
    LdapAuthenticator, LdapProfile,
    LdapUserNotFound, LdapInvalidCredentials, LdapPasswordExpired,
    LdapAccountDisabled, LdapMustResetPassword, LdapAccountLocked,
    ad_error_from_result,
)
from app.services.rate_limiter import SlidingWindowRateLimiter


# ── Test doubles ──────────────────────────────────────────────
class _Attr:
    def __init__(self, v):
        self.values = v if isinstance(v, list) else [v]
        self.value = self.values[0] if self.values else None


class _Entry:
    def __init__(self, dn, attrs):
        self.entry_dn = dn
        self._a = attrs

    def __getitem__(self, k):
        if k not in self._a:
            raise KeyError(k)
        return _Attr(self._a[k])


class _StubConn:
    """Minimal stand-in for ldap3.Connection driven by an in-memory DIT."""
    def __init__(self, user, password, dit, records):
        self.user, self.password = user, password
        self.dit, self.records = dit, records
        self.entries, self.result, self.bound = [], {}, False

    def bind(self):
        entry = self.dit.get(self.user)
        if entry is None:
            self.result = {"description": "invalidCredentials", "message": "no such user"}
            return False
        if entry.get("userPassword") != self.password:
            self.result = {"description": "invalidCredentials",
                           "message": entry.get("_failmsg", "80090308: data 52e")}
            return False
        self.bound, self.result = True, {"description": "success"}
        return True

    def search(self, search_base, search_filter, search_scope, attributes):
        self.records["filter"] = search_filter
        found = self.records.get("lookup")
        self.entries = [found] if found else []
        return bool(found)

    def unbind(self):
        self.bound = False
        return True


def _settings():
    return SimpleNamespace(
        LDAP_BASE_DN="DC=it,DC=kmitl,DC=ac,DC=th",
        LDAP_USER_FILTER="(&(objectClass=user)(objectCategory=person)(sAMAccountName={login}))",
    )


def _make(dit, records):
    def factory(user, password, *, raise_on_bind):
        return _StubConn(user, password, dit, records)
    return LdapAuthenticator(settings=_settings(), connection_factory=factory)


# ── Tests ─────────────────────────────────────────────────────
def test_direct_bind_success():
    upn = "it66070126@it.kmitl.ac.th"
    user_dn = "CN=it66070126,OU=Students,DC=it,DC=kmitl,DC=ac,DC=th"
    dit = {upn: {"userPassword": "NLKctw25"}}
    records = {"lookup": _Entry(user_dn, {
        "distinguishedName": user_dn,
        "sAMAccountName": "it66070126",
        "displayName": "Test Student",
        "mail": "it66070126@it.kmitl.ac.th",
        "department": "Information Technology",
        "memberOf": ["CN=Students,OU=Groups,DC=it,DC=kmitl,DC=ac,DC=th"],
    })}
    profile = _make(dit, records).authenticate("it66070126", "NLKctw25")
    assert isinstance(profile, LdapProfile)
    assert profile.username == "it66070126"
    assert profile.dn == user_dn
    assert profile.email == "it66070126@it.kmitl.ac.th"
    assert profile.display_name == "Test Student"
    assert profile.groups == ["CN=Students,OU=Groups,DC=it,DC=kmitl,DC=ac,DC=th"]


def test_wrong_password():
    upn = "it66070126@it.kmitl.ac.th"
    dit = {upn: {"userPassword": "correct"}}
    records = {"lookup": None}
    try:
        _make(dit, records).authenticate("it66070126", "WRONG")
        assert False, "expected LdapInvalidCredentials"
    except LdapInvalidCredentials:
        pass


def test_search_empty_still_authenticates():
    # Bind OK but the profile search returns nothing → still authenticated.
    upn = "it66070126@it.kmitl.ac.th"
    dit = {upn: {"userPassword": "pw"}}
    records = {"lookup": None}
    profile = _make(dit, records).authenticate("it66070126", "pw")
    assert profile.username == "it66070126"


def test_injection_is_escaped():
    """A malicious login must never reach the filter unescaped (CWE-90)."""
    malicious = "*)(uid=*))(|(sAMAccountName=*"
    upn = f"{malicious}@it.kmitl.ac.th"
    dit = {upn: {"userPassword": "x"}}   # bind succeeds so the self-search runs
    records = {"lookup": None}
    _make(dit, records).authenticate(malicious, "x")
    built = records["filter"]
    # The raw wildcard/paren payload must be escaped to \2a / \29 / \28 forms.
    assert "*)(uid=*" not in built, f"unescaped injection leaked into filter: {built}"
    assert "\\2a" in built and "\\28" in built and "\\29" in built


def test_ad_error_mapping():
    cases = {
        "80090308: LdapErr: ..., data 52e, v2580": LdapInvalidCredentials,
        "..., data 532, ...": LdapPasswordExpired,
        "..., data 533, ...": LdapAccountDisabled,
        "..., data 773, ...": LdapMustResetPassword,
        "..., data 775, ...": LdapAccountLocked,
    }
    for message, expected in cases.items():
        err = ad_error_from_result({"message": message})
        assert isinstance(err, expected), f"{message!r} → {type(err).__name__}, want {expected.__name__}"


def test_instructor_override():
    """Configured usernames are forced to instructor regardless of AD groups."""
    from app.services import auth_service
    auth_service.settings.LDAP_INSTRUCTOR_USERS = ["it66070126", "it66070066"]

    forced = LdapProfile(dn="x", username="it66070126", email="a@b", display_name="X")
    assert auth_service._resolve_role(forced).value == "instructor"

    normal = LdapProfile(dn="x", username="it66070999", email="a@b", display_name="Y")
    assert auth_service._resolve_role(normal).value == "student"  # default, not overridden


def test_rate_limiter():
    rl = SlidingWindowRateLimiter()
    for i in range(5):
        allowed, _ = rl.hit("k", 5, 60)
        assert allowed, f"attempt {i+1} should be allowed"
    allowed, retry = rl.hit("k", 5, 60)
    assert not allowed and retry > 0, "6th attempt must be blocked with retry-after"
    rl.reset("k")
    allowed, _ = rl.hit("k", 5, 60)
    assert allowed, "reset must clear the counter"


# ── Runner ────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    failed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except Exception as e:
            failed += 1
            print(f"  FAIL  {t.__name__}: {type(e).__name__}: {e}")
    print(f"\n{len(tests) - failed}/{len(tests)} passed")
    sys.exit(1 if failed else 0)
