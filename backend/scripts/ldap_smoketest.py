"""
scripts/ldap_smoketest.py — live LDAP/AD verification.

Run this ON the KMITL network (campus or VPN) — the AD server is firewalled off
the public internet. From backend/ :

    python -m scripts.ldap_smoketest                  # built-in test user
    python -m scripts.ldap_smoketest <user> <pass>    # any user

It checks, in order: TCP reachability, service (bind) account, and a full
2-step user authentication, printing a sanitized profile on success.
Passwords are never printed.
"""
import socket
import sys

from app.config import get_settings
from app.services.ldap_service import LdapAuthenticator, LdapError


def main() -> int:
    s = get_settings()
    user = sys.argv[1] if len(sys.argv) > 1 else "it66070126"
    pw = sys.argv[2] if len(sys.argv) > 2 else "NLKctw25"

    print(f"target : {s.LDAP_HOST}:{s.LDAP_PORT}  ssl={s.LDAP_USE_SSL}  tls={s.LDAP_TLS_VALIDATE}")
    print(f"base   : {s.LDAP_BASE_DN}")
    print(f"mode   : direct UPN bind (login@domain)")
    print(f"testing: {user}\n")

    # [1] TCP reachability
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(s.LDAP_TIMEOUT)
    try:
        sock.connect((s.LDAP_HOST, s.LDAP_PORT))
        print("[1] TCP connect ....... OK")
    except Exception as e:
        print(f"[1] TCP connect ....... FAIL: {type(e).__name__}: {e}")
        print("    → Not on the KMITL network? Connect via campus LAN / VPN and retry.")
        return 2
    finally:
        sock.close()

    auth = LdapAuthenticator()

    # [2] Server reachable + TLS handshake
    try:
        auth.ping()
        print("[2] server + TLS ...... OK")
    except LdapError as e:
        print(f"[2] server + TLS ...... FAIL: {type(e).__name__}")
        print(f"    → {e.public_message}")
        print("    → 636 blocked, or TLS handshake failed. Check tunnel/campus + LDAP_TLS_VALIDATE.")
        return 3

    # [3] Full 2-step user authentication
    try:
        p = auth.authenticate(user, pw)
    except LdapError as e:
        print(f"[3] user auth ......... FAIL: {type(e).__name__}")
        print(f"    → {e.public_message}")
        return 4

    print("[3] user auth ......... OK")
    print(f"    dn         : {p.dn}")
    print(f"    username   : {p.username}")
    print(f"    displayName: {p.display_name}")
    print(f"    mail       : {p.email}")
    print(f"    department : {p.department}")
    print(f"    groups     : {len(p.groups)}")
    print("\nALL CHECKS PASSED ✓")
    return 0


if __name__ == "__main__":
    sys.exit(main())
