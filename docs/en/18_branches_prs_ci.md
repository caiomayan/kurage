# Branches, pull requests, and CI/CD

## Current decision

Development and manual testing use the local frontend, API, PostgreSQL, and Redis.
There is one published web environment, connected to `main`. No remote staging
environment or database branching is provisioned at this stage.

| Branch | Purpose | Automatic deployment |
| --- | --- | --- |
| `main` | Published version | OCI backend and Vercel frontend |
| `dev` | Integration before release | None |
| Temporary `feat/*`, `fix/*`, `codex/*`, etc. | One focused change | None |

The integration branch is named `dev`, not `develop`. Git branches separate code,
not databases. Merging does not upload ignored `.env` files or local data. New
migrations do ship with the code and may modify the production database during
deployment; review them carefully.

## Pull requests explained

A pull request (PR) proposes incorporating changes from one branch into another.
Opening one does not merge changes or publish the site.

- **Compare/head:** source branch containing the changes.
- **Base:** destination branch receiving them.
- **Files changed:** the diff to review.
- **Checks:** automated validation results.
- **Draft:** work in progress; tests run, but merging requires marking it ready.
- **Merge:** incorporates the changes into the destination.
- **Close:** closes the proposal without incorporating it.

Further pushes to the same source branch automatically update the existing PR.
Do not open a new PR for every correction to the same change.

## Triggers and isolation

Frontend quality, Backend CI/CD, and Secret scan run on pushes to any branch
(including names containing `/`), PRs targeting `dev` or `main`, and manual
dispatch. Tag pushes do not trigger them. Resolve conflicting PRs before GitHub
can execute their merge validation.

These three workflows have no path filters: even documentation changes run all
checks. This costs more minutes but prevents required checks from staying pending
because a directory filter skipped the workflow.

- `quality`: locked installation, ESLint, frontend tests, and production build.
- `test`: unit tests and integration against real Testcontainers PostgreSQL/Redis.
- `gitleaks`: secret scanning through the security workflow.

CI build URLs point to localhost, not the published application. Tests do not
receive `BACKEND_ENV_FILE`, SSH keys, or production credentials. Integration
containers are disposable and do not access OCI data. These checks are not an
E2E Steam login test or CS2 server validation.

Push validates a branch commit; PR validates its provisional merge with the base.
Both can run for the same work because they validate different states. New commits
cancel obsolete checks for the same event/branch or PR. Backend cancellation is
scoped to its test job, never to an already-running publication/deployment.

Backend image publication and deployment require `main` and successful backend
tests; deployment also requires `BACKEND_DEPLOY_ENABLED=true`. Infrastructure
remains manually triggered. Any `main` change, including docs, can publish.

`frontend/vercel.json` permits automatic Git deployments only from `main`; its
`**` pattern also covers branches such as `feat/new-inventory`. Keep Vercel's
**Production Branch = main** and **Root Directory = frontend**. `dev` and working
branches do not create automatic previews. This does not delete existing
deployments or restrict manual CLI/dashboard deployment.

Vercel's pipeline is independent: it does not wait for GitHub Actions after a
`main` push. The shared release barrier is requiring checks on PRs **before
merging**. Backend publication also does not depend on the other two workflows
after a push. Without branch protection, direct pushes can bypass this barrier.

## Initial activation

`dev` starts from the changes prepared on `codex/ci-dev`, including workflows,
disabled previews, and Dependabot organization. The temporary branch does not
need a separate merge: the first **dev → main** PR carries the whole change.
Review the diff and wait for all three checks before using **Create a merge
commit**. That merge can deploy the site and activates the Dependabot policy,
which must live on the default branch. Publishing `dev` alone does not change `main`.

After initial creation, with a clean working tree:

```powershell
git switch dev
git pull --ff-only origin dev
```

Do not recreate `dev` or force its history. Existing branches must receive this
configuration before their behavior changes.

## Everyday change workflow

After committing outstanding changes and publishing `dev`:

```powershell
git switch dev
git pull --ff-only origin dev
git switch -c feat/new-inventory
```

Implement and test the frontend/API locally, then review what will be uploaded:

