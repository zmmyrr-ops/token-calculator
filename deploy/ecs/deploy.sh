#!/usr/bin/env bash
set -euo pipefail
app_env=${1:?environment required}
release=${2:?release required}
[[ "$app_env" == production || "$app_env" == staging ]] || exit 2
[[ "$release" =~ ^[a-f0-9]{40}$ ]] || exit 2
root=/opt/mendao
exec 9>"$root/deploy.lock"
flock -w 600 9
# Production promotes only a version that passed staging on this server.
if [[ "$app_env" == production ]]; then test -f "$root/verified/$release"; fi
docker image inspect "mendao-backend:$release" "mendao-frontend:$release" > /dev/null
port=3100; [[ "$app_env" == staging ]] && port=3101
config="$root/$app_env/release.env"
previous=""
if [[ -f "$config" ]]; then
  previous=$(sed -n 's/^RELEASE_ID=//p' "$config")
  "$root/backup.sh" "$app_env"
  cp "$config" "$config.previous"
fi
umask 077
cat > "$config" <<CONFIG
RELEASE_ID=$release
APP_ENV_FILE=$root/$app_env/app.env
STORAGE_DIR=$root/$app_env/storage
FRONTEND_PORT=$port
CONFIG
compose=(docker compose -p "mendao-$app_env" --env-file "$config" -f "$root/compose.yaml")
if "${compose[@]}" up -d --wait --wait-timeout 120 && curl -fsS "http://127.0.0.1:$port/api/health/ready" > /dev/null && curl -fsS "http://127.0.0.1:$port/" > /dev/null; then
  if [[ "$app_env" == staging ]]; then
    curl -fsS "http://127.0.0.1:$port/staging/api/health/ready" > /dev/null
    curl -fsS "http://127.0.0.1:$port/staging/" > /dev/null
    mkdir -p "$root/verified"
    touch "$root/verified/$release"
  fi
  printf '%s %s %s\n' "$(date -u +%FT%TZ)" "$app_env" "$release" >> "$root/deployments.log"
else
  if [[ -n "$previous" ]]; then
    cp "$config.previous" "$config"
    "${compose[@]}" up -d --wait --wait-timeout 120
  fi
  echo 'Deployment failed; prior application version restored when available. Database is not automatically restored.' >&2
  exit 1
fi
