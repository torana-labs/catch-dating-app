#!/usr/bin/env bash
# One-time, idempotent bootstrap for infra/ (Terraform for Firebase settings).
#
# Run once by the owner on a Mac with gcloud signed in as a project owner of
# catch-dating-app-64e51, catchdates-staging and catchdates-dev, and gh signed
# in as a torana-labs/catch-dating-app admin:
#
#   gcloud auth login
#   gh auth login
#   bash infra/bootstrap/bootstrap.sh
#
# Safe to rerun: every step reads first and only adds what is missing. It
# never removes a binding, role, key or environment rule. It creates no
# service-account keys. It changes no Firebase app, App Check or enforcement
# setting; Terraform does that later, after review.
#
# What it creates (each role is explained in docs/infrastructure_as_code.md):
#   - gs://catch-dating-app-64e51-terraform-state: versioned, uniform access,
#     public access prevention, in asia-south1, seeded with an empty state so
#     the read-only plan identity never has to create one.
#   - github-actions-platform-plan@: custom role catchPlatformPlanReader in each
#     project (read Firebase Android apps and Play Integrity configs) and
#     storage.objectViewer on the state bucket. Trusted only by the
#     platform-plan GitHub environment.
#   - github-actions-platform-apply@: custom role catchPlatformApplier in each
#     project (also update Android apps and Play Integrity configs; no create
#     or delete) and storage.objectUser on the state bucket. Trusted only by the
#     reviewer-protected, main-only prod-platform GitHub environment.
#   - Forms payment secrets (dev and prod): custom role
#     catchFormCredentialVault (versions add/access/disable), which Terraform
#     grants the Functions runtime on the merchant credential vault; and
#     Secret Manager roles for the two platform identities that cover only
#     secrets named FORM_RAZORPAY_* (IAM condition), plus create for apply.
#     Neither platform identity can read, add or disable a secret version.
#   - OIDC provider github-platform in the existing github-actions pool. It
#     admits only repository 1170579691 jobs in platform-plan, or in
#     prod-platform on refs/heads/main. The older catch-dating-app provider
#     admits main jobs only, so pull-request plans need this one.
#   - GitHub environments platform-plan and prod-platform with their
#     GCP_WORKLOAD_IDENTITY_PROVIDER and GCP_SERVICE_ACCOUNT_EMAIL variables.
set -euo pipefail

PROD_PROJECT=catch-dating-app-64e51
PROD_NUMBER=574779808785
STAGING_PROJECT=catchdates-staging
DEV_PROJECT=catchdates-dev
DEV_NUMBER=619661127800
MANAGED_PROJECTS=("$PROD_PROJECT" "$STAGING_PROJECT" "$DEV_PROJECT")

REPOSITORY=torana-labs/catch-dating-app
REPOSITORY_ID=1170579691
POOL=github-actions
PROVIDER=github-platform
PROVIDER_NAME="projects/$PROD_NUMBER/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"
PRINCIPAL_PREFIX="principalSet://iam.googleapis.com/projects/$PROD_NUMBER/locations/global/workloadIdentityPools/$POOL/attribute.repository_environment/$REPOSITORY_ID"

PLAN_ENVIRONMENT=platform-plan
APPLY_ENVIRONMENT=prod-platform

BUCKET=gs://catch-dating-app-64e51-terraform-state
BUCKET_LOCATION=asia-south1

PLAN_ACCOUNT_ID=github-actions-platform-plan
APPLY_ACCOUNT_ID=github-actions-platform-apply
PLAN_ACCOUNT="$PLAN_ACCOUNT_ID@$PROD_PROJECT.iam.gserviceaccount.com"
APPLY_ACCOUNT="$APPLY_ACCOUNT_ID@$PROD_PROJECT.iam.gserviceaccount.com"

