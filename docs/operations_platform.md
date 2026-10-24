---
doc_id: operations_platform
version: 1.34.0
updated: 2026-10-18
owner: operations_platform
status: active
---

# Operations Platform

## Purpose

`operations/` is Catch's runtime boundary for durable, resumable business
workflows that may be performed by people, deterministic workers, or bounded
agents. Supply Intake is the reference workflow. Future admin-console workflows
may reuse the platform primitives, but they should only become operations when
they need durable work items, retries, leases, budgets, decisions, or receipts.

This boundary keeps three concerns separate:

| Surface | Owns | Does not own |
|---|---|---|
| `operations/` | Workflow plans, runs, work items, leases, checkpoints, action receipts, inference budgets, source profiles, learning evaluations, and blocked promotion evidence | Repository linting, schema generation, release deployment, or React presentation |
| `tool/` | Repository checks, generators, migrations, deploy helpers, data repair, and compatibility producers consumed by operations adapters | Long-running business workflow state or agent orchestration |
| `tool/remote_ops_manifest.json` | Inventory and preconditions for commands that can read or mutate external systems | Workflow queues, run state, or autonomous scheduling |

Organizer-intake and event-guide tools remain bounded compatibility producers
for reviewed migrations and Marketing packaging. Supply Intake no longer reads
their committed generated artifacts, and the retired host-discovery tree has
been removed. New orchestration belongs in `operations/`; do not extend legacy
folders with another workflow engine.
`operations-tool-boundary-v3` scans every code file under `tool/` for direct
operations-runtime imports and for durable-workflow signals aggregated by tool
subtree. File-count ceilings remain as an additional ratchet for the remaining
known compatibility producers.

Supply Intake's `manifest.json#compatibilityInputs` is empty. The legacy
adapter, host-discovery corpus, and Event Intake bridge publisher are retired
together. A single-spine boundary check fails if those paths, queue
collections, or generated bridge basenames return.

Normalized ingestion is market-bound and immutable. `ingest-input` validates a
bounded Supply Intake snapshot, rejects raw provider payload fields, computes a
content hash, and stores it outside the repository. Planning selects the latest
snapshot for the requested market, filters organizer packet geography again,
and freezes both the snapshot and deterministic discovery plan into the plan.
Changed content requires a new snapshot id and a new run.

### Supply freshness authority

Supply Intake owns one schema-validated freshness policy for acquisition work.
It classifies work by purpose rather than applying one global TTL:

| Work kind | Default window | Ledger scope |
|---|---:|---|
| City discovery sweep | 720 hours | Stable query `runKey` |
| Candidate verification | 2,160 hours | Stable candidate-verification `runKey` |
| Known-organizer event refresh | 24 hours | Organizer entity plus source surface |
| Event detail prepublication | 6 hours | Event entity plus source surface |

The policy lives in
`operations/src/workflows/supply-intake/config/freshness_policy.json` and is
validated before a plan is created. Freshness evidence is an immutable
`supply_freshness_coverage` work-item projection belonging to a completed
Operations run. Planning reads only coverage whose parent run completed, uses
the newest coverage for the same kind and scope, and records both
`lastFetchedAt` and `nextEligibleAt`. A skipped request cites the exact completed
run and coverage record that satisfied it. Restarting a worker does not reset
this decision because it is derived from the persisted run and work-item
ledger, not process memory or committed search-run JSON.

The other time bounds answer different questions and do not override fetch
cadence:

- `<city>/<week>/` event-guide folders define Marketing publication weeks.
  They are not operational inputs and do not set supply freshness.
- Supply Intake snapshots freeze normalized reviewed evidence into each plan.
  The snapshot timestamp is provenance, not permission to refetch a provider.
- Per-kind freshness decides whether a planned query or source surface is
  eligible to be fetched. It is the only acquisition-cadence authority.

Supply Intake owns the deterministic discovery planner and stores its reviewed
normalized input snapshots outside the repository. Committed search plans and
historical run JSON are not scheduling or execution inputs.

### Supply acquisition port

Supply Intake owns one acquisition method shape: a trusted runtime supplies a
freshness-scheduled `runKey` to an injected acquisition port and receives a raw
JSON payload plus bounded provenance. The workflow never constructs a network
client, and the React admin has no acquisition or model client.

Two adapters implement that port (on-demand page fetching for intake
requests is a separate channel, described below):

- `manual_file` reads the same reviewed JSON payloads used by the existing
  compatibility capture commands. It consumes no network allowance and
  preserves the existing normalization output.
- the provider adapter accepts an injected provider client only when
  `acquisition_policy.json` enables it, names an adapter, freezes positive
  per-run and monthly request caps, and cites an accepted
  `recurring_event_crawl_policy` decision from
  `organizerPolicyGapReviewDecisions/{decisionId}`. A policy decision records
  review state but does not enable acquisition by itself; the checked config is
  the separate implementation gate.

Provider calls reserve one request against both ledgers before invoking the
adapter. Missing config, a missing or non-accepted policy decision, a missing
provider injection, an unplanned/fresh `runKey`, or either exhausted ceiling
fails closed before the provider runs. The monthly ledger is a trusted-runtime
port and must be initialized from durable usage for its calendar-month window;
it is never inferred from browser state.

Raw payloads remain in the acquisition result long enough for deterministic
normalization or approved external-artifact storage. They are never part of an
Operations run, work item, action receipt, admin projection, or Firestore
document. `acquisitionReceipt()` strips the payload and retains only its hash,
byte count, source/request identifiers, adapter/policy decision, capture time,
and budget evidence. The checked policy fixes
`firestorePersistenceAllowed=false` and
`persistence=external_artifact_store_only`.

### Supply intake requests

Every way an organizer enters Catch creates one intake request
(`contracts/operations/supply_intake_request.schema.json`): a sales
associate's or sales partner's nomination, an organizer's own submission, or
an Admin-started discovery run. A request names a market, a seed (organizer
name, up to ten URLs, notes, categories) and who submitted it. A nomination
requires the submitter's uid, a partner nomination also requires the
partner id, and discovery requests are always submitted by `system`.

`supply-intake/intake-request.mjs` turns a request into one listing:

1. **Gather.** Each seed URL is normalized and read through an injected page
   source. The deterministic adapters in `supply-intake/sources/` extract
   organizer and event candidates. Organizer pages that a seed links to on an
   adapter platform (an event's organizer, a profile's `sameAs`) are read too,
   one hop from the seed, up to twelve pages. A page that cannot be read, or
   whose template drifted, becomes a recorded outcome rather than an error.
2. **Build the listing.** Name, description, image and locality each record
   the page and adapter they came from. Organizer pages outrank event pages,
   and a nominator's typed name is used only when no page names the
   organizer. Links keep only organizer surfaces, and their normalized keys
   become the identity keys used for matching. Upcoming events are
   deduplicated by platform id and by title and start time across platforms;
   past events are counted, not listed.
3. **Record gaps.** Missing fields, unreadable seeds, a name that differs from
   the nomination, an exhausted fetch budget and similar conditions are
   listed as gaps. Gaps that more evidence could close mark the listing
   `researchNeeded`.

The listing is the only content of the request's input snapshot
(`intakeListings`). Supply Intake projects it as an `organizer_listing_draft`
work item, and each upcoming event as a `listing_event_candidate` linked to
it. Both are owned by a person: a listing waits in Verify for staff review (or
in Resolve when it has no name or no readable source), and an event stays
ineligible for promotion until its organizer's listing is approved. The work
item contract validates both projections strictly, and every listing field
carries provenance naming its source page.

Two page sources implement capture. `StaticPageSource` reads pages a person
saved and never touches the network. `GuardedPageFetchPort` fetches live
pages only when `acquisition_policy.json` enables `pageFetch`, cites an
accepted `on_demand_page_fetch_policy` decision, and freezes positive
per-intake and monthly request ceilings. That channel is separate from the
recurring crawl provider and its `recurring_event_crawl_policy`. The fetcher
(`platform/network/page-fetcher.mjs`) connects only to public addresses: every
DNS answer is checked at connect time, so a name cannot pass the check and
then rebind to a private address. It refuses credentials in URLs and
non-standard ports, revalidates every redirect (three at most), honours
robots.txt for its own product token (a missing file allows everything; an
unreachable one disallows everything), and stops at ten seconds or 4 MB.
Robots.txt and each redirect consume budget like any other request. A capture
returns a page snapshot without raw HTML plus a receipt holding only the
outcome, hashes, sizes and budget window.

