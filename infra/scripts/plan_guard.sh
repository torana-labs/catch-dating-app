#!/usr/bin/env bash
# Summarise a Terraform plan and refuse the changes phase 1 never makes.
#
#   terraform show -json tfplan > plan.json
#   infra/scripts/plan_guard.sh plan.json >> "$GITHUB_STEP_SUMMARY"
#
# Prints a Markdown summary on stdout. Exits 1 when the plan would delete or
# replace anything, create a Firebase app instead of importing it, or touch a
# resource type outside the phase 1 allowlist. Terraform's own
# prevent_destroy and preconditions are the first line; this guard also
# covers a resource block deleted from the configuration, which takes its
# prevent_destroy with it.
set -euo pipefail

plan_json="${1:?usage: plan_guard.sh <plan.json>}"

# Resource types phase 1 manages. Extending IaC to a new type is a reviewed
# change to this list and to docs/infrastructure_as_code.md.
allowed_types='["google_firebase_android_app","google_firebase_app_check_play_integrity_config"]'

jq -r --argjson allowed "$allowed_types" '
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
  def problems:
    changes | map(
      if (.type as $t | $allowed | index($t)) == null then "\(.address): resource type \(.type) is outside the phase 1 allowlist"
      elif (.change.actions | index("delete")) then "\(.address): plan would \(act(.)) it; phase 1 never deletes or replaces a resource"
      elif (.change.actions | index("create")) then "\(.address): plan would create it; phase 1 only imports existing resources"
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

problem_count="$(jq --argjson allowed "$allowed_types" '
  [.resource_changes[]? | select(.mode == "managed")
   | select(((.type as $t | $allowed | index($t)) == null)
            or (.change.actions | index("delete"))
            or (.change.actions | index("create")))] | length
' "$plan_json")"

if [[ "$problem_count" != "0" ]]; then
  echo "Plan guard refused $problem_count change(s)." >&2
  exit 1
fi
