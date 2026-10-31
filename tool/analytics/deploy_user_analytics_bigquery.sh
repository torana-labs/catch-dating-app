#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'USAGE'
Usage:
  tool/analytics/deploy_user_analytics_bigquery.sh <dev|staging|prod> [options]

Options:
  --project-id <id>        Override the Firebase project alias in .firebaserc.
  --location <location>    BigQuery job location. Defaults to asia-south1.
  --refresh-only           Run only the mart refresh SQL.
  --skip-refresh           Rename pre-organizer columns and run DDL only.
  --create-schedule        Create or update the BigQuery scheduled query.
  --schedule <cron text>   Scheduled-query cadence. Defaults to "every day 23:00".
  --display-name <name>    Scheduled-query display name.
  --service-account <email>
                           Service account used as the scheduled-query credential.
  --dry-run                Print commands and dry-run the refresh query only.

The --create-schedule option is idempotent by display name. It updates the
existing scheduled query when exactly one matching config exists, creates it
when none exists, and fails if duplicate configs already exist.
USAGE
  exit 64
}

if [[ $# -lt 1 ]]; then
  usage
fi

environment="$1"
shift

case "$environment" in
  dev|staging|prod) ;;
  *) usage ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"
project_id=""
location="asia-south1"
refresh_only=false
skip_refresh=false
create_schedule=false
schedule="every day 23:00"
display_name="Catch user analytics daily mart refresh"
service_account=""
dry_run=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-id)
      project_id="${2:-}"
      shift 2
      ;;
    --location)
      location="${2:-}"
      shift 2
      ;;
    --refresh-only)
      refresh_only=true
      shift
      ;;
    --skip-refresh)
      skip_refresh=true
      shift
      ;;
    --create-schedule)
      create_schedule=true
      shift
      ;;
    --schedule)
      schedule="${2:-}"
      shift 2
      ;;
    --display-name)
      display_name="${2:-}"
      shift 2
      ;;
    --service-account)
      service_account="${2:-}"
      shift 2
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    *)
      usage
      ;;
  esac
done

if [[ "$refresh_only" == true && "$skip_refresh" == true ]]; then
  echo "Choose only one of --refresh-only or --skip-refresh." >&2
  exit 64
fi

if [[ -z "$project_id" ]]; then
  project_id="$(
    node -e '
      const fs = require("fs");
      const env = process.argv[1];
      const rc = JSON.parse(fs.readFileSync(".firebaserc", "utf8"));
      const project = rc.projects && rc.projects[env];
      if (!project) process.exit(2);
      console.log(project);
    ' "$environment"
  )" || {
    echo "Unable to resolve Firebase project alias '$environment'." >&2
    exit 65
  }
fi

if ! command -v bq >/dev/null 2>&1; then
  echo "BigQuery CLI 'bq' is required." >&2
  exit 69
fi

query_file() {
  local file="$1"
  local label="$2"
  echo "::group::BigQuery $label"
  echo "project=$project_id location=$location file=$file"
  if [[ "$dry_run" == true ]]; then
    if [[ "$label" == "refresh" ]]; then
      bq --project_id="$project_id" --location="$location" query \
        --use_legacy_sql=false --dry_run < "$file"
    else
      echo "Skipping DDL execution in --dry-run mode."
    fi
  else
    bq --project_id="$project_id" --location="$location" query \
      --use_legacy_sql=false < "$file"
  fi
  echo "::endgroup::"
}

run_step() {
  if [[ "$dry_run" == true ]]; then
    printf 'Would run:'
    printf ' %q' "$@"
    echo
  else
    "$@"
  fi
}

# Tables created before the organizer rename (2026-10-31) name the organizer
# column the old way. rename_to_organizer renames such a table's columns in
# place and keeps its rows. Clustering moves off the old column first, so the
# rename never touches a clustering column, then onto the DDL's CLUSTER BY.
# An absent or already renamed table is left alone; the DDL creates or
# matches it. --dry-run reads the table and prints the commands it would run.
rename_to_organizer() {
  local table="$1"
  local renames="$2"
  local interim_clustering="${3:-}"
  local clustering="${4:-}"
  local description="${5:-}"
  local table_ref="$project_id:$dataset.$table"
  local old_column="${renames#RENAME COLUMN }"
  old_column="${old_column%% *}"
  local metadata
  if ! metadata="$(bq --project_id="$project_id" --format=json show "$table_ref" 2>&1)"; then
    if [[ "$metadata" == *"Not found"* ]]; then
      return 0
    fi
    echo "$metadata" >&2
    exit 1
  fi
  if ! node -e '
    const [column, metadata] = process.argv.slice(1);
    const fields = JSON.parse(metadata).schema?.fields ?? [];
    process.exit(fields.some((field) => field.name === column) ? 0 : 1);
  ' "$old_column" "$metadata"; then
    return 0
  fi
  echo "::group::BigQuery $table organizer columns"
  if [[ -n "$interim_clustering" ]]; then
    run_step bq --project_id="$project_id" update \
      --clustering_fields="$interim_clustering" "$table_ref"
  fi
  run_step bq --project_id="$project_id" --location="$location" query \
    --use_legacy_sql=false "ALTER TABLE \`$project_id.$dataset.$table\` $renames"
  if [[ -n "$clustering" ]]; then
    run_step bq --project_id="$project_id" update \
      --clustering_fields="$clustering" "$table_ref"
  fi
  if [[ -n "$description" ]]; then
    run_step bq --project_id="$project_id" update \
      --description="$description" "$table_ref"
  fi
  echo "::endgroup::"
}