#### Front doors

Three front doors create requests today, all through one in-transaction
service (`functions/src/operations/supplyIntake/requests.ts`). Each door
derives its request id deterministically, so a retried submission finds its
own request, and the same id with different content is refused rather than
overwritten. Every request records its `origin`.

- **Admin nomination.** `adminNominateOrganizer` (roles `admin`, `adminOwner`,
  `salesStaff`) takes a name and/or links, market, notes and categories. It is
  audited and rate-limited, and the id is keyed on the nominator and their own
  request id.
- **Website host applications and partner nominations.** Both already arrive
  as `salesInboundIntents`, which ad attribution, alerts and partner credit
  read. `onSalesInboundIntentForIntake` turns each intent that names an
  organizer or a link into a request: a `self_submission` for the website, a
  `nomination` credited to the partner for a partner. Applicant name and email
  stay on the intent; only the organizer name, link, city and notes travel.

Free-text cities resolve to the market slug Supply Intake keys work by
(`mumbai`, `bengaluru`). An unknown city becomes `unassigned` for staff to
place.

#### Trusted intake worker

Front doors write `supplyIntakeRequests/{requestId}` as `queued`
(`contracts/firestore/supply_intake_requests.schema.json`); clients can
neither read nor write it. `onSupplyIntakeRequestCreated`
(`functions/src/operations/supplyIntake/`) then:

1. Leases the request in a transaction for nine minutes. A request still under
   lease is left to its worker; an expired lease is taken over.
2. Chooses the page source. When policy disables page fetching, it uses a
   source that captures nothing, so the listing still forms from the
   nomination and every seed becomes a gap. When page fetching is enabled, it
   validates the cited decision before anything else, then reserves the
   intake's allowance against `supplyIntakeUsage/{YYYY-MM}` in a transaction,
   so the monthly cap holds across concurrent workers. It releases what the
   intake did not use afterwards.
3. Runs gathering, listing assembly and Supply Intake in a scratch file store,
   using the packaged Operations runtime that the Functions build copies into
   `lib` (`functions/scripts/copy-operations-runtime.cjs`, checked again
   before deploy).
4. Writes page snapshots to the server-only Storage path
   `supply-intake/snapshots/{requestId}/{snapshotHash}.json`, then imports the
   run's canonical projection idempotently into `operationRuns` and
   `operationWorkItems`.
5. Records the result on the request: run, listing and event work items, gaps,
   snapshot paths and capture receipts.

A failure releases the lease and leaves the request `queued` for the
platform's redelivery. The third failed attempt, or an invalid request or
policy, is terminal and recorded. `recoverSupplyIntakeRequests` runs hourly
and picks up queued requests and expired leases whose events were lost.

#### Approval

Staff approve a listing with `adminApproveOrganizerListing`
(`functions/src/admin/organizerListingApproval.ts`; roles `admin`,
`adminOwner`, because approval opens Sales records). The reviewer confirms
the name, public slug, an open launch market and the organizer type, ticks the
public-web checklist that Organizer Intake decisions use, and quotes the
listing's `contentHash`; a listing rebuilt since the review is refused. One
transaction then:

- creates the organizer published, unclaimed and `noindex` (`robots: noindex,
  follow`), hidden in the app, from the listing's name, description,
  categories and links (no image until media rights are settled), and reserves
  its route;
- records the curation receipt (`create_entity_draft`) and an `approve_public`
  review decision;
- sets the request's `approval` (organizer, approver, Sales owner, a hash of
  what was approved);
- links the website or partner enquiry the request came from, which credits
  the partner;
- opens the Sales account, a `new_enquiry` opportunity, a research task to
  check the page and its events, a follow-up to invite the organizer to claim
  it, and a `listing_approved` activity whose `source` names the request.

An associate who nominated the organizer owns its Sales work; otherwise the
approver does. Approval is idempotent per listing: an identical retry replays,
and a different approval of the same listing is refused. Indexing and app
discovery remain later decisions, after the organizer is verified. Matching a
listing to an organizer Catch already lists is the reviewer's check for now.

## Reference Layout

```text
operations/
  src/cli/                         stable JSON command surface
  src/admin-cli/                   catalog-driven admin callable client
  src/admin/                       action catalog, client, local receipts
  src/platform/                    reusable execution and persistence ports
  src/platform/network/            guarded public-web page fetcher
  src/workflows/registry.mjs       workflow inventory and factories
  src/workflows/supply-intake/     reference business workflow
  test/                            engine, adapter, safety, and replay tests

contracts/operations/              canonical persisted-record JSON Schemas
contracts/admin/                   admin action/workflow catalog
functions/src/operations/          trusted persistence and worker-side adapters
functions/scripts/operations/      trusted, apply-guarded projection operators
functions/src/admin/               admin-authenticated read/decision adapters
admin/src/features/intake/         task-first human-review presentation
admin/src/features/operations/     agent action receipt monitor
```

Only platform primitives and generic token validation belong in
`operations/src/platform`. Each workflow owns its stage order, lifecycle and
entity vocabulary, transition graph, candidate selection, source policy,
extractors, reconciliation policy, and publication eligibility. The registry
binds those definitions to a manifest, executable factory, and supported CLI
command subset. Lifecycle meaning is explicit: each descriptor and frozen plan
maps its workflow-owned statuses into active, published, and expired semantic
groups. Generic queues, canonical projections, counters, terminal cleanup, and
reconciliation summaries use that mapping rather than Supply Intake strings.

## When A Feature Is An Operation

A feature should use the operations platform when at least one of these is true:

- work survives a process restart or spans multiple attempts;
- more than one worker can contend for the same item;
- an external or model budget must be enforced;
- a human decision must be joined back to an automated run;
- the result can cause a public, financial, safety, access, or data mutation;
- replay, reconciliation, or a durable audit receipt is required.

Read-only dashboards and ordinary request/response mutations should keep their
existing feature/controller/API architecture. Do not force every admin feature
into a universal workflow DSL.

## Admin Action Command Surface

`contracts/admin/admin_action_catalog.json` is the shared inventory for the
admin console and `operations/src/admin-cli/main.mjs`. It maps each stable
action id to one existing role-gated Firebase callable, request schema, owning
GUI path, workflow, risk, example, and confirmation policy. The parity gate
fails when the admin API gains or loses a callable without the catalog, when a
request lacks a strict schema, when a Function export is missing, or when a
mutation lacks explicit confirmation.

The command surface is intentionally thinner than the durable workflow engine.
Ordinary admin reads and mutations remain in their existing repositories and
callables; the CLI invokes those same contracts rather than reimplementing
business rules. An action becomes a durable operations workflow only when it
needs the run, work-item, lease, budget, checkpoint, or decision model described
above.

Common discovery and validation commands are:

```sh
node operations/src/admin-cli/main.mjs actions --pretty
node operations/src/admin-cli/main.mjs workflow organizer-intake --pretty
node operations/src/admin-cli/main.mjs describe events.update --pretty
node operations/src/admin-cli/main.mjs loop --all --pretty
```

Reads execute live by default; `--dry-run` prevents the invocation. Mutations
are dry-run by default and require `--apply --confirm <action-id>`. Actions tied
to a specific record also require `--confirm-target <exact-target>`. Live calls
need a Firebase ID token and App Check token plus a Firebase project or explicit
Functions base URL. Tokens are accepted through `CATCH_ADMIN_ID_TOKEN` and
`CATCH_ADMIN_APP_CHECK_TOKEN`; they are never persisted in receipts.

Every live call starts a remote `adminActionExecutions/{executionId}` receipt
before invoking the business callable, then advances it to one immutable
terminal state: succeeded, failed, or indeterminate. Network timeouts, broken
response envelopes, and unclassified HTTP failures are indeterminate because
the server may have applied a mutation before the client lost its result; agents
must inspect the target and receipt rather than retrying automatically. Only
action identity, actor, roles, target, timestamps, hashes,
CLI version, and bounded failure metadata are stored. Request and response
bodies are not. A local mode-0600 hash-only receipt is written as independent
recovery evidence. If the remote start fails, no business action runs. If the
business action succeeds but the terminal receipt fails, the CLI reports
`ADMIN_ACTION_RECEIPT_INCOMPLETE` with `actionCompleted: true` and the local
receipt path so an agent cannot safely retry as if nothing happened.

