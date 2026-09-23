# Deploying ITS-SQL on the faculty VM

A runbook. Read it over SSH on the VM and work top to bottom. Every phase ends
with something you can check before moving on.

This replaces the Render + Vercel + Supabase deployment. It does not replace
[docker-compose.yml](docker-compose.yml), which stays exactly as it is for local
development.

---

## Why this exists

Three reasons the free-tier stack was not going to hold:

1. **LDAP is unreachable from the cloud.** [ldap.md](ldap.md) targets
   `ldap://NITROGEN.it.kmitl.ac.th:389`, a campus-internal host. A Render dyno
   cannot resolve it. AD auth requires running inside the campus network.
2. **Cold starts already break submissions.** Render free spins down after ~15
   min idle; the first `/grade` after that outlasts the 10s timeout in
   [tutor_client.py:32-33](backend/app/services/tutor_client.py#L32-L33), which
   students see as "Couldn't reach the AI Tutor".
3. **Supabase free pauses after ~7 days idle.** A semester break kills the DB.

## VM facts this plan is built on

| | |
|---|---|
| RAM / cores | 7.8 GB, 4 cores — comfortable |
| Disk available | **8.7 GB — the binding constraint** |
| Network | VM sits inside the campus network; IT opens inbound 80 + 443 publicly |
| TLS | Let's Encrypt via Caddy, HTTP-01 on port 80, auto-renewing |
| Domain | Ask IT for `dblearn.it.kmitl.ac.th`. Use `<ip>.sslip.io` until then |

## Decisions already made

- **All services on the VM, same origin.** Caddy serves the built frontend and
  proxies `/api`. No Vercel, no CORS, one place for security headers.
- **Two Postgres containers**, not one. Postgres grants `CONNECT` to `PUBLIC` on
  every database by default — one instance with two databases means `student_ro`
  can reach the accounts table unless someone remembers a `REVOKE`. Separate
  instances make the isolation structural.
- **Fresh start.** No data migration. Students re-enrol with `ITSSQL2025`.
- **LDAP is a follow-up**, not part of this migration.
- **Slide RAG stays off** — a ~220 MB ONNX model does not fit in 8.7 GB.
- **Single uvicorn worker.** The login rate limiter is in-memory per process
  ([rate_limiter.py](backend/app/services/rate_limiter.py)); `--workers 4` would
  divide the throttle by four.

---

## Phase 0 — Rotate the LDAP credential

Do this today, whether or not the migration proceeds.

[ldap.md](ldap.md) line 26 holds the `ldap_bind` service account password in
plaintext, and the file is tracked in git — it is in every clone and in history.

1. Ask IT to rotate the `ldap_bind` password.
2. Replace the value in `ldap.md` with `<set in .env, never committed>`.

Purging git history is a separate, larger job. Rotation is what stops the harm.

---

## Phase 1 — Reclaim disk

Ubuntu's installer routinely allocates only part of the volume group to the root
logical volume. Check before planning around 8.7 GB.

```bash
sudo vgs        # look at the VFree column
sudo lvs
```

If `VFree` is non-zero:

```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
df -h
```

**Check:** `df -h` shows the new size. Record it — if you are still near 8.7 GB,
run `docker builder prune -f` after every build in Phase 4.

---

## Phase 2 — Base system

> **Do not enable the firewall before allowing SSH.** `ufw enable` with no SSH
> rule will disconnect you from the VM and you will need console access to
> recover. Run the `allow OpenSSH` line first and confirm it appears in
> `ufw status` before enabling.

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
sudo usermod -aG docker $USER      # log out and back in for this to take effect

sudo ufw allow OpenSSH             # FIRST. Verify before the next line.
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Clone **with submodules** — `tutor/` is empty otherwise:

```bash
sudo mkdir -p /srv && sudo chown $USER /srv
git clone --recurse-submodules <repo-url> /srv/its-sql
cd /srv/its-sql
git checkout feat/tutor-integration
```

**Check:** `ls tutor/backend` is not empty. `docker ps` runs without `sudo`.

---

## Phase 3 — Prerequisites you cannot do from the VM

Run these in parallel with Phase 4; they block Phase 6, not before.

- **IT ticket:** inbound 80 + 443 open publicly. DNS record for
  `dblearn.it.kmitl.ac.th` pointing at the VM.
- **Google Cloud Console:** add `https://<your-domain>` to the OAuth client's
  authorized JavaScript origins. Login cannot work until this is done, and it
  must be redone if the domain changes.

Interim domain while the ticket sits: `<vm-public-ip>.sslip.io` resolves to that
IP with no signup and works with Let's Encrypt. Swapping later is one line in
`.env` plus one Google Console entry.

---

## Phase 4 — The three files to write

### 4a. `frontend/Dockerfile` — add build and prod stages

Today it runs the Vite dev server; its own comment says it is not for deploying.
Keep that stage, add two more.

```dockerfile
FROM node:22-alpine AS dev
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM caddy:2-alpine AS prod
COPY --from=build /app/dist /srv
```

`VITE_API_URL` is deliberately not set: [api.js](frontend/src/lib/api.js) falls
back to `/api`, which is correct for a same-origin deploy.

Then pin the dev stage in [docker-compose.yml](docker-compose.yml) so local
development is unaffected — under `partner-web`, replace `build: ./frontend` with:

```yaml
    build:
      context: ./frontend
      target: dev
```

### 4b. `Caddyfile` — repo root

Headers are lifted from [frontend/vercel.json](frontend/vercel.json), minus the
`onrender.com` entry in `connect-src`, which same-origin makes unnecessary.

```
{$DOMAIN} {
	root * /srv
	encode gzip

	handle /api/* {
		reverse_proxy partner-api:8000
	}

	handle {
		try_files {path} /index.html
		file_server
	}

	header {
		Cross-Origin-Opener-Policy "same-origin-allow-popups"
		Cross-Origin-Embedder-Policy "credentialless"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Strict-Transport-Security "max-age=63072000; includeSubDomains"
		Content-Security-Policy "default-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'; frame-src https://accounts.google.com; img-src 'self' data: https://media.giphy.com; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; script-src 'self' 'wasm-unsafe-eval' https://accounts.google.com https://cdn.jsdelivr.net; worker-src 'self' blob: https://cdn.jsdelivr.net; connect-src 'self' https://cdn.jsdelivr.net https://accounts.google.com https://www.googleapis.com"
		-Server
	}
}
```

### 4c. `docker-compose.prod.yml` — standalone, not an override

> **Why standalone and not `-f base -f prod`:** Compose *concatenates* `ports`
> across files rather than replacing them. An override cannot remove the
> `8000:8000` and `8080:8080` mappings in the base file, so the backend would
> stay exposed directly on the host, bypassing Caddy and TLS. A separate file
> avoids the trap entirely. The base file is explicitly a local-trial stack.

```yaml
services:
  app-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: its_sql
      POSTGRES_PASSWORD: ${APP_DB_PASSWORD:?set APP_DB_PASSWORD in .env}
      POSTGRES_DB: its_sql
    volumes:
      - app_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U its_sql -d its_sql"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  tutor-postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: tutor
      POSTGRES_PASSWORD: ${TUTOR_DB_PASSWORD:?set TUTOR_DB_PASSWORD in .env}
      POSTGRES_DB: tutor_db
    volumes:
      - tutor_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U tutor -d tutor_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  tutor-redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  tutor-api:
    build: ./tutor
    environment:
      POSTGRES_URL: postgresql+asyncpg://tutor:${TUTOR_DB_PASSWORD}@tutor-postgres:5432/tutor_db
      POSTGRES_URL_SYNC: postgresql://tutor:${TUTOR_DB_PASSWORD}@tutor-postgres:5432/tutor_db
      # student_ro, never the owner role. See Phase 5.
      POSTGRES_URL_EXEC: postgresql://student_ro:${STUDENT_RO_PASSWORD:?set it}@tutor-postgres:5432/tutor_db
      REDIS_URL: redis://tutor-redis:6379/0
      SERVICE_KEY: ${SERVICE_KEY:?set SERVICE_KEY in .env}
      GOOGLE_API_KEY: ${GOOGLE_API_KEY:-}
      LANGSMITH_API_KEY: ${LANGSMITH_API_KEY:-}
      LANGCHAIN_TRACING: ${LANGCHAIN_TRACING:-false}
      LANGCHAIN_PROJECT: its-sql-prod
      SLIDE_RAG_ENABLED: "false"   # ~220MB model download; no room on 8.7GB
      DEFAULT_PIPELINE_MODE: llm
      ENV: production
      DEBUG: "false"
    depends_on:
      tutor-postgres: {condition: service_healthy}
      tutor-redis: {condition: service_healthy}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 15s
      timeout: 5s
      retries: 5
      start_period: 60s
    restart: unless-stopped

  partner-api:
    build: ./backend
    environment:
      SECRET_KEY: ${SECRET_KEY:?set SECRET_KEY in .env}
      DATABASE_URL: postgresql+asyncpg://its_sql:${APP_DB_PASSWORD}@app-postgres:5432/its_sql
      TUTOR_SERVICE_URL: http://tutor-api:8000
      TUTOR_SERVICE_KEY: ${SERVICE_KEY}      # must equal the tutor's SERVICE_KEY
      FRONTEND_URL: https://${DOMAIN:?set DOMAIN in .env}
      ALLOWED_EMAIL_DOMAIN: kmitl.ac.th
      DEBUG: "false"
    depends_on:
      app-postgres: {condition: service_healthy}
      tutor-api: {condition: service_healthy}
    restart: unless-stopped
    # single worker on purpose — the login rate limiter is per-process

  caddy:
    build:
      context: ./frontend
      target: prod
    environment:
      DOMAIN: ${DOMAIN}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data        # certs live here — losing this hits LE rate limits
      - caddy_config:/config
    depends_on:
      - partner-api
    restart: unless-stopped

volumes:
  app_pgdata:
  tutor_pgdata:
  caddy_data:
  caddy_config:
```

Note that **no service other than Caddy binds a host port**. Everything else is
reachable only over the compose network by service name.

---

## Phase 5 — Secrets and the read-only role

Generate secrets on the VM and write them to `/srv/its-sql/.env`. That file is
already covered by `.gitignore` — confirm with `git check-ignore -v .env` before
you put anything in it.

```bash
cd /srv/its-sql
cat >> .env <<EOF
DOMAIN=dblearn.it.kmitl.ac.th
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
SERVICE_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
APP_DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
TUTOR_DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
STUDENT_RO_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
GOOGLE_API_KEY=<your Gemini key>
EOF
chmod 600 .env
```

Bring the stack up, then provision the read-only role:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps     # wait for healthy

# edit the placeholder password in the script to match STUDENT_RO_PASSWORD first
docker compose -f docker-compose.prod.yml exec -T tutor-postgres \
  psql -U tutor -d tutor_db < tutor/scripts/provision_student_ro.sql
```

`provision_student_ro.sql` revokes everything on `public`, grants `SELECT` and
`USAGE` on `production` and `sales` only, and sets `ALTER DEFAULT PRIVILEGES` so
reseeds stay covered.

**This is the security boundary.** The allowlist in
[code_executor.py:38-41](tutor/backend/tools/code_executor.py#L38-L41) is a
regex; role privileges are what actually stop a `SELECT` that slips past it.
`POSTGRES_URL_EXEC` must never point at the owner role.

---

## Phase 6 — Seed

```bash
docker compose -f docker-compose.prod.yml exec partner-api python -m app.seed
docker compose -f docker-compose.prod.yml exec tutor-api python -m backend.db.seed
```

First seeds course `06070999` (access code `ITSSQL2025`) with ~110 problems.
Second loads the BikeStores dataset into `production` and `sales`.

**Capture the instructor passwords.** `ensure_instructors()` runs on every boot
and prints a random password **once**, at account creation, for `aj001`,
`it66070126` and `it66070066`:

```bash
docker compose -f docker-compose.prod.yml logs partner-api | grep -i instructor
```

Missed them → `backend/scripts/reset_instructor_pw.py`. Do not set
`SEED_INSTRUCTOR_PW` to avoid this: when set, the plaintext is re-hashed and
echoed to the log on every single startup.

---

## Phase 7 — Verify

Work through all of these before telling anyone the new URL.

```bash
# everything healthy, nothing restart-looping
docker compose -f docker-compose.prod.yml ps

# TLS and headers
curl -I https://$DOMAIN/                     # 200, Strict-Transport-Security present
curl -f https://$DOMAIN/api/health           # {"status":"ok",...}

# tutor is "ok", not "degraded" (degraded means Redis did not connect)
docker compose -f docker-compose.prod.yml exec tutor-api curl -sf localhost:8000/health

# nothing but Caddy is listening on the host
sudo ss -tlnp | grep -E ':(80|443|8000|8080|5432|6379)'
```

**The isolation test — do not skip it.** A pass here is the whole reason for two
Postgres containers:

```bash
# should fail: student_ro has no privileges on the tutor's own tables
docker compose -f docker-compose.prod.yml exec tutor-postgres \
  psql "postgresql://student_ro:$STUDENT_RO_PASSWORD@localhost:5432/tutor_db" \
  -c "SELECT * FROM interactions LIMIT 1;"
# expect: ERROR: permission denied

# should succeed: the bikestore tables students are meant to query
docker compose -f docker-compose.prod.yml exec tutor-postgres \
  psql "postgresql://student_ro:$STUDENT_RO_PASSWORD@localhost:5432/tutor_db" \
  -c "SELECT count(*) FROM sales.customers;"
# expect: 82365
```

**In a browser, from off campus:**

1. Log in with a `@kmitl.ac.th` Google account.
2. Enrol with `ITSSQL2025`.
3. Submit a **wrong** answer, confirm a hint appears. This is the
   `partner-api → tutor-api → Gemini` path that Render's cold start broke.
4. Submit a **correct** answer, confirm the verdict records.

---

## Phase 8 — Backups

Only the partner DB matters. The tutor DB is fully reseedable from
`SQL-Server-Sample-Database/` and `sql-problem/`, and Chroma rebuilds at boot.

```bash
sudo mkdir -p /var/backups/its-sql && sudo chown $USER /var/backups/its-sql
crontab -e
```

```cron
0 3 * * * cd /srv/its-sql && docker compose -f docker-compose.prod.yml exec -T app-postgres pg_dump -U its_sql its_sql | gzip > /var/backups/its-sql/its_sql-$(date +\%F).sql.gz
0 4 * * * find /var/backups/its-sql -name 'its_sql-*.sql.gz' -mtime +7 -delete
0 5 * * 0 docker image prune -af --filter "until=168h"
```

**Test a restore once, now, not during an incident:**

```bash
docker compose -f docker-compose.prod.yml exec -T app-postgres \
  psql -U its_sql -c "CREATE DATABASE restore_test;"
gunzip -c /var/backups/its-sql/its_sql-$(date +%F).sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T app-postgres psql -U its_sql -d restore_test
docker compose -f docker-compose.prod.yml exec -T app-postgres \
  psql -U its_sql -d restore_test -c "SELECT count(*) FROM users;"
```

Pull a copy to your own machine weekly: `scp vm:/var/backups/its-sql/*.gz .`

---

## Phase 9 — Cutover

Switch as soon as Phase 7 passes end to end.

1. **Announce the re-enrol step first.** Fresh start means every student
   re-enrols with `ITSSQL2025` and loses prior attempts. Doing that mid-assignment
   without warning is the failure mode.
2. Point students at `https://<domain>`.
3. **Leave Render and Vercel deployed** — not serving, but redeployable — until
   one full assignment cycle completes on the VM.

Cleanup once that cycle passes: delete the Render services, delete
[netlify.toml](netlify.toml) and [frontend/vercel.json](frontend/vercel.json),
and remove the unused `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` fields from
[backend/app/config.py:39-40](backend/app/config.py#L39-L40).

---

## Operating it

```bash
cd /srv/its-sql

# deploy a change
git pull && git submodule update --init
docker compose -f docker-compose.prod.yml up -d --build
docker builder prune -f          # disk is tight

# logs
docker compose -f docker-compose.prod.yml logs -f partner-api
docker compose -f docker-compose.prod.yml logs -f tutor-api

# restart one service
docker compose -f docker-compose.prod.yml restart tutor-api

# disk check — run this monthly
df -h && docker system df
```

### Known failure modes

| Symptom | Cause | Fix |
|---|---|---|
| "Couldn't reach the AI Tutor" | `tutor-api` unhealthy, or `SERVICE_KEY` mismatch between the two services | `logs tutor-api`; confirm both read the same `SERVICE_KEY` |
| Tutor health says `"degraded"` | Redis did not connect. Not fatal — grading and hints still work | `restart tutor-redis` |
| Hints are generic and repetitive | `GOOGLE_API_KEY` missing or rejected; the pipeline falls back to rule-based hints rather than failing | Check the key, check VM outbound HTTPS |
| Login works on campus, fails off campus | Domain missing from Google's authorized JavaScript origins | Add it in Cloud Console |
| Cert renewal fails | Port 80 closed, or the `caddy_data` volume was deleted | Confirm inbound 80; never delete `caddy_data` |
| Disk full | Docker build cache | `docker builder prune -af && docker image prune -af` |

### Unresolved

- **DNS name** — IT ticket outstanding. Interim `sslip.io` works.
- **Ownership.** Nobody is named as maintainer after the current author
  graduates. That is the strongest standing argument for going back to a managed
  stack, and this runbook does not solve it. Name a successor and walk them
  through Phase 7.