PLAN_ROLE=catchPlatformPlanReader
APPLY_ROLE=catchPlatformApplier
# Read the Firebase Android apps Terraform imports (get, list), their App
# Check Play Integrity configs, and Firestore database settings and backup
# schedules, and alert policies, uptime checks and notification channels.
# No Firestore documents (no datastore.entities.*), Storage data, Auth users,
# secrets or IAM.
PLAN_PERMISSIONS=firebase.clients.get,firebase.clients.list,firebase.projects.get,firebaseappcheck.playIntegrityConfig.get,datastore.databases.get,datastore.databases.getMetadata,datastore.backupSchedules.get,datastore.backupSchedules.list,monitoring.alertPolicies.get,monitoring.alertPolicies.list,monitoring.uptimeCheckConfigs.get,monitoring.uptimeCheckConfigs.list,monitoring.notificationChannels.get,monitoring.notificationChannels.list
# The same reads plus updating an existing app's fingerprints and its Play
# Integrity config, updating a Firestore database's settings, and creating
# or updating its backup schedules. Deliberately no firebase.clients.create/
# delete, no firebaseappcheck.services.update (App Check enforcement), no
# datastore.databases.create/delete and no datastore.backupSchedules.delete.
# Alert policies and uptime checks may be created and updated, never deleted;
# notification channels are only read.
APPLY_PERMISSIONS=firebase.clients.get,firebase.clients.list,firebase.clients.update,firebase.projects.get,firebaseappcheck.playIntegrityConfig.get,firebaseappcheck.playIntegrityConfig.update,datastore.databases.get,datastore.databases.getMetadata,datastore.databases.update,datastore.backupSchedules.get,datastore.backupSchedules.list,datastore.backupSchedules.create,datastore.backupSchedules.update,monitoring.alertPolicies.get,monitoring.alertPolicies.list,monitoring.alertPolicies.create,monitoring.alertPolicies.update,monitoring.uptimeCheckConfigs.get,monitoring.uptimeCheckConfigs.list,monitoring.uptimeCheckConfigs.create,monitoring.uptimeCheckConfigs.update,monitoring.notificationChannels.get,monitoring.notificationChannels.list

# Forms payment secrets. Secret IAM conditions see secret names with the
# project number. Custom roles live here, not in Terraform: an identity that
# can edit roles could widen its own.
FORM_SECRET_PREFIX=FORM_RAZORPAY_
VAULT_ROLE=catchFormCredentialVault
VAULT_PERMISSIONS=secretmanager.versions.add,secretmanager.versions.access,secretmanager.versions.disable
SECRETS_READER_ROLE=catchPlatformSecretsReader
SECRETS_READER_PERMISSIONS=secretmanager.secrets.get,secretmanager.secrets.getIamPolicy
SECRETS_ADMIN_ROLE=catchPlatformSecretsAdmin
SECRETS_ADMIN_PERMISSIONS=secretmanager.secrets.get,secretmanager.secrets.getIamPolicy,secretmanager.secrets.setIamPolicy,secretmanager.secrets.update
SECRET_CREATOR_ROLE=catchPlatformSecretCreator
SECRET_CREATOR_PERMISSIONS=secretmanager.secrets.create

# The provider admits only this repository's jobs in the two platform
# environments, and prod-platform only from main. Jobs without an environment
# have no environment claim and are rejected.
ATTRIBUTE_MAPPING="google.subject=assertion.sub,attribute.repository_environment=assertion.repository_id+':'+assertion.environment,attribute.ref=assertion.ref,attribute.event_name=assertion.event_name"
ATTRIBUTE_CONDITION="assertion.repository_id == '$REPOSITORY_ID' && (assertion.environment == '$PLAN_ENVIRONMENT' || (assertion.environment == '$APPLY_ENVIRONMENT' && assertion.ref == 'refs/heads/main'))"

step() { printf '\n==> %s\n' "$*"; }
quiet() { "$@" >/dev/null 2>&1; }

account="$(gcloud config get-value account 2>/dev/null || true)"
[[ -n "$account" ]] || { echo "Sign in first: gcloud auth login" >&2; exit 1; }
echo "gcloud account: $account"
have_gh=false
if command -v gh >/dev/null 2>&1 && quiet gh auth status; then
  have_gh=true
  echo "gh account: $(gh api user --jq .login)"
else
  echo "gh is missing or signed out; GitHub steps will be printed instead of run."
fi

step "Enable the APIs Terraform and keyless sign-in use"
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  storage.googleapis.com firebase.googleapis.com firebaseappcheck.googleapis.com \
  --project="$PROD_PROJECT"
for project in "$STAGING_PROJECT" "$DEV_PROJECT"; do
  gcloud services enable firebase.googleapis.com firebaseappcheck.googleapis.com --project="$project"
