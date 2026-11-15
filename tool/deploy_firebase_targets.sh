#!/usr/bin/env bash
set -euo pipefail

preflight_only=false
functions_mode=all
case "${1:-}" in
  --preflight) preflight_only=true; shift ;;
  --functions-deploy-only) functions_mode=deploy; shift ;;
  --functions-postconditions-only) functions_mode=postconditions; shift ;;
esac

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 [--preflight|--functions-deploy-only|--functions-postconditions-only] <environment> <comma-separated-targets> [firebase deploy args...]" >&2
  echo "--force reaches only exact Function batches; every other phase deploys without it." >&2
  exit 64
fi

environment="$1"
targets_csv="$2"
shift 2

case "$environment" in
  dev|staging|prod) ;;
  *) echo "Unsupported environment: $environment" >&2; exit 64 ;;
esac

# Firebase requires --force when exact Function targets newly enable retry on
# failure. On firestore:indexes the same flag deletes every live index missing
# from firestore.indexes.json, so it is withheld from the shared arguments and
# passed only to exact-named Function batches.
function_force_flag=""
for arg in "$@"; do
  shift
  case "$arg" in
    --force|-f) function_force_flag="--force" ;;
    *) set -- "$@" "$arg" ;;
  esac
done

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

planner_policy_args=()
if [[ -n "${CATCH_DELIVERY_FUNCTIONS_DIR:-}" &&
      -n "${CATCH_FIREBASE_SOURCE_ROOT:-}" ]]; then
  # A verified historical package may predate the current dormant-Function
  # policy. The control plane may reduce that exact legacy target set, but it
  # must never add a target or silently accept any other unknown Function.
  planner_policy_args+=(--filter-dormant-exact-targets)
fi

# Refuse to publish a ref that is behind its remote. See the incident note in
# check_deploy_ref.mjs: deploying from a stale local `main` silently removed
# five match blocks from the live Firestore ruleset.
deploy_ref_args=(--env "$environment")
if [[ "${CATCH_DEPLOY_ALLOW_BEHIND:-0}" == "1" ]]; then
  deploy_ref_args+=(--allow-behind)
fi
node "$repo_root/tool/firebase/check_deploy_ref.mjs" "${deploy_ref_args[@]}"

deploy_target() {
  local phase="$1"
  local deploy_only="$2"
  shift
  shift

  if [[ "$phase" == "storage" ]]; then
    echo "::group::Verify Storage rules cross-service IAM"
    node "$repo_root/tool/firebase/storage_rules_firestore_iam.mjs" \
      --env "$environment" || return $?
    echo "::endgroup::"
  fi

  echo "::group::Deploy Firebase target: $phase"
  local deploy_status=0
  # Indexes and rules retry temporary Google API errors (429, 5xx, dropped
  # connections) up to three times; tool/firebase/retry_transient.mjs never
  # retries validation or compile errors. Functions batches have their own
  # retry loop below, so they run directly.
  local retry=()
  if [[ "$phase" != "functions" ]]; then
    retry=(node "$repo_root/tool/firebase/retry_transient.mjs" --label "Firebase $phase deploy" --)
  fi
  "${retry[@]}" "$repo_root/tool/firebase_with_env.sh" \
    "$environment" deploy --only "$deploy_only" --non-interactive "$@" || deploy_status=$?
  echo "::endgroup::"
  return "$deploy_status"
}

