# Alpha deployment — Vercel, Cloudflare, and Oracle Cloud

**Status:** first web-only deployment complete; Vercel frontend and OCI backend
are operational in the alpha topology. No public CS2 server exists yet.

**Documentation/HTTP last validated:** 31 August 2026.

On 31 August, `https://kurage.caiomayan.com` and
`https://api.caiomayan.com/actuator/health` returned HTTP 200. The operator also
confirmed sessions, inventory, and avatar in the deployed environment. This
validates the web deployment, not the public-launch or billing gate.

## Adopted decision

The frontend is deployed by Vercel from the repository's `frontend` directory
and served at `kurage.caiomayan.com`. The backend, PostgreSQL, Redis, and Caddy
run on a 2 OCPU, 6 GB OCI Ampere A1 instance and are served at
`api.caiomayan.com` through Cloudflare.

This is a stable-alpha topology, not the final scale architecture. The modular
monolith and its data fit on this host, initial cost is low, and the deployment
contract remains portable. PostgreSQL and Redis are never exposed publicly.

## Operational boundaries

- Vercel owns frontend builds, CDN, TLS, and runtime.
- Cloudflare owns DNS, edge protection, proxying, and the API's first TLS hop.
- OCI owns the backend host, network, reserved IP, and Docker volumes.
- Caddy owns origin TLS and the internal reverse proxy to Spring Boot.
- GitHub Actions owns tests, GHCR images, Terraform, and releases.
- Terraform manages OCI resources only, not Vercel or Cloudflare.

The executable runbook, secret inventory, and exact first-deployment order are
documented in [`infra/README.md`](../../infra/README.md).

## Web-only initial deployment

CS2 remains on the developer's notebook, connected exclusively to the local
backend. In the deployed environment, keep `GAME_SERVER_BOOTSTRAP_ENABLED=false`
and `FIXED_SERVER_HOSTNAME=` empty. In Vercel, leave
`NEXT_PUBLIC_CS2_CONNECT_HOST` empty or unset. Do not advertise a fictional
endpoint or the notebook's IP as a public game server.

Migrations retain the initial Retake #1 registration, offline without valid
heartbeats. Disabling bootstrap neither deletes that record nor disables the
plugin API: it only skips public endpoint reconciliation. `GAME_SERVER_API_KEY`
remains mandatory and must be production-specific, different from the local
secret. Local configuration does not need to change.

Once the public Retake is ready, provide its real hostname/IP and port, enable
bootstrap, and redeploy the backend. Configure the plugin with the production
API URL, matching server identifier, and production key. Also set
`NEXT_PUBLIC_CS2_CONNECT_HOST` to `host:port` and redeploy the frontend.
Availability will depend on real heartbeats.

## Deliberate security properties

- SSH rejects passwords and root and uses a dedicated key. While deployment uses
  GitHub-hosted runners with dynamic IPs, port 22 remains reachable; the next
  hardening step is a private runner/tunnel followed by CIDR restriction.
- Origin HTTP/HTTPS only accepts the official Cloudflare IPv4 ranges.
- Images are published for ARM64 and AMD64 and deployed by digest rather than a
  mutable tag.
- Secrets do not enter the image, Terraform source, committed Compose files, or
  build artifacts.
- The short-lived GHCR token is removed from the host after deployment.
- Deployment only follows tests against real PostgreSQL and Redis containers.
- The first deployment has completed with `BACKEND_DEPLOY_ENABLED=true`. For
  future changes, retain that value only while the topology remains ready; use
  **Backend CI/CD → Run workflow → main** for a controlled manual redeploy.
- An unhealthy release automatically restores the previous configuration and
  image.

## Remaining production gates

Deployment groundwork does not waive the audit gates. An encrypted off-host
PostgreSQL backup, a real restore exercise, Steam E2E smoke test, Retake server
validation, external monitoring, and published legal copy remain mandatory. The
single instance is also an accepted single point of failure for this alpha.

## Future provider migration

OCI dependence is isolated under `infra/terraform/oci`. The application uses a
standard OCI image, Docker Compose, and Caddy. A migration replaces VPS
provisioning while retaining the domain contract, image pipeline, and runtime
contract. Data moves through a controlled backup and restore.
