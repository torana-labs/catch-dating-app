#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stub_dir="$(mktemp -d)"
state_dir="$(mktemp -d)"
trap 'rm -rf "$stub_dir" "$state_dir"' EXIT

# Never load the checkout's private config while testing the wrapper.
repo_root="$state_dir/repo"
mkdir -p "$repo_root/tool/env/dart_defines" "$repo_root/apps/host" "$repo_root/apps/consumer"
cp "$source_root/tool/flutter_with_env.sh" "$repo_root/tool/"
cp "$source_root/tool/write_ios_maps_key_xcconfig.sh" "$repo_root/tool/"
for environment in dev staging prod local; do
  printf '{}\n' >"$repo_root/tool/env/dart_defines/$environment.json"
done
: >"$repo_root/apps/host/pubspec.yaml"
: >"$repo_root/apps/consumer/pubspec.yaml"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'if [[ "$*" == *"resolve_app_target.mjs"* ]]; then' \
  '  if [[ "$*" == *"--role consumer"* ]]; then' \
  '    if [[ "$*" == *"--environment prod"* ]]; then' \
  '      printf "apps/consumer\tlib/main_prod.dart\tprod\tconsumerProd\n"' \
  '    else' \
  '      printf "apps/consumer\tlib/main_staging.dart\tstaging\tconsumerStaging\n"' \
  '    fi' \
  '  else' \
  '    printf "apps/host\tlib/main_prod.dart\thost-prod\thostProd\n"' \
  '  fi' \
  'fi' \
  >"$stub_dir/node"
chmod +x "$stub_dir/node"

printf '%s\n' \
  '#!/bin/bash' \
  'if [[ "${1:-}" == *"/tool/use_firebase_environment.sh" ]]; then' \
  '  exit 0' \
  'fi' \
  'exec /bin/bash "$@"' \
  >"$stub_dir/bash"
chmod +x "$stub_dir/bash"

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'counter_file="${FLUTTER_STUB_COUNT_FILE:?}"' \
  'count=0' \
  'if [[ -f "$counter_file" ]]; then count="$(<"$counter_file")"; fi' \
  'count=$((count + 1))' \
  'printf "%s\n" "$count" >"$counter_file"' \
  'if [[ -n "${FLUTTER_STUB_ARGS_FILE:-}" ]]; then printf "%s\n" "$@" >"$FLUTTER_STUB_ARGS_FILE"; fi' \
  'case "${FLUTTER_STUB_MODE:-success}" in' \
  '  tls-once)' \
  '    if [[ "$count" == "1" ]]; then' \
  '      echo "Error running pod install" >&2' \
  '      echo "fatal: unable to access '\''https://github.com/SDWebImage/SDWebImage.git/'\'': SSL certificate problem: self signed certificate" >&2' \
  '      exit 1' \
  '    fi' \
  '    ;;' \
  '  tls-always)' \
  '    echo "Error output from CocoaPods:" >&2' \
  '    echo "fatal: unable to access '\''https://github.com/razorpay/razorpay-customui-pod.git/'\'': SSL certificate problem: self signed certificate" >&2' \
  '    exit 1' \
  '    ;;' \
  '  compile-error)' \
  '    echo "Dart compilation failed" >&2' \
  '    exit 17' \
  '    ;;' \
  '  gradle-once)' \
  '    if [[ "$count" == "1" ]]; then' \
  '      echo "Exception in thread \"main\" java.net.SocketException: Unexpected end of file from server" >&2' \
  '      echo "  at org.gradle.wrapper.Download.downloadInternal(Download.java:58)" >&2' \
  '      echo "  at org.gradle.wrapper.Download.download(Download.java:44)" >&2' \
  '      exit 1' \
  '    fi' \
  '    ;;' \
  '  gradle-unrelated)' \
  '    echo "Exception in thread \"main\" java.net.SocketException: Unexpected end of file from server" >&2' \
  '    echo "  at com.example.ProductCompiler.compile(ProductCompiler.java:44)" >&2' \
  '    exit 19' \
  '    ;;' \
  'esac' \
  'exit 0' \
  >"$stub_dir/flutter"
