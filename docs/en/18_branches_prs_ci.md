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

Changes were prepared on local branch `codex/ci-dev`. Local files do not configure
GitHub automatically. The agent did not push, create a PR, or deploy.

1. Review, commit, and push that branch, excluding real `.env` files.
2. Open an exceptional bootstrap PR: **base main**, **compare codex/ci-dev**.
3. Wait for all three checks, review the diff, and merge. This can deploy the site.
4. Create `dev` from the updated `main`, so it inherits the workflows and disabled
   Vercel previews immediately.

With a clean working tree, run these local commands one line at a time:

```powershell
git switch main
git pull --ff-only origin main
git switch -c dev
git push -u origin dev
```

Create `dev` only once. If it already exists, switch to it and update it instead;
never recreate or force its history. Existing branches must receive this
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

## References

- [Workflow triggers and pending checks caused by filters](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Branch protection and plan availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Vercel Git deployment controls](https://vercel.com/docs/project-configuration/git-configuration)
