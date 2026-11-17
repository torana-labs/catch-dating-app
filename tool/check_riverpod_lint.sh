#!/usr/bin/env bash
set -euo pipefail

probe_path="test/riverpod_lint_probe.dart"

cleanup() {
  rm -f "$probe_path"
}
trap cleanup EXIT

cat > "$probe_path" <<'DART'
import 'package:flutter/widgets.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

void riverpodLintProbe() {
  runApp(const SizedBox.shrink());
}

@riverpod
int functionalRefProbe(Object ref) => 0;
DART

set +e
probe_output="$(dart analyze "$probe_path" 2>&1)"
probe_status=$?
set -e

if [[ $probe_status -eq 0 ]]; then
  echo "Riverpod lint probe unexpectedly passed." >&2
  exit 1
fi

# riverpod_lint registers every rule as a warning rule, which is on unless
# analysis_options.yaml turns it off. Two of them prove the set is live.
for code in missing_provider_scope functional_ref; do
  if [[ "$probe_output" != *"$code"* ]]; then
    echo "Riverpod lint probe did not emit $code." >&2
    echo "$probe_output" >&2
    exit 1
  fi
done

cleanup
echo "Riverpod lint plugin smoke check passed."
