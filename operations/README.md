# Catch Operations

`operations/` is the runtime boundary for durable, agent-assisted admin
workflows. It is intentionally separate from `tool/`: repository checks,
generators, migrations, and deploy helpers remain tools, while scheduled or
resumable business workflows live here.

The first reference workflow is `supply-intake`. It projects one immutable,
Operations-owned normalized input snapshot into one exclusive work-item queue,
runs deterministic review steps, creates hash-bound promotion receipts,
reconciles expired events, and proposes source-specific extraction rules. The shipped
runtime is **shadow-only and provider-disabled by default**:

- default plans grant no network requests;
- model calls are disabled;
- public writes are disabled;
- run projection reads a content-hashed input snapshot stored by the Operations
  state store; committed operational JSON is not an input;
- organizer packets are filtered by their declared market, and
  their work items carry a schema-validated, bounded Admin packet projection;
  evidence records, public copy, curation detail, local commands, and raw
  provider payloads are excluded from that Firestore projection;
- Event Intake source results, profiles, and candidates come from the same run
  and work-item model as organizer candidates;
- explicitly orphaned external-event candidates are admitted only with
  organizer evidence. They project as human-owned `resolve` work with the
  `organizer_not_in_inventory` blocker and `event_crawl_todo` flag, and seed a
  normal organizer discovery candidate from the event's organizer evidence;
- rerunning deterministic event ingestion with current organizer inventory can
  auto-attribute a unique scorecard match. The event retains the score,
  signals, keys, rationale, and policy id that cleared the threshold;
- promotion produces a review receipt, never an app, website, or Firestore
  mutation; and
- CN Traveller is discovery-only and requires an official source before any
  candidate can become publication-ready.

Supply Intake is also the freshness authority for future acquisition. Its
discovery planner emits deterministic query intents without reading committed
run logs. During planning, Supply Intake joins those intents and the
event crawl's known source surfaces against immutable
`supply_freshness_coverage` records from completed Operations runs. The frozen,
schema-validated policy currently distinguishes city discovery, candidate
verification, known-organizer event refresh, and event detail
prepublication. Each scheduled or skipped source surface carries
`lastFetchedAt` and `nextEligibleAt`; a fresh skip cites the completed run that
covered it. This is scheduling only: shadow mode still performs no fetch and
therefore creates no new coverage record.

Import a reviewed normalized input snapshot before planning:

```sh
node operations/src/cli/main.mjs ingest-input \
  --input /secure/path/mumbai-reviewed-input.json
node operations/src/cli/main.mjs plan \
  --workflow supply-intake --market mumbai
```

The import is immutable and content-hashed. Raw provider payload fields are
rejected, and changed content requires a new snapshot id.

Phase B adds a guarded acquisition port without enabling a provider. A trusted
runtime may inject either the existing manual-file adapter or a configured
provider adapter. Provider acquisition requires a freshness-scheduled key, an
accepted live policy-gap review decision, positive per-run and monthly caps,
and budget ledgers that match those caps. The port reserves both request
allowances before the provider runs and emits payload-free provenance for
durable evidence. Raw responses remain outside Firestore and outside every
Operations/admin projection.

## Architecture

```text
operations/
  src/cli/                       stable JSON command surface
  src/admin-cli/                 stable admin-action JSON command surface
  src/admin/                     catalog, callable client, receipt storage
  src/platform/                  runs, leases, budgets, ledger, storage, models
  src/workflows/registry.mjs     workflow definitions and factories
  src/workflows/supply-intake/   the reference workflow and source profiles
  test/                          deterministic engine and workflow tests
```

## Admin action CLI

The admin action CLI gives agents the same callable operations that employees
use through the admin console. Its source of truth is
`contracts/admin/actions/`; it does not copy callable business
logic or turn every request/response action into a durable workflow.

```sh
# Discover actions and the ergonomic sequence for a workflow.
node operations/src/admin-cli/main.mjs actions --pretty
node operations/src/admin-cli/main.mjs workflow events --pretty

# Validate one safe, schema-backed example for all workflows without effects.
node operations/src/admin-cli/main.mjs loop --all --pretty

# Reads execute live unless --dry-run is supplied.
node operations/src/admin-cli/main.mjs run overview.get --project PROJECT_ID

# Mutations remain dry-run until action and target are confirmed exactly.
node operations/src/admin-cli/main.mjs run events.update --example
node operations/src/admin-cli/main.mjs run events.update --example --apply \
  --confirm events.update --confirm-target example-event --project PROJECT_ID
```