Employees monitor these receipts at `/operations`. Manual execution continues
in the owning admin route named by the catalog; the monitor is read-only and
does not become a second implementation of safety, access, finance, intake, or
publishing behavior. Direct Firestore client access is denied. Listing and
recording cross only App-Check-protected, rate-limited callables.

## Canonical Runtime Records

The canonical schemas live under `contracts/operations/`. The minimum durable
record set is:

- `OperationRun`: workflow/version, execution mode, status, budgets,
  checkpoints, counters, and terminal summary;
- `OperationWorkItem`: one source entity, one exclusive primary stage, task
  flags, blockers, decision provenance, lease state, and lifecycle status;
- `OperationActionReceipt`: immutable, hash-bound evidence for every attempted
  state transition or side effect;
- `OperationDecision`: deterministic, model, agent, or human judgment with
  input/output hashes and policy versions;
- `OperationLease`: bounded ownership with expiry and compare-and-set renewal;
- `OperationPublicationPlan`: proposed writes and preconditions, separate from
  their execution;
- `OperationRuleProposal` and `OperationRuleEvaluation`: the source-learning
  lifecycle and its fixture/canary evidence.

Identifiers and idempotency keys must be deterministic for identical inputs.
Retries may append receipts but must not duplicate work items or external
effects. Persisted timestamps use UTC ISO-8601 strings at JSON boundaries and
Firestore timestamps inside trusted repositories.

The local reference runtime preflights requested run ids, reserves a serialized
plan idempotency mapping before it creates the run, and removes only its exact
mapping if a concurrent run-id collision wins. It then repairs a missing or
incomplete run on replay. It
reconstructs work-item budget consumption from durable inventory before
resuming checkpoints. Lease guards verify directory identity and sole ownership
before entering, retain a guard if any recorded owner is live, and can
quarantine a guard orphaned by a dead process. Recovery first installs a unique
marker and then rechecks directory identity and every owner, so an acquirer
that appears during stale inspection cannot be quarantined. Lease heartbeats always use the
live lease clock; deterministic `--now` affects workflow evidence only and can
never freeze ownership expiry. Promotion replay similarly validates an
immutable, safety-outcome-bound receipt and repairs its companion audit action
when an interruption occurs. Completed runs bind their sorted work-item
inventory into a durable hash; post-run commands reject cardinality, budget,
join, counter, or content drift. Completion, promotion, and reconciliation
replay validate deterministic action identities and repair a missing companion
action after interruption. Reconciliation never edits its completed source: it
creates a lineage-bound immutable child run with new work-item ids, so an
already imported Firestore snapshot remains replayable. Every entry point binds
persisted mode, capabilities, budget, plan, and workflow contract back to
frozen evidence.

## Supply Intake Stage Contract

Supply Intake exposes the same inventory to its CLI, persistence adapter, and
admin UI. A work item has exactly one primary review stage:

```text
incoming -> verify -> resolve -> ready
```

Publication, rejection, expiry, cancellation, and takedown are lifecycle
outcomes, not overlapping review stages. Concerns such as
`possible_duplicate`, `official_source_required`, `missing_location`, and
`human_review_required` are task flags or blockers. The browser must render the
persisted projection rather than independently reconstructing stage membership.
Supply Intake declares `active` as active, `published` as published, and
`expired` as expired; those literal values are workflow vocabulary, not a
generic platform requirement.

The Event and Organizer Intake tabs remain the human-review surfaces. The
operations projection adds run health and exception inventory without replacing
their source evidence or backed decision callables.

Supply Intake `0.4.0` makes missing organizer attribution representable without
weakening publication. A source-backed event capture must explicitly choose
`attributed` or `orphan`; accidental omission still fails. An orphan projects
to Event Intake as human-owned Resolve work with
`organizer_not_in_inventory`, `event_crawl_todo`, and
`publicationEligibility=blocked_orphan`. The same evidence creates a normal
organizer discovery candidate, so the existing reviewed organizer-draft
handoff can resolve the missing inventory. On a later ingest, a unique
organizer-inventory match above the source-mention resolution threshold clears
the blocker and records the policy id, score, matching signals, blocking keys,
and rationale. The React admin does not run this matcher.

Organizer discovery can run with `--intake-scope organizer`. This scope does
not require or project Event Intake candidates, so each launch market can
produce an immutable organizer queue independently. Normalized organizer
candidate fields are carried in the work item's bounded Admin projection.
Supply Intake `0.2.0` also emits content-hash-bound field provenance for each
candidate value that can participate in the organizer-draft handoff; private
raw-provider payloads remain excluded. Organizer publication-packet work items
also carry a schema-validated Admin projection with only the identity, markets,
blockers, six-check approval checklist, aggregate evidence counts, public-state
summary, bounded decision state, and next actions needed by the workbench.
Markets are capped at eight, risk flags and next actions at twelve, and every
string is truncated. Evidence-record objects, public copy, curation details,
local CLI commands, and raw provider payloads remain outside the canonical
Firestore work item. The live Organizer Intake tab
selects the newest completed organizer run per launch market and ignores
historical runs rather than merging duplicate snapshots.

The live Event Intake read projects source profiles, source results, event
candidates, and orphan-event work from the newest completed Supply Intake run
per launch market. Invalid projections fail the read instead of rendering
partial evidence. Intake approval remains only a review decision; the contract
and promotion eligibility both independently forbid publishing an orphan.

### Admin projection bridge

`export-admin` emits one canonical, hash-bound run snapshot. The trusted
`operations:import-admin-projection` operator validates that snapshot again,
requires shadow mode and zero network/model/public-write/rule-deploy authority,
and writes only `operationRuns` and `operationWorkItems`. Dry run needs no cloud
credentials. Apply requires an explicit environment, the exact Firebase
project configured for that environment, project-aware production confirmation,
and matching run-id confirmation plus Application Default Credentials.

Work items are created before the run record, so a new run is not discoverable
half-imported. Firestore persistence revisions start at zero; the local source
revision and whole-export hash remain in reserved projection metadata. Imported
run snapshots are immutable: replay verifies the run and every expected item,
repairs missing items, rejects changed records, and enforces the frozen
`maxWorkItems` budget. Only completed Supply Intake shadow snapshots can be
exported or imported. Post-run promotion evidence does not change the frozen
run action counter or canonical export, and a changed export at the same path
fails instead of overwriting prior evidence. Changed content must use a new run
id. The importer
cannot write events, organizers, public pages, publication plans, or any
source/provider state.

`reconcile` follows that immutability rule locally. It creates a new completed
run whose plan binds the source run, source plan hash, source inventory hash,
and UTC reconciliation window. That child can be exported and imported without
conflicting with the prior snapshot.

One run is capped at 10,000 work items. Planning fails with
`RUN_SHARD_REQUIRED` before execution when the projected market/source scope is
larger; callers must split the input into multiple runs rather than creating an
unbounded queue. The platform run assertion, workflow plan assertion, JSON
Schema, Functions validator, importer, and pagination capacity tests enforce
the same 1-to-10,000 bound. At 200 items per request, a maximum exception lane
requires at most 50 reads. The callable allows 120 reads per minute, the query
does not automatically retry, and the contract proves that one complete
exception hydration plus a complete lazy ordinary drain remains inside that
window.

Full-run stage and human-review aggregates travel on the run metadata so the
admin rail remains accurate when a work-item response is paginated. A selected
run without authoritative aggregates fails closed; active plus terminal must
equal total inventory, stage totals must equal active inventory, and human
review cannot exceed active inventory. The controller loads one ordinary page,
then drains only the run-pinned, server-filtered `human_review_required` lane so
every counted exception is inspectable. Its ordinary cursor remains available
through explicit **Load 200 more** pages. Cursor loops, cross-run pages, summary
changes, and cardinality mismatches fail closed. Published and terminal history
does not appear in active stage queues, and terminal records cannot retain a
human-review owner, flag, or blocker. Run pagination remains explicit
loaded-page state. Both item lanes order by document id; runs order by
`updatedAt` and document id rather than treating lexical ids as time.

