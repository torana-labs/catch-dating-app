# Flight enrichment preparation

Flight enrichment reuses the direct AeroDataBox adapter, freshness fences,
polling and subscription implementations. Manual `readyAt` and `manualCurbAt`
remain operational facts. Account/key existence does not prove usability.
No account login, key validation, purchase, secret creation, IAM mutation,
provider call, live purge or deployment is part of offline preparation.

## States and controls

| State | Secret reference | Nonsecret policy | Runtime behavior |
| --- | --- | --- | --- |
| Unpaid / inactive (required now) | Blank | Blank | No secret access or polling; manual provider refresh fails closed; webhook rejects |
| Credential stored, inactive | Still blank; even a populated reference is insufficient | Blank | Same inactive behavior; storage never grants rollout authority |
| Future approved DEV polling pilot | Same-project numeric version | Valid `catch.flight-policy/v1` | Only named programs AND legs; at most five of each, at most 24 hours; alerts remain disabled |
| Alerts or general rollout | Not supported by this preparation | Any other mode rejected | Separate acceptance and implementation required |

`FLIGHT_PROVIDER_POLICY` is a nonsecret Firebase string parameter, independent
of the existing credential envelope. Blank, malformed, not-yet-started and
expired policies fail closed before credential access. The prepared pilot
shape has exactly `schema`, `mode`, `programIds`, `legIds`, `startsAt`,
`expiresAt`, `maxRequestsPerDay`; mode is `polling-pilot`, timestamps identify
an explicit window of at most 24 hours, and the daily limit is 1–100 attempts.
No active policy is supplied by this document. The existing deployment
materializer always writes a blank policy and rejects nonblank overrides,
including otherwise valid pilots. Activation therefore also needs a later
reviewed source change to admit policy materialization. No CI workflow changes
are included here.

Both scheduler and manual refresh reserve before each HTTP attempt in the
existing server-only `rateLimits` collection, sharing `flight-provider`
counters for a UTC day and second. This permits one attempt per fixed second
and at most the selected daily count per project, even across instances.
Sequential polling pauses 1.1 seconds; concurrent traffic can still be denied.
Failed/uncertain requests consume reservations. These are request limits, not
billing-unit or account-wide spend guarantees. A window crossing midnight can
consume two daily allowances. Account usage in another project/client is not
counted; cross-environment use requires account-level budget coordination.
The pilot reads exact leg IDs, avoiding unrelated-program sweep starvation.
No subscription creation, automatic credit refill or webhook ingestion is
wired into this mode. Existing alert tests remain fake-only.

## Proposed secure DEV entry (not authorized to execute yet)

This follows the existing Secret Manager authority and the concurrent secrets
architecture audit; it introduces no alternate credential store.

- Project: `catchdates-dev` (from `.firebaserc`).
- Proposed secret: `FLIGHT_PROVIDER_CONFIG`.
- Proposed first reference:
  `projects/catchdates-dev/secrets/FLIGHT_PROVIDER_CONFIG/versions/1`.
  If the secret already exists, metadata-only review must select the actual
  positive numeric version; never assume 1, use `latest`, or cross projects.
- Payload must have exactly three properties:
  `schema` = `catch.flight-provider/v1`, `apiKey`, `webhookSecret`.
  The webhook secret must be independently generated, random, and at least
  32 non-whitespace characters. The API key is for `api.aerodatabox.com`
  with `X-Api-Key`, not RapidAPI or API.Market.
- Proposed eventual identity:
  `flight-provider@catchdates-dev.iam.gserviceaccount.com`, with
  `roles/secretmanager.secretAccessor` on this secret only. It is not
  provisioned or selected in source. The current default compute identity has
  broader existing secret grants; adding a flight-secret binding alone does
  not isolate it. Runtime Firestore permissions must be
  reviewed separately; no secret admin/version-manager/project-wide accessor
  permission is needed by polling. Deployment/readiness identities need
  metadata, not payload access. Stage/prod use separate project resources.

At a later, specifically approved secure-entry step, the user opens Google
Cloud Console → Secret Manager → **catchdates-dev**, creates or selects the
reviewed secret, and enters the JSON payload themselves in the secret-version
editor. The user supplies the sensitive values locally; do not send them to an
agent, chat, PR, shell command/history, logs, screenshot, dotenv file or source.
An agent may subsequently inspect metadata only. Secret creation/version
addition and runtime IAM each need action-time approval; this text grants none.
Keep both live reference and policy blank after entry. Do not test the key.

## Activation decisions still required

CAT144 owns rollout; the central backend owner coordinates reviewed source and
release order. Before any provider call, choose the paid plan and approve its
billing/license terms, exact DEV targets, time window, attempt/unit budget,
operator and stop procedure. Require independent source review, selected checks,
explicit deployment authorization, metadata-only identity review, and a later
separately authorized provider smoke test. Mumbai pilot quality is unproven.

Provider observation retention is an unresolved product/data decision:

1. Approve whether `arrivalTerminal`, `flightStatus`, `estimatedArrivalAt` and
   provider-authored `actualArrivalAt` become expiring observations, with
   field-level origin, observed-at, expiry and policy-version metadata.
2. Choose the plan-specific duration plus termination/purpose expiry. A
   polling stop or 24-hour pilot expiry does not delete stored observations.
3. Approve read/export behavior on expiry and a reviewed migration strategy for
   existing fields whose individual provenance is unknown. Never infer that
   every existing arrival field is provider-owned; do not erase independently
   authored operational facts. No human writer of `actualArrivalAt` has been
   established; `readyAt`/`manualCurbAt` are distinct.
4. Amend the authored [R11 policy](../../../docs/plans/r11_program_retention_policy.md)
   explicitly before implementing deletion/migration. Current R11 preserves
   flight fields indefinitely and anonymizes only archive + 60 days. Current
   code cleans subscriptions during anonymization, not immediately at archive;
   blank configuration can discard subscription IDs without remote cleanup.
   Inventory/resolve any previous subscriptions before a pilot or shutdown;
   disabling local config cannot stop existing provider deliveries/charges.
   The shared credential loader is also used by retention: an inactive or
   expired policy supplies no cleanup key; an active pilot may allow retention
   DELETE calls outside polling targets/counters. The polling limits do not
   fence that existing cleanup path. Repair it before activation.

No new field provenance or expiry is persisted in this patch because that would
prematurely select a data contract and retention policy. These decisions and
subscription-cleanup repair block live activation, including the polling pilot.

Official references (checked 2026-10-03):
[pricing and caching terms](https://aerodatabox.com/pricing),
[alert credits and retries](https://aerodatabox.com/flight-alert-api-2026/),
[coverage](https://aerodatabox.com/data-coverage),
[direct API specification](https://doc.aerodatabox.com/docs/openapi-direct-v1.json).
Direct Starter is $19/month before tax, 40,000 units and 5 requests/second,
with seven-day caching; Growth allows extended caching while subscribed.
No plan is selected. Alerts use credits converted 1:1 from units and charge
attempts/retries. India coverage figures are completeness estimates, not
accuracy or proof for a specific Mumbai flight. Review current provider terms
and purpose/termination restrictions before selecting retention.
