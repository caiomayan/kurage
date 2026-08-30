# Alpha deployment — Vercel, Cloudflare, and Oracle Cloud

**Status:** configuration implemented, not yet applied to external accounts.  
**Documentation last validated:** 29 August 2026.

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
- During bootstrap, leave the repository variable `BACKEND_DEPLOY_ENABLED`
  unset or `false`: tests and publication continue, but deployment is skipped.
  Set it to `true` only after the VM, DNS and secrets are ready, then use
  **Backend CI/CD → Run workflow → main** for the first deployment.
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