The Admin read projection isolates individual unavailable work-item records
without changing canonical worker or write validation. It scans at most 200
ordered documents, with one overflow witness, and returns healthy rows plus
bounded document-id/reason/path/code diagnostics. Raw records, field values and
validation messages are excluded. A malformed record, document-id mismatch,
query-scope mismatch or unsupported stage is read-only unavailable evidence;
query/transport errors, malformed runs and non-authoritative run summaries
still fail the request. Strict worker reads, actions and persisted writes keep
the canonical contract, including every required nullable packet field.

`workItemPage` is optional for existing/sample responses. When present, its
`scannedCount` equals healthy plus unavailable records in that raw page. The
ordinary and filtered exception lanes retain separate accounting; unavailable
exception documents remain visible without becoming healthy or actionable.
Both lanes advance by the last scanned document id, including on all-invalid
pages. Work-item cursors accept up to 1,500 characters and remain opaque;
run-cursor semantics and bounds are unchanged. The Operations and Organizer
Intake workspaces preserve authoritative full-run summaries, expose unavailable
rows for review, and retain explicit ordinary-page continuation. An unavailable
publication packet cannot grant readiness, approval or a write capability.

## Execution And Authority Lanes

Every run declares an execution mode and fails closed when it requests a
capability that mode does not grant.

| Lane | Allowed | Default |
|---|---|---|
| Shadow | Local/replay inputs, deterministic reducers, cached schema-valid model output, review queues, plans, and receipts | Enabled |
| Assisted | Approved source fetches and bounded model calls through injected providers; no public writes | Disabled until source/model policy exists |
| Publication | Execution of a reviewed publication plan by a separately authorized worker | Disabled until write policy, IAM, and rollback/takedown paths exist |

React clients never receive worker credentials and never invoke source or model
providers directly. Admin callables require the existing role, App Check, input
validation, rate-limit, and audit-log boundaries. Workers use separate service
identities and may only access the collections and side effects required by
their workflow role.

## Target Deterministic-First Decision Order

Supply Intake resolves each task in this order:

1. exact identifiers, canonical URLs, schema checks, source policy, and other
   deterministic rules;
2. previously activated source-specific declarative rules;
3. cached, hash-matched, schema-valid inference;
4. bounded model inference when the run grants a model budget;
5. human review when confidence, conflict, rights, policy, or publication risk
   remains unresolved.

The target human-escalation rate is an operational SLO, not an unsafe bypass.
Measure it alongside sampled precision, stale/incorrect listing rate, and
correction/takedown latency. Promotion thresholds must be calibrated in shadow
runs before the system is allowed to optimize for a sub-one-percent exception
rate.

The shipped Supply Intake run performs deterministic extraction over reviewed
inputs and freezes a disabled model policy with zero run/month ceilings. A
trusted worker may inject the single guarded extraction router, but a cache
miss remains closed until the owner selects a provider and monthly ceiling
through the policy-gap flow. Model output is proposal-only: every field becomes
an immutable rule candidate and cannot be evaluated without a human-verified
correction fixture. Per-source routing evidence reports dependence with an
expected declining trend. The React admin never receives a provider or calls
this path.

## Source Learning

The learning loop turns repeated inference into reviewed, testable behavior:

```text
receipts -> recurring pattern -> rule proposal -> fixture replay
         -> shadow canary -> reviewed activation -> drift monitoring
```

The current learner supports two code-owned candidate families: CN Traveller
editorial-card mappings and Luma JSON-LD events. Admin edits of values seeded
from Supply Intake create immutable, server-owned field-correction evidence in
Firestore. Each correction includes the source profile, field, extracted and
corrected values, artifact lineage, and a deterministic fixture id. A trusted
worker mirrors that evidence into the learner; operational truth is not a
checked-in JSON corpus.

Proposal generation freezes source-level support, blocker/task-flag
frequencies, per-field correction counts, the exact correction-fixture ids, and
a versioned candidate already declared in code. Evaluation compiles that exact
frozen candidate through an allowlisted interpreter and replays both the
code-owned gold fixture and every correction fixture; it cannot pass by running
an unrelated shipped extractor. Conflicting corrections abstain rather than
inventing consensus. Unknown code, unsafe paths, mutated proposal evidence,
missing fixtures, and unsupported versions fail closed. A canary record has
zero traffic and cannot activate or deploy anything.

This is a safe learning-lifecycle scaffold, not autonomous algorithm discovery.
There is no inference-backed proposal generator, held-out corpus service,
production traffic comparator, drift monitor, activation worker, code writer,
pull-request creator, or deployment path. A source-specific code parser remains
a normal reviewed code change with tests and CI; the runtime never writes or
deploys arbitrary executable code.

Canary creation derives the newest evaluation from append-only evidence rather
than trusting the proposal pointer. It repairs a stale `latestEvaluationId`
after an interrupted evaluation write. A newer failed evaluation blocks
advancement even if an older evaluation passed; the runtime never searches
backward for a convenient passing result. Evaluation and canary operations for
one proposal are serialized under the same local guard.

CN Traveller starts discovery-only: an editorial mention can seed a candidate
and source attribution, but an official event or organizer source is required
before publication readiness. Luma may supply stable provider identifiers, but
network acquisition remains disabled until source cadence, terms, and spend
policy are approved.

## Promotion, Publication, And Reconciliation

The canonical `OperationPublicationPlan` schema and backend reducer exist, but
the shipped local runtime does not create one. `promote` requires a completed,
inventory-hash-bound run and emits only a hash-bound, non-applicable review
receipt with `applyAllowed: false`. It cannot publish or mutate an event,
organizer, website, or app record.

Organizer draft creation is deliberately outside `promote`. The reviewed
Admin action `adminCreateOrganizerDraftFromCandidate` re-reads the exact
organizer work item and may create only a hidden, unclaimed, source-backed
canonical draft. Its deterministic curation receipt is the durable join back
to the Intake Ready stage; publication, indexing, crawling, app visibility,
and ownership remain separate governed operations.

Organizer review approval and exposure are also distinct. The review decision
records public-page publication, search indexing, and app discovery as three
explicit controls with conditional evidence gates. Suppression turns every
control off; a claimed organizer cannot be downgraded by intake. External-event
authority must call the shared visibility policy so an event cannot exceed its
organizer on the web, in search, or in the app.

External-event publication is now a separate Functions-owned authority.
Operations and compatibility tools may normalize candidates, project readiness,
and carry reviewed blocker resolutions, but they do not write
`externalEvents`. The admin invokes a receipt-backed dry run before apply.
Functions revalidates launch-market identity, the organizer capability and
visibility ceilings, the reviewed candidate snapshot, and each governed
blocker. A waiver succeeds only through the accepted exact policy-gap decision.
Publication and takedown each emit immutable idempotency receipts; takedown
preserves provenance rather than deleting the external-event record.

Eligibility is evaluated only from the source-publication policy frozen into
the run plan. The promotion receipt includes that complete policy snapshot and
its `promotionPolicyHash`, so later edits to a live source profile cannot change
an old run's candidate set or erase the policy evidence used. Promotion
revalidates the persisted plan and its hashes at receipt time. The receipt id
and receipt hash also bind its blocked status, `applyAllowed: false`, blockers,
and guardrails; existing receipt and companion-action content is validated on
every replay and cannot be overwritten through the store.

A future publication-plan builder and separately authorized worker must:

- revalidate source freshness, schema, dedupe, rights, and policy at apply time;
- compare target versions before writing;
- append one receipt per attempted action;
- make retries idempotent;
- keep Catch-hosted/bookable events distinct from read-only external supply;
- support update, cancellation, expiry, correction, and takedown, not only
  first-time creation.

Reconciliation is a first-class recurring child run rather than an in-place
mutation. Event velocity is measured as fresh future inventory, not cumulative
historical output.

### Trusted worker checkpoints

`FirestoreOperationsRepository.commitWorkItemAction` commits one work-item
revision and its immutable action receipt in the same Firestore transaction.
The transaction re-reads the owning run, item and lease, checks the run's
execution deadline and the worker's current fencing token, and rejects stale
revisions or scope changes. Receipt ids hash the run, item and idempotency key
as an ordered JSON array; the receipt binds the complete resulting checkpoint.
An exact retry returns the committed receipt and latest item without repeating
the write. Changed evidence under the same key fails closed.

`FirestoreOperationLeaseRepository` retains one deterministic lease document
per resource in `operationLeases`. Acquisition and renewal use the live server
clock, leases last at most two minutes, and replacing an expired or released
lease increments its fencing token. These documents must not receive TTL
cleanup while a resource can be executed: deleting one would reset its fence.
An expired acquisition cannot be resurrected by replaying its key. Rehearsal
virtual time must never be injected as the worker lease clock.