chmod +x "$stub_dir/flutter"

expect_rejected() {
  local expected="$1"
  shift
  local output
  if output="$(PATH="$stub_dir:$PATH" bash "$repo_root/tool/flutter_with_env.sh" "$@" 2>&1)"; then
    echo "Expected command to reject mismatched app-target arguments: $*" >&2
    exit 1
  fi
  if [[ "$output" != *"$expected"* ]]; then
    echo "Expected rejection containing '$expected', got:" >&2
    echo "$output" >&2
    exit 1
  fi
}

expect_rejected \
  "resolves flavor 'host-prod'; caller supplied 'prod'" \
  prod --role host build ios --flavor prod
expect_rejected \
  "resolves entrypoint 'lib/main_prod.dart'; caller supplied 'lib/main_consumer_prod.dart'" \
  prod --role host build ios -t lib/main_consumer_prod.dart

acceptance_target="integration_test/cat151_razorpay_acceptance_harness.dart"
expect_rejected \
  "resolves entrypoint 'lib/main_staging.dart'; caller supplied 'integration_test/other.dart'" \
  staging --role consumer --platform ios run -d ios --profile -t integration_test/other.dart
expect_rejected \
  "does not permit '--'" \
  staging --role consumer --platform ios run -d ios --profile -- integration_test/other.dart
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role host --platform ios run -d ios --profile -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios --release -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios --debug -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  staging --role consumer --platform ios run -d ios --profile -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform web run -d chrome --profile -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d chrome --profile -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios -d chrome --profile \
  -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios --profile \
  --use-application-binary=unreviewed.ipa -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios --profile \
  --use-application-binary unreviewed.ipa -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios --profile --no-build \
  -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios --profile \
  --dart-define=USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER=true \
  -t "$acceptance_target"
expect_rejected \
  "permits only a profile-mode Consumer run on native production" \
  prod --role consumer --platform ios run -d ios --profile \
  -DUSE_FIREBASE_APP_CHECK_DEBUG_PROVIDER=true -t "$acceptance_target"

debug_provider_output="$(
  USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER=true \
    PATH="$stub_dir:$PATH" \
    bash "$repo_root/tool/flutter_with_env.sh" \
    prod --role consumer --platform ios run -d ios --profile \
    -t "$acceptance_target" 2>&1 || true
)"
if [[ "$debug_provider_output" != *"permits only a profile-mode Consumer run on native production"* ]]; then
  echo "Expected process-supplied App Check debug providers to be rejected." >&2
  exit 1
fi

acceptance_counter="$state_dir/acceptance-count"
acceptance_args="$state_dir/acceptance-args"
PATH="$stub_dir:$PATH" \
  FLUTTER_STUB_COUNT_FILE="$acceptance_counter" \
  FLUTTER_STUB_ARGS_FILE="$acceptance_args" \
  /bin/bash "$repo_root/tool/flutter_with_env.sh" \
  prod --role consumer --platform ios run -d ios --profile -t "$acceptance_target"
if [[ "$(<"$acceptance_counter")" != "1" ]] ||
  ! grep -Fxq "$acceptance_target" "$acceptance_args" ||
  ! grep -Fxq -- '--flavor' "$acceptance_args" ||
  ! grep -Fxq 'prod' "$acceptance_args"; then
  echo "Expected exact Consumer non-release acceptance target to run unchanged." >&2
  exit 1
fi

targeted_test_counter="$state_dir/targeted-test-count"
targeted_test_args="$state_dir/targeted-test-args"
PATH="$stub_dir:$PATH" \
  FLUTTER_STUB_COUNT_FILE="$targeted_test_counter" \
  FLUTTER_STUB_ARGS_FILE="$targeted_test_args" \
  /bin/bash "$repo_root/tool/flutter_with_env.sh" \
  staging --role consumer test test/example_test.dart
if [[ "$(<"$targeted_test_counter")" != "1" ]] ||
  ! grep -Fxq 'test/example_test.dart' "$targeted_test_args"; then
  echo "Expected ordinary positional Flutter test targets to remain supported." >&2
  exit 1
