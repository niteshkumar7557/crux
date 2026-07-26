#!/usr/bin/env bash
# The one deploy command. Backup first: every deploy starts with a restore point.
set -euo pipefail
cd "$(dirname "$0")/.."

./ops/backup.sh

git pull --ff-only
echo "$(date -Is) $(git rev-parse HEAD)" >> ops/deploy.log

docker compose build
docker compose up -d

echo "── waiting for backend health ──"
for i in $(seq 1 30); do
  status=$(docker inspect -f '{{.State.Health.Status}}' crux-backend 2>/dev/null || echo starting)
  [ "$status" = "healthy" ] && break
  sleep 5
done
[ "$status" = "healthy" ] || { echo "backend NOT healthy — check logs:"; docker compose logs --tail 50 backend; exit 1; }

docker compose ps
docker compose logs --tail 20 backend
echo "deployed $(git rev-parse --short HEAD)"
