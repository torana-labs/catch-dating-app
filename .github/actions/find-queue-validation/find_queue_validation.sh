#!/usr/bin/env bash
# The merge queue tests the exact commit main then receives, so a release need
# not repeat a job the queue passed. Any failed lookup or missing job reads as
# not validated, and the release then validates for itself.
set -uo pipefail

run_id=""
jobs=""
if runs="$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?event=merge_group&head_sha=$SOURCE_SHA&per_page=20")"; then
  run_id="$(jq -r --arg sha "$SOURCE_SHA" '[.workflow_runs[]? | select(.event == "merge_group" and
    .head_sha == $sha and .conclusion == "success" and .path == ".github/workflows/ci.yml")] |
    max_by(.id) | .id // empty' <<< "$runs" || true)"
fi
if [[ "$run_id" =~ ^[1-9][0-9]*$ ]]; then
  jobs="$(gh api --paginate "repos/$GITHUB_REPOSITORY/actions/runs/$run_id/jobs?per_page=100" || true)"
fi

validated=false
if [[ -n "$jobs" ]] && jq -se --arg sha "$SOURCE_SHA" --arg required "Required CI
$REQUIRED_JOBS" '[.[].jobs[]?] as $jobs | $required | split("\n") | map(select(length > 0)) |
  all(. as $name | [$jobs[] | select(.name == $name and .head_sha == $sha and .conclusion == "success")] | length == 1)' \
  <<< "$jobs" > /dev/null 2>&1; then
  validated=true
fi

echo "validated=$validated" >> "$GITHUB_OUTPUT"
echo "Merge queue validation of this commit: ${validated} (run ${run_id:-none})" >> "$GITHUB_STEP_SUMMARY"