Live invocations require `CATCH_ADMIN_ID_TOKEN` and
`CATCH_ADMIN_APP_CHECK_TOKEN` (or their explicit flags). Receipts persist only
hashes and bounded metadata. See `docs/operations_platform.md` for authority,
failure, and employee-monitoring behavior.

The file store is the local implementation of the runtime ports. It exists for
CLI, tests, migration parity, and local agents. The trusted Functions adapter
imports validated, immutable shadow projections into Firestore without changing
workflow decisions. State is
written to `operations/.state/` by default and is ignored by Git.

State-changing commands use deterministic ids or guarded replay, and every work
item has exactly one `primaryStage`. Completion, promotion, and reconciliation
repair interrupted companion actions from durable evidence. Heartbeat leases
use a live clock and monotonically increasing fencing tokens to stop superseded
workers from writing run state. The live lease clock is separate from the
deterministic workflow clock, including when `--now` is supplied. Local guards
prove sole ownership of the same directory before entering, preserve any live
owner, and recover dead-process ownership. Run ids are preflighted and
idempotency is serialized before run creation; replay repairs an interrupted
create without retaining a losing collision mapping. Checkpoints make
resumption explicit, with work-item
budget consumption reconstructed from durable inventory after a crash. Budgets
fail closed before network, model, or public-write allowances can be exceeded.
Each run is capped at 10,000 projected work items and fails planning with
`RUN_SHARD_REQUIRED` above that ceiling. Split larger market/source scopes into
multiple runs. The platform and workflow both enforce the same cap. The admin
callable uses a 200-item page and 120-request window: human exceptions are
hydrated eagerly through a server filter, while ordinary inventory advances
only through explicit lazy pages.

`src/workflows/supply-intake/manifest.json` is executable inventory, not prose.
Its schema-backed check discovers workflow directories and compares the
manifest with the executable registry, supported command subset, ordered stages
and lifecycles, explicit active/published/expired lifecycle semantics, complete
stage-closed transition graph, optional source-profile loader, executable
factory methods, maximum supported capabilities, workflow identity, and
platform cap. A plan freezes the smaller capability actually granted by its
checked policy; provider-disabled plans keep `network=false`.
The boundary gate separately scans every `tool/` code subtree for operations
runtime imports and split durable-workflow signals so future admin flows do not
recreate orchestration under a new tooling folder.

## CLI

Run from the repository root or from this package. All commands emit a stable
JSON envelope on stdout; failures emit a JSON error envelope on stderr.

```sh
# Create a deterministic plan from the latest immutable market input snapshot.
node operations/src/cli/main.mjs plan \
  --market mumbai --through 2026-07-28

# Execute the plan into a local shadow inventory.
node operations/src/cli/main.mjs run \
  --market mumbai --through 2026-07-28

node operations/src/cli/main.mjs resume --run RUN_ID
node operations/src/cli/main.mjs queue --run RUN_ID --stage resolve
# Active work is the default; use --lifecycle all for terminal history.
node operations/src/cli/main.mjs queue --run RUN_ID --lifecycle all
node operations/src/cli/main.mjs status --run RUN_ID

# Export canonical run/work-item records for the admin/backend adapter.
node operations/src/cli/main.mjs export-admin --run RUN_ID

# Produce a hash-bound, non-applicable promotion receipt.
node operations/src/cli/main.mjs promote --run RUN_ID

# Create an immutable child run that expires ended work and flags stale evidence.
node operations/src/cli/main.mjs reconcile --run RUN_ID

# Evidence-to-rule lifecycle. Neither command deploys production code.
node operations/src/cli/main.mjs learn propose --source cntraveller
node operations/src/cli/main.mjs learn evaluate --proposal PROPOSAL_ID
node operations/src/cli/main.mjs learn canary --proposal PROPOSAL_ID
node operations/src/cli/main.mjs learn status

# Offline hand-run search: a saved SerpAPI/CSE capture for one planned query
# becomes a new ingest-input snapshot file (no network, no store writes).
node operations/src/cli/search-capture-input.mjs --capture RAW.json \
  --plan PLAN.json --run-key RUN_KEY --captured-at 2026-07-24 --output SNAPSHOT.json
node operations/src/cli/normalize-surface-url.mjs URL --expect-platform instagram
```

