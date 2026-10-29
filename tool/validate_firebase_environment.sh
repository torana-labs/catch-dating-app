#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 3 ]]; then
  echo "Usage: ./tool/validate_firebase_environment.sh <dev|staging|prod> [consumer|host] [app-project-root]"
  exit 1
fi

environment="$1"
app_role="${2:-consumer}"
project_root="${3:-}"

case "$environment" in
  dev|staging|prod) ;;
  *)
    echo "Unsupported environment: $environment"
    exit 1
    ;;
esac

case "$app_role" in
  consumer|host) ;;
  *)
    echo "Unsupported app role: $app_role"
    exit 1
    ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
define_file="$repo_root/tool/env/dart_defines/$environment.json"

if [[ ! -f "$define_file" ]]; then
  echo "Missing dart define file: tool/env/dart_defines/$environment.json"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Firebase target validation requires Node.js."
  exit 127
fi
if [[ -z "$project_root" ]]; then
  # Default to the selected role's own app project from tool/app_targets.json.
  project_root="$(
    node "$repo_root/tool/platform/resolve_app_target.mjs" \
      --role "$app_role" \
      --environment "$environment" \
      --fields projectRoot
  )"
fi
destination_root="$repo_root/$project_root"

node - "$define_file" "$environment" <<'NODE'
const fs = require("fs");

const [defineFile, expectedEnvironment] = process.argv.slice(2);
const defines = JSON.parse(fs.readFileSync(defineFile, "utf8"));

if (defines.APP_ENV !== expectedEnvironment) {
  console.error(
    `APP_ENV mismatch in ${defineFile}: expected ${expectedEnvironment}, got ${defines.APP_ENV}`
  );
  process.exit(1);
}

if (!defines.FIREBASE_APP_CHECK_WEB_RECAPTCHA_ENTERPRISE_SITE_KEY) {
  console.error(
    `Missing FIREBASE_APP_CHECK_WEB_RECAPTCHA_ENTERPRISE_SITE_KEY in ${defineFile}`
  );
  process.exit(1);
}

// Store review requires in-app Privacy, Terms and Help; empty values would
// silently hide those entries in the built app.
const legalUrlNames = ["CATCH_PRIVACY_POLICY_URL", "CATCH_TERMS_URL", "CATCH_HELP_URL"];
const legalUrls = new Set();
for (const name of legalUrlNames) {
  let url = null;
  try {
    url = new URL(defines[name] ?? "");
  } catch {}
  if (url?.protocol !== "https:" || !url.hostname) {
    console.error(`${name} in ${defineFile} must be an https URL.`);
    process.exit(1);
  }
  legalUrls.add(url.href);
}
if (legalUrls.size !== legalUrlNames.length) {
  console.error(`Privacy, Terms and Help URLs in ${defineFile} must be distinct routes.`);
  process.exit(1);
}
NODE

IFS=$'\t' read -r android_flavor android_config ios_config macos_config web_config <<<"$(
  node "$repo_root/tool/platform/resolve_app_target.mjs" \
    --role "$app_role" \
    --environment "$environment" \
    --fields 'android.flavor,firebase.android.configPath,firebase.ios.configPath,firebase.macos.configPath,firebase.web.configPath'
)"

# Each entry is canonical file|platform directory|file the build reads. The
# Android flavor file is a committed link to the canonical file, and the
# iOS/macOS build phases read the canonical file directly. Only the web service
# worker is an active copy that use_firebase_environment.sh refreshes.
check_specs=(
  "$android_config|android|android/app/src/$android_flavor/google-services.json"
  "$ios_config|ios|"
  "$macos_config|macos|"
  "$web_config|web|web/firebase-messaging-sw.js"
)

status=0
for spec in "${check_specs[@]}"; do
  IFS='|' read -r source_rel platform_dir dest_rel <<<"$spec"
  source_path="$repo_root/$source_rel"
  if [[ ! -d "$destination_root/$platform_dir" ]]; then
    continue
  fi

  if [[ ! -f "$source_path" ]]; then
    echo "Missing canonical Firebase config file: $source_rel"
    status=1
    continue
  fi

  if [[ -z "$dest_rel" ]]; then
    continue
  fi
  dest_path="$destination_root/$dest_rel"
  if [[ ! -f "$dest_path" ]]; then
    echo "Missing Firebase config file the build reads: $project_root/$dest_rel"
    status=1
    continue
  fi

  if ! cmp -s "$source_path" "$dest_path"; then
    echo "Firebase config mismatch: $project_root/$dest_rel does not match $source_rel"
    status=1
  fi
done

if [[ $status -ne 0 ]]; then
  echo "Android flavor files must link to their file under firebase/. Run ./tool/use_firebase_environment.sh $environment $app_role $project_root to refresh the web service worker."
  exit "$status"
fi

echo "Firebase environment '$environment' ($app_role) is active and internally consistent."
