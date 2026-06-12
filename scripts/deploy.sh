#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_SHA=${1:?Usage: deploy.sh <commit-sha>}
DEPLOY_ENV_FILE=${DEPLOY_ENV_FILE:-/etc/rscg/app.env}
DEPLOY_DATA_PATH=${DEPLOY_DATA_PATH:-/var/lib/rscg}
DEPLOY_HOST_IP=${DEPLOY_HOST_IP:-127.0.0.1}
DEPLOY_HOST_PORT=${DEPLOY_HOST_PORT:-3000}
APP_NAME=${APP_NAME:-rscg}
CONTAINER_NAME=${CONTAINER_NAME:-rscg}
ROLLBACK_CONTAINER_NAME=${ROLLBACK_CONTAINER_NAME:-rscg-rollback}
HEALTH_TIMEOUT_SECONDS=${HEALTH_TIMEOUT_SECONDS:-90}

SHORT_SHA=${DEPLOY_SHA:0:12}
IMAGE_NAME="${APP_NAME}:${SHORT_SHA}"

log() {
  printf '[deploy] %s\n' "$*"
}

container_exists() {
  docker container inspect "$1" >/dev/null 2>&1
}

remove_container_if_present() {
  if container_exists "$1"; then
    docker rm -f "$1" >/dev/null
  fi
}

restore_previous_container() {
  log "Restoring previous container"
  remove_container_if_present "$CONTAINER_NAME"

  if container_exists "$ROLLBACK_CONTAINER_NAME"; then
    docker rename "$ROLLBACK_CONTAINER_NAME" "$CONTAINER_NAME"
    docker start "$CONTAINER_NAME" >/dev/null
    log "Previous container restored"
  else
    log "No previous container was available to restore"
  fi

  docker image rm "$IMAGE_NAME" >/dev/null 2>&1 || true
}

wait_for_healthy_container() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  local status

  while ((SECONDS < deadline)); do
    status=$(docker inspect \
      --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "$CONTAINER_NAME" 2>/dev/null || true)

    case "$status" in
      healthy)
        return 0
        ;;
      exited | dead)
        return 1
        ;;
    esac

    sleep 2
  done

  return 1
}

if [[ "$DEPLOY_ENV_FILE" != /* ]]; then
  echo "DEPLOY_ENV_FILE must be an absolute path" >&2
  exit 1
fi
if [[ "$DEPLOY_DATA_PATH" != /* ]]; then
  echo "DEPLOY_DATA_PATH must be an absolute path" >&2
  exit 1
fi
if [[ ! -f "$DEPLOY_ENV_FILE" ]]; then
  echo "Environment file not found: $DEPLOY_ENV_FILE" >&2
  exit 1
fi

mkdir -p "$DEPLOY_DATA_PATH"

log "Building $IMAGE_NAME"
docker build \
  --pull \
  --label "org.opencontainers.image.revision=$DEPLOY_SHA" \
  --tag "$IMAGE_NAME" \
  .

remove_container_if_present "$ROLLBACK_CONTAINER_NAME"

if container_exists "$CONTAINER_NAME"; then
  log "Preparing current container for rollback"
  docker rename "$CONTAINER_NAME" "$ROLLBACK_CONTAINER_NAME"
  if ! docker stop --time 30 "$ROLLBACK_CONTAINER_NAME" >/dev/null; then
    docker rename "$ROLLBACK_CONTAINER_NAME" "$CONTAINER_NAME" || true
    echo "Failed to stop the current container" >&2
    exit 1
  fi
fi

log "Starting $CONTAINER_NAME from $IMAGE_NAME"
if ! docker run \
  --detach \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$DEPLOY_ENV_FILE" \
  --publish "${DEPLOY_HOST_IP}:${DEPLOY_HOST_PORT}:3000" \
  --volume "${DEPLOY_DATA_PATH}:/app/data" \
  --label "com.rscg.commit=$DEPLOY_SHA" \
  "$IMAGE_NAME" >/dev/null
then
  restore_previous_container
  exit 1
fi

if ! wait_for_healthy_container; then
  log "New container did not become healthy"
  docker logs --tail 200 "$CONTAINER_NAME" || true
  restore_previous_container
  exit 1
fi

log "New container is healthy"
remove_container_if_present "$ROLLBACK_CONTAINER_NAME"

while IFS= read -r old_image; do
  if [[ -n "$old_image" && "$old_image" != "$IMAGE_NAME" ]]; then
    docker image rm "$old_image" >/dev/null 2>&1 || true
  fi
done < <(docker image ls "$APP_NAME" --format '{{.Repository}}:{{.Tag}}')

docker image prune -f >/dev/null 2>&1 || true
log "Deployment completed for $DEPLOY_SHA"