fi

run_stubbed_ios_build() {
  local mode="$1"
  local ci="$2"
  local counter_file="$3"
  local output_var="$4"
  local status_var="$5"
  local output
  local status
  set +e
  output="$(
    PATH="$stub_dir:$PATH" \
      CI="$ci" \
      GITHUB_ACTIONS=false \
      FLUTTER_STUB_MODE="$mode" \
      FLUTTER_STUB_COUNT_FILE="$counter_file" \
      CATCH_COCOAPODS_TLS_RETRY_DELAY_SECONDS=0 \
      /bin/bash "$repo_root/tool/flutter_with_env.sh" \
      dev --role host build ios --debug --simulator --no-codesign 2>&1
  )"
  status=$?
  set -e
  printf -v "$output_var" '%s' "$output"
  printf -v "$status_var" '%s' "$status"
}

retry_counter="$state_dir/retry-count"
run_stubbed_ios_build tls-once true "$retry_counter" retry_output retry_status
if [[ "$retry_status" != "0" || "$(<"$retry_counter")" != "2" ]]; then
  echo "Expected exact CocoaPods Git TLS failure to succeed on bounded retry." >&2
  echo "$retry_output" >&2
  exit 1
fi
if [[ "$retry_output" != *"Retrying the iOS Flutter build after a transient verified GitHub certificate failure (attempt 2/3)."* ]]; then
  echo "Expected a visible bounded-retry diagnostic." >&2
  echo "$retry_output" >&2
  exit 1
fi

compile_counter="$state_dir/compile-count"
run_stubbed_ios_build compile-error true "$compile_counter" compile_output compile_status
if [[ "$compile_status" != "17" || "$(<"$compile_counter")" != "1" ]]; then
  echo "Expected non-TLS compile failures to fail immediately without retry." >&2
  echo "$compile_output" >&2
  exit 1
fi

exhausted_counter="$state_dir/exhausted-count"
run_stubbed_ios_build tls-always true "$exhausted_counter" exhausted_output exhausted_status
if [[ "$exhausted_status" != "1" || "$(<"$exhausted_counter")" != "3" ]]; then
  echo "Expected CocoaPods Git TLS retries to stop after exactly three attempts." >&2
  echo "$exhausted_output" >&2
  exit 1
fi

run_stubbed_android_build() {
  local mode="$1"
  local ci="$2"
  local counter_file="$3"
  local output_var="$4"
  local status_var="$5"
  local output
  local status
  set +e
  output="$(
    PATH="$stub_dir:$PATH" \
      CI="$ci" \
      GITHUB_ACTIONS=false \
      FLUTTER_STUB_MODE="$mode" \
      FLUTTER_STUB_COUNT_FILE="$counter_file" \
      CATCH_GRADLE_WRAPPER_RETRY_DELAY_SECONDS=0 \
      /bin/bash "$repo_root/tool/flutter_with_env.sh" \
      dev --role host build appbundle --release 2>&1
  )"
  status=$?
  set -e
  printf -v "$output_var" '%s' "$output"
  printf -v "$status_var" '%s' "$status"
}

gradle_counter="$state_dir/gradle-count"
run_stubbed_android_build gradle-once true \
  "$gradle_counter" gradle_output gradle_status
if [[ "$gradle_status" != "0" || "$(<"$gradle_counter")" != "2" ]]; then
  echo "Expected exact Gradle wrapper download failure to succeed on bounded retry." >&2
  echo "$gradle_output" >&2
  exit 1
fi
if [[ "$gradle_output" != *"Retrying the Android Flutter build after a transient verified Gradle wrapper download failure (attempt 2/3)."* ]]; then
  echo "Expected a visible Gradle wrapper bounded-retry diagnostic." >&2
  echo "$gradle_output" >&2
  exit 1
fi

gradle_unrelated_counter="$state_dir/gradle-unrelated-count"
run_stubbed_android_build gradle-unrelated true \
  "$gradle_unrelated_counter" gradle_unrelated_output gradle_unrelated_status
