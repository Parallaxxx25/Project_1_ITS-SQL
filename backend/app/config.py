from pydantic_settings import BaseSettings
from functools import lru_cache
import secrets


class Settings(BaseSettings):
    # ── App ──
    APP_NAME: str = "ITS-SQL Platform"
    DEBUG: bool = True

    # ── JWT ──
    SECRET_KEY: str = secrets.token_hex(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours

    # ── Database ──
    DATABASE_URL: str = "sqlite+aiosqlite:///./its_sql.db"

    # ── LDAP / Active Directory Authentication (LDAPS) ──
    LDAP_ENABLED: bool = True
    LDAP_HOST: str = "NITROGEN.it.kmitl.ac.th"
    LDAP_PORT: int = 636                # 636 = LDAPS (TLS), 389 = plaintext/StartTLS
    LDAP_USE_SSL: bool = True           # True → LDAPS on connect
    # Certificate validation: CERT_REQUIRED (secure) | CERT_OPTIONAL | CERT_NONE (dev only).
    # If the AD server uses an internal/self-signed cert not in the OS trust store,
    # CERT_REQUIRED will fail — install the CA and keep CERT_REQUIRED for production.
    # AD commonly uses an internal/self-signed LDAPS cert → CERT_NONE by default
    # (matches the known-working client). Set CERT_REQUIRED + LDAP_CA_CERTS_FILE
    # once the CA is trusted.
    LDAP_TLS_VALIDATE: str = "CERT_REQUIRED"
    LDAP_CA_CERTS_FILE: str = ""        # optional path to CA bundle for the AD cert
    # StartTLS: connect plaintext on 389 then upgrade to TLS before binding.
    # Use when the server offers 389 (not 636) but you still want encryption.
    LDAP_START_TLS: bool = False

    # Service (bind) account — used only to look up the user's DN (step 1).
    # AD simple bind accepts UPN (user@domain) or DOWN-LEVEL (DOMAIN\\user) or full DN.
    LDAP_BIND_USER: str = "ldap_bind@it.kmitl.ac.th"
    LDAP_BIND_PASSWORD: str = ""        # set in .env — never commit

    LDAP_BASE_DN: str = "DC=it,DC=kmitl,DC=ac,DC=th"
    # {login} is replaced with the ESCAPED user input (CWE-90 safe).
    LDAP_USER_FILTER: str = "(&(objectClass=user)(objectCategory=person)(sAMAccountName={login}))"
    LDAP_TIMEOUT: int = 8              # seconds for connect + receive

    # Role assignment for JIT-provisioned LDAP users.
    LDAP_DEFAULT_ROLE: str = "student"
    # Map an AD group DN substring → platform role, e.g.
    # {"CN=Instructors,OU=Groups": "instructor"}. Checked against memberOf.
    LDAP_GROUP_ROLE_MAP: dict = {}
    # Usernames (sAMAccountName / login) always granted the instructor role,
    # regardless of AD groups. Password is STILL verified by LDAP/AD.
    LDAP_INSTRUCTOR_USERS: list[str] = []

    # Brute-force / lockout protection (per IP and per username).
    LDAP_RATE_LIMIT: int = 5          # max attempts...
    LDAP_RATE_WINDOW: int = 60        # ...per this many seconds

    # ── Dev mode ──
    # When True, /api/auth/ldap-login validates a fixed set of test users
    # LOCALLY (no network / no AD) so login works off-campus without VPN.
    # MUST be False in production — enable only via the gitignored .env.
    LDAP_DEV_MODE: bool = False
    LDAP_DEV_USERS: dict = {}         # {username: {password,name,email,role,department}}
    # When True, if the real AD is UNREACHABLE (e.g. off-campus, no tunnel),
    # fall back to the local dev users so login still works. Real AD is always
    # tried first — so on campus/tunnel the real AD password is used.
    LDAP_DEV_FALLBACK: bool = False

    # LDAP Branch configurations (Thai university common branches)
    # Format: branch_code -> display_name
    LDAP_BRANCHES: dict = {
        "it": "Information Technology",
        "eng": "Engineering",
        "science": "Science",
        "business": "Business Administration",
        "architecture": "Architecture",
        "medicine": "Medicine",
        "agriculture": "Agriculture",
    }

    # ── CORS ──
    FRONTEND_URL: str = "http://localhost:8080"

    # ── Email domain restriction (fallback for non-LDAP) ──
    ALLOWED_EMAIL_DOMAIN: str = "kmitl.ac.th"

    # ── Grading Sandbox ──
    SANDBOX_DB_TYPE: str = "sqlite"  # "sqlite" or "mysql"
    SANDBOX_MYSQL_HOST: str = "localhost"
    SANDBOX_MYSQL_PORT: int = 3306
    SANDBOX_MYSQL_USER: str = "root"
    SANDBOX_MYSQL_PASSWORD: str = ""

    # ── Authorized Instructors ──
    AUTHORIZED_INSTRUCTORS: list[str] = [
        "ผศ.ดร.กนกวรรณ อัจฉริยะชาญวณิช",
        "ดร.ศิรสิทธิ์ โล่ชนะจิต",
        "นายพชร พรอโนทัย",
        "นายณัฐวีร์ เแนกำพล",
    ]

    # ── Supabase (Activity Tracking) ──
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> Settings:
    return Settings()
