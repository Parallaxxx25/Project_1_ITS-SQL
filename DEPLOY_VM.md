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
| Disk | 19 GB root LV after Phase 1; **~4.5 GB free with the stack built** — still the binding constraint |
| Network | VM sits inside the campus network at `10.0.30.101`. Reachable on campus and over the campus VPN, not from the internet |
| TLS | Let's Encrypt via Caddy, DNS-01 through the Cloudflare API, auto-renewing |
| Domain | `itssql.site` — registered at Z.com, DNS on Cloudflare (free plan), A record → `10.0.30.101` |

## Decisions already made

- **All services on the VM, same origin.** Caddy serves the built frontend and
  proxies `/api`. No Vercel, no CORS, one place for security headers.
- **Two Postgres containers**, not one. Postgres grants `CONNECT` to `PUBLIC` on
  every database by default — one instance with two databases means `student_ro`
  can reach the accounts table unless someone remembers a `REVOKE`. Separate
  instances make the isolation structural.
- **Fresh start.** No data migration. Students re-enrol with `ITSSQL2025`.
- **LDAP is a follow-up**, not part of this migration.
- **Slide RAG stays off** — a ~220 MB ONNX model, on a disk with ~4.5 GB left.
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

Run these in parallel with Phase 4. They block only the public half of Phase 7
— with `DOMAIN=localhost` (Phase 5) everything through the isolation test runs
on the VM without them.

- **Domain on Cloudflare DNS.** `itssql.site` is registered at Z.com, which
  has no DNS API Caddy can drive, so its nameservers point at the two
  Cloudflare ones — only those two; a leftover Z.com nameserver makes
  resolution intermittent. Don't edit DNS in the Z.com panel afterwards: it
  can switch the nameservers back to Z.com's.
- **One DNS record:** `A @ → 10.0.30.101`, proxy status **DNS only** (grey
  cloud). Proxied would send traffic to Cloudflare's edge, which cannot reach
  a private IP.
