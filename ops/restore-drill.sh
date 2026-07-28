#!/usr/bin/env bash
# Prove a dump restores: fresh scratch Postgres, pg_restore, print row counts.
# Usage: ./restore-drill.sh /path/to/cruxdb-YYYY-MM-DD.dump
set -euo pipefail
DUMP="${1:?usage: restore-drill.sh <dumpfile>}"

docker rm -f crux-restore-drill 2>/dev/null || true
docker run -d --name crux-restore-drill -e POSTGRES_PASSWORD=drill postgres:17.4
trap 'docker rm -f crux-restore-drill > /dev/null' EXIT

until docker exec crux-restore-drill pg_isready -U postgres -q; do sleep 1; done

docker cp "$DUMP" crux-restore-drill:/restore.dump
docker exec crux-restore-drill pg_restore -U postgres --create -d postgres /restore.dump

echo "── row counts ──"
docker exec crux-restore-drill psql -U postgres -d cruxdb -Atc \
  "SELECT 'users '||COUNT(*) FROM users
   UNION ALL SELECT 'motions '||COUNT(*) FROM motions
   UNION ALL SELECT 'arguments '||COUNT(*) FROM arguments;"
echo "restore drill PASSED"
