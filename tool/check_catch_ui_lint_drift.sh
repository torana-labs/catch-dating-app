#!/usr/bin/env bash
#
# Catch UI lint drift helper.
#
# Replaces retired diagnostic-specific UI/design wrappers. Enforcement lives
# in dart analyze; this script is the focused-report and aggregate zero gate.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash tool/check_catch_ui_lint_drift.sh [--summary|--count|--json [PATH]|--check|--code CODE|--label LABEL|--all|--self-test|--help]

Modes:
  default    Print summary plus matching diagnostics. Exit 1 if drift remains.
  --summary  Print summary only. Exit 1 if drift remains.
  --count    Print only the numeric drift count. Always exit 0.
  --json     Print a JSON count artifact. Optionally also write it to PATH. Always exit 0.
  --check    Fail when any catch_* diagnostic remains.
  --self-test  Verify parsing, completion semantics, and zero-gate anti-vacuity.
  --code     Count one Catch UI lint code.
  --label    Human-readable label for summary output.
  --all      Count all Catch UI lint codes.

Counts:
  Default: catch_no_raw_color, catch_no_raw_text_style, catch_no_raw_font_drift.
EOF
}

MODE="default"
CODE_REGEX="catch_no_raw_color|catch_no_raw_text_style|catch_no_raw_font_drift"
LABEL="color/text/font"
JSON_PATH=""
SELF_TEST="false"
dart_bin="${DART_BIN:-dart}"

while [ $# -gt 0 ]; do
  case "$1" in
    --summary)
      MODE="summary"
      shift
      ;;
    --count)
      MODE="count"
      shift
      ;;
    --check)
      MODE="check"
      CODE_REGEX="catch_[a-z0-9_]+"
      LABEL="all Catch UI lints"
      shift
      ;;
    --json)
      MODE="json"
      if [ $# -gt 1 ] && [[ "$2" != --* ]]; then
        JSON_PATH="$2"
        shift 2
      else
        shift
      fi
      ;;
    --code)
      if [ $# -lt 2 ]; then
        usage >&2
        exit 2
      fi
      CODE_REGEX="$2"
      LABEL="$2"
      shift 2
      ;;
    --label)
      if [ $# -lt 2 ]; then
        usage >&2
        exit 2
      fi
      LABEL="$2"
      shift 2
      ;;
    --all)
      CODE_REGEX="catch_[a-z0-9_]+"
      LABEL="all Catch UI lints"
      shift
      ;;
    --self-test)
      SELF_TEST="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 2
      ;;
  esac
done

cd "$(dirname "${BASH_SOURCE[0]}")/.."

collect_diagnostics() {
  local output="$1"
  local code_regex="$2"
  awk -F'|' -v code_regex="$code_regex" '
    tolower($3) ~ ("^(" code_regex ")$") {
      print
    }
  ' <<<"$output"
}

analysis_is_complete() {
  local status="$1"
  local output="$2"
  if { [[ "$status" -eq 0 ]] || [[ "$status" -eq 2 ]]; } &&
    ! grep -Eq '^ERROR\||An error occurred while executing an analyzer plugin' <<<"$output"; then
    echo "true"
  else
    echo "false"
  fi
}

enforce_zero_diagnostics() {
  local diagnostics="$1"
  if [[ -n "${diagnostics//[[:space:]]/}" ]]; then
    echo "Catch UI zero-diagnostic gate failed:" >&2
    printf '%s\n' "$diagnostics" >&2
    return 1
  fi
  echo "Catch UI zero-diagnostic gate passed (0 findings)."
}

if [[ "$SELF_TEST" == "true" ]]; then
  fixture=$'WARNING|STATIC_WARNING|CATCH_NO_RAW_COLOR|/tmp/catch_dating_app/lib/catch_widget.dart|1|1|1|Use a named role.\nINFO|LINT|UNRELATED_RULE|/tmp/catch_no_raw_text_style.dart|2|1|1|Message mentions catch_no_raw_font_drift.\nWARNING|STATIC_WARNING|CATCH_NO_RAW_TEXT_STYLE|/tmp/plain.dart|3|1|1|Use CatchTextStyles.'
  result="$(collect_diagnostics "$fixture" 'catch_[a-z0-9_]+')"
  if [[ "$(printf '%s\n' "$result" | sed '/^$/d' | wc -l | tr -d ' ')" != "2" ]]; then
    echo "Catch UI lint drift parser self-test failed." >&2
    exit 1
  fi
  if grep -q 'UNRELATED_RULE' <<<"$result"; then
    echo "Catch UI lint drift parser matched catch_* text outside the diagnostic code field." >&2
    exit 1
  fi
  if [[ "$(analysis_is_complete 2 "$fixture")" != "true" ]]; then
    echo "Catch UI lint drift parser marked a completed warning scan incomplete." >&2
    exit 1
  fi
  error_fixture='ERROR|COMPILE_TIME_ERROR|UNDEFINED_IDENTIFIER|/tmp/plain.dart|1|1|1|Undefined name.'
  if [[ "$(analysis_is_complete 2 "$error_fixture")" != "false" ]]; then
    echo "Catch UI lint drift parser marked an analyzer error complete." >&2
    exit 1
  fi
  if enforce_zero_diagnostics "$result" >/dev/null 2>&1; then
    echo "Catch UI zero-diagnostic gate accepted seeded Catch findings." >&2
    exit 1
  fi
  if ! enforce_zero_diagnostics "" >/dev/null; then
    echo "Catch UI zero-diagnostic gate rejected an empty diagnostic set." >&2
    exit 1
  fi
  echo "Catch UI lint zero-gate self-test passed."
  exit 0
