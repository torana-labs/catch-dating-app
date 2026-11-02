#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
cd "$repo_root"

max_lines="${WIDGET_CLEANUP_SCAN_MAX_LINES:-80}"

if [[ "${1:-}" == "--check" ]]; then
  summary="$(bash "$0" --summary)"
  printf '%s\n' "$summary"
  printf '%s\n' "$summary" | node tool/lib/widget_cleanup_gate.mjs
  exit 0
fi

if [[ "${1:-}" == "--summary" && "${WIDGET_CLEANUP_SCAN_FORCE_FULL:-}" != "1" ]]; then
  summary_key_for() {
    case "$1" in
      "Raw Material/Cupertino button candidates that should use CatchButton") echo "raw_material_button_candidates" ;;
      "Raw text input candidates that should use CatchField.input or a field-specific primitive") echo "raw_text_input_candidates" ;;
      "Fixed-white pill CTA candidates that should use CatchButtonVariant.light") echo "fixed_white_pill_cta_candidates" ;;
      "Raw range sliders that should use CatchRangeInput") echo "raw_range_slider_candidates" ;;
      "Raw +/- number steppers that should use CatchStepper") echo "raw_number_stepper_candidates" ;;
      "Feature tappables that may need semantic keys/tooltips") echo "feature_tappable_candidates" ;;
      "Literal SizedBox spacing candidates that should use gap constants or CatchSpacing") echo "literal_sized_box_spacing_candidates" ;;
      "Raw app-facing TextStyle candidates") echo "raw_text_style_candidates" ;;
      *) echo "" ;;
    esac
  }

  full_output="$(
    WIDGET_CLEANUP_SCAN_FORCE_FULL=1 \
      WIDGET_CLEANUP_SCAN_MAX_LINES=0 \
      bash "$0"
  )"

  echo "Widget cleanup candidate scan summary"
  current_key=""
  while IFS= read -r line; do
    if [[ "$line" == "==> "* ]]; then
      title="${line#==> }"
      current_key="$(summary_key_for "$title")"
      continue
    fi
    if [[ -z "$current_key" ]]; then
      continue
    fi
    if [[ "$line" == "No matches." ]]; then
      echo "  $current_key: 0"
      current_key=""
      continue
    fi
    if [[ "$line" =~ ^([0-9]+)[[:space:]]match\(es\)\. ]]; then
      echo "  $current_key: ${BASH_REMATCH[1]}"
      current_key=""
    fi
  done <<<"$full_output"
  exit 0
fi

common_globs=(
  --glob '!**/*.g.dart'
  --glob '!**/*.freezed.dart'
  --glob '!**/*_controller.dart'
  --glob '!**/*_notifier.dart'
  --glob '!**/data/**'
  --glob '!packages/catch_ui/lib/src/primitives/catch_gap.dart'
  --glob '!build/**'
)

