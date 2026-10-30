#!/usr/bin/env bash
# Read the Play App Signing certificate fingerprints for one app version.
#
#   PLAY_ACCESS_TOKEN=... infra/scripts/play_signing_fingerprints.sh com.catchdates.app 100001
#
# Read-only. Calls the Android Publisher API generatedapks.list for the
# version code, downloads the universal APK Play generated and signed, and
# reads its certificate with keytool -printcert -jarfile. Apps with minSdk 24
# or higher may carry only APK Signature Scheme v2/v3 signatures, which keytool
# cannot read; then apksigner from the runner's Android SDK reads them. The
# SHA-256 is cross-checked against the certificateSha256Hash Play reports.
#
# Prints one JSON object per signing key on stdout:
#   {"package":"...","versionCode":"...","sha1":"<40 hex>","sha256":"<64 hex>","reader":"keytool|apksigner"}
# The fingerprints are public certificate hashes, not secrets.
set -euo pipefail

package="${1:?usage: play_signing_fingerprints.sh <package> <version-code>}"
version_code="${2:?usage: play_signing_fingerprints.sh <package> <version-code>}"
token="${PLAY_ACCESS_TOKEN:?PLAY_ACCESS_TOKEN must hold an androidpublisher access token}"
api="https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${package}/generatedApks/${version_code}"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Normalise a fingerprint to lowercase hex without separators. Play may report
# certificateSha256Hash as hex or as base64 of the raw digest.
normalise() {
  local value="$1" expected_length="$2" hex
  hex="$(tr -d ':[:space:]' <<<"$value" | tr '[:upper:]' '[:lower:]')"
  if [[ ! "$hex" =~ ^[0-9a-f]+$ || ${#hex} -ne $expected_length ]]; then
    hex="$(printf '%s' "$value" | tr '_-' '/+' | base64 --decode 2>/dev/null | od -An -v -tx1 | tr -d ' \n' || true)"
  fi
  [[ "$hex" =~ ^[0-9a-f]+$ && ${#hex} -eq $expected_length ]] || return 1
  printf '%s' "$hex"
}

# Diagnostics for a failed read go to stderr. Everything printed is public
# certificate metadata or tool output, never a credential.
read_with_keytool() {
  local output
  output="$(keytool -printcert -jarfile "$1" 2>&1 || true)"
  sha1="$(sed -n 's/^[[:space:]]*SHA1:[[:space:]]*//p' <<<"$output" | head -1)"
  sha256="$(sed -n 's/^[[:space:]]*SHA256:[[:space:]]*//p' <<<"$output" | head -1)"
  if [[ -z "$sha1" || -z "$sha256" ]]; then
    echo "keytool found no v1 (JAR) signature: $(head -c 300 <<<"$output" | tr '\n' ' ')" >&2
    return 1
  fi
}

find_apksigner() {
  local candidate root
  candidate="$(command -v apksigner || true)"
  if [[ -n "$candidate" ]]; then echo "$candidate"; return 0; fi
  for root in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" /usr/local/lib/android/sdk; do
    [[ -n "$root" && -d "$root/build-tools" ]] || continue
    # build-tools may ship apksigner as a symlink, so match links too.
    candidate="$(find "$root/build-tools" -maxdepth 2 -name apksigner \( -type f -o -type l \) 2>/dev/null | sort -V | tail -1)"
    if [[ -n "$candidate" ]]; then echo "$candidate"; return 0; fi
  done
  return 1
}

# An APK can carry several signers, each printed with its own label:
# "Signer #1", "Signer (minSdkVersion=...)" after key rotation, or
# "V3.2 Hybrid Classical Signer: (minSdkVersion=37, ...)" for the extra signer
# Play adds for Android 17+ (build-tools 37). The app-signing key is the signer
# whose SHA-256 is the certificateSha256Hash Play reports ($2), whatever its
# label or position.
read_with_apksigner() {
  local apksigner output status=0 signers label
  if ! apksigner="$(find_apksigner)"; then
    echo "apksigner not found (ANDROID_HOME=${ANDROID_HOME:-unset}, ANDROID_SDK_ROOT=${ANDROID_SDK_ROOT:-unset})." >&2
    return 1
  fi
  output="$("$apksigner" verify --print-certs "$1" 2>&1)" || status=$?
  signers="$(sed -En 's/^(.*Signer[^:]*:?[^:]*) certificate (SHA-1|SHA-256) digest: ([0-9A-Fa-f:]+)[[:space:]]*$/\1|\2|\3/p' <<<"$output")"
  label="$(awk -F '|' -v want="$2" '$2 == "SHA-256" { hex = tolower($3); gsub(/:/, "", hex); if (hex == want) { print $1; exit } }' <<<"$signers")"
  if [[ -n "$label" ]]; then
    sha256="$2"
    sha1="$(awk -F '|' -v label="$label" '$1 == label && $2 == "SHA-1" { print $3; exit }' <<<"$signers")"
  fi
  if [[ -z "$label" || -z "$sha1" ]]; then
    echo "$apksigner verify --print-certs exited $status: $(head -c 600 <<<"$output" | tr '\n' ' ')" >&2
    if [[ -n "$signers" ]]; then
      echo "No apksigner signer has Play's certificateSha256Hash $2; signers found: $(awk -F '|' '$2 == "SHA-256" { printf "%s=%s; ", $1, $3 }' <<<"$signers")" >&2
    fi
    return 1
  fi
}

curl --fail --silent --show-error --retry 3 \
  --header "Authorization: Bearer $token" \
  --output "$work/generated.json" "$api"

count="$(jq '[.generatedApks[]? | select(.generatedUniversalApk.downloadId)] | length' "$work/generated.json")"
if [[ "$count" == "0" ]]; then
  echo "Play generated no universal APK for $package version $version_code." >&2
  exit 1
fi

for index in $(seq 0 $((count - 1))); do
  entry="$(jq -c "[.generatedApks[] | select(.generatedUniversalApk.downloadId)][$index]" "$work/generated.json")"
  download_id="$(jq -r '.generatedUniversalApk.downloadId' <<<"$entry")"
  reported="$(jq -r '.certificateSha256Hash // ""' <<<"$entry")"
  apk="$work/universal-$index.apk"

  curl --fail --silent --show-error --retry 3 --location \
    --header "Authorization: Bearer $token" \
    --output "$apk" "$api/downloads/$(jq -rn --arg id "$download_id" '$id | @uri'):download?alt=media"

  if [[ -z "$reported" ]]; then
    echo "$package version $version_code: Play reported no certificateSha256Hash to cross-check." >&2
    exit 1
  fi
  reported_hex="$(normalise "$reported" 64)" || { echo "Unreadable certificateSha256Hash from Play: $reported" >&2; exit 1; }

  sha1="" sha256=""
  echo "$package version $version_code: downloaded $(wc -c < "$apk" | tr -d " ") bytes, starting with $(head -c 4 "$apk" | od -An -tx1 | tr -d ' \n')." >&2
  if read_with_keytool "$apk"; then
    reader=keytool
  elif read_with_apksigner "$apk" "$reported_hex"; then
    reader=apksigner
  else
    echo "Neither keytool nor apksigner could read the certificate of $package version $version_code." >&2
    exit 1
  fi

  sha1="$(normalise "$sha1" 40)" || { echo "Unreadable SHA-1 from $reader." >&2; exit 1; }
  sha256="$(normalise "$sha256" 64)" || { echo "Unreadable SHA-256 from $reader." >&2; exit 1; }
  if [[ "$reported_hex" != "$sha256" ]]; then
    echo "$package version $version_code: APK certificate SHA-256 $sha256 does not match Play's certificateSha256Hash $reported_hex." >&2
    exit 1
  fi

  jq -cn --arg package "$package" --arg versionCode "$version_code" \
    --arg sha1 "$sha1" --arg sha256 "$sha256" --arg reader "$reader" \
    '{package: $package, versionCode: $versionCode, sha1: $sha1, sha256: $sha256, reader: $reader}'
done
