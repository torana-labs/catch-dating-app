---
doc_id: infrastructure_as_code
version: 1.0.0
updated: 2026-10-30
owner: backend_platform
status: active
---

# Infrastructure As Code

Catch manages selected Firebase and Google Cloud settings with Terraform in
`infra/`. A change is a pull request: CI shows the plan, a reviewer approves,
and GitHub Actions applies the exact plan that was reviewed. Nobody applies
from a laptop, and no service-account key exists.

This is phase 1. It is deliberately narrow: it fixes phone sign-in and App
Check for Play-installed Android builds by registering the Play App Signing
certificate fingerprints. Play re-signs every installed build with a key
Google holds, and Firebase knew only the upload-key fingerprints.

## What is managed

One Terraform root module, `infra/firebase`, with one state, covers dev,
staging and prod.

| Resource | Apps | Managed fields |
|---|---|---|
| `google_firebase_android_app` (google-beta provider) | Consumer and Host in `catchdates-dev`, `catchdates-staging` and `catch-dating-app-64e51` | display name, package name, SHA-1 and SHA-256 certificate fingerprints |
| `google_firebase_app_check_play_integrity_config` (google provider) | The same six apps | adopted as is; `token_ttl` keeps its live value |

The inventory lives in `infra/firebase/terraform.tfvars`. Everything in it is
public: app IDs, which also ship in `firebase/<env>/**/google-services.json`,
and certificate fingerprints. Never put a secret there.

Guards, from first to last:

- Every resource is adopted with an `import` block, so adding an app to the
  inventory imports it and never creates one. An unknown app ID fails the
  plan.
- `lifecycle { prevent_destroy = true }` on every resource.
- A plan refuses to drop a fingerprint that is registered on the live app
  (preconditions read the live app through a data source). Retiring a signing
  key needs `allow_fingerprint_removal = true` in a reviewed PR.
- `infra/scripts/plan_guard.sh` fails any plan that would delete, replace or
  create a resource, or touch a resource type outside the phase 1 allowlist.
  This also covers a resource block deleted from the configuration, which
  takes its `prevent_destroy` with it.