fi

if [[ -n "${CATCH_UI_ANALYZE_OUTPUT_PATH:-}" ]]; then
  if [[ ! -f "$CATCH_UI_ANALYZE_OUTPUT_PATH" ]]; then
    echo "Cached analyzer output does not exist: $CATCH_UI_ANALYZE_OUTPUT_PATH" >&2
    exit 1
  fi
  analyze_output="$(cat "$CATCH_UI_ANALYZE_OUTPUT_PATH")"
  analyze_status="${CATCH_UI_ANALYZE_STATUS:-2}"
else
  set +e
  analyze_output="$("$dart_bin" analyze --format machine 2>&1)"
  analyze_status=$?
  set -e
fi

analyze_complete="$(analysis_is_complete "$analyze_status" "$analyze_output")"

tmp="$(mktemp "${TMPDIR:-/tmp}/catch-ui-lint-drift.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

collect_diagnostics "$analyze_output" "$CODE_REGEX" >"$tmp"

if [ -s "$tmp" ]; then
  total="$(wc -l <"$tmp" | tr -d ' ')"
else
  total=0
fi

if [ "$MODE" = "count" ]; then
  echo "$total"
  exit 0
fi

if [ "$MODE" = "check" ]; then
  if [[ "$analyze_complete" != "true" ]]; then
    echo "Catch UI zero-diagnostic gate cannot run because dart analyze was incomplete." >&2
    echo "$analyze_output" >&2
    exit 1
  fi
  enforce_zero_diagnostics "$(cat "$tmp")"
  exit $?
fi

json_escape() {
  sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' <<<"$1"
}

if [ "$MODE" = "json" ]; then
  json_tmp="$(mktemp "${TMPDIR:-/tmp}/catch-ui-lint-drift-json.XXXXXX")"
  {
    echo "{"
    printf '  "label": "%s",\n' "$(json_escape "$LABEL")"
    printf '  "codeRegex": "%s",\n' "$(json_escape "$CODE_REGEX")"
    printf '  "analyzeStatus": %s,\n' "$analyze_status"
    if [[ "$analyze_complete" == "true" ]]; then
      echo '  "complete": true,'
    else
      echo '  "complete": false,'
    fi
    printf '  "total": %s,\n' "$total"
    echo '  "counts": {'
    awk -F'|' '
      {
        code = tolower($3)
        counts[code] += 1
      }
      END {
        for (code in counts) print code "\t" counts[code]
      }
    ' "$tmp" | sort | awk '
      BEGIN { first = 1 }
      {
        if (!first) printf ",\n"
        first = 0
        printf "    \"%s\": %d", $1, $2
      }
      END {
        if (!first) printf "\n"
      }
    '
    echo '  }'
    echo "}"
  } >"$json_tmp"

  if [ -n "$JSON_PATH" ]; then
    cat "$json_tmp" >"$JSON_PATH"
  fi
  cat "$json_tmp"
  rm -f "$json_tmp"
  exit 0
fi

echo "Catch UI lint drift ($LABEL): $total"

if [ "$total" -gt 0 ]; then
  echo ""
  echo "By code:"
  awk -F'|' '
    {
      code = tolower($3)
      counts[code] += 1
    }
    END {
      for (code in counts) print counts[code] "\t" code
    }
  ' "$tmp" | sort -rn

  if [ "$MODE" != "summary" ]; then
    echo ""
    echo "Findings:"
    cat "$tmp"
  fi

  echo ""
  echo "Route these findings through the documented Catch semantic primitives."
  exit 1
fi

if [ "$analyze_status" -ne 0 ] &&
  grep -Eq '^ERROR\|' <<<"$analyze_output"; then
  echo ""
  echo "dart analyze failed with errors outside $LABEL drift. Output:"
  echo "$analyze_output"
  exit "$analyze_status"
fi

echo "No migrated Catch UI lint drift found."