done
for project in "$PROD_PROJECT" "$DEV_PROJECT"; do
  gcloud services enable secretmanager.googleapis.com --project="$project"
done

step "State bucket $BUCKET"
if ! quiet gcloud storage buckets describe "$BUCKET" --project="$PROD_PROJECT"; then
  gcloud storage buckets create "$BUCKET" --project="$PROD_PROJECT" --location="$BUCKET_LOCATION" \
    --uniform-bucket-level-access --public-access-prevention
fi
gcloud storage buckets update "$BUCKET" --versioning --uniform-bucket-level-access --public-access-prevention

# Read-only plans cannot create the state: with no state object, the GCS
# backend writes a lock and an initial state even under -lock=false. Seed an
# empty Terraform 1.16 state once; --if-generation-match=0 never overwrites.
if ! quiet gcloud storage objects describe "$BUCKET/firebase/default.tfstate"; then
  lineage="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
  printf '{"version":4,"terraform_version":"1.16.6","serial":0,"lineage":"%s","outputs":{},"resources":[],"check_results":null}\n' \
    "$(tr '[:upper:]' '[:lower:]' <<<"$lineage")" |
    gcloud storage cp --if-generation-match=0 - "$BUCKET/firebase/default.tfstate"
fi

step "Service accounts"
ensure_account() {
  local id="$1" display="$2" description="$3"
  if ! quiet gcloud iam service-accounts describe "$id@$PROD_PROJECT.iam.gserviceaccount.com" --project="$PROD_PROJECT"; then
    gcloud iam service-accounts create "$id" --project="$PROD_PROJECT" \
      --display-name="$display" --description="$description"
  fi
}
ensure_account "$PLAN_ACCOUNT_ID" "GitHub Actions platform plan (read-only)" \
  "Terraform plan and drift for infra/firebase; read-only. Trusted by the platform-plan environment."
ensure_account "$APPLY_ACCOUNT_ID" "GitHub Actions platform apply" \
  "Terraform apply for infra/firebase. Trusted only by the reviewer-protected prod-platform environment."

step "Custom roles and project bindings"
ensure_role() {
  local project="$1" role="$2" title="$3" description="$4" permissions="$5" state
  state="$(gcloud iam roles describe "$role" --project="$project" --format='value(deleted)' 2>/dev/null || echo missing)"
  if [[ "$state" == missing ]]; then
    gcloud iam roles create "$role" --project="$project" --title="$title" \
      --description="$description" --permissions="$permissions" --stage=GA
  else
    if [[ "$state" == True ]]; then gcloud iam roles undelete "$role" --project="$project"; fi
    gcloud iam roles update "$role" --project="$project" --title="$title" \
      --description="$description" --permissions="$permissions" --stage=GA --quiet
  fi
}
for project in "${MANAGED_PROJECTS[@]}"; do
  ensure_role "$project" "$PLAN_ROLE" "Catch platform plan reader" \
    "Read Firebase Android apps, App Check Play Integrity configs and Firestore recovery settings for Terraform plans." "$PLAN_PERMISSIONS"
  ensure_role "$project" "$APPLY_ROLE" "Catch platform applier" \
    "Update existing Firebase Android app fingerprints, App Check Play Integrity configs and Firestore recovery settings for Terraform apply." "$APPLY_PERMISSIONS"
  gcloud projects add-iam-policy-binding "$project" --condition=None --quiet \
    --member="serviceAccount:$PLAN_ACCOUNT" --role="projects/$project/roles/$PLAN_ROLE" >/dev/null
  gcloud projects add-iam-policy-binding "$project" --condition=None --quiet \
    --member="serviceAccount:$APPLY_ACCOUNT" --role="projects/$project/roles/$APPLY_ROLE" >/dev/null
done