These are trusted persistence primitives, not authorization or a provider
executor. A worker must resolve current scoped authority and domain policy,
reserve an external attempt durably, call the provider outside the transaction,
and reconcile ambiguous provider outcomes. A receipt saying that an attempt
was reserved is not proof that a message was delivered. Event Assistance's
private `FirestoreMessageOutbox` now owns immutable message intents, bounded
attempt history, one-time dispatch claiming and late-receipt reconciliation.
Its transaction contention boundary is independent of run completion, so a
closed workflow cannot discard a later provider receipt. The workflow will
reference that private message state instead of treating a work-item action
receipt as delivery proof. `EventMessageWorker` now composes the concrete SMS
and WhatsApp authority readers and adapters through that one outbox history;
only the selected channel can claim spending and send. The dormant message
delivery coordinator below supplies durable invocation. Scheduler activation,
remaining workflow source readers, RCS and provider failure reconciliation
remain integration work. These primitives do not enable Supply Intake
publication.

### Durable live assistance work

The trusted Functions `LiveAssistanceWorkStore` uses those same collections for
one live late-join guest episode per run. Its strict `liveLateJoin` normalized
payload is defined by `event_assistance_live_work.schema.json` and enforced by
the generic work-item contract. Run and item ids bind the event, organizer,
attendee and episode. Initialization requires existing current participation;
it cannot create an episode or replace the saved sender choices, response
deadline, expiry or evaluation budget on retry.

The payload owns `checkpoint.dueAt`; generic item `staleAt` is not a scheduling
field. Bounded discovery selects due items using the declared composite index.
Every policy evaluation re-reads the live source, host policy and messaging
evidence.
The run, item revision, immutable action receipt, message intent and guest
thread commit in one transaction under the current Operations lease. A lost
response replays the receipt before any publication, including after the lease
has expired or a later checkpoint has advanced. Wake signals have durable
idempotency keys and can advance a waiting item's due time without changing
its previous outcome or resetting its evaluation budget.

Future evaluations honor the earliest pending cooldown, guidance expiry,
explicit response deadline, policy cutoff or work expiry. Event facts can wake
work sooner; elapsed time never proves departure or attendance. Missing facts
can require host review; exhausted evaluation budgets always do. At work
expiry, terminal housekeeping can still commit even if no evaluation ran.
The run therefore has no generic execution deadline: the domain expiry bounds
publication while the finite evaluation budget bounds policy work. Provider
attempts and spending remain separately bounded in the message outbox. For
this adapter, `published` counts newly created message intents and `escalated`
counts entries into host review; neither counter measures provider delivery.

