#!/usr/bin/env bash
# Applies every migration to a throwaway local Postgres (with a small
# Supabase stand-in) and runs the database behaviour tests.
# Needs Postgres 15+ server binaries (initdb, pg_ctl) on the machine.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DATA="$(mktemp -d)"
PORT="${PGTEST_PORT:-55432}"
export PGHOST="$DATA" PGPORT="$PORT"

cleanup() { "$PG_BIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DATA"; }
trap cleanup EXIT

if [ "$(id -u)" = "0" ]; then
  echo "Run this as a non-root user (Postgres refuses to start as root)." >&2
  exit 1
fi

"$PG_BIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$DATA" -o "-k $DATA -p $PORT -c listen_addresses=''" -w start >/dev/null

PSQL=(psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres)
"${PSQL[@]}" -f "$ROOT/supabase/tests/supabase-stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
TESTS=(-f "$ROOT/supabase/tests/helpers.sql")
for f in "$ROOT"/supabase/tests/[0-9]*.sql; do TESTS+=(-f "$f"); done
# One session so the pg_temp helpers are shared across test files.
"${PSQL[@]}" -o /dev/null "${TESTS[@]}"
echo "All database tests passed"
