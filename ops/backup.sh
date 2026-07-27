#!/usr/bin/env bash
# Nightly: dump Postgres + avatars volume, rotate locally, mirror to R2,
# then ping the dead-man switch. Any failure skips the ping -> alert email.
set -euo pipefail
cd "$(dirname "$0")"
source ./.env.ops

STAMP=$(date +%F)
mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

# 1. Database — custom format (compressed, pg_restore-able)
docker exec crux-db pg_dump -U "$PG_USER" -Fc "$PG_DB" \
  > "$BACKUP_DIR/daily/cruxdb-$STAMP.dump"

# 2. Avatar uploads — a host bind mount, so tar it directly (mkdir guards the
#    first run before compose has created the dir; empty is a valid archive)
mkdir -p "$AVATAR_DIR"
tar czf "$BACKUP_DIR/daily/avatars-$STAMP.tar.gz" -C "$AVATAR_DIR" .

# 3. Sunday copies become weeklies
if [ "$(date +%u)" = "7" ]; then
  cp "$BACKUP_DIR/daily/cruxdb-$STAMP.dump" "$BACKUP_DIR/weekly/"
  cp "$BACKUP_DIR/daily/avatars-$STAMP.tar.gz" "$BACKUP_DIR/weekly/"
fi

# 4. Local rotation: 7 dailies, 4 weeklies
find "$BACKUP_DIR/daily"  -type f -mtime +7  -delete
find "$BACKUP_DIR/weekly" -type f -mtime +28 -delete

# 5. Offsite mirror + remote prune (~30 days)
rclone copy "$BACKUP_DIR/daily"  "$R2_REMOTE/daily"
rclone copy "$BACKUP_DIR/weekly" "$R2_REMOTE/weekly"
rclone delete --min-age 30d "$R2_REMOTE/daily"

# 6. Dead-man switch — reached only if everything above succeeded
[ -n "$HEALTHCHECK_URL" ] && curl -fsS -m 10 --retry 3 "$HEALTHCHECK_URL" > /dev/null
echo "backup ok $STAMP"
