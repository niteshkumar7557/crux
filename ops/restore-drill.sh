#!/usr/bin/env bash
# Prove a dump restores: fresh scratch Postgres, pg_restore, print row counts.
# A backup you have never restored is a belief, not a backup.
#
# Usage: ./restore-drill.sh /path/to/cruxdb-YYYY-MM-DD.dump
#
# Dumps are written nightly to R2 by .github/workflows/backup.yml. Fetch one:
#
#   rclone ls   r2:<bucket>/daily
#   rclone copy r2:<bucket>/daily/cruxdb-YYYY-MM-DD.dump .
#
# This runs entirely on your machine against a throwaway container — it never
# touches production, so it is safe to run any time, and is also the recovery
# procedure when the real database is gone.
set -euo pipefail
DUMP="${1:?usage: restore-drill.sh <dumpfile>}"

docker rm -f crux-restore-drill 2>/dev/null || true
# Must match (or exceed) the SERVER version the dump came from — pg_restore
# cannot read a custom-format dump produced by a newer Postgres. Keep this in
# step with the image used by .github/workflows/backup.yml.
docker run -d --name crux-restore-drill -e POSTGRES_PASSWORD=drill postgres:18
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