`LiveAssistanceWorkRunner` acquires an Operations work-item lease before each
evaluation or wake and releases it afterward. Its runtime marker rejects the
frozen shadow CLI projection; the registered CLI manifest remains shadow-only.
There is no public enrollment callable or provider invocation in this worker.
Scheduled evaluation requires the manager-owned runtime id/revision binding
described in [Event Success](event_success.md#event-automation-permission).
Bound initialization verifies the complete configuration; pausing or replacing
it withholds publication and queued provider claims. The binding does not
reset the participation episode, messaging history or delivery budgets.

The trusted roster enrollment boundary creates missing participation and its
first guest work atomically, or reports that existing work needs rebinding.
`rebind` is a third leased guest action alongside evaluation and wake. It reads
the saved runtime configuration and current participation inside the checkpoint
transaction, updates both basis hashes and preserves consumed evaluations and
publication counters. The configured evaluation ceiling can be lowered below
prior consumption; this exhausts further work instead of discarding evidence.
Raising that ceiling does not zero the counter. Rebind receipts are idempotent
per runtime revision, and completed/expired episodes cannot re-enter execution.
The resumable roster worker below now owns enrollment discovery and fanout.

### Resumable roster enrollment

`event_assistance_roster_work.schema.json` defines a separate
`liveRosterEnrollment` payload inside the existing Operations run/item/receipt
collections. Its immutable basis binds source identity, exact scope
and the current manager runtime revision. Configuration saves its roster run/item
atomically with the runtime and command receipt; its logical source identity is
the saved runtime revision. Configuration-trigger deliveries reuse that job.
Registration and participation sources use their CloudEvent delivery identity.
It contains no caller-authored guest
state, roster snapshot or sender options. Configuration changes request an
event-wide scan; registration and explicit participation-episode changes request
a single-guest scan. Replies, unrelated counters and deletion events do not
request enrollment. A new registration behind a saved cursor is covered by
its own source delivery rather than requiring a scan restart.

`AssistanceRosterWorkStore` rechecks current permission before discovery, for
each guest through the atomic enrollment/rebind adapters, and when committing
the roster checkpoint. Paused, replaced, expired or source-invalidated runtime
permission stops unfinished scans with an explicit reason. The scan reads the
selected event's canonical roster and validates each guest's organizer/event
scope; missing or ineligible registrations produce no enrollment. Malformed
records retain their attendee IDs for bounded retry and review.

Roster scans share `advanceFanoutPage` with source wakes: at most 20 targets per
page, 10,000 visited targets, 100 retained failures, five retry rounds and a
24-hour source lifetime. Cursors and retries use consistent ordinal document-id
ordering. An Operations lease fences each saved page; per-guest transactions
and rebind receipts make repeated visits safe if the page checkpoint is lost.
The visited count measures discovery, never successful enrollment or delivery.
No provider is invoked, and no new Firestore collection or client permission is
introduced. Complete, stopped, expired and review outcomes remain distinct.

### Durable checkpoint request work

An explicit departure `checkpointRequest` creates one `liveCheckpointReport`
run/item in the same transaction as the immutable roster and departure receipt.
The payload is enforced by `event_assistance_checkpoint_work.schema.json` and
the generic work-item schema. Its identity binds context, group, departure
revision and destination checkpoint; its basis pins the complete roster hash,
original reporter, deadline and request time. It grants no staff access.

`AssistanceCheckpointWorkStore` re-reads that original roster, current report,
source availability and reporter authority under an Operations work-item lease.
Each observed state, run/item revision and immutable action receipt commit
atomically. Unreported requests raise an operator action; overdue, partial,
source-unavailable or owner-unavailable requests raise human review. The next
due time is the earlier future report deadline or finite staff expiry. Passing
either time cannot establish a physical fact. Unreadable facts retain review
and get at most five scheduled attempts with exponential backoff; a new source
wake can re-read repaired evidence. No provider or attendee writer is involved.

Complete reports become dormant `report_complete` items with no task flags or
due time. The run stays running and the item waiting so an explicit report
correction can reopen it under the existing fenced action protocol; generic
terminal work is never reopened. Partial corrections restore follow-up, and
duplicate or delayed source deliveries replay immutable wake receipts instead
of reapplying older states. Event completion, cancellation or schedule expiry
cannot discard unresolved original departure members. There is no generic
expiry or TTL: terminal retention/reconciliation is separate work. The current
adapter does not implement staff notifications or the Host queue UI.

Explicit reviewed closeout uses the same lease and stores an independent
`closeout` decision outside the immutable departure basis. A partial arrival
report plus a current post-departure disposition for every unconfirmed member
can become `report_closed_out`, with no task flags or due timer. This does not
convert a disposition into an arrival. The current named reporter with scoped
reporting authority or an organizer manager supplies a reason; server-owned
full evidence, its domain receipt and the work/run/action update commit
atomically. The generic receipt hashes the complete domain receipt. Reads bind
the latest change to both receipts; older retries validate their original full
evidence but return current state. Corrected reports, dispositions, changed
visits or explicit reopening restore review while retaining history. Full
arrival reports supersede closeout. Both completed states remain nonterminal;
terminal retention is a separate lifecycle boundary.

Manager-driven reporter reassignment now shares this same work-item lease. Its
optional `reassignment` payload is mutable responsibility, excluded from the
immutable original request basis. It advances an independent assignment revision
and immediately reconciles fresh report/owner facts. The work/run update,
Operations action receipt and full domain receipt in
`eventAssistanceCheckpointReceipts` commit together. The original deadline is
retained, including when overdue; current scoped authority must extend beyond
both now and that deadline. Assignment reads bind the latest change to both
immutable receipts. Older retries return current state and never restore a prior
owner. Background revisions do not invalidate a reviewed assignment, while a
changed assignment, report or source does. A complete or closed-out report cannot be reassigned;
a later correction retains the effective reporter when reopening work.

### Source changes and due-work recovery

`OperationalNoticeFanoutStore` persists each plan-change or post-event
follow-up audience as one `operationalNoticeFanout` Operations run/item. Its
identity freezes the event context, immutable source id/revision/timestamps and
exact saved-policy setting revision. Before every page it rechecks the source,
organizer, event state and selected policy; source or policy drift stops the
run. Plan changes are due immediately. A terminal Event Success plan creates a
follow-up run due at the scheduled event end and only checked-in attendees are
eligible when publication executes.

Fanout reads attendees in document-id order, visits at most 20 per page and
uses the shared current-guest enrollment boundary so every notice is bound to
the attendee's stable registration episode. A source receipt prevents duplicate
publication after retries. The checkpoint records visited, published, skipped
and failed targets. Limits are 10,000 visited attendees, 100 retained failures
and five retry rounds; exhaustion produces an explicit Host-review item rather
than dropping the remaining audience. Its work-item trigger, source triggers
and scheduler target remain dormant in deployment policy.

`AssistanceSourceWorkStore` persists each source delivery and target scope as
one `liveSourceWake` Operations run/item, enforced by
`event_assistance_source_work.schema.json`. The source `eventId` is the
CloudEvent delivery identity. Event scopes carry `scope.context`; readiness
scopes carry an exact sender selection, organizer/WhatsApp endpoint hash, or
RCS agent/phone conversation subscription ID.
Repeated delivery reuses the same work. Source payloads only request a fresh
evaluation and cannot supply authoritative domain facts or sender permission.

The twenty-four source triggers cover relevant event configuration/lifecycle,
roster/check-in, live plan status, participation/replies, late-join settings,
confirmed group progress, membership, runtime permission, message evidence and
event-specific SMS/WhatsApp/RCS consent, sender configuration, approved templates,
spending authority, provider STOP, CRM suppression and scoped staff grants. Owner or scope
changes wake both previous and current affected scopes. Unrelated event
counters and rehearsal state create no work. No-target checks avoid creating
source runs when no guest, delivery or checkpoint work exists; newly created work evaluates
current facts on its first execution.

RCS sender changes select exact configured RCS routes. Event budget changes
wake that event; UTC sender-day changes discover the corresponding sender.
Debit increases and revision counters do not trigger repair, while released
spending and changes to limits, approval, agent, currency or window do. RCS
subscription discovery queries unexpired permissions by their receipt-covered
conversation ID with expiry/document-ID cursors. Target resolution revalidates
that key and current expiry before creating an attendee wake. START-only
records and subsequent START observations create no work and grant no consent.
STOP creation, removal or replacement rechecks only the affected conversation.
The source dispatcher retains the same bounded retry and review lifecycle.

Fanout scans only work for the exact organizer/event and optional attendee,
then revalidates each target before waking it. Event-wide scopes merge bounded
guest, delivery and checkpoint queries in document-id order using the existing
scope indexes; attendee scopes only select guest and delivery work. Each
scan reads at most 21 candidates per kind, including lookahead, and visits at
most 20 total. Guest
wakes make policy evaluation due; checkpoint wakes reconcile the original report;
delivery wakes re-evaluate the saved message
under its own lease and the remaining source execution deadline. Both scan and
retry pages process at most 20 targets under a 60-second lease. The checkpoint cursor is
the last scanned work id during discovery and the last attempted failed work
id within a retry round. Successful retries are removed; unfinished rounds
resume immediately, completed unsuccessful rounds back off. Target wake
receipts survive a lost fanout checkpoint without duplicating guest effects.
Limits are 10,000 visited targets, 100 retained failures, five retry rounds and
a 24-hour source-work lifetime. Exhausted target/failure/retry limits become
explicit review items with failed ids retained; expiry closes unfinished work.

An explicit `checkpointMember` scope supplies a separate path for attendee
check-in, registration generation and accountability changes. It selects only
saved checkpoint requests in the exact organizer/event, then verifies the full
original departure roster hash and membership before invoking the checkpoint
worker. Requests without that original member are skipped while the bounded
cursor advances; deleted or changed current membership cannot erase the
original obligation. Missing or corrupt rosters retain the target for bounded
retry and review. Ordinary guest scopes still cannot select checkpoint work.
Pure accountability changes create no guest enrollment or delivery wake, and
phone/profile edits create no checkpoint fanout. Exact check-in timestamps,
including nanoseconds, participate in source-change detection. These signals
refresh current evidence; they do not infer arrival or close a discrepancy.

`onAssistanceWorkChanged` advances currently due saved work. The once-per-minute
`evaluateDueEventAssistanceWork` scheduler recovers at most five roster items,
10 source, 10 operational-notice, 30 guest, 10 delivery and 10 checkpoint items
per invocation; one failure does not skip
the other selected items. Future due times remain saved until reached. All
source triggers, the direct `onAssistanceCheckpointChanged` report hook,
the work-item trigger and scheduler are in the dormant target policy and
cannot enter current logical or exact deployment plans. Source wiring and
local emulator verification do not claim deployed execution or message delivery.

Readiness discovery reuses the same source-job lease, checkpoint, retry and
expiry rules. Sender changes query saved runtime route selections; endpoint
suppression queries organizer-scoped WhatsApp permissions. Both exclude records
already expired at the source timestamp and persist an expiry/document-id cursor
that survives deletion. Current records are revalidated before creating an
idempotent event/guest child wake. Discovery never creates runtime configuration,
enrolls a guest or invokes a provider. A lost parent checkpoint reuses its child
job. Failed lookups retain typed `targetKey` entries; event fanout retains its
existing `workItemId` failures.

Event budgets wake their event directly. Sender-day budgets use sender discovery.
Changed budget authority or reduced conservative charges wake affected work;
ordinary charge increases do not create a fanout for every submission. Final
reservation/claim still rechecks the current remaining budget. Inbox frequency
and reply counters are likewise excluded from suppression-change signals.
Event-specific consent changes wake the exact old and new guest scope. Trigger
snapshots grant no consent; the current permission and its receipt are re-read
at the execution boundary. Host queue projections remain integration work.
Activating dormant functions also requires the corresponding operating budget,
query indexes and delivery configuration.

### Durable message delivery work

`event_assistance_delivery_work.schema.json` binds one immutable automatic
message to a `message_delivery` work item and run. Publication creates those
records atomically; no provider or signing-key access occurs in that transaction.
Its basis binds the message, intent hash, thread, participation scope and expiry.
Checkpoints retain the observed outbox revision/hash, bounded recovery counts,
next due time and typed reason. They contain no guest endpoint or bearer secret.

`AssistanceDeliveryWorkStore` leases one job and invokes the existing shared
message worker at most once per execution. The outbox's claim transaction is the
provider authority; the Operations lease fences the later checkpoint. If a worker
loses its lease or checkpoint after submitting, the next execution observes the
outbox's pending submission and does not submit it again. Checkpoint receipts
record coordination progress, with zero publication/spend counters; provider
attempts and debits remain in their owning records.

Missing keys/domain facts retry at bounded delays and become review after five
failures. Evaluations are capped at 100. Accepted/unknown submissions get one
receipt wait of at least two minutes, bounded by expiry, then retain a review
issue until a message change or expiry. A review item keeps its run active so a
receipt can resolve it without an administrative resume. Completed runs/items
remain terminal; the independent outbox accepts later evidence. No elapsed-time
transition claims a provider failed or permits fallback by itself.

The existing dormant message trigger resumes a saved delivery job; the work
trigger selects `liveMessageDelivery` due payloads. Each scheduled batch reads
at most ten due delivery items in addition to its roster/source/guest limits.
Independent items continue after another item fails. Message changes are only
wake requests: the store re-reads the canonical outbox and current authority.
The manager-only Host delivery reader now projects recorded evidence separately
from coordinator state. A reviewed manual handoff writes the outbox and its
private immutable receipt; it never writes Operations items without their lease.
The coordinator observes that handoff as `hostStopped` on the existing message
wake. Future claims are withheld, while already-issued permits and late receipts
retain their original authority. Completed coordination does not prove delivery.
Provider lookup/finality, Host UI integration and terminal retention remain
required before full activation. Signing-key requirements and
channel controls are owned by [Event Success](event_success.md#durable-message-delivery-coordination).

Source-driven delivery evaluations record one immutable wake receipt per
signal and target. A lost source checkpoint replays that receipt without another
evaluation or submission. Wake receipts share the work-item revision fence;
they cannot reopen terminal work or reset recovery/attempt caps. An unchanged
accepted/unknown submission keeps its original receipt deadline, or its existing
review if that wait already elapsed. Consent restoration can resume an unsent
held message, but does not prove a pending submission failed.

### Read-only event messaging setup review

Trusted operators can inspect one event, channel and sender with
`npm --prefix functions run operations:review-event-messaging -- --environment <dev|staging|prod> --project <matching-project> --organizer <id> --event <id> --route <catchEventSms|organizerEventWhatsapp|catchEventRcs> --sender <id> --purpose <joiningUpdate|joiningInstructions|planChanged|eventCancelled|eventFinished|guestRequirement|assignmentChanged|participationCheck|followUp>`.
The command requires an explicit project matching the repository's environment
alias and existing read access. It has no apply option, and it does not load
provider credentials or invoke a messaging provider. The command is registered
as the remote-read-only `operations:review-event-messaging` operator tool.

The bounded read uses the same event source, saved runtime, sender, template
and budget readers as runtime configuration and dispatch. The explicit purpose
selects the exact SMS template, RCS allowlist entry or WhatsApp template policy
being reviewed. It reports a saved late-join selection only when the purpose is
`joiningUpdate`, separately from runtime status, then reviews the exact event and
sender-day budgets. Missing or invalid records remain distinct from paused,
expired, exhausted, changed-currency or changed-agent limits. Valid budget
records retain their ceiling, conservative charges, remaining amount, approval
reference and content hash even when unavailable. A read failure returns no
partial report. A billing-day rollover requires another complete read; SMS
uses its India window and WhatsApp/RCS use UTC.

This is a timestamped review of recorded setup, not an approval receipt or send
permission. It makes no writes and does not verify provider registration,
credentials, guest consent, deployed workers or live delivery. Audited sender
and budget provisioning, financial reconciliation and activation remain their
own work. No setup report may substitute for those decisions.

The review is validated against the versioned
`EventMessagingSetupReview` operations contract before the CLI prints it. The
contract fixes the channel, purpose, source hash, sender availability, exact
event service horizon, budget currency and budget-source hash, exact budget
scopes and recorded ceilings while preserving the literal
`grantsDispatchAuthority: false` boundary.

### Event messaging budget decisions

The React Finance workspace uses `adminReviewEventMessagingBudget` as its
read-only entry boundary. Finance supplies one exact organizer, event, route,
sender and purpose. The callable returns the validated setup review and the
current deterministic decision summary, while withholding credentials, the
private RCS agent id and guest data. The response fixes spending and dispatch
authority to false. Finance-only users can use this workflow without receiving
the separate Host Analytics role.

`adminDecideEventMessagingBudget` gives Admin Owners and Finance reviewers a
typed decision boundary after the read-only setup review. The callable records
approve, hold or reject against one deterministic event, route, sender and
purpose scope. The request must echo the current runtime source, sender review
and budget-source hashes plus the expected decision revision. Exact request-id
replay returns the original receipt; changed reuse fails, and another decision
must advance the scope revision.

Approval requires an eligible sender, a reviewed currency, ceilings no lower
than already recorded conservative charges, and an expiry no later than the
event service horizon. A late-join approval also requires that exact route and
sender to be selected in the current configured runtime. The decision and its
admin audit entry commit atomically. Stored evidence includes the complete setup
review hash and the revisions and hashes of any existing event and sender-day
budgets.

The decision boundary is deliberately decision-only. It writes
`eventMessagingBudgetDecisions` plus one immutable request receipt, never any
channel budget collection. The receipt preserves exact replay after later scope
decisions. The decision, receipt and response fix
`grantsSpendingAuthority: false` and
`effect: decision_only_no_spending_authority`.

`adminApplyEventMessagingBudget` is the separate Admin Owner or Finance
boundary that can consume one current approved decision. Its request names the
exact decision revision. In one transaction, the callable rechecks the runtime,
sender and budget-source hashes; confirms the route is still selected when the
purpose uses runtime routing; and verifies that neither prior ceiling, revision,
hash nor conservative charge changed after approval. It then stages both the
event and sender-day ceilings in `paused` state, preserving charges and
advancing each revision. New event ceilings begin at application time; SMS
sender-day windows use India time and WhatsApp/RCS use UTC. RCS also binds the
private current agent id without returning it through the setup review.

The application writes an immutable request-hash receipt and the admin audit in
the same transaction. Exact retries replay that receipt; a changed request id
or stale source fails closed. Its literal effect is
`budgets_staged_paused_no_spending_or_dispatch_authority`: it grants neither
spending nor dispatch authority. It does not load a credential, contact a
provider, write an outbox or dispatch record, configure the runtime, or enable
a dispatch worker. A later live activation boundary must revalidate the staged
receipt and change both ceilings together before spending can occur. Consent,
current content, runtime, provider and dispatch gates remain independent.

The Admin sequence uses progressive disclosure: exact scope review first,
approve/hold/reject second, and paused staging only after a current approval.
The client retains request ids across failed retries, echoes all reviewed hashes
and revisions, and labels the resulting ceilings as paused. No control on this
surface activates either ceiling.

## Private sales qualification and outreach drafts

The host-revenue domain provides a read-only normalized-import preflight at
`npm --prefix operations run revenue:preflight -- --input <private-file> --policy <private-policy>`.
The caller supplies the versioned policy; repository fixtures contain only
synthetic examples. Real prospect exports, source documents, score weights,
commercial playbooks and policy crosswalks remain outside Git. The preflight
reports source-row identity conflicts, preserved historical scores, evidence
gaps and complete-factor fit. Missing factors produce a null score with
coverage, never a zero or a renormalized partial score. It performs no import,
network request, contact-authority decision or product mutation.

The reviewed migration runner at
`operations/src/domains/host-revenue/migration-cli.mjs` accepts a private mapped
source and freezes its full content into bounded packets. `freeze` is offline;
`review` reads the server preview for every packet; `apply` requires the exact
review hash and current employee ID/App Check credentials through the existing
Admin callable client. It uses the Operations store's fenced leases and local
checkpoints, while Sales business receipts remain authoritative. A restart
reads each receipt before retrying a missing batch; a changed source, stale
server preview, lost authority or uncertain receipt read stops progression.
Every source row must reconcile to created, matched, duplicate, unresolved or
rejected. An applied batch containing unresolved rows is not a completed
identity migration. Private artifacts and checkpoints belong outside Git.
The runner preserves existing account fields while unioning explicitly reviewed
cohort memberships once per organizer. Existing account revisions bind the
preview, so concurrent edits require a fresh review. All source rows for one
organizer stay together in a bounded packet, retaining their separate lineage.
Offline identity review accounts for unreviewed, unresolved and ambiguous rows
without inferring a canonical organizer. No public organizer, contact permission,
listing publication or message is created.

`compensation-preview` and `compensation-apply` support one Owner-reviewed
import correction. The preview binds the current account, original import
effect and dependent work. An untouched companion may be archived; a later
edited account keeps its business fields and only the proven import-owned
cohort additions may be removed. Later source-history records prevent archival.
The canonical organizer and original import receipts remain intact. A stale
preview or revoked Owner stops application, including a retry.

Historical notes use separate immutable `salesImportHistoryRows` and
`salesImportHistoryRecords`, rather than current activities, qualification or
contact permission. The sequence is `history-template`, `history-freeze`,
`history-review`, then `history-apply`, each using private files outside Git.
Every frozen row is promoted, skipped with a reason, or marked review-needed;
only rows with reviewed canonical identity and accepted import lineage reach a
server packet. Exact original cell values and source hashes are checked again
in the transaction. Unknown occurrence dates stay null; importing a first/last
touch label does not invent a timestamp. Each reviewed source cell has one
stable record identity, so retries cannot create another copy or reinterpret
it silently. The apply action requires fresh Owner authority and a current,
clear Sales account even on receipt replay. Employees can page the separate
imported history pane in a host's Activity section. This view grants no current
score, permission, delivery claim or next step.

The history runner freezes every local row disposition, validates every server
packet receipt, and checkpoints through a fenced Operations lease. It retries
the same deterministic action ID through the authoritative domain receipt;
it does not trust a local checkpoint as proof of current access. An unresolved
source row keeps the overall run incomplete. All source files, mappings,
reviews and result artifacts stay private.

`outreach-drafting` is a separate registered shadow workflow. It reuses the
platform run, lease, checkpoint, cache, budget and receipt owners. Inputs freeze
reviewed observations, capability statements, permitted references and CTAs.
Deterministic rendering copies approved sentences exactly; an optional bounded
model selects clause IDs only. Source text cannot introduce instructions,
additional tool calls or new factual claims. Initial output is English only.
This does not change Supply Intake's publication or copy-generation policy.

Execution requires a trusted current-eligibility projection that rechecks the
organizer, contact, opportunity, suppression, evidence, capability and reference
revisions. The default factory has no such adapter and fails closed. A model
also requires explicit activation, a provider and durable per-run and monthly
budgets. Before provider I/O, the engine persists its leased reservation and
the monthly adapter atomically reserves a unique attempt against the current
balance. An uncertain attempt retains its reservation and cannot automatically
call the provider again. A cache hit still requires current eligibility.
Clause expiry is checked again before rendering and approval.

Human approval binds the exact text hash and source revisions, records factual,
tone and manual-channel review, and grants no sending authority. The trusted
backend must authenticate the reviewer; a supplied actor ID is not authority.
Copy/export must revalidate current eligibility at its own boundary. An activity
marked sent elsewhere is an employee attestation, not provider delivery proof.

The private Sales callable runtime now packages and invokes this workflow with
reviewed source projections and a durable Firestore job/receipt authority. Its
current production-code path renders approved clauses deterministically with
zero model calls; temporary filesystem state is scratch and is removed after
each attempt. Draft reads, approval and copying recheck current sources. This
source integration does not establish deployment, live model activation, an
imported prospect cohort or a connected assistant. Those remain explicit
activation and acceptance gates. Runtime port
details are maintained in the
[outreach workflow README](../operations/src/workflows/outreach-drafting/README.md).

The disabled internal Functions writing-preparation worker separately composes
the accepted native DeepSeek, OpenAI and Anthropic adapters with
`createSalesPreparationAdapter` and `GuardedModelRunner`. Its 25-file packaged
dependency closure is checked during Functions build. A stable Firestore
job/stage intent reserves both explicit run and UTC-month buckets before any
provider I/O. Intent survives uncertain commit responses, crashes, cache misses
and lease renewal; it cannot retry or fall back automatically. The helper's
local ledger validates the worker's already-durable grant and never represents
the shared monthly balance. Its cache write is buffered until final canonical
validation and current authority, source and lease checks can atomically commit
the private selection/cache receipt and accounting. Unknown usage retains
ceilings; adapter cost remains a reservation, not inferred billed usage.

No callable, trigger, credential, activation or public-review source is supplied
by this bridge. A trusted worker must provide fresh exact stage/billing and
public-disclosure review, including the prompt and whole rendered-request token
ceiling. Approved drafting clauses and partner citation grants alone do not
authorize external disclosure. Deadlines and cancellation cover remaining
lease/authorization time. Existing public drafting callables stay deterministic;
provider selections are not yet their rendered/reviewed drafts. General research
jobs require a separate eligibility boundary. Real pricing, runtime authorization
sources and controlled acceptance remain prerequisites for any activation.
Private attempt cleanup uses the permanent Sales processing fence; retained
aggregate accounting cannot grant renewed submission authority.

## Reviewed host discovery batches

The optional private discovery policy is supplied through the ordinary
Operations CLI, then frozen into the run plan. It identifies reviewed candidate
retention decisions with their source hashes. Raw search hits do not count as
retained prospects. The engine records each decision before creating its work
item; a paused projection remains incomplete and cannot silently finish.
Known/rejected identities remain in market coverage without increasing the
retained count. The normal provider-disabled behavior remains the default.

```sh
node operations/src/cli/main.mjs run --workflow supply-intake \
  --market MARKET --discovery-policy /private/path/reviewed-policy.json
node operations/src/cli/main.mjs discovery preview --run RUN_ID
node operations/src/cli/main.mjs discovery continue --run RUN_ID \
  --receipt /private/path/reviewed-continuation.json
node operations/src/cli/main.mjs resume --run RUN_ID
```

The reviewer records the exact paused-state binding and required audits in the
private continuation receipt. A changed state, run, interval or receipt fails
closed. Continuing the review does not itself project more candidates; the
ordinary resume command owns that work. If a work-item write is interrupted
after its retention record, retry repairs the item without double-counting it.
For a saved plan, `plan --discovery-policy ... --output /private/path/plan.json`
writes the full frozen material exclusively with mode 0600 and prints only its
path and hash. The policy, plan and review files belong outside Git. This path
does not acquire sources, invoke a model, publish listings or send outreach.

## Adding Another Workflow

Event Assistance is the second registered workflow. Its initial supported
commands evaluate a frozen array of canonical late-join inputs:

```sh
node operations/src/cli/main.mjs plan --workflow event-assistance \
  --input /absolute/path/late-join-inputs.json --now <snapshot-ISO-time>
node operations/src/cli/main.mjs run --plan /absolute/path/saved-plan.json
```

`--input` contains a JSON array matching
`contracts/operations/event_assistance_late_join_input.schema.json`, with the
same event context and evaluation time in every item. `plan` emits a JSON
envelope that `run --plan` accepts directly. The input file is bounded at 2 MB
and each run at 10,000 distinct guest episodes. The factory uses the generated
JavaScript version of the canonical typed policy; it has no provider port.
Ready items are proposed effects in a completed shadow evaluation. This path
does not claim live scheduling, dispatch or app integration. Supply Intake's
publication ceiling remains unchanged.

Before another workflow adopts this platform:

1. define its authority, stages, terminal outcomes, idempotency keys, budgets,
   receipts, and human-decision seam;
2. reuse run/lease/receipt/persistence primitives without copying Supply Intake
   domain stages;
3. add a registry descriptor and executable workflow factory, then declare only
   the CLI commands that workflow actually implements;
4. add a workflow manifest, schema fixtures, and replay tests;
   `npm --prefix operations run manifests` must discover every workflow folder,
   bind manifest to registry metadata, require a source loader only for a
   non-empty source inventory, prove the transition graph is complete and
   stage-closed, validate disjoint active/published/expired lifecycle semantics,
   instantiate the factory, prove command-required methods exist, and enforce
   the platform authority ceiling;
5. project the canonical backend state through the owning admin feature rather
   than creating a parallel dashboard source of truth;
6. register only stable entrypoints in `tool/tools_manifest.json`; keep the
   implementation inside `operations/`.

## Activation Checklist

Shadow implementation can ship before these owner decisions. Assisted or
publication modes cannot:

- source allowlist, terms, cadence, robots/API policy, and spend caps;
- source acquisition/normalization workers and raw-artifact storage;
- model provider/model, per-run and monthly budgets, retention, and eval
  thresholds;
- raw-artifact object storage, retention, deletion, and access policy;
- worker and publisher service identities plus least-privilege IAM;
- auto-publish, sampled review, correction, takedown, and incident policy;
- a durable decision bridge from Event/Organizer Intake into a new operations
  run, without relying on manually regenerated compatibility artifacts;
- launch-market density/freshness targets and quality guardrails;
  proposed per-kind freshness defaults, pending owner confirmation in
  CAT-170: city discovery sweep 30 days, candidate verification 90 days,
  known-organizer event refresh 24 hours, and event detail refresh 6 hours
  before publication;
- public event directory/detail projection and organizer outreach ownership.

## Verification

At minimum, changes to the platform run:

```sh
npm --prefix operations test
npm --prefix operations run check
npm --prefix operations run admin:loop
npm --prefix functions run build
node tool/contracts/validate_schema_contracts.mjs
node tool/run.mjs check --manifest-only
node tool/check_repository_root_hygiene.mjs
git diff --check
```

Add focused Functions/admin/data-contract checks when persistence, callables,
or UI projections change. Git and CI preserve the resulting proof. `Tools CI /
Operations platform` installs from
`operations/package-lock.json` and runs the full package check whenever
`operations/**` or `contracts/operations/**` changes, so this safety boundary is
enforced on pull requests rather than remaining a local convention.