- The committed inventory has blank display names and fingerprint lists until
  the live values are read (see [First adoption](#first-adoption)), and
  validation fails on blanks, so nothing can apply with incomplete lists.

Offline tests cover these guards: `infra/firebase/tests/guards.tftest.hcl`
(mock providers) and `infra/scripts/scripts.test.mjs`.

### What is deliberately not managed

- **App Check enforcement.** `google_firebase_app_check_service_config` exists
  for Firestore, Storage, Realtime Database and Authentication, but deleting
  that resource switches enforcement OFF. Phase 1 neither imports nor changes
  enforcement; it stays as documented in
  [`firebase/README.md`](../firebase/README.md). Callable Functions enforce
  App Check in code (`enforceAppCheck: true`); there is no service
  configuration to manage for them.
- **Play Integrity verdict settings.** Provider 8.7.0 manages only
  `token_ttl`. The API's `appIntegrity`, `accountDetails` and
  `deviceIntegrity` settings are not exposed, so Terraform neither reads nor
  changes them.
- **`deletion_policy`.** Setting it would put a state-only change into the
  first plan; the guards above already stop deletion.

## How to change it

1. Edit `infra/firebase` in a pull request. Keep each hash list in the order
   the Firebase API returns it and append new fingerprints at the end: the
   provider compares the lists in order, so reordering shows a diff.
2. **Infra Plan** (`.github/workflows/infra-plan.yml`) runs `terraform fmt
   -check`, `validate`, the offline tests and a live `plan` with the read-only
   identity, and writes the plan to the job summary. Read it in the PR.
3. Merge. **Infra Apply** (`.github/workflows/infra-apply.yml`) saves a plan
   from `main` and shows it in the run summary. When it has changes, the apply
   job waits in the `prod-platform` environment. A reviewer approves after
   reading that summary, and the job applies exactly that saved plan.
   Terraform refuses the saved plan if state changed after it was made; rerun
   Infra Apply from the Actions tab (`workflow_dispatch`) to plan again.
4. **Infra Drift** (`.github/workflows/infra-drift.yml`) plans nightly. A diff,
   for example a fingerprint added in the Firebase console, opens or updates
   the issue "[Infra drift] Live Firebase settings differ from infra/firebase";
   a clean plan closes it. Either commit the live value in a PR or run Infra
   Apply to restore the reviewed configuration.

Local use is offline only:

```sh
cd infra/firebase
terraform init -backend=false
terraform validate
terraform test
node --test ../scripts/scripts.test.mjs
```

The Terraform version is pinned in `tool/ci/toolchain.env`
(`TERRAFORM_VERSION`) and exactly in `versions.tf`. The workflows install the
toolchain version, so `terraform init` fails when the two differ. Provider versions are exact and locked in
`infra/firebase/.terraform.lock.hcl` for linux_amd64, darwin_arm64 and
darwin_amd64.

## Identities and roles

GitHub Actions signs in with Workload Identity Federation through a dedicated
OIDC provider, `github-platform`, in the existing `github-actions` pool of
project `574779808785`. The older `catch-dating-app` provider admits only
`main` jobs, so pull-request plans need their own. `github-platform` admits
only repository `1170579691` jobs in the `platform-plan` environment, or in
`prod-platform` on `refs/heads/main`; a job without an environment has no
environment claim and is rejected.

| Identity | Trusted by | Roles | Why |
|---|---|---|---|
| `github-actions-platform-plan@catch-dating-app-64e51` | `principalSet://…/attribute.repository_environment/1170579691:platform-plan` | Custom `catchPlatformPlanReader` in each of the three projects: `firebase.clients.get`, `firebase.clients.list`, `firebase.projects.get`, `firebaseappcheck.playIntegrityConfig.get` | Read the apps Terraform imports and their Play Integrity configs. `roles/firebase.viewer` was rejected: it includes Firestore data reads (`datastore.entities.get`), and pull-request jobs use this identity. |
| | | `roles/storage.objectViewer` on the state bucket only | Read state. Plans run with `-lock=false`, so this identity never writes the bucket. |
| `github-actions-platform-apply@catch-dating-app-64e51` | `principalSet://…/attribute.repository_environment/1170579691:prod-platform` | Custom `catchPlatformApplier` in each project: the reads above plus `firebase.clients.update` and `firebaseappcheck.playIntegrityConfig.update` | Update an existing app's fingerprints and its Play Integrity config. No `firebase.clients.create` or `delete`, and no `firebaseappcheck.services.update` (enforcement). The narrowest predefined role with `firebase.clients.update` is Firebase Admin. |
| | | `roles/storage.objectUser` on the state bucket only | Write state and take the state lock. No bucket IAM. |
| `github-actions-play-publisher@catch-dating-app-64e51` (existing) | `prod-mobile`, `prod-mobile-release` | Unchanged | The fingerprints workflow reads generated APKs with it. |

The `platform-plan` environment has no reviewers and allows every branch,
because pull requests plan in it; its identity is read-only. `prod-platform`
requires a reviewer, allows only `main` and forbids administrator bypass.
Both environments hold `GCP_WORKLOAD_IDENTITY_PROVIDER` and
`GCP_SERVICE_ACCOUNT_EMAIL`.

State lives in `gs://catch-dating-app-64e51-terraform-state` (asia-south1,
object versioning, uniform bucket-level access, public access prevention
enforced) under the prefix `firebase`.

## One-time bootstrap

The owner runs this once on a Mac, signed in to gcloud as an owner of all
three projects and to gh as a repository admin. The script is idempotent: it
reads before each step, only adds what is missing, creates no keys and changes
no Firebase setting.

```sh
gcloud auth login
gh auth login
git -C ~/catch-dating-app pull --ff-only
bash ~/catch-dating-app/infra/bootstrap/bootstrap.sh
```

It enables the APIs keyless sign-in needs, creates the state bucket, the two
service accounts, the custom roles and their bindings, the `github-platform`
provider, the plan identity's trust, both GitHub environments and their
variables. It binds the apply identity to `prod-platform` only after reading
back that the environment requires a reviewer, allows only `main` and forbids
administrator bypass. Without gh it prints the GitHub commands and stops before
that binding; run them, then rerun the script. `PLATFORM_REVIEWER=<login>`
names a reviewer other than the signed-in gh user.

## First adoption

The live display names and the fingerprints Firebase holds today are not in the
repository, so the first PR reads them:

1. Run **Firebase Android Fingerprints**
   (`.github/workflows/play-signing-fingerprints.yml`) from `main`:
   `gh workflow run play-signing-fingerprints.yml --ref main`. Its defaults are
   the Play internal-track version codes 100001 (Consumer) and 457902 (Host).
   - The first job runs in `prod-mobile` with the Play publisher identity. It
     calls the Android Publisher API `generatedapks.list`
     (`GET applications/<package>/generatedApks/<versionCode>`), downloads the
     universal APK Play signed, and reads the certificate with
     `keytool -printcert -jarfile`. Both apps set minSdk 26, so Play may sign
     with APK Signature Scheme v2/v3 only, which keytool cannot read; then
     `apksigner verify --print-certs` from the runner's Android SDK reads it.
     Either way the SHA-256 must equal Play's `certificateSha256Hash`.
   - The second job runs in `platform-plan` and lists each project's active
     Android apps through the Firebase Management API, in API order, then
     appends the Play fingerprints that are not registered yet.
   - The run summary shows the fingerprints and a complete
     `infra/firebase/terraform.tfvars`; the job log prints it too, and the run
     keeps it as an artifact.
2. Replace `infra/firebase/terraform.tfvars` with it in a PR. Infra Plan should
   show, for each of the six apps, an import of the Android app and of its Play
   Integrity config, and in-place updates only on `prod-consumer` and
   `prod-host`, each adding one SHA-1 and one SHA-256. Anything else means the
   inventory is wrong: stop and compare with the Firebase console.
3. Merge and approve the `prod-platform` deployment in Infra Apply.
4. Verify with a Play-installed build: phone sign-in succeeds and App Check
   requests are accepted (Firebase console, App Check metrics).

Until step 2 merges, live plans fail validation by design, and Infra Drift
reports the pending imports as drift.

If the Play publisher identity gets a 403 on `generatedApks`, its Play Console
invitation lacks access to the app bundle explorer downloads; add that
permission for the two apps in Play Console (Users and permissions).

## What stays elsewhere

- **Store side stays in fastlane** (`fastlane/Fastfile`, run by Mobile Beta and
  Mobile Production): builds, signing with the upload key, uploads, tracks,
  rollouts, TestFlight and App Store review. See
  [`release_operations.md`](release_operations.md#mobile-releases).
- **Firebase deploys** (Functions, rules, indexes) stay in Deploy backend.
- **No API exists** for some console work: linking the Play Integrity API's
  Cloud project in Play Console, creating a Play app record and its first
  bundle upload, and accepting Apple's agreements in App Store Connect. A local
  Claude Code session with browser control does these with the owner, then
  records the result in the owning document.

## Follow-up phases

- **GitHub environments, secrets and variables** with the
  `integrations/github` Terraform provider, replacing the bootstrap's gh
  commands and the hand-set environment rules.
- **IAM and Workload Identity Federation**: the pool, providers, service
  accounts and bindings that the bootstrap script and
  `release_operations.md` set up by hand today.
- **Secret Manager** secret definitions and access bindings (never values).

Each phase extends the plan guard's allowlist and this document in the same
PR.