- **Cloudflare API token** scoped to that zone only, with the `Zone:Read` and
  `DNS:Edit` the [plugin](https://github.com/caddy-dns/cloudflare) asks for.
  Goes in `.env` as `CF_API_TOKEN`. Check it before first use: `GET
  /client/v4/zones?name=<domain>` must return the zone.

No IT ticket. A public DNS record may hold a private IP, and the campus
resolver (`10.0.30.1`) passes it through, checked 2026-09-26. DNS-01 needs only
outbound HTTPS to Cloudflare and Let's Encrypt, which the VM has.
- **Google Cloud Console — not needed today.** The login screen is
  username/password ([Login.jsx](frontend/src/components/Login.jsx) →
  [auth-api.js](frontend/src/lib/auth-api.js)); `loginWithGoogle` in
  [api.js](frontend/src/lib/api.js) has no callers. Only if Google sign-in is
  wired back in: add `https://<your-domain>` to the OAuth client's authorized
  JavaScript origins, and redo it whenever the domain changes.

Swapping the domain later is one line in `.env` — see
[Changing the domain](#changing-the-domain).

---

## Phase 4 — The three files

All three are committed. Nothing to write on the VM; this is what they do.

- [frontend/Dockerfile](frontend/Dockerfile) — three stages. `dev` is the Vite
  dev server, and [docker-compose.yml](docker-compose.yml) pins `target: dev`
  so local development is unchanged. `build` runs `vite build`; `prod` is
  Caddy with the built `dist` in `/srv`. `VITE_API_URL` is deliberately unset:
  [api.js](frontend/src/lib/api.js) falls back to `/api`, which is correct for
  a same-origin deploy.
- [Caddyfile](Caddyfile) — serves the frontend, proxies `/api/*` to
  `partner-api`. Headers are lifted from
  [frontend/vercel.json](frontend/vercel.json), minus the `onrender.com` entry
  in `connect-src`, which same-origin makes unnecessary.
- [docker-compose.prod.yml](docker-compose.prod.yml) — the production stack.
  **No service other than Caddy binds a host port**; everything else is
  reachable only over the compose network by service name.

> **Why standalone and not `-f base -f prod`:** Compose *concatenates* `ports`
> across files rather than replacing them. An override cannot remove the
> `8000:8000` and `8080:8080` mappings in the base file, so the backend would
> stay exposed directly on the host, bypassing Caddy and TLS. A separate file
> avoids the trap entirely. The base file is explicitly a local-trial stack.

---

## Phase 5 — Secrets and bring-up

Generate secrets on the VM and write them to `/srv/its-sql/.env`. That file is
already covered by `.gitignore` — confirm with `git check-ignore -v .env` before
you put anything in it.

```bash
cd /srv/its-sql
(umask 077; cat >> .env <<EOF
DOMAIN=itssql.site
CF_API_TOKEN=<Zone:Read + DNS:Edit token for the zone>
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
SERVICE_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
APP_DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
TUTOR_DB_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
STUDENT_RO_PASSWORD=$(python3 -c "import secrets; print(secrets.token_urlsafe(24))")
GOOGLE_API_KEY=<your Gemini key>
EOF
)
```

**No DNS record yet?** Use `DOMAIN=localhost` and comment out the `tls` block
in the [Caddyfile](Caddyfile) — DNS-01 cannot issue for `localhost`. Caddy then
issues itself a certificate from its internal CA and makes no Let's Encrypt
calls, so nothing is burned against rate limits, and Phases 6–7 run on the VM
with `curl -k`. `CF_API_TOKEN` must still be set to something, or compose
refuses to start. Switch to the real name later — see
[Changing the domain](#changing-the-domain).

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker builder prune -af                         # the build peaks ~2 GB above steady state (Caddy's Go toolchain); prune at once
docker compose -f docker-compose.prod.yml ps     # wait for tutor-api healthy
```

The tutor image alone is ~2 GB. On a 19 GB root volume, free space went from
8 GB to ~4.5 GB after the first build and prune.

---

## Phase 6 — Seed, then the read-only role

**Capture the instructor passwords first.** `ensure_instructors()` runs on
every boot and prints a random password **once**, at account creation, for
`aj001`, `it66070126` and `it66070066`. Save them somewhere only you can read:

```bash
(umask 077; docker compose -f docker-compose.prod.yml logs --no-log-prefix partner-api \
  | grep "temporary password" > ~/its-sql-instructor-passwords.txt)
```

Missed them → `backend/scripts/reset_instructor_pw.py`. Do not set
`SEED_INSTRUCTOR_PW` to avoid this: when set, the plaintext is re-hashed and
echoed to the log on every single startup.

Then seed both databases:

```bash
docker compose -f docker-compose.prod.yml exec -T partner-api python -m app.seed
docker compose -f docker-compose.prod.yml exec -T tutor-api python -m backend.db.seed
```

First seeds course `06070999` (access code `ITSSQL2025`): 185 problems, 8
modules, 24 lessons. Second loads the BikeStores dataset into `production` and
`sales`, plus the tutor's own 24-problem CSV catalog.

> **The tutor seed alone does not make hints work.** See
> [Problem-ID mapping](#problem-id-mapping) below before Phase 7.

Now provision the read-only role. **Order matters:** the script grants on the
`production` and `sales` schemas, which only the tutor seed creates — run it
before the seed and it fails on `GRANT USAGE ON SCHEMA production`.

```bash
docker compose -f docker-compose.prod.yml exec -T tutor-postgres \
  psql -U tutor -d tutor_db -v ON_ERROR_STOP=1 < tutor/scripts/provision_student_ro.sql

# Set the real password over stdin — never edit it into the tracked script.
( . ./.env; printf "ALTER ROLE student_ro PASSWORD '%s';\n" "$STUDENT_RO_PASSWORD" ) | \
  docker compose -f docker-compose.prod.yml exec -T tutor-postgres \
  psql -U tutor -d tutor_db -v ON_ERROR_STOP=1
```

`provision_student_ro.sql` revokes everything on `public`, grants `SELECT` and
`USAGE` on `production` and `sales` only, and sets `ALTER DEFAULT PRIVILEGES` so
reseeds stay covered.

**This is the security boundary.** The allowlist in
[code_executor.py:38-41](tutor/backend/tools/code_executor.py#L38-L41) is a
regex; role privileges are what actually stop a `SELECT` that slips past it.
`POSTGRES_URL_EXEC` must never point at the owner role.

### Problem-ID mapping

The frontend grades in the browser and asks for hints by a **hard-coded
tutor problem id** — the `tutorProblemId` on each entry in
[problems.js](frontend/src/lib/problems.js), values 106–394. Those ids are a
snapshot of the autoincrement in whichever tutor database
`tutor/scripts/import_partner_problems.py` was run against (commit `aa08bb4`).

A fresh tutor seed produces ids 1–24. Every hint request then names a problem
that does not exist, and the tutor answers `hint_available: false` — no error,
the hint button simply never appears.

Fix it right after the two seeds, and again after **any** tutor reseed:

```bash
python3 scripts/pin_tutor_problem_ids.py --dry-run
python3 scripts/pin_tutor_problem_ids.py
```

[pin_tutor_problem_ids.py](scripts/pin_tutor_problem_ids.py) exports the
partner catalog from `app-postgres`, then runs the tutor's own importer with
each problem's id pinned to the `tutorProblemId` for its title. It refuses to
start if any title is unmapped or a target id is taken, and rolls back unless
all ids match. Idempotent.

**Check:** `Committed {'created': 185, …}; all 185 ids match problems.js`
(`'updated': 185` on a re-run).

One gold is expected to fail under `student_ro`: problem 180, *FINAL TEST MODULE
01*, is `SELECT * FROM users;` — a mock table that exists only in the
browser's DuckDB. Under the read-only role it cannot reach the tutor's real
`users` table, which is the isolation working. It is an EXAM entry, so its
hint panel is hidden in the UI anyway.

---

## Phase 7 — Verify

Work through all of these before telling anyone the new URL. With
`DOMAIN=localhost`, add `-k` to the `curl` calls.

```bash
# everything healthy, nothing restart-looping
docker compose -f docker-compose.prod.yml ps

# TLS and headers
curl -I https://$DOMAIN/                     # 200, Strict-Transport-Security present, no Server
curl -f https://$DOMAIN/api/health           # {"status":"ok","app":"ITS-SQL Platform"}
curl -I http://$DOMAIN/                      # 308 to https

# tutor is "ok", not "degraded" (degraded means Redis did not connect)
docker compose -f docker-compose.prod.yml exec tutor-api curl -sf localhost:8000/health

# nothing but Caddy is listening on the host
sudo ss -tlnp | grep -E ':(80|443|8000|8080|5432|6379)'
```

**The isolation test — do not skip it.** A pass here is the whole reason for two
Postgres containers. It runs inside `tutor-api` with the exact DSN the executor
uses, so it also proves the password works over the network. (Running `psql`
inside `tutor-postgres` against `localhost` would not: the image trusts
local connections without a password.)

```bash
docker compose -f docker-compose.prod.yml exec -T tutor-api python - <<'EOF'
import os, psycopg2
c = psycopg2.connect(os.environ["POSTGRES_URL_EXEC"]); c.autocommit = True
cur = c.cursor()
cur.execute("select current_user"); print("connected as:", cur.fetchone()[0])
cur.execute("select count(*) from sales.customers"); print("sales.customers:", cur.fetchone()[0])
for t in ("public.interaction_history", "public.users", "public.gold_standards"):
    try:
        cur.execute(f"select * from {t} limit 1"); print("FAIL — read", t)
    except psycopg2.errors.InsufficientPrivilege:
        print("denied:", t)
EOF
```

Expect `connected as: student_ro`, `sales.customers: 1445`, and `denied:` on all
three tables. Any `FAIL` line means stop.

**In a browser, on campus Wi-Fi or the campus VPN** (needs the real domain):

1. Sign up with a username and password, then sign in.
2. Enrol with `ITSSQL2025`.
3. Submit a **wrong** answer, confirm a hint appears. This is the
   `partner-api → tutor-api → Gemini` path that Render's cold start broke. It
   also depends on the [problem-ID mapping](#problem-id-mapping).
4. Submit a **correct** answer, confirm the verdict records.

---

## Phase 8 — Backups

Only the partner DB matters. The tutor DB is reseedable from
`SQL-Server-Sample-Database/` and `sql-problem/`, and Chroma rebuilds at boot —
but a reseed must also restore the [problem-ID mapping](#problem-id-mapping).

```bash
sudo mkdir -p /var/backups/its-sql && sudo chown $USER /var/backups/its-sql
chmod 700 /var/backups/its-sql      # dumps hold bcrypt hashes and emails
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
docker compose -f docker-compose.prod.yml exec -T app-postgres \
  psql -U its_sql -c "DROP DATABASE restore_test;"
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

### Changing the domain

`DOMAIN` is read in two places: Caddy's site address and `partner-api`'s
`FRONTEND_URL`. Change it in `.env`, then recreate both:

```bash
sed -i 's/^DOMAIN=.*/DOMAIN=itssql.site/' .env
docker compose -f docker-compose.prod.yml up -d caddy partner-api
docker compose -f docker-compose.prod.yml logs -f caddy   # watch for "certificate obtained successfully"
```

The new zone must be on Cloudflare with `CF_API_TOKEN` covering it, and
`dig +short <name>` must return `10.0.30.101`. Caddy retries with backoff, but
repeated failures count against Let's Encrypt's limits — check both first.

### Known failure modes

| Symptom | Cause | Fix |
|---|---|---|
| "Couldn't reach the AI Tutor" | `tutor-api` unhealthy, or `SERVICE_KEY` mismatch between the two services | `logs tutor-api`; confirm both read the same `SERVICE_KEY` |
| Tutor health says `"degraded"` | Redis did not connect. Not fatal — grading and hints still work | `restart tutor-redis` |
| Hints are generic and repetitive | `GOOGLE_API_KEY` missing or rejected; the pipeline falls back to rule-based hints rather than failing | Check the key, check VM outbound HTTPS |
| No hint button on any problem; `hint-request` returns `hint_available: false` | Tutor catalog ids do not match `tutorProblemId` in `problems.js` — typically after a tutor reseed | See [Problem-ID mapping](#problem-id-mapping) |
| Cert renewal fails | `CF_API_TOKEN` expired, revoked or rescoped; nameservers moved off Cloudflare; or the `caddy_data` volume was deleted | `logs caddy`; reissue the token; never delete `caddy_data` |
| Caddy exits with `module not registered: dns.providers.cloudflare` | Running stock `caddy:2-alpine` instead of the `caddy-build` stage | Rebuild: `build caddy` |
| Site loads nowhere off campus | Expected — the A record is a private IP | Use the campus VPN |
| Name does not resolve for one VPN user | Their home router's DNS-rebind protection drops private-IP answers | Point that machine at the VPN's DNS |
| Disk full | Docker build cache | `docker builder prune -af && docker image prune -af` |

### Unresolved

- **Domain renewal.** `itssql.site` expires 2027-09-27. Z.com lists `.site`
  at 50 THB/year; that is likely a first-year price, so check the renewal price
  well before then. The Z.com and Cloudflare accounts are personal — hand both
  to the successor named under Ownership, or the site loses its name and its
  certificate renewals.
- **Campus Wi-Fi not yet tested.** The campus VPN reaches `10.0.30.101:443`
  (2026-09-26). Student Wi-Fi may sit behind a different firewall; test with
  `Test-NetConnection 10.0.30.101 -Port 443` before announcing the URL.
- **Problem-ID mapping is a snapshot.** `problems.js` still hard-codes tutor
  ids; [pin_tutor_problem_ids.py](scripts/pin_tutor_problem_ids.py) makes the
  tutor match them rather than removing the coupling. A new partner problem needs
  a hand-picked unused `tutorProblemId` (above 394) in `problems.js` before the
  script will import it.
- **Tutor image is ~2 GB**, mostly `ragas`, `datasets` and `pytest`, which
  are evaluation and test tooling in `tutor/backend/requirements.txt`. What
  they pull in (`pyarrow`, `pandas`, `scipy`, `sknetwork`) is ~400 MB of the
  image's 1.36 GB of site-packages; a dev-only requirements file would reclaim
  most of that.
- **Ownership.** Nobody is named as maintainer after the current author
  graduates. That is the strongest standing argument for going back to a managed
  stack, and this runbook does not solve it. Name a successor and walk them
  through Phase 7.
