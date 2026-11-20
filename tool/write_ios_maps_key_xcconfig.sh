#!/usr/bin/env bash
set +x  # Never trace credential expansion, including error paths.
set -euo pipefail
umask 077
trap 'status=$?; echo "iOS Maps compatibility output failed." >&2; exit "$status"' ERR

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

target_env="${1:-prod}"
case "$target_env" in
  dev|prod) ;;
  *)
    echo "Unsupported iOS Maps key environment: $target_env"
    echo "Use dev or prod."
    exit 64
    ;;
esac

if [[ -z "${2:-}" ]]; then
  echo "Pass the app project's xcconfig path, for example apps/consumer/ios/Flutter/GoogleMapsKeys.xcconfig."
  exit 64
fi

upper_env="$(printf '%s' "$target_env" | tr '[:lower:]' '[:upper:]')"
key_var="GOOGLE_MAPS_IOS_API_KEY_${upper_env}"
maps_key="${!key_var:-}"

if [[ -z "$maps_key" ]]; then
  echo "Missing $key_var environment variable."
  echo "Add it as a secret environment variable in the active CI release pipeline."
  exit 1
fi

if [[ ! "$maps_key" =~ ^AIza[0-9A-Za-z_-]{20,}$ ]]; then
  echo "$key_var is set but is not a valid Google API key."
  exit 1
fi

output_arg="$2"
if [[ "$output_arg" = /* ]]; then
  output_path="$output_arg"
else
  output_path="$repo_root/$output_arg"
fi
# Optional bounded lifecycle:
#   ... <env> <output> --temporary -- <build command> [args...]
# Existing files are never read, replaced or deleted in this mode. EXIT, HUP,
# INT and TERM remove our generated output. SIGKILL/power loss cannot run traps;
# use an ephemeral workspace and remove only its owned output after recovery.
# The child must keep its work in the foreground (no detached build processes).
temporary=false
if [[ $# -gt 2 ]]; then
  if [[ "${3:-}" != --temporary || "${4:-}" != -- || $# -lt 5 ]]; then
    echo "Usage: $0 <dev|prod> [output [--temporary -- command args...]]" >&2
    exit 64
  fi
  temporary=true
  shift 4
fi

owned_output=false
child_pid=""
cleanup_output() {
  if [[ "$owned_output" == true ]]; then
    rm -f -- "$output_path"
  fi
}
stop_child() {
  local status="$1"
  # Remove owned compatibility bytes even if the child delays termination.
  cleanup_output
  if [[ -n "$child_pid" ]]; then
    kill -TERM "$child_pid" 2>/dev/null || true
    wait "$child_pid" 2>/dev/null || true
  fi
  exit "$status"
}
if [[ "$temporary" == true ]]; then
  trap cleanup_output EXIT
  trap 'stop_child 129' HUP
  trap 'stop_child 130' INT
  trap 'stop_child 143' TERM
fi

mkdir -p "$(dirname "$output_path")"
if [[ "$temporary" == true ]]; then
  if ! (set -o noclobber; : >"$output_path") 2>/dev/null; then
    echo "Temporary iOS Maps output requires an absent destination; existing files are preserved." >&2
    exit 1
  fi
  owned_output=true
fi
chmod 600 "$output_path" 2>/dev/null || [[ ! -e "$output_path" ]]
printf '%s=%s\n' "$key_var" "$maps_key" > "$output_path"
echo "Wrote $key_var to ${output_path#"$repo_root/"}."

if [[ "$temporary" == true ]]; then
  "$@" &
  child_pid=$!
  status=0
  wait "$child_pid" || status=$?
  child_pid=""
  exit "$status"
fi