sync_callable_invokers() {
  local project_id
  local functions_dir
  functions_dir="${CATCH_DELIVERY_FUNCTIONS_DIR:-$repo_root/functions}"
  project_id="$(
    node -e '
      const fs = require("fs");
      const env = process.argv[1];
      const rc = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
      const project = rc.projects && rc.projects[env];
      if (typeof project !== "string" ||
          !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) {
        throw new Error("Invalid Firebase project id for " + env);
      }
      process.stdout.write(project);
    ' "$environment" "$repo_root/.firebaserc"
  )" || return $?
  local scope_version
  local invoker_args=("$project_id")
  scope_version="$(node -e '
    const helperPath = require("node:path").resolve(process.argv[1]);
    const version = require(helperPath).functionTargetScopeVersion;
    if (version !== undefined && version !== 1) {
      throw new Error("Unsupported packaged callable scope protocol");
    }
    process.stdout.write(version === 1 ? "1" : "legacy");
  ' "$functions_dir/scripts/set-callable-invokers-public.cjs")" || return $?
  if [[ "$scope_version" == "1" ]]; then
    invoker_args+=(--targets "$1")
  else
    echo "Historical package retains its original callable permission scan."
  fi
  # The same compatibility probe runs before any target mutates. Importing the
  # packaged helper catches missing runtime dependencies as well as unsupported
  # scope versions; preflight must never invoke its permission-writing command.
  if [[ "${2:-}" == "--preflight" ]]; then
    return 0
  fi
  npm --prefix "$functions_dir" run sync:callable-invokers -- "${invoker_args[@]}"
}

plan_output="$(
  node "$repo_root/tool/firebase/plan_firebase_deploy_targets.mjs" \
    "$targets_csv" --tsv "${planner_policy_args[@]}"
)"
if [[ "$functions_mode" != "all" ]]; then
  [[ "$plan_output" == functions$'\t'* && "$plan_output" != *$'\n'* ]] || {
    echo "A Functions subphase requires exactly one Functions target group." >&2
    exit 64
  }
fi

# Validate every local Functions prerequisite before even an earlier index
# phase deploys. Reuse parity's source parser without querying live state:
# new exports and secrets are expected to be absent until deployment finishes.
function_batches=""
while IFS=$'\t' read -r phase deploy_only; do
  [[ "$phase" == "functions" ]] || continue
  command -v npm > /dev/null
  command -v firebase > /dev/null
  command -v gcloud > /dev/null
  sync_callable_invokers "$deploy_only" --preflight
  node --input-type=module -e '
    import fs from "node:fs";
    import path from "node:path";
    import {pathToFileURL} from "node:url";
    const [controlRoot, sourceRoot, functionsDir, environment] = process.argv.slice(1);
    const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
    const expectedProject = read(path.join(controlRoot, ".firebaserc")).projects?.[environment];
    const sourceProject = read(path.join(sourceRoot, ".firebaserc")).projects?.[environment];
    if (sourceProject !== expectedProject) {
      throw new Error("Functions source and control plane Firebase projects differ");
    }
    const command = read(path.join(functionsDir, "package.json")).scripts?.["sync:callable-invokers"];
    if (typeof command !== "string" || !command.trim()) {
      throw new Error("Packaged Functions require the sync:callable-invokers npm script");
    }
    const {loadRepositoryInventory} = await import(pathToFileURL(
      path.join(controlRoot, "tool/firebase/check_deploy_parity.mjs")));
    loadRepositoryInventory(sourceRoot);
  ' "$repo_root" "${CATCH_FIREBASE_SOURCE_ROOT:-$repo_root}" \
    "${CATCH_DELIVERY_FUNCTIONS_DIR:-$repo_root/functions}" "$environment"
  function_batches="$(
    CATCH_FIREBASE_SOURCE_ROOT="${CATCH_FIREBASE_SOURCE_ROOT:-$repo_root}" \
      node "$repo_root/tool/firebase/plan_firebase_deploy_targets.mjs" \
        "$deploy_only" --function-batches "${planner_policy_args[@]}"
  )"
  if [[ -z "$function_batches" ]]; then
    echo "The Functions phase must contain at least one exact deployment batch." >&2
    exit 64
  fi
  if [[ -n "$function_force_flag" ]]; then
    # Mirrors the Delivery guard: --force with a broad selector deletes
    # Functions absent from source, so every forced target must be exact.
    for function_target in $(tr ',\n' '  ' <<< "$function_batches"); do
      if [[ ! "$function_target" =~ ^functions:[A-Za-z][A-Za-z0-9_-]*$ ]]; then
        echo "Refusing --force without an exact named Function target: $function_target" >&2
        exit 64
      fi
    done
  fi