step "Forms payment secret roles (dev and prod)"
for entry in "$DEV_PROJECT:$DEV_NUMBER" "$PROD_PROJECT:$PROD_NUMBER"; do
  project="${entry%%:*}"
  number="${entry#*:}"
  only_form_secrets="expression=resource.name.startsWith('projects/$number/secrets/$FORM_SECRET_PREFIX'),title=form-razorpay-secrets-only,description=Only the Forms Razorpay secrets"
  ensure_role "$project" "$VAULT_ROLE" "Catch form credential vault" \
    "Add, read and disable merchant credential versions. Granted on the vault secret only." "$VAULT_PERMISSIONS"
  ensure_role "$project" "$SECRETS_READER_ROLE" "Catch platform secrets reader" \
    "Read Forms payment secret metadata and IAM for Terraform plans; never values." "$SECRETS_READER_PERMISSIONS"
  ensure_role "$project" "$SECRETS_ADMIN_ROLE" "Catch platform secrets admin" \
    "Manage Forms payment secret settings and IAM for Terraform apply; never values." "$SECRETS_ADMIN_PERMISSIONS"
  ensure_role "$project" "$SECRET_CREATOR_ROLE" "Catch platform secret creator" \
    "Create secret containers for Terraform apply; never values." "$SECRET_CREATOR_PERMISSIONS"
  gcloud projects add-iam-policy-binding "$project" --quiet --condition="$only_form_secrets" \
    --member="serviceAccount:$PLAN_ACCOUNT" --role="projects/$project/roles/$SECRETS_READER_ROLE" >/dev/null
  gcloud projects add-iam-policy-binding "$project" --quiet --condition="$only_form_secrets" \
    --member="serviceAccount:$APPLY_ACCOUNT" --role="projects/$project/roles/$SECRETS_ADMIN_ROLE" >/dev/null
  # Creation is checked on the project, where a name condition cannot apply.
  gcloud projects add-iam-policy-binding "$project" --quiet --condition=None \
    --member="serviceAccount:$APPLY_ACCOUNT" --role="projects/$project/roles/$SECRET_CREATOR_ROLE" >/dev/null
done

step "State bucket access"
gcloud storage buckets add-iam-policy-binding "$BUCKET" \
  --member="serviceAccount:$PLAN_ACCOUNT" --role=roles/storage.objectViewer >/dev/null
gcloud storage buckets add-iam-policy-binding "$BUCKET" \
  --member="serviceAccount:$APPLY_ACCOUNT" --role=roles/storage.objectUser >/dev/null

step "OIDC provider $PROVIDER in pool $POOL"
if quiet gcloud iam workload-identity-pools providers describe "$PROVIDER" \
    --project="$PROD_PROJECT" --location=global --workload-identity-pool="$POOL"; then
  gcloud iam workload-identity-pools providers update-oidc "$PROVIDER" \
    --project="$PROD_PROJECT" --location=global --workload-identity-pool="$POOL" \
    --display-name="GitHub platform IaC" \
    --attribute-mapping="$ATTRIBUTE_MAPPING" --attribute-condition="$ATTRIBUTE_CONDITION"
else
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
    --project="$PROD_PROJECT" --location=global --workload-identity-pool="$POOL" \
    --display-name="GitHub platform IaC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="$ATTRIBUTE_MAPPING" --attribute-condition="$ATTRIBUTE_CONDITION"
fi

step "Plan identity trusts only the $PLAN_ENVIRONMENT environment"
gcloud iam service-accounts add-iam-policy-binding "$PLAN_ACCOUNT" --project="$PROD_PROJECT" \
  --role=roles/iam.workloadIdentityUser --member="$PRINCIPAL_PREFIX:$PLAN_ENVIRONMENT" >/dev/null

