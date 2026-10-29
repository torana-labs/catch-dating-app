#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 3 ]]; then
  echo "Usage: ./tool/use_firebase_environment.sh <dev|staging|prod> [consumer|host] [app-project-root]"
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
if [[ ! -f "$destination_root/pubspec.yaml" ]]; then
  echo "Flutter project root has no pubspec.yaml: $project_root"
  exit 1
fi

# Android flavors and the iOS/macOS build phases read their own environment's
# file under firebase/ at build time. Flutter web has no flavors, so the web
# service worker is the one file still copied into the app project.
web_config="$(
  node "$repo_root/tool/platform/resolve_app_target.mjs" \
    --role "$app_role" \
    --environment "$environment" \
    --fields firebase.web.configPath
)"
web_destination="$destination_root/web/firebase-messaging-sw.js"

if [[ ! -f "$repo_root/$web_config" ]]; then
  echo "Missing Firebase config file: $web_config"
  echo "See firebase/README.md for the expected directory layout."
  exit 1
fi

if [[ -d "$(dirname "$web_destination")" ]]; then
  cp "$repo_root/$web_config" "$web_destination"
  echo "Applied $web_config -> $project_root/web/firebase-messaging-sw.js"
fi

bash "$repo_root/tool/validate_firebase_environment.sh" \
  "$environment" \
  "$app_role" \
  "$project_root" >/dev/null

echo "Active Firebase environment: $environment ($app_role)"