Useful common flags:

```text
--repo-root PATH    repository root whose contracts/ validate projections
--state-dir PATH    local durable state root
--now ISO_TIME      deterministic workflow-evidence clock for replay/tests;
                    lease ownership always uses the live system clock
--pretty            pretty-print the JSON envelope
```

`run` accepts `--plan PATH` to execute a previously captured plan. Without one,
it creates the same plan as `plan`. Repeating `run` for an identical plan returns
the original run rather than duplicating work.

`plan` and a planless `run` read the configured Operations store before creating
the frozen plan. That read is what makes freshness survive a CLI or worker
restart. A trusted acquisition runtime can later append coverage as ordinary
immutable run-scoped work items; it must not introduce a mutable global
last-fetched table.

`export-admin` validates every exported run and work-item record with full
draft-07/Ajv semantics against
`contracts/operations/run.schema.json` and `work_item.schema.json`, then writes
`operations/.state/exports/admin/<RUN_ID>.json` by default. Missing or invalid
contracts fail closed. The exported `items` are the canonical persistence
records; UI labels live in `normalizedPayload.title`, and human exceptions carry
the `human_review_required` task flag. Published and terminal records cannot
retain that flag, its blocker, or a human owner. Only completed runs can export;
the path is immutable, and later promotion receipts do not change the frozen
projection.

Organizer publication-packet work items persist the exact bounded fields needed
by the live Organizer Intake workbench under
`normalizedPayload.intake.packet`. Market objects are capped at eight;
risk flags and next actions are capped at twelve; all strings are truncated to
the contract maximum. The Admin projection never includes evidence-record
objects, generated public copy, curation details, local CLI commands, or raw
provider payloads. Changing this projection changes immutable export content,
so verification must create and import a new run id.

Publication packets carry three explicit surface controls:
`publishStatus`, `indexStatus`, and `appVisibility`. A reviewed approval does
not imply any one of them. Web and app evidence gates are evaluated separately,
suppression clears every surface, and event publication code must apply the
organizer's per-surface visibility as a hard ceiling. Compatibility projections
and CLI actions preserve the selected values rather than recreating the former
published, indexed, app-hidden approval default.

Orphan-event work items persist a bounded Event Intake candidate under
`normalizedPayload.intake` with `recordType=orphan_event_candidate`.
The operations contract requires the event entity kind, the
`organizer_not_in_inventory` blocker, an orphan attribution record whose
matched entity is null, and `publicationEligibility=blocked_orphan`. Such a
record can never carry the canonical `published` lifecycle. The paired
organizer lead uses the ordinary organizer-search-candidate contract so the
existing candidate-to-draft handoff remains the only scaffolder.

The export can then be validated without credentials and, after review,
imported into the server-owned admin projection:

```sh
# Dry run: parses contracts, authority, joins, totals, and hashes only.
npm --prefix functions run operations:import-projection -- \
  --file operations/.state/exports/admin/RUN_ID.json

# Internal Firestore apply: still cannot publish an event or organizer.
npm --prefix functions run operations:import-projection -- \
  --file operations/.state/exports/admin/RUN_ID.json \
  --apply --environment dev --project PROJECT_ID --confirm-run RUN_ID
```

Apply requires Application Default Credentials. It writes work items before the
run becomes discoverable, resets persistence revisions to zero while retaining
source revisions in reserved projection metadata, and treats a run snapshot as
immutable. The environment must match its configured Firebase project alias,
and production is detected from both the environment and project id. Replay
verifies every item, repairs missing items, rejects changed records, and enforces
the frozen work-item budget. An exact retry is a no-op; changed content requires
a new run id.

Completed local runs also carry a sorted inventory hash. `reconcile` binds that
hash and the source plan into a new run instead of editing the source snapshot,
so both exports remain immutable and independently importable.