if [[ "$gradle_unrelated_status" != "19" || "$(<"$gradle_unrelated_counter")" != "1" ]]; then
  echo "Expected unrelated Android network-like failures to fail without retry." >&2
  echo "$gradle_unrelated_output" >&2
  exit 1
fi

local_counter="$state_dir/local-count"
run_stubbed_ios_build tls-once false "$local_counter" local_output local_status
if [[ "$local_status" != "1" || "$(<"$local_counter")" != "1" ]]; then
  echo "Expected local Flutter builds to retain single-attempt behavior." >&2
  echo "$local_output" >&2
  exit 1
fi

echo "flutter_with_env app-target and bounded CI dependency retry checks passed."


cat >"$repo_root/.env.dev.local" <<'ENV'
GOOGLE_MAPS_IOS_API_KEY_DEV=fake-environment-key
FIREBASE_APP_CHECK_DEBUG_TOKEN=fake-environment-token
VERBOSE_AUTH_DEBUG_LOGS=
malformed PRIVATE_SENTINEL=do-not-report
UNREVIEWED_PRIVATE_NAME=fake-unreviewed-value
ENV
cat >"$repo_root/.env.local" <<'ENV'
GOOGLE_MAPS_IOS_API_KEY_DEV=fake-fallback-key
GOOGLE_MAPS_ANDROID_API_KEY_DEV=fake-fallback-android
FIREBASE_APP_CHECK_DEBUG_TOKEN=fake-fallback-token
VERBOSE_AUTH_DEBUG_LOGS=fake-fallback-flag
ENV
printf 'EMIT_OBSERVABILITY_SMOKE_EVENT=fake-ignored-root\n' >"$repo_root/.env"
provenance_output="$(env -i PATH="$PATH" FIREBASE_APP_CHECK_DEBUG_TOKEN= \
  /bin/bash "$repo_root/tool/flutter_with_env.sh" dev --config-sources 2>&1)"
for expected in \
  'FIREBASE_APP_CHECK_DEBUG_TOKEN source=processenv state=empty' \
  'GOOGLE_MAPS_IOS_API_KEY_DEV source=environment-local state=set' \
  'GOOGLE_MAPS_ANDROID_API_KEY_DEV source=local-fallback state=set' \
  'VERBOSE_AUTH_DEBUG_LOGS source=environment-local state=empty' \
  'EMIT_OBSERVABILITY_SMOKE_EVENT source=unset state=unset'; do
  [[ "$provenance_output" == *"$expected"* ]] || { echo "Incorrect configuration precedence: $expected" >&2; exit 1; }
done
if [[ "$provenance_output" == *fake-* || "$provenance_output" == *PRIVATE_SENTINEL* ||
  "$provenance_output" == *UNREVIEWED_PRIVATE_NAME* ]]; then
  echo "Configuration diagnostics leaked unreviewed names or values." >&2
  exit 1
fi
process_output="$(env -i PATH="$PATH" GOOGLE_MAPS_IOS_API_KEY_DEV=fake-process-value \
  /bin/bash -x "$repo_root/tool/flutter_with_env.sh" dev --config-sources 2>&1)"
[[ "$process_output" == *'GOOGLE_MAPS_IOS_API_KEY_DEV source=processenv state=set'* &&
  "$process_output" != *fake-* ]] || { echo "Process precedence or trace redaction failed." >&2; exit 1; }
local_output="$(env -i PATH="$PATH" /bin/bash "$repo_root/tool/flutter_with_env.sh" local --config-sources 2>&1)"
[[ "$local_output" != *'state=set'* && "$local_output" != *'state=empty'* ]] || {
  echo "Isolated local target loaded fallback files." >&2; exit 1;
}