done <<< "$plan_output"

if [[ "$preflight_only" == "true" ]]; then
  echo "Local Firebase deployment prerequisites passed."
  exit 0
fi

while IFS=$'\t' read -r phase deploy_only; do
  [[ -z "$phase" || -z "$deploy_only" ]] && continue
  if [[ "$phase" == "functions" ]]; then
    if [[ "$functions_mode" != "postconditions" ]]; then
      while IFS= read -r function_batch; do
        [[ -z "$function_batch" ]] && continue
        function_batch_status=1
        for function_batch_attempt in 1 2 3; do
          function_batch_status=0
          function_batch_log="$(mktemp "${TMPDIR:-/tmp}/catch-functions-deploy.XXXXXX")"
          deploy_target "$phase" "$function_batch" "$@" ${function_force_flag:+"$function_force_flag"} 2>&1 | \
            tee "$function_batch_log" || function_batch_status=$?
          if [[ "$function_batch_status" != "0" ]] && grep -q \
              -e "In non-interactive mode but have no value for the following environment variables" \
              -e "In non-interactive mode but have no value for the secret" \
              "$function_batch_log"; then
            rm -f "$function_batch_log"
            echo "::error::Firebase parameter configuration is missing; retrying cannot repair it. Materialize non-secret values with tool/firebase/prepare_functions_params_for_deploy.mjs and verify coverage with tool/firebase/check_functions_params_coverage.mjs. Missing secret values require the environment's Secret Manager readiness check before retrying this delivery." >&2
            exit "$function_batch_status"
          fi
          if [[ "$function_batch_status" != "0" ]] && grep -q \
              -e "Pass the --force option to deploy functions with a failure policy" \
              "$function_batch_log"; then
            rm -f "$function_batch_log"
            echo "::error::This batch newly enables retry on failure, which Firebase deploys only with --force; retrying cannot change that. Re-run with --force: this helper passes it only to exact Function batches, never to indexes or rules." >&2
            exit "$function_batch_status"
          fi
          rm -f "$function_batch_log"
          if [[ "$function_batch_status" == "0" ]]; then
            break
          fi
          if [[ "$function_batch_attempt" -lt 3 ]]; then
            echo "Firebase Function batch attempt ${function_batch_attempt} failed; cooling down before the same exact retry." >&2
            sleep 60
          else
            echo "Firebase Function batch exhausted all three attempts." >&2
          fi
        done
        if [[ "$function_batch_status" != "0" ]]; then
          exit "$function_batch_status"
        fi
        # Firebase CLI currently starts up to 40 mutations at once. Keeping each
        # invocation at ten exact targets avoids the per-region mutation and
        # temporary Cloud Run CPU limits without changing the authorized set.
        sleep 10
      done <<< "$function_batches"
    fi
    if [[ "$functions_mode" != "deploy" ]]; then
      sync_callable_invokers "$deploy_only"
      # The planner has already reduced broad `functions` to every eligible
      # export and exact releases to their authorized subset. Bind parity to
      # that same immutable set; the checker still validates all source-declared
      # secret names, while its no-target mode remains strict full parity.
      node "$repo_root/tool/firebase/check_deploy_parity.mjs" \
        --env "$environment" \
        --repo-root "${CATCH_FIREBASE_SOURCE_ROOT:-$repo_root}" \
        --targets "$deploy_only"
    fi
  else
    if [[ -n "$function_force_flag" ]]; then
      echo "--force applies only to exact Function batches; deploying $deploy_only without it."
    fi
    deploy_target "$phase" "$deploy_only" "$@"
  fi
done <<< "$plan_output"
