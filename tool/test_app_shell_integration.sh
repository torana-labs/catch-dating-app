#!/usr/bin/env bash
set -euo pipefail

is_retryable_native_dependency_failure() {
  local log_file="$1"
  grep -Eq 'Error running pod install' "$log_file" &&
    grep -Eq \
      'CDN: trunk .*Response: (429 429: Too Many Requests|Timeout was reached)|Response status code does not indicate success: 429|FirebaseFirestoreAbseilBinary.*(404|429)|refs/tags/[0-9.]+ .* is not a commit!' \
      "$log_file"
}

run_native_flutter_test() {
  if [[ "${APP_SHELL_INTEGRATION_DRY_RUN:-false}" == "true" ||
    ("${CI:-}" != "true" && "${GITHUB_ACTIONS:-}" != "true") ]]; then
    run_flutter "$@"
    return
  fi

  local max_attempts="${CATCH_NATIVE_SMOKE_MAX_ATTEMPTS:-3}"
  local retry_delay_seconds="${CATCH_NATIVE_SMOKE_RETRY_DELAY_SECONDS:-20}"
  if [[ ! "$max_attempts" =~ ^[1-5]$ ]]; then
    echo "Native smoke retry attempts must be an integer from 1 to 5." >&2
    return 64
  fi
  if [[ ! "$retry_delay_seconds" =~ ^[0-9]+$ ]] ||
    ((10#$retry_delay_seconds > 60)); then
    echo "Native smoke retry delay must be an integer from 0 to 60." >&2
    return 64
  fi

  local retry_log
  retry_log="$(mktemp "${TMPDIR:-/tmp}/catch-native-smoke.XXXXXX")"
  local attempt=1
  local flutter_status=0
  local tee_status=0
  local -a pipeline_status=()
  while ((attempt <= max_attempts)); do
    : >"$retry_log"
    set +e
    "$@" 2>&1 | tee "$retry_log"
    pipeline_status=("${PIPESTATUS[@]}")
    set -e
    flutter_status="${pipeline_status[0]}"
    tee_status="${pipeline_status[1]}"

    if ((tee_status != 0)); then
      rm -f "$retry_log"
      return "$tee_status"
    fi
    if ((flutter_status == 0)); then
      rm -f "$retry_log"
      return 0
    fi
    if ! is_retryable_native_dependency_failure "$retry_log" ||
      ((attempt == max_attempts)); then
      rm -f "$retry_log"
      return "$flutter_status"
    fi

    attempt=$((attempt + 1))
    echo "::warning title=CocoaPods dependency retry::Retrying native smoke after a verified transient CocoaPods dependency failure (attempt $attempt/$max_attempts)."
    if ((retry_delay_seconds > 0)); then
      sleep "$retry_delay_seconds"
    fi
  done
}

mode="${1:-headless}"
scope="${2:-all}"
runner="${BASH_SOURCE[0]}"
runner_root="$(cd "$(dirname "${runner}")/.." && pwd)"

# Each suite is <project>:<path>, and runs from that Flutter project.
# `flutter test` runs device tests only from the current project's own
# integration_test/ directory, and each app keeps its macOS runner in its own
# project, so the Consumer suites run from apps/consumer and the Host journeys
# from apps/host. The headless entrypoints under test/integration/ import the
# same suites through the fast test binding.
native_suites=(
  apps/consumer:integration_test/app_shell_smoke_test.dart
  apps/consumer:integration_test/app_shell_organizer_flows_test.dart
  apps/consumer:integration_test/app_shell_event_flows_test.dart
  apps/consumer:integration_test/app_shell_dashboard_flows_test.dart
  apps/consumer:integration_test/app_shell_catches_flows_test.dart
  apps/consumer:integration_test/app_shell_chat_settings_review_flows_test.dart
  apps/consumer:integration_test/app_shell_regression_test.dart
  apps/host:integration_test/host_app_shell_journeys_test.dart
)
# The bounded native scope boots each app's runner once.
native_smoke_suites=(
  apps/consumer:integration_test/app_shell_smoke_test.dart
  apps/host:integration_test/host_app_shell_journeys_test.dart
)
headless_suites=(
  .:test/integration/app_shell_smoke_test.dart
  .:test/integration/app_shell_organizer_flows_test.dart
  .:test/integration/app_shell_event_flows_test.dart
  .:test/integration/app_shell_dashboard_flows_test.dart
  .:test/integration/app_shell_catches_flows_test.dart
  .:test/integration/app_shell_chat_settings_review_flows_test.dart
  .:test/integration/app_shell_regression_test.dart
  apps/host:test/integration/host_app_shell_journeys_test.dart
)
headless_smoke_suites=(.:test/integration/app_shell_smoke_test.dart)

if [[ "${mode}" == "--self-test" ]]; then
  headless_plan="$(
    APP_SHELL_INTEGRATION_DRY_RUN=true bash "${runner}" headless smoke
  )"
  [[ "${headless_plan}" == *"test/integration/app_shell_smoke_test.dart"* ]]
  [[ "${headless_plan}" != *"app_shell_event_flows_test.dart"* ]]

  headless_all_plan="$(
    APP_SHELL_INTEGRATION_DRY_RUN=true bash "${runner}" headless all
  )"
  [[ "${headless_all_plan}" == *"==> [.] flutter test --concurrency=1 test/integration/app_shell_smoke_test.dart"* ]]
  [[ "${headless_all_plan}" == *"==> [apps/host] flutter test --concurrency=1 test/integration/host_app_shell_journeys_test.dart"* ]]

  native_plan="$(
    APP_SHELL_INTEGRATION_DRY_RUN=true bash "${runner}" macos smoke
  )"
  [[ "${native_plan}" == *"--dart-define=APP_SHELL_NATIVE_INTEGRATION=true"* ]]
  [[ "${native_plan}" == *"[apps/consumer] flutter test --dart-define=APP_SHELL_NATIVE_INTEGRATION=true integration_test/app_shell_smoke_test.dart -d macos"* ]]
  [[ "${native_plan}" == *"[apps/host] flutter test --dart-define=APP_SHELL_NATIVE_INTEGRATION=true integration_test/host_app_shell_journeys_test.dart -d macos"* ]]
  [[ "${native_plan}" != *"app_shell_event_flows_test.dart"* ]]

  # Every suite must exist in the project it runs from, and every native
  # project must ship the macOS runner the device run builds.
  for suite in "${native_suites[@]}" "${headless_suites[@]}"; do
    if [[ ! -f "${runner_root}/${suite%%:*}/${suite#*:}" ]]; then
      echo "Suite ${suite#*:} is missing from ${suite%%:*}." >&2
      exit 1
    fi
  done
  for suite in "${native_suites[@]}"; do
    if [[ ! -f "${runner_root}/${suite%%:*}/macos/Runner.xcodeproj/project.pbxproj" ]]; then
      echo "Native suite ${suite#*:} runs from ${suite%%:*}, which has no macOS runner." >&2
      exit 1
    fi
  done

  if APP_SHELL_INTEGRATION_DRY_RUN=true \
    bash "${runner}" headless unknown >/dev/null 2>&1; then
    echo "Expected an unknown scope to fail closed." >&2
    exit 1
  fi

  retry_fixture="$(mktemp "${TMPDIR:-/tmp}/catch-native-smoke-self-test.XXXXXX")"
  printf '%s\n' \
    '[!] CDN: trunk URL could not be downloaded. Response: 429 429: Too Many Requests' \
    'Failed to load integration_test/app_shell_smoke_test.dart: Error running pod install' \
    >"${retry_fixture}"
  if ! is_retryable_native_dependency_failure "${retry_fixture}"; then
    rm -f "${retry_fixture}"
    echo "Expected a verified CocoaPods rate limit to be retryable." >&2
    exit 1
  fi
  printf '%s\n' \
    'Expected: exactly one matching candidate' \
    'Actual: no matching candidates' \
    >"${retry_fixture}"
  if is_retryable_native_dependency_failure "${retry_fixture}"; then
    rm -f "${retry_fixture}"
    echo "Expected an app assertion failure to fail immediately." >&2
    exit 1
  fi
  rm -f "${retry_fixture}"

  retry_counter="$(mktemp "${TMPDIR:-/tmp}/catch-native-smoke-counter.XXXXXX")"
  printf '0\n' >"${retry_counter}"
  if ! CI=true CATCH_NATIVE_SMOKE_MAX_ATTEMPTS=2 \
    CATCH_NATIVE_SMOKE_RETRY_DELAY_SECONDS=0 \
    run_native_flutter_test bash -c '
      counter="$1"
      attempt="$(( $(<"$counter") + 1 ))"
      printf "%s\n" "$attempt" >"$counter"
      if ((attempt == 1)); then
        echo "[!] CDN: trunk request failed. Response: 429 429: Too Many Requests"
        echo "Error running pod install"
        exit 1
      fi
    ' _ "${retry_counter}"; then
    rm -f "${retry_counter}"
    echo "Expected a verified CocoaPods failure to pass on bounded retry." >&2
    exit 1
  fi
  if [[ "$(<"${retry_counter}")" != "2" ]]; then
    rm -f "${retry_counter}"
    echo "Expected exactly two native smoke attempts." >&2
    exit 1
  fi

  printf '0\n' >"${retry_counter}"
  if CI=true CATCH_NATIVE_SMOKE_MAX_ATTEMPTS=2 \
    CATCH_NATIVE_SMOKE_RETRY_DELAY_SECONDS=0 \
    run_native_flutter_test bash -c '
      counter="$1"
      attempt="$(( $(<"$counter") + 1 ))"
      printf "%s\n" "$attempt" >"$counter"
      echo "Expected: one matching candidate"
      echo "Actual: no matching candidates"
      exit 1
    ' _ "${retry_counter}"; then
    rm -f "${retry_counter}"
    echo "Expected an app assertion failure to remain failed." >&2
    exit 1
  fi
  if [[ "$(<"${retry_counter}")" != "1" ]]; then
    rm -f "${retry_counter}"
    echo "Expected an app assertion failure to skip retry." >&2
    exit 1
  fi
  rm -f "${retry_counter}"

  echo "App-shell integration runner selection tests passed."
  exit 0
