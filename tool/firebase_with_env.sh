#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./tool/firebase_with_env.sh <dev|prod> <firebase args...>"
  exit 1
fi

environment="$1"
shift

case "$environment" in
  dev|prod) ;;
  *)
    echo "Unsupported environment: $environment"
    exit 1
    ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
firebaserc="$repo_root/.firebaserc"

if [[ ! -f "$firebaserc" ]] || ! grep -q "\"$environment\"" "$firebaserc"; then
  echo "Firebase alias '$environment' is not configured in .firebaserc."
  echo "Add it with: firebase use --add"
  exit 1
fi

project_id="$(
  node -e '
    const fs = require("fs");
    const env = process.argv[1];
    const rc = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
    const project = rc.projects && rc.projects[env];
    if (!project) process.exit(2);
    console.log(project);
  ' "$environment" "$firebaserc"
)"

export CATCH_FIREBASE_DEPLOY_ENV="$environment"
export CATCH_FIREBASE_PROJECT_ID="$project_id"
export NO_UPDATE_NOTIFIER=true

exec firebase --project "$environment" "$@"
