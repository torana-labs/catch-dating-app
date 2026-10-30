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

read_with_keytool() {
  local output
  output="$(keytool -printcert -jarfile "$1" 2>/dev/null || true)"
  sha1="$(sed -n 's/^[[:space:]]*SHA1:[[:space:]]*//p' <<<"$output" | head -1)"
  sha256="$(sed -n 's/^[[:space:]]*SHA256:[[:space:]]*//p' <<<"$output" | head -1)"
  [[ -n "$sha1" && -n "$sha256" ]]
}

read_with_apksigner() {
  local apksigner output
  apksigner="$(command -v apksigner || true)"
  if [[ -z "$apksigner" && -n "${ANDROID_HOME:-}" ]]; then
    apksigner="$(find "$ANDROID_HOME/build-tools" -maxdepth 2 -name apksigner -type f 2>/dev/null | sort -V | tail -1)"
  fi
  [[ -n "$apksigner" ]] || return 1
  output="$("$apksigner" verify --print-certs "$1")"
  sha1="$(sed -n 's/^Signer #1 certificate SHA-1 digest: //p' <<<"$output" | head -1)"
  sha256="$(sed -n 's/^Signer #1 certificate SHA-256 digest: //p' <<<"$output" | head -1)"
  [[ -n "$sha1" && -n "$sha256" ]]
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

  sha1="" sha256=""
  if read_with_keytool "$apk"; then
    reader=keytool
  elif read_with_apksigner "$apk"; then
    reader=apksigner
  else
    echo "Neither keytool nor apksigner could read the certificate of $package version $version_code." >&2
    exit 1
  fi

  sha1="$(normalise "$sha1" 40)" || { echo "Unreadable SHA-1 from $reader." >&2; exit 1; }
  sha256="$(normalise "$sha256" 64)" || { echo "Unreadable SHA-256 from $reader." >&2; exit 1; }
  if [[ -n "$reported" ]]; then
    reported_hex="$(normalise "$reported" 64)" || { echo "Unreadable certificateSha256Hash from Play: $reported" >&2; exit 1; }
    if [[ "$reported_hex" != "$sha256" ]]; then
      echo "$package version $version_code: APK certificate SHA-256 $sha256 does not match Play's certificateSha256Hash $reported_hex." >&2
      exit 1
    fi
  else
    echo "$package version $version_code: Play reported no certificateSha256Hash to cross-check." >&2
    exit 1
  fi

  jq -cn --arg package "$package" --arg versionCode "$version_code" \
    --arg sha1 "$sha1" --arg sha256 "$sha256" --arg reader "$reader" \
    '{package: $package, versionCode: $versionCode, sha1: $sha1, sha256: $sha256, reader: $reader}'
done
