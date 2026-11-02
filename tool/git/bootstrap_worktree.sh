#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: bash tool/git/bootstrap_worktree.sh --target root|functions|flutter|all

Install only the dependencies needed by a fresh Catch Git worktree.
Select all explicitly only when all three families are needed, in this order:
  1. root npm workspace dependencies
  2. Firebase Functions npm dependencies
  3. Flutter/Dart packages
USAGE
}

if [[ ${1:-} == "--help" || ${1:-} == "help" ]]; then
  usage
  exit 0
fi

if [[ $# -eq 2 && $1 == "--target" ]]; then
  target=$2
else
  usage >&2
  exit 64
fi
case "$target" in
  all|root|functions|flutter) ;;
  *) usage >&2; exit 64 ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(git -C "$script_dir/../.." rev-parse --show-toplevel)"

required_paths=()
if [[ $target == all || $target == root ]]; then
  required_paths+=(package.json package-lock.json)
fi
if [[ $target == all || $target == functions ]]; then
  required_paths+=(functions/package.json functions/package-lock.json)
fi
if [[ $target == all || $target == flutter ]]; then
  required_paths+=(pubspec.yaml pubspec.lock)
fi
for required_path in "${required_paths[@]}"; do
  if [[ ! -f "$repo_root/$required_path" ]]; then
    echo "Worktree bootstrap requires $required_path." >&2
    exit 1
  fi
done

if [[ $target == all || $target == root ]]; then
  echo "==> Installing root npm workspace dependencies"
  (
    cd "$repo_root"
    npm ci
    npm --workspace catch-admin run generate
  )
fi

if [[ $target == all || $target == functions ]]; then
  echo "==> Installing Firebase Functions dependencies"
  (
    cd "$repo_root/functions"
    npm ci
    npm run generate
  )
fi

if [[ $target == all || $target == flutter ]]; then
  echo "==> Resolving Flutter dependencies"
  (
    cd "$repo_root"
    flutter pub get
  )
fi

echo "Worktree bootstrap complete."