github_commands() {
  cat <<EOF
gh api -X PUT repos/$REPOSITORY/environments/$PLAN_ENVIRONMENT
gh api -X PUT repos/$REPOSITORY/environments/$APPLY_ENVIRONMENT --input - <<'JSON'
{"reviewers":[{"type":"User","id":<owner user id from: gh api user --jq .id>}],
 "prevent_self_review":false,"can_admins_bypass":false,"wait_timer":0,
 "deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
gh api -X POST repos/$REPOSITORY/environments/$APPLY_ENVIRONMENT/deployment-branch-policies -f name=main -f type=branch
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo $REPOSITORY --env $PLAN_ENVIRONMENT --body '$PROVIDER_NAME'
gh variable set GCP_SERVICE_ACCOUNT_EMAIL --repo $REPOSITORY --env $PLAN_ENVIRONMENT --body '$PLAN_ACCOUNT'
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo $REPOSITORY --env $APPLY_ENVIRONMENT --body '$PROVIDER_NAME'
gh variable set GCP_SERVICE_ACCOUNT_EMAIL --repo $REPOSITORY --env $APPLY_ENVIRONMENT --body '$APPLY_ACCOUNT'
EOF
}

step "GitHub environments and variables"
if [[ "$have_gh" != true ]]; then
  echo "Run these with gh, then rerun this script so it can verify $APPLY_ENVIRONMENT and trust it:"
  github_commands
  echo
  echo "Stopped before trusting $APPLY_ENVIRONMENT: the apply identity is bound only after its reviewer and main-only rules are verified."
  exit 0
fi

reviewer_login="${PLATFORM_REVIEWER:-$(gh api user --jq .login)}"
reviewer_id="$(gh api "users/$reviewer_login" --jq .id)"
if ! quiet gh api "repos/$REPOSITORY/environments/$PLAN_ENVIRONMENT"; then
  # No reviewers or branch rules: pull-request plans use it, and its identity
  # is read-only. Created only when missing, so a rerun never resets it.
  gh api -X PUT "repos/$REPOSITORY/environments/$PLAN_ENVIRONMENT" >/dev/null
fi
gh api -X PUT "repos/$REPOSITORY/environments/$APPLY_ENVIRONMENT" --input - >/dev/null <<JSON
{"reviewers":[{"type":"User","id":$reviewer_id}],
 "prevent_self_review":false,"can_admins_bypass":false,"wait_timer":0,
 "deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}
JSON
if ! gh api "repos/$REPOSITORY/environments/$APPLY_ENVIRONMENT/deployment-branch-policies" \
    --jq '.branch_policies[] | select(.name == "main" and (.type // "branch") == "branch") | .name' | grep -qx main; then
  gh api -X POST "repos/$REPOSITORY/environments/$APPLY_ENVIRONMENT/deployment-branch-policies" \
    -f name=main -f type=branch >/dev/null
fi
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$REPOSITORY" --env "$PLAN_ENVIRONMENT" --body "$PROVIDER_NAME"
gh variable set GCP_SERVICE_ACCOUNT_EMAIL --repo "$REPOSITORY" --env "$PLAN_ENVIRONMENT" --body "$PLAN_ACCOUNT"
gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER --repo "$REPOSITORY" --env "$APPLY_ENVIRONMENT" --body "$PROVIDER_NAME"
gh variable set GCP_SERVICE_ACCOUNT_EMAIL --repo "$REPOSITORY" --env "$APPLY_ENVIRONMENT" --body "$APPLY_ACCOUNT"

step "Verify $APPLY_ENVIRONMENT before trusting it"
# gh's built-in --jq keeps this free of a separate jq install.
protected="$(gh api "repos/$REPOSITORY/environments/$APPLY_ENVIRONMENT" --jq '
  ([.protection_rules[]? | select(.type == "required_reviewers") | .reviewers[]?] | length) > 0
  and (.deployment_branch_policy.custom_branch_policies // false) == true
  and .can_admins_bypass == false')"
branches="$(gh api "repos/$REPOSITORY/environments/$APPLY_ENVIRONMENT/deployment-branch-policies" \
  --jq '[.branch_policies[] | "\(.type // "branch"):\(.name)"] | join(",")')"
echo "$APPLY_ENVIRONMENT: reviewer-protected, no admin bypass, custom branch rules = $protected; branch rules = $branches"
if [[ "$protected" != true || "$branches" != branch:main ]]; then
  echo "$APPLY_ENVIRONMENT is not reviewer-protected and main-only; not trusting it." >&2
  exit 1
fi
gcloud iam service-accounts add-iam-policy-binding "$APPLY_ACCOUNT" --project="$PROD_PROJECT" \
  --role=roles/iam.workloadIdentityUser --member="$PRINCIPAL_PREFIX:$APPLY_ENVIRONMENT" >/dev/null

step "Done"
cat <<EOF
Bootstrap is complete. Next:
  1. Run the Firebase Android Fingerprints workflow from main:
       gh workflow run play-signing-fingerprints.yml --repo $REPOSITORY --ref main
  2. Copy the terraform.tfvars from its run summary (or artifact) into
     infra/firebase/terraform.tfvars in a PR. Infra Plan shows the plan.
  3. Merge; approve the $APPLY_ENVIRONMENT deployment in Infra Apply.
EOF