find_existing_schedule_config() {
  local configs_file
  configs_file="$(mktemp "${TMPDIR:-/tmp}/user-analytics-schedules.XXXXXX.json")"
  bq --project_id="$project_id" --format=json ls \
    --transfer_config \
    --transfer_location="$location" > "$configs_file"
  node -e '
    const fs = require("fs");
    const [displayName, configsPath] = process.argv.slice(1);
    const raw = fs.readFileSync(configsPath, "utf8").trim();
    const configs = raw.length > 0 ? JSON.parse(raw) : [];
    const matches = configs.filter((config) =>
      config &&
      config.displayName === displayName &&
      config.dataSourceId === "scheduled_query"
    );
    if (matches.length > 1) {
      console.error(
        `Found ${matches.length} scheduled queries named "${displayName}". ` +
        "Resolve duplicates in BigQuery before updating this schedule."
      );
      process.exit(2);
    }
    if (matches.length === 1) {
      const name = matches[0].name || matches[0].transferConfigName;
      if (!name) {
        console.error(`Scheduled query "${displayName}" did not include a resource name.`);
        process.exit(3);
      }
      console.log(name);
    }
  ' "$display_name" "$configs_file"
  rm -f "$configs_file"
}

dataset="catch_user_analytics"
ddl_events="$repo_root/analytics/sql/ddl/user_profile_exposure_events.sql"
ddl_mart="$repo_root/analytics/sql/ddl/mart_user_analytics_daily.sql"
refresh_sql="$repo_root/analytics/sql/marts/refresh_mart_user_analytics_daily.sql"

if [[ "$refresh_only" != true ]]; then
  rename_to_organizer user_profile_exposure_events \
    "RENAME COLUMN club_id TO organizer_id"
  query_file "$ddl_events" "user_profile_exposure_events DDL"
  query_file "$ddl_mart" "mart_user_analytics_daily DDL"
fi

if [[ "$skip_refresh" != true ]]; then
  query_file "$refresh_sql" "refresh"
fi

if [[ "$create_schedule" == true ]]; then
  params_file="$(mktemp "${TMPDIR:-/tmp}/user-analytics-schedule.XXXXXX.json")"
  trap 'rm -f "$params_file"' EXIT
  node -e '
    const fs = require("fs");
    const [sqlPath, paramsPath] = process.argv.slice(1);
    fs.writeFileSync(paramsPath, JSON.stringify({
      query: fs.readFileSync(sqlPath, "utf8"),
    }));
  ' "$refresh_sql" "$params_file"

  echo "::group::BigQuery scheduled query"
  echo "project=$project_id location=$location schedule=$schedule"
  if [[ -n "$service_account" ]]; then
    echo "service_account=$service_account"
  fi
  if [[ "$dry_run" == true ]]; then
    echo "Would create or update scheduled query transfer config: $display_name"
  else
    existing_config="$(find_existing_schedule_config)"
    if [[ -n "$existing_config" ]]; then
      echo "Updating scheduled query transfer config: $existing_config"
      update_args=(
        bq --project_id="$project_id" update
        --transfer_config
        --display_name="$display_name"
        --schedule="$schedule"
        --params="$(cat "$params_file")"
      )
      if [[ -n "$service_account" ]]; then
        update_args+=(
          --service_account_name="$service_account"
          --update_credentials
        )
      fi
      "${update_args[@]}" \
        "$existing_config"
    else
      echo "Creating scheduled query transfer config: $display_name"
      create_args=(
        bq --project_id="$project_id" --location="$location" mk
        --transfer_config \
        --display_name="$display_name" \
        --schedule="$schedule" \
        --data_source=scheduled_query \
        --params="$(cat "$params_file")"
      )
      if [[ -n "$service_account" ]]; then
        create_args+=(--service_account_name="$service_account")
      fi
      "${create_args[@]}"
    fi
  fi
  echo "::endgroup::"
fi
