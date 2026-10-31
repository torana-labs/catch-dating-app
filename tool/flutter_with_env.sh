#!/usr/bin/env bash
set +x  # Local configuration values must never enter shell tracing.
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: ./tool/flutter_with_env.sh <local|dev|staging|prod> [--role <consumer|host>] [--platform <android|ios|macos|web>] [--config-sources | <flutter args...>]"
  exit 1
fi

environment="$1"
local_emulators=false
if [[ "$environment" == local ]]; then
  environment=dev
  local_emulators=true
fi
shift
app_role="${CATCH_APP_ROLE:-consumer}"
target_platform="${CATCH_TARGET_PLATFORM:-}"

if [[ $# -ge 2 && "$1" == "--role" ]]; then
  app_role="$2"
  shift 2
elif [[ $# -ge 1 && ( "$1" == "consumer" || "$1" == "host" ) ]]; then
  app_role="$1"
  shift
fi

if [[ $# -ge 2 && "$1" == "--platform" ]]; then
  target_platform="$2"
  shift 2
fi

config_sources_only=false
if [[ "${1:-}" == --config-sources ]]; then
  config_sources_only=true
  shift
  if [[ $# -ne 0 ]]; then
    echo "--config-sources does not accept Flutter arguments." >&2
    exit 64
  fi
fi

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

case "$target_platform" in
  ""|android|ios|macos|web) ;;
  *)
    echo "Unsupported target platform: $target_platform"
    exit 1
    ;;
esac

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"
define_file="$repo_root/tool/env/dart_defines/$environment.json"
if [[ "$local_emulators" == true ]]; then
  define_file="$repo_root/tool/env/dart_defines/local.json"
fi

if [[ ! -f "$define_file" ]]; then
  echo "Missing dart define file: $define_file"
  exit 1
fi

# Report only reviewed names and fixed source labels, never arbitrary environment
# names, values, file text or hashes. Empty process values deliberately mask files.
config_names=(
  FIREBASE_APP_CHECK_DEBUG_TOKEN USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER
  ALLOW_RANDOM_APP_CHECK_DEBUG_TOKEN VERBOSE_AUTH_DEBUG_LOGS
  DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING ENABLE_OBSERVABILITY_COLLECTION
  EMIT_OBSERVABILITY_SMOKE_EVENT GOOGLE_MAPS_ANDROID_API_KEY
  GOOGLE_MAPS_ANDROID_API_KEY_DEV GOOGLE_MAPS_ANDROID_API_KEY_STAGING
  GOOGLE_MAPS_ANDROID_API_KEY_PROD GOOGLE_MAPS_IOS_API_KEY_DEV
  GOOGLE_MAPS_IOS_API_KEY_STAGING GOOGLE_MAPS_IOS_API_KEY_PROD
)
config_sources=()
for config_name in "${config_names[@]}"; do
  if [[ "${!config_name+x}" == x ]]; then
    config_sources+=(processenv)
  else
    config_sources+=(unset)
  fi
done

load_local_env_file() {
  local env_file="$1"
  local source_label="$2"
  [[ -f "$env_file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" == \#* ]] && continue

    if [[ "$line" == export\ * ]]; then
      line="${line#export }"
    fi

    [[ "$line" == *=* ]] || continue

    local key="${line%%=*}"
    local value="${line#*=}"

    if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      echo "Ignoring an invalid local configuration name." >&2
      continue
    fi

    if [[ "$value" == \"*\" && "$value" == *\" && ${#value} -ge 2 ]]; then
      value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && ${#value} -ge 2 ]]; then
      value="${value:1:${#value}-2}"
    fi

    if [[ "${!key+x}" != x ]]; then
      export "$key=$value"
      local config_index
      for ((config_index = 0; config_index < ${#config_names[@]}; config_index++)); do
        if [[ "$key" == "${config_names[$config_index]}" ]]; then
          config_sources[$config_index]="$source_label"
        fi
      done
    fi
  done <"$env_file"
}

extract_target_device() {
  local i
  for ((i = 0; i < ${#flutter_args[@]}; i++)); do
    case "${flutter_args[$i]}" in
      -d|--device-id)
        if ((i + 1 < ${#flutter_args[@]})); then
          echo "${flutter_args[$((i + 1))]}"
          return 0
        fi
        ;;
      --device-id=*)
        echo "${flutter_args[$i]#--device-id=}"
        return 0
        ;;
    esac
  done
}

is_web_target() {
  case "$1" in
    chrome|edge|web-server) return 0 ;;
    *) return 1 ;;
  esac
}

is_ios_target() {
  case "$1" in
    *iPhone*|*iPad*|ios|IOS|0000*) return 0 ;;
    *) return 1 ;;
  esac
}

is_macos_target() {
  case "$1" in
    macos|macOS|darwin|Darwin) return 0 ;;
    *) return 1 ;;
  esac
}

is_android_target() {
  case "$1" in
    *android*|*Android*|emulator*) return 0 ;;
    *) return 1 ;;
  esac
}

is_retryable_cocoapods_git_tls_failure() {
  local log_file="$1"
  grep -Eq \
    "fatal: unable to access 'https://github\\.com/[^']+/?': SSL certificate problem: self signed certificate" \
    "$log_file"
}

is_retryable_gradle_wrapper_download_failure() {
  local log_file="$1"
  grep -Eq \
    'java\.net\.(SocketException|SocketTimeoutException): (Unexpected end of file from server|Connection reset|Read timed out)' \
    "$log_file" &&
    grep -Eq 'at org\.gradle\.wrapper\.Download\.download' "$log_file"
}

run_flutter_with_bounded_ci_retry() {
  local retry_kind="$1"
  shift
  local max_attempts
  local retry_delay_seconds
  case "$retry_kind" in
    cocoapods-git-tls)
      max_attempts="${CATCH_COCOAPODS_TLS_MAX_ATTEMPTS:-3}"
      retry_delay_seconds="${CATCH_COCOAPODS_TLS_RETRY_DELAY_SECONDS:-15}"
      ;;
    gradle-wrapper-download)
      max_attempts="${CATCH_GRADLE_WRAPPER_MAX_ATTEMPTS:-3}"
      retry_delay_seconds="${CATCH_GRADLE_WRAPPER_RETRY_DELAY_SECONDS:-15}"
      ;;
    *)
      echo "Unsupported CI retry kind: $retry_kind" >&2
      return 64
      ;;
  esac

  if [[ ! "$max_attempts" =~ ^[1-5]$ ]]; then
    echo "CI dependency retry attempts must be an integer from 1 to 5." >&2
    return 64
  fi
  if [[ ! "$retry_delay_seconds" =~ ^[0-9]+$ ]] ||
    ((10#$retry_delay_seconds > 60)); then
    echo "CI dependency retry delay must be an integer from 0 to 60." >&2
    return 64
  fi

  local retry_log
  retry_log="$(mktemp "${TMPDIR:-/tmp}/catch-ci-dependency.XXXXXX")"
  # Expand now: retry_log is local and is gone by the time EXIT fires.
  # shellcheck disable=SC2064
  trap "rm -f '$retry_log'" EXIT

  local attempt=1
  local flutter_status=0
  local tee_status=0
  local -a pipeline_status=()
  while ((attempt <= max_attempts)); do
    : >"$retry_log"
    set +e
    flutter "$@" 2>&1 | tee "$retry_log"
    pipeline_status=("${PIPESTATUS[@]}")
    set -e
    flutter_status="${pipeline_status[0]}"
    tee_status="${pipeline_status[1]}"

    if ((tee_status != 0)); then
      rm -f "$retry_log"
      trap - EXIT
      return "$tee_status"
    fi
    if ((flutter_status == 0)); then
      rm -f "$retry_log"
      trap - EXIT
      return 0
    fi
    local is_retryable=1
    if [[ "$retry_kind" == "cocoapods-git-tls" ]]; then
      is_retryable_cocoapods_git_tls_failure "$retry_log" && is_retryable=0
    else
      is_retryable_gradle_wrapper_download_failure "$retry_log" && is_retryable=0
    fi
    if ((is_retryable != 0 || attempt == max_attempts)); then
      rm -f "$retry_log"
      trap - EXIT
      return "$flutter_status"
    fi

    attempt=$((attempt + 1))
    local retry_message
    local warning_title
    if [[ "$retry_kind" == "cocoapods-git-tls" ]]; then
      warning_title="CocoaPods Git TLS retry"
      retry_message="Retrying the iOS Flutter build after a transient verified GitHub certificate failure"
    else
      warning_title="Gradle wrapper download retry"
      retry_message="Retrying the Android Flutter build after a transient verified Gradle wrapper download failure"
    fi
    if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
      echo "::warning title=$warning_title::$retry_message (attempt $attempt/$max_attempts)."
    else
      echo "$retry_message (attempt $attempt/$max_attempts)." >&2
    fi
    if ((retry_delay_seconds > 0)); then
      sleep "$retry_delay_seconds"
    fi
  done
}

if [[ "$local_emulators" != true ]]; then
  load_local_env_file "$repo_root/.env.$environment.local" environment-local
  load_local_env_file "$repo_root/.env.local" local-fallback
fi

if [[ "$config_sources_only" == true ]]; then
  # This describes wrapper resolution only, not native compatibility-file
  # contents, deployed bindings, validity or provider access.
  printf 'Configuration sources (wrapper only; values omitted)\n'
  for ((config_index = 0; config_index < ${#config_names[@]}; config_index++)); do
    config_name="${config_names[$config_index]}"
    config_state="unset"
    if [[ "${!config_name+x}" == x ]]; then
      config_state="empty"
      [[ -z "${!config_name}" ]] || config_state="set"
    fi
    printf '%s source=%s state=%s\n' "$config_name" "${config_sources[$config_index]}" "$config_state"
  done
  exit 0
fi

flutter_args=("$@")
target_device="$(extract_target_device)"

IFS=$'\t' read -r target_project_root target_entrypoint ios_flavor android_flavor <<<"$(
  node "$repo_root/tool/platform/resolve_app_target.mjs" \
    --role "$app_role" \
    --environment "$environment" \
    --fields 'projectRoot,packageEntrypoint,ios.scheme,android.flavor'
)"
app_project_root="$repo_root/$target_project_root"
if [[ ! -f "$app_project_root/pubspec.yaml" ]]; then
  echo "App target $app_role/$environment has no Flutter project at $target_project_root."
  exit 1
fi

native_flavor="$ios_flavor"
if [[ ${#flutter_args[@]} -ge 2 && "${flutter_args[0]}" == "build" ]]; then
  case "${flutter_args[1]}" in
    apk|appbundle)
      native_flavor="$android_flavor"
      ;;
    ipa|ios|macos)
      native_flavor="$ios_flavor"
      ;;
  esac
elif [[ ${#flutter_args[@]} -ge 1 && "${flutter_args[0]}" == "run" ]]; then
  if [[ -z "$target_device" ]]; then
    echo "Flutter run must select one device with -d/--device-id for deterministic app-target resolution."
    exit 1
  fi
  if [[ -z "$target_platform" ]]; then
    if is_android_target "$target_device"; then
      target_platform="android"
    elif is_ios_target "$target_device"; then
      target_platform="ios"
    elif is_macos_target "$target_device"; then
      target_platform="macos"
    elif is_web_target "$target_device"; then
      target_platform="web"
    else
      echo "Flutter run needs a deterministic platform because Android and Apple use different flavor names."
      echo "Pass --platform <android|ios|macos|web> before 'run' and select a device with -d."
      exit 1
    fi
  fi

  if [[ "$target_platform" == "android" ]]; then
    native_flavor="$android_flavor"
  elif [[ "$target_platform" == "ios" || "$target_platform" == "macos" ]]; then
    native_flavor="$ios_flavor"
  fi
fi

if [[ "$local_emulators" == true ]]; then
  for arg in "${flutter_args[@]}"; do
    case "$arg" in
      --dart-define|--dart-define=*|--dart-define-from-file|--dart-define-from-file=*)
        echo "The local target owns its Firebase defines. Use dev for custom environment configuration."
        exit 64
        ;;
    esac
  done
  if [[ "${flutter_args[0]:-}" == run && "$target_platform" == web ]] ||
     [[ "${flutter_args[0]:-}" == build && "${flutter_args[1]:-}" == web ]] ||
     [[ "${flutter_args[0]:-}" == test ]]; then
    echo "Using demo-catch with local Firebase emulators. Start npm --prefix functions run serve first."
  else
    echo "The isolated local target supports web runs/builds and tests. Use dev for native device testing."
    exit 64
  fi
fi

has_flavor=0
has_target=0
supplied_flavor=""
supplied_target=""
has_release_mode=0
has_profile_mode=0
has_debug_mode=0
target_count=0
has_prebuilt_binary=0
has_no_build=0
has_caller_dart_define=0
device_count=0
owns_entrypoint=0
case "${flutter_args[0]:-}" in
  run|build|drive) owns_entrypoint=1 ;;
esac
for ((i = 0; i < ${#flutter_args[@]}; i++)); do
  arg="${flutter_args[$i]}"
  case "$arg" in
    --)
      if ((owns_entrypoint == 1)); then
        echo "This wrapper does not permit '--' for app entrypoint commands; pass an entrypoint with -t/--target." >&2
        exit 64
      fi
      ;;
    --release)
      has_release_mode=1
      ;;
    --profile)
      has_profile_mode=1
      ;;
    --debug)
      has_debug_mode=1
      ;;
    --no-build)
      has_no_build=1
      ;;
    --use-application-binary|--use-application-binary=*)
      has_prebuilt_binary=1
      ;;
    -D|-D*|--dart-define|--dart-define=*|--dart-define-from-file|--dart-define-from-file=*)
      has_caller_dart_define=1
      ;;
    -d|--device-id)
      device_count=$((device_count + 1))
      if ((i + 1 >= ${#flutter_args[@]})); then
        echo "$arg requires a value."
        exit 1
      fi
      ;;
    --device-id=*)
      device_count=$((device_count + 1))
      ;;
    --flavor)
      has_flavor=1
      if ((i + 1 >= ${#flutter_args[@]})); then
        echo "--flavor requires a value."
        exit 1
      fi
      supplied_flavor="${flutter_args[$((i + 1))]}"
      ;;
    --flavor=*)
      has_flavor=1
      supplied_flavor="${arg#--flavor=}"
      ;;
    -t|--target)
      has_target=1
      target_count=$((target_count + 1))
      if ((i + 1 >= ${#flutter_args[@]})); then
        echo "$arg requires a value."
        exit 1
      fi
      supplied_target="${flutter_args[$((i + 1))]}"
      ;;
    --target=*)
      has_target=1
      target_count=$((target_count + 1))
      supplied_target="${arg#--target=}"
      ;;
  esac
done

if ((target_count > 1)); then
  echo "This wrapper accepts exactly one -t/--target entrypoint." >&2
  exit 64
fi

known_device_platform_mismatch=0
case "$target_platform" in
  ios)
    if is_android_target "$target_device" || is_macos_target "$target_device" ||
      is_web_target "$target_device"; then
      known_device_platform_mismatch=1
    fi
    ;;
  android)
    if is_ios_target "$target_device" || is_macos_target "$target_device" ||
      is_web_target "$target_device"; then
      known_device_platform_mismatch=1
    fi
    ;;
esac

if [[ -n "$supplied_flavor" && "$supplied_flavor" != "$native_flavor" ]]; then
  echo "App target $app_role/$environment resolves flavor '$native_flavor'; caller supplied '$supplied_flavor'."
  exit 1
fi
if [[ -n "$supplied_target" && "$supplied_target" != "$target_entrypoint" ]]; then
  cat151_acceptance_target="integration_test/cat151_razorpay_acceptance_harness.dart"
  if [[ "$supplied_target" != "$cat151_acceptance_target" ]]; then
    echo "App target $app_role/$environment resolves entrypoint '$target_entrypoint'; caller supplied '$supplied_target'."
    exit 1
  fi
  if [[ "$app_role" != consumer || "${flutter_args[0]:-}" != run ||
    "$local_emulators" == true || "$environment" != prod ||
    ( "$target_platform" != android && "$target_platform" != ios ) ||
    $device_count -ne 1 || $known_device_platform_mismatch -eq 1 ||
    $has_profile_mode -ne 1 || $has_release_mode -eq 1 ||
    $has_debug_mode -eq 1 || $has_prebuilt_binary -eq 1 ||
    $has_no_build -eq 1 || $has_caller_dart_define -eq 1 ||
    "${USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER:-}" == true ||
    -n "${FIREBASE_APP_CHECK_DEBUG_TOKEN:-}" ||
    "${ALLOW_RANDOM_APP_CHECK_DEBUG_TOKEN:-}" == 1 ]]; then
    echo "The CAT-151 acceptance target permits only a profile-mode Consumer run on native production."
    exit 1
  fi
fi

if [[ "$local_emulators" != true ]]; then
  bash "$repo_root/tool/use_firebase_environment.sh" \
    "$environment" \
    "$app_role" \
    "$target_project_root" >/dev/null
fi

if [[ $has_target -eq 0 && ${#flutter_args[@]} -ge 1 ]]; then
  case "${flutter_args[0]}" in
    run|build|drive)
      flutter_args+=("-t" "$target_entrypoint")
      ;;
  esac
fi

if [[ ${#flutter_args[@]} -ge 2 && "${flutter_args[0]}" == "build" ]]; then
  case "${flutter_args[1]}" in
    apk|appbundle|ipa|ios|macos)
      if [[ $has_flavor -eq 0 ]]; then
        flutter_args+=("--flavor" "$native_flavor")
      fi
      ;;
  esac
elif [[ ${#flutter_args[@]} -ge 1 && "${flutter_args[0]}" == "run" && $has_flavor -eq 0 ]]; then
  if [[ "$target_platform" != "web" ]]; then
      flutter_args+=("--flavor" "$native_flavor")
  fi
fi

maps_platform=""
if [[ ${#flutter_args[@]} -ge 2 && "${flutter_args[0]}" == "build" ]]; then
  case "${flutter_args[1]}" in
    apk|appbundle)
      maps_platform="android"
      ;;
    ipa|ios)
      maps_platform="ios"
      ;;
  esac
elif [[ ${#flutter_args[@]} -ge 1 && "${flutter_args[0]}" == "run" ]]; then
  if [[ "$target_platform" == "web" ]]; then
    :
  elif [[ "$target_platform" == "ios" ]]; then
    maps_platform="ios"
  elif [[ "$target_platform" == "android" ]]; then
    maps_platform="android"
  else
    maps_platform="all"
  fi
fi

if [[ -n "$maps_platform" ]]; then
  node "$repo_root/tool/firebase/validate_google_maps_config.mjs" \
    --env "$environment" \
    --platform "$maps_platform" \
    --project-root "$target_project_root"
fi

supports_dart_defines=0
if [[ ${#flutter_args[@]} -ge 1 ]]; then
  case "${flutter_args[0]}" in
    run|test|drive)
      supports_dart_defines=1
      ;;
    build)
      supports_dart_defines=1
      ;;
  esac
fi

is_debug_mobile_run=0
if [[ ${#flutter_args[@]} -ge 1 && "${flutter_args[0]}" == "run" ]]; then
  is_debug_mobile_run=1
  for arg in "${flutter_args[@]}"; do
    case "$arg" in
      --profile|--release)
        is_debug_mobile_run=0
        ;;
    esac
  done
  if is_web_target "$target_device"; then
    is_debug_mobile_run=0
  fi
fi

requires_debug_token=0
if [[ $is_debug_mobile_run -eq 1 ]]; then
  if [[ "${USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER:-}" == "true" ]]; then
    requires_debug_token=1
  elif ! is_ios_target "$target_device"; then
    requires_debug_token=1
  fi
fi

if [[ $requires_debug_token -eq 1 &&
  -z "${FIREBASE_APP_CHECK_DEBUG_TOKEN:-}" &&
  "${ALLOW_RANDOM_APP_CHECK_DEBUG_TOKEN:-}" != "1" ]]; then
  cat >&2 <<EOF
Missing FIREBASE_APP_CHECK_DEBUG_TOKEN for a mobile debug run.

Firebase App Check enforcement rejects random debug tokens. Add a registered
debug token to .env.local, for example:

  FIREBASE_APP_CHECK_DEBUG_TOKEN=<registered-token>

If you are intentionally minting a one-time token for first setup, rerun with:

  ALLOW_RANDOM_APP_CHECK_DEBUG_TOKEN=1 ./tool/flutter_with_env.sh $environment <same Flutter arguments>
EOF
  exit 1
fi

extra_dart_defines=()
if [[ "$local_emulators" != true ]]; then
  if [[ -n "${FIREBASE_APP_CHECK_DEBUG_TOKEN:-}" ]]; then
    extra_dart_defines+=(
      "--dart-define=FIREBASE_APP_CHECK_DEBUG_TOKEN=${FIREBASE_APP_CHECK_DEBUG_TOKEN}"
    )
  fi
  if [[ -n "${VERBOSE_AUTH_DEBUG_LOGS:-}" ]]; then
    extra_dart_defines+=(
      "--dart-define=VERBOSE_AUTH_DEBUG_LOGS=${VERBOSE_AUTH_DEBUG_LOGS}"
    )
  fi
  if [[ -n "${DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING:-}" ]]; then
    extra_dart_defines+=(
      "--dart-define=DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING=${DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING}"
    )
  fi
  if [[ -n "${USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER:-}" ]]; then
    extra_dart_defines+=(
      "--dart-define=USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER=${USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER}"
    )
  fi
  if [[ -n "${ENABLE_OBSERVABILITY_COLLECTION:-}" ]]; then
    extra_dart_defines+=(
      "--dart-define=ENABLE_OBSERVABILITY_COLLECTION=${ENABLE_OBSERVABILITY_COLLECTION}"
    )
  fi
  if [[ -n "${EMIT_OBSERVABILITY_SMOKE_EVENT:-}" ]]; then
    extra_dart_defines+=(
      "--dart-define=EMIT_OBSERVABILITY_SMOKE_EVENT=${EMIT_OBSERVABILITY_SMOKE_EVENT}"
    )
  fi
fi

resolved_flutter_args=("${flutter_args[@]}")
if [[ $supports_dart_defines -eq 1 ]]; then
  resolved_flutter_args+=("--dart-define-from-file=$define_file")
  if [[ ${#extra_dart_defines[@]} -gt 0 ]]; then
    resolved_flutter_args+=("${extra_dart_defines[@]}")
  fi
fi

cd "$app_project_root"
if [[ ( "${CI:-}" == "true" || "${GITHUB_ACTIONS:-}" == "true" ) &&
  ${#flutter_args[@]} -ge 2 &&
  "${flutter_args[0]}" == "build" ]]; then
  case "${flutter_args[1]}" in
    ios)
      run_flutter_with_bounded_ci_retry \
        cocoapods-git-tls "${resolved_flutter_args[@]}"
      exit 0
      ;;
    apk|appbundle)
      run_flutter_with_bounded_ci_retry \
        gradle-wrapper-download "${resolved_flutter_args[@]}"
      exit 0
      ;;
  esac
fi

exec flutter "${resolved_flutter_args[@]}"
