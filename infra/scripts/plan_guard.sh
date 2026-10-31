#!/usr/bin/env bash
# Summarise a Terraform plan and refuse the changes phase 1 never makes.
#
#   terraform show -json tfplan > plan.json
#   infra/scripts/plan_guard.sh plan.json >> "$GITHUB_STEP_SUMMARY"
#
# Prints a Markdown summary on stdout. Exits 1 when the plan would delete or
# replace anything, create a resource type that may only be imported,
# touch a resource type outside the allowlist, or turn off Firestore delete
# protection or point-in-time recovery. Terraform's own
# prevent_destroy and preconditions are the first line; this guard also
# covers a resource block deleted from the configuration, which takes its
# prevent_destroy with it.
set -euo pipefail

plan_json="${1:?usage: plan_guard.sh <plan.json>}"

# Resource types under management. Extending IaC to a new type is a reviewed
# change to these lists and to docs/infrastructure_as_code.md. Secret
# versions are deliberately absent: a secret value must never enter state.
allowed_types='["google_firebase_android_app","google_firebase_app_check_play_integrity_config","google_secret_manager_secret","google_secret_manager_secret_iam_member","google_firestore_database","google_firestore_backup_schedule"]'
# Types Terraform may create. Firebase apps, their App Check configs and
# Firestore databases are only ever imported.
creatable_types='["google_secret_manager_secret","google_secret_manager_secret_iam_member","google_firestore_backup_schedule"]'

jq -r --argjson allowed "$allowed_types" --argjson creatable "$creatable_types" '
  def changes: [.resource_changes[]? | select(.mode == "managed")];
  def act(c):
    if (c.change.actions | index("delete")) and (c.change.actions | index("create")) then "replace"
    elif c.change.actions == ["no-op"] then (if c.change.importing then "import" else "no-op" end)
    else (c.change.actions | join("+")) + (if c.change.importing then " (import)" else "" end)
    end;
  def added(c; field): ((c.change.after[field] // []) - (c.change.before[field] // []));
  def removed(c; field): ((c.change.before[field] // []) - (c.change.after[field] // []));
  def detail(c):
    if c.type == "google_firebase_android_app" then
      [ (added(c; "sha1_hashes")[] | "+ SHA-1 `\(.)`"),
        (added(c; "sha256_hashes")[] | "+ SHA-256 `\(.)`"),
        (removed(c; "sha1_hashes")[] | "- SHA-1 `\(.)`"),
        (removed(c; "sha256_hashes")[] | "- SHA-256 `\(.)`"),
        (if (c.change.before.display_name // null) != null and c.change.before.display_name != c.change.after.display_name
         then "display name `\(c.change.before.display_name)` -> `\(c.change.after.display_name)`" else empty end)
      ] | join("<br>")
    else "" end;
  def bad_secret_grant(c):
    c.type == "google_secret_manager_secret_iam_member" and (c.change.after != null) and
    (((c.change.after.role // "") | test("^(roles/secretmanager\\.secretAccessor|projects/[a-z0-9-]+/roles/catchFormCredentialVault)$") | not)
     or ((c.change.after.member // "") | test("github-actions")));
  def weakened_recovery(c):
    c.type == "google_firestore_database" and (c.change.after != null) and
    ((c.change.after.delete_protection_state // "") != "DELETE_PROTECTION_ENABLED"
     or (c.change.after.point_in_time_recovery_enablement // "") != "POINT_IN_TIME_RECOVERY_ENABLED");
  def problems:
    changes | map(
      if (.type as $t | $allowed | index($t)) == null then "\(.address): resource type \(.type) is outside the allowlist"
      elif (.change.actions | index("delete")) then "\(.address): plan would \(act(.)) it; Terraform here never deletes or replaces a resource"
      elif (.change.actions | index("create")) and ((.type as $t | $creatable | index($t)) == null) then "\(.address): plan would create it; this type is only ever imported"
      elif bad_secret_grant(.) then "\(.address): secret IAM may grant only roles/secretmanager.secretAccessor or catchFormCredentialVault, and never to a github-actions identity"
      elif weakened_recovery(.) then "\(.address): delete protection and point-in-time recovery must stay enabled"
      else empty end);

  (changes | map(select(act(.) != "no-op"))) as $shown
  | problems as $problems
  | "### Terraform plan",
    "",
    (if ($shown | length) == 0 then "No changes. Live state matches the configuration."
     else
       "| Resource | Action | Detail |",
       "|---|---|---|",
       ($shown[] | "| `\(.address)` | \(act(.)) | \(detail(.)) |")
     end),
    "",
    (if ($problems | length) == 0 then "Plan guard: passed."
     else "Plan guard: **refused**.", "", ($problems[] | "- \(.)") end)
' "$plan_json"

problem_count="$(jq --argjson allowed "$allowed_types" --argjson creatable "$creatable_types" '
  def bad_secret_grant(c):
    c.type == "google_secret_manager_secret_iam_member" and (c.change.after != null) and
    (((c.change.after.role // "") | test("^(roles/secretmanager\\.secretAccessor|projects/[a-z0-9-]+/roles/catchFormCredentialVault)$") | not)
     or ((c.change.after.member // "") | test("github-actions")));
  def weakened_recovery(c):
    c.type == "google_firestore_database" and (c.change.after != null) and
    ((c.change.after.delete_protection_state // "") != "DELETE_PROTECTION_ENABLED"
     or (c.change.after.point_in_time_recovery_enablement // "") != "POINT_IN_TIME_RECOVERY_ENABLED");
  [.resource_changes[]? | select(.mode == "managed")
   | select(((.type as $t | $allowed | index($t)) == null)
            or (.change.actions | index("delete"))
            or ((.change.actions | index("create")) and ((.type as $t | $creatable | index($t)) == null))
            or bad_secret_grant(.)
            or weakened_recovery(.))] | length
' "$plan_json")"

if [[ "$problem_count" != "0" ]]; then
  echo "Plan guard refused $problem_count change(s)." >&2
  exit 1
fi
