# Kurage deployment terrain

Last updated: 2026-08-30. Status: **OCI infrastructure provisioned and bootstrap
confirmed by the operator; first web deployment still pending**.

This directory prepares the alpha topology chosen for Kurage:

```text
Browser
  ├─ kurage.caiomayan.com ──> Vercel ──> Next.js frontend
  └─ api.caiomayan.com ─────> Cloudflare ──> Caddy ──> Spring Boot
                                                   ├─ PostgreSQL
                                                   └─ Redis
```

The backend services run on one OCI `VM.Standard.A1.Flex` instance with 2 OCPUs
and 6 GB of RAM. The application image is multi-architecture and the deployment
contract is plain Docker Compose, so a later move to another ARM64 or AMD64 VPS
does not require changing the application packaging.

## What is automated

- `infra/terraform/oci`: VCN, subnet, route, NSG, reserved public IP and Ubuntu
  24.04 ARM64 instance.
- `cloud-init.yaml.tftpl`: Docker, Compose v2, firewall, SSH hardening,
  unattended upgrades, log rotation, fail2ban and 2 GB swap.
- `.github/workflows/infrastructure-oci.yml`: reviewed Terraform plan/apply with
  remote state in OCI Object Storage.
- `.github/workflows/backend-integration.yml`: real integration tests, immutable
  multi-architecture image in GHCR, SSH deployment, health gate and rollback.
- `infra/deploy/deploy-backend.sh`: provider-neutral Compose deployment.

Terraform intentionally does not manage Cloudflare or Vercel. This avoids
putting broad third-party API tokens in the infrastructure job and keeps the
temporary `caiomayan.com` setup easy to replace with the final Kurage domain.

## One-time OCI preparation

1. Create a dedicated OCI compartment and an IAM user/group with only the
   permissions needed for Compute, Networking and Object Storage in that
   compartment. For a group named `kurage-terraform` in the Default identity
   domain and a compartment named `kurage-alpha`, create this tenancy-level
   policy:

   ```text
   Allow group 'Default'/'kurage-terraform' to manage all-resources in compartment kurage-alpha
   Allow group 'Default'/'kurage-terraform' to inspect compartments in tenancy
   Allow group 'Default'/'kurage-terraform' to read objectstorage-namespaces in tenancy
   ```

   `inspect compartments` is the OCI permission that covers listing availability
   domains; `availability-domains` is not itself a valid policy resource type.
2. Generate an OCI API signing key for that user.
3. Create a private Object Storage bucket for Terraform state, enable object
   versioning, and do not create a public access or pre-authenticated request.
   Terraform 1.12+ uses the native OCI backend and state locking.
4. Generate a dedicated Ed25519 deployment key:

   ```bash
   ssh-keygen -t ed25519 -a 100 -f kurage_oci_deploy -C kurage-github-actions
   ```

5. Determine the narrow public CIDR that may administer the host. A dynamic home
   IP can be updated before the next Terraform apply; never put `0.0.0.0/0` in
   `SSH_ALLOWED_CIDR`.

The compartment, narrow IAM policy/API key and state bucket are bootstrap
prerequisites because Terraform cannot create or authorize the backend in which
it must save that same operation. Everything inside the application compartment
after that bootstrap is managed by this Terraform stack.

## GitHub environments

Create the following environments in the private repository. Store the listed
values as environment secrets/variables when the GitHub plan supports them; on
GitHub Free for a private repository, use repository-level Actions
secrets/variables with the same names. The workflows resolve either scope.

### `alpha-infrastructure`

Secrets:

- `OCI_TENANCY_OCID`
- `OCI_USER_OCID`
- `OCI_COMPARTMENT_OCID`
- `OCI_FINGERPRINT`
- `OCI_API_PRIVATE_KEY` — complete PEM contents
- `DEPLOY_SSH_PUBLIC_KEY` — one-line `.pub` contents

Variables:

- `OCI_REGION`, initially `sa-saopaulo-1`
- `SSH_ALLOWED_CIDR`, for example `203.0.113.10/32`
- `OCI_AVAILABILITY_DOMAIN_INDEX`, initially `0`
- `ALLOW_GITHUB_HOSTED_SSH_DEPLOY`, initially `true`
- `TF_STATE_BUCKET`
- `TF_STATE_NAMESPACE`

Run **OCI infrastructure** with `plan` first. Inspect it, then run `apply`.
`destroy` is deliberately absent from CI. If Ampere capacity is unavailable,
change `OCI_AVAILABILITY_DOMAIN_INDEX` before retrying; do not silently switch to
a paid shape.

### `alpha-backend`

Secrets:

- `DEPLOY_SSH_PRIVATE_KEY` — private half of the dedicated deployment key
- `DEPLOY_SSH_KNOWN_HOSTS` — verified host-key record, never an unchecked
  `StrictHostKeyChecking=no` bypass
- `BACKEND_ENV_FILE` — complete production environment based on
  `backend/.env.production.example`

Variables:

- `OCI_HOST` — reserved IP printed by Terraform
- `API_HEALTH_URL` — `https://api.caiomayan.com/actuator/health`

