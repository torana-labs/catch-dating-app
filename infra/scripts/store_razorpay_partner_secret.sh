#!/usr/bin/env bash
# Store the Razorpay Platform Partner OAuth application config as a new
# Secret Manager version, then pin it for Functions deploys.
#
#   bash infra/scripts/store_razorpay_partner_secret.sh dev
#   bash infra/scripts/store_razorpay_partner_secret.sh prod --live
#
# Run by the owner on their own machine, signed in to gcloud with permission
# to add versions to FORM_RAZORPAY_PARTNER_CONFIG. Terraform
# (infra/firebase/form_payments.tf) must have created the secret first.
#
# - Prompts for the OAuth client ID and client secret with hidden input.
# - Builds exactly the JSON the Functions runtime accepts
#   (functions/src/payments/formPayments/formPaymentRuntimeConfig.ts):
#   schema catch.form-razorpay-partner/v1, clientId, clientSecret, mode and
#   credentialSecretId. dev is always mode "test". prod is always mode "live"
#   and refuses to run without --live and a typed confirmation.
# - Sends the JSON to gcloud on stdin: no temporary file, nothing in argv,
#   nothing echoed. Prints only the new version's resource name.
# - With gh signed in, sets FORM_RAZORPAY_PARTNER_CONFIG_VERSION in the
#   matching GitHub environment (dev or prod), which Deploy backend reads.
#   The new config takes effect at the next Functions deploy.
set -euo pipefail
set +x

REPOSITORY=torana-labs/catch-dating-app
PARTNER_SECRET_ID=FORM_RAZORPAY_PARTNER_CONFIG
VAULT_SECRET_ID=FORM_RAZORPAY_MERCHANT_CREDENTIALS

usage() { echo "usage: store_razorpay_partner_secret.sh <dev|prod> [--live]" >&2; exit 2; }

environment="${1:-}"
live=false
if [[ "${2:-}" == --live ]]; then live=true; elif [[ -n "${2:-}" ]]; then usage; fi
[[ $# -le 2 ]] || usage

case "$environment" in
  dev)
    project=catchdates-dev
    project_number=619661127800
    mode=test
    if [[ "$live" == true ]]; then
      echo "dev only takes Razorpay test-mode credentials; run without --live." >&2
      exit 2
    fi
    ;;
  prod)
    project=catch-dating-app-64e51
    project_number=574779808785
    mode=live
    if [[ "$live" != true ]]; then
      echo "prod stores live Razorpay credentials. Rerun with --live to continue." >&2
      exit 2
    fi
    ;;
  *) usage ;;
esac

# Never leave the values in the environment of anything started later.
client_id="" client_secret="" payload=""
trap 'client_id="" client_secret="" payload=""' EXIT

if ! gcloud secrets describe "$PARTNER_SECRET_ID" --project="$project" --format='value(name)' >/dev/null 2>&1; then
  echo "Secret $PARTNER_SECRET_ID does not exist in $project yet. Apply infra/firebase first (docs/infrastructure_as_code.md)." >&2
  exit 1
fi

if [[ "$mode" == live ]]; then
  printf 'This adds LIVE Razorpay partner credentials to %s. Type "live %s" to continue: ' "$project" "$project" >&2
  read -r confirmation
  if [[ "$confirmation" != "live $project" ]]; then
    echo "Not confirmed; nothing was stored." >&2
    exit 1
  fi
fi

printf 'Razorpay OAuth client ID (%s mode, input hidden): ' "$mode" >&2
IFS= read -r -s client_id
printf '\n' >&2
printf 'Razorpay OAuth client secret (input hidden): ' >&2
IFS= read -r -s client_secret
printf '\n' >&2

# The runtime rejects empty values, whitespace and anything over 16 KiB.
# Allowing only printable non-space ASCII also keeps JSON escaping trivial.
valid() {
  local value="$1" LC_ALL=C
  [[ -n "$value" && ${#value} -lt 16384 && "$value" =~ ^[!-~]+$ ]]
}
valid "$client_id" || { echo "The client ID is empty or has spaces or non-ASCII characters; nothing was stored." >&2; exit 1; }
valid "$client_secret" || { echo "The client secret is empty or has spaces or non-ASCII characters; nothing was stored." >&2; exit 1; }

json_string() {
  local value="${1//\\/\\\\}"
  printf '"%s"' "${value//\"/\\\"}"
}

payload="{\"schema\":\"catch.form-razorpay-partner/v1\",\"clientId\":$(json_string "$client_id"),\"clientSecret\":$(json_string "$client_secret"),\"mode\":\"$mode\",\"credentialSecretId\":\"$VAULT_SECRET_ID\"}"
client_id="" client_secret=""

# printf is a shell builtin, so the payload never appears in a process list.
version="$(printf '%s' "$payload" | gcloud secrets versions add "$PARTNER_SECRET_ID" \
  --project="$project" --data-file=- --format='value(name)')"
payload=""

# gcloud names the version by project number; the deploy materializer and the
# runtime require the project ID form.
expected_prefix="projects/$project_number/secrets/$PARTNER_SECRET_ID/versions/"
if [[ "$version" != "$expected_prefix"* || ! "${version#"$expected_prefix"}" =~ ^[1-9][0-9]*$ ]]; then
  echo "Unexpected version name from gcloud: $version" >&2
  exit 1
fi
reference="projects/$project/secrets/$PARTNER_SECRET_ID/versions/${version#"$expected_prefix"}"
echo "$reference"

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh variable set FORM_RAZORPAY_PARTNER_CONFIG_VERSION --repo "$REPOSITORY" --env "$environment" --body "$reference"
  echo "Set FORM_RAZORPAY_PARTNER_CONFIG_VERSION in the $environment GitHub environment. It takes effect at the next Deploy backend run." >&2
else
  echo "gh is not signed in. Set it yourself:" >&2
  echo "  gh variable set FORM_RAZORPAY_PARTNER_CONFIG_VERSION --repo $REPOSITORY --env $environment --body '$reference'" >&2
fi