scan() {
  local title="$1"
  local pattern="$2"
  shift 2

  echo
  echo "==> $title"
  local output
  output="$(rg -n \
    "${common_globs[@]}" \
    "$pattern" "$@" | sort -t: -k1,1 -k2,2n -u || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_tappables() {
  echo
  echo "==> Feature tappables that may need semantic keys/tooltips"
  local raw
  raw="$(rg -n \
    "${common_globs[@]}" \
    'GestureDetector\(|InkWell\(|IconButton\(|(^|[^A-Za-z])TextButton\(' \
    lib/*/presentation | sort -t: -k1,1 -k2,2n -u || true)"

  local output=""
  while IFS=: read -r file line _; do
    [[ -z "$file" || -z "$line" ]] && continue
    local start=$((line > 28 ? line - 28 : 1))
    local end=$((line + 20))
    local context
    context="$(sed -n "${start},${end}p" "$file")"
    local line_text
    line_text="$(sed -n "${line}p" "$file")"

    if grep -Eq 'Container\(color:' <<<"$line_text"; then
      continue
    fi

    # The scan is looking for unresolved custom tap targets. Built-in text
    # buttons, icon buttons with tooltips, and tappables already wrapped in
    # Semantics/Tooltip are considered reviewed for this triage pass.
    if grep -Eq 'Semantics\(|Tooltip\(|tooltip:' <<<"$context"; then
      continue
    fi
    if grep -Eq '(^|[^A-Za-z])TextButton\(' <<<"$(sed -n "${line}p" "$file")" &&
      grep -Eq 'child: (const )?Text\(' <<<"$context"; then
      continue
    fi

    output+="${file}:${line}:$(sed -n "${line}p" "$file")"$'\n'
  done <<<"$raw"

  output="$(printf '%s\n' "$output" | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_white_pill_ctas() {
  echo
  echo "==> Fixed-white pill CTA candidates that should use CatchButtonVariant.light"
  local raw
  raw="$(rg -n \
    "${common_globs[@]}" \
    'backgroundColor: Colors\.white\b|color: Colors\.white\b' \
    lib/kernel lib/platform lib/pages lib/routing/shell lib/contexts/*/parts lib/*/presentation | sort -t: -k1,1 -k2,2n -u || true)"

  local output=""
  while IFS=: read -r file line _; do
    [[ -z "$file" || -z "$line" ]] && continue
    local start=$((line > 14 ? line - 14 : 1))
    local end=$((line + 18))
    local context
    context="$(sed -n "${start},${end}p" "$file")"
    local line_text
    line_text="$(sed -n "${line}p" "$file")"

    # Solid white CatchButton overrides should use the light variant so the
    # foreground stays fixed to the light palette instead of ambient dark-mode
    # text tokens.
    if grep -Eq 'CatchButton\(' <<<"$context" &&
      grep -Eq 'backgroundColor: Colors\.white,' <<<"$context"; then
      output+="${file}:${line}:${line_text}"$'\n'
      continue
    fi

    # Button-looking white pills inside tappable cards should still use the
    # button primitive in non-interactive display mode.
    if grep -Eq 'color: Colors\.white,' <<<"$line_text" &&
      grep -Eq '(Container|DecoratedBox)\(' <<<"$context" &&
      grep -Eq 'Text\(' <<<"$context" &&
      grep -Eq 'alignment: Alignment\.center|height: (48|50|56),' <<<"$context" &&
      grep -Eq 'CatchRadius\.pill|BorderRadius\.circular' <<<"$context"; then
      output+="${file}:${line}:${line_text}"$'\n'
    fi
  done <<<"$raw"

  output="$(printf '%s\n' "$output" | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_raw_material_buttons() {
  echo
  echo "==> Raw Material/Cupertino button candidates that should use CatchButton"
  local output
  output="$(rg -n \
    "${common_globs[@]}" \
    '(^|[^A-Za-z])(ElevatedButton|OutlinedButton|FilledButton|TextButton|CupertinoButton|FloatingActionButton)\(' \
    lib/kernel lib/platform lib/pages lib/routing/shell lib/contexts/*/parts lib/*/presentation \
    --glob '!packages/catch_ui/lib/src/components/catch_button.dart' || true)"

  output="$(printf '%s\n' "$output" | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_raw_text_inputs() {
  echo
  echo "==> Raw text input candidates that should use CatchField.input or a field-specific primitive"
  local output
  output="$(rg -n \
    "${common_globs[@]}" \
    '(^|[^A-Za-z])(TextField|TextFormField)\(' \
    lib/kernel lib/platform lib/pages lib/routing/shell lib/contexts/*/parts lib/*/presentation \
    --glob '!packages/catch_ui/lib/src/components/catch_field.dart' \
    --glob '!packages/catch_ui/lib/src/components/catch_search_field.dart' \
    --glob '!packages/catch_ui/lib/src/components/catch_code_input.dart' || true)"

  output="$(printf '%s\n' "$output" | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_raw_range_sliders() {
  echo
  echo "==> Raw range sliders that should use CatchRangeInput"
  local output
  output="$(rg -n \
    "${common_globs[@]}" \
    '(^|[^A-Za-z])RangeSlider\(|SliderTheme\(' \
    lib/kernel lib/platform lib/pages lib/routing/shell lib/contexts/*/parts lib/*/presentation \
    --glob '!packages/catch_ui/lib/src/components/catch_range_input.dart' || true)"

  output="$(printf '%s\n' "$output" | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_raw_number_steppers() {
  echo
  echo "==> Raw +/- number steppers that should use CatchStepper"
  local raw
  raw="$(rg -n \
    "${common_globs[@]}" \
    'Icons\.(add|remove)_rounded|Icons\.(add|remove)\b' \
    lib/kernel lib/platform lib/pages lib/routing/shell lib/contexts/*/parts lib/*/presentation \
    --glob '!packages/catch_ui/lib/src/components/catch_stepper.dart' || true)"

  local output=""
  while IFS=: read -r file line _; do
    [[ -z "$file" || -z "$line" ]] && continue
    local start=$((line > 24 ? line - 24 : 1))
    local end=$((line + 24))
    local context
    context="$(sed -n "${start},${end}p" "$file")"
    local line_text
    line_text="$(sed -n "${line}p" "$file")"

    # Flag feature-local increment/decrement controls, not standalone add
    # buttons like photo upload or FAB-style actions.
    if grep -Eq 'Icons\.(remove|remove_rounded)' <<<"$context" &&
      grep -Eq 'Icons\.(add|add_rounded)' <<<"$context" &&
      grep -Eq 'IconButton\(' <<<"$context" &&
      ! grep -Eq 'CatchStepper\(' <<<"$context"; then
      output+="${file}:${line}:${line_text}"$'\n'
    fi
  done <<<"$raw"

  output="$(printf '%s\n' "$output" | sort -t: -k1,1 -k2,2n -u | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_literal_sized_box_spacing() {
  echo
  echo "==> Literal SizedBox spacing candidates that should use gap constants or CatchSpacing"
  local output
  output="$(rg -n \
    "${common_globs[@]}" \
    'const SizedBox\((height|width): [0-9]' \
    lib/kernel lib/platform lib/pages lib/routing/shell lib/contexts/*/parts lib/*/presentation || true)"

  output="$(printf '%s\n' "$output" | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

scan_raw_text_styles() {
  echo
  echo "==> Raw app-facing TextStyle candidates"
  local output
  output="$(rg -n \
    "${common_globs[@]}" \
    '(^|[^A-Za-z])TextStyle\(' \
    lib/contexts/*/parts lib/platform/media lib/pages/startup lib/*/presentation \
    --glob '!packages/catch_ui/lib/src/components/catch_code_input.dart' \
    --glob '!packages/catch_ui/lib/src/components/catch_top_bar.dart' || true)"

  output="$(printf '%s\n' "$output" | sed '/^$/d' || true)"
  if [[ -z "$output" ]]; then
    echo "No matches."
    return
  fi

  local count
  count="$(printf '%s\n' "$output" | wc -l | tr -d ' ')"
  echo "$count match(es). Showing first $max_lines:"
  printf '%s\n' "$output" | sed -n "1,${max_lines}p"
}

echo "Widget cleanup candidate scan"
echo "This is a triage aid, not a failing lint. Review matches before editing."
echo "Limit output with WIDGET_CLEANUP_SCAN_MAX_LINES=<n>."

scan_raw_material_buttons

scan_raw_text_inputs

scan_white_pill_ctas

scan_raw_range_sliders

scan_raw_number_steppers

scan_tappables

scan_literal_sized_box_spacing

scan_raw_text_styles