```powershell
git status
git diff
git add path/to/file
git diff --cached
git commit -m "feat: improve inventory"
git push -u origin feat/new-inventory
```

Replace `path/to/file` with the intended files. Never stage secrets. Pushing saves
code to GitHub and triggers CI, but does not deploy this branch.

In **Pull requests → New pull request**:

1. Select **base dev**, **compare feat/new-inventory**.
2. Describe the change, tests, and impacts using the PR template.
3. Wait for checks on the latest commit. Fix code failures with another commit
   and push to the same branch. Rerun transient failures, not persistent bugs.
4. Review **Files changed** and use **Squash and merge** for temporary branches.
5. After merging, delete the temporary branch if desired, never `dev` or `main`.

Merging into `dev` runs CI again without deployment. Test the integrated result
locally before releasing it.

## Releasing

1. Open **base main**, **compare dev**.
2. Review the full release, migrations, and new variables; wait for all checks.
3. Use **Create a merge commit**, not squash/rebase, between permanent branches.
4. Monitor **Actions → Backend CI/CD** and the Vercel production deployment.
5. Smoke-test the published site. Investigate the failing job/log rather than
   force-pushing or deleting data volumes.
6. If commits need synchronizing, open **base dev**, **compare main**, and merge
   with a merge commit to keep both histories aligned.

An urgent hotfix can branch from `main` into `fix/*`, go through a PR to `main`,
then be incorporated into `dev`. Otherwise use the normal integration flow.

## GitHub dashboard protections

Once checks have appeared, configure rules for `main` and `dev` under
**Settings → Rules → Rulesets**, or **Branches**, depending on the available UI:

- require pull requests;
- require `quality`, `test`, and `gitleaks`, selecting the GitHub Actions jobs;
- require branches to be up to date before merging;
- block force pushes and deletion of permanent branches;
- require conversation resolution;
- do not require linear history, since `dev → main` uses merge commits.

With one maintainer, do not require another person's approval for every PR: the
author cannot approve their own PR. Reviewing diffs and passing checks still
matter. Do not require the Vercel/OCI deployment check on PRs, because deployment
is disabled outside `main`.

Enforcement for private repositories depends on the GitHub plan. If unavailable,
CI still runs, but merges/direct pushes are not technically blocked. Follow the
process manually; do not make the repository public to work around this limit.
The agent did not change dashboard protections or Vercel project settings.

## Dependabot: a small, reviewed queue

`.github/dependabot.yml` checks npm, Maven, and GitHub Actions weekly on Mondays
at 10:00 in `America/Fortaleza` (a scheduled time, not an exact execution guarantee).
Minor/patch updates are grouped by ecosystem; majors remain individual. Each
ecosystem permits two open version-update PRs, not two per week. Security PRs
are grouped separately and do not count toward this limit. No auto-merge is enabled.

The ESLint major-version exclusion remains until plugin compatibility is verified.
Minor/patch groups also require review and CI: version numbers do not guarantee
regression-free updates.

Routine updates use `target-branch: dev`. Each ecosystem has a second entry
without `target-branch`, with a zero version-PR limit and a security group,
retaining security fixes on the default branch (`main`) without duplicate routine
PRs there. A zero version limit does not disable security alerts or security PRs.
Dependabot reads configuration from the default branch: while these changes
exist only on `dev`, the old `main` policy still applies. After merging a security
fix into `main`, synchronize it back to `dev`.

A PR "reset" closes PRs without merging, then removes the corresponding bot
branches. It neither erases PR history nor changes installed versions. Do not
dismiss security alerts just to clear the list. Closing an individual PR may
stop Dependabot offering that version; automatic recreation is not guaranteed.
After publishing the new policy, visit **Insights → Dependency graph → Dependabot**
and request an update check for each ecosystem. If a needed update does not
return, inspect the closed PR: restore its branch/reopen it or use supported
Dependabot commands, without ignoring outstanding vulnerabilities.

## References

- [Workflow triggers and pending checks caused by filters](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Branch protection and plan availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Vercel Git deployment controls](https://vercel.com/docs/project-configuration/git-configuration)
- [Dependabot configuration options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- [Dependabot PR commands](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-pull-request-comment-commands)