fi

if [[ "${scope}" != "all" && "${scope}" != "smoke" ]]; then
  echo "Unknown app-shell integration scope: ${scope} (expected all or smoke)." >&2
  exit 64
fi

run_flutter() {
  if [[ "${APP_SHELL_INTEGRATION_DRY_RUN:-false}" == "true" ]]; then
    printf '%q ' "$@"
    printf '\n'
    return
  fi
  "$@"
}

# Runs a command from <project>, printing it with the project in the plan.
run_in_project() {
  local project="$1"
  local runner_fn="$2"
  shift 2
  if [[ "${APP_SHELL_INTEGRATION_DRY_RUN:-false}" == "true" ]]; then
    printf '==> [%s] ' "${project}"
    run_flutter "$@"
    return
  fi
  echo "==> [${project}] $*"
  (cd "${runner_root}/${project}" && "${runner_fn}" "$@")
}

if [[ "${mode}" == "headless" ]]; then
  selected_suites=("${headless_suites[@]}")
  if [[ "${scope}" == "smoke" ]]; then
    selected_suites=("${headless_smoke_suites[@]}")
  fi
  # One flutter test per project, in suite order.
  projects=()
  for suite in "${selected_suites[@]}"; do
    project="${suite%%:*}"
    if [[ " ${projects[*]} " != *" ${project} "* ]]; then
      projects+=("${project}")
    fi
  done
  for project in "${projects[@]}"; do
    files=()
    for suite in "${selected_suites[@]}"; do
      if [[ "${suite%%:*}" == "${project}" ]]; then
        files+=("${suite#*:}")
      fi
    done
    run_in_project "${project}" run_flutter flutter test --concurrency=1 "${files[@]}"
  done
  exit 0
fi

selected_suites=("${native_suites[@]}")
if [[ "${scope}" == "smoke" ]]; then
  selected_suites=("${native_smoke_suites[@]}")
fi

for suite in "${selected_suites[@]}"; do
  run_in_project "${suite%%:*}" run_native_flutter_test flutter test \
    --dart-define=APP_SHELL_NATIVE_INTEGRATION=true \
    "${suite#*:}" \
    -d "${mode}"
done
