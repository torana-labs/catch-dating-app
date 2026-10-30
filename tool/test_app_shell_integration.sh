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

if [[ "${mode}" == "--self-test" ]]; then
  runner="${BASH_SOURCE[0]}"
  headless_plan="$(
    APP_SHELL_INTEGRATION_DRY_RUN=true bash "${runner}" headless smoke
  )"
  [[ "${headless_plan}" == *"test/integration/app_shell_smoke_test.dart"* ]]
  [[ "${headless_plan}" != *"app_shell_event_flows_test.dart"* ]]

  headless_all_plan="$(
    APP_SHELL_INTEGRATION_DRY_RUN=true bash "${runner}" headless all
  )"
  [[ "${headless_all_plan}" == *"test/integration/host_app_shell_journeys_test.dart"* ]]

  native_plan="$(
    APP_SHELL_INTEGRATION_DRY_RUN=true bash "${runner}" macos smoke
  )"
  [[ "${native_plan}" == *"--dart-define=APP_SHELL_NATIVE_INTEGRATION=true"* ]]
  [[ "${native_plan}" == *"integration_test/app_shell_smoke_test.dart"* ]]
  [[ "${native_plan}" == *"-d macos"* ]]
  [[ "${native_plan}" != *"app_shell_event_flows_test.dart"* ]]

  # The macOS runner lives in apps/consumer, and Flutter runs device tests only
  # from that project's own integration_test/ directory, so every native suite
  # needs a Consumer entrypoint that delegates to the shared suite.
  native_all_plan="$(
    APP_SHELL_INTEGRATION_DRY_RUN=true bash "${runner}" macos all
  )"
  runner_root="$(cd "$(dirname "${runner}")/.." && pwd)"
  native_suite_count=0
  while IFS= read -r suite; do
    native_suite_count=$((native_suite_count + 1))
    if [[ ! -f "${runner_root}/apps/consumer/${suite}" ]]; then
      echo "Native suite ${suite} has no apps/consumer/${suite} entrypoint." >&2
      exit 1
    fi
  done < <(grep -oE 'integration_test/[A-Za-z0-9_]+\.dart' <<<"${native_all_plan}" | sort -u)
  if ((native_suite_count == 0)); then
    echo "Expected the native plan to name at least one suite." >&2
    exit 1
  fi

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

native_suites=(
  integration_test/app_shell_smoke_test.dart
  integration_test/app_shell_organizer_flows_test.dart
  integration_test/app_shell_event_flows_test.dart
  integration_test/app_shell_dashboard_flows_test.dart
  integration_test/app_shell_catches_flows_test.dart
  integration_test/app_shell_chat_settings_review_flows_test.dart
  integration_test/app_shell_regression_test.dart
  integration_test/host_app_shell_journeys_test.dart
)

if [[ "${scope}" != "all" && "${scope}" != "smoke" ]]; then
  echo "Unknown app-shell integration scope: ${scope} (expected all or smoke)." >&2
  exit 64
fi

run_flutter() {
  if [[ "${APP_SHELL_INTEGRATION_DRY_RUN:-false}" == "true" ]]; then
    printf '==> '
    printf '%q ' "$@"
    printf '\n'
    return
  fi
  "$@"
}

if [[ "${mode}" == "headless" ]]; then
  headless_suites=(
    test/integration/app_shell_smoke_test.dart
    test/integration/app_shell_organizer_flows_test.dart
    test/integration/app_shell_event_flows_test.dart
    test/integration/app_shell_dashboard_flows_test.dart
    test/integration/app_shell_catches_flows_test.dart
    test/integration/app_shell_chat_settings_review_flows_test.dart
    test/integration/app_shell_regression_test.dart
    test/integration/host_app_shell_journeys_test.dart
  )
  if [[ "${scope}" == "smoke" ]]; then
    headless_suites=(test/integration/app_shell_smoke_test.dart)
  fi
  echo "==> flutter test --concurrency=1 test/integration"
  run_flutter flutter test --concurrency=1 "${headless_suites[@]}"
  exit 0
fi

selected_native_suites=("${native_suites[@]}")
if [[ "${scope}" == "smoke" ]]; then
  selected_native_suites=(integration_test/app_shell_smoke_test.dart)
fi

for suite in "${selected_native_suites[@]}"; do
  echo "==> flutter test ${suite} -d ${mode} (native integration binding)"
  run_native_flutter_test flutter test \
    --dart-define=APP_SHELL_NATIVE_INTEGRATION=true \
    "${suite}" \
    -d "${mode}"
done