# Use Node's subprocess launcher so SIGINT is not inherited as ignored from a
# shell background job. Only these synthetic keys/files enter the helper.
node --input-type=module - "$repo_root" <<'JS'
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn, spawnSync} from 'node:child_process';
const root = process.argv[2];
const helper = path.join(root, 'tool/write_ios_maps_key_xcconfig.sh');
const key = 'AIzaFakeOnlyNeverUsableKey000000000';
const env = {PATH: process.env.PATH, GOOGLE_MAPS_IOS_API_KEY_DEV: key};
const output = path.join(root, 'maps.xcconfig');
const invoke = (args, overrides = {}) => spawnSync('/bin/bash', [helper, 'dev', output, ...args], {
  env: {...env, ...overrides}, encoding: 'utf8', timeout: 10000,
});
for (const status of [0, 17]) {
  const result = invoke(['--temporary', '--', process.execPath, '-e',
    'const fs = require("node:fs"); const mode = fs.statSync(process.argv[1]).mode & 0o777; process.exit(mode === 0o600 ? Number(process.argv[2]) : 92);',
    output, String(status)]);
  assert.equal(result.status, status, 'build status must survive cleanup');
  assert.equal(fs.existsSync(output), false, 'normal/failure output cleanup');
  assert.equal((result.stdout + result.stderr).includes(key), false);
}
fs.writeFileSync(output, 'fake-existing-file');
assert.notEqual(invoke(['--temporary', '--', '/bin/bash', '-c', 'exit 0']).status, 0);
assert.equal(fs.readFileSync(output, 'utf8'), 'fake-existing-file', 'preserve existing output');
fs.unlinkSync(output);
const symlinkTarget = path.join(root, 'existing-target');
fs.writeFileSync(symlinkTarget, 'fake-existing-target');
fs.symlinkSync(symlinkTarget, output);
assert.notEqual(invoke(['--temporary', '--', '/bin/bash', '-c', 'exit 0']).status, 0);
assert.equal(fs.readFileSync(symlinkTarget, 'utf8'), 'fake-existing-target');
assert.equal(fs.lstatSync(output).isSymbolicLink(), true);
fs.unlinkSync(output);
const missingCommand = invoke(['--temporary', '--', path.join(root, 'absent-build-command')]);
assert.notEqual(missingCommand.status, 0, 'startup failure remains a failure across Bash versions');
assert.equal(fs.existsSync(output), false, 'startup failure output cleanup');
const traced = spawnSync('/bin/bash', ['-x', helper, 'dev', output, '--temporary', '--', '/bin/bash', '-c', 'exit 0'], {
  env, encoding: 'utf8', timeout: 10000,
});
assert.equal(traced.status, 0);
assert.equal((traced.stdout + traced.stderr).includes(key), false, 'writer trace redaction');
for (const signal of ['SIGTERM', 'SIGINT', 'SIGHUP']) {
  const marker = path.join(root, 'child-started');
  const child = spawn('/bin/bash', [helper, 'dev', output, '--temporary', '--', '/bin/bash', '-c',
    'trap "exit 0" TERM; touch "$1"; while true; do sleep 0.05; done', 'fake-build', marker], {env, stdio: 'pipe'});
  let logs = '';
  child.stdout.on('data', data => { logs += data; });
  child.stderr.on('data', data => { logs += data; });
  const done = new Promise(resolve => child.on('exit', (code, sig) => resolve({code, sig})));
  const deadline = Date.now() + 5000;
  while (!fs.existsSync(marker) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(fs.existsSync(marker), 'child started');
  child.kill(signal);
  const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
  const result = await done;
  clearTimeout(timer);
  assert.equal(result.sig, null, 'signal handled by cleanup trap');
  assert.equal(result.code, {SIGTERM: 143, SIGINT: 130, SIGHUP: 129}[signal]);
  assert.equal(fs.existsSync(output), false, 'interruption output cleanup');
  assert.equal(logs.includes(key), false);
  fs.unlinkSync(marker);
}
const missing = invoke(['--temporary', '--', '/bin/bash', '-c', 'exit 0'], {GOOGLE_MAPS_IOS_API_KEY_DEV: ''});
assert.notEqual(missing.status, 0);
assert.equal(fs.existsSync(output), false);
console.log('Names-only provenance and temporary Maps lifecycle checks passed.');
JS