Repository-level Actions variable (not environment-level):

- `BACKEND_DEPLOY_ENABLED` — leave unset or `false` during bootstrap. Only set
  `true` after the VM, verified SSH host key, production secrets and DNS are ready.
  This variable is evaluated before the deployment job starts. Tests and image
  publication continue while deployment is disabled; the SSH job is skipped.

After the first apply, connect once and compare the host's Ed25519 fingerprint
through an independent OCI console session. Store the verified `known_hosts` line in
`DEPLOY_SSH_KNOWN_HOSTS`. Protect both environments with branch restrictions and,
where the GitHub plan permits it, a required reviewer.

## Initial web-only alpha

The production template defaults to `GAME_SERVER_BOOTSTRAP_ENABLED=false` and
an empty `FIXED_SERVER_HOSTNAME`. This allows the web stack to start before a
public CS2 host exists. The migration-created Retake registration remains
offline without valid heartbeats; bootstrap being disabled does not delete
records or disable the plugin API. Keep a unique production `GAME_SERVER_API_KEY`
even in this phase, and keep the notebook plugin connected to the local backend.
Leave Vercel's `NEXT_PUBLIC_CS2_CONNECT_HOST` empty or unset.

When the public Retake is ready, set its real hostname and port, enable bootstrap,
and redeploy the backend. Configure the plugin with the production API URL,
matching server ID and production key. Set Vercel's connect host to the real
`host:port` and redeploy the frontend. Do not change applied migrations or reuse
the notebook's credentials.

## DNS and TLS order

1. In Vercel, import the GitHub repository and set **Root Directory** to
   `frontend`. Keep `main` as the production branch.
2. Add `kurage.caiomayan.com` to the Vercel project. Vercel now gives each
   project an exact CNAME target; use the value shown in its Domains screen.
3. In Cloudflare DNS, create that `kurage` CNAME as **DNS only**. Vercel owns the
   frontend certificate and edge.
4. Create `api` as an A record pointing to Terraform's reserved OCI IP and turn
   the Cloudflare proxy **on**.
5. Set Cloudflare SSL/TLS mode to **Full (strict)**. Caddy obtains and renews the
   origin certificate for `api.caiomayan.com`.
6. Only after DNS is active and the backend secrets are configured, set the
   repository variable `BACKEND_DEPLOY_ENABLED=true`. In Actions, select
   **Backend CI/CD → Run workflow → main** to run tests, publish and deploy.

The OCI NSG only accepts web traffic from the published Cloudflare IPv4 ranges.
If Cloudflare adds a range, update both `infra/terraform/oci/main.tf` and
`backend/Caddyfile`, review the plan, and apply it before that range becomes
active. SSH remains direct to the reserved IP and restricted to
`SSH_ALLOWED_CIDR` when private deployment transport is selected.

The current automatic deploy uses GitHub-hosted runners, whose outbound IPs are
dynamic. Consequently, `allow_github_hosted_ssh_deploy` defaults to `true` and
port 22 is network-reachable while still enforcing Ed25519 keys, disabled root
and password login, fail2ban, and a dedicated unprivileged account. This is an
explicit alpha tradeoff. The recommended hardening step is an outbound-only
Cloudflare/Tailscale tunnel or a private self-hosted runner; then set the variable
to `false` so only `SSH_ALLOWED_CIDR` remains accepted.

## Vercel environment

Copy `frontend/.env.production.example` into Vercel's Production variables. The
minimum required values are:

```dotenv
NEXT_PUBLIC_APP_URL=https://kurage.caiomayan.com
NEXT_PUBLIC_API_URL=https://api.caiomayan.com
```

Do not allow `*.vercel.app` in credentialed CORS. Authenticated Preview
deployments should use one stable preview hostname that is explicitly added to
`FRONTEND_ADDITIONAL_ORIGINS`; otherwise previews remain build/visual-only.

## Release and rollback behavior

A push to `main` runs the backend tests first. Only a passing revision is built
for `linux/arm64` and `linux/amd64`, published to GHCR and addressed by digest.
Manual runs on `main` follow the same test and publication gates. Deployment is
opt-in via `BACKEND_DEPLOY_ENABLED` and validates required settings before SSH.
The deploy job transfers Compose/Caddy files, installs the environment file with
mode `0600`, logs in to GHCR with the short-lived workflow token and starts the
new digest. If the Spring healthcheck does not become healthy, the previous
image and configuration are restored automatically.

This protects application releases, not data. Before inviting real users,
configure an encrypted off-host PostgreSQL backup, execute a real restore and
record its RPO/RTO. A Docker volume on the same OCI boot disk is not a disaster
recovery strategy.

## Moving away from Oracle

Provision Ubuntu 24.04 on the replacement VPS, run the equivalent bootstrap,
copy `/opt/kurage/backend/.env`, restore PostgreSQL, point `OCI_HOST` (rename the
variable in a later cleanup if desired) to the new host, and update the Cloudflare
A record. GHCR, Compose, Caddy, domains and the application image remain the
same. Only `infra/terraform/oci` is provider-specific.
