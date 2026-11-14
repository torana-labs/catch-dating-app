#!/usr/bin/env bash
# Lists every cached schema contract output with its SHA-256, or with --remove
# deletes those outputs so the generator renders them from scratch. Tracked
# files in functions/src/shared/generated and other generators' outputs stay.
set -euo pipefail
shopt -s nullglob

dirs=(
  packages/platform/lib/schema_contracts/generated
  lib/contexts/*/data/generated
  tool/contracts/generated
  admin/src/generated/contracts
  website/src/shared/contracts/generated
  functions/src/shared/generated
)
keep='^functions/src/shared/generated/(brand|notificationCopyEn|marketCatalog|adminActionCatalog)\.ts$'

files=()
for dir in "${dirs[@]}"; do
  [[ -d "$dir" ]] || continue
  while IFS= read -r -d '' file; do
    [[ "$file" =~ $keep ]] || files+=("$file")
  done < <(find "$dir" -type f -print0)
done

if [[ "${1:-}" == "--remove" ]]; then
  if (( ${#files[@]} > 0 )); then rm -f -- "${files[@]}"; fi
  exit 0
fi

if (( ${#files[@]} > 0 )); then
  printf '%s\0' "${files[@]}" | sort -z | xargs -0 sha256sum
fi