## Queue model

Primary stages are exclusive and intentionally match the four Intake tabs:

```text
incoming -> verify -> resolve -> ready
```

Overlapping concerns such as `source_verification`, `possible_duplicate`, and
`official_source_required` are `taskFlags`, not stages. Publication, rejection,
expiry, cancellation, and takedown are `lifecycleStatus` outcomes; they never
become primary stages. The CLI and admin callable expose this same
persisted projection; the browser must not recreate the reducer.
The workflow contract also identifies which workflow-owned lifecycle values
mean active, published, and expired. Platform queues, canonical status mapping,
counters, and reconciliation cleanup consume those semantics instead of
hardcoding Supply Intake tokens.

## Model boundary

`GuardedModelRunner` accepts only a provider injected by a trusted runtime. It
hashes prompt inputs, validates cached and fresh output against JSON Schema,
enforces input size plus per-run and monthly budget caps, and records
model/prompt versions. Cached,
schema-valid output may be replayed while calls are disabled; a cache miss fails
closed with `MODEL_DISABLED`. Enabled calls require explicit input-token,
output-token, and cost reservations, and provider-reported actual usage is
reconciled against both ledgers before output is accepted.

Supply Intake owns one deterministic-first extraction router around that
runner. Deterministic success bypasses the model. Fallback is allowlisted only
for an unknown source, an explicitly unstable source profile, or an ambiguous
identity scorecard. It rejects copy, ranking, per-user, and contact inputs. A
model result is proposal-only and always requires review; every extracted field
creates an immutable rule candidate, and per-source dependence records count
provider calls and cache replays. The checked policy keeps the provider null
and every run/month cap at zero. Enabling it requires an injected provider, the
exact accepted policy-gap decision, and matching run and monthly ledgers.

## Source learning

Learning is evidence-to-proposal, never self-modifying production code:

```text
observed failures -> proposal -> fixture replay -> shadow canary -> reviewed activation
```

The current learner supports code-owned CN Traveller mapping and Luma JSON-LD
candidates. It summarizes source-level work-item support, blocker/task-flag
frequencies, and reviewer field corrections by source and field. A trusted
worker imports the immutable Firestore correction record through
`learn record-correction`; the file argument is a transport boundary for the
worker and tests, never a checked-in or human-maintained source of truth.
Recording is append-only and creates the correction's replay fixture in the
learner store.

Proposal generation freezes the declared candidate, source fixture, exact
correction-fixture ids, model-candidate ids, and a bounded deterministic
correction map. A model candidate without a matching human correction fixture
cannot enter evaluation. Evaluation
replays both the code-owned source fixture and every correction fixture through
the allowlisted interpreter. A deliberately wrong correction fails replay and
cannot canary; mutable proposal evidence and unknown code fail closed. Canary
creation writes only a zero-traffic shadow record. It derives the newest
immutable evaluation, repairs a stale proposal pointer left by a crash, and
blocks when that newest record failed; it cannot fall back to an older pass.
Evaluation and canary work for one proposal are serialized.

There is no automatic rule activation, live traffic comparison, deployment,
or configured live source/model provider in this package. Those remain
owner-gated capabilities, not implied by the learning commands or fallback
seams.

External-event publication is also outside the Operations writer boundary.
Supply Intake may carry explicit resolved/waived blocker evidence into its
reviewed projection, but `adminPublishListingEvents` (with the
`onSupplyIntakeListingApproved` policy trigger through the same writer) and
`adminTakedownExternalEvent` are the only mutation authorities. Both use
dry-run/apply execution, immutable idempotency receipts, and a server-side
recheck of market, organizer ceiling, candidate snapshot, and policy-gap
waivers.

Promotion eligibility reads only source-publication policy frozen into a
completed run plan. Promotion revalidates the plan and inventory hash before
deciding. Each
non-applicable receipt includes the policy snapshot and binds its blocked
status, non-applicability, blockers, and guardrails into its immutable id and
hash; replay validates both receipt and companion action before repairing an
interrupted write.

## Verification

```sh
npm --prefix operations test
npm --prefix operations run check
npm --prefix operations run manifests
```
