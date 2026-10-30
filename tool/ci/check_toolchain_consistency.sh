#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_root/tool/ci/toolchain.env"

for name in \
  FLUTTER_VERSION \
  NODE_VERSION \
  JAVA_VERSION \
  FIREBASE_TOOLS_VERSION \
  COCOAPODS_VERSION \
  APPLE_CI_RUNNER \
  XCODE_MIN_VERSION \
  TERRAFORM_VERSION; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing $name in tool/ci/toolchain.env"
    exit 1
  fi
done

functions_node_version="$(node -p "require('$repo_root/functions/package.json').engines.node")"
if [[ "$functions_node_version" != "$NODE_VERSION" ]]; then
  echo "functions/package.json engines.node is $functions_node_version, but tool/ci/toolchain.env NODE_VERSION is $NODE_VERSION."
  exit 1
fi

version_at_least() {
  local current_version="$1"
  local required_version="$2"
  local current_major current_minor current_patch
  local required_major required_minor required_patch

  IFS=. read -r current_major current_minor current_patch <<<"$current_version"
  IFS=. read -r required_major required_minor required_patch <<<"$required_version"
  current_minor="${current_minor:-0}"
  current_patch="${current_patch:-0}"
  required_minor="${required_minor:-0}"
  required_patch="${required_patch:-0}"

  if ! [[
    "$current_major" =~ ^[0-9]+$ &&
    "$current_minor" =~ ^[0-9]+$ &&
    "$current_patch" =~ ^[0-9]+$ &&
    "$required_major" =~ ^[0-9]+$ &&
    "$required_minor" =~ ^[0-9]+$ &&
    "$required_patch" =~ ^[0-9]+$
  ]]; then
    return 1
  fi

  ((current_major > required_major)) ||
    ((current_major == required_major && current_minor > required_minor)) ||
    ((current_major == required_major && current_minor == required_minor && current_patch >= required_patch))
}

connectivity_plus_constraint="$(
  awk '$1 == "connectivity_plus:" { print $2; exit }' "$repo_root/pubspec.yaml"
)"
if [[ "$connectivity_plus_constraint" == ^7.* ]]; then
  required_xcode_version="26.1.1"
  if ! version_at_least "$XCODE_MIN_VERSION" "$required_xcode_version"; then
    echo "connectivity_plus $connectivity_plus_constraint requires Xcode $required_xcode_version or newer, but tool/ci/toolchain.env XCODE_MIN_VERSION is $XCODE_MIN_VERSION."
    exit 1
  fi
fi

# Firebase Apple SDK 12.12.0 raised the supported Xcode floor to 26.2.
# https://github.com/firebase/firebase-ios-sdk/blob/12.18.0/FirebaseCore/CHANGELOG.md
firebase_apple_sdk_version="$(
  node -e '
    const fs = require("node:fs");
    const manifest = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const version = manifest.appleNativeDependencies?.firebaseAppleSdkVersion;
    if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version ?? "")) {
      console.error("tool/app_targets.json must declare a valid Firebase Apple SDK version.");
      process.exit(1);
    }
    console.log(version);
  ' "$repo_root/tool/app_targets.json"
)"
if version_at_least "$firebase_apple_sdk_version" "12.12.0" &&
    ! version_at_least "$XCODE_MIN_VERSION" "26.2.0"; then
  echo "Firebase Apple SDK $firebase_apple_sdk_version requires Xcode 26.2.0 or newer, but tool/ci/toolchain.env XCODE_MIN_VERSION is $XCODE_MIN_VERSION."
  exit 1
fi

required_apple_runner="macos-${XCODE_MIN_VERSION%%.*}"
if [[ "$APPLE_CI_RUNNER" != "$required_apple_runner" ]]; then
  echo "XCODE_MIN_VERSION $XCODE_MIN_VERSION requires APPLE_CI_RUNNER=$required_apple_runner, but tool/ci/toolchain.env declares $APPLE_CI_RUNNER."
  exit 1
fi

apple_native_workflows=(
  ".github/workflows/app-build-matrix.yml"
  ".github/workflows/mobile-beta.yml"
  ".github/workflows/mobile-production.yml"
  ".github/workflows/visual-integration-ci.yml"
)
for workflow in "${apple_native_workflows[@]}"; do
  if ! grep -Eq "^[[:space:]]*runs-on:.*${APPLE_CI_RUNNER}" "$repo_root/$workflow"; then
    echo "$workflow must use $APPLE_CI_RUNNER on a runs-on line to satisfy XCODE_MIN_VERSION $XCODE_MIN_VERSION."
    exit 1
  fi
done

echo "CI toolchain pins are consistent."
