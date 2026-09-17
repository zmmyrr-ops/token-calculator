#!/usr/bin/env bash
set -euo pipefail
app_env=${1:?environment required}
read -r operation release extra <<< "${SSH_ORIGINAL_COMMAND:-}"
[[ "$app_env" == staging || "$app_env" == production ]] || exit 2
[[ "$release" =~ ^[a-f0-9]{40}$ && -z "${extra:-}" ]] || exit 2
case "$operation" in
  load)
    # Uploads only enter the Docker image store; no shell or arbitrary paths.
    [[ "$app_env" == staging ]] || exit 2
    exec 8>/opt/mendao/deploy.lock
    flock -w 600 8
    rm -f "/opt/mendao/verified/$release"
    docker load
    docker image inspect "mendao-backend:$release" "mendao-frontend:$release" >/dev/null
    ;;
  deploy) exec /opt/mendao/deploy.sh "$app_env" "$release" ;;
  *) echo 'Only load/deploy with a commit SHA are allowed' >&2; exit 2 ;;
esac
