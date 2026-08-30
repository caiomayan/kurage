#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 1 || "$1" != ghcr.io/*@sha256:* ]]; then
  echo "usage: deploy-backend.sh ghcr.io/owner/repository/backend@sha256:<digest>" >&2
  exit 64
fi

readonly image="$1"
readonly app_dir="${KURAGE_APP_DIR:-/opt/kurage/backend}"
readonly incoming_dir="${app_dir}/incoming"
readonly env_file="${app_dir}/.env"
readonly compose_file="${app_dir}/docker-compose.yml"
readonly caddy_file="${app_dir}/Caddyfile"
readonly release_file="${app_dir}/.release.env"
readonly compose_project="kurage"

for required in "${incoming_dir}/backend.env" "${incoming_dir}/docker-compose.yml" "${incoming_dir}/Caddyfile"; do
  if [[ ! -f "${required}" ]]; then
    echo "required deployment file is missing: ${required}" >&2
    exit 66
  fi
done

cd "${app_dir}"
umask 077

work_dir="$(mktemp -d "${app_dir}/.deploy.XXXXXX")"
cleanup() {
  rm -f -- \
    "${work_dir}/docker-compose.yml.previous" \
    "${work_dir}/Caddyfile.previous" \
    "${work_dir}/backend.env.previous" \
    "${work_dir}/release.env.previous"
  rmdir -- "${work_dir}" 2>/dev/null || true
}
trap cleanup EXIT

[[ -f "${compose_file}" ]] && cp "${compose_file}" "${work_dir}/docker-compose.yml.previous"
[[ -f "${caddy_file}" ]] && cp "${caddy_file}" "${work_dir}/Caddyfile.previous"
[[ -f "${env_file}" ]] && cp "${env_file}" "${work_dir}/backend.env.previous"
[[ -f "${release_file}" ]] && cp "${release_file}" "${work_dir}/release.env.previous"

install -m 0600 "${incoming_dir}/backend.env" "${env_file}"
install -m 0640 "${incoming_dir}/docker-compose.yml" "${compose_file}"
install -m 0640 "${incoming_dir}/Caddyfile" "${caddy_file}"
printf 'KURAGE_API_IMAGE=%s\n' "${image}" > "${release_file}.next"
chmod 0600 "${release_file}.next"
mv "${release_file}.next" "${release_file}"

compose=(docker compose --project-name "${compose_project}" --env-file "${env_file}" --env-file "${release_file}" -f "${compose_file}")

rollback() {
  echo "Deployment failed; restoring the last known configuration and image." >&2
  [[ -f "${work_dir}/docker-compose.yml.previous" ]] && cp "${work_dir}/docker-compose.yml.previous" "${compose_file}"
  [[ -f "${work_dir}/Caddyfile.previous" ]] && cp "${work_dir}/Caddyfile.previous" "${caddy_file}"

  if [[ -f "${work_dir}/backend.env.previous" ]]; then
    cp "${work_dir}/backend.env.previous" "${env_file}"
  else
    rm -f -- "${env_file}"
  fi

  if [[ -f "${work_dir}/release.env.previous" ]]; then
    cp "${work_dir}/release.env.previous" "${release_file}"
    docker compose --project-name "${compose_project}" --env-file "${env_file}" --env-file "${release_file}" -f "${compose_file}" up -d --remove-orphans || true
  fi
}

if ! "${compose[@]}" config --quiet; then
  rollback
  exit 1
fi

if ! "${compose[@]}" pull api; then
  rollback
  exit 1
fi

if ! "${compose[@]}" up -d --remove-orphans; then
  rollback
  exit 1
fi

healthy=false
for _ in $(seq 1 36); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' kurage_api 2>/dev/null || true)"
  if [[ "${status}" == "healthy" ]]; then
    healthy=true
    break
  fi
  if [[ "${status}" == "unhealthy" || "${status}" == "exited" || "${status}" == "dead" ]]; then
    break
  fi
  sleep 5
done

if [[ "${healthy}" != "true" ]]; then
  "${compose[@]}" logs --tail=120 api >&2 || true
  rollback
  exit 1
fi

rm -f "${incoming_dir}/backend.env" "${incoming_dir}/docker-compose.yml" "${incoming_dir}/Caddyfile"
echo "Kurage backend is healthy on ${image}."
