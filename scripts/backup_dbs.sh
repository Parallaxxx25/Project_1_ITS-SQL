#!/usr/bin/env bash
# Nightly dumps of both Postgres databases — run from cron, see DEPLOY_VM.md
# Phase 8.
#
#   daily/   one dump per database per night, kept DAILY_KEEP_DAYS
#   weekly/  Sunday's dumps, copied from daily/, kept WEEKLY_KEEP_DAYS
#
# Files directly under BACKUP_DIR (e.g. a hand-taken pre-deploy dump) are
# never pruned. A dump is written to .tmp and renamed only once pg_dump has
# succeeded, so a failed night leaves no file that looks like a backup.
set -uo pipefail

BACKUP_DIR=/var/backups/its-sql
COMPOSE_FILE=/srv/its-sql/docker-compose.prod.yml
DAILY_KEEP_DAYS=30
# Covers the term plus the thesis analysis window; matches the tutor's
# INTERACTION_RETENTION_DAYS (180) for interaction_history.
WEEKLY_KEEP_DAYS=180

umask 077  # dumps hold emails, bcrypt hashes and every student query
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"
today=$(date +%F)

dump() {  # <compose service> <db user> <db name>
  local out="$BACKUP_DIR/daily/$3-$today.sql.gz"
  if ! docker compose -f "$COMPOSE_FILE" exec -T "$1" pg_dump -U "$2" "$3" | gzip > "$out.tmp"; then
    rm -f "$out.tmp"
    echo "backup_dbs: pg_dump of $3 failed" >&2
    return 1
  fi
  mv "$out.tmp" "$out" || return 1
  if [ "$(date +%u)" = 7 ]; then
    cp -p "$out" "$BACKUP_DIR/weekly/" || return 1
  fi
}

status=0
dump app-postgres its_sql its_sql || status=1
# Not reseedable: interaction_history and student_progress are written at
# runtime. Only the problem catalog and BikeStores come back from a reseed.
dump tutor-postgres tutor tutor_db || status=1

find "$BACKUP_DIR/daily" -name '*.sql.gz' -mtime +"$DAILY_KEEP_DAYS" -delete
find "$BACKUP_DIR/weekly" -name '*.sql.gz' -mtime +"$WEEKLY_KEEP_DAYS" -delete

# One line per run, so backup.log tells "didn't run" apart from "ran fine".
echo "backup_dbs: $(date -Is) exit=$status"
exit "$status"
