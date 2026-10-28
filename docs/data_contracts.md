---
doc_id: data_contracts
version: 1.178.0
updated: 2026-10-28
owner: recursive_audit_loop
status: active
---

# Data Contracts

This is the source of truth for Firestore document shape, Cloud Functions write
ownership, schema tooling, relationship documents, migration policy, and rules
test workflow. It replaces the separate Firestore/Functions contract tracker,
relationship-doc migration tracker, and schema-contract unification tracker.

For a human map of every backend operation, use
`docs/backend_operation_catalog.md`. For environment deploy order, use
`docs/release_operations.md`.

## Read Policy

Read this before changing:

- Firestore rules or Storage rules tied to Firestore documents;
- Cloud Functions mutation boundaries;
- Dart/TypeScript model generation;
- JSON schemas under `contracts/`;
- callable request/response validation;
- seed/demo document builders;
- relationship/action documents;
- data migration or repair tools;
- Firestore rules test execution.

## Sources Of Truth

| Surface | Owner |
|---|---|
| Persisted document, callable, and public HTTP schemas plus fixtures and catalogs | `contracts/` |
| Storage path contracts (upload paths, content-type, size limits, owner) | `contracts/storage/` |
| Generated TypeScript interfaces, Ajv validators, and Admin SDK Timestamp types | `functions/src/shared/generated/` |
| Generated website and Admin browser contract types | `website/src/shared/contracts/generated/` and `admin/src/generated/contracts/` |
| Generated Dart schema constants/registry | `lib/core/schema_contracts/generated/` |
| Tool-side schema registry and validators | `tool/contracts/generated/` |
| Firestore operation ownership metadata | `tool/contracts/firestore_contract.json` |
| Human operation map | `docs/backend_operation_catalog.md` |
| Active policy rules | `tool/policy/rules.json` |

Do not hand-edit generated outputs. Change the contract source, run the schema
generator, and commit the generated diff.

### Profile information by capability

`contracts/catalogs/profile_requirements.json` owns required fields for account,
organizer following, event booking, social identity and social discovery. The
schema generator emits the same policy evaluator for Functions, website and Flutter. Account and
following require name and verified phone. Event booking adds DOB only when the
event has age restrictions, and cohort fields only when admission or pricing
uses them. Public website registration does not offer cohort-dependent booking.
Social discovery retains adult DOB, gender, matching preferences, photos,
answered prompts and profile completion. An account alone grants none of those
social capabilities. Native signup stops after the same minimal identity step;
its later social setup collects missing demographics before photos and prompts,
using a profile patch that preserves the existing account. Native event
completion requests only the birthday or cohort fields that event needs and
returns to booking without asking for social photos or prompts; URL hints
select questions, while server admission still checks the live event policy.

The private users schema permits absent DOB and gender. Required empty arrays
and preference defaults are storage shape, not questions for the user.
`manageWebsiteAccount` creates or completes that same Firebase UID/document
with live Auth phone ownership, disabled/deleted-account checks, an expected UID
and a profile-revision comparison. Omitted DOB and richer existing fields are
preserved. Minimal accounts remain absent from public social projections.
Website follow reads and mutations use canonical `organizerFollows` edges;
legacy browser saves do not become follows or notification consent.

Public free registration, paid reservation and paid admission all recheck the
stored birthday against an age-restricted event. The website requests a missing
birthday inline and resumes the intended event/follow journey. Matching photos
and prompts are never collected for these website actions. Deploy the updated
Functions and profile readers before enabling the new website bundle; a local
or CI pass does not establish production rollout or live OTP acceptance.

### Rehearsal Assistance Generation

`event_rehearsal_membership.schema.json` adds optional callable-owned actor
`participation` and `groupMembership` state and a private `membershipReviews`
bootstrap. The rehearsal `transferGroup` command references the canonical live
payload and accepted/transfer shapes while retaining synthetic clock and episode
identity. Membership has one accepted group and one optional handover; proposal
does not replace acceptance. Physical attendance and table placement remain
separate. The parent action receipt, setup/runtime generation, participation and
membership revisions, current manager authority, selected source hash and virtual
deadline fence each mutation. New actors initialize participation explicitly;
legacy actors do not fabricate it. Reset removes the actor state. No new live
collection, guest response field or direct client-write permission is introduced.

The native rehearsal membership controller owns one pending decision per
synthetic actor and clock generation, with account-specific mutation state.
It exposes only the reviewed actions and receiving Hosts, then freezes the
selected command through submission, uncertain outcomes, closure and refresh.
First submissions require the current membership row and its authenticated
reviewer; retries preserve the original generation, source, revisions and action
id. Parsed responses still require the matching parent receipt and membership
result. A later replay preserves subsequent membership and participation.
Definitive conflicts require a fresh review; rate limits retain an already
uncertain command. Sign-out, account changes and authentication errors revoke
pending UI state, including while its sheet is closed.

`controlEventRehearsal` requires `expectedSetupRevision` for assistance and movement commands,
alongside the runtime revision and immutable client action id. Reset increments
the setup revision and reuses runtime revisions from zero. The handler checks
the reviewed generation before replaying a receipt and again inside the
transaction, preventing an old pending instruction from publishing into the
new run. Other existing lifecycle controls retain their previous payload;
this additional required field applies to assistance and movement. Native typed
commands serialize the reviewed generation and also verify it in the result.

Host rehearsal bootstrap also exposes the stored `virtualStartedAtMillis`.
Native practice instruction assembly uses that anchor plus the configured
duration to bound expiry; advancing the virtual clock cannot extend the event
window. Older Host responses without the anchor remain readable, but cannot
assemble a new instruction until a current bootstrap supplies it. The guest
bootstrap shape is unchanged.

`eventRehearsalActors.assistanceAutomation` is optional, callable-owned and
private to Host bootstrap. It stores the clock generation, enabled/paused state,
explicit plan, bounded simulated-outcome script, cursor and typed policy/delivery
evaluation. Guest projections omit the recipe. Automation commands use the
existing assistance generation/revision/request fences. Current-time evaluation
shares the parent actor transaction; failed or duplicate transitions cannot
consume another script item or create another attempt. Reset removes recipes
by rebuilding the synthetic roster. These additions have no live sender or
provider binding.

Native rehearsal readers preserve this optional automation value with a strict
plan parser, immutable one-to-six-item outcome script and bounded cursor.
Policy evaluations reuse the shared late-join decision union; delivery
evaluations have closed variants and reasons. Missing automation remains null,
and uncertain or accepted delivery evidence retains its reconciliation state.
Native configure/pause/resume commands use the existing assistance payload and
receipt checks. Configuration freezes the reviewed plan and script, including
through an uncertain exact retry; no schema or live provider change is required
for these native bindings.

Rehearsal plans optionally include the closed `TemplateSetting` union as
`setting`. Presence preserves observe/prepare/execute/disabled behavior through
callable commands, stored actor/message plans and Host bootstrap. Absence keeps
legacy execution and serialization unchanged; explicit null and a supplied
runtime policy version are rejected. Native typed plans and publication drafts
retain the same union. Restricted modes never create a guest instruction or
consume the simulated delivery script. Clients with the older closed plan parser
must be updated before explicit modes are written; this extension needs a
coordinated API/app rollout. Guest bootstrap and real sender authority do not
change.

`event_rehearsal_settings.schema.json` adds optional callable-owned session
`assistanceSettings` and Host-only `settingsReview`. The bounded state contains a
clock ID, optional simulated runtime and up to 41 group preferences. A closed
`settings` control command configures delivery, pauses it, or saves a late-join
rule. It excludes actor commands, clock minutes and synthetic operator identity,
and requires both setup and runtime review fences plus a source hash. The same
transaction owns its parent receipt and synthetic actor/message changes.

Event-enrolled actor automation has optional `origin: eventSettings`; absence
continues to mean an explicit per-guest recipe. Configuration cannot rewrite any
consumed outcome prefix. `configurationUnavailable` is a closed delivery-review
reason. Native readers preserve these additions, parse the rehearsal-only
context and complete group coverage, retain absent versus empty later choices,
and independently check each typed settings receipt. Shared presentation keeps
real location data when supplied and represents named practice targets without
coordinates. Update the API and native readers together before returning the
new actor origin/reason. No guest bootstrap, live permission or provider schema
is changed. The native controls and state-owner composition remain pending.

Native joining configuration consumes a current, account-bound movement review.
It reuses the reviewed destination IDs and copy. Defaults permit the whole
configured itinerary or pace-group checkpoint set; explicit policies can narrow
that set and retain entry rules, response deadlines, message caps, cooldowns,
route order and simulated outcomes. Configuration before a saved departure has
an awaiting-departure preview and cannot publish directions. A confirmed target
outside the policy is a distinct held preview. The legacy plan's configured
copy and confirmation flag are never movement authority: the callable resolves
actual saved progress. Fixed-place entry rules may restrict confirmed guidance
without changing the recorded departure. Policy cutoff stays separate from the
event-end guidance expiry. Selection and first submission require a current
movement page; uncertain retries retain the selected command under the existing
assistance editor lifecycle.

`eventRehearsalCases` is a callable-only collection with correlated open and
settled handling, reusing the live practical-request handling definitions.
Case identity includes the rehearsal clock, synthetic actor and originating
guest action or message response. Creation and resolution share existing parent
rehearsal transactions and action receipts. The Host-only bounded request view
preserves the current clock, reviewed source hash and assignment authority;
old untracked help flags remain explicit. Guest projections omit these records.
Native readers reject foreign clocks/actors and inconsistent resolution state;
only a reviewed open rehearsal case can form its typed handling command.
Rehearsal reset and expiry remove these cases, independently of live cases.

Delivery review rows optionally include the current guest's display name (1–120
characters). The live projection verifies the attendee generation before exposing
it; source-changed rows require null. Rehearsal binds it to the synthetic actor.
The review hash includes the displayed name, so renaming requires a fresh review
for a new takeover while immutable receipt replay remains available. Native
readers preserve older omission as unknown and reject a named stale source.

Rehearsal Host bootstrap optionally adds `deliveryReviews`, with a rehearsal-only
context, explicit current-actor-message coverage, at most 50 rows and untracked
coordination. It reuses the live delivery-review shape without adding guest-visible
fields. The typed `repairDelivery` payload preserves the common action union,
but only manual handoff is executable or offered. Reviewed message revision and
hash accompany existing parent setup/runtime/action fences. Private
`eventRehearsalMessages.handoff` uses virtual time and the parent operation id;
the wrapped record is constrained to rehearsal context and still rejects the
live outbox handoff marker. Parent receipts, action capacity, reset and expiry
remain the existing owners; no additional collection or live dispatch authority
is introduced.

The optional, callable-owned `eventRehearsalActors.visit` separates physical
visits from connection state, placement and response intention. Observed arrival
and departure transitions advance an attendance revision; check-in uses virtual
time, and crossed scenario cues retain their individual scheduled times.
Rejoining starts a distinct visit even without advancing the virtual clock.
Legacy actors without visit evidence remain unavailable until an explicit
physical observation; a connection change cannot supply that evidence.

Host bootstrap optionally adds bounded `accountabilityReviews`. The typed
`resolveAccountability` assistance command reuses the common payload and live
resolution reducer, with a reviewed source hash plus existing setup/runtime and
action-receipt fences. Returned/departed outcomes bind to the exact visit revision
and check-in; reopening clears the outcome. Historical proof cannot resolve a
later visit. Host identity is stored only as the private resolution audit actor,
not a synthetic participant identity. Guest responses omit visit and review data.
Completion permits follow-up within the action cap; reset clears visits and
invalidates earlier commands. Native reviews now validate bounded coverage,
clock/episode identity and availability, and construct commands only from a
current actionable row. The per-guest controller preserves uncertain requests
across refresh and closure; exact retries retain later visits and corrections.
Host screen mounting remains integration work.

`event_rehearsal_movement.schema.json` owns the bounded group movement review.
`selected` explicitly carries the reviewed departure, including older fixed-place
records; `progress.current` remains the latest departure independently of history
selection. A checkpoint repeats the selected record's departure and report, and
its source hash fences new observations. Native readers validate these identities,
the original roster denominator, complete candidate coverage and virtual clock.
An omitted roster is distinct from an explicitly empty roster and from a report.

Native `confirmDeparture` and `recordCheckpoint` controls use `action: movement`
without an actor target. They share the live checkpoint observation and correction
rules while retaining rehearsal-only persistence and receipts. One group/generation
controller owns an unresolved command across sheet closure, history selection and
refresh. Network ambiguity preserves the exact request; a definitive conflict
requires a new review. Deliberate snapshot and movement reads must agree on runtime
revision, and auth transitions revoke both private reviews and pending requests.
Backend-produced fixtures are checked in both Functions and Flutter tests.

Rehearsal also supports `reassignCheckpointReporter` and `setCheckpointCloseout`
through the same movement action, with native commands using the live decision
vocabulary and the existing group pending-request controller. Optional record
`assignment` and `closeout` changes have independent revisions and parent action
identities. They preserve the original departure, deadline and arrival report.
Legacy records remain readable; private checkpoint reviews explicitly distinguish
missing legacy metadata from a departure with no reporting request. Native readers
validate stored decisions, original-roster coverage and derived review states;
command receipts also preserve the reviewed actor, reason and evidence.

Live and rehearsal share closeout eligibility and decision rules. Closing requires
an explicit partial report and a current, post-departure visit disposition for each
unconfirmed original member. It never creates an arrival observation. Changed
reports or dispositions restore review; a complete report supersedes closeout.
Reopening retains the saved evidence. Current organizer managers can reassign a
request to a current manager or a synthetic reporter whose duty covers the
original deadline. Reassignment does not extend that deadline or grant access. All changes use the existing bounded rehearsal transaction,
action receipt and reset/expiry cleanup; no live Operations work or notification
is created. Native screen mounting remains open.

`event_rehearsal_staff.schema.json` now owns up to 50 synthetic operators, each
with at most 20 independently expiring group duties in the private session.
`controlEventRehearsal` with `action: staff` assigns or removes a reviewed duty;
the parent runtime revision, setup generation, action cap and receipt fence the
change. Reset, fork and setup replacement do not inherit practice staff.

Host bootstrap and movement reads accept an explicit `practiceOperatorId`;
scoped movement, membership and accountability commands bind that identity in
their request receipt. The real caller must remain an organizer manager.
Synthetic identities never create accounts, invitations or `eventStaffGrants`,
and cannot authorize access to any live event or rehearsal endpoint. The Host
retains lifecycle, clock, messaging and staff-configuration control.

Live and practice share the duty permission map and assignment window.
Leads/pacers can confirm departures and transfer guests; sweeps can read, report
checkpoints and resolve accountability. Group staff can take reporting
responsibility themselves; only the Host may name another reporter. Live and
practice enforce this through the same selection rule. Only the named, currently authorized
receiver accepts a handoff. Accepted membership determines subgroup visit scope;
proposals do not transfer authority. A reporter needs duty coverage beyond the
original deadline; removal, virtual expiry and changed group sources withhold
permission without rewriting arrival evidence or original responsibility.

`staffReview` separates the real Host, practiced operator, stored duties and
current per-group permissions. Role-specific accountability rows and commands
carry the actual group scope. Native readers validate the staff clock, Host and
practice identities, roster coverage, duty expiry and current permissions against
backend-produced fixtures. Group commands retain the selected role through reads,
confirmation and exact retries. Handover acceptance changes the guest's group
scope; a sweep cannot depart, transfer guests or reassign a checkpoint reporter.

`RehearsalStaffChange` reuses live assignment/removal decisions, freezes the parent
and staff revisions, checks the practice window, and verifies the saved duty,
other operators and parent receipt. Later replay preserves subsequent removal.
The repository supports explicit role reads and typed staff writes. Native staff
configuration/role-selection controllers and screen mounting remain integration
work. Other rehearsal controls still default to organizer management authority.

### Explicit Attendance Closeout

The event document accepts an optional, callable-owned `updatedAt` timestamp.
The absolute Host attendance writer already updates it with the event checked-in
aggregate. Older events may omit it; a real-emulator check-in regression validates
the resulting event and attendee documents before reading closeout again.

`event_attendance_disposition.schema.json` defines live-only reads, the typed
`recordNoShow` command payload, response projection, annotation and receipt.
The command distinguishes recording evidence from a clear reason. Its expected
physical-attendance revision and expected disposition revision are independent.
`eventAttendanceDispositions` and `eventAttendanceDispositionReceipts` are
callable-only; their owner validates current organizer authority and canonical
roster/event/plan/guest evidence in the same transaction as the decision.
Source hashes preserve timestamp precision and source generations; they cannot
be reused after attendance, relevant identity, closure or cited guest evidence
changes. Exact receipts preserve the original operation revision separately
from current projected disposition. Old decisions are hidden for replacement
identities or explicitly superseded for changed facts. These documents do not
replace `eventAttendees`, infer attendance, update event totals or alter report
aggregates. Native readers preserve each disposition/closure/evidence variant
and reject cross-field contradictions as well as schema-invalid values. They
use generated request DTOs, retain the reviewed source and revisions for exact
retries, and distinguish an operation's receipt revision from the latest view.
No schema or generated contract change is needed for this native binding.
The same shared schema now defines `getEventAttendanceReport` and its closed
attendance classification/count projection. The current unified Host roster
is read in a single SDK read-only snapshot with the same per-guest validation
and decision policy. Imported or unlinked rows are included. Empty roster,
unresolved review reasons, explicit recording evidence and non-admission are
preserved; counts and compact member ids cover all canonical rows together.
Overflow beyond 1,000 rows or malformed source evidence fails the request.
The aggregate cannot submit a decision or update legacy scorecard caches.
Native report parsing checks exact field sets, closed variants, unique members,
coverage and each count against the member classifications. It shares the
individual closeout closure parser and exposes immutable per-guest scopes,
without turning report evidence labels into mutation authority. The repository
uses the generated live request; unavailable, unauthorized, oversized and
malformed reads remain errors. Account-scoped providers discard prior reports
on reload or auth change. Successful individual decisions invalidate only the
matching event/account aggregate and fetch fresh totals.
Roster and report UI integration remain separate work.

### Event Assistance Transaction Boundary

The exhaustive workflow catalog and the separate
`event_assistance_command_bindings.json` catalog distinguish command type
coverage from executable coverage. Every command has one live and one rehearsal
binding classified as direct command, domain adapter, internal coordinator or
contract-only. Coverage is derived as complete or none unless a binding records
an explicit partial partition of one command payload discriminator. Partial
coverage names every implemented and missing variant plus the missing
capability. Contract validation checks that partition against the command
schema. Generated TypeScript and Dart expose the same mode-specific relation.

Event Assistance routes read/write SDK transactions through
`runAssistanceTransaction`. Explicit read-only snapshots keep the SDK read-only
path and cannot acquire write authority.
The adapter normalizes only the exact closed-transaction read failure into the
SDK's existing bounded ABORTED retry path. It does not wrap commit failures or
retry provider sends, and it preserves other domain and transport errors. Request
receipts still own recovery when a commit outcome is uncertain. The source check
in `transactionCallback.test.ts` rejects direct production read/write SDK
transaction calls outside this adapter; test fixtures remain independent. This applies consistently
to settings, group handovers, guest actions, outbox claims and callback consumers.

### Event Assistance Practical Requests

Guest responses create `eventAssistanceCases` with distinct practical and
restricted-safety ownership. New records bind their roster/event generations
and contain a revisioned handling state. The schema preserves historical
records without those fields as an explicit legacy variant; the Host reader
cannot invent their missing source binding or authorize their mutation.

`listEventAssistanceCases` provides a manager-only, bounded page of practical
requests, with stale identity redaction and no event-wide completeness claim.
Optional current-source guest names and manager choice snapshots are shared with
rehearsal help projections. Source-changed and legacy rows can expose only a null
name. Manager options bind the caller and contain at most 42 distinct canonical
managers; every assignment rechecks current authority. Native parsers reject duplicate/missing-caller
choices and a rehearsal name that differs from its actor. Guest-name changes alter
the reviewed source hash, independently of the immutable retry binding.
`resolveEventAssistanceCase` owns resolution, decline and manager handoff. The
canonical command includes the expected case revision; its callable also
requires the reviewed source hash. `eventAssistanceCaseReceipts` records exact
request hashes, source binding, actor, outcome and committed revision for
transactional retry safety. Both collections deny direct client access.
Comfort/safety requests remain excluded from the organizer queue. For Admin
roles authorized to read safety detail, the safety overview reads their
`authorizedSafetyOperator` rows into the event safety queue; finance and
analytics overview roles do not query those records.
`adminDecideSafetyTriageItem` closes the nested revisioned
handling state as resolved or declined. `adminAssignSafetyTriageItem` changes
only that nested safety assignment. Both mutations validate the complete case,
preserve its event/attendee/message binding and write an Admin audit record;
they do not perform an account, content, payment or event mutation.
See `docs/event_success.md` for lifecycle and integration boundaries.

### Event Assistance Delivery Review

`event_assistance_delivery_review.schema.json` owns the closed Host delivery
page, reviewed repair input, ownership projection and immutable repair receipt.
Both callables require organizer management access. List coverage is page-local;
delivery evidence and coordinator completion remain independent. Missing or
replaced guest sources redact attendee identity and prohibit new commands.

`repairEventAssistanceDelivery` currently supports only the typed command's
`manualHandoff` action. Its expected message revision and complete review hash
fence changed evidence and source state. It atomically adds optional server-owned
`handoff` evidence to the existing outbox and creates a private
`eventAssistanceDeliveryRepairs` receipt. Legacy messages need no migration.
Rehearsal records cannot carry live handoff evidence. Exact retries retain their
original operation revision while returning the current projection. The handoff
stops new dispatch authority without closing replies or inventing nondelivery.
Receipt lookup/finality and verified retry remain unimplemented integrations.

### Event Assistance RCS Configuration

`contracts/operations/event_assistance_rcs_config.schema.json` references the
canonical Google RBM sender shape in `event_assistance_rcs.schema.json`.
Generated TypeScript validators and Dart schema metadata share its agent,
region, credential-version, purpose, approval, quote and queue-limit fields.
The messaging provider union permits `googleRbm` only for `catchEventRcs`.
The sender display name is now required and `eventAssistanceRcsSenders`
references the same canonical configuration as a private Firestore collection.
No public provisioning endpoint or live sender is created by this contract.
It grants no recipient, spending or dispatch authority. See
`docs/event_success.md` for rendering and integration boundaries.

`event_assistance_rcs_consent.schema.json` owns independent RCS permission,
exact consent receipts and preference views. The two App-Check-protected
`getEventRcsPreference` / `setEventRcsPreference` callables require the roster's
linked UID; a grant additionally verifies its signed phone claim. The reviewed
hash binds sender identity, event name and captured window, subject and phone,
attendee and Firestore source generations, and latest STOP. Caller-selected
provider IDs, phone numbers or evidence timestamps are rejected.

The `list_event_rcs_preferences` request/response contracts expose bounded,
participant-only sender discovery. Requests name only event, attendee and a
nullable permission cursor; identity comes from Firebase Auth. Responses retain
configured sender selection separately from previous sender IDs and pagination.
The configured sender uses the canonical runtime source binding, including
paused configurations. Historical discovery uses a composite index over live
context, attendee, subject UID and document ID; source/phone mismatches are
filtered after a bounded read. It never supplies consent or sender readiness.
The existing reviewed preference callables remain the only grant/write path.

The `list_event_whatsapp_preferences` request/response contracts provide the
corresponding bounded discovery for `organizerEventWhatsapp`. They use a distinct
`wa-permission` cursor and index prior verified subject evidence via
`evidence.subjectUid`; an initial revocation without that evidence is excluded.
The shared source reader checks current participant ownership and the saved
runtime binding before either channel's private history query. Channel-specific
permission decoders retain their own consent and identity rules. These read
contracts add no grant, connection, provider or financial authority.

Private `eventAssistanceRcsPermissions` and `eventAssistanceRcsConsentReceipts`
commit together. Granted and revoked records are a closed union; a grant
requires explicit evidence and a matching immutable receipt, while initial
withdrawal has null evidence. Exact request retries cannot reverse later
decisions. Withdrawal preserves the original binding after phone, source or
sender changes. Consent expires at the captured event end plus 24 hours, with
the current event window rechecked by the shared transactional permission
reader. STOP review hashes exclude START and unrelated observation revisions;
a new STOP requires fresh review. No SMS/WhatsApp permission is reused or
mutated. Direct client collection access remains denied.

RCS permission records require a derived `subscriptionId` matching the canonical
agent plus phone hash. The whole record remains covered by its immutable consent
receipt. A composite index over `subscriptionId`, `expiresAt` and document ID
supports bounded conversation STOP discovery without storing raw phones in work
payloads or scanning every recipient of an agent. Do not retrofit an indexed
field onto a previously receipted grant: changing that record invalidates its
proof. These pre-activation contracts require state verification and fresh
review for any older records before live activation; no data backfill or consent
migration is performed by this source change.

The same canonical contract now owns `WithdrawalGrant`, `WithdrawalView` and a
closed `messageLink` revoke-only receipt variant with a null actor. Private
`eventAssistanceRcsWithdrawalGrants` binds the original source generations,
subject, endpoint and agent. Transactional preparation verifies the persisted
guest grant and exact permission/receipt before staging immutable issuance. The
App-Check-protected bearer callables `getEventRcsWithdrawal` / `withdrawEventRcs`
expose only recorded preference and lifetime; revision checks and immutable
receipts fence old requests. Withdrawal works after instructions expire without
restoring read/reply access, and does not depend on current event/roster/sender
records. Retain its referenced guest grant through the independent withdrawal
lifetime. The RCS dispatch store now stages this binding with the outbox claim
and two approved budget charges. The guest update page now reads and withdraws
RCS independently from SMS and WhatsApp, even when instructions are unavailable.
Its shared controller validates the closed response before caching, scopes each
channel and credential separately, and preserves an uncertain request for exact
retry. Bearer controls cannot opt in. Verified guest opt-in controls and live
activation remain open.

The RCS canonical contract also owns `Budget`, `CapabilityObservation` and
`Dispatch`. Private `eventAssistanceRcsBudgets` binds each approved event or UTC
sender-day limit to an agent and currency. Both pessimistic charges commit with
one outbox claim. `eventAssistanceRcsDispatches` stores the corresponding
before/after budget revisions and charges, original scope, permission and
capability hashes, deterministic provider message ID, frozen body hash and
absolute delivery expiry. No phone, bearer secret or message body is persisted
in that record. Capability is an in-memory, at-most-60-second observation tied
to the exact sender and consent; its snapshot is retained in dispatch evidence.
It grants no spending or message permission. The shared channel selector can
use RCS through the production factory for an explicit sender when its default-off
flag is enabled. The credential loader validates an exact sender/agent/region
secret envelope and uses the Google OAuth library with the RCS messaging scope.
The HTTP export resolves independent, pinned webhook endpoint bindings and
commits verified callbacks to the durable inbox. These secret formats and
configuration flags are owned in `docs/event_success.md`; they create no new
client-visible contract or consent. Deployment, authenticated ingress activation
and approved provisioning remain required for live use.

### Event Assistance RCS Callback Evidence

`contracts/shared/event_assistance_rcs_callbacks.schema.json` owns the closed
delivery, expiry, suggestion, subscription and unstructured-message observation
union. Firestore schemas reference its callback, identity and consumer receipt
records;
generated TypeScript validators and Dart metadata share those exact shapes.
Authenticated ingress owns both server-only collections, with all direct client
reads and writes denied:

- `eventAssistanceRcsCallbacks/{callbackId}` stores immutable normalized evidence.
  The ID hashes the scoped receipt key and signed payload hash, so conflicting
  payloads retain separate records without storing the raw provider payload.
- `eventAssistanceRcsCallbackIdentities/{receiptKey}` binds the first callback and
  storage time to the agent, endpoint, event family and provider event identity.
  Its nullable conflict time prevents later consumers from using contradictory
  evidence as an ordinary delivery or guest response.

The inbox writes both records transactionally and preserves first-receipt times
on exact duplicates. Consumers must read the identity in their effect transaction;
acceptance grants no delivery, guest or permission effect. Evidence excludes raw
phone numbers, message text, file URLs, locations, signatures and tokens. Missing
provider time remains null. No automatic retention deletion is configured until
pending-consumer and retry requirements have an implemented lifecycle. See
`docs/event_success.md` for consumer behavior and remaining activation work.

`eventAssistanceRcsCallbackReceipts/{callbackId}` is a third private collection.
Its closed outcome (delivery, reply, ignored or rejected) binds the complete
immutable callback hash and processing time. The inbox conflict identity, outbox
transition, typed guest action and receipt share one transaction; failed commits
leave no partial effect and exact retries return the saved outcome. Missing or
conflicted inbox evidence cannot create a consumer receipt or domain effect.

Dispatch records now include immutable intent and attempt-scope hashes plus a
nullable native reply binding. It freezes only rendered choice indices/IDs, the
guest revision, episode, attendee/event source generations, subject UID and reply
expiry. Reply expiry is independent of provider queue TTL. An authenticated tap
can prove delivery after queue expiry, but its domain action still requires the
current guest identity, instructions and event window. Original replies remain
usable after outbound opt-out without restoring any message permission.

`event_assistance_rcs_subscriptions.schema.json` adds the server-only
`eventAssistanceRcsSubscriptions/{subscriptionId}` projection, keyed by agent
and hashed endpoint across events. It retains independent latest stop and
subscribe-request callback references and their first storage times. At least
one observation is required; neither state grants event consent. The inbox
commits the projection with its callback and identity, including a restriction
from a conflicting signed STOP. Exact retries can repair missing older
projections without moving observation times or overwriting newer evidence.
Readers verify both shape and original callback binding transactionally.
No direct client access or automatic retention deletion is enabled. Event
permission, dispatch, SMS and WhatsApp records are not mutated by this owner.

### Host Today Attention Contract

`contracts/catalogs/host_attention_policies.json` is the exhaustive policy
inventory for the Host Today queue. Every kind declares one source owner,
trigger and resolution semantics, authorization boundary, consequence,
deadline policy, destination, deduplication policy, delivery mode, and source-
truth readiness. The schema validator requires the catalog to match the closed
kind enum in `contracts/shared/host_attention_common.schema.json` exactly and
in order. Adding an attention kind therefore requires an explicit catalog
decision; it cannot appear as widget-local business logic.

The catalog distinguishes four delivery modes:

| Delivery mode | Meaning |
|---|---|
| `serverProjected` | The backend can derive the item from explicit canonical facts and return it after read-through reconciliation. |
| `clientMerged` | The fact is intentionally device-local and Flutter merges it after the server response. |
| `shortcutOnly` | Today exposes an action, but the product does not claim that every organizer has a mandatory task. |
| `blockedMissingTruth` | A desirable archetype lacks an explicit authoritative workflow field; the callable reports the gap instead of inferring it from a weak proxy. |

`organizerAttentionItems/{attentionId}` is a server-only evaluated projection.
It stores stable source provenance and revision, open/resolved lifecycle,
urgency, consequence, deadline, destination, display-safe context, policy and
resolution versions. Open rows use a null TTL; resolved rows receive bounded
cleanup. It never embeds prose predicates or
becomes the source of the underlying event, application, form, provider, or
payout state. Direct client reads and writes are denied.

`listOrganizerAttentionItems` owns the read-through boundary. Before returning
supported server items it must re-read every declared authoritative source,
derive the desired open set, upsert changed rows, and resolve stale rows. Each
source scan is bounded at 400 current records and fails closed when exceeded;
the callable must never label a truncated scan exhaustive. Form automation
reads at most 400 enabled rules, then one latest terminal run per matching
organizer, form, rule and current revision. Runs order by `updatedAt` descending
and document ID descending; succeeded and skipped outcomes resolve older
failures, while pending and running retries do not hide terminal failures.
Historical runs and disabled rules do not consume this current-state bound.
The required composite index must be deployed and ready before releasing the
reader; a missing index or failed source query cannot produce complete coverage.
The response also
contains one coverage row per catalog kind so clients and tests can distinguish
complete server coverage, required local merging, shortcuts, and missing truth.

The source-ready server kinds are live-event operations, open practical guest-
help review, delivery work that explicitly requires host review, ordinary
waitlist review, manual join-request review, application review, provider-sync
failure, form-automation failure, payout setup, fired staff-attention moment
sends, and unpaid event-offer follow-up. The offer follow-up aggregates every
still-offered paid offer whose manual payment is not host-attested and whose
expiry has not passed, grouped per event, so a host is reminded to collect or
chase payment before the offer lapses; the item resolves itself once every
offer is attested, admitted, withdrawn, or expired.
Practical help is aggregated per active event from event-lead-owned cases;
safety-owned cases remain inside their restricted operator boundary. Delivery
review is aggregated only from validated `liveMessageDelivery` Operations work
whose checkpoint and human-review projection agree; message status alone cannot
create a task. Attendance retry/conflict work is
merged from the local Host outbox. Flutter consumes the callable through
`HostAttentionRepository`, parses the closed item and coverage vocabularies
into typed domain values, verifies the requested organizer, and rejects any
response that does not contain every catalog kind exactly once. The Today feed
then merges every normalized `HostAttendanceOutbox` row, deduplicates and sorts
the combined queue by urgency, blocking consequence, deadline, and stable id.
The active-event feed remains usable when either optional attention source
fails, but the presentation receives a source-specific issue and must not claim
that the organizer has no outstanding work.

Dress Rehearsal is a Today shortcut. Event Success readiness, room-layout
requirements, staffing requirements, generic form-response review, Inbox reply
obligation, and post-event reconciliation stay blocked until their owning
domains add explicit workflow state. In particular, null optional setup, zero
staff grants, an unread message, a submitted generic form, or aggregate counts
are not sufficient evidence of a mandatory task.

### Event Assistance Group Membership Contract

`eventAssistanceMemberships/{membershipId}` holds at most one accepted group
and one current handover per event/attendee. It binds event/roster creation
generations, authored attendee generation, participation episode and revision.
Accepted membership and proposed destination separately bind saved group source.
Attendance, social allocation, physical placement and participation remain owned
by their existing records. Membership never modifies those facts.

The canonical `transferGroup` command has correlated place/propose/accept/reject/
cancel/leave decisions. Place is an initial manager acknowledgement of
responsibility; propose can name a current receiving operator for either initial
assignment or transfer. Acceptance belongs to that exact operator with current
scope authority. It changes membership and resolves the proposal together.
Cancellation, rejection and expiry preserve the prior group. Direct placement
cannot bypass a pending assignment. Transfer deadlines cannot exceed 30 minutes
or the event end. Sweeps have scoped reads but no transfer authority.

`eventAssistanceMembershipReceipts` atomically preserves the actor, canonical
command, request hash, source generation, episode and resulting revision. Current
manager/scoped operator authority and reviewed source/revision/episode fences are
checked in each transaction. Reads and retries never recreate an earlier effect.
The membership store uses the shared bounded transaction callback adapter for
closed-transaction read failures. Commit uncertainty is not translated or
blindly retried; immutable request receipts remain the replay authority.
Changed event/roster generations, guest re-entry and changed group setup require
fresh review. Membership checks also gate group-specific joining instructions at
publication, guest interactions and SMS/WhatsApp dispatch. Both collections deny
all direct client access. Host controls, bulk/queue projections, responsibility
reassignment, rehearsal adapters and terminal retention remain integration work.

### Event Assistance Participation Contract

`eventAssistanceGuests` owns explicit participation independently of its reported
joining intention. `participation` is a correlated state: active and departed
require a null return point; temporaryBreak may carry a currently saved itinerary
unit reference. The record also binds the exact Firestore creation generations
of its event and roster row. Source replacement withholds the old state and
requires a new reviewed episode. Reads expose only participation, source/revision
fences, check-in status and return choices; they contain no contact information
or reported joining intention.

`eventAssistanceParticipationReceipts/{receiptId}` is a server-only immutable
command receipt. Its identity binds event/guest/operation; its request hash
includes the authenticated actor. State and receipt commit together. Exact
retries return the original revision plus current state; changed reuse, source
replacement and stale commands fail. No direct client access or TTL is enabled.
Retention must cover executable commands and outstanding guest capabilities.

The get/set participation callables require Auth, App Check, rate limiting and
current organizer-manager or linked-attendee authority. Set consumes the canonical
`setParticipation` command with episode and revision fences and a reviewed source
hash. Admission must be registered/checked-in and the event must remain open.
Re-entry starts a fresh episode; other state changes preserve it. The command
never checks someone in, allocates them, changes consent or infers that they have
returned. All messaging boundaries suppress affected activity prompts while
retaining independently eligible essential and post-event updates.

### Event Assistance Settings Contract

`eventAssistanceSettings/{settingId}` stores a typed preference for one live
event, group scope and workflow kind. The ID hashes those three identities.
The whole-event default uses `event:whole`; configured pace-group IDs may own
an override. `inherit`, explicit disablement and a correlated configured
template are distinct wire states. Templates bind configuration to workflow
kind without requiring a guest episode during setup; runtime policy binding
supplies the concrete subject and the server-owned implementation version.

`eventAssistanceSettingReceipts/{receiptId}` stores immutable request hashes
and original committed revisions. Actor identity participates in the request
hash; context/group/workflow/request identity determines the receipt ID. Both
records commit together. Exact replay returns its original operation revision
and the latest projected settings. Changed request reuse or an outdated
revision/source hash fails. Neither collection has client access or a TTL;
terminal retention must be decided before activation.

The two settings callables require Auth, App Check, rate limiting and current
organizer-manager authority. They expose settings, source hashes and a bounded `setup` containing the
reviewed event end and named joining destinations with locations, without roster
details. Setup comes from the same event/group source; changes to timing or
locations invalidate the old editing basis. It does not assert current movement,
provider readiness or permission to send. New clients tolerate an older response
without setup as unavailable configuration choices. Older closed-response clients
need a coordinated API/client rollout or reload before receiving the added field. A projection cannot claim current configuration after a
structural source change, while explicit disablement remains suppressive.
Current participation, capability/readiness, consent and execution authority
must still be resolved by their owning runtime boundaries. Saving an automatic
preference does not itself send a message or enable a production worker.

The internal late-join source reader uses the same settings inheritance and
source checks as the callables. It joins one canonical guest episode and its
accepted group with current progress without writing records or creating a
parallel projection collection. Its partial typed result excludes delivery
eligibility and message history. Those facts must be supplied explicitly from
the same scoped snapshot before canonical evaluation; the reader alone cannot
produce send authority. It is not exposed to clients and adds no new Firestore
access rules. The live evaluator now obtains those remaining facts through
shared consent/suppression readers and a bounded query of the existing private
outbox. Sender choices and policy-required response deadlines remain trusted
workflow inputs; they are not inferred from an arbitrary connected account.

The episode-history query includes all lateJoin occurrences and lifecycle states
for the exact live organizer/event/attendee/episode. Its six-field composite index
is declared in `firestore.indexes.json`. A maximum of 201 reads detects overflow
beyond the supported complete 200-row history. Reserved or potentially submitted
intents count once even across channel fallback, cancellation or supersession;
queued-only and proven-unsent records do not count. Conflicting evidence, ambiguous
latest material and overflow withhold evaluation. No new projection collection,
client access or cleanup policy is introduced. Active episode history must remain
available for policy caps and cooldowns. Final dispatch rechecks exact message
material, credentials and spending separately from preparation eligibility.
The atomic publisher below now consumes these facts. Durable worker scheduling
is wired in source and remains dormant; terminal retention remains integration
work.

Automatic lateJoin message intents now include an optional strict `automation`
binding in the canonical messaging schema: policy version, setting identity and
revision, group, ordered sender routes and nullable explicit response deadline.
The trusted automatic publisher always emits it; existing explicit publications do
not acquire automation authority by omitting it. Wire validation plus runtime
cross-field checks reject mismatched routes, duplicate route ids, non-live contexts
and a different workflow. Generated Functions/Dart schemas and private Firestore
message types carry the same contract.

The automatic publisher joins source evaluation and message/thread writes in one
transaction. Its semantic identity excludes only creation time, so later retries
reuse the original immutable record while changed content creates a distinct intent.
Final automatic dispatch re-evaluates current policy and exact setting/group/sender
bindings. Episode history excludes only the exact stored intent being dispatched,
after full identity/content/conflict validation; other lifecycle states remain in
the complete query. This prevents a reservation from consuming its own logical slot
twice and preserves the shared cap across replaced instructions. Instruction refresh
and permission to send remain separate. No new collection, client rule, credential
read or provider submission is introduced by publication.

The runtime configuration read optionally returns a closed `senderSetup`
projection with bounded, channel-specific pagination and safe named sender
choices. The read request accepts typed `senderCursors`; each response advances
by scanned document identity and also includes current saved selections. A
configure command can include one `senderReviews` hash per selected route. The
server revalidates current provisioning and exact supplied hashes in the same
transaction before saving runtime permission and roster work. Pause and exact
receipt replay do not require sender readiness. No new collection, secret access,
consent grant or provider submission is introduced. New native parsers accept an
older response without discovery as unknown; older closed response clients need
a coordinated API/app rollout or reload before receiving the additional field.
The optional hashes retain request compatibility, while new reviewed native
changes bind displayed sender identity explicitly.

The strict `event_assistance_roster_work.schema.json` payload adds resumable
roster enrollment to the existing Operations collections. It binds the source
identity, organizer/event scope and saved runtime revision, with a bounded
cursor, retry list and explicit stop reason. `work_item.schema.json` binds this
payload to the Event Assistance workflow and `runtime_roster` entity kind.
Current runtime permission and each canonical registration are re-read before
guest enrollment or rebinding; payload snapshots never grant authority. No new
collection or client access rule is introduced. The authoritative execution
limits and lifecycle are documented in
[Operations](operations_platform.md#resumable-roster-enrollment).
Runtime configuration commits its roster run/item with the configuration and
request receipt. Configuration triggers reuse that revision's logical source
identity, while registration/re-entry sources retain their CloudEvent identity.

The strict `event_assistance_delivery_work.schema.json` payload binds an
automatic message to the Event Assistance `message_delivery` entity in existing
Operations collections. Phase-specific schema constraints distinguish queued,
retry, receipt wait, review and completed checkpoints. Runtime validation checks
the entire run/item projection, frozen intent/thread/scope, message revision/hash
and timestamp bounds. The publisher creates the message, thread and delivery
run/item in one transaction. A raw outbox row or unbound legacy intent cannot
create scheduled send authority. No new client-readable collection is added.
[Operations](operations_platform.md#durable-message-delivery-work) owns execution
limits, recovery and receipts; [Event Success](event_success.md#durable-message-delivery-coordination)
owns signing-key configuration and the channel bridge. Private grant/dispatch
records retain their existing hashes and bindings; credentials are never copied
into delivery-work payloads.

`event_assistance_source_work.schema.json` also accepts event-specific SMS and
WhatsApp permission and scoped staff sources. Its bounded cursor/failure set can
reference canonical guest, delivery or checkpoint work ids; scope and immutable record validation
remain mandatory before each wake. Source payloads retain identifiers rather
than consent contents or recipient endpoints. Delivery wake action receipts bind
the signal hash and target, deduplicate source replay, and preserve terminal
work, recovery caps and unresolved provider submissions.

The closed `checkpointMember` scope binds one attendee to a live organizer/event
and accepts only the matching `eventAttendees` source document. Check-in,
registration generation and canonical accountability corrections emit this
scope separately from ordinary guest work. Pure dispositions never enroll a
guest or select delivery work. Its cursors and failures accept checkpoint work
ids only. Discovery reads bounded existing requests in the exact event and
verifies their immutable roster hashes before checking original membership;
missing or corrupt evidence remains retryable work, not an unaffected result.
The signal contains no disposition, attendance assertion or provider authority.

`event_assistance_checkpoint_work.schema.json` binds the `checkpoint_report`
Operations entity to an immutable departure request, full roster hash and exact
checkpoint scope. Departure confirmation atomically creates the run/item when a
request is supplied and rechecks caller/owner expiry, deadline and event end after
those additional reads. Legacy departures create no inferred request work.
The worker stores typed observed/unavailable facts and a finite next due time,
with five scheduled retries for unreadable sources. Completed observations have
no due time, but remain nonterminal so corrected reports can reopen the same
request. The current lease fences run/item/action-receipt commits; source wake
receipts bind signal and target and deduplicate old deliveries. There are no new
collections, client grants, contact fields, provider effects or automatic
attendance mutations. Terminal retention remains unimplemented.

The optional checkpoint-work `closeout` is a separately revisioned close/reopen
decision, excluded from the immutable departure basis. The closed command
accepts only expected revisions, source hash, decision and reason; server-owned
proof binds the full partial report and the exact post-departure dispositions
for its unconfirmed original members. `eventAssistanceCheckpointReceipts`
contains the complete change, request hash, scope, roster hash and work revision.
The atomic Operations action receipt hashes that entire domain receipt, so
historical proof remains verifiable after later work revisions. Reads check
scope, actor, time, revision, original roster coverage and both receipts.
`closedOut` is distinct from a complete arrival report and remains nonterminal
so corrected facts or explicit reopening can restore review. The optional
callable closeout view keeps legacy responses valid. No new collection, client
grant, provider effect or attendance writer is introduced.

Source scopes also distinguish sender discovery and organizer/WhatsApp endpoint
discovery from event fanout. Readiness failures use `targetKey`, a stable
expiry/document-id query tuple; event fanout keeps `workItemId`. Runtime parsing
rejects a failure or cursor from the wrong scope kind. The two private query
indexes bind runtime route selections to configuration expiry, and organizer/
endpoint permissions to permission expiry. Lookup snapshots only locate child
event/guest wake jobs; current runtime, consent and delivery records remain the
authority. Existing event-source work records remain valid under the additive
schema. No new collection or client access rule is introduced.

### Event Assistance Group Progress Contract

`eventAssistanceGroupProgress/{progressId}` is the current explicitly confirmed
destination for one live event/group. Its ID hashes the canonical execution
context and group. The whole-event scope is `event:whole`; saved pace-group IDs
use the source route's IDs. The document pins a monotonic revision, destination,
source hash, confirming manager, command identity and server confirmation time.
The source hash binds the event and plan creation generations, schedule,
meeting place, itinerary and route configuration. It excludes routine live
step changes and attendance counters. A setup change marks the projection
`sourceChanged` and withholds derived current guidance without rewriting history.
Each projected destination includes an opaque `alternativeId` derived from the
typed target. A route-recovery write may add `routeDecisionId` to the current
progress document; older departure records remain valid without it.

`eventAssistanceProgressReceipts/{receiptId}` records the request hash, original
committed revision and time. Departure receipt IDs bind context, group and
operation ID; route-recovery receipt IDs additionally bind the command kind.
actor identity is included in the request hash. Progress and receipt commit
together. Route receipts retain their command kind and decision ID; those
fields remain optional for existing departure receipts. Exact replay returns
the original operation revision plus the latest
view, including after a later departure; changed reuse fails. These records
have no TTL: command deduplication must survive the executable event lifetime,
and terminal retention/cleanup must be defined before activation.

`getEventAssistanceGroupProgress`, `confirmEventAssistanceDeparture` and
`changeEventAssistanceRoute` are Auth/App-Check-protected and rate-limited.
Canonical organizer management is
checked inside the transaction that reads event/plan/source state and writes
the result. The read response exposes only saved destination choices and
progress, without roster data. Confirmation requires matching source and
progress revisions, a current destination, an open event and a live runtime.
Route recovery requires a current manager, an existing confirmed departure, a
different opaque alternative and an explicit decision ID. It updates operating
progress without modifying the event setup.
The collections deny all direct client reads and writes. This boundary records
a physical fact and does not authorize provider I/O or guest attendance changes.

`eventAssistanceDepartureRosters/{rosterId}` stores an immutable explicitly
selected departure roster. Its ID hashes execution context, group and committed
progress revision. New records also pin the confirmed destination; older records
without it cannot establish which checkpoint was reached. Each member pins the
registration creation generations,
exact check-in plus attendance revision, optional current participation episode
and accepted membership hash for a pace group. It contains no contact fields.
The optional `departureRosterId` on progress references only that departure;
absence denotes an unrecorded roster, while a recorded empty roster is explicit.
An optional `checkpointRequest` pins `responsibleOperatorId` and `dueAt` to this
departure and its checkpoint destination. The departure command explicitly supplies
both; legacy records infer neither. Current managers can name an authorized reporter,
while staff who can confirm departure may name only themselves. It rechecks deadline,
event end, caller expiry and the reporter's current authority after all reads.
Reporter access must extend beyond the deadline, which is limited to seven days from
confirmation and four hours after event end. No staff permission is created.

`getEventAssistanceDepartureRoster` reviews caller-selected attendee IDs under
current scoped read authority. The optional departure command selection carries
these IDs and a reviewed source hash. The write revalidates every selected row
and creates progress, command receipt and roster atomically. Selection is bounded
to 1,000 unique IDs with batched transactional reads; the `members` field is
exempted from indexing. No client can read or write the roster collection.
It has no TTL: checkpoint reconciliation and the retention policy must preserve
the original departure evidence before any terminal cleanup is introduced.

`listEventAssistanceDepartureRosters` discovers recorded rosters for one current
group under scoped read authority. Its read-only transaction queries the canonical
progress identity in descending departure revision, with a fixed ten-row page and
one validated overflow witness. The exclusive `beforeRevision` cursor cannot hide
a later departure or duplicate a row across older pages. Each row exposes original
departure time, roster size, source availability and saved checkpoint report counts.
It exposes no guest identities, contact fields or inferred current obligations; the
original requested deadline is historical, and report detail must reload current
owner, closeout and visit evidence. Source changes retain history while withholding
a current destination label. Access is checked before the query and expiry is
rechecked after report reads. Invalid roster/report identity, hashes, ordering or
revision bounds fail the page. Removed groups remain unavailable under the current
group-duty boundary; this read does not widen staff authority.

`eventAssistanceCheckpoints/{reportId}` records the current checkpoint report for
an execution context, group, departure revision and checkpoint ID. The typed
command and reviewed source hash bind that immutable departure roster, checkpoint
revision and current visit eligibility. The report stores the roster content hash,
accounted-for attendee IDs, submitting actor/time and correction reason. Missing
members stay in the denominator; guest replies and current memberships are not
physical checkpoint evidence. Any removal from an earlier report requires a reason.
The member projection optionally includes `displayName`, verified against the
original registration's source and attendee generations before returning it. A
missing, malformed or replacement record returns null; its original roster member
and prior observations remain intact. Same-registration attendance changes do not
hide the name. Name changes enter the reviewed observation hash. Legacy responses
without names remain parseable and cannot invent a named UI identity.

`eventAssistanceCheckpointReceipts/{receiptId}` atomically preserves the authenticated
request hash and full original report. Its ID binds context, group and operation ID.
Reusing an ID with different content fails; an exact retry returns the original
revision and latest view. Reports for earlier legs remain independent of subsequent
progress. The two Auth/App-Check/rate-limited callables require a current scoped
checkpoint duty or organizer management and recheck expiry after transaction reads.
They do not require automatic assistance or an open runtime to settle outstanding
reports. New observations still require the same physical visit and source setup.
The checkpoint read view also projects the optional request's waiting, overdue,
discrepancy, complete or source-unavailable state and current owner availability.
Time and owner availability do not alter the report's reviewed evidence hash.
Complete original observations survive later source changes; partial corrections
reopen the request. These are projections of immutable request facts and current
observations, not a second durable workflow or an automatic arrival inference.
Operations request scheduling now consumes those facts under its own lease.
The optional Operations payload `reassignment` carries the effective reporter and
an independent monotonic assignment revision. The original request basis stays
unchanged. `eventAssistanceCheckpointReceipts` is a closed union of original report
receipts and assignment receipts, whose `checkpoint-reassignment:` identity binds
context, group and operation ID. Assignment evidence pins scope, roster hash,
previous/new reporter, manager, reason, server time and resulting work revision.
Its companion Operations receipt binds that same authenticated request and exact
work item. A missing or mismatched receipt cannot establish a current assignment.
The `reassignCheckpointReporter` command uses an independently reviewed assignment
hash/revision and a new operation ID; background evaluations cannot make that
review stale, while changed physical evidence or ownership can. The original
report evidence hash excludes ownership. The current response adds an optional
`assignment` projection for wire compatibility; current servers emit null when
there is no durable request. Exact retries return the original assignment revision
and current report/owner view, even after later changes. Reassignment changes no
permissions or deadline and checks the new reporter's scoped authority again after
lease/work preparation. Disposition-based closeout and staff notification delivery
remain integration work; this contract does not authorize provider sends.

Live checkpoint reads and rehearsal checkpoint projections optionally expose
`reporterOptions`. This shared shape binds manager ID, assignment hash and review
expiry separately from candidate authority expiry. At most 92 candidates contain
only ID, nullable display name and authority deadline. Each authority deadline must
be strictly later than the original request deadline and read clock. Current
servers use null when reassignment is unavailable; legacy omission grants no
selection authority. The existing reassignment command and atomic receipts remain
the write boundary, with fresh scoped authority checks. Rehearsal mirrors current
original-group duties and the virtual deadline without contacting live staff.

Both collections deny direct client access and have no TTL. The report's
`accountedFor` and receipt's `report` fields are excluded from indexes. Limits match
the departure contract's 1,000 members, with bounded transactional reads. Terminal
retention and reconciliation must preserve the original observations before cleanup.

Live joining updates must match the canonical guidance derived from current
confirmed progress. Publication, guest-link issuance, guest views/actions and
both channel dispatch paths read that source within their owning transaction.
The destination determines the group scope; guest group-membership authority
is a separate pending fact-reader concern. Material, source identity and
validity must still match, and the message cannot invent a future progress
revision. An identical reconfirmation may advance progress without invalidating
unchanged instructions. A stale source returns no current guest instructions
and stops a pending send; a transient database error remains retryable. The
publisher must supply fresh source-derived guidance before an existing link
can show a changed destination. No additional guidance collection or schema
was introduced.

### Event Service Outbox Contract

`eventAssistanceOperationalNoticeQuotas/{quotaId}` and
`eventAssistanceOperationalNoticePublications/{publicationId}` are server-only
records used by the typed plan-change and post-event follow-up publisher. A
quota binds live context, attendee identity, roster generations and workflow;
its count and revision advance together. A publication receipt binds one exact
domain source revision to its message, thread, semantic content hash and quota
ordinal. The receipt and quota commit atomically with the message and delivery
work, so an interrupted publication consumes no slot and a retry cannot create
a duplicate. A host policy edit does not reset the count. A deleted and
recreated roster row has new generation evidence and therefore cannot inherit
the prior row's quota or publication receipts.

Both collections deny all direct client access and have no TTL. They record
publication authority and idempotency only; they do not prove provider
submission or delivery.

The plan-change and post-event follow-up policy configurations own an explicit
ordered delivery selection: one sender per SMS, RCS or WhatsApp route and the
bounded retry policy. An execution-authorized setting is accepted only while
every selected sender is currently eligible for that message purpose. The
publisher derives its message and automation bindings from the saved selection;
it does not accept routes or retry limits from a worker. Final dispatch compares
all three frozen views—the automation routes, permitted route identifiers and
delivery policy—with the current setting before any provider call.

`eventPlanChanges/{sourceId}` is an immutable server-only record created in the
same transaction as an attendee-relevant `updateEvent` mutation. The event owns
a monotonic `planChangeRevision`; the record captures the changed fact kinds,
current destination summary, event window, author and validity bound. The
reader accepts only the latest event revision and only a registered or checked-
in attendee whose roster row existed when that revision committed. New guests
cannot inherit an old notice.

The post-event source reader uses the terminal `eventSuccessPlans/{eventId}`
status, its fenced live-control revision and completion timestamp. It applies
only to checked-in attendees, begins no earlier than the scheduled event end
and expires with the existing 24-hour service window. Both readers derive copy
and response choices from typed source facts; no caller supplies message text.
Durable audience enrollment and bounded per-guest fanout remain the missing
automatic coordinator before these two variants are live-complete.

`eventAssistanceMessages/{messageId}` is server-only delivery state owned by
trusted Event Assistance workers. Its canonical Firestore schema embeds the
portable message intent and delivery-attempt contracts. The id hashes execution
context, intent identity and revision; the immutable intent holds one guest
episode and bounded choices. Delivery attempts and guest response identities
also bind the execution context. Recipient endpoints are opaque references;
provider credentials and guest bearer grants remain outside this record.

Firestore transactions arbitrate immutable enqueue, attempt reservation,
one-time live dispatch claiming, closure and normalized receipt merging. The
history is capped at six attempts. Reservation and claiming use the same
transaction to read current event/guest/permission facts through the trusted
reader port. A claim commits an uncertain attempt before yielding permission
for provider I/O. Duplicate claims do not return that permission, and delayed
receipts remain reconcilable after closure. Contradictory delivery evidence is
sticky and blocks further dispatch pending an owned resolution.

A reservation still in `reserved` at its authorization deadline can be recorded
as `notDispatched/reservationExpired` by the next reservation transaction.
Release and claim contend on the same outbox document: a committed `unknown`
or accepted attempt can never be released by the clock. A worker with adapter
proof that permit expiry prevented all provider I/O records the separate
`notDispatched/permitExpired` reason. The older `expired` reason continues to
stop the logical message; it is not retroactively treated as retry evidence.

Both new reasons permit fresh evaluation after exponential backoff, provided
the event, guest, instruction and consent still require and allow outreach.
A replacement has a new attempt id and ordinal, and the old sender/permission
snapshot remains unchanged. Unsent attempts count against the total history
ceiling but not a channel's submission allowance. A reservation's reconciliation
hint is capped at its authorization deadline. No budget is charged for an
unclaimed reservation; spending already reserved by a claim remains charged
until separate financial reconciliation. Any later provider receipt that
contradicts an unsent record preserves a conflict and blocks pending dispatch.

No browser or mobile client can read or write this collection directly, even
with an admin claim. Guest responses use the separate scoped grant and atomic
mutation boundary described below; this outbox does not grant full runtime
access or turn self-reported intention into attendance. Scheduling, provider
activation and terminal cleanup remain delivery work. RCS permission readers
are implemented in the shared authority boundary.
The collection currently has no TTL; executable or reconcilable deduplication state
must not be deleted merely because the message's instruction has expired.

### Event Service Native Reply Contract

`eventAssistanceWhatsappReplyBindings/{attemptId}` is an immutable, server-only
choice mapping committed with a claimed live outbox attempt. Its schema pins
intent and attempt hashes, original sender/account/phone, recipient endpoint,
roster generation, guest episode and revision, response kind and offered choice
IDs. It contains no phone number, credential or guest webpage secret. The
correlation ID alone grants no action authority.

`WhatsappReplyStore.consumeQueued` reads signature-verified evidence from the
existing private `organizerMessagingWebhookEvents` queue. Exact sender,
recipient and original provider message correlation precede the shared
`applyGuestChoice` transaction. Unknown delivery correlation yields a waiting
result; expired, replaced or mismatched authority cannot execute a choice.
The webpage and provider consumer share response deduplication and case/intent
writes. Neither can change attendance, assignment or registration.

`onEventAssistanceWhatsappEventCreated` now invokes delivery and native reply
consumers from the authenticated queue. The optional `assistanceProcessing`
checkpoint is independent of campaign/Inbox processing fields. It binds the
immutable queue evidence and ingress receipt to a content hash, validates their
identity and scope, and records only bounded processing outcomes. A waiting
reply throws for the trigger's bounded retry policy; expired or permanently
rejected choices terminate. A failed checkpoint after an applied guest effect
replays the idempotent consumer, and an older waiting result cannot overwrite
terminal completion. Unrelated webhook traffic is ignored. No provider I/O
runs in this processor. These bindings have no TTL yet; activation requires
retention aligned with the outbox's reconciliation window.

Approved template snapshots now retain optional `parameterFormat`,
index-aligned `buttonLabels` and `buttonUrls`, and a `contentHash` of provider
identity, category, parameter format and complete raw components (including
body/footer/buttons). They retain the existing parameter bindings and
button kinds. Older documents still validate; native quick-reply sending
requires complete labels and a known format when variables are present. The
Meta adapter binds every quick-reply slot to an exact expected label and unique
payload, preserves parameter text, and emits names for named header/body
parameters. This metadata does not establish event-service consent or map a
label to a domain action; the trusted dispatch composition owns that mapping.

`eventAssistanceWhatsappPolicies/{senderId}` is a server-only reviewed policy
for one organizer connection and provider account/phone. Its strict schema
binds each supported message purpose to a template document, stable snapshot
hash, complete variable sources, exact native action/label/slot mappings,
maximum template age, recipient-prefix quote and bounded activation window.
Native action selectors distinguish joining intent, acknowledgement and all
four help categories. The template-purpose unions for SMS, WhatsApp and message
intents are checked for exact equality by TypeScript.

`renderEventWhatsapp` requires current matching metadata, a scoped guest grant,
exact instruction content and a complete webpage response path even when only
a subset of choices fits native buttons. Dynamic URL buttons accept only the
Catch event-update base and its grant suffix. Variables cannot be silently
trimmed or truncated; prepared-content hashes fence native payload numbering.
The snapshot hash includes provider content evidence and send metadata while
excluding sync timestamps. It detects edits observed by synchronization, not
provider-side changes after that read. Activation must enforce the reviewed
editing and synchronization policy. This record does not create consent,
debit spending or authorize dispatch; provisioning and composition with those
transactional resources remain required. Guest URL secrets stay in worker
memory, outside the policy and outbox.

`OrganizerTokenStore.accessBound` requires a numbered version in the configured
vault and the exact organizer/connection envelope. It rejects raw migration
tokens, mismatched scope and unknown envelope fields. Provider transport
rejects redirects, bounds response reads, redacts transport/provider errors and
checks a supplied deadline immediately before I/O. Once I/O starts, an uncertain
response cannot prove non-delivery. Optional callback data is correlation only;
its echo and status semantics require verification against the configured
provider account/version before Event Assistance activates it.

### Event Dress Rehearsal Isolation Contract

Event rehearsal is a separate bounded domain with eight callable-owned,
server-only collections:

| Collection | Purpose | Limits and authority |
|---|---|---|
| `eventRehearsalMilestones/{organizerId}` | Durable completed-rehearsal evidence | Server-only; stamped atomically with successful completion and unaffected by session reset, fork or expiry |
| `eventRehearsals/{sessionId}` | Frozen source snapshot, editable pre-start setup, scenario/seed, virtual clock, lifecycle and revisions | Organizer manager reads through Host callables only; 24-hour expiry; at most five active sessions per owner |
| `eventRehearsalActors/{sessionId_actorId}` | Deterministically generated synthetic people, visit-bound accountability, attendance/status, independent connection state, guest moment, Room placement/confirmation, opt-out/help/prompt flags, keep-apart ids and synthetic required-data completion | At most 50 actors; required-data state stores canonical field identifiers, revisions and virtual-time prompt status without profile values. No participant UID, phone, email, booking, payment, match, chat, or production attendee id. A resolving Host UID is private audit evidence only. |
| `eventRehearsalActions/{sessionId_actionKey}` | Idempotent Host/guest controls and deterministic replay history | At most 500 actions; a stable hash of session plus client action id deduplicates delivery |
| `eventRehearsalGuestViews/{sessionId_slotId}` | One browser-instance-to-actor lease with hashed bearer token state | Created only by the public guest bootstrap callable; link rotation invalidates prior slots |
| `eventRehearsalMessages/{messageDocumentId}` | Typed practice plan, joining instruction, simulated delivery evidence and response | Created only by a counted Host action; at most 200 messages per actor and run; no live sender binding or production outbox reference |
| `eventRehearsalCases/{caseDocumentId}` | Clock-scoped practical requests and their reviewed handling | Callable-owned synthetic cases; guest projections omit handling and authority evidence |
| `eventRehearsalMovements/{movementId}` | Clock/group/revision-bound immutable departure and separately revised checkpoint report | At most one departure per counted Host action, 500 per session, 50 selected synthetic visits; manager-only read pages contain at most 25 departures |
| `eventRehearsalRouteDecisions/{decisionDocumentId}` | Immutable source-fenced route override layered on a recorded synthetic departure | Manager-only typed command; advances the shared progress revision without changing the departure roster, checkpoint, itinerary or route setup |

The Dart movement review verifies every projected alternative ID against its
canonical target and binds a route overlay to the session, clock, group, source,
departure and shared progress revision. Its immutable `changeRoute` command
freezes the selected alternative and decision ID; the result check requires the
matching control receipt and exact immediate overlay.

The schemas under `contracts/firestore/event_rehearsal_*.schema.json` and
`contracts/callables/*event_rehearsal*.schema.json` are authoritative.
Functions may read `events/{sourceEventId}` exactly once during creation to
copy a bounded title, location, duration, and supported playbook shape after
verifying organizer authority. Explicit event guest selection also reads at most
51 registered/checked-in attendee documents, rejecting rosters outside 2–50.
Only names and attendance enter the private frozen snapshot; production attendee
IDs, linked identities, contacts, and payment state do not. Reset and fork reuse
that snapshot without reading the live roster. Public guest projections replace
copied names with synthetic labels. Custom setup strips production layout IDs
and arbitrary activity metadata before persistence. No rehearsal handler may
write a production collection. Firestore rules deny every direct client read and write to these
collections; App-Check-protected callables own all Host access.

`getEventRehearsalSummary` rechecks organizer-manager authority and returns only
`hasCompletedRehearsal`. Missing evidence returns false; failed authorization,
transport, or malformed evidence remains an error. A bounded one-session query
recognizes legacy completion while the session is retained, but cannot reconstruct
completions that expired before durable evidence was introduced. The summary
never writes completion; the existing revision- and action-ID-fenced completion
transaction is its only writer.

Host writes carry the expected setup or runtime revision. Mutating controls and
guest actions carry a bounded client action id, exact replays return the same
projection, and stale revisions fail closed. Setup freezes at start. Reset
regenerates actors from the same seed and clears action count; fork creates a
new session. Room moves, confirmation, and pin release use the same revision
and idempotency boundary and may target only deterministic tables owned by the
rehearsal. The scheduled expiry handler deletes the bounded child set after
24 hours. Advanced latency/failure/disconnect/stale/duplicate/legacy/reduced-
motion/low-bandwidth faults require internal/admin authorization; behavioral
scenarios remain available to an ordinary organizer manager.

The public guest response contains only a practice banner, safe session fields,
one synthetic actor, its optional sanitized joining instruction, and a slot
token. `clientInstanceId` stabilizes retries in one browser; the server derives
and stores only deterministic hashes. It never
uses Firebase Auth, OTP, attendee claims, or a production roster.

Practice assistance commands and new guest-action receipts bind the request
contents to their idempotency key. A changed retry is rejected; replay of a new
guest receipt still requires the current slot token. The guest response and
its intention/help effect commit atomically, without changing attendance.
Actor assistance state stores only intention and the latest practice message
id; counters and cooldown derive from complete message history. The composite
history query includes session, actor and clock generation. Reset invalidates
that generation and deletes messages; cleanup drains bounded batches so older
remnants cannot survive a page limit. The Host projection additionally exposes
simulated attempts; the guest projection excludes delivery internals.

Optional `eventRehearsalActors.requiredData` stores a synthetic profile revision,
the canonical completed field identifiers, a request revision and the current
prompt. Its source hash binds the rehearsal clock/setup generation, actor,
modules and completion state. Host requests require that reviewed hash and both
revisions, may name only missing canonical fields and must expire within the
virtual event window. Guest submissions require the current hash and revisions,
can complete the prompt in parts and advance the synthetic profile revision.
Projections convert Firestore timestamps to virtual UTC milliseconds and mark a
pending prompt expired without mutating history. Reset regenerates the initial
display-name-only state. No profile value, Consumer profile, runtime participant
or onboarding draft is read or written.

Optional `eventRehearsals.unitOutcomes` stores only the rehearsal format's
non-`none` unit-outcome primitive, one global revision and at most 500 synthetic
unit/round records. Each record retains its operation id, resolving Host uid and
virtual rehearsal timestamp as private audit evidence. The control payload
carries one current unit id, round, typed completion/score/rank value and the
reviewed outcome revision. New rounds are contiguous and require every current
unit in the prior round; corrections replace one record, rank values are unique
within a round and bounded by the current unit count. `outcomeReview` removes
Host identity and operation ids while projecting milliseconds, current unit ids
and the revision. Source-event setup freezes the live format primitive; setup
changes and reset delete prior outcome state. This rehearsal state cannot write
the live `eventSuccessUnitOutcomes` or `eventSuccessStandings` collections.
The native setup parser retains the optional `unitOutcome` value through setup
edits, applies the backend's legacy pods/rotations completion fallback when it
is absent, and rejects an `outcomeReview` whose primitive differs from that
frozen setup.

Optional `eventRehearsals.revealControl` stores a rehearsal-only revision,
idle/counting/revealed status, published and pending round, virtual countdown
start, bounded countdown duration and the last decision identity. Its Host
command mirrors the canonical `controlReveal` actions and expected live revision
without accepting a practice operator. Virtual-clock advancement settles an
elapsed countdown without incrementing the reveal revision; the parent control
transaction persists that settlement, advances the existing reveal moment and
reevaluates synthetic automation atomically. `revealReview` omits the decision
identity and converts the virtual timestamp to milliseconds. Reset and setup
changes delete the state. No live event-success plan, publication or match is
read or written.

Optional `eventRehearsals.allocationState` stores the published synthetic
allocation revision and at most 100 Host-only proposals. A proposal carries the
canonical attendee ids, target unit and expected allocation revision plus its
practice operation and virtual timestamp. Publication names that proposal and a
stable decision id. It rechecks current roster membership, attendance
eligibility, opt-out state, four-person synthetic unit capacity and bilateral
keep-apart constraints before changing only the selected practice actors'
`layoutUnitId`. Publishing advances the allocation revision, marks competing
proposals from the prior revision stale, clears observed placement and moves the
selected guests to the existing assignment moment. The Host review removes the
proposer and operation identities while exposing current assignments and
proposal status. Setup changes and reset delete the state. No live assignment,
draft, event attendee or event-success plan is read or written.

Optional `eventRehearsals.rosterReconciliation` is the committed synthetic
roster source for one setup generation. Creation, setup changes and reset build
one imported row for every deterministic actor; the roster/capacity scenario
also retains one duplicate and one failed row, while ambiguous-claim scenarios
retain one unresolved ambiguous row. The manager command names the exact source
id and setup-bound source revision. Reconciliation marks that source reviewed,
advances its own revision and records private operation/Host evidence without
changing actors or reclassifying unresolved rows. `rosterReview` exposes every
row and bounded outcome counts, omitting Host and operation identities. Legacy
sessions without a committed source fail closed until reset. No live import,
attendee or event roster is read or written.

The Dart rehearsal boundary treats each of these optional reviews as an exact
projection rather than an untyped map. Parsing rejects unknown fields, duplicate
identities, actor/assignment drift, changed unit scope and inconsistent status
metadata. Required-data, outcome, reveal, allocation and roster mutations are
immutable reviewed commands built through the generated control callable DTO.
Their result checks bind session, organizer, setup generation, runtime receipt
and the operation-specific next state, while allowing an exact retry to return
a newer current projection. The exact older private required-data state shape is
treated as non-actionable legacy input; it never supplies a synthetic source
hash or mutation authority.

Movement controls carry their own closed group command with the parent setup and
runtime revisions; action receipts use `actorId: null`. The departure freezes its
source hash, destination, explicit roster selection and optional current-manager
reporting request. Checkpoint corrections change only the report and bind the
immutable departure hash plus original visit evidence. Read queries bind session,
clock and group, order by progress revision, and use a 26-record lookahead for
25-result pages. An explicitly selected older revision does not become current
progress. Reset and expiry delete movement children with the other practice state.

The movement command's `resolveAccountability` arm additionally pins checkpoint,
original departure revision, attendee and expected accountability revision. Its
source hash comes from that checkpoint's optional `accountabilityReviews`, with one
row per original member. Missing legacy rows do not grant capability. The review
verifies the original physical visit and current authority for the original group,
including after membership transfer. A fresh visit or replacement actor is explicitly
unavailable. The transaction reuses the visit-disposition reducer, writes only that
actor plus the parent session/action receipt, and leaves movement, report, membership
and attendance unchanged. The same group pending owner preserves exact retries;
replay returns current outcome evidence without reapplying the original decision.


`eventRehearsalMessages.movementBinding` contains the confirmed group ID,
progress revision and source hash, all bound into message identity. It is optional
only for historical reads; new publication derives it from saved movement. The
legacy plan confirmation/copy fields are not movement authority. Current source
and accepted membership fence delivery, guest instructions and responses. A latest
record query per selected group is bounded at one; projection rechecks the session
generation/runtime revision before using it. Pending departures feed automation
inside their parent transaction, so no intermediate unconfirmed send is possible.
Native configuration still needs to present this source-derived recipe explicitly.

A rehearsal membership's optional `assignmentRevision` records the last placement,
accepted transfer or removal; proposal-only decisions preserve it. Group-checkpoint
messages have a server-derived `membershipBinding` containing that revision, the
participation episode, group ID and source hash. The proof is bound into message
identity. Missing legacy proof or changed acceptance prevents instructions,
delivery and reply effects while preserving historical receipts. Guest projections
never expose this private proof. Exact response retries cannot reapply old effects.


### Event Success Moment Presentation Contract

`contracts/catalogs/event_success_moment_presentations.json` is the authored
cross-runtime choreography source. It exhaustively covers every attendee moment
kind and owns palette and motif ids, phase durations, tempo, idle-pulse period,
particle density, the deterministic seed rule, server-clock reference, and
ambient-bed ids. The schema generator rejects missing, duplicate, or unknown
moments and fails closed when the live-reveal ceremony loses its countdown
clock, positive phase durations, or particle field.

The generator emits typed Dart into
`lib/core/schema_contracts/generated/event_success_moment_presentations.g.dart`
and TypeScript into
`functions/src/shared/generated/eventSuccessMomentPresentations.ts`. Both
outputs implement `fnv1a32-utf8-fields-v1` over event id, moment kind, reveal
round, and server anchor, with an unambiguous byte separator. Both resolve the
same anticipation, climax, settle, and completion boundaries. Live reveal uses
the saved `structureConfig.revealCountdownSeconds`; the catalog's anticipation
duration is only the legacy-document fallback, not a hard-coded client policy.
The guest runtime may consume the ambient-bed id as choreography metadata but
must not play per-attendee web audio.

### Event Success Format Primitives

`contracts/shared/event_common.schema.json` owns the closed
`eventSuccessMatchingObjective` enum (`coverage`, `romantic`, `affinity`,
`novelty`, `balance`, and `spread`) and the optional `matchingObjective` format
primitive. The same source owns the closed `eventSuccessUnitOutcome` enum
(`none`, `completion`, `score`, and `rank`) and its optional `unitOutcome`
primitive, plus `eventSuccessAccountability` (`none`, `rollCall`, `sweep`) and
its optional `accountability` primitive. The schema generator projects those contracts into Functions, Dart,
and tool registries. Runtime resolution, including the profile-free `coverage`
default, format-bound outcome defaults, and explicit unsupported assignment
algorithms, is owned by the Event Success format resolver documented in
`docs/event_success.md`; generated contract files must not encode a separate
fallback.

### Event Success Accountability Boundary

`eventAttendees/{attendeeId}` carries optional Host-owned accountability fields:
the `returned`/`departed` resolution, the exact `checkedInAt` timestamp it was
resolved for, resolver identity, and server resolution time. A resolution is
current only when its stored check-in timestamp exactly matches the row's
current check-in. This includes Host-imported and unlinked operational guests
without synthesizing a Catch UID.

Direct attendee-row writes remain denied. The generated
`setEventSuccessAccountabilityResolution` callable request accepts one current
attendee and `returned`, `departed`, or `unresolved`; the Functions transaction
validates organizer-manager authority, event identity, current check-in, and
`accountability: sweep`. The live completion request separately carries
`accountabilityAcknowledged` so an unresolved sweep warns by default but an
explicit Host choice can still complete the event.

### Event Success Live-Control Boundary

`contracts/firestore/event_success_plans.schema.json` declares the persisted
live revision and monotonic publication cursors. Direct clients serialize only
setup-owned plan fields; `liveControlRevision`, `assignmentDraftRevision`,
`publishedRotationRoundIndex`, and `publishedRevealRoundIndex` are written by
backend live-control transactions. Legacy documents may omit these fields and
resolve to their schema defaults.

Prepared guided rotations use
`eventSuccessAssignmentDrafts/{eventId_moduleId_uid}` and the source schema
`contracts/firestore/event_success_assignment_drafts.schema.json`. Each wrapper
binds the event, organizer, attendee, module, target round, base assignment
revision, and full Host-preview assignment. Rules permit only the event Host to
read drafts and deny every direct client write. Attendee-readable
`eventSuccessAssignments` contain only slots through the rotation round
published by `publishEventSuccessRotationRound`; later precomputed slots remain
inside the Host-only draft.

Live actions, draft preparation, and rotation publication use the generated
callable request schemas under `contracts/callables/`. Every mutating request
carries an expected revision, and reveal or rotation publication also carries
explicit confirmation. The asynchronous draft trigger's bounded retry count is
deployment configuration, not a persisted plan constant.

### Event Success Presence And Late-Arrival Boundary

`contracts/firestore/event_success_presence.schema.json` owns the server-only
heartbeat record at `eventSuccessPresence/{eventId_uid}`. The document stores
event/organizer/attendee identity, runtime surface, and server timestamps; it
does not persist a presence enum. `present`, `idle`, and `likelyDeparted` are
derived from the Functions server clock and the bounded deployment policy.
Direct clients cannot read or write presence documents.

The heartbeat request/response schemas and Host summary response under
`contracts/callables/` and `contracts/callable_responses/` carry the active
policy into Flutter and web. Defaults are a 30-second heartbeat, a 90-second
present window, and a 300-second likely-departed threshold. Unmonitored
attendees remain eligible; absence of a heartbeat is not departure evidence.

`contracts/firestore/event_success_late_arrivals.schema.json` owns the
deterministic Host resolution at `eventSuccessLateArrivals/{eventId_uid}`.
`resolveEventSuccessLateArrival` carries explicit confirmation and an expected
live revision. The transaction can change only the unpublished next-round
assignment draft, increments its draft revision when changed, and records a
bounded attendee-visible reason. It never writes
`eventSuccessAssignments/{eventId_moduleId_uid}`. Rules allow only the subject
attendee or event Host to get a resolution; collection queries and direct
writes are denied.

### Event Success Conversation Graph Boundary

`contracts/firestore/event_success_conversation_graphs.schema.json` owns the
attendee-private post-event response at
`eventSuccessConversationGraphs/{eventId_uid}`. The server accepts a response
only from a checked-in attendee after the event ends, filters the unified roster
through the block boundary, and stores UID edges only in this private source.
Rules allow only the subject attendee to get the deterministic document; Hosts,
other attendees, collection queries, and every direct client write are denied.

`eventSuccessPlans.conversationGraphConsentMode` is a closed `optIn` / `optOut`
setup field. Missing and legacy values resolve to the reviewed `optIn` default,
which suggests assigned attendees without selecting them. A Host may configure
`optOut` before setup freezes; it preselects visible assigned attendees and
still lets the attendee remove any or all selections or skip the response.

The generated get/submit callable contracts expose the same roster-chip
mechanism for every format while the backend derives only the prompt from
interaction primitives. Raw edges never enter the Host projection.
`eventSuccessScorecards.conversationGraph` contains numeric counts and
exclusion totals only; no attendee identifier or name-to-name edge is present.

### Event Success Spatial Layout Boundary

`contracts/shared/event_success_layout.schema.json` owns the reusable
parametric layout shape: coarse integer-grid units with bounded capacity,
stable order, and the closed `round`, `rect`, `row`, `court`, and `zone` enum.
`contracts/firestore/organizer_event_success_layouts.schema.json` stores those
assets at `organizerEventSuccessLayouts/{organizerId_layoutId}`. Layouts are
organizer-scoped, not event-scoped, and derived coordinates are never stored.
Organizer managers may query their assets; all direct client writes are denied.

`eventSuccessPlans.layoutId` selects an asset. Assignment documents separately
store `layoutUnitId` and nullable `confirmedLayoutUnitId`; assigned position is
not evidence of Host confirmation. `affinityConstraints` and
`spatialOverrides` retain the explicit T2 `thisRound` / `pinned` consequence.
The spatial callable request/response schemas own authoring, authorized layout
fetch, destination preview, reassignment, confirmation, and release. Mutating
actions carry `expectedRevision` and share `liveControlRevision` with the T4
control path.

`contracts/catalogs/event_success_layout.json` is the cross-runtime fixture for
all five shapes and normalized grid-cell rendering. Unit proximity is a
complete Euclidean graph derived from the stored grid with no cutoff. A
`wholeGroup` structure suppresses layout projection even if a legacy plan or
assignment contains stale spatial fields.

### Organizer Saved Event Venues

`contracts/firestore/organizer_event_venues.schema.json` owns reusable meeting
places at `organizerEventVenues/{organizerId_venueId}`. Each asset contains a
team-facing label, the canonical exact `meetingLocation`, an optional default
event capacity, active/archived status, and server timestamps. Organizer
managers may query their assets directly; `upsertOrganizerEventVenue` owns all
creates, edits, archival, and restoration.

Create Event copies the selected venue's location into the event and treats its
capacity only as a suggestion when the draft capacity is empty. The resulting
event may retain `sourceVenueId` as provenance, but `meetingLocation` and
`capacityLimit` remain event-local snapshots. Moving the pin clears the source
link, and later venue edits or archival never rewrite existing events.

### Event Success Sequence Capacity Boundary

`contracts/shared/event_common.schema.json` owns the closed `topology` values
(`set`, `sequence`, `adjacency`) and the optional `resourceCapacity` object.
`concurrentUnits` is a configurable simultaneous-resource limit; null means
unconstrained. `resourceLabelId` is one of `court`, `table`, `lane`, or `board`.
`seatsPerUnit` may be non-null only for `adjacency` and does not enable the
deferred table-seating engine.

`sequence` is implemented only with `pairRotations`. The server scheduler
produces ordered, capacity-bounded rounds, explicit sit-out slots, and stable
`resourceUnitId` values on rotation slots. It consumes the same cumulative
exclusion totals used by T3 and the derived `unitProximity` graph from T5.
`adjacency`, `tableSeating`, and other sequence-algorithm combinations remain
explicitly unsupported in the exhaustive resolution table; no neighbouring
engine fallback is permitted.

### Event Success Unit Outcomes And Standings

`contracts/firestore/event_success_unit_outcomes.schema.json` owns the
server-written round facts at `eventSuccessUnitOutcomes/{eventId}`. One entry
contains exactly one of `completed`, `score`, or `rank`; duplicate units,
partial rank orders, non-sequential new rounds, and values that do not match the
saved `unitOutcome` fail closed. Outcome facts are Host-readable and never
direct-client writable.

`recordEventSuccessUnitOutcomes` is the organizer-manager-only,
App-Check-protected writer. Its generated request carries `expectedRevision`, one round
index, and a complete unit-entry set. Exact replay is idempotent before revision
checking. A correction replaces that round: score projections are recomputed
as accumulated totals, while rank projections use the latest complete ordering.
`completion` persists source facts without creating a standings projection;
`none` rejects recording.

`contracts/firestore/event_success_standings.schema.json` owns the derived
`eventSuccessStandings/{eventId}` snapshots for `score` and `rank`. Authorized
Hosts, active participants, and ready no-download runtime identities may get
the event-scoped projection; list and every direct write are denied. The
projection stores a snapshot for each recorded round so Flutter and the guest
runtime can select only the latest snapshot at or before the plan's published
reveal round. It reuses `publishedRevealRoundIndex` and the existing
server-anchored reveal state; it does not define a second ceremony or cursor.

### TypeScript Timestamp Projections

Functions code has two generated TS projections for Firestore documents. Both
come from JSON Schema; the boundary is the timestamp representation:

- **`functions/src/shared/generated/*.ts` — JSON Schema-derived.** Timestamps
  appear as serialized `{_seconds: number, _nanoseconds: number}` objects.
  Use for callable payload validation, fixtures, demo seed data, and any code
  that reads or writes the persisted JSON shape directly.
- **`functions/src/shared/generated/firestoreAdminTypes.ts` — Admin SDK
  projection.** Timestamps appear as `FirebaseFirestore.Timestamp` instances.
  Use when Functions code interacts with Admin SDK methods that return live
  Timestamp objects, for example `doc.data()` after a Firestore read.

`tool/contracts/generate_schema_contracts.mjs` emits both projections.
`tool/contracts/check_firestore_contract.mjs` cross-checks that the Admin SDK
projection has the expected fields for every collection with a
`typescriptInterface` entry.

### Public HTTP And Admin Callable Boundaries

The public `/api/join-waitlist` endpoint uses the versioned schemas under
`contracts/http/` for both member waitlist and optional Host application
payloads. The generator emits the same types into website and Functions code;
Functions validates incoming requests and every JSON response, while the
website validates response JSON before treating a submission as successful.

High-risk Admin overview, access-decision, role, safety, and marketing mutation
requests/responses use dedicated schemas under `contracts/callables/` and
`contracts/callable_responses/`. The generator emits Functions and Admin types,
and `admin/scripts/generateCallableValidators.mjs` compiles the same schema
sources into the browser runtime validator registry.

## Organizer Authority

`organizers/{organizerId}` is the canonical organization entity. `club` is an
organizer subtype, never a peer top-level entity. The required
`organizerType` enum is `club`, `community`, `individual`, `eventProducer`,
`venue`, or `brand`; no legacy `entityKind` value is read. Missing
`appVisibility` fails closed as `hidden`. The complete
mapping, rollout, parity, and recovery procedure is owned by
`docs/migrations/clubs_to_organizers.md` and
`contracts/migrations/clubs_to_organizers.json`.

New contracts use `organizerId`, `organizerTeamMemberships`,
`organizerFollows`, `organizerClaimRequests`, `organizerScheduleLocks`, and
`organizers/{organizerId}/posts`. Legacy `clubs`, `clubMemberships`,
`clubClaimRequests`, `clubScheduleLocks`, `clubId`, and club-media projections
are not local contracts, callable aliases, rule paths, or client fallbacks.
Production canonical parity completed on 2026-07-22; because the application
has not launched, the owner approved local compatibility retirement rather than
a released-client support window. Remote synthetic-data reset and deployment
remain separately authorized operations.

Public organizer website content is also owned by the canonical organizer
document. `publicPage` controls publication, indexing, canonical and legacy
paths; `publicProfile`, `publicSources`, `provenance`, `claim`, and `ownership`
provide the owner-safe projection inputs. Production Hosting exports those
fields from Firestore at build time. Repository JSON must not be used as the
editing or approval surface.

Organizer document identity and public routing are separate contracts.
`organizers/{organizerId}` uses an opaque Firestore auto-id. A client may
reserve that auto-id before uploading media, but a name or URL slug is never
accepted as the document id. `publicPage.slug` owns the human-readable route
segment, `publicPage.canonicalPath` owns the website URL, and
`publicRouteReservations` transactionally enforces route uniqueness. Renaming
or rerouting an organizer therefore does not require changing its document id
or relationship references.

### Organizer Supply Capabilities

Every canonical organizer, compatibility club projection, and published
external-event organizer snapshot carries the shared
`organizerSupplyCapabilities` contract. It is an explicit product-policy
projection, not a UI inference:

- unclaimed/programmatic supply is not bookable, payable, waitlistable, or
  host-contactable; it is claimable and becomes reviewable only after the
  event's end time;
- claimed/owner-managed supply may enable the supported capabilities, subject
  to the normal event, payment, and availability checks;
- missing or invalid capabilities fail closed.

Create, claim, draft-scaffolding, and claim-decision callables write the
projection. Existing canonical and compatibility documents were repaired with
`tool/data/backfill_organizer_supply_capabilities.mjs`: the production apply on
2026-07-27 repaired 44 organizers and 42 clubs, found no external events, and a
post-apply dry run reported 86 current documents with zero repairs or invalid
records. The migration contract is
`contracts/migrations/organizer_supply_capabilities.json`.

### Required Event Meeting Location

Every persisted `events/{eventId}` and published external event must have a
named, finite, in-range exact location. The canonical object is
`meetingLocation`; `meetingPoint`, `startingPointLat`, and `startingPointLng`
remain synchronized compatibility mirrors while released clients still use
them. They are not nullable escape hatches.

- Create requires an exact scalar pair and canonicalizes it into
  `meetingLocation`; newer clients may send the structured object directly.
- Update resolves the existing or supplied exact location and always rewrites
  the canonical object plus mirrors. It rejects a truly coordinate-less legacy
  document instead of preserving corruption.
- Dart `Event` and `ExternalEvent` keep exact coordinates nullable on reads
  until the production repair is complete. `Event.effectiveMeetingLocation`
  deterministically promotes a complete legacy pair, while coordinate-less
  records remain readable and fail closed anywhere an exact location is
  required.
- Discovery and proximity check-in fail closed when the invariant is broken;
  they never publish a null geo cell or skip the distance guard.
- `node tool/data/backfill_event_meeting_locations.mjs --env <env>` is the
  dry-run-first repair path. It never invents coordinates or mixes latitude
  and longitude from different sources.

Dev was verified clean on 2026-07-13: 146/146 events have structured exact
locations and the location-market and discovery repair tools report zero
remaining work. The production dry run found 138 deterministic repairs and 9
historical records without recoverable coordinates; production was not
mutated, and strict production rollout remains blocked on resolving those nine.

## Normal Workflow

```bash
node tool/contracts/generate_schema_contracts.mjs
node tool/contracts/generate_schema_contracts.mjs --check
node tool/contracts/validate_schema_contracts.mjs
./tool/check_data_contract.sh
```

Run Firestore and Storage rules tests through emulators unless those emulators
are already running:

```bash
firebase emulators:exec --project demo-catch-rules --only firestore,storage "npm --prefix functions run test:rules"
```

A direct `npm --prefix functions run test:rules` expects Firestore on
`127.0.0.1:8080` and Storage on `127.0.0.1:9199`. `ECONNREFUSED` is an emulator
workflow failure first, not proof the rules are wrong.

Storage rules that call Firestore have a second, live dependency which the
emulators cannot prove. Every environment's Firebase Storage service agent must
hold `roles/firebaserules.firestoreServiceAgent`; the checked preflight and
idempotent provisioner are documented in `docs/release_operations.md`. Keep
each Storage evaluation within Firebase's Firestore document-access limit.
Match chat images therefore authorize from the canonical match document, whose
`status: blocked` projection is owned by the block callable/trigger. Their
contract also requires immutable `uploaderUid` custom object metadata: only
that active-match participant may create or compensate-delete the object, and
client updates are denied. Prove this boundary with both emulator rules tests
and the authenticated live upload/delete canary.

### Host Payment Account Provider Boundary

`hostPaymentAccounts` is a user-and-provider projection owned by payment
callables. New documents use `{uid}_{provider}` ids and must carry the explicit
`provider`, generic `providerAccountId`, and provider-specific identifier
fields from `contracts/firestore/host_payment_accounts.schema.json`. The
provider enum is currently `razorpay | stripe`. Legacy Stripe documents at
`{uid}` remain readable and refreshable; new Stripe and Razorpay writes use the
provider-scoped ids so one host can retain both accounts without overwriting
either state.

Razorpay Route setup accepts legal-business, stakeholder, PAN, and bank details
through the callable payload contract. Those values are transient provider
inputs and must never be written to Catch Firestore or logs. The persisted
projection contains only Razorpay linked-account/product ids, normalized
activation state, and bounded requirements. Each provider-created id is
checkpointed before later provider calls so an exact retry resumes the same
linked account or product.

The Flutter repository returns a list of provider accounts. Country-based
recommendation is presentation policy only: India recommends Razorpay and
other countries recommend Stripe, while both setup paths remain available.
Checkout routing and eventual settlement remain server-authoritative and must
not infer readiness from the recommendation badge alone.

### Native Payment and Refund Authority

Native Razorpay ownership uses server-authored provider order notes
`catchBookingProject` and `catchBookingSchema: "1"`, derived from the trusted
runtime project. New pending orders, native payments and cancellation refund
intents retain optional `razorpayOwnership: {projectId, schema: "1"}` context.
The context is frozen independently of the existing version-1 refund fingerprint
and idempotency keys. Stripe authority and client payload/response shapes remain
unchanged. Optionality preserves historical document readability; it does not
establish ownership of an unmarked legacy order.

Provider notes are mutable and rely on trusted merchant credential custody.
Fetched order context must match the current runtime and frozen local evidence
before admission, refund intent staging or tracking cleanup. An explicit foreign,
partial, unsupported or conflicting marker never falls back to matching local
IDs. Bare local payment/pending/refund records may have been copied between
projects and are not an independent legacy witness. Unknown unmarked history
requires audited reconciliation; the runtime must not adopt or backfill it.

A foreign or unknown webhook performs zero local writes/deletes and no refund.
The native refund worker likewise validates ownership and provider context before
lease, attempt, review or retry writes, and rebinds the reread payment/intent
inside its claim transaction. Foreign or unknown persisted intent remains intact.
The dormant pending-order reconciler resolves the fetched provider marker
against frozen pending context before listing payments, expiring tracking state,
or fulfilling a booking; foreign, unknown, invalid or conflicting ownership is
skipped without order, payment, or booking mutation. Its project-bound durable
discovery cursor advances before provider I/O and wraps after the tail, so a
bounded page of quarantined or temporarily unavailable orders cannot starve
later owned work and every skipped row becomes eligible again after wrap.
Razorpay dispatch independently reclassifies the fetched order before POST;
separate webhook signing secrets do not establish environment ownership.
Exact owned terminal replay cannot re-admit, recreate refund intent, or interpret
refunded provider truth as a new captured booking. Existing strict payment truth
checks still apply to a nonterminal new admission. A completed payment carrying
any cancellation refund intent is no longer a successful checkout replay: the
webhook may acknowledge it without re-admission, while the callable reports the
existing cancellation/refund outcome instead of returning verified success.

Native captured checkout commits its payment and admission in the same
transaction. A second payment cannot claim an existing seat; a retried completed
payment cannot re-admit a cancelled participation. Rejected bookings persist a
full `bookingFailed` refund intent under the same payment/participation fence
before provider I/O. Their legacy status remains `refundFailed` while the intent
is pending or needs review, and only observed full return sets `refunded`.
The payment trigger and existing due queue recover these intents. Historical
failed-booking records without an intent require reconciliation because an old
provider request may have succeeded without a saved acknowledgement.

Native checkout payments retain a server-owned `cancellationRefund` intent on
`payments/{paymentId}`. Guest cancellation saves the quoted cash amount in the
same transaction as admission release. Replays resume that amount rather than
recomputing the deadline. A later host cancellation may raise it to the original
charge amount while preserving an in-flight attempt. The payment fingerprint
binds buyer, event, original provider/charge/order, currency and Stripe destination
account/application fee; current organizer routing cannot change that authority.

Each attempt persists its exact amount, provider idempotency key, provider refund
id when known, and lease. Only observed processed refunds count toward
`confirmedAmountMinor`; a partial refund leaves the payment status `completed`,
and only full confirmed return sets `refunded`. Revenue consumers must subtract
confirmed cancellation refunds. Provider failure, required customer action or
inconsistent authority stays explicit as `reviewRequired`; request acceptance
alone never means money returned. Unknown Stripe POST outcomes older than 23
hours require reconciliation instead of reusing a potentially expired key.
Native Razorpay refunds use the original platform account and supported INR
amounts; unsupported currency/sub-minimum refunds require review. Stripe native
destination refunds reverse the original transfer and proportionate application
fee when present. Historical refunded records without amount evidence are not
assumed to prove a partial or full refund. Immediately before Razorpay refund
dispatch or observation, fresh provider cumulative-refund truth must equal the
locally confirmed total or that total plus the single unresolved same-key
attempt that was already persisted at preflight. A newly claimed first attempt
cannot explain intervening provider drift. Any other delta requires
reconciliation before provider work.

The cancelled-event trigger stages eligible Stripe payments in bounded pages;
a payment trigger covers captures observed after cancellation. The
unsecret-bound event path never stages Razorpay. The existing secret-bound recovery
scheduler advances `nativeRefundRecoveryCursors/cancelledRazorpayPayments` and
fetches fresh provider-order ownership before any Razorpay refund-intent write.
A bounded oldest-due queue retries pending intents without a payment-age cutoff.
It advances the server-only, project-bound
`nativeRefundRecoveryCursors/pendingRefunds` cursor before provider work and
wraps after a short page, so foreign, unknown, unavailable, or malformed oldest
rows cannot starve later owned Razorpay or Stripe work across invocations.
Cursor revision compare-and-set rejects stale concurrent progress, and malformed
or foreign cursor authority stops before payment discovery. Due-order cursor
keys use canonical tagged strings so fractional and non-finite Firestore numbers
can advance without allowing raw non-finite values into the persisted schema;
raw integer values retain exact signed-int64 decimals and resume as bigint rather
than passing through JavaScript's lossy number range;
payment document IDs up to Firestore's 1,500-byte limit remain representable. Guest/provider
failure does not roll back the already committed cancellation. Existing historical
cancelled events with no refund intent require reviewed reconciliation before
activation; the trigger does not invent historical guest refund terms.

## Contract Architecture

JSON Schema draft-07 is the canonical persisted-shape format. Ajv validates
schemas in Functions/tooling, generated Dart constants support Flutter tests and
selected production validation, and Firestore rules remain behavioral security
checks rather than a generated JSON Schema runtime.

The contract layer owns:

- collection ids and storage paths;
- full document shapes and patch/input payloads;
- enum values and scalar limits;
- field optionality/nullability;
- prompt/catalog ids and limits;
- ownership metadata such as client-writable, callable-owned, trigger-owned,
  server-only, and read-only projection (see "Field Ownership Tags" below);
- migration metadata for path/storage renames;
- valid and invalid fixtures.

### Progressive Event Setup Contracts

The progressive wizard uses `createPrivateEventSetup`,
`updatePrivateEventBasics`, `getPrivateEventSetup`, and
`listPrivateEventSetups` payload contracts. The manager inventory defaults to
upcoming active events and accepts explicit `past` or `cancelled` scopes. History
is ordered newest first; pages are bounded to 50 and cursors bind the organizer,
scope, first-page clock and timestamp/document-ID position for at most 24 hours.
History reopens in a read-only Host view and never expands offer eligibility.
`updatePrivateEventDetails` adds or clears duration, venue and format on the
same private event, with setup revision, reviewed defaults hash and durable
request identity. Duration and saved venue can inherit reviewed organizer
defaults. A named venue does not invent coordinates; hosts can instead use the existing
map picker to save a canonical named meeting location. Its coordinates and
legacy mirrors are persisted together; replacing a saved venue clears its
source-venue reference. Name-only replacement clears stale map fields. Neither save publishes the event nor admits a guest.
Description and distance/pace for distance-based activities are explicit details.
Non-distance format selection writes the existing compatibility values (0/easy),
which readers hide for those formats. Capacity, price/currency and cash-refund
policy are saved together; credits remain deferred. The update preserves existing
admission restrictions and never changes offer payment snapshots. An empty,
ordinary private event receives matching ready seat ledger and fence records in
that transaction, only after counters and bounded queries show no guest, payment,
identity, import or migration history. Demo-owned events are excluded because
seed tooling has legacy seat writers. Existing reserved places or checkout holds
block changed terms; historical sources require seat reconciliation.
`reconcilePrivateEventSeats` accepts the same exact journaled admission-settings
command with no other detail fields. Each request advances at most three bounded
pages; current manager, account deletion and event ownership are rechecked in
all transactions. Explicit missing terms remain staged until the verified roster,
ready ledger/fence and ordinary details receipt commit together. Configured terms,
guests and issued offers remain unchanged. Cleanup resumes even after the final
receipt exists. Setup edits and publication wait while the migration fence is
locked. An initial stale review can release the client journal only with the exact
server no-commit marker; interrupted or started runs retain the original command.
The Host automatically advances a bounded number of requests and then offers
Continue checking guests. An explicit discard is journaled before sending and
bounded-cleans only scan/plan sources with no frozen plan or applied output. A
`details` receipt with `outcome: discarded` and `expectedSetupRevision` (never an
`appliedRevision`) commits before the lock is released; delayed original saves
cannot revive it. If output application already began, the exact typed denial
restores the original save intent. A previously committed change returns its
saved receipt and finishes cleanup. No existing guest or offer is removed.
Reopening retains the command. Both privacy and seat-writer production gates stay closed pending rollout and Cross Paths integration.
The manager read includes `eventDetails` for reopening those actual values;
event preferences remain separate recommendations. Hosts can add or edit venue
and duration after creating offers or importing a roster. Changing format still
requires an uncommitted event because it can change guest/rotation expectations;
saving an unchanged format does not block later detail completion. None of these
writes changes existing offer payment snapshots or guest admission state.
Create/edit accept explicit city and timezone decisions, a stable request ID,
and a reviewed defaults hash when inheriting organizer values. Edit also
requires the current setup revision. Unknown authority fields are rejected.

`setEventPublication` is the separate revision-fenced visibility command for
progressive events. Publishing validates the complete rich event contract,
future active schedule, current manager and visible organizer, rebuilds discovery
fields and claims the organizer schedule in the same transaction as the receipt.
Unpublishing closes registration and advances its revision; republishing leaves
registration closed. Neither transition rewrites origin, guests, offers or money.
The first-publication timestamp survives unpublishing, preventing old schedule
commitments from becoming an editable new draft. Receipts report the original
transition on replay and never repeat it after a later transition. Search and
organizer next-event projections retry from canonical state. Static website
exports require removal/redeployment as a separate release step; a successful
publication receipt is not proof that cached public copies have disappeared.
The command remains behind the same private-persistence rollout gate.

The manager read response is a whitelist projection with civil date/time,
resolved city/timezone, revision and setup provenance. It does not parse a
minimal event through the rich Event model or invent venue, end time, capacity
or price. Its event-local preferences are read from manager-only storage. Organizer management and deleted-user
checks occur in the same transaction as the current event read. Valid published
progressive events can reopen this projection for visibility management; basics
and detail edits remain unavailable there. The manager projection includes
publication readiness derived from the same candidate contract used by publish.
Readiness is advisory: commit rechecks the current schedule, revision and authority.
Host journals the exact publication request before sending it. An uncertain
result retries that request; only an exact server rejection proving that the
request did not commit can discard it. A replayed receipt is followed by a fresh
read, so an older publish receipt cannot overwrite a later unpublish in the UI.
Rich edits use the published editor. Progressive events require the loaded
`expectedSetupRevision`; successful edits increment it and preserve the stored
IANA timezone while deriving matching local date/time for schedule changes.
Unchanged schedule/policy values in a complete form save do not count as a
reschedule or policy change. Actual changes retain guest/offer/seat fences;
private drafts cannot use this rich edit path. Published progressive events also
use the shared cancellation/refund lifecycle and invalidate older setup edits.
A retry after an uncertain rich edit must reload current state rather than
blindly repeat a stale revision.

The private event picker reads at most 51 event documents for a 50-row page,
with composite indexes on organizer, private publication state, status,
start time and document ID. Upcoming pages ascend; past and cancelled history
pages descend. Its cursor keeps the first page's time cutoff and
expires after 24 hours; every page rechecks current manager and deleted-account
authority. It cannot expose private payment settings. Basic date/city edits
check roster, import, participation, waitlist, offer and payment commitments
inside the same transaction before changing the canonical event.
The single-event read exposes `canEditBasics` using those same commitment reads,
and `canChangeCity` is false while a venue snapshot exists. Adding details alone
does not freeze uncommitted basics: moving the start preserves configured
duration and the venue/format snapshot. Clear the venue through Details before
changing city. A dependent event plan or guest/offer/payment history still blocks
basics edits. These UI affordances never replace the transaction's final checks.

The source privacy cutover now constrains consumer discovery, organizer
published-event timelines, recommendations, saved events and participation
lookups to `publicationState == published` before rich decoding or pagination.
Matching composite indexes are checked by the query-index parity scanner.
The `/events` list rule requires the same publication constraint even for
organizer managers; private inventory uses the separate authorized callable.
Unrestricted, organizer-only and private-state list queries are denied.

**This source cutover is not deployed or activated.** The previously deployed
compatibility rule permitted unrestricted lists. No private event document may
be stored in `/events` while that rule remains deployed. Production private
create/mutate callables and the Host entry retain their immutable closed gates.
Before deploying this source, reconcile every legacy event, complete the
publication backfill, deploy and verify indexes, and release compatible clients.
The required role-scoped Remote Config build minimum must use the actual
released build numbers. It is not a privacy barrier: old clients can start
offline or use bundled nonblocking defaults when the fetch fails. Restrictive
rules must be live and tested before either private-setup gate is enabled.
Individual legacy document reads remain compatible only when neither
`publicationState` nor `setupRevision` exists.
Direct private event reads require a current organizer manager or active viewRoster
staff grant; deleted users, foreign tenants and expired/revoked staff grants
are denied. Consumer bookmarks cannot target private events.

`node tool/data/backfill_event_publication.mjs --project <id>` plans the legacy
publication migration without writes. It validates complete legacy documents,
rejects contradictory organizer identities and unlabelled progressive records,
and scans bounded document-ID pages. Apply requires the reviewed plan digest and
an explicit production flag for the production project. Each transaction
rechecks the exact source update time and changes only publicationState; an
interrupted or stale run requires a fresh reviewed plan. Existing private events,
booking capabilities, provenance, counters and cancellation status are preserved.
Before switching public readers/rules, deploy explicit publication writers and
require a complete final dry run with zero legacy candidates and zero blockers.

These contracts and services are not rollout authorization. Private persistence
remains disabled until the explicit legacy publication backfill, all public
readers/search projections and integrated privacy checks are complete.

The offer picker uses `listOfferEventTargets` for both private and already
published owned events, including valid rich legacy events. The bounded index
uses canonical `clubId`, status, start time and document ID; contradictory
organizer ownership fails. This list exposes no payment settings.
`getEventOfferConfiguration` separately reads manager-only current terms for
the selected event and suggests expiry from the server clock and event policy.
The read includes the private preference revision and resolved intent provenance
so editing preserves inherit/set/clear decisions. Missing configuration remains
null with revision zero, never an invented free price or expiry.
`previewEventOfferPreferences` authorizes the same manager and resolves the
complete candidate against the event, saved preferences and organizer defaults
in one read-only transaction. Its before/after projection includes inherited
admission preferences that are absent from the organizer suggestion DTO. The
shared private/published editor stages edits, previews all changed fields, and
requires explicit Apply. Reload or later edits invalidate review. Each original
write command still verifies its own event/setup revision, preferences revision
and reviewed defaults hash; preview grants no write authority. Issued offers and
shared payment links retain their original terms and require separate review.
New editor requests carry the captured manager UID; a changed authenticated UID
cannot execute that command. Private editor auth changes invalidate its review.
A request-scoped stale-rejection marker is emitted only after receipt absence and
failed revision/default validation; the client may retire that exact command and
reload. Generic aborts, permissions failures and uncertain transport outcomes
retain their frozen journal for recovery.

`configureEventOfferPreferences` writes the same private preferences for owned
published, legacy or private events. The transaction rechecks manager/deleted-user
authority, event source revision, preference revision and reviewed organizer
defaults. Its actor-scoped request receipt returns the original revision after a
lost response; changed requests cannot reuse that identity. Events and issued
offer snapshots are never rewritten. Clients cannot read or write the receipt
collection directly.
Offer preview and commit recheck these facts rather than trusting a picker row.

### Functions Runtime Schema Modules

The schema generator emits independent runtime modules under
`functions/src/shared/generated/schemas/`, `validators/`, and `catalogs/`.
Callable module names use `Input` and `Output` suffixes; exported schema,
validator and TypeScript type names retain their contract-owned identities.
Each validator imports its own schema and the small shared
`schemaValidationRuntime.ts` engine. The engine owns Ajv options, formats,
lazy per-schema compilation, caching, and error messages.

Production Functions import these modules directly. `schemaRegistry.ts` and
`schemaValidators.ts` are aggregate inventories for tests and tools, and must
not be imported or re-exported by runtime modules. Admin SDK projections in
`firestoreAdminTypes.ts` are compile-time types and consumers use explicit
`import type` or `export type`. The schema/type boundary check enforces these
rules; fixture and lazy-loading tests verify unchanged data validation.
The generator removes orphaned runtime module outputs during regeneration and
reports them as stale in `--check` mode.

The deployment dependency graph excludes whole-declaration type-only edges,
which TypeScript erases. Shared runtime/schema changes still select every real
consumer. The Functions codebase and package remain the deployment artifact
boundary; this module split enables narrower explicit targets, not separate
Firebase packages.

### Event Field Ownership And Optionality

Host guest notes use `eventFormat.activityDetails.publicDetails.accessibility`
and `.included`, optional strings bounded to 2000 characters by the shared
format contract. The Host editors trim authored values and omit blank notes;
editing or clearing a note preserves other public details and operational
format settings. These notes survive local drafts and repeat prefills. Private
setup uses the existing revision-checked format update and format lock. The
website projects only explicitly allowlisted guest notes and hides absent rows.

The event document is a lifecycle union, not a form specification. A private
first save requires identity and a civil schedule; publication additionally
requires a usable venue, duration, format and admission terms. A field omitted
from the root `required` array can still be required by the published branch.
Conversely, a required compatibility string such as `description` may be empty.
Optional server metadata does not imply a new user input or a guest-facing row.

This classification covers all top-level properties in `events.schema.json`.
The complete create wizard and private setup are two entry points to the same
values. Private setup supports saving incomplete events; the complete wizard
requires publication-ready scheduling and admission values at creation.

| Fields | Ownership / requirement | Entry point and detail behavior |
|---|---|---|
| `name` | Host; required for new events (legacy records may omit) | Event name; detail uses authored name, legacy title fallback only for old records. |
| `clubId`, `organizerId` | Required organizer context | Organizer selection/route; resolved organizer identity, never raw ID inputs. |
| `startTime` | Required schedule | Date/time; private flow resolves civil input through chosen timezone. Detail uses stored timezone when present; legacy records retain their existing clock interpretation. |
| `endTime` | Required before publication | Duration/end time; private draft can clear it. No rich guest page for incomplete private records. |
| `eventCityId`, `eventMarketId`, `eventLocalDate`, `eventLocalStartTime`, `eventTimezone` | Required progressive schedule context | City/timezone/date/time controls; market and instant derived. These progressive fields are not retroactively required on legacy events. |
| `meetingPoint`, `meetingLocation`, `startingPointLat`, `startingPointLng` | Exact venue required before publication; compatibility mirrors derived | Map/place picker supplies canonical name and coordinates; private setup may hold a name-only draft. Detail/map show resolved venue. |
| `sourceVenueId` | Optional saved-place provenance | Inherit saved venue; replaced custom location clears provenance. Host-only, no ID field on guest page. |
| `locationDetails` | Optional nullable directions mirror | Optional directions; blank becomes null. Detail/map omit absent notes. |
| `description` | Optional authored content; rich document requires a string | Both editors allow blank. Publication materializes omitted description as `''`; detail omits The Plan when blank instead of inventing authored copy. |
| `eventPhotos`, `photoUrl` | Optional media; cover URL derived from ordered photos | Add/remove/reorder in both flows; empty list clears cover. Detail renders every supplied photo, no empty photo slots; first ordered photo is cover. Legacy `photoUrl` still works. |
| `itinerary` | Optional ordered run of show | Shared editor in both flows; empty list clears. Detail omits empty itinerary and conditionally shows item metadata. |
| `eventFormat` | Required before publication; preset with optional customization | Activity/interaction choices; optional custom label and route editor. Detail shows actual format and applicable route expectations. |
| `distanceKm`, `pace` | Required for distance formats; compatibility defaults otherwise | Distance/pace controls only for distance activities. Non-distance compatibility `0/easy` must never become a skill/intensity/energy claim. |
| `capacityLimit`, `priceInPaise`, `currency` | Required admission terms; currency contextual default | Capacity/price controls and market currency; detail shows availability and price. Private terms save together under seat reconciliation. |
| `constraints`, `eventPolicy` | Policy defaults with optional overrides | Existing admission, waitlist, pricing, eligibility and cancellation controls/presets; detail explains effective policy. Advanced preset-managed values are not arbitrary free-form inputs. |
| `eventOrigin`, `runtimeAccess` | Origin/access decision and derived runtime rules | Catch/external origin and external roster/source controls in full flow; private flow preserves its gated lifecycle. Source URL/ID are operational provenance, not guest marketing links. |
| `status`, `cancelledAt`, `cancellationReason` | Lifecycle command; optional nullable reason/time | Cancellation flow, not create form. Cancellation reason appears only on a cancelled event when nonblank. |
| `publicationState`, `publicRegistrationEnabled`, `publicRegistrationMode` | Separate lifecycle decisions | Visibility/registration actions, never inferred from content completion or price. Guest entry points obey effective state. |
| `setupDefaults` | Derived provenance of accepted defaults | Explicit inherit choices; never edit raw source hashes or revisions. |
| `setupRevision`, `publicRegistrationRevision`, `planChangeRevision`, `firstPublishedAt`, `createdAt`, `updatedAt` | Server-owned history/concurrency | No input; used by commands and relevant management status. |
| `bookedCount`, `checkedInCount`, `waitlistedCount`, `genderCounts`, `cohortCounts`, `waitlistedCohortCounts` | Server-maintained aggregates | Render appropriate capacity/attendance information; never editable create fields. |
| `crossPathsPairHeldCount`, `crossPathsPairConfirmedCount`, `crossPathsPairHeldCohortCounts`, `crossPathsDiscoveryEnabled` | Matching/discovery projections | Server-owned; no ordinary event input or raw guest display. |
| `discoveryMarketId`, `discoveryCityName`, `discoveryActivityKind`, `discoveryGeoCell`, `discoveryHasOpenSpots`, `discoveryAvailability`, `discoveryOpenCohorts`, `discoveryWaitlistCohorts`, `discoveryInviteRequired`, `discoveryMembershipRequired`, `discoveryManualApprovalRequired`, `discoveryMinAge`, `discoveryMaxAge`, `adminSearch` | Derived search projections | Rebuilt from canonical fields; render canonical city/format/availability/policy, not projection duplicates. |
| `synthetic`, `seedPrefix`, `scenario`, `demoOps`, `demoOpsId`, `demoOpsCommand` | Seed/demo tooling | No production form controls or ordinary guest rows. |

Nested content follows the same classification:

| Nested values | Entry / omission rule |
|---|---|
| `meetingLocation.name/latitude/longitude` | Required when a location exists; picker supplies coordinates. `address`, `placeId`, `notes` are optional. Address/notes render only when supplied; place ID is provider metadata. |
| `itinerary[].id/kind/offsetMinutes/title` | Item ID generated; kind, relative start and title authored. Removing the item clears all its values. |
| `itinerary[].durationMinutes/description/location/routeDistanceMeters` | Optional editor fields; omit absent detail. Route distance requires a concrete route path. Editing another item field preserves it; removing the path clears dependent distances. Location is an optional place selection. |
| `eventFormat.version/activityKind/interactionModel` | Version generated; activity and interaction chosen or preset. |
| `eventFormat.customActivityLabel` | Optional, blank omitted; if present 1–80 characters. Default activity label renders when absent. |
| `eventFormat.defaultPlaybookId/defaultModuleIds/eventSuccessPrimitives` | Preset/Event Success workflow configuration; no raw identifiers or JSON inputs in create/detail. |
| `eventFormat.activityDetails.routePlan` | Optional even for route presets; shared toggle adds/removes it. Movement, shape, group strategy, stop cadence/kinds have explicit controls and guest summary. |
| `routePlan.path` | Optional path builder; absent path produces no route polyline. |
| `routePlan.paceGroups` | Optional pace-group choices; guest labels/targets shown only when supplied. IDs/order generated; current choices set target presets. |
| `routePlan.roleKinds/liveTrackingPolicy` | Host operations controls. Tracking defaults (staleness/retention) remain policy-owned; no guest location-sharing claim inferred. |
| `eventPhotos[].id/storagePath/position/createdAt/updatedAt/thumbnailUrl/thumbnailStoragePath/moderation` | Upload/order pipeline metadata. Only photo selection/order is authored; no metadata form inputs. Optional thumbnails fall back to original image. |
| `constraints.minAge/maxAge/maxMen/maxWomen` | Optional eligibility/cap overrides; unset means effective defaults, no empty requirement rows. |
| `eventPolicy.admission/pricing/cancellation/settlement` | Preset-backed effective behavior, with existing controls for supported overrides. Cohort IDs, revision versions, pricing adjustments, waitlist windows, settlement and provider values remain policy-owned unless a dedicated editor exposes them. Detail renders policy meaning, never raw configuration keys. |
| `eventOrigin.mode/bookingAuthority/rosterAuthority/provider/externalEventId/externalEventUrl/sourceExternalEventId/adapterVersion/connectedAt/connectedBy` and `runtimeAccess.enabled/publicRuntimeId/walkInPolicy/termsVersion` | External-origin/roster workflow or server ownership. Optional operational values can be skipped; absence does not create guest content. |

Local create drafts also preserve an explicit route opt-out (`routePlanEnabled`);
legacy drafts without that decision retain their preset fallback. Route paths
and pace groups can be cleared independently of keeping the route plan.

Private content patches distinguish omission (leave unchanged) from empty arrays
(clear itinerary/photos). Venue/format/duration use existing set/clear/inherit
intents. Media upload precedes the journaled attachment command; an uncertain
attachment must retain its media so an exact retry cannot reference deleted
objects. Route/format changes retain commitment checks. Publication rechecks the
same itinerary/path/schedule rules as full creation. Deploy the expanded private
request/response contract with the corresponding app reader before enabling this
gated flow; older strict readers reject added response properties.

### Optional, Nullable, And Patch Fields

Default DTO, view-model, and document fields to plain nullable values when
absence and explicit `null` have the same product meaning. Use required
nullable parameters only when the caller must explicitly confirm that the field
was considered, and prefer avoiding that shape unless it materially improves the
API contract.

Use sentinel-backed parameters only for patch/copy APIs where "leave unchanged"
must be distinguishable from "clear this nullable field." Generated patch
classes use `unsetSentinel` from `lib/core/sentinels.dart` and compare it with
`identical`; callers should pass `null` only when the persisted value should be
cleared. Do not add new ad hoc sentinels outside patch/copy semantics without
first documenting the same clear-versus-omit distinction.

### Field Ownership Tags

Per-field ownership lives next to the property in the Firestore schema as
`x-catch-ownership`. Valid values: `client-writable`, `client-runtime-writable`,
`callable-owned`, `trigger-owned`, `server-only`. Properties without a tag are
unclassified — typically content fields that flow through a callable without
the callable owning their lifecycle.

```json
"hostUserId": {
  "$ref": "../shared/event_common.schema.json#/definitions/documentId",
  "x-catch-ownership": "callable-owned"
}
```

`tool/contracts/firestore_contract.json` deliberately does NOT carry
per-collection field-group arrays (`clientWritableFields`, etc.). Those are
derived from `x-catch-ownership` and validated by
`tool/contracts/check_firestore_contract.mjs`. The contract file still owns
collection-level ownership metadata (paths, rules-match strings, operations,
exported function names, migration notes).

It does not own multi-document business behavior, ranking algorithms,
notification fan-out, dynamic Auth/current-time checks, or full Firestore rules.
Those stay in Functions, repositories, rules, and domain services, consuming
generated constants/validators where useful.

### Generated event domain projections

`tool/contracts/generate_domain_classes.mjs` owns the Dart declarations for
`Event`, `EventOrigin`, `EventRuntimeAccess`, `EventMeetingLocation`, and
`EventItineraryItem`. The Event projection combines root requirements with the
published/legacy schema branch. Private drafts continue to use their private
setup response model; they are not decoded as a published Event. Projection
specs retain explicit compatibility defaults, legacy nullable coordinate/counter
mirrors, timestamp conversions, and the organizerId/clubId read fallback.
Derived behavior lives in companion extensions. New persisted fields still need
an explicit projection decision; generation does not expose every server field.

The private-details command adapter retains set/clear/inherit intent and exact
retry serialization. Scalar bounds come from generated field constraints, shared
itinerary/location validation owns nested checks, and cross-field rules remain
explicit. These presentation-neutral field constraints describe non-null input
values, not the complete JSON Schema; optional typed values are skipped by the
adapter, and server schema validation remains authoritative. Blank duration and
venue inputs produce clear commands rather than invalid set values.

### Generated Dart Callable Request DTOs

`tool/contracts/generate_schema_contracts.mjs` emits typed Dart classes for
every callable payload schema (and the `update_user_profile` patch) into
`lib/core/schema_contracts/generated/callable_request_dtos.g.dart`. Each class
has a named-parameter constructor, typed fields, and a `toJson()` that the
existing `test/core/callable_dto_contracts_test.dart` validates against the
source schema. Generated patch helpers expose `toFieldsJson()` for repository
tests and `toCallableJson()` for the actual callable payload wrapper.

Feature-level `lib/**/data/*_callable_dtos.dart` files remain only when they
own hand-written response parsers, normalization, or other behavior. Pure
re-export barrels should be deleted; callers can import generated request DTOs
directly from `callable_request_dtos.g.dart` with explicit `show` lists.
Hand-written DTO classes remain in feature files only when the JSON Schema
cannot capture the behavior — specifically:

- domain → DTO adapter factories (`CreateEventCallableRequest.fromEvent(Event)`)
  that walk a domain model and convert `DateTime` → `int millis`;
- serialization-time normalization that the generated class does not yet own
  (`EventBookingCallableRequest` and `CreateRazorpayOrderCallableRequest` trim
  `inviteCode` even though dedicated payload schemas exist);
- serialization-time shape transforms (e.g.
  `PlacesAutocompleteCallableRequest` flattens a `LocationCoordinate? bias`
  into top-level `latitude`/`longitude`);
- response decoders (`*CallableResponse` with `fromCallableData` factories)
  and feature-local exceptions.

See backlog item `CONTRACT-DART-GEN-001` for the path to migrating the
remaining cases (custom normalization, generated adapters, and response
decoders).

### Field Constraint Projection

The schema generator also emits
`lib/core/schema_contracts/generated/field_constraints.g.dart`. It projects
UI-relevant requiredness, value and item types, string length, format, pattern,
enum values, collection bounds, uniqueness, numeric bounds, and `multipleOf`
steps from every registered schema into typed
`CatchContractFieldConstraints` constants. The projection includes persisted
documents, callable payloads, and `contracts/forms/mobile_form_state.schema.json`
for editable presentation values that are deterministically transformed before
they are stored.

The presentation-neutral `CatchContractFieldConstraints` value type and
`CatchContractFieldPolicy` live in `packages/catch_ui/lib/src/components/`.
The generated app file imports that shared type and owns the concrete schema
paths, values, and `CatchContractConstraints` lookup. The shared UI package
does not import the generated app constants or the schema generator.

`CatchContractFieldPolicy` applies those constants at runtime. Text controls
derive validators, counters, and length formatters; choices filter values
through an explicit typed-to-wire serializer; steppers and range sliders derive
bounds and steps. Explicit UI values may narrow a contract for product policy
but cannot relax it. Composite controls bind each independently stored endpoint.

Every editable canonical control and descriptor instance under production
`lib/` is covered by the source scanner. Its optional report is generated at
`build/reports/flutter_form_contract_inventory.json`. The scanner
recognizes `CatchField`, `CatchChipField`, selectable chips, option groups/cards,
range sliders, toggles, OTP entry, direct and top-bar search fields,
`CatchForm*Row`, and the retained self-profile descriptors. It fails when a
control lacks its generated contract, a typed choice lacks its serializer, a
range lacks either endpoint, or an exemption is not explicit. The current two
exemptions are disclosure-only Host analytics controls, not editable form
values.

Run the exhaustive gate with:

```sh
node tool/run.mjs check contracts:flutter-form-inventory
```

`test/core/forms/contract_alignment_test.dart` additionally walks the
consumer-profile and host-club descriptor factories and contains a seeded
over-limit probe, so contradictory limits remain detectable. Run it through
`node tool/run.mjs check contracts:form-alignment`. Contract CI runs both gates
and keeps the generated schema projection deterministic with the generator's
`--check` mode.

## Relationship Documents

Root-level edge/action documents are the source of truth for many-to-many state:

| Relationship | Source document |
|---|---|
| Organizer owner/manager seat | `organizerTeamMemberships/{organizerId_uid}` |
| Organizer follow | `organizerFollows/{organizerId_uid}` |
| Event booking, waitlist, attendance, cancellation | `eventParticipations/{eventId_uid}` |
| Unified Host operational roster row | `eventAttendees/{attendeeId}` |
| Roster import audit and idempotency receipt | `eventAttendeeImports/{importId}` |
| Private no-download Event Success identity | server-owned `eventRuntimeParticipants/{eventId_uid}` |
| Short-lived Host venue authority | server-only `eventVenueSessions/{sessionId}` |
| Per-attendee venue redemption | server-only `eventVenueSessionRedemptions/{sha256(eventId_sessionId_uid)}` |
| Ambiguous or walk-in Event Success claim review | server-owned `eventRuntimeClaimRequests/{eventId_uid}` |
| Organizer-scoped communication permission | server-only `organizerCommunicationPreferences/{organizerId_uid}` |
| Organizer-scoped operational contact | server-only `organizerContacts/{contactId}` |
| Contact-to-event fact | server-only `organizerContactEventEdges/{attendeeId}` |
| Contact identity evidence and verified claim | server-only `organizerContactIdentityLinks/{evidenceId}` and `organizerContactIdentityClaims/{claimId}` |
| Contact merge decision and reversible receipt | server-only `organizerContactMergeReviewDecisions/{decisionId}` and `organizerContactMergeReceipts/{receiptId}` |
| Rebuildable contact traits and organizer summary | server-only `organizerContactTraits/{contactId}` and `organizerAudienceSummaries/{organizerId}` |
| Invitation aggregate and isolated bearer token | host-readable `eventInviteLinks/{inviteLinkId}` and server-only `eventInviteLinkSecrets/{inviteLinkId}` |
| Short-lived invite open/share evidence | server-only `eventInviteTouches/{touchId}` and `eventShareIntents/{intentId}` |
| Verified registration/check-in attribution | server-only immutable `eventInviteAttributions/{attributionId}` credit/reversal fact |
| Organizer campaign and recipient snapshot | server-only `organizerCampaigns/{campaignId}` and `organizerCampaignRecipients/{recipientId}` |
| Organizer Announcement history projection | server-only `organizerBroadcastSummaries/{broadcastId}`; manager clients use `listOrganizerCampaigns` and contact-detail callables |
| Organizer WhatsApp sender/template state | server-only `organizerSenderConnections/{connectionId}`, `organizerMessageTemplates/{templateId}`, and webhook receipts/events |
| Organizer WhatsApp Inbox and reply reservation | server-only TTL-bound `organizerWhatsappThreads/{threadId}`, `organizerWhatsappMessages/{messageId}`, and `organizerWhatsappReplyOperations/{operationId}` |
| External provider connection and event mapping | server-only `organizerProviderConnections/{connectionId}`, `externalEventMappings/{mappingId}`, and `providerSyncRuns/{runId}` |
| Event-scoped staff authority | server-owned `eventStaffGrants/{eventId_uid}` with direct reads denied |
| Cross Paths event visibility | `eventCrossPathsConsents/{eventId_uid}` |
| Cross Paths showcase eligibility | server-only `crossPathsShowcaseEligibility/{uid}` |
| Cross Paths suggestion exposure | server-only `crossPathsSuggestionExposures/{exposureId}` |
| Cross Paths invitation | `crossPathsInvitations/{eventId_senderUid}` |
| Cross Paths companion hold | `crossPathsPairHolds/{holdId}` |
| Cross Paths accepted event plan | `matches/{event_pairHash}` with `conversationType: crossPathsEventPlan` |
| Saved events | `savedEvents/{uid_eventId}` |
| Outgoing profile decisions | `profileDecisions/{uid}/outgoing/{targetId}` |
| Match messages | `matches/{matchId}/messages/{messageId}` |
| Notification timeline | `notifications/{uid}/items/{notificationId}` |
| Organizer follower posts | `organizers/{organizerId}/posts/{postId}` |

Retired relationship arrays must not be reintroduced into Flutter models,
Functions writes, Firestore rules, active tooling, or tests. Parent entity docs
keep only aggregate projections such as `followerCount`, `bookedCount`,
`waitlistedCount`, `checkedInCount`, `genderCounts`, `rating`, `reviewCount`,
and `nextEventAt`.

Direct client writes are still allowed only for narrow owner-owned actions that
rules can prove locally: onboarding drafts, launch access applications, saved
events, outgoing profile decisions, match-scoped chat messages, own unread
reset, own notification `readAt`, and own FCM token. The
`accessApplications/{uid}` rule accepts only the authenticated owner's strict
application shape while its status is editable, increments `submissionCount`,
and preserves Admin-owned status, cohort, reviewer, and activation fields.
Multi-document product writes belong in callables or triggers.

Raw `eventParticipations` reads are equally narrow: a participant may read
their own deterministic edge, and an authorized event host may read the roster
for an event they manage. Consumer discovery surfaces must not query a whole event
roster. Post-event Catch, Event Recap, and identified post-event avatar
enrichment use the App-Check-protected `fetchSwipeCandidates` callable, which
returns only public profile projections after the server verifies the
24-hour window, viewer attendance, reciprocal gender and age preferences,
prior decisions, and blocks in both directions. Anonymous attendee volume is
rendered from callable-owned event aggregates instead of roster enumeration.

### Standalone Host Operational Attendees

`eventAttendees` is the Host operations roster. It complements rather than
replaces `eventParticipations`:

- `eventParticipations` requires a real UID and continues to own Consumer
  booking, waitlist, cancellation, payment linkage and profile/network
  eligibility;
- `eventAttendees` uses an opaque event-scoped attendee id and accepts
  `catchBooking`, `hostImport`, `hostManual`, or `webOtp` as its source. Its
  optional `linkedUid` is a server projection, never a synthetic account;
- raw contact fields are private to an authorized organizer manager and
  callable/Admin support boundaries. Public website, Consumer discovery and
  aggregate analytics cannot enumerate them;
- a Catch booking may use the Firebase Auth verified phone only to converge
  with an event row whose contact data the organizer already supplied. It
  never copies `users/{uid}.phoneNumber` or `users/{uid}.email` into a new
  attendee row, organizer event edge, or CRM contact;
- the production website snapshot uses Firestore `count()` aggregation queries
  for registered, checked-in, and waitlisted totals. Only free,
  open-admission events with an explicit Host publication switch qualify; paid,
  invite, membership, approval, and profile-balanced events fail closed. The build identity never
  downloads attendee documents or contact fields;
- direct writes are denied. Host bulk import/manual entry, attendance changes,
  Catch-booking projection, OTP linking and public registration are
  server-owned operations;
- deterministic contact/source keys make retry and re-import idempotent inside
  one event. An attendee-level source reference takes precedence over a
  contact value when present. Shared buyer phones across distinct references
  require review before importing, because current ready-seat authority treats
  a phone as one exclusive alias. The host may omit a buyer phone from guest
  identity when each attendee has a distinct source reference. An email-only
  collision is an explicit duplicate-row exception,
  never evidence to merge distinct tickets; it does not build a cross-event
  identity graph;
- `arrivalGroup` retains an optional provider booking/order/group or
  ticket-buyer key shared by guests expected to arrive together. Adapters keep
  it separate from attendee-level external references, imports include it in
  their canonical payload hash, and it remains private roster data;
- optional `cityMarketId` is a catalog-normalized, organizer-reported import
  field with `citySource` provenance. The Host preview rejects unknown mapped
  cities; re-imports preserve an existing city when omitted. This private roster
  fact never updates a user's city, event admission, runtime profile, or
  assignment readiness. Participant-owned runtime answers remain separate;
- optional attendee revenue fields retain organizer-reported CSV amounts,
  explicit organizer-entered per-guest estimates, or financially complete
  provider facts with their currency and allocation provenance. Repeated equal
  imported totals in one `arrivalGroup` are treated as one shared order and
  allocated across its guest rows exactly once. These facts never become
  verified Catch payments by inference;
- `eventAttendeeImports` records actor, event, client idempotency key, format,
  canonical payload hash, counts, bounded row errors and terminal state. It is
  not a copy of the uploaded file.
- the Host upload mapper retains invalid and ambiguous source rows for the
  saved intake review and blocks any batch above the callable's 250-row limit;
  it does not silently import a first page.
  A host import that targets an existing Catch-booking attendee fails before
  writing roster rows or a receipt; booking status and financial authority stay
  with Catch. `manageHostRosterIntake` stores private, server-only sessions and
  nested apply receipts. Each session binds the manager, organizer, event, file
  fingerprint, mapping, complete row evidence, explicit exclusions and revision.
  Preview labels additions, updates, unchanged rows, exclusions and identity
  conflicts against the current event roster. Apply requires the exact review
  hash, revalidates manager and event scope, recomputes the preview inside the
  canonical import transaction and records an immutable receipt. Retries and
  lost responses reuse the same session/import identities. The Flutter client
  keeps only the opaque account/organizer/event-scoped session id locally for
  resume; roster PII remains in the server-owned session. The extraction seam is
  deterministic by default and has a synthetic provider for tests only. No live
  model provider, credentials, paid inference or guest-data transmission is
  enabled.

Hosts may list operational attendees and import receipts only for events they
manage. An attendee does not gain roster-list access when their UID is linked;
attendee-facing code receives only its own sanitized event state through a
server-owned lookup/registration boundary.

Phone-OTP public registration creates or reuses a private Firebase Auth UID; it
does not create `users/{uid}`, `publicProfiles/{uid}`, or a Consumer
`eventParticipations` edge. On first registration, the callable may create a
private `onboarding_drafts/{uid}` seed using only the attendee-supplied display
name and verified phone. That seed is a continuation convenience for a later,
intentional Consumer onboarding flow, not a profile or advertising permission.
The person must review/edit the draft before any public or dating-profile
projection is created.

### External Booking Event Success Runtime

An event may carry optional server-owned `eventOrigin` and `runtimeAccess`
objects. Their absence preserves legacy behavior. `eventOrigin.mode` records
whether Catch owns the booking (`catchNative`) or overlays an event booked on
another provider (`externalCompanion`); its provider/source identifiers are
provenance, not a claim that Catch owns or has synchronized the source event.
`runtimeAccess.publicRuntimeId` is an opaque join identifier, never the event
document id or a bearer authorization credential. The runtime bootstrap
callable resolves it and returns only a bounded public event projection. That
projection includes non-negative aggregate `checkedInCount` for the anonymous
co-presence visual; it does not include a roster, attendee identifiers, or
per-attendee attendance state.

`eventRuntimeParticipants/{eventId_uid}` is the private bridge between a
Firebase phone-auth identity and an event-scoped operational attendee. It owns
the claim method, optional `eventAttendeeId`, minimum runtime-profile fields,
explicit terms versions, and readiness state. It does not create or imply a
Consumer `users/{uid}`, `publicProfiles/{uid}`, `eventParticipations/{eventId_uid}`,
dating match, or marketing grant. Clients may get only their own deterministic
edge; list and direct writes are denied. Event Success modules authorize a
`ready` runtime edge independently of the Consumer booking/network edge.

Attendance authority is separate from runtime identity and joinability.
`eventVenueSessions/{sessionId}` backs a short-lived signed token issued only to
an organizer manager during the check-in window. The Host screen refreshes it
before expiry. `eventVenueSessionRedemptions/{sha256(eventId_sessionId_uid)}`
atomically binds one authenticated attendee to one displayed session and rejects
replay by that attendee; different attendees may redeem the same live display.
Both collections deny all direct client access and use `expiresAt` TTL. A static
`publicRuntimeId` URL, printable event QR, or latitude/longitude claim carries no
attendance authority.

When the verified phone cannot be matched unambiguously, or when the event's
walk-in policy requires review, the server writes
`eventRuntimeClaimRequests/{eventId_uid}` with only the last four phone digits
and bounded candidate attendee ids. Authorized organizer managers may review
that request through a callable. A rejection cannot expose alternative roster
identities to the claimant.

The minimum event-scoped questionnaire is plan-derived. Display name is always
required; sensitive or compatibility fields are requested only when an enabled
module needs them. Saving the answers as a later Catch onboarding prefill is a
separate explicit consent. A prefill remains private and must never overwrite a
completed Consumer profile or create a public projection.

`eventRuntimeDataRequests/{requestId}` is the server-only current source for a
typed `requestRequiredData` instruction. The internal coordinator accepts only
the canonical runtime field enum, fields derived from the current event format
and selected modules, and fields still missing from the event-scoped profile.
The command is fenced by the profile revision, current request revision and a
hash of the event, attendee and profile facts. Its deadline cannot outlive the
event. `eventRuntimeDataRequestReceipts/{receiptId}` makes an exact operation
retry idempotent and rejects reuse with changed content. Both collections deny
all client access. The participant-write trigger creates the typed command for
current missing required fields, runtime bootstrap returns the bounded request,
and accepted profile submission reconciles it to completion. This completes the
live source binding without granting Host authority or activating a deployment.

### Organizer Communication Preferences And CRM

`hostContactSummaries/{contactId}` is the server-owned list read model. It
contains the existing host-visible contact row plus its indexed sort/filter
keys; linked account IDs, merge candidate IDs, identity evidence, raw answers,
and permission receipts are excluded. Current organizer managers can read only
summaries belonging to their organizer through the SDK. All client writes and
reads of the internal CRM documents remain denied. View fields never authorize
mutations, identity linking, messaging, or delivery.

`hostDirectorySummaries/{organizerId}` stores visible-contact and segment counts,
manual tag labels, projection coverage, and the per-organizer migration marker.
Contact, trait, channel-state and vocabulary changes reconcile current source
records. The view and its count delta commit atomically; replayed or delayed
trigger payloads cannot increment counts twice or restore removed rows.

The scoped `functions/scripts/backfill-host-read-models.cjs` command defaults to
dry run and requires explicit `--project` and `--organizer`. `--apply` rebuilds
views. `--activate` additionally verifies current source/view parity in one
transaction before setting `contactSummaryVersion: 1`. Deploy rules, indexes
and writers before a client using SDK reads, then backfill and activate each
organizer. Missing/unverified markers retain callable reads; authorization
failures never trigger a fallback. Activation has not been applied to a live
environment by this source change.

The normal SDK contact page reads at most `limit + 1` small summaries and one
counts document. Single segment and single filter-family queries use indexes;
intersecting filter groups and text search retain server evaluation. Detail
history, permission evidence and financial facts remain callable reads until
an independently verified detail read contract is available.

The same read boundary applies to `hostFormSummaries/{formId}` and
`hostEventSummaries/{eventId}`. Forms contain the existing list DTO, not the
editable draft definition. Event summaries cover only unpublished inventory;
published Events already use SDK reads. Unpublished Event rules additionally
require a currently active, unarchived organizer.

`hostGroupSummaries/{audienceId}` contains name, lifecycle, revision, group kind
and preview metadata. Predicates and up to 2500 selected contact IDs are kept in
`hostGroupDetails/{audienceId}`, a manager-readable **get-only** projection for
one selected group. After verified SDK cutover, the paginated Groups controller
publishes the first 30-row page, applies name/recent-preview sorting and group-type filters in indexed
queries, and loads further pages only on request. Contains-name search preserves
the existing bounded exhaustive behavior. Before cutover, legacy Groups reads
still exhaust callable pages. The Audience workspace switches to compact metadata through
a coordinated UI patch; mutation and membership-preview authority stay callable.

`hostResponseSummaries/{summaryId}` stores one unified inbox entry per submitted
response or standalone application. The key hashes the source kind and ID. A
converted native response includes its application summary in that same entry;
it never appears twice. Raw answers, list answer highlights, participant UIDs,
review notes, grants and asset URLs are excluded. Ordinary all-form inbox pages
read these summaries through the SDK. Form-scoped/filter-choice queries, answer
filters, contact joins, review filters and text search keep the existing callable
behavior until their own equivalent indexed read contracts are implemented.

Participant grant revocation and generic response withdrawal redact their
verified summary (or delete an invalid view) in the **same transaction** as the authority change, including
idempotent replays. Asynchronous projectors reread current authority and may
recreate only redacted withdrawal metadata. They cannot restore withdrawn names,
contact IDs or response contact details from stale event payloads. Imported
application operational metadata retains its existing organizer-owned boundary.

Each model has an independent directory marker (`formSummaryVersion`,
`eventSummaryVersion`, `groupSummaryVersion`, `responseSummaryVersion`). The
backfill command selects `--model contacts|forms|events|groups|responses` and
sets that model's marker only after consistent transactional parity. Oversized
activation transactions fail without setting a marker. List summaries are
server-maintained views with eventual updates; client refresh alone is not a
source reconciliation. Monitor trigger retries/failures and compare parity
before cutover. A callable mutation remains canonical and must never be
re-authorized from a view's revision, count, grant status or eligibility field.

SDK requests use fresh server reads, current organizer rules, stable indexed
sort keys and document-ID tie breakers. Cursors bind account, organizer, model
and filter scope. Account changes invalidate repository providers and reject
in-flight results. There is no persistent PII cache in the repositories. Rules
checks use the canonical organizer and deleted-account state, shared across
rows, rather than one private authority document per row. All client summary
writes and raw CRM/response reads remain denied. No live rollout, backfill or
latency improvement is asserted by this source change.

`organizerCommunicationPreferences/{organizerId_uid}` is a server-only,
organizer-scoped permission ledger. WhatsApp and SMS each have independent
`unknown`, `optedIn`, or `optedOut` state, terms version, source event, source,
and timestamp. Public registration writes only an explicit checked opt-in. An
unchecked box does not grant permission and cannot revoke a prior grant;
withdrawal belongs to the future self-service/STOP callable. Host imports and
manual roster entry never create channel permission.

Each non-unknown channel preference carries a permission receipt sufficient to
explain the decision without reading private response content: source kind,
nullable source event/form/response ids as applicable, terms version, consent
copy hash, grant timestamp, and nullable revocation timestamp/source. A legacy
row without complete evidence remains explicitly incomplete or unknown; a
backfill must never infer or promote permission from a phone number, contact
source, roster membership, form answer not bound to the reviewed consent copy,
or prior send.

`tool/data/backfill_organizer_crm_authority_v2.mjs` is the dry-run-first
additive migration. It creates contact origins only when a canonical attendee
edge names both current and original contact identity. Existing non-unknown
preference state without a complete referenced receipt becomes an immutable
`legacyIncomplete` receipt and remains ineligible for managed delivery. The
tool reports, rather than guesses, attendee rows whose canonical edge is
missing. The migration is available in source but has not been applied to any
environment.

`organizerContactOrigins/{originId}` is the immutable multi-source provenance
ledger for organizer CRM contacts. Each deterministic row records organizer,
current contact, origin contact, source kind, source entity kind/id, nullable
form/event/response ids, actor class and bounded actor uid where appropriate,
observed time, and creation time without copying raw response or message bodies.
Merges may move the current contact id while retaining the origin contact id;
unmerge uses receipt-named origin facts and never guesses later ownership.
`organizerContacts.primarySource` remains a compatibility summary during the
additive migration and is not a complete history.

Every canonical `eventAttendees` write projects into an organizer-scoped
contact plus one event fact edge. A contact is operational memory for one
organizer, not a Consumer profile. An imported normalized phone/email creates
only proposed identity evidence; it never silently merges two people. A UID or
person-verified OTP phone may own a singleton identity claim. Conflicting
verified claims stop automatic convergence and require an immutable,
reversible manager merge receipt. Name alone is never merge evidence.

Manager merges are optimistic and receipt-backed. The client supplies the
current survivor and source revisions; the transaction also verifies every
source-origin fact has the same Firestore version observed during planning.
Conflicting UID, phone, or email facts require explicit confirmation. Unmerge
restores only the exact source-origin edge, evidence, claim, and contact-origin
identifiers in the original receipt and creates one deterministic reversal
receipt. Facts
created after a merge remain with the survivor instead of being guessed back.
The manager review boundary lists conflicted verified UID/phone claims plus
exact proposed phone/email hashes. It derives shared events, source kinds and
confidence at read time, never proposes name-only matches, and stores a
`organizerContactMergeReviewDecisions` row when a manager chooses Different
people. Only that manager may reopen the decision. Contact detail returns the
newest active merge receipts for the survivor so each receipt can be reversed
individually.

Account deletion is the only erasure exception to receipt and origin retention:
it deletes permission receipts carrying the participant UID and redacts that
UID from retained contact-origin facts while preserving non-PII source
classification.

`organizerContactTraits` are rebuilt from event edges and verified invite
attribution facts and contain only
attendance, reliability, source and channel-reachability facts. Compatibility
answers, gender, sexual orientation, relationship state, wingman targets,
safety reports and inferred social desirability are prohibited CRM inputs.
An `advocate` has at least one verified referred registration or check-in. A
`high_impact_advocate` has at least three referred verified check-ins in the
trailing 365 days; raw link opens and share-button taps never qualify.
`past_attendee` is the canonical broad attendance segment for at least one
checked-in event; `repeat_attendee` begins at two. New definition-v3 trait rows
store both the broad and applicable narrower segment. Directory, export, and
saved-audience evaluation still resolve `past_attendee` from
`attendedEventCount > 0`, so older trait rows remain correct before they are
recomputed and clients never union independently paginated segment results.
Trait and summary writes use exactly-once TTL receipts, so retries cannot
double-count an organizer. The dry-run-first organizer-audience backfill uses
the same production projector and marks a summary `exact` only after every
current attendee row has completed. Its discovery set is the union of attendee,
contact, and incomplete-summary organizers, so a manual-only organizer with
zero attendees can still be completed. Newer live rows always win over stale
backfill snapshots. A missing or partial summary is also effectively `exact`
when a bounded canonical-history check proves that the organizer has no
`eventAttendees`; absence of projection state alone is not treated as an
incomplete migration.

`getOrganizerCrmSummary` reads `organizerAudienceSummaries` only when its
coverage is `exact` and returns only privacy-bounded counts for contacts, past
and repeat attendees,
linked accounts, imports, and explicit WhatsApp/SMS reachability. During the
dual-write migration it falls back to the legacy bounded attendee/preference
scan for organizers without exact coverage. Partial summaries remain migration
diagnostics and never replace the legacy cards. It never returns attendee
identity or contact fields. `listOrganizerContacts` and
`getOrganizerContactDetail` are separate manager-authorized, server-paginated
boundaries. They return only organizer-owned endpoints plus explainable
attendance/reachability facts; no Event Success private input is a CRM field. The
current detail UI requests `includeHistory: false`: attendance, revenue, memory,
permission, and source provenance remain available, while campaign, broadcast,
manual-send, reply, form-response timeline, and merge-history reads are deferred
until History opens. `historyLoaded: false` and unavailable timeline coverage
keep an unrequested history distinct from no activity. Omission of the request
flag preserves the full response for older clients. A new client retries without
the flag only for the old server's exact `includeHistory: must NOT have
additional properties` diagnostic; other validation and access failures are
not retried. Loading all tabs can add a
second invocation and repeat core reads; overview-only visits omit operational
queries. No minimum instances or new persistent listeners are introduced.
The directory and export accept additive `segmentIds` and `manualTagIds` arrays
alongside legacy scalar filters. Selections combine with OR within Attendance,
Reliability, Advocacy, Reachable and Tags, then AND across nonempty groups;
empty groups impose no condition. List cursors bind to the canonical selection,
and combined-filter result counts come from the complete bounded candidate set.
The directory accepts `lastSeen`, `mostAttended`, or `name`; every opaque cursor
is versioned and bound to its query plan, filters, and ordering. Filtered sorts
are computed over a bounded complete candidate set rather than sorting one
already-paginated page, and an over-limit candidate set fails explicitly.
`createOrganizerContact` requires a contact name plus at least one
organizer-entered phone/email evidence value, may add an optional first private
note, and creates its zero-history
trait. Organizer-entered endpoints remain `proposed`, organizer-scoped evidence:
they create no attendee, verified identity, UID, Consumer profile, opt-in, or
messaging grant. Only unlinked contacts whose primary source is `hostManual`
may later edit those endpoints but cannot remove its last endpoint. Legacy and
system-derived name-only records remain readable and can still rename without
being forced through a migration. Customer detail unifies event-scoped
revenue from completed, non-refunded Catch payments, financially complete
provider orders, organizer-imported amounts, explicit organizer estimates, and
organizer-attested manual offer payments. Admission stamps the attested
amount, currency and `hostAttested` source onto the operational attendee so
the rebuildable contact-event edge projects the fact into revenue history.
Every amount retains its source; reported and estimated values are never
presented as verified payments. A Catch payment takes precedence over a
reported fact for the same customer event so the sale is not counted twice.
Imported and estimated revenue does not require a linked Catch UID. Event rows
hydrate the bounded canonical event set so legacy edges immediately receive an
event label and Catch-native, external-companion, or unknown origin; new edge
projections also retain that snapshot. Revenue reports partial coverage when
the bounded event timeline or an eligible linked-UID payment scan truncates.
Hosts currently retain event-scoped roster access through the existing
authorized roster boundary. The Host Audience client consumes the directory,
detail, export and contact-mutation callables; it never reads these collections
directly. Organizer-authored CRM memory remains structurally separate from
computed traits: `organizerContacts.manualTagIds` references a maximum of five
entries from the organizer's server-owned
`organizerContactTagVocabularies/{organizerId}` document, whose vocabulary is
capped at twenty. `organizerContactNotes` stores author-stamped note records;
new notes append, edits use optimistic revisions, contact detail returns the
newest bounded window, and exports never include note content.
`organizerContactOutreach` stores append-only, author-stamped manager-asserted
outreach attempts (channel plus outcome with an optional bounded note); the
record callable validates the active contact, rejects future timestamps beyond
a short skew, and contact detail projects the newest bounded window onto the
timeline with explicit coverage while exports never include outreach content.
Existing contact documents may omit `manualTagIds` and read as an empty
assignment, so none of these features requires a backfill.

`organizerSavedAudiences/{audienceId}` owns reusable Customers-authored CRM
audiences. The closed `directoryFilters` predicate preserves the same combined
segment/tag semantics as the People directory.
A definition contains one to eight predicates joined by `all` or
`any` over the reviewed computed-segment, organizer-tag, attendance-count,
last-seen recency, named-intent reach, application status by form, immutable
filterable choice/boolean answers, named-event attendance, and Catch spend.
Spend specifies a currency, a minimum/maximum minor-unit amount and an optional
trailing-day window. Only unique verified Catch identities qualify; totals use
current completed payments, exclude refunds and failed sign-ups, and check
canonical event ownership. Exact evaluation stops at 1,000 events and 5,000
payments. Different currencies are never added or converted.
A static list instead uses one `staticMembers` predicate with up to 2,500
explicit contact ids and `join: all`. It cannot mix automatic conditions.
`resolveOrganizerAudienceMembers` resolves selected labels in bounded batches
for the manager-only editor. Merges follow the surviving contact; hidden or
deleted records are excluded during evaluation and must be removed on save.
Selecting a person never grants communication permission.
Form-answer predicates carry form, version, question and a validated value;
only non-sensitive questions marked `filterable` can be selected. Current
submitted responses join People through deterministic source origins; merges
follow `currentContactId`, and withdrawals exclude the evidence. Attendance
requires a checked-in, non-cancelled edge for that organizer and event.
Arbitrary collection
paths and raw Firestore queries are forbidden. The server canonicalizes and
hashes definitions, validates organizer-owned tags, and applies optimistic
revisions. Preview returns exact coverage or an explicit incomplete/over-limit
failure; the bounded evaluator refuses organizers above 2,500 active contacts
instead of truncating. Preview pages bind their cursor to the organizer,
audience revision and full ordered membership; changed membership fails closed.
Source reads stop at 5,000; authoring catalogs stop at 200 records per category
and 100 filterable versioned questions, with explicit over-limit errors.
Event-scoped Booked/Prospective audiences remain event
authority and
are referenced directly by event-announcement sends rather than copied into a
CRM audience. Campaign approval freezes resolved recipient ids and revisions;
the selected saved audience id, revision, and definition hash remain on the
campaign. A changed or archived definition blocks draft preview/approval but
does not rewrite an already approved send. Campaign preview also persists an
exact audience-state hash; approval requires the current resolution to match it
before freezing recipients, so a count-preserving membership change cannot
silently pass.

`organizerManualSendTasks/{taskId}` is the server-only durable external-handoff
queue. One task represents one organizer, contact, originating send, intent,
route, permission/capability snapshot, idempotency key, endpoint snapshot/hash,
bounded prefill content with TTL, and progress state. Its only progress states
are `queued`, `handoffOpened`, `hostMarkedSent`, `skipped`, `cancelled`,
`superseded`, and `expired`; it has no delivered/read state. Opening an external
application records only `handoffOpened`. The prepare callable persists or
returns the idempotent queued task only after current manager, contact, endpoint,
permission, and route checks; the client performs the external launch and then
acknowledges the accepted launch against the current revision. An exact prepare
retry revalidates the existing task rather than bypassing those checks. Tasks
opened again from the durable queue first pass a revision-bound, read-only
callable that rechecks the current contact, endpoint, permission, suppression,
and route and returns the already-bounded task payload. The open acknowledgement
repeats those checks after device acceptance; neither check mutates or sends.
Existing tasks never auto-dispatch after a capability change. An explicit host
re-plan rechecks
current authority and returns advice only; it does not write, supersede, remove,
complete, or dispatch any task. A separate explicit host action is required to
close manual work. Active queue reads apply the server-time expiry bound in the
indexed query rather than waiting for asynchronous TTL deletion to hide stale
work.

The communication plan also resolves a personal-device email handoff when the
contact record carries an email address. It is an external `mailto` launch with
no durable task, no provider receipts, and no delivery observability; a
successful device acceptance records only an `organizerContactOutreach`
`attempted` assertion so the attempt appears on the customer timeline.

`organizerContactActivity` is a callable-composed bounded cursor projection,
not a client-readable master collection. It joins sanitized origin, form or
application, attendance, note, permission, send/reply and merge facts for one
active organizer contact. Each row has a typed kind, stable source id,
occurred-at time, safe display payload, and coverage metadata. Outreach rows
project the manager-asserted `organizerContactOutreach` attempts. It never copies
private Consumer profile, compatibility, safety, wingman, raw provider receipt,
or unrelated organizer content.

Contact detail also reads the bounded newest campaign-recipient window from
`organizerCampaignRecipients` and joins safe campaign labels and delivery
state. `sendEventBroadcast` also writes one organizer-scoped
`organizerBroadcastSummaries/{broadcastId}` projection after it finalizes the
server-only operational receipt. Contact detail joins only summaries whose
bounded `recipientContactIds` contains the contact and returns the sanitized
Announcement label, audience, time and available/failed delivery state. It
never exposes message bodies, raw receipt evidence or cross-organizer history.
Campaign approval freezes a server-owned recipient snapshot and
dispatch rechecks current permission, contact suppression, sender/template
health and event state before each attempt. Meta provider tokens live in Secret
Manager. Every environment pre-provisions one
`ORGANIZER_WHATSAPP_ACCESS_TOKENS` vault; each organizer connection is stored
as a distinct immutable secret version containing its organizer and connection
binding, and retired versions are disabled. The source proposal binds
`dispatchOrganizerCampaign`, `getOrganizerMessagingSetup`,
`sendOrganizerWhatsappReply`, `sendOrganizerWhatsappTest`, and
`syncOrganizerWhatsappTemplates` to the project-scoped
`catch-whatsapp-reader@` runtime identity, with secret-level accessor access
only to this vault and `META_WHATSAPP_APP_SECRET`. Only
`completeOrganizerWhatsappConnection` and
`disconnectOrganizerWhatsappConnection` retain the default connection-writer
runtime identity, which requires accessor and version-manager access on the
vault. This source change is not deployed; other permissions inherited by the
default runtime identity remain unchanged. Existing raw-token
versions remain readable only for migration compatibility. Meta integration is
reported configured only when `META_WHATSAPP_ENABLED=true` and the real Meta
app/config credentials are present. Webhook receipts are signature-verified,
deduplicated and monotonic;
STOP updates the same organizer-scoped preference/suppression boundary without
creating analytics content. For one unambiguously resolved organizer contact,
the bounded inbound body is also copied into
`organizerWhatsappMessages/{messageId}` and summarized by
`organizerWhatsappThreads/{threadId}`. Both are server-only and carry a rolling
12-month `expiresAt`; the queue copy expires after 30 days. Manager callables
list and open these threads in the existing Inbox scopes. Free-form replies
require the current sender connection, unsuppressed contact state, an unchanged
latest-inbound timestamp, and an open 24-hour customer-service window; the
server rechecks all of those conditions even when the client composer appears
enabled. `organizerWhatsappReplyOperations` reserves each idempotency key before
the provider call, preventing concurrent duplicate sends and preserving an
unknown-outcome state when Meta acceptance cannot be confirmed. Account
deletion removes the onboarding draft, organizer communication grants, UID
identity evidence and verified UID claims. Retained operational attendee,
contact and event-edge history is unlinked from the deleted Catch UID.
Retained organizer roster history is unlinked by setting `linkedUid` and
`linkedAt` to null; any separately retained operational contact field remains
subject to the organizer's stated booking/records purpose rather than Catch
account or marketing permission.

### Person Data Lenses And Canonical Fields

Catch does not have one client-readable master person document. A verified
Firebase Auth identity, the participant's private profile, the dating feed
projection, portable application intake, organizer-submitted answers, and an
organizer's CRM history are separate authority and visibility lenses. A phone
match is an identity-resolution input only; it never grants an organizer access
to private-profile fields or another organizer's records.

| Lens | Canonical storage | Authority and visibility |
|---|---|---|
| Verified account identity | Firebase Auth plus the verified `users/{uid}.phoneNumber` mirror | Firebase Auth is authoritative for phone ownership. The private mirror is not a Host projection. |
| Private Catch/dating profile | `users/{uid}` | Participant-authored source used to build Catch experiences. Its presence does not authorize Host access. |
| Public dating projection | `publicProfiles/{uid}` | Server-derived, redacted feed shape only. A person-field mapping describes where a published value would land; it is not publication consent. |
| Portable application prefill | `participantIntakeProfiles/{uid}` | Participant-private, reviewed values for lower-friction future applications. It neither overwrites `users` nor becomes organizer-visible merely by existing. |
| Organizer application snapshot | `organizerApplicationResponses/{responseId}` plus `participantOrganizerDataGrants/{grantId}` | Exact questions answered for one application and the exact question/field grant receipt. This is the only application-field slice available to that organizer. |
| Organizer CRM/customer history | `organizerContacts` and its organizer-scoped event, note, trait, campaign, and commerce projections | Facts the organizer acquired through its own events and workflows. It must not be hydrated from private `users` fields merely because an identity link exists. |
| Platform reconciliation | Server-side joins across the preceding stores | Catch may resolve the same authenticated person across organizers, but employee-facing reads must remain purpose-scoped, role-gated, masked where possible, and audited. There is no universal raw-PII client projection. |

`contracts/catalogs/person_fields.json` is the single semantic registry for
portable person fields. It owns stable ids, normalized provider-header aliases,
native question kinds, import transforms, privacy classes, prefill review
requirements, Host presentation intent, authority, and structural private/public
profile mappings. The validator requires the organizer-application enum and
real profile paths to match the catalog. Generated Dart, Functions, and tool
registries consume it so Google Forms, Typeform, Fillout, CSV/XLSX, and future
native forms cannot maintain divergent alias maps.

The catalog is classification metadata, not permission. Its organizer policy
is `submittedQuestionGrantOnly`: a Host sees a field only when that organizer's
form asked the question and the response/grant records it. Its public-profile
mapping is also structural metadata only. Choice-shaped fields imported from a
table remain text until the source options are explicitly mapped, preventing a
provider export from silently inventing Catch choice semantics.

Age is derived from date of birth rather than a second mutable profile value.
Phone authority belongs to Firebase Auth even though `users.phoneNumber` keeps
a verified mirror. Provider-specific questions remain organizer-custom answers;
they are not added to this catalog merely because one provider or organizer
uses them.

Historical rows created before this boundary can be assessed with
`node tool/data/audit_legacy_host_contact_projection.mjs --env <environment>`.
The command is permanently read-only, omits raw phone/email values, and splits
exact unprovenanced private-profile matches from rows needing human
reconciliation. It also counts affected CRM edges and contacts. Any repair must
be a separate approval-gated operation because stale identity evidence and
organizer-supplied contact history must be reconciled together; age or source
labels alone are never deletion proof.

After an explicit repair approval, the only supported mutation path is
`node tool/data/repair_legacy_host_contact_projection.mjs`. It requires one
organizer, exact expected high-confidence and reconciliation counts, and both
production confirmation flags. Each row is reclassified transactionally before
phone/email are set to null. The current deployed attendee trigger must then
rebuild the event edge, contact, traits, identity evidence and audience summary;
the repair verifies that postcondition and removes only orphaned phone claims.
It never deletes an attendee, event, organizer contact, or organizer-supplied
contact fact, and never prints raw contact values.

### Generic Organizer Forms

`organizerForms/{formId}` owns generic Host form identity, target, lifecycle,
response counters, stable opaque `publicFormId`, and pointers to editable and
published content. `organizerFormDrafts/{formId}` owns the mutable definition
under an optimistic revision. Publishing copies that definition into immutable
`organizerFormVersions/{formId_vN}` and records `sourceDraftRevision`; an exact
retry reuses the active version instead of incrementing publication history.

`organizerFormResponseDrafts/{draftId}` stores a version-bound, expiring
respondent session with optimistic answer revisions. A submitted session
becomes one immutable `organizerFormResponses/{responseId}` snapshot containing
the published question identities, validated answers, submission consent, and
source-link attribution. An exact submit retry replays the same response;
withdrawal stamps that response instead of deleting the audit record.
`organizerFormShareLinks/{linkId}` owns organizer-created source tokens and
bounded attribution counters. A source token changes measurement only; it
never grants form-management, response, or Firestore authority.

All seven collections are server-only. Organizer managers create, update,
validate, publish, pause, resume, archive, duplicate, delete eligible drafts,
and list bounded projections through App-Check-protected callables. Form lists
use the `organizerId + updatedAt desc + __name__ desc` index and opaque cursors;
archived forms are excluded by default. A `publicFormId` is a routing token,
not permission to read Firestore. The public `/f/:publicFormId/` route uses
callables for a safe active-version projection, anonymous or verified identity
bootstrap, autosave, submit, and withdrawal. Public reads never return draft
content, organizer-only metadata, other respondents, or response counters.

`contracts/catalogs/organizer_form_templates.json` is versioned source data.
Creating from a template copies it into organizer-owned draft state with new
section, question, and option identities, so catalog changes never mutate an
existing form. Duplicating a form remaps all nested identities and logic
references. The shared semantic validator permits invalid work-in-progress
drafts but blocks publication on identity collisions, invalid field/validation
combinations, stale logic references, backward section routes, target errors,
and purpose-specific requirements.

Generic Forms is the source for application, registration, intake, waiver,
feedback, and survey definitions. The existing application collections below
remain the application-review projection and import compatibility boundary;
they are not the generic response store.

Fixed-event form targets are validated in the same transaction as creation,
draft updates, duplication and publication. Binding accepts a schema-valid,
active upcoming event owned by the organizer, including a privately saved
basics-only event. The mutation also rechecks current manager and deleted-account
authority. Missing, foreign, cancelled, malformed or past targets reject the
write; changing the draft to organizer-wide intake clears the event binding.
Resuming a paused form validates the immutable published version's target,
not an unpublished draft edit. Public resolution closes a fixed-event form when
its current event is missing,
foreign, cancelled or has started. Begin/save and the final response write
recheck the event inside their transaction; already submitted responses retain
idempotent receipt replay. Paid checkout rechecks before reserving a payment.
A captured payment whose event became unavailable enters the existing
`refundPending` reconciliation path without creating a response; this does not
claim a completed refund or activate a provider.
Binding creates no admission, booking, event publication or payment capability; offer/admission writes still need their own
current target and source authority.

Typed export commands are persisted before mutable query metadata is resolved.
The worker rejects stale or unsupported filters with a terminal failed receipt
before writing any export object. Exact request replay requires current manager
and account authority but does not recompile an old query merely to retrieve its
receipt; this permits durable client journals to settle after form changes.
Pending or running exports older than ten minutes settle as `export_interrupted`
on an authorized status retry. Polling does not extend the deadline. The user
can refresh the response set and start a new export; the original command is
never silently restarted. Delayed workers cannot overwrite that terminal
receipt or publish a download for it.

`requestOrganizerFormExport` accepts optional `responseQuery`,
`expectedQueryHash` and `expectedResultHash` together. Typed exports use the
same published-version-aware predicate, ordering and one-snapshot reader as
`queryOrganizerFormResponses`. The page cursor must be null; the export covers
all matching rows, including rows beyond the displayed page. Legacy date/status
filters cannot be combined with a typed query. Query and result hashes prevent
silent changes between review and background processing. CSV and XLSX redact
sensitive and withdrawn answers and neutralize spreadsheet formulas. File and
signature cells show attachment presence, never private asset IDs. The
worker rechecks current manager/deleted-account authority through the query
reader; download requests recheck current manager authority. Typed exports
retain the interactive 5,000 scanned responses / 8 MiB / 25-second bounds and
fail before storage on overflow or changed results. Legacy exports retain
their existing 10,000 matching / 50,000 scanned bounds. Receipts distinguish
query settings and both hashes; a reused request ID cannot change its filters.
The result hash includes exported consent/completion metadata. Failed receipts
return the stable `response-query-stale` code when the reviewed set changes;
clients must refresh and use a new request ID, not replay a different query.

The shared response reader emits one `organizer_response_scan` diagnostic per
scan: fetched document count, serialized bytes, query page count, elapsed
milliseconds and a closed completion/limit/failure outcome. It contains no
organizer, form, actor, query, identity, answer or error-text data. All form
versions consume scan budget; the telemetry counts fetched rows even when a
byte/time ceiling rejects the result. At the 5,000-row ceiling, batches of 25
need 201 response queries including the exhaustion/sentinel query. This is
not a billed-read count: authority/version reads, empty-query minimums,
rate-limit transactions and provider billing rules are separate. Each UI page
and export worker currently rescans; this diagnostic does not prove deployed
latency. Production percentiles and representative response sizes must be
measured before changing batching or the actor/organizer rate ceilings.

### OTP offer recipients

`organizerEventOfferRecipients` is private, server-owned invitation/claim
state. Its document ID hashes a random 256-bit link token. Stored bindings
freeze the organizer, event, offer generation/revision, response, CRM origin,
contact, phone hash and offer expiry. Issuance requires the current manager;
claim requires Catch phone OTP and a matching current Admin Auth phone. A
successful claim attaches one UID and never changes the form response identity.
Repeated claims by that UID preserve the original claim time.

Issuance, claim and consumption reread the current offer and its frozen terms,
submitted response/version, native application approval or completed CRM
conversion, current contact/origin and account-deletion tombstone. Withdrawal,
reissue, expiry, contact merge, changed phone/UID or revoked source invalidates
the old grant. The seat identity resolver accepts this narrow verified-recipient
path alongside the existing verified-form-respondent path; it retains the
canonical seat and rejects conflicting aliases. Raw token/phone data is absent
from the grant, and all direct client access is denied.

`organizerEventOfferPayments` is a separate server-only payment ledger. Its
deterministic attempt freezes the grant/UID, source offer revisions, payment
terms, route, merchant configuration, transfer allocation, canonical seat and
15-minute hold deadline. Reservation and hold creation commit together.
Verified capture converts the hold and writes the common roster, admission
ownership and receipt plus payment completion atomically. The receipt includes
provider IDs, recipient proof and the frozen route; it never fabricates manual
payment evidence. Historical receipt replay cannot renew the hold or roster.

Order retries use the saved receipt after an uncertain POST. The common signed
webhook inbox routes verified provider orders by ledger receipt and exact
merchant binding. The bounded offer recovery sweep releases expired inventory
before attempting provider work, retains manual-review anomalies and retries
full refunds using a stable payment-specific key. Route refunds require full
transfer reversal. Recipient callables require App Check and phone-authenticated
UID ownership. A returning payer can recover the saved payment from the original
invitation even after source expiry; this grants no new admission authority.
Event OAuth selection requires one ready organizer connection in the selected
mode and rechecks that set inside the new reservation transaction. Existing
attempts retain their binding. The public screen and provider acceptance remain
required before event-offer checkout activation; admission does not release
Route settlement during admission.

A separate settlement due queue has no payment-age cutoff. For Route admissions,
completion and the scheduled end must both be in the past. A host may complete
an event early, but release still waits for its scheduled end. Current event and
attendee state plus the immutable paid admission receipt must agree. The worker
persists release authorization before provider I/O and uses a renewable lease to
fence stale workers. A lost response is recovered from the exact frozen transfer;
current cancellation prevents a new release, while a prior uncertain release is
still observed. Provider `released` and `settled` remain distinct states. An
externally released hold without Catch authorization requires review. Corrupt
proofs leave the automatic queue instead of starving later payments.

The adapter uses Razorpay's [settlement hold API](https://razorpay.com/docs/api/payments/route/modify-settlement-hold/)
and validates the frozen merchant, destination, full capture, receipt, allocation
and zero reversal before release. This implementation does not establish bank
receipt. Host event cancellation atomically cancels the paid roster entry,
releases its canonical seat (or retains an independent Catch booking's seat), and
persists a full-refund intent without deleting the admission receipt. A retryable
event trigger pages all remaining admissions, regardless of payment age. The
payment recovery worker also checks current event cancellation when reconciling
an admitted payment. Explicit authority failures require review; transport errors
retain retryable work. Refund and settlement leases exclude each other's provider
I/O. Refund completion requires the original merchant's verified refund, including
full Route transfer reversal; `reversed` is terminal for the settlement queue.
Recipient history distinguishes host cancellation from failed initial admission.
Guest checkout freezes the event's cash-refund deadline and start time before
reservation. Paid offers without a paid canonical event policy use the standard
24-hour cash cutoff, including minimal private and external-companion events;
this does not rewrite their base price or provenance. The recipient reviews these exact terms before paying; a changed
policy requires reopening the invitation. Phone-authenticated, UID-owned
`cancelAdmission` confirms the server-quoted refund amount, checks current event
and attendee state, and atomically cancels the admission and releases its seat.
The cash deadline is inclusive. After it, cancellation has no refund; online
cancellation closes at the earlier of the frozen and current event start.
Checked-in admissions and legacy payments without frozen terms need host help.
Catch credits are explicitly deferred and are not promised by this checkout.

A full cash refund enters the durable refund queue. A zero-refund cancellation
remains `cancelled`, retains its immutable paid receipt, and can settle only after
the event completes. Provider callbacks cannot re-admit that guest. An unexpected
provider refund requires review. A later host cancellation upgrades a prior
zero-refund guest cancellation to a full refund without releasing its seat again.
Exact cancellation retries replay the saved decision. Recipient history survives
invitation expiry and disabled new-checkout gates. Provider test-mode acceptance
remains required before activation.

### Public paid event registration

`configureEventRegistration` is the manager-owned, revision-checked opt-in for
`closed`, `free` or `paid` public registration. Its immutable
`eventRegistrationReceipts` make exact retries safe. It preserves event origin
and native-booking provenance. A legacy enabled boolean authorizes free signup
only. Paid enablement requires an open, published, future event, canonical paid
price, reconciled seats and a ready event-admission payment route. Public phone
OTP never substitutes for invitation, application approval, membership, cohort
or pair eligibility. The legacy boolean editor cannot change paid mode.

`managePublicEventCheckout` quotes, prepares, finds, reconciles and cancels a
UID-owned public checkout. It requires App Check, rate limits and current phone
Auth; deletion and disabled-account checks do not require a Consumer profile.
The quote freezes the reviewed amount, registration revision, event start and
cash-refund deadline. `publicEventPayments` owns the attempt and its 15-minute
seat hold; `publicEventAdmissionReceipts` proves its captured admission. Both
collections deny client access. They never create a form approval, reviewed
offer, conversion receipt or Consumer participation edge.

The public adapter shares provider recovery, signed webhook dispatch, refund,
cancellation and Route settlement machinery with reviewed offers. Admission
atomically confirms its own hold, updates the canonical roster and count, writes
its immutable receipt and marks payment completion. Imported guest identity and
source are retained. An existing active native booking returns its admission
without charging again. Closing new registration honors an existing hold;
unpublication, cancellation, changed start, identity loss or hold expiry causes
a captured attempt to release inventory and enter refund recovery. A retry never
renews a hold or reselects a merchant. Guest cancellation follows the frozen
cash/no-refund terms; Catch credits remain deferred. Re-registration may reuse
the roster row, while the old cancelled charge remains independent historical
financial evidence. A no-refund charge can settle only after event completion
and the scheduled end, even when a subsequent registration replaced that row.

### Organizer-connected form payments

`paymentRoutingPolicies/app` owns application defaults; organizer overrides use
`org_` plus the SHA-256 of the exact organizer ID. Both purposes (`formFee` and
`eventAdmission`) are independent. A null organizer choice inherits; a null app
choice or explicit `disabled` blocks that purpose. Policies cannot contain
credentials, account IDs or webhook URLs. Direct client access is denied.
`managePaymentRoutingPolicy` is restricted to Finance/Admin Owner and validates
the organizer, expected revision and full replacement. The transaction writes
the policy and existing admin audit log together. Only the most recent exact
actor/payload retry replays; an intervening edit requires fresh review.

The shared payment routing snapshot freezes the selected adapter, mode,
currency, merchant country, policy revisions, merchant/destination accounts,
fee amount, transfer allocation, settlement hold and immutable provider
configuration reference. Its contract is provider-neutral;
checkout public keys are optional for providers that do not require them.
The routing registry resumes only the recorded adapter and never reselects an
account from current defaults. An absent adapter fails explicitly. Configuration
alone does not establish provider or country eligibility. New form-fee attempts persist this snapshot before provider order creation.
Legacy OAuth-only ledgers remain recoverable. Route ledgers have a null
`connectionId` and use the platform account as `accountId`; OAuth ledgers retain
the merchant connection. The configuration command alone does not activate
provider setup or establish live payment acceptance.

`organizerPaymentConnections` binds one organizer to one Razorpay merchant,
mode, verified merchant webhook and pinned Secret Manager credential version.
`organizerPaymentOauthStates` stores only a hash of one-use, manager-bound,
expiring OAuth state. Tokens and webhook secrets never enter Firestore or
client projections. Refresh rotation has an exclusive durable lease; uncertain
rotation requires reconnection. Disconnection blocks new checkouts while
retaining server access to settle existing payments.

`organizerFormPayments` freezes the fee, merchant, verified respondent,
version, draft revision and answer hash before creating an order. The draft's
`paymentAttemptId` prevents editing; `organizerForms.pendingPaymentCount`
reserves capacity (legacy omission means zero). Finalization decrements the
reservation and creates exactly one normal response in the same transaction.
A late capture after release, or a missing/changed frozen submission, enters
idempotent refund processing rather than creating an application.

`organizerFormPaymentWebhooks` stores minimal signed-event receipts. Raw bytes
are verified against the bound merchant or platform secret and account before
persistence; provider state is then re-read by a retrying worker or recovery
sweep. Platform receipts have null `connectionId` and a pinned
`platformConfigurationVersion`; OAuth receipts retain a connection ID. A
platform callback can trigger only a matching Route form ledger, whose own
saved profile governs financial mutations. Public callers cannot select
arbitrary historic platform secret versions. Receipt retries and payment
recovery remain independent of current routing defaults and OAuth readiness. Only a
persisted response yields completion/redirect data. Checkout callbacks, fees,
CRM conversion, review, event admission and room membership are separate.
All four collections deny direct client reads and writes. The source and
partner setup boundary is specified in [Host Forms](host_forms.md).
Recovery isolates processing, reservation expiry and rescheduling errors per
record. Four bounded workers prevent one slow merchant from serializing the
batch; the sweep leaves unstarted work eligible when its run budget is spent.
Manual-review payments release expired reservations without automatically
retrying capture/refund or clearing their review status.
Provider replays also preserve financial review: original-payment capture or
refund updates cannot clear a duplicate-capture anomaly. Refund totals still
advance for the original payment; another payment's refund never overwrites
that identity or amount. A reviewed checkout cannot initiate another capture.

The authorized response-detail projection includes its financial ledger row
through one deterministic draft-to-payment point read. Organizer, form, version,
draft, respondent and response links must all match before money or provider
references are returned. Free responses have no payment row. Refund and manual
review states remain financial facts and do not change application review.

`findOrganizerFormPayment` resolves the public form id with a bounded unique
lookup, then scans a bounded recent window for the authenticated respondent's
newest recoverable form payment. Newer expired or refunded attempts without a
response do not conceal an earlier paid receipt or financial review; a
saturated window fails explicitly instead of silently declaring no payment.
Discovery does not call the provider or depend on the current published version,
fee, availability or browser storage. Ended attempts without a response do not
block a fresh start; completed responses remain recoverable, including refunds.
Client session generations discard late lookup, checkout and error results
after account or form changes. Reading an ended or manual-review payment never
retries financial mutations.


### Form messaging decisions

`organizerFormResponseDrafts.messagingDecision` stores independent organizer
application/event operations, organizer future-event marketing and Catch
future-experience marketing choices for `form-whatsapp-v2`, each with its own
decision timestamp and reviewed server copy. All choices start unchecked.
Legacy v1 organizer/Catch choices remain phone-verified-first; ambiguous v1
form copy does not gain new operations or marketing scope. Missing choices grant
nothing. Paid checkout includes choices in the frozen-content hash; finalization
and free submission write the consent outcome atomically with the response.
The submitted organizer response does not expose Catch's private preference.

An unverified v2 positive choice creates a private
`formCommunicationConsentIntents/{responseId}` only when the submitted source
provides a valid WhatsApp endpoint. This is pending evidence, not a permission.
`promoteFormCommunicationIntent` requires the signed phone claim to match that
exact endpoint and the caller to own the submitted response by respondent UID
or its withdrawal bearer. It rechecks form/version/response lineage, immutable
copy hashes, timestamps, deletion and withdrawal before atomically promoting
each selected principal and purpose. Replayed requests return current state;
an older intent cannot reverse a later STOP or purpose withdrawal.

Organizer decisions use `organizerCommunicationPreferences` and
`organizerCommunicationPermissionReceipts`. Catch decisions use separate
server-only `catchCommunicationPreferences/{uid}` and
`catchCommunicationPermissionReceipts/{receiptId}`. Neither can authorize the
other sender. A newer withdrawal wins over a delayed submission/capture, while
replayed finalization is idempotent. Account deletion removes these preferences
and receipts, and a deletion tombstone prevents a late payment from granting
consent again. `listParticipantMessagingPreferences` lists only the signed-in
UID's permissions, with at most 30 organizer rows and a document-ID cursor.
Confirmed opt-in requires matching grant evidence. The exact authenticated
`/settings/whatsapp` route remains available before profile setup.
`withdrawParticipantMessagingPermission` stops one chosen purpose or the whole
sender, preserving SMS and other organizers, and writes an immutable
`participantSettings` receipt. Catch has marketing only; its withdrawal receipts
have a null source organizer. Sender-wide STOP covers both active and pending
purposes. The reviewed receipt is an optimistic fence; fresh and replayed
withdrawals return the current canonical purpose projection rather than an
optimistic local state. Decision ordering allows an explicit newer grant after
an earlier STOP but never upgrades an ambiguous legacy receipt. Withdrawal
timestamps also fence older pending form payments. No profile or phone
re-verification is needed to withdraw account permission. The UI discards
results after account changes. Campaign selection and send-time dispatch check
marketing purpose; new form-originated managed WhatsApp delivery remains
provider-disabled. Existing event-service permission paths are independent.

### Event application approval notifications

`eventApprovalNotificationPreferences` and immutable
`eventApprovalNotificationReceipts` record a separate event-specific service
choice for the current authenticated guest. Phone updates (WhatsApp with SMS
fallback) and email updates start off and can be skipped independently.
`manageEventApprovalNotifications` fences the expected UID and preference
revision and requires current verified ownership of each selected endpoint.
These receipts grant no marketing, attendee, admission or booking authority.
Existing form choices do not implicitly enable this workflow.

Dispatch rechecks current application approval, response access, organizer,
event, account and receipt. A newer organizer event-operations withdrawal or
sender-wide WhatsApp STOP suppresses the phone lane; a newer SMS withdrawal
also blocks fallback. Marketing-only withdrawal does not stop approval updates.
Only a fresh explicit event choice can supersede an older withdrawal. Email
remains an independent choice. Raw endpoint preferences and receipts are removed
on account deletion; deletion tombstones also fence late work.

Server-only settings, budgets, messages and dispatch proofs use the shared
Operations and delivery outbox. Disabled or missing settings cannot send.
WhatsApp must fail technically with confirmed evidence before SMS becomes
eligible; an uncertain outcome cannot trigger fallback. Email and SMS provider
acceptance means submission, not delivery. Provider activation and the
replaceable email transport are owned by the
[web guest journey](web_surface_architecture.md).

### Private form profile preparation

`participantFormProfileProposals/{responseId}` is a server-only, response-bound
set of pointers to nonempty submitted answers explicitly designated
`catchProfile` or `organizerCard` by the immutable form version. Ordinary custom
questions and legacy canonical mappings do not create these pointers. Creation
requires the verified respondent and current form disclosure and joins the free
submission or captured-payment transaction. Pending payment does not prepare a
profile. Duplicate core-field assignments and more than 100 designated fields
are rejected before publishing.

This collection is neither a claimed Consumer profile nor the reviewed portable
`participantIntakeProfiles` cache. It does not write `users`, `publicProfiles`,
CRM notes, grants or room membership. The immutable response and protected form
uploads remain the answer source, avoiding copies of private data and public
upload URLs. Participant review resolves only the designated pointers after
checking UID, organizer, form/version, current response status and deletion
tombstone in one transaction. Withdrawing the source response makes it
unavailable; account deletion removes the pointers. Claimed profile updates,
image transfer, participant-owned cards and explicit event sharing are separate
operations and must not infer permission from these prepared pointers.

`listParticipantActivity` and `getParticipantActivity` return only the
authenticated account’s own submitted form metadata, independent of profile
claims or verified-phone grants. The point and page adapters share exact UID,
response/version scope, notice, captured identity, timestamps, withdrawal and
account-deletion proof. Lists query `respondentUid`, scan at most 31 rows in
one read transaction, cache each immutable version within that transaction,
and advance subject/source-bound cursors across omitted sources. Answers,
contact endpoints and Host notes are excluded; a configured event target
does not prove booking or admission. Anonymous responses remain unowned.

`beginOrganizerFormResponse` may receive an explicit `reuseResponseId` for
compatible organizer-only answers from the authenticated respondent’s own
submitted response to the same form. It shares the account source proof inside
the draft transaction, including exact organizer/form/version, notice,
withdrawal and deletion checks, before any draft write. Suggestions require
participant-review prefill on both immutable questions, unchanged semantic
identity and destination, and the same current answer validator used by manual
edits. Changed notices, file/signature/acknowledgement questions and unrelated
forms do not reuse answers. `prefillSource` identifies the immutable origin;
answers, consent and messaging choices remain unaccepted until reviewed.
Historical submissions and versions remain unchanged. Portable profile intake
keeps its existing separate rules; no organizer-answer cache or new person root
is introduced.

`getParticipantFormProfile` resolves only the verified owner’s designated fields
and returns current editable core values, core/intake revisions, and selected
private-card question IDs. `listParticipantFormProfiles` queries the verified
UID with a bounded document-ID cursor, then revalidates every source before
projecting a summary. Withdrawn sources are skipped; an empty scanned page may
still have a continuation cursor. No caller-supplied UID or organizer filter
can expand this scope. `claimParticipantFormProfile`
requires explicit reviewed core values, selected question IDs, and versioned
claim terms. It atomically updates `users`, private `participantOrganizerCards`
answer pointers and a payload-bound `participantProfileClaimReceipts` receipt.
Concurrent retries reuse the receipt; a newer core/intake revision aborts stale
review. Normal `updateUserProfile` edits increment the same core revision.
LinkedIn retains its existing private `participantIntakeProfiles` destination.
Verified phone always comes from Auth, never an editable answer.

New claimed identities have `profileComplete=false`, empty dating preferences
and discovery disabled. The server schema permits empty preferences for this
path; existing client initial-create, booking and social-readiness gates remain
unchanged. Claiming does not admit someone to an event or grant room sharing.
Owner cards contain only selected applicant-answer pointers, never CRM notes,
tags or private review fields. Card reads must revalidate the source response.
Account deletion removes proposals, cards and claim receipts.

A selected form photo must still match the owned response, form, version, draft
and question. Its bytes and digest are verified, safety checked, stripped of
metadata and copied to owned profile media with a thumbnail. Original private
form URLs are never promoted. The commit rechecks response withdrawal, account
deletion and profile revision after image processing. Consumer form review lives
at `/you/forms/:responseId`; the authenticated directory is `/you/forms`.
The own-profile Forms & cards tab uses the same directory, including when the
Consumer profile document is missing, loading or failed. The exact authenticated
`/you`, `/settings`, directory and response-review routes are available before
dating setup; adjacent routes are not implicitly exempt. Booking and social
gates remain unchanged. Selection is explicit, retries reuse a payload-bound key,
and account changes discard retained review data. `getParticipantFormPhoto`
returns only a bounded metadata-free JPEG preview in memory, never the original
upload URL or a storage grant. It verifies the phone-authenticated owner and
exact response/question/asset before reading pinned, digest-checked bytes, and
rechecks ownership, withdrawal, deletion and expiry after processing. The UI
enables photo selection only after successful image decoding and evicts its
private decoder cache entry on disposal. Claim still independently validates
and safety-checks the original source. Event-scoped card sharing requires the
separate explicit grant described below.

Free and paid submission receipts expose `profileReviewAvailable` only after
revalidating the active owned proposal. The public completion page offers the
Consumer web review route when true, alongside the organizer's completion
action and withdrawal. The link contains only the response ID, never an answer,
contact detail or authentication token; the destination requires sign-in and
rechecks ownership. It does not bypass claiming, admission or sharing consent.
Production uses the registered Consumer domain. Other environments require the
build-owned `VITE_CONSUMER_APP_URL` origin (HTTPS or a local loopback HTTP URL);
without one the completion page omits the link rather than crossing accounts
into production.

### Event chat access

`eventChatRooms/{eventId}` is the organizer manager's explicit room control
for an event conversation. It can carry an optional, manager-selected open and
close time; no production schedule is inferred from the event. Before the open
time and from the close time onward, access is closed. An explicit close or
archive also closes access, and archive is terminal. An open room permits
joined members to read and post; announcements-only permits all joined members
to read and managers to post announcements; pause permits reading and safety
actions but no posting, reactions or new typing.
`eventChatMemberships/{sha256([eventId,uid])}` records the participant's
explicit join/leave and mute choices and versioned room terms.
`getEventChatAccess` and `updateEventChatAccess` own these records; all direct
client access is denied. A room does not create event admission, a dating match,
a public profile, or an organizer-card sharing grant.

`listEventChats` discovers the caller's candidates from memberships, native
participations and linked operational attendees in that order. Each request
scans at most ten candidate records plus lookahead; a UID-bound cursor advances
across sources, including empty pages after revoked candidates are filtered.
Every returned event is active and passes the same current admission check.
A membership row discovers an ID only and never preserves revoked access.
Deleted-account checks cover even empty scans. Directory responses contain room
access metadata, not messages, answers, participant profiles or private cards.

Every access reads current organizer authority and current admission in the
same transaction. Guests need a `signedUp`/`attended` participation or exactly
one linked `registered`/`checkedIn` operational attendee for this event and
organizer. Contradictory projections, duplicate linked attendees, cancellation,
waitlisting and foreign identity bindings fail closed. A runtime identity alone
is not admission. Joining also requires verified phone identity and an
intentionally created Consumer profile (completed onboarding or a reviewed
profile claim timestamp); a revision number or private form proposal alone
never qualifies. A claimed form
profile may join without enabling dating discovery or completing dating setup.

Organizer managers can schedule, open, pause, limit to announcements, close or
archive a room; guests cannot. Message reads require an active event, a readable
room mode and the caller's joined membership. A cancelled
event or revoked admission disables access immediately, regardless of the
membership record. Leaving remains possible after admission is revoked or the
event is removed. Removed and banned members cannot read, post or rejoin from
an old invite or retry. A manager-only, revisioned `manageEventChatMember`
action can remove or ban; explicit reinstatement requires current event
admission and returns the person to `left`, requiring a fresh verified join.
Ordinary leave does not ban a later eligible rejoin. Account deletion removes
membership and private action
receipts; its tombstone prevents replay from restoring access.

Mutations bind `expectedUid` to the authenticated account before any reads or
writes. A token/account change during an outgoing request cannot send a previous
account's draft, reaction, typing state or join decision as the new account.
Mutations also use a reviewed revision and UID-bound request ID.
`eventChatAccessReceipts` prevents an old join or open retry from reversing a
later leave or close. Replay results report the originally applied revision;
clients must refresh current access, not interpret replay as current permission.
`sendEventChatMessage`, `listEventChatMessages`, `setEventChatReaction` and
`setEventChatTyping` read that same current authority on every active operation.
All message, reaction and presence documents are server-only. The chat reader
returns only a claimed display name and message fields, never an entire user
profile, private organizer card, CRM record or form submission. Explicit card
sharing needs a separate grant and is not implied by joining or sending.

`eventChatMessages` has a monotonically increasing per-room sequence. Sending
uses a UID/event/request-bound ID and payload hash; duplicate retries neither
send twice nor overwrite another payload. Room close/reopen preserves sequence.
Replies store a same-room message ID, never a copied quote. Reads resolve each
parent again, hiding removed messages, deleted accounts and both directions of
a block from message bodies, names and reply previews. Message pagination is
bounded to 30 rows plus a lookahead with a sequence cursor. Prior messages from
a participant who leaves remain history; account deletion redacts their text
and identity. Existing text moderation blocks prohibited writes or atomically
creates a review flag while leaving flagged text visible.
Announcements are message records with a server-validated kind, not a separate
renderer or permission source. Only a current manager can author them, and an
announcements-only room rejects ordinary text. The history projection marks
readable announcements and redacts kind with other fields when a message is
unavailable.

Room notification delivery is disabled by default. The delivery policy accepts
only a queued message identifier and recipient UID, rechecks current admission,
joined state, mute, room readability and sender status at dispatch time, and
uses a fixed generic preview without message or applicant text. A later
provider/outbox activation must preserve those checks and cannot infer
WhatsApp permission from room membership.

`actOnEventChatMessage` offers separate report, block and remove actions. The
server derives the target from an immutable, currently readable room message;
`expectedUid` fences account changes. Reporting requires a reason and writes a
source-bound reference into the existing Catch safety queue, without a public
report or copied message body. Blocking creates the existing global block edge;
all event projections check it, and the existing block trigger closes matches.
Removal is available only to the sender or a current organizer manager and hides
both the message and reply previews. Its original server-only content may remain
for safety review until account deletion anonymizes it. A namespaced receipt and
payload hash make retries idempotent; replay after unblocking never restores the
block. Deleted-account fences apply even to replays. None of these actions changes
event admission or removes another participant from the event.

`eventChatReactions/{sha256([messageId,uid])}` stores one optional reaction per
person; the message stores six anonymous aggregate counts. Revision checks and
namespaced payload-bound `eventChatAccessReceipts` prevent retries or late edits
from double-counting or restoring a replaced reaction. Deletion removes the
person's reaction record; anonymous historical counts on other people's
messages remain. Their own removed messages expose neither text nor counts.

`eventChatPresence/{sha256([eventId,uid])}` stores only a revision and timestamps,
never draft text. Typing expires after 10 seconds and readers recheck current
membership, claimed identity, tombstones and blocks before showing a name.
Compare-and-set revisions prevent delayed starts from undoing newer stops.
Stopping one's own indicator remains possible after admission is revoked;
account deletion removes presence and its tombstone fences subsequent writes.
The reader returns at most 10 visible typing names from a bounded 11-row
candidate query; this is a presence hint, not a member census. Client transport
and UI must discard cached room content when access fails or identity changes.

`listEventChatParticipants` scans at most ten room membership candidates plus
lookahead in one transaction. Viewer and every visible subject must still be
admitted, joined and claimed; both block directions and account deletion hide
identities. The projection contains only UID, claimed display name and current
host/attendee role. No contacts, form answers or CRM fields are returned. Cursors
bind the viewer and event, and may advance over empty filtered pages. The client
revalidates every loaded page and discards names on failed authority checks,
account changes and backgrounding. Opening a person uses the separately gated
profile projection below, including that person's explicit sharing choices.

### Event participant profile sharing

The private form review returns the current `cardRevision` alongside organizer
ownership and claim time. Sharing clients must preserve these fields rather than
infer ownership from a form title or organizer display name.

Joining shares the claimed display name only. `getEventChatProfileSharing`
returns the caller's private choices and eligible core field/photo identifiers.
`updateEventChatProfileSharing` saves an explicit event-specific selection in
server-only `eventChatProfileShares`, with verified phone identity, reviewed
profile/card/membership revisions and a payload-bound replay receipt. Records
store selected identifiers, not copied answers. Leaving and rejoining cannot
revive a previous selection. Own settings and revocation remain available after
admission cancellation, room closure or event removal; deleted-account fences
still apply. Account deletion removes the sharing record.

`getEventChatProfile` requires both viewer and subject to be currently admitted,
joined, claimed and unblocked in either direction. Its bounded projection can
include selected core fields, a reviewed owned profile photo, and selected
applicant-submitted answers from this event organizer's claimed card. Contact
information, date of birth, dating preferences, CRM notes and other organizers'
cards never enter this projection. Core fields/photo require the reviewed user
profile revision; card answers require the reviewed card revision and an active,
owned, claimed form source. Changed or withdrawn sources disappear, without
fallback to another answer or cached copy. Custom file answers remain private;
only approved owned core profile photos can be shared through this reader.

Photo reads pin the Storage generation, cap input size, strip metadata and
return a bounded JPEG preview rather than a reusable download URL. A second
transaction rechecks all permissions and selected source revisions after image
processing. Selection and viewing interfaces must discard stale cached values
when the signed-in account changes or current permission fails.

### Workspace Field Acquisitions And Community Membership

`workspaceFieldAssertions` and `workspaceFieldDecisions` are private,
server-owned evidence for the typed `program | community` workspace reference.
The implemented adapters acquire program guest/household name, phone and email
from explicit manual writes and stable manifest rows. Organizer, program,
relationship, source/version, actor and acquisition time are exact; a contact
pointer, endpoint or Auth UID never supplies field provenance or project access.
Current guest/household values and selected assertion pointers are projections.
Imports preserve a valid selected value and bounded alternatives; explicit
coordinator choices append a revision-bound decision without erasing history.
Missing, foreign or corrupt evidence restricts reads and sends; no private
Catch-profile fallback is used. Community/form acquisition adapters remain open.

Manifest preview and each commit chunk require one program-wide
`guestRelations` assignment, or existing manager/coordinator authority. Separate
station assignments cannot combine into whole-program access. An explicit
program grant can authorize a client/parent; a label or organizer follow cannot.
Manual upserts/conflict choices remain coordinator-owned. Campaign final claims
recheck selected phone proof, consent and household binding after reservation;
exact program retention removes both field ledgers and their projection pointers.
Deleting an acquisition/review actor does not erase another guest's evidence.

`organizerCommunityMemberships` holds one current active/revoked organizer/UID
grant with revision and exact immutable last-decision pointer.
`organizerCommunityMembershipDecisions` retains actor, reason, approving source,
previous/resulting revisions and exact request identity. The explicit
`decideOrganizerCommunityMembership` callable requires current manager authority
inside the transaction. A new grant consumes the exact approved native generic
organizer-target application and UID-owned submitted response/version. Legacy
application, imported/manual and review-exemption adapters remain open.
An old grant replay reports its original decision and current state; it cannot
restore authority after revoke. Following and form-answer access stay independent.

Native booking/checkout, waitlist, review approval, offers and free promotion
read the current grant and immutable decision for membership-gated events.
Membership never waives event review, invitation, capacity, cohort/ratio or
payment. `eventParticipations.communityMembershipAtSignup` retains the grant
revision/decision used at admission. Revocation fences new bookings; an existing
signed-up/attended replay and historical paid admission remain intact, with
cancellation/refund owned separately. Public OTP/form-offer and Cross Paths
membership-gated continuations remain closed until their owners consume the same
current authority. The authenticated viewer callable below exposes current
facts for Consumer booking actions.

Account deletion's processing tombstone fences new decisions; cleanup deletes
membership edges and decision receipts by subject `uid`. Decisions for other
subjects retain their actor/source proof when their reviewer deletes an account.
Direct client get/list/create/update/delete is denied for all four collections.

### Authenticated Event Viewer Read Source

`getEventViewerState` is an Auth/App-Check-protected, rate-limited callable over
`readEventViewerStateSource`. Its strict request accepts no subject UID or
organizer override; its response includes no private fields or checkout keys.
One transaction reads the Auth-derived UID's public event, deletion
state, native participation, current grant, review, policy, capacity/holds,
schedule and seat-identity proof. Membership, review, future eligibility,
payment, admission and attendance remain separate facts. It shares
`signupPolicyDecision`, canonical schedule reads and the existing seat planner;
it never applies plans, creates identity aliases, reserves seats or sends OTPs.
A native payment pointer does not establish payment. An optional owned public
payment uses `projectPublicPayment` and its immutable receipt/current roster
proof in the same transaction, with checkout credentials suppressed. Public
paid admission requires neither a Consumer profile nor native participation.

Each candidate query reads at most 101 rows; an incomplete source closes future
booking. Private visibility, external continuations and imported-guest linkage
need their owning adapters and remain unavailable here. Admission history
survives revoked membership, while new booking still checks current profile,
review, invite, capacity, cohort/ratio and schedule. Policy and inventory
revisions describe an observation, not a reservation or later write authority.
The final native booking transaction also rechecks persisted host review,
preventing a stale preflight approval from admitting a declined request.

### Private Program Functions And Guests

`programFunctionGuests/{functionGuestId}` is the per-function invitation,
RSVP, and door-attendance join record under `organizerPrograms/{programId}`;
the document id is the deterministic `${functionId}_${guestId}` join key so
invites and reviewed responses upsert idempotently. Per-function truth lives
only here: `programGuests.rsvpStatus` is a server-maintained rollup (any
attending -> attending, else strongest other response) and writers never set
it directly, and `programFunctions.expectedCount`/`checkedInCount` roll up
`partySize` over attending and checked-in rows. `programFunctions` may carry
`dressCode`, `instructions`, `venueLocation`, `invitationMode`
(`allGuests` treats every invited program guest as implicitly invited,
`selectedGuests` reads only rows marked `invited`), and `checkInEnabled`.

`programDoorJournal/{journalId}` is the append-only door-attendance fact
log: `recordProgramDoorJournal` hashes each operation's scope, function,
guest, action, timestamp, and actor into the document id so device retries
and offline outbox replays collapse onto one entry. Every appended fact
also updates the `programFunctionGuests` row and recomputes
`programFunctions.checkedInCount` inside the same transaction; rejected
operations report per-operation reasons (`alreadyCheckedIn`,
`notCheckedIn`, `functionCheckInDisabled`, `duplicateJournalId`,
`invalidTransition`) without blocking the batch's valid writes.
`getProgramFunctionDoorView` is the scoped read side of the same lane:
door-duty holders (`functionCheckIn`, `functionLead`) receive the
function header, live counts, a roster restricted to display names and
operational attendance fields — never contact details — and the recent
journal tail. `createProgramWalkIn` is the narrow door-scoped writer for
unlisted arrivals: it derives the `programGuests` id from the caller's
`clientOperationId` and atomically records a `walkInCreate` journal fact,
so offline outbox replays collapse onto one guest. The broader
`upsertProgramGuest` stays coordinator-only; door staff never gain
program-guest write authority beyond walk-ins. The program work-access
response carries scoped `functions` headers for door duties so the
work shell can render door links without exposing the guest directory.

`programGuestGroups/{groupId}` is the organizer-defined grouping record:
`programGuests.groupIds[]` is membership truth, and the group document keeps
the queryable `label`, free-form `dimension` (conventional keys per program
kind — weddings use `side`/`lineage`/`relation`, corporate uses
`company`/`delegation`/`country`), `sortOrder`, and a denormalized
`memberCount` maintained transactionally by guest upserts and manifest
imports. `listProgramGuests` embeds the groups referenced by each page;
`listProgramGuestGroups` returns the full inventory; `deleteProgramGuestGroup`
deletes first and then scrubs member `groupIds` in paged transactions, so
reads tolerate briefly dangling ids. Group labels are unique per
(dimension, program) — manifest `groupLabels` columns resolve entries
case-insensitively per dimension (`dimension:label` syntax, bare labels use
`custom`) and create unmatched groups. The wedding couple-side axis remains
`programHouseholds.side`; groups cover every other cut, including room
allocation and group-targeted Moments.

`programStaffDuty` covers `programCoordinator`, `guestRelations`,
`communications`, `functionCheckIn`, `functionLead`, `airportGreeter`,
`transportDispatcher`, `hotelDesk`, `reconciliationViewer`, and
`stakeholderViewer`; grant and invite duties may scope to `functionIds`,
`pickupPointIds`, or `hotelIds`. `programHouseholds.side`
(`partnerA`/`partnerB`/`mutual`) labels a household's side for reporting,
with display labels configurable via `organizerPrograms.householdSideLabels`.
`organizerPrograms.entitlement` snapshots the granted SKU's limits and
capability allowlist at grant time so program-scoped limit checks do not
drift with later catalog edits.

`organizerCampaigns.recipientSource` names where recipients resolve:
`savedAudience` (default, backed by `savedAudienceId`) or
`programSelection`, which draws from programFunctionGuests/programGuests
with function selection, RSVP-status filters, and household dedupe. The
document field ships ahead of its callable payload and dispatcher wiring;
clients cannot set it through `upsertOrganizerCampaign` today.

### Program Room Occupancy

`programStays` remains the per-guest lodging record. `roomOccupancyId` is a
server-minted shared-room identity; a legacy row without it uses its own stay
ID. Labels, invitation households and social group membership never establish
sharing. An explicit `shareWithStayId` plus its reviewed revision joins a live
stay at the same hotel and block. `separateRoom` mints a new occupancy identity.
The current native room sheet does not yet expose these sharing controls.

`programRoomOccupancy.ts` counts peak simultaneous distinct occupancies over
calendar nights `[check-in, checkout)` in the program timezone. Unknown dates
reserve the entire window; malformed legacy dates cannot release capacity.
Complete bounded snapshots, not old guest-count rollups, own room availability.
Contract windows and `maxOccupantsPerRoom` are hard limits; an unknown occupant
limit defaults to one. This is not evidence of bed type or accessibility.
Multi-timezone properties require explicit property timezones in a later slice.

The stay/block callables require revisions for updates, reject overlapping
assignments for the same guest across hotels, and serialize competing writes
through guest and block documents. Checked-in stays permit only remaining
checked in or checking out; allocation edits cannot move them or downgrade
status first. Desk responses remain hotel-scoped operational projections.
The shared validator is available to future automatic proposals; current
writes are manual and do not publish or confirm a hotel booking.

### Private Lodging Proposals And Membership Evidence

`programLodgingProposals` stores immutable, scoped placement proposals with
source/inventory/layout/published revisions. `programLodgingWorkflows` separates
host approval, hotel confirmation and guest publication; `programLodgingReceipts`
binds each operation to its actor and exact request. These collections deny
all direct client access. The server adapter validates stored document shapes,
proposal content identity independent of map key order, current authority after
reads, and complete approved hotel projections. Its required publication callback
must enqueue canonical stay writes in the same transaction as workflow/receipt
writes. The authenticated `manageProgramLodging` source export uses the canonical
configuration/source/publication adapter; real emulator and combined release
validation remain required.

`workspaceMembershipAssertions` and `workspaceMembershipDecisions` are typed,
program/guest/group evidence beside the existing scalar field ledger. Imports
suggest memberships; explicit included/excluded selections survive re-import.
Canonical `programGuests.groupIds` remains membership truth. Canonical import and
selection transaction adapters are still required; these schemas do not grant
membership or infer room sharing from a household.

All seven private collections join the existing archive retention sweep by exact
program scope. Membership workspace scope and lodging proposal scope must agree
with the archived program and organizer; mismatches block completion. Records
are deleted rather than retaining guest/group pointers as aggregate counts.
The resumable retention journal supports 23 collection phases.
`programLodgingSourceVersions` holds private per-domain counters and complete
source fingerprints; previews persist the prepared fence before search, and
canonical publication must advance its published fence in the same transaction.
The bounded native reader includes all program guests without requiring travel
legs and rejects truncated source. No guest records are copied into the fence. Real emulator
rules, transaction integration and combined feature acceptance remain gates.

### Organizer Application Intake

Organizer applications are a provider-neutral intake domain. A Google Form,
Typeform, Fillout form, spreadsheet, or future native Catch form is a source
edge; none of those providers owns the application model. The immutable
`organizerApplicationFormVersions/{versionId}` snapshot defines ordered
questions, canonical field mappings, participant-prefill eligibility, consent
copy, and retention copy. `organizerApplicationForms/{formId}` owns only the
mutable draft/published pointer and target kind. Publishing creates a new
version rather than changing the meaning of answers already collected.

`organizerApplications/{applicationId}` is the organizer-scoped workflow row:
source provenance, event/campaign target, applicant display projection, status,
review revision, and private reviewer note. The corresponding immutable
`organizerApplicationResponses/{responseId}` preserves the exact answer
snapshot and per-question consent evidence. Canonical contact fields and
organizer-only custom answers remain distinct even when they arrived in the
same spreadsheet row. An application is not the Consumer launch-access
`accessApplications/{uid}` document, a CRM contact, an event booking, or a
public dating profile. The manager accept operation now atomically approves
and creates or links an organizer contact through the shared contact writer.
It resolves a unique active contact by provenance or exact endpoint/linked-UID
candidates; conflicts require duplicate review. An exact retry reuses the
completed result. The contact remains unverified unless already verified and
receives no event booking or marketing permission. Source origins retain the
application-response kind for legacy imports and the generic form-response
kind for generic forms, so contact merges preserve the current People link.

Portable participant prefill belongs in private
`participantIntakeProfiles/{uid}` only after an authenticated participant has
explicitly saved eligible fields. Private-profile and verified-Auth suggestions
may be shown to that participant, but every current form question must be
reviewed again before every submission. Authentication proves ownership of the
private suggestions; it grants the organizer nothing. Portable intake is
separate from `users/{uid}` and cannot overwrite an existing Consumer profile.
An organizer receives only the exact
fields and purpose recorded by
`participantOrganizerDataGrants/{grantId}` for that application/response; a
global phone or email
identity never implies cross-organizer visibility. Organizer-proprietary
questions such as a preferred cocktail remain in that organizer's application
response and are never promoted into the portable profile by default.
The native submission callable creates the response and grant atomically.
Revocation stamps only `revokedAt`, withdraws the review row, and immediately
makes manager list/detail projections mask the participant name and return no
answers or outreach actions; the immutable platform audit snapshot is retained.
Generic Host Form applications are deterministic projections of their exact
submitted `organizerFormResponses` and immutable `organizerFormVersions`.
They use that submission authority and do not fabricate a legacy grant; a
withdrawn, foreign or mismatched source is redacted and cannot be accepted.
Imported/connector data remains organizer-acquired and is labeled separately
instead of receiving a fictional participant grant. Field visibility is not
messaging permission: WhatsApp/SMS opt-in remains
exclusively in `organizerCommunicationPreferences`, and an application grant
cannot create or broaden it.

Customer Details can pass `contactId` to `listOrganizerApplications`. The
callable validates the contact's organizer and availability, then selects
explicit application/contact links plus account links only when the customer
identity is verified. It never matches names or raw phone/email values. The
customer scope is included in its pagination cursor. Listing an application
does not bypass its existing grant checks: the customer page reads the same
permission-filtered detail projection and presents answers as a dated
submission, without copying them into editable CRM fields. Approval still
changes review state only; it does not implicitly create a customer.

The provider-neutral import runtime accepts locally decoded CSV/XLSX tables, requires an
explicit mapping for every source column, imports at most 200 rows atomically,
and records a hash-bound idempotent receipt in
`organizerApplicationImportReceipts/{receiptId}`. Known identity/profile
headers map to canonical fields; all other columns remain organizer-only
questions. Hosts list, search, sort, inspect, and review only through manager
callables. Direct client access to forms, versions, applications, responses,
assets, source mappings, receipts, private intake profiles, and grants is
denied. Authenticated native form load/submission/revocation now use these same
contracts: suggestions are private and review-required, response snapshots are
server-built from the published question version, and grant-aware Host reads
enforce exact question/canonical-field ids. Provider connectors remain source
adapters over the same model, not provider-specific schemas.

The executable policies in `contracts/catalogs/person_fields.json` also bind
the role projections:

| Consumer | Allowed projection |
|---|---|
| Organizer manager | Exact active application grant, organizer-acquired CRM facts and notes, and event-scoped completed/non-refunded revenue aggregates. No payment instrument, billing address, provider secret, private dating/profile, feedback, safety or cross-organizer data. |
| Delegated event staff | One event's display name, ticket/registration state and attendance controls under an expiring grant. No CRM, application answers, campaigns, provider setup, commerce enrichment or contact endpoints. |
| Support | Masked, purpose-specific operational projections only. Raw PII is not the default support view. |
| Safety / Finance / Admin | Only the role- and workflow-specific projection required for the case; every action remains audited. Raw PII is break-glass only, never a universal employee client projection. |
| Catch backend | May reconcile the consolidated identity across private stores to enforce product, fraud, safety, finance and deletion duties, but must return only the projection authorized for the caller and purpose. |

### Provider Sync, Staff, And Offline Attendance

`organizerProviderConnections` contains safe organizer/provider identifiers,
capability coverage, state, freshness and a secret reference, never an API key.
`externalEventMappings` pins one Catch event to one external event and records
which fields the provider can authoritatively supply. `providerSyncRuns` owns
cursor, counts, state and sanitized errors. The implemented Luma poller imports
registration and provider check-in facts through the canonical attendee
reconciler. It does not invent orders, refunds, revenue, referral coverage or
webhook freshness that Luma has not supplied.

`eventStaffGrants/{eventId_uid}` grants a bounded subset of `viewRoster`,
`setAttendance`, `reviewRuntimeClaims` and `publishLiveLocation` for one event.
It records organizer,
grantor, role, issue/expiry/revocation and revision; grants expire within 14
days and are capped at 50 active rows per event. Firestore direct access is
denied. Staff operate through callables and the restricted Host operator route,
which never grants CRM, campaign, import, provider, event-edit or organizer-wide
authority. Organizer managers continue to work without a grant.

The same staff document optionally carries `groupDuties`: a lead, pacer or
sweep duty for each saved group, with its own expiry and reviewed source hash.
`operatorExpiresAt` independently limits the event-wide permissions. Legacy
check-in grants without this field use their original expiry; explicit null
means no event-wide access. The top-level expiry is the latest duty/base expiry
for staff discovery and the existing 50-active-staff cap. Extending a group duty
cannot extend or restore expired check-in access, and revoking the staff row
revokes every duty. Group-only staff have no event-wide permissions.

`getEventAssistanceGroupStaff` and `setEventAssistanceGroupStaff` are manager-only
callables. They authorize before resolving a phone to an existing Auth account,
then re-read manager authority in the transaction. Changes require the reviewed
UID, source hash and staff revision. `eventAssistanceStaffReceipts` makes exact
retries return the original operation revision and latest state. Duties are
limited to 20 groups per person, at most 14 days and the event's staff window.
Event creation generation and saved group configuration bind authority; ordinary
attendance/progress updates do not revoke it. Managers can remove obsolete
group duties. Direct staff/receipt reads and writes remain denied. These grants
authorize scoped progress and membership reads, lead/pacer departures and
acknowledged transfers. Checkpoint/accountability commands and staff UI remain
integration work.

The Host attendance outbox is local client state, not Firestore authority. It
contains no names, phones or emails: only account/event/attendee ids, absolute
desired attendance, expected revision, client operation id, timestamps and
retry/conflict state. Server authority remains `setEventAttendeeAttendance`
plus its 30-day receipt. Local operations review after seven days, expire after
30, cap at 200 and never turn a revision conflict into a silent toggle replay.

Cross Paths visibility is a two-part, private consent contract. The optional
`users/{uid}.prefsShowInCrossPaths` master preference resolves to false when
missing and is never projected into `publicProfiles`. The deterministic
`eventCrossPathsConsents/{eventId_uid}` edge records the per-event choice,
terms version, source, and consent/revocation timestamps. A caller may read only
their own edge; direct writes are denied. The App-Check-protected
`setCrossPathsEventConsent` callable is the sole writer and allows enablement
only when the private global preference is explicitly true, the event is active
and upcoming, and the caller owns a current `signedUp` participation. Disable
remains available after those preconditions disappear. Effective visibility is
the conjunction of both consent values plus later server-owned eligibility;
neither consent document alone authorizes an Explore identity. The optional
`events/{eventId}.crossPathsDiscoveryEnabled` field is a third, Admin-owned
pilot gate that defaults to false when absent. Enabling it is restricted to an
active upcoming Mumbai event (`discoveryMarketId: in-mh-mumbai`), a minimum
six-hour lead, and at most three selected upcoming events. An event may use its
canonical, bounded, organizer-controlled companion inventory policy; all hold,
capacity, payment, and release invariants remain server-owned. Disabling the
selected-event gate remains available and invalidates pending invitations
without silently closing an accepted event plan.

Cross Paths showcase eligibility is independently owned by the audited
`adminSetCrossPathsShowcaseEligibility` callable. The record contains only
`eligible`, `needsReview`, or `paused`, coarse reason codes, rule/review
versions, a SHA-256 public-profile fingerprint, the neutral human-review
checklist, reviewer identity/note, and timestamps. It never contains a numeric
attractiveness or desirability score. `adminListCrossPathsShowcaseCandidates`
projects bounded public-profile evidence plus effective status to authorized
reviewers; support is read-only. Approval requires objective readiness and the
complete checklist. Profile or rule changes invalidate approval at read time.
Firestore rules deny every client read/write, and account deletion removes the
record.

Pre-event Cross Paths suggestions are owned by the App-Check-protected
`getCrossPathsSuggestions` callable. Its typed request contains only a bounded
set of current Explore event ids and an opaque session id. The server rechecks
event availability, schedule conflicts, confirmed candidate participation,
both consent gates, reciprocal preferences, showcase readiness, safety state,
active matches, synthetic scope, and exposure fatigue. It returns at most two
sanitized person/event projections plus a short-lived signed token; roster
documents and private preference values never cross the callable boundary.
`crossPathsSuggestionExposures/{exposureId}` is a deterministic server-only
receipt used for seven-day fatigue and repeated-session stability. Firestore
rules deny every client read/write, the document carries a 30-day expiry for
the environment-owned Firestore TTL policy, and account deletion removes
receipts where the member was viewer or candidate.

Cross Paths invitations are deterministic event-and-sender documents. Only the
two participant ids may read an invitation; every create or transition is
owned by `sendCrossPathsInvitation`, `respondCrossPathsInvitation`,
`cancelCrossPathsInvitationOrPlan`, or a lifecycle trigger. A signed suggestion
token is not authority by itself: send and accept revalidate the recipient's
confirmed participation and either the sender's confirmed participation or
explicit companion-inventory admission, plus the applicable consent,
reciprocal eligibility, current showcase approval, blocks/reports/moderation,
event availability, and one-invitation/one-plan cardinality rules. Invitation state is `pending`,
`accepted`, `declined`, `cancelled`, `expired`, or `invalidated`; timestamps and
invalidation reasons are server-owned.

When an organizer enables reserved companion inventory, an accepted invitation
from an otherwise admissible unbooked sender may reference one
`crossPathsPairHolds/{holdId}` document. The server-owned hold records the
event, invitation, both participants, independent booking states, frozen price
quotes, expiry, release reason, optional payment, and optional event-plan
conversation. Only the two participants may get it; list and all client writes
are denied. `active` means reserved, not booked. Free or paid booking authority
atomically converts it to `confirmed`, creates the requester participation and
event plan, and moves the event projection from `crossPathsPairHeldCount` to
`crossPathsPairConfirmedCount`. Expiry, cancellation, event/participation or
safety invalidation, payment failure, and account deletion release exactly
once. Reserved companion capacity remains within total event capacity but
outside general admission and never changes waitlist rank.

Acceptance creates one deterministic `matches` document whose
`conversationType` is `crossPathsEventPlan`, whose participants are the invite
pair, and whose event id and invitation id remain explicit. It is not a dating
match and cannot drive match celebrations or Event Success signals. Rules allow
participants to read the plan and create messages only while it is active,
unblocked, and before `expiresAt` (event end plus 24 hours). Cancellation,
participation loss, event cancellation, or a block closes the plan; revoking
discovery consent invalidates pending invitations but does not silently cancel
an already accepted plan. Invitation delivery uses the separate optional
`prefsCrossPathsInvitations` preference, which defaults to false when missing.

Each device push token lives at
`users/{uid}/pushInstallations/{installationId}` with `token`, `appRole`,
`environment`, `platform`, optional app version/build, `locale`, `timeZone`, and
`updatedAt`. The client owns this device metadata and rules restrict writes to
the authenticated user plus the known role/environment/platform vocabulary.
Consumer clients attempt the legacy `fcmToken` and installation document as
independent compatibility writes, so an older deployed rule set cannot prevent
the other representation from being refreshed. Each failure is still logged
with its own non-PII resource context.
Notification producers select reviewed templates by stable message id and use
the installation locale when the delivery path supports per-installation
fan-out. English remains the bundled server fallback; notification prose must
not be stored as an unversioned remote document.

## Organizer Follower Posts

Organizer follower posts live under
`organizers/{organizerId}/posts/{postId}` and are created only by the
`createOrganizerPost` callable. Clients may read authenticated posts, but
direct writes are denied. The callable verifies organizer-manager authority,
validates optional linked events against the same organizer, enforces the
rolling three-posts-per-seven-days quota, writes the canonical post, and fans
out durable `organizerUpdate` activity notifications to active followers.
`createClubPost` and the nested club post are compatibility shadows.
Manager Sends history reads the same organizer-scoped collection through
`listOrganizerCampaigns` and returns post identity, audience, status, optional
linked event and timestamps without returning the message body.

## Event Broadcast Receipts

Host event broadcasts use the operational receipt
`eventBroadcasts/{broadcastId}`. Only `sendEventBroadcast` creates or advances
the receipt; account-deletion cleanup may delete a host-authored receipt or
remove one recipient's identifiers and delivery evidence. Direct client reads
and writes are denied. The Host client receives only the sanitized callable
response counts.

Finalization also upserts the durable, organizer-scoped
`organizerBroadcastSummaries/{broadcastId}` history projection. It contains the
event/activity label, audience, recipient count, send timestamp, partial-failure
flag and bounded contact delivery states, but no message body, UID, endpoint or
raw provider receipt. Direct client reads and writes are denied.
`listOrganizerCampaigns` is the manager-authorized, rate-limited pagination
boundary for the Host Sends workspace: it merges campaign summaries, these
Announcement summaries and organizer follower updates in reverse chronological
order using an opaque stable cursor. The queries are organizer-scoped and never
use a collection-group scan.

The callable verifies current event-host authority and freezes a server-resolved
audience from `eventParticipations`. Booked means `signedUp` plus `attended`;
prospective means `waitlisted`. Inquiry threads are never an audience source,
and the broadcast never creates a match, conversation, or chat message.

Each eligible recipient gets a deterministic `eventUpdated` Activity item.
Push is preference-gated and attempted at most once: durable Activity creation
is the retry boundary, so an uncertain retry reports an unknown push outcome
instead of sending a duplicate. The receipt stores hashed per-recipient
evidence for repair and aggregate delivery counts, remains server-only, and
requires the `eventBroadcasts.expiresAt` Firestore TTL policy for 90-day
retention.

## Host Analytics Snapshots

The host-facing `getHostAnalytics` callable may reuse a server-owned response
from `hostAnalyticsSnapshots/{uid}_{scopeHash}` for at most 15 minutes. The
scope hash includes the authenticated uid through the document id plus the
current authorized club ids, resolved absolute range, derived granularity,
preset, optional event id, and IANA timezone. Authorization is resolved before
the cache lookup, so host-role changes produce a different cache identity.

Clients cannot read or write snapshots. The callable validates a cached
response against `host_analytics_response.schema.json` before serving it,
falls back to a live BigQuery build on missing/expired/invalid cache data, and
keeps the existing rate limit in front of both paths. `expiresAt` has a
Firestore TTL policy; account deletion also removes snapshots owned by the
deleted uid.

## Durable Operations Records

`contracts/operations/` owns the portable JSON schemas for resumable business
workflows. These contracts are deliberately separate from public product
documents: an operations work item is review state and evidence, not an event,
organizer, or authorization to publish one.

The canonical record family is run, work item, action receipt, decision, lease,
publication plan, rule proposal, and rule evaluation. `functions/src/operations/`
owns semantic validation, optimistic revisions, reducers, and Firestore
repositories. All corresponding Firestore collections are server-only.

The reusable work-item contract accepts workflow-owned stage, entity, and
outcome tokens. Supply Intake's workflow manifest, runtime validator, backend
policy, and callable response then narrow that vocabulary to one exclusive
`primaryStage` from `incoming`, `verify`, `resolve`, or `ready`. Dedupe, source
verification, policy review, and human review are overlapping flags or
blockers. `published`, `rejected`, `expired`, `cancelled`, and `taken_down` are
lifecycle outcomes and must never be encoded as extra Supply Intake stages.
Workflow manifests also bind lifecycle semantics: non-empty active statuses
plus disjoint published and expired status groups. The generic local runtime
uses those frozen groups for queues, canonical lifecycle projection, counters,
and reconciliation cleanup; it does not require another workflow to reuse
Supply Intake's literal status names.

The local `operations/` runner validates its admin projection against the same
run and work-item schemas with full draft-07/Ajv conditional semantics before
exporting it. Functions repositories and the importer use generated validators
from those same bundled schemas, so a record rejected by the contract cannot be
accepted by a hand-written semantic subset. Human owner/blocker signals require
the canonical queryable task flag, and published or terminal records cannot
remain in the active human-review lane. The live admin surface reads
those durable records through `adminListIntakeOperations`; it cannot enqueue a
run or mutate workflow state.

Organizer discovery candidates are normalized into the bounded
`normalizedPayload.intake` projection on organizer work items. The payload
contains only the reviewed candidate fields required by the Admin queue; it is
not a canonical `organizers/{id}` document and grants no publication,
ownership, crawl, or app-visibility authority. Organizer-only shadow runs may
omit an Event Intake bridge, but remain subject to the same immutable export,
contract validation, and trusted importer.

An explicitly unattributed external event is represented only as
`normalizedPayload.intake.recordType=orphan_event_candidate`. The work-item
contract requires `entityKind=event`, the
`organizer_not_in_inventory` blocker, a null matched organizer, and
`publicationEligibility=blocked_orphan`; it rejects a published lifecycle for
that record. The event's evidence also projects a regular organizer discovery
candidate rather than creating a second organizer schema. Deterministic
auto-attribution records the reused source-mention scorecard rationale and is
the only path that clears the orphan blocker.

Organizer review decisions store approval and surface exposure independently.
`organizerIntakeReviewDecisions/{entityId}` requires `publishStatus`,
`indexStatus`, and `appVisibility`; `approve_public` may keep all surfaces off
or enable a reviewed subset. `indexed` requires `published`, `hold` is
`draft` + `noindex` + `hidden`, and `suppress` is `suppressed` + `noindex` +
`hidden`. Web exposure additionally requires claim-target, takedown, and
impersonation review; app discovery also requires operating-status,
event-accuracy, and unclaimed-affordance review. The shared Functions policy
derives effective event visibility as the minimum of the event request and
organizer ceiling on every surface and refuses a request above that ceiling.
Before this contract shipped, the guarded visibility-decision backfill repaired
the two production legacy approvals (`afterfly` and `bhag`) to their exact prior
`published` + `indexed` semantics; the post-apply dry run reported two current
documents and zero remaining repairs.

Supply Intake `0.1.1` records exact field provenance for the candidate title,
canonical URL, snippet, market, reviewed formats, review note, and review
timestamp. Each entry binds the projected field to an evidence artifact,
content hash, locator, extraction method, extractor version, and confidence.
This is deterministic extraction metadata; it grants no truth, ownership, or
publication authority.

`adminCreateOrganizerDraftFromCandidate` is the only candidate-to-entity
scaffolder. It validates the exact work item and reviewed evidence, rejects
existing-entity matches and duplicate identity receipts, allocates an opaque
Firestore organizer id, and separately reserves the reviewed public slug. It
creates an unclaimed `organizers/{id}` draft with `appVisibility=hidden`,
`publishStatus=draft`, and `indexStatus=noindex`. It also writes the legacy
`clubs/{id}` compatibility shadow, reserves the canonical route, and records a
deterministic `organizerIntakeCurationDecisions/{id}` receipt. The receipt
contains the source work-item, candidate, normalized identity key, public slug,
and target-field provenance and is returned by `adminListIntakeOperations` as
a bounded draft link. Intake review notes remain audited operator context; they
are never copied into member-facing description or source summary. Unknown
description, locality, and public listing descriptor values remain empty until
an operator supplies verified content. No crawl enablement or owner binding is
part of this contract.

The canonical organizer draft also carries a bounded, server-only
`intakeLearningSource` snapshot for fields actually seeded from the reviewed
work item. It contains the source profile, work-item and candidate ids,
field-level extracted values, and artifact lineage; it never contains a raw
provider payload. The legacy `clubs/{id}` compatibility shadow deliberately
does not receive this learning metadata.

When an audited organizer update first changes a value that still equals its
source-seeded value, Functions writes one immutable
`organizerIntakeFieldCorrections/{correctionId}` record in the same transaction.
The record binds source, field, extracted value, corrected value, operator
context, artifact lineage, and a deterministic `fixtureId`. Subsequent
editorial changes do not masquerade as extraction corrections because the
stored value no longer equals the original extraction. These records are
server-only learning evidence; they do not publish content or activate rules.

The trusted shadow-projection importer validates the export again, resets only
the Firestore persistence revision to zero, and retains each local source
revision plus the whole-export hash under reserved projection metadata. It
creates work items before exposing the run, verifies every expected item on
replay, repairs missing items, rejects changed records, and refuses inventory
above the run's frozen `maxWorkItems` budget. Apply also binds the environment
label to its configured Firebase project id and requires project-aware
production confirmation. This bridge writes no `events`, `externalEvents`,
`clubs`, public website projection, or publication-plan record.

Local completed runs hash-bind their full work-item inventory. Reconciliation
creates a new lineage-bound run and new work-item ids rather than mutating the
source snapshot, preserving immutable importer semantics across expiry and
staleness sweeps.

`adminActionExecutions/{executionId}` is the separate remote monitor record for
one admin CLI invocation. It stores action/callable identity, actor roles,
target label, request/response hashes, timestamps, and a bounded terminal
error—not the request or response body. A role-gated callable creates the
`started` receipt before the business callable runs and advances it to exactly
one immutable `succeeded`, `failed`, or transport-ambiguous `indeterminate`
outcome. Browser clients can inspect the bounded projection only through
`adminListActionExecutions`; direct Firestore reads and writes remain denied.

Runs must budget between 1 and 10,000 work items. Imported run metadata carries
authoritative total, active, terminal, stage, and human-review aggregates; the
admin read fails closed unless those totals reconcile. The canonical human
review filter is backed by the committed `operationWorkItems` composite index.

## Organizer Claim Documents

Public organizer claims use a dedicated review collection instead of overloading
host locks:

| Collection / field | Owner | Notes |
|---|---|---|
| `organizerClaimRequests/{requestId}` | `requestOrganizerClaim`, `adminDecideOrganizerClaim` | Server-owned claim queue. Clients create and decide only through callables; direct Firestore reads/writes are denied. |
| `organizers/{organizerId}.claim` | organizer claim callables and admin index-review callables | Public-page claim state, latest request id, review audit, and owner-facing status. |
| `organizers/{organizerId}.ownership` | organizer claim/create/update callables | `programmatic` before ownership, `claimed` after approval. |
| `organizers/{organizerId}.publicPage.indexReview` | admin organizer indexing | Audit evidence for source quality, media rights, cadence, and owner/contact verification before a page becomes indexable. |
| `reviews/{reviewId}.ownerResponse` | `setReviewResponse` | Server-owned owner response rendered by app and website review surfaces. |

`organizerTeamMemberships` owns active owner and manager seats. Legacy
`clubHostClaims` remains only long enough to support released club callables;
it is not organizer claim authority.

## Event Policy Applicability

`contracts/shared/event_common.schema.json` owns the versioned event-policy
bundle invariant. Bundle version 2 couples pricing and cancellation semantics:

- `pricing.basePriceInPaise == 0` requires
  `cancellation.policyId == notApplicable`;
- a positive base price requires `flexible`, `standard`, or `strict`;
- external-companion events remain price-zero inside Catch because the external
  booking authority owns payments, refunds, and attendee cancellations.

Backend event create/update normalization derives this relationship rather than
trusting a client-supplied cancellation value. Version 1 remains readable for
legacy event documents.

## Event Discovery Projection

Explore queries `events` directly through callable-owned projection fields
instead of resolving a city to clubs first. The projection currently covers
city, activity kind, coarse geo-cell, availability bucket, gate flags, and age
range:

- `discoveryCityName`, `discoveryActivityKind`, `discoveryGeoCell`;
- `discoveryHasOpenSpots`, `discoveryAvailability`;
- `discoveryOpenCohorts`, `discoveryWaitlistCohorts`;
- `discoveryInviteRequired`, `discoveryMembershipRequired`,
  `discoveryManualApprovalRequired`;
- `discoveryMinAge`, `discoveryMaxAge`.

`functions/src/events/eventDiscoveryProjection.ts` owns the write-time
projection. Event create/update/cancel, paid signup, and signup cancellation
must refresh these fields whenever event capacity, policy, status, activity, or
location inputs change. `discoveryOpenCohorts` gives Firestore a coarse
viewer-cohort open-slot filter for the standard event-policy cohorts; gated
events still require viewer-specific post-query resolution for invite,
membership, and manual-approval state. `firestore.indexes.json` owns the
supporting composite indexes for city, time, activity, geo-cell, coarse
availability, and open-cohort filters.

Existing remote event docs created before this projection must be repaired with
`node tool/data/backfill_event_discovery_fields.mjs` before a release depends on
the direct event index. The repair is dry-run by default and requires
`--allow-prod` when applying against prod.

Admin organizer search uses a separate server-owned
`organizers/{organizerId}.adminSearch` projection for the admin Organizers
canonical directory. It is not consumed by the app or website.
`adminListOrganizerDetails`
accepts either a single `citySlug` or a bounded `citySlugs` array for
admin-only launch-city work queues such as Indore + Mumbai. Existing organizer
docs can be repaired with `node tool/data/backfill_organizer_admin_search.mjs`; the
repair is dry-run by default and requires `--allow-prod` when applying against
prod.

Admin event search uses a separate server-owned
`events/{eventId}.adminSearch` projection for the admin Events canonical
directory. It is not consumed by the app. `adminListEventDetails` accepts either
a single `citySlug` or a bounded `citySlugs` array for admin-only launch-city
work queues such as Indore + Mumbai. Existing event docs can be repaired with
`node tool/data/backfill_event_admin_search.mjs`; the repair is dry-run by
default and requires `--allow-prod` when applying against prod.

External event supply uses `externalEvents/{eventId}`. These records are
sourced from events Supply Intake imported for a published organizer, preserve
source/dedupe attribution, carry a fail-closed organizer capability snapshot,
and keep Catch booking, payments, reservations, waitlists, and host contact
disabled.

An external event is never more visible than its organizer. The website joins
each event to its published organizer and renders it with that organizer's
robots, so page publication and search indexing follow the organizer at read
time. App discovery lists events by city without reading organizers, so each
event carries `discovery.appVisibility`, equal to its organizer's
`appVisibility` at publication and kept in step by `syncExternalEventVisibility`
when the organizer changes. The app queries only `discoverable` events; an
approved but unverified listing (hidden in the app) shows its events on the
website only.
`adminListExternalEventDetails` lists that collection for admin event-supply
review with the same bounded launch-city and time-window filters.

Supply Intake listing events publish through `adminPublishListingEvents`
(staff) and `onSupplyIntakeListingApproved` (the event publication policy),
both through one writer. Each event of an approved listing is planned by the
Supply Intake import plan and written in its own transaction after contract
validation, the organizer's market, verified capability and app visibility
checks, and accepted waivers, with an immutable
`externalEventPublicationReceipts/{receiptId}` keyed on the caller's
idempotency key; a replay returns the same result and changed input is
rejected. A published event is never overwritten by a later import and a
withdrawn one is never republished. Nothing writes a canonical Catch-hosted
`events/{id}` record. `adminPublishExternalEvent` remains only for the retired
`eventSupplyReadiness/current` snapshot, which no environment has, and is
retired with it.

The governed blockers are `missing_exact_coordinates`, `missing_end_time`,
`missing_location_detail`, `requires_event_defaults_policy`,
`requires_owner_safe_copy_review`, and `duplicate_normalized_event_key`.
Every blocker must be explicitly resolved or waived. A waiver is accepted only
when it cites an accepted `organizerPolicyGapReviewDecisions/{decisionId}` with
the exact expected policy id; code defaults and generic acknowledgements do not
clear blockers.

`adminTakedownExternalEvent` is the only takedown writer. Its dry-run/apply
contract is also idempotent and receipt-backed. Apply preserves the source and
audit record, changes publication state to taken down, and records takedown
metadata rather than deleting the document.

Read-only dry-runs on 2026-05-26 found:

| Environment | Events scanned | Repairs needed | Cityless repairs |
|---|---:|---:|---:|
| `dev` | 146 | 146 | 0 |
| `staging` | 0 | 0 | 0 |
| `prod` | 166 | 166 | 0 |

## Public Page Read Models

`organizerPublicPage/{organizerId}` and `eventPublicPage/{eventId}` hold
exactly what one public organizer or event page shows, so the website server
renders each page from one Admin SDK read (CAT-250). Their contracts are
`contracts/firestore/organizer_public_pages.schema.json`,
`contracts/firestore/event_public_pages.schema.json` and the shared
definitions in `contracts/shared/public_page_common.schema.json`.

- The organizer page holds identity, the owner's live links, upcoming
  events from every source with their booking target, past moments, a
  review summary (verified-only rating, count and distribution of every
  published review) with the latest reviews marked verified or unverified,
  the follower count, claim state, capabilities and today's recommendation
  rail. The event page holds every public event field, a capacity snapshot,
  the organizer card, two reviews and three more upcoming events. Both keep
  today's listing projection (`listing`, without events) so the current pages
  render unchanged until CAT-251 and CAT-252.
- `functions/src/publicPages` builds both from the organizer, its published
  events, its public imported events and its reviews, with a port of the
  website reader's publication and suppression rules and projectors.
  `contracts/fixtures/public_pages` holds the shared parity inputs and the
  expected output the website reader writes; the Functions port must
  reproduce it. A page that fails those rules has no document, and an id
  published as both a Catch and an imported event has no event page.
- Owner links (CAT-254) live in the callable-owned `organizers/{id}.ownerLinks`
  list, which only `adminUpdateOrganizerDetails` writes, after
  `functions/src/organizers/organizerLinks.ts` checks each address (https,
  no credentials or port, a public dotted host, no link shorteners, at most
  2048 characters) and the operator-wording rule. The page carries the links
  still live at build time, pinned first; readers also hide a link once its
  `showUntil` passes. `icon` names what a link is for, and null lets the
  page pick an icon from the address.
- The pages never hold contact details, owner identities, rosters or dating
  framing: no `balanced` admission label, `rotations` experience,
  `singlesMixer` activity, Event Success scorecard or `mutualMatchCount`. The
  schemas reject them.
- Triggers on `organizers`, `events`, `externalEvents` and `reviews` rebuild
  an organizer's pages only when the changed document's public projection
  differs, so bookings rebuild but roster and payment writes do not. Follows
  reach pages through `refreshPublicPageFollowers` every 30 minutes, and
  `reconcilePublicPages` rebuilds every page daily.
- Each commit runs in a transaction guarded by the private
  `publicPageBuilds/{organizerId}` marker: a rebuild that read its sources
  before the last committed one is discarded, so it cannot overwrite a newer
  page or revive a withdrawn one. Unchanged pages are not rewritten.
- All three collections are server-only in `firestore.rules`.
- Backfill with `node functions/scripts/backfill-public-pages.cjs --project
  <id>` (dry run by default, `--check` fails while any page is out of date,
  `--apply` writes, `--allow-prod` for prod). Until an environment is
  backfilled the website assembles a page without a read model from its
  sources under the same rules.

### City plans

`cityPlans/{citySlug}` holds what the website shows for one city: the plans
starting in the next 14 days, how many there are of each homepage format
(run, dinner, games, courts, nights out and other, grouped as
`formatActivityKinds` in `@catch/web-ui`), the
organisers in the city and whether the city is `live` or `launchingSoon`
(CAT-260). Its contract is `contracts/firestore/city_plans.schema.json`.

- Every launched and planned market in `functions/src/locations/marketConfig.ts`
  has a document. A launched city is built only from its
  `organizerPublicPage` documents, so it adds no publication rule of its own.
- A launched city reads as `launchingSoon` until it has four plans in the
  window, so a thin city never renders a sparse page.
- A planned city has no plans. It lists the published organisers joining it,
  projected under the organiser page rules with that city treated as live.
  They carry no page link, because their pages stay withheld until the city
  launches.
- Like the pages it reads, it never holds contact details, owner identities,
  rosters or dating framing; the schema rejects the `singlesMixer` activity.
- An organiser page write rebuilds the cities it left and joined, and
  `rebuildCityPlansHourly` rebuilds every city, which moves plans into and
  out of the window. Each commit is a transaction that discards a rebuild
  which read its sources before the stored `builtAt`.
- The collection is server-only in `firestore.rules`.

## Read Path Discipline

Firestore reads use an explicit surface policy instead of ad-hoc unbounded
queries:

- **Feed and history surfaces** are growing collections. They require a
  reviewed page size, a stable ordered cursor, refresh behavior, and an honest
  `hasMore` state. Realtime first-page listeners are allowed when freshness is
  product-critical, but older history still loads through a cursor.
- **Rosters and bounded working sets** require a reviewed limit based on the
  product's real domain bound. If the domain is not actually bounded, they use
  the feed/history policy.
- **Point lookups** use deterministic document ids whenever the schema owns
  one. A `where(...).limit(1)` query is not a substitute for a known document
  id.
- **Realtime vs one-shot:** route-visible state that must reflect concurrent
  mutations may use `snapshots()` and follows the lifecycle policy in
  `docs/app_architecture.md#realtime-stream-lifecycle`. Discovery/search pages
  may use one-shot pages when they expose pull-to-refresh and revalidate on
  route or tab re-entry. Administrative reports and explicit exports are
  one-shot unless the workflow contract says otherwise.

Repository-owned composite query builders declare adjacent contracts using:

```dart
// firestore-index: events (marketId:ASCENDING,startTime:ASCENDING)
```

`node tool/run.mjs check contracts:firestore-query-indexes` scans every
handwritten Dart data repository and program/transport Functions source,
rejects uncovered statically resolvable composite builders,
verifies each declared ordered field list against `firestore.indexes.json`,
and rejects non-vector one-field composites, with or without an explicit
`__name__`, that Firestore refuses to deploy because built-in single-field
indexes already own those query shapes. Duplicate composite definitions are also
rejected using the same scope, field-order and implicit `__name__` normalization
as the deployment readiness check, preventing duplicate creation requests in a
single deployment.
The check also runs inside `./tool/check_data_contract.sh` and Tools CI whenever
repository data code or the index file changes. Dynamic additions such as a
station filter require an adjacent contract and review alongside the base query.

### Canonical read limits and cursors

`lib/core/data/read_limit_policy.dart` owns the numeric policy and
`lib/core/data/cursor_page.dart` owns the shared `limit + 1`,
`startAfterDocument`, honest-`hasMore` contract. Repository call sites must not
introduce numeric limits directly. `node tool/run.mjs check
contracts:firestore-read-limits` enforces that boundary and runs in Tools CI
and `./tool/check_data_contract.sh`.

| Surface class | Page size | Notes |
|---|---:|---|
| Explore internal discovery | 80 | Primary mixed-feed supply. |
| Explore external discovery | 40 | Secondary outbound supply. |
| General feed/history | 40 / 50 | Feed page / chronological history page. |
| Directory | 30 | Clubs and other entity directories. |
| Bounded operational set | 1,000 | Contract ceiling for rosters and reviewed exceptions; never a browse-page substitute. |
| Search | 20 | Interactive callable result window. |
| Recommendation rail | 10 | Ranked, explicitly non-exhaustive rail. |
| Deterministic lookup | 1 | Prefer direct document reads; use only where no deterministic id exists. |

The first cursor adopters are Explore internal/external discovery, chat
messages, active matches, club/event/user reviews, activity notifications,
Host Customers, and the Host Events timeline. Payment history uses the same
cursor contract. Their realtime methods now expose only the bounded first
page; their repository page methods advance opaque document cursors for older
or additional supply. Host Customers uses the directory page size. Host Events
holds one session boundary and pages active/future events forward and history
backward independently, so time advancing while the screen is mounted cannot
create cursor gaps or re-read the full archive.
Explore accumulates both discovery cursors, shows `N+` while either has more,
and exposes a load-more action. Its map count includes only records with a
complete coordinate pair.

### Feed freshness policy

Every route-visible feed must provide one explicit manual refresh path and
revalidate on a new route/tab session. Realtime first-page subscriptions count
as continuous revalidation while mounted; they still need manual recovery for
offline/reconnect and older-page failures. Explore invalidates its discovery
window, club source, composed feed, and recommendation providers on pull and on
inactive-to-active tab re-entry. Availability and attendance are recomposed in
that same session refresh.

### Reviewed bounded-set exceptions

The following reads are intentionally not cursor-paged because they are
working sets rather than user-browsed histories. Reclassify them and add a
cursor before expanding their product surface:

| Exception id | Reads | Bound / review trigger |
|---|---|---|
| `READ-EXCEPTION-ACTIVE-EDGES` | active memberships, saved events, blocks, event participations | At most one active edge per deterministic entity pair; paginate if inactive/history states join the query. |
| `READ-EXCEPTION-EVENT-ROSTER` | active event roster and host event report | Bounded by the event admission capacity; exports remain explicit one-shot operations. |
| `READ-EXCEPTION-HOST-CLUBS` | hosted/owned clubs for one user | Small authorization working set; paginate if surfaced as an organization history. |
| `READ-EXCEPTION-CLUB-EVENT-SCHEDULE` | one club's event schedule and invite-link set | Operational club/event working sets; history/archive experiences require cursor pages. |
| `READ-EXCEPTION-RECENT-CLUB-POSTS` | seven-day club post quota window | Server-enforced three-active-post quota; the bounded read exists only to calculate remaining quota. |
| `READ-EXCEPTION-EVENT-SUCCESS` | active event-success module/check-in lists | Bounded to one event's configured workflow; archive/history surfaces require cursor pages. |
| `READ-EXCEPTION-RETIRED-SWIPES` | legacy swipe/profile-decision history | No active `swipes/` product read may be added; migration tooling remains dry-run only. |

Every exception above is still capped with
`ReadLimitPolicy.boundedWorkingSet`; the exception waives cursor UX only, not
the Firestore read ceiling.

`CityRepository` is a deliberate availability exception: it logs normalized
backend errors and falls back to the checked-in launched-city catalog so global
city selection remains usable. Launch-access realtime reads, by contrast, fail
through the standard backend error wrapper and never silently downgrade.

## Current Health

Verified in this consolidation pass from current code and registry state:

- Relationship arrays have already been retired from active app surfaces.
- `tool/data/validate_firestore_data.mjs` validates edge documents and parent
  aggregate drift instead of reconstructing from arrays.
- `createEvent`, `updateEvent`, `cancelEvent`, `deleteEvent`, organizer mutations,
  booking/waitlist/attendance, payments, reviews, safety actions, profile
  updates, Places, and event-success write paths are callable/trigger owned as
  documented in `docs/backend_operation_catalog.md`.
- Contract schemas now cover private/public profiles, events, organizers and
  their explicit legacy club projections,
  relationship docs, social/payment/safety/operational docs, event-success
  documents, callable request payloads, selected responses, direct-write
  payloads, prompt catalogs, seed fixtures, and migration contracts.
- Event discovery projection fields are schema-owned, callable-owned, and have
  dry-run-first backfill tooling for older events.
- `tool/check_data_contract.sh` is the main local gate for generated drift,
  schema validation, Functions checks, rules tests, and focused Flutter
  contract tests.

## Historical Event Rename And Organizer Cutover

The older run/run-club rename is complete. The current authority cutover moves
the organization entity from `Club` to `Organizer`, with `club` retained as an
`organizerType` value:

| Old name | Current name |
|---|---|
| `Run` | `Event` |
| `RunClub` | `Organizer` with `organizerType: club` |
| `RunParticipation` | `EventParticipation` |
| `SavedRun` | `SavedEvent` |

Organizer-named contracts, runtime collections, callables, routes, media paths,
and product-facing copy are the current local authority. `Club`-named Dart
types/folders and callable wrappers are compatibility adapters until the remote
backfill and supported-client window are proven. They must not be used to
introduce new club-only behavior.

### Host media galleries

Organizer and event galleries are ordered `UploadedPhoto` arrays with no
product-level item cap. `position` is a non-negative sequence, the first item is
the explicit cover projection (`imageUrl` for organizers and `photoUrl` for
events), and the organizer `logoPhoto` / `profileImageUrl` remains a separate
optional asset that is never inserted into the gallery. Callable and Firestore
schemas intentionally do not declare `maxItems`; they remain bounded by the
underlying callable and Firestore document-size limits, so clients must render
and edit them through a virtualized/scrolling manager rather than an expanding
inline grid. Consumer dating-profile media retains its independent six-photo
policy and grouped `profilePhotos` contract.

Firebase Storage owns immutable image bytes by stable media identity; Firestore
owns presentation order, cover selection, captions, and the active references.
The canonical object layout is:

```text
organizers/{organizerId}/media/{mediaId}/original.jpg
organizers/{organizerId}/media/{mediaId}/thumbnail.jpg
organizers/{organizerId}/logo/{mediaId}/original.jpg
organizers/{organizerId}/logo/{mediaId}/thumbnail.jpg
events/{eventId}/media/{mediaId}/original.jpg
events/{eventId}/media/{mediaId}/thumbnail.jpg
```

Clients may create and compensation-delete only `original` objects for an
organizer owner or active manager. Replacing an object in place is denied;
editing media creates a new stable `mediaId`. Backend Firestore triggers create
the responsive thumbnails only after the URL is attached to the canonical
document, and organizer/event update and delete operations remove originals and
derived thumbnails after the Firestore commit. This separates unordered object
storage from the ordered gallery contract and prevents gallery reordering from
renaming or re-uploading bytes.

Released-client paths such as `organizers/{organizerId}/photos/{position}_{time}.jpg`,
`organizers/{organizerId}/logo/{time}.jpg`, and the equivalent `clubs` and
`events/{eventId}/photos` paths stay accepted during the compatibility window;
their six-slot filename bound is not the canonical gallery policy. Private form
assets remain separate: `organizerForms/...` and `organizer-form-exports/...`
deny direct SDK access and are exposed only through short-lived backend-signed
requests.

Remote organizer backfill is complete in staging and production; legacy
cleanup is intentionally not complete. Follow
`docs/migrations/clubs_to_organizers.md`. Do not delete or reset Firestore data
in dev, staging, or prod without a separate explicit destructive-action
confirmation. Preserve user documents and both canonical organizer documents
and legacy club projections through any remote migration.

If remote cleanup is approved, first export or back up existing `users`,
`publicProfiles`, and old `run` documents for each Firebase environment.
Then copy any host organizations worth preserving into `organizers`, reset
event-specific legacy collections and edges such as old `runs`,
`runParticipations`, `savedRuns`, reviews, event schedule locks, event-derived
profile decisions, and generated demo event documents, and re-run seed/host tooling against
the canonical `events` and `organizers` collections.

## Open Watch Items

- `RELATIONSHIP-DOC-MIGRATION`: watch only. Do not re-add retired arrays.
- `FIRESTORE-RULES-SIMPLIFICATION-001`: keep `users/{uid}` owner-readable only,
  decide the active club-membership read posture for member-list product needs,
  and keep the final direct writes intentionally narrow.
- `MIGRATION-VALIDATION-001`: before applying legacy migration scripts to
  shared beta data, add or keep seeded fixture tests for duplicates, missing
  docs, deleted users, legacy chats, and count mismatches.
- `DELETE-METHODOLOGY-QUEUE`: core account/event/organizer deletion is
  relationship-doc aware; broader historical event/organizer deletion still needs
  product policy before expanding beyond cancel/archive/delete-unused.
- Retired storage rename from `swipes` to `profileDecisions`: keep legacy
  migration/backfill tooling available for validation and cleanup, but do not
  reintroduce production reads or writes to `swipes/`.
- Retired grouped `ProfilePhoto` migration: profilePhotos is the canonical
  profile photo field after the 1.0.1 app-version floor. Keep legacy-array
  cleanup dry-run-first and do not reintroduce `photoUrls`,
  `photoThumbnailUrls`, or `photoPrompts` as canonical contract fields.
- Nested profile activity preferences: `activityPreferences.running` is the
  canonical home for pace, distance, reason, and run-time preferences. Domain
  decoders can tolerate legacy root fields until remote cleanup completes.

## Historical Evidence

Detailed phase logs and old proof commands were removed from active Markdown.
Use Git history when exact historical wording or retired command output
matters.

### Audience automation ownership

`organizer_form_automation_rules` and `organizer_form_automation_runs` remain
server-only. The existing create callable edits with an expected revision;
nullable form scope enables organizer-wide acceptance and attendance rules.
Published answer conditions carry a server-owned version binding. Runs carry
source identity, original occurrence time, due time and fenced lease fields.
Message actions pin a draft campaign revision; at handoff the engine mints a
server-managed companion `organizerMoments` row plus a durable
`automationDeliveryMessages` intent, and the shared delivery core executes the
send. Companion Moments carry deterministic `(rule, action)` identity and are
never organizer-editable. The pre-cutover `automationOrigin` campaign drain
path is removed — no legacy campaigns existed, and ordinary campaigns now flow
only through their own scheduler/worker.
The backend operation catalog owns execution, retry and signed-webhook semantics.

### Event Service WhatsApp Consent Contract

`eventAssistanceWhatsappPermissions` binds the event, attendee creation
generation, verified subject and recipient endpoint to an explicit organizer
sender. Its immutable `eventAssistanceWhatsappConsentReceipts` prove the exact
copy version, displayed sender hash and complete resulting permission hash.
Future-event announcement consent remains separate and is never read as an
Event Assistance grant. The receipt union distinguishes verified-participant
decisions from revocation-only message-link decisions with a null actor UID.
Authenticated endpoint STOP evidence also suppresses the saved preference.

The App-Check-protected `getEventWhatsappPreference` and
`setEventWhatsappPreference` callables require the roster's linked UID. Scope
includes the exact sender ID; most-recently-updated connection selection cannot
silently switch consent. Grants additionally require the matching signed phone
claim, an admitted participant, eligible event, reviewed sender policy and
current verified sender identity. The client submits only scope, decision,
expected revision, request ID, copy version and the previously displayed sender
hash, current nullable STOP-record hash and required grant `reviewHash` from
the read response. The review hash binds organizer/event/attendee/subject,
authored and SDK source generations, event title, consent expiry, full recipient
number, selected sender identity, STOP evidence and consent copy. A changed
verified number needs fresh review even if its last four digits match. Event
replacement or changed consent terms also invalidate an unseen grant. An unseen
STOP cannot be reversed by an older in-flight enable request. Provider
identities, recipient number, consent copy and evidence times
come from trusted server data. The response exposes the sender display name and
business number, masked recipient number and preference state; no provider
account IDs or credentials are exposed.

Credential rotation, health-sync revisions, ordinary clock advancement and
check-in do not invalidate otherwise unchanged reviewed terms; grant-time
eligibility is still checked. Credential rotation and health-sync revisions
preserve permission. A changed
provider account or sending phone requires fresh consent. Display-name updates
do not erase a saved grant, but a new grant must match the newly displayed
identity. Consent expires no later than 24 hours after the event end captured
at grant time; dispatch must also recheck the current event window. Sender
readiness is independent of a recorded enabled preference.

Permission and receipt commit in one transaction. Exact replays return current
state before grant review validation and never reapply an old grant. Revision
conflicts cannot reverse a later withdrawal. The shared
preference transaction adapter maps only the exact closed-transaction callback
RPC error into the SDK's bounded ABORTED retry path. It does not catch commit
uncertainty or reclassify other validation errors. SMS preference and link
withdrawal use this same boundary; paired withdrawal reads are batched. A first
opt-out creates a revoked tombstone without invented grant evidence. Withdrawal
preserves the old recipient/sender evidence even after either changes, requires
the current permission revision but no grant review hash, and
paused, deleted or malformed sender provisioning cannot obstruct it. These
authenticated APIs still require a current authorized event/roster identity;
the independent message-link withdrawal APIs below require neither. Client
access to permission and receipt collections is denied, including with an admin
claim. The required view/grant review hash requires coordinated API and web
bundle rollout; existing tabs must reload the updated client. Native preference
UI and sender activation remain separate delivery work.

`eventAssistanceWhatsappWithdrawalGrants/{linkId}` commits with the dispatch
claim, debits and native reply binding. It pins the original event, attendee
generation, verified subject, recipient endpoint and provider account/phone to
the immutable guest grant hash. A changed identity or longer consent lifetime
requires a new link for dispatch; an existing link cannot silently acquire that
authority. The grant exposes no secret or recipient phone number.

`getEventWhatsappWithdrawal` and `withdrawEventWhatsapp` are App-Check-protected,
network- and credential-rate-limited bearer callables. They return only the
permission state, revision and validity. Withdrawal has the original consent
lifetime and needs no current event, roster, sender or instruction availability.
An expired instruction never regains read/reply authority. Revoked links and
replacement recipients, subjects or provider identities cannot act. Withdrawal
writes a revocation-only immutable receipt and permission revision atomically;
replaying an old request returns the current state without undoing later consent.
A new stop requires the currently displayed revision. It leaves SMS permission,
registration, check-in and organizer announcement preferences untouched. Retain
the guest grant, withdrawal grant and request receipts through this lifetime.

### Event Service WhatsApp Dispatch Contract

`WhatsappDispatchStore` reads event/guest authority, the explicit sender and its
reviewed policy, the original verified recipient, exact consent receipt,
endpoint STOP evidence, CRM pauses/provider blocks, template and scoped guest
link. These facts are read in the same transaction as the outbox claim. The
single-route outbox refuses mixed-route intents; `readFacts` exposes this
channel to the shared composer without silently skipping other channels.
The shared message gate caps all event-service routes at 24 hours after the
current event end, including after a schedule change shortens a previously
granted consent window.

`eventAssistanceWhatsappBudgets` supplies independently approved event and UTC
sender-day ceilings. Budget identity includes currency. Missing, paused, stale,
wrong-scope or exhausted authority withholds the claim. Both conservative cost
debits, `eventAssistanceWhatsappDispatches` material evidence and any native
reply binding commit with the outbox's single unknown attempt. Failure rolls
all of them back. A second outbox still contends on the same spending records.
Unknown/accepted delivery does not release spending or authorize another send.
These records store hashes and scoped references, not credentials, recipient
phone numbers, message text or guest URL secrets. Native payloads are returned
only to the trusted caller. No TTL is applied before reconciliation is defined.

`organizerWhatsappEndpointStops` records the latest authenticated text STOP per
organizer and endpoint independently of CRM contact resolution. It commits with
the signed webhook's receipt and queue item, after transactionally rechecking
an unambiguous provider account/phone connection. Native labels cannot become
STOP commands. Duplicate or older events cannot advance the stop time; absent
or future provider timestamps are conservatively capped at receipt time.
The event preference view reports a stopped grant as disabled. A fresh explicit
grant must acknowledge the current STOP hash and occur later than that stop.
Dispatch requires that later grant and its immutable receipt. Credentials and
sender changes cannot evade an organizer-wide endpoint stop.

CRM admin/provider suppression remains independent. Announcement preference
withdrawal does not revoke separately granted event-service permission. Legacy
CRM inbound-STOP suppression without endpoint evidence stays blocked until
reconciled; the new ledger cannot retroactively prove old consent ordering.
A STOP committed after a dispatch claim prevents later claims but cannot undo
provider I/O already authorized or started.

`EventWhatsappWorker` loads the pinned sender credential before reserving,
claims the exact rendered material and sends once through the Meta adapter
outside the transaction. Submission acceptance is recorded independently from
delivery. A lost response or receipt commit cannot trigger another send. Only
the adapter's proof that permit expiry prevented all I/O can mark an attempt
unsent. HTTP errors and uncertain outcomes retain their conservative debit and
reconciliation hold. The worker requires an explicit provider and is not wired
to a callable, scheduler or live Operations executor.

The worker sends versioned callback correlation containing the attempt and
rendered payload hashes, never credentials, phone numbers or guest secrets.
`WhatsappDeliveryStore` reads the private signed queue and its ingress receipt;
it correlates exact organizer, sender, WABA, phone, recipient endpoint, immutable
dispatch and outbox attempt. Provider timestamps have a five-minute clock-skew
tolerance relative to dispatch and ingestion, not a delivery SLA. The consumer
can recover a lost submission ID from `sent`, `delivered` or `read` evidence.
It merges late/duplicate receipts without regressing delivery, even after event
closure or sender removal; unexpected delivery after an unsent record preserves
a conflict. It does not execute guest choices or grant fallback permission.

`normalizeWhatsappDeliveryStatus` maps only complete signed `failed` status
evidence after that correlation. Technical recovery requires every code to be
`131016` (temporary service failure) or `130429` (throughput limit).
Explicit restrictions (`368`, `130497`, `131031`, `131047`, `131048`, `131049`)
become `policy`; `131050` becomes `suppressed`. A restriction takes precedence
over technical or unknown codes. These classifications stop automatic retries
without rewriting consent or converting a marketing opt-out to an event-service
withdrawal. Unknown codes, `131026`, mixed technical/unknown evidence and failed
statuses without usable codes remain unconfirmed. The first-code field must
agree with the complete list. See the reviewed
[Meta error-code reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes/)
and its [failed status payload](https://www.postman.com/meta/whatsapp-business-platform/request/ocsmpai/status-message-failed).

A normalized failure receipt binds its evidence hash to the attempt, immutable
provider event ID and ingress payload hash. Shared outbox merging preserves
conflicting success/restriction evidence and prevents duplicate state changes.
Technical failure permits the existing delivery evaluator to reconsider an
independently authorized route after backoff; it does not send or refund a
provider debit. A later conflict before the SMS claim withholds that claim.
It cannot recall provider I/O already claimed. The configured Meta API version's
callback echo and terminal-failure behavior still require controlled account
verification before activation. No provider is activated by these changes.

The signed queue's optional `providerErrorEvidence` is a closed union:
`none`, `codes` with one to ten integer codes, or `unusable`. Ingress
preserves code order and duplicates, excludes diagnostic text, and marks the
whole list unusable when any entry is malformed or the bound is exceeded.
The nullable legacy `providerErrorCode` is only the first code of a complete
list. Missing legacy evidence remains readable but cannot establish an
error-free Event Assistance delivery. Positive status plus any error evidence
cannot establish delivery or recovery and retains the spending debit; later
complete signed evidence may resolve an unknown attempt. Unconfirmed outcomes
checkpoint without hot retries. Receipt processing itself has no send authority.

### Event Assistance Accountability Contract

`event_assistance_accountability.schema.json` owns the scoped read, typed
command envelope, response and immutable command receipt. The command names
the assistance episode or explicitly binds its absence; the canonical check-in
and attendance revision independently bind the physical visit. The adapter
uses existing `eventAttendees.accountability*` fields rather than a second
accountability state. All sweep writers advance `accountabilityRevision`,
including clearing. Legacy missing revisions read as zero; overflow fails.

`eventAssistanceAccountabilityReceipts` is server-only. A receipt binds the
actor/request hash, source/attendee generations, visit hash, episode or absence,
applied revision and disposition. It commits with the attendee write. Exact
replay returns the applied operation revision and current view; it never
reapplies an old disposition. Current scoped authority remains necessary on
replay; staff also require current accepted membership for a subgroup. Completion/cancellation do not imply a person
returned. No messaging or participation state is created by this command.
Receipt retention and Host/rehearsal adapters remain subsequent work.

The optional `checkpoint` on read/write scope and response supplies an exact
checkpoint ID and positive departure revision. The receipt additionally freezes
the original roster ID/hash. This branch resolves an original departure member
without requiring event-wide sweep configuration. The absence of this scope
retains existing sweep applicability. Source/read hashes include the frozen
checkpoint evidence; missing or changed receipt scope cannot replay as an event
sweep or another departure. Current registration generations and the departure's
exact check-in/attendance revision must match. The server distinguishes missing
roster, nonmembership, wrong destination, changed visit and changed setup.
Managers retain original-departure review after accepted group transfers; former
group staff do not retain authority over the transferred guest's global result.
All reads now establish scoped permission before fetching attendee or departure
evidence, and writes recheck expiry after the final receipt read. The callback
uses the existing bounded Firestore SDK transaction adapter.

Checkpoint members expose an optional closed `disposition` union: unresolved,
resolved evidence, or unavailable evidence with a reason. Current servers emit
it for every roster member. A resolved value binds the canonical disposition,
positive accountability revision, actor and exact timestamp in a source hash;
the display timestamp is milliseconds. Evidence before departure, after server
time, or from another visit is unavailable. Reported intentions are never used.
Accountability evidence is separate from arrival observations and their review
hash. Request closeout and wake handling for these facts remain subsequent work.

### Event Assistance Channel Selection Contract

`EventMessageWorker` uses one immutable intent and one bounded outbox history
for all permitted channels. It composes the SMS, WhatsApp and RCS workers;
it is a trusted port, not a callable, scheduler or registered live executor.
Only explicitly permitted routes can prepare credentials. Each channel loads
its pinned secret before reservation; a changed sender snapshot makes that
prepared channel ineligible. The production factory now supplies the RCS worker
for an explicit sender when its default-off enablement flag is set. Missing
workers or credentials remain unavailable; enablement grants no send authority.
A malformed source or inconsistent channel gate fails the whole evaluation.

Every route's event gate, consent, suppression, template, recipient and spending
facts are read in the same transaction as reservation, and again at claim.
Channels must agree on the shared event gate and expose exactly their own route.
The shared policy preserves the intent's route order, tries an eligible untried
route before retrying a confirmed failed route, and retains retry backoff and
attempt ceilings. Only the selected channel prepares material, debits its two
budgets and claims the single provider attempt. The channel-specific stores
reject mixed-route reservation so callers cannot accidentally omit competing
channel authority.

A preflight unavailable channel can give way to another independently permitted
and consented route. After submission, unknown or accepted outcomes hold all
fallback even if the original sender, credential or consent later disappears.
Only trusted confirmed technical non-delivery can permit fallback. Policy,
suppression and invalid-recipient rejections require resolution; conflicting
delivery evidence stops a pending fallback claim. Raw Meta failed statuses still
lack a reviewed finality mapping and therefore do not unlock this path. This
composition does not imply provider activation or guaranteed delivery.

An existing unsent reservation keeps its original channel, sender and permission
snapshot. On authorization expiry the outbox records it as unsent; recovery uses
a new bounded attempt and fresh authority, never repurposes the old id. Durable
reconciliation and live Operations integration have their own boundaries above;
their source wiring does not establish deployed scheduling or activation.

### Event Assistance SMS Delivery Contract

The canonical `event_assistance_sms.schema.json` vocabulary supplies private
sender, permission, budget and dispatch documents. `eventAssistanceSmsSenders`
records explicit use-case/header approval, the exact numbered credential
reference, approved template parts and a bounded INR rate quote. It contains
no provider password. Missing, inactive, paused or expired configuration never
implies readiness.

`eventAssistanceSmsPermissions` binds Catch event-service SMS to an event,
attendee creation generation, verified subject, phone endpoint and sender.
The exact consent-copy version, receipt, timestamps, expiry and withdrawal
state are required. Organizer marketing preference records are not permission
for this route. The App-Check-protected preference callables require the roster's
linked Firebase UID. A grant additionally requires the signed phone claim to
match the roster phone and an admitted guest in an eligible event. Client input
contains event/attendee scope, optional sender ID, decision, copy version,
expected revision, expected review hash and request ID. Sender approval, number
and evidence timestamps come from the server. An omitted sender ID retains
`catch-event-sms`; every response explicitly names the resolved sender ID. The required `reviewHash` in each view binds
the verified recipient, exact SDK source generations, event title/window,
current permission and receipt, consent copy and effective availability. New
decisions must echo it as `expectedReviewHash`; changes return current state
as a conflict even at the same permission revision. Ordinary time passage and
registered-to-checked-in progress preserve an otherwise identical review.
Revocation can proceed after fresh review without a ready sender or current
phone claim. The required hash must roll out with the web client; old tabs
must reload. Missing or malformed hashes fail callable validation.

`eventAssistanceSmsConsentReceipts` records each exact decision atomically with
its permission revision. Grant receipts pin the displayed copy hash and the
hash of the complete resulting permission; dispatch requires that matching
receipt. Receipt timestamps record when the signed phone claim was checked,
not when a new OTP was sent. Revision conflicts return current state; replaying
an earlier grant cannot reverse a later withdrawal. An exact receipt replay is
resolved before checking the current review hash and never repeats the write;
changing the hash while reusing its request ID is not an exact replay.
An initial opt-out writes a revoked tombstone with no fabricated consent
evidence. Changed attendee creation stamps invalidate existing consent.
Responses reveal only the participant's masked number,
status, availability and consent text; there is no client collection access.
Sender approval and activation remain separate trusted provisioning steps.

Event-service SMS, WhatsApp and RCS permission documents may now carry the
closed shared `recipientBinding` from
`contracts/shared/event_assistance_message_recipient.schema.json`. New grants
record `rosterPhone` or `privateVerifiedPhone`, the linked UID and exact source
generation. Absence on a legacy permission means the original strict roster-phone
match, never private enrollment. A supported signed Auth phone may be reviewed
privately only when the canonical roster phone is absent. Reads do not persist
it; only explicit channel consent writes the private permission and its exact
receipt. An active private grant retains its reviewed phone until withdrawal,
including when Auth no longer supplies that number. Expired or stopped grants,
and grants for a replaced sender identity, permit fresh review of a changed
signed number with that number's own STOP state. Withdrawal preserves the
original recipient and may return `notSet` for a corrected current recipient.

The same binding is frozen into WhatsApp native-reply records and RCS dispatch
reply bindings. Planning, final dispatch, saved-sender discovery and callback
consumption compare the source generation, linked UID and recipient origin.
Permission collections remain inaccessible to browser/mobile clients and Hosts;
the operational roster remains unchanged. Deploy the updated shared readers and
writers together before enabling enrollment: older strict readers will reject
new records with the additional field. These source contracts do not activate a
provider or establish production delivery.

`getEventAssistanceParticipantContext` resolves only the authenticated caller's
operational attendee identity for one event. A read-only transaction reads the
event and at most two rows matching both event ID and server-owned `linkedUid`.
No match returns `unlinked`; two matches return `ambiguous` without candidate
IDs. A single match is re-read and validated against canonical event/attendee
source facts before returning its scope and a source-generation hash. Cancelled
rows remain in this identity check so existing preferences can still be reviewed;
a booking ID, name, phone guess or status ordering cannot choose a different row.
The response exposes neither contact information nor roster contents. It creates
no link, consent, attendance record or provider permission. The event/linked-UID
index must be deployed with this callable. Native strict readers and an explicit,
account-bound refresh owner reject foreign identities and stale responses,
including sign-out followed by re-entry with the same UID.

Native `EventSmsPreferenceView` and `EventSmsPreferenceChange` model the closed
review and explicit grant/revoke payloads without Firebase types. The read uses
the generated callable DTO; the nested write decision is an immutable authored
adapter whose output is checked against the canonical generated schema. Native
response parsing rejects foreign scopes, unknown/private fields, unsupported
consent versions and contradictory preference/expiry state. The repository
preserves unavailable, permission and malformed-response failures. The
controller binds actions to the displayed review and uninterrupted account,
keeps uncertain writes frozen and displays current replay/conflict state.
The native Event messages sheet mounts the shared per-channel sender controller
through verified attendee identity. Deployed enrollment remains unverified.

`listEventSmsPreferences` selects the saved `catchEventSms` runtime route and
returns participant-owned historical sender IDs from the private permission
collection. The composite index binds live mode, organizer, event, attendee,
consent subject UID and document-ID order. Each page scans at most 51 rows and
returns at most 50; its opaque permission cursor remains valid after that row
is deleted. Generation, linked UID and recipient provenance must still match.
Revoked prior grants remain visible, while never-granted tombstones do not.
Discovery neither grants consent nor proves sender activation. Native and web
use the configured sender for new consent and expose earlier senders only for
withdrawal. Non-default sender receipts include sender ID in their key; legacy
default-sender receipt keys and exact omitted-sender payload hashes are preserved.
The new response field, generated outputs and strict client readers require a
coordinated rollout with this callable and index.

`eventAssistanceSmsBudgets` bounds both event spend and sender-day spend in
Asia/Kolkata. A trusted worker atomically charges both ceilings with the
outbox claim. `eventAssistanceSmsDispatches` keeps one immutable attempt debit,
rendered-material hash and sender/template/permission/quote references. It
also binds the original sender mask and the hash of a random 192-bit reporting
credential. Only the worker receives the plaintext credential, submitted in
Gupshup's `extra` field; decoded delivery reports must prove this credential
and match the dispatch scope before updating the private outbox. The credential
does not authorize a send, opt-in or budget release. Retain the immutable
dispatch and outbox through the provider reconciliation window, independently
of guest-link or event expiry. Cleanup remains unimplemented.
The dispatch stores neither message content, reporting credential nor the guest
URL secret. Conservative debits
remain charged across uncertain outcomes and provider rejections until an
explicit reconciliation implementation accounts for them. They are spending
reservations, not billing receipts. Firestore clients, including admins, cannot
read or write any of these six collections.

`eventMessagingBudgetDecisions` is the server-only, revisioned finance review
record for a proposed messaging ceiling. `adminReviewEventMessagingBudget`
performs the bounded Finance read of one exact runtime, sender, channel budget
pair and current deterministic decision. It returns no credential, private RCS
agent id or guest roster and grants no spending or dispatch authority.
`adminDecideEventMessagingBudget`
reads the event runtime, selected sender and both channel budget scopes in the
same transaction as the decision revision, then binds the result to the exact
runtime, sender, budget-source and complete setup-review hashes. Admin Owner or
Finance authority, a unique request id, current expected revision and admin
audit entry are required. Approval checks currency, event service horizon and
existing conservative charges. The document is not one of the three channel
budget records: its literal effect is decision-only and
`grantsSpendingAuthority` is always false. An immutable
`eventMessagingBudgetDecisionReceipts` row preserves exact request replay even
after a newer scope decision.

`adminApplyEventMessagingBudget` consumes one exact still-current approved
revision. It transactionally revalidates the live runtime, eligible sender,
budget-source hash and both prior budget revisions, review hashes and charges.
It writes the event and channel-specific sender-day budget together, preserves
each conservative charge, increments existing revisions, and binds RCS budgets
to the current private agent id. Both records remain `paused`. The immutable
`eventMessagingBudgetApplicationReceipts` record stores the resulting budget
paths, revisions, limits, charges, windows and hashes plus the decision hash and
admin actor. It is the request-replay and audit companion, not an outbox or
dispatch record. It fixes `stagesSpendingCeilings: true` while
`grantsSpendingAuthority`, `grantsDispatchAuthority`, `providerContacted`, and
`workerActivated` all remain false. A separate live activation boundary is
required to change both ceilings to `active`. Direct client access to the
decision and both receipt collections remains denied, including for Admin
clients.

The dormant `eventAssistanceSmsDeliveryWebhook` accepts a bounded, strictly
decoded GET report and delegates credential/scope validation to the reporting
store. Duplicate parameters, bodies, unknown fields and partial string matches
are rejected before database access. The HTTP response exposes no internal
identifiers or report contents, waits for completed processing, and returns a
retryable service error on infrastructure failure. Delivery reporting grants
no write authority over attendance, consent or budgets. The handler logs no
request material or thrown error, but GET callback secrets also require verified
platform request-log redaction/exclusion before activation. No new persisted
document or client grant is introduced; existing outbox evidence owns duplicate
and contradictory delivery reports.

`eventAssistanceSmsWithdrawalGrants` is created in the same transaction as a
live SMS dispatch claim. It binds the original guest-link hash to one permission,
attendee generation, subject, sender and phone endpoint. Its separate lifetime
ends with the permission captured at dispatch. An expired instruction does not
expire this narrowly scoped ability to withdraw; it grants no event read/reply
access. A revoked guest grant invalidates both uses. Reusing a link for a new
recipient or a longer consent lifetime requires a fresh grant before dispatch.

`getEventAssistanceSmsWithdrawal` and `withdrawEventAssistanceSms` require that
bearer capability, App Check and network/credential rate limits. They need no
current event, roster or sender status, so cancellation cannot obstruct opt-out.
They expose only text status, revision and validity, with no name, phone or event
identifier. Changing the permission's attendee generation, subject or endpoint
invalidates the old capability. Only an explicit mutation withdraws permission;
link reads and previews never do. Its immutable consent receipt uses
`source: messageLink`, the link id and `actorUid: null`; authenticated preference
receipts use `source: verifiedParticipant` and their verified UID. A bearer
receipt can never grant consent. Replayed withdrawals return current state,
including later verified opt-in, and stale revisions require a new explicit
choice. Retention must keep the guest grant, withdrawal binding and deduplication
receipts through this capability's lifetime and provider reconciliation window.

### Event Assistance Guest Response Contract

`eventAssistanceGuests` stores the event/attendee binding, exact roster creation
generation, explicit participation, episode and revisioned reported intent.
Firestore event/roster creation generations also fence source replacement.
It deliberately
does not extend or mutate the admission/attendance projection. Replacing an
episode invalidates all earlier grants. `eventAssistanceThreads` stores one
current message head per guest episode, workflow kind and occurrence; separate
workflow conversations cannot overwrite each other.

`eventAssistanceGuestGrants` contains only the hashed bearer secret and its
thread/guest/episode scope, signing key id, issue/expiry times and optional
revocation. Grants live for at most 24 hours, bounded by the event end when it
is still upcoming. The raw secret is regenerated only for the trusted worker;
it is never stored in the outbox or returned by the public read endpoint.

Guest response acceptance checks the current thread head and intent revision;
joining intent additionally fences the participation revision. The response,
message closure and any intention/help-case effect commit in one transaction.
The response remains in the message for retry deduplication. `eventAssistanceCases`
correlates a help request with the accepted response; comfort/safety categories
are assigned only to the restricted safety owner, other categories to the event
lead. No SDK client, including an administrator, can access any of these four
collections directly. Host projections and case-resolution commands require
separate authorized boundaries before this feature can be enabled.

## Private host Sales records

The canonical organizer remains the identity owner. `organizerSalesAccounts`
is its private Sales companion; contacts, relationships, reviewed evidence,
assistant proposals, tasks, opportunities, stage history, import lineage,
commercial records, and outreach intelligence use separate server-only
collections. Neither `appVisibility: hidden` nor an unclaimed organizer makes
an organizer document private. Strategy, prospect research, scores, contact
endpoints and commercial terms must never be written into public organizer
projections.

`salesProviderAttempts` holds private internal writing-preparation intent and
validated canonical selection/cache receipts. Its immutable job/stage identity
excludes lease renewal; source, scope, public review, policy, provider/model and
request ceilings must still match on dispatch and replay. `salesProviderBudgets`
holds separate run and UTC-month buckets. Their limits are immutable and the
attempt intent plus both ceilings reserve in one transaction before I/O.
Unknown outcomes retain reservations; validated completion reconciles tokens
idempotently while cost remains explicitly `reserved_ceiling`, not an actual
bill. Both collections deny all direct client access, including Admin.
Attempt content enters the reviewed Sales privacy inventory and allowed batch
paths. Deletion requires the permanent organizer processing fence, which
prevents missing intent state from reopening paid I/O. Aggregate budget hashes
and counters contain no prompt, output or canonical person/organizer identifier
and remain retained accounting, explicitly reported in privacy inventory.

The Sales service checks current employee or explicitly delegated authority,
organizer scope, exact request material and record revision. Its transaction
writes the effect and immutable receipt together. Assistant fact proposals
require employee review before becoming qualification evidence. Opportunity
pilot stages require the matching reviewed or active plan. Quote acceptance
records reviewed terms; it does not prove host subscription revenue. Guest
checkout payment records cannot satisfy a host commercial close.

Synthetic demo blueprints, digest-only invitations, sessions and receipts are
private records. Anonymous preview is read-only; verified invited contact plus
an explicit start is required to materialize synthetic state. A demo never
grants organizer ownership, publishes a listing, admits a real guest or charges
a payment. Source contracts and rules tests live with the Sales feature; generated
types and validators follow the existing schema generator.

Sales commercial closing uses owner-attested host collection, bound to the exact
accepted terms, current reviewed payment evidence and a normalized external
settlement reference plus receiving account scope. The unique settlement identity
prevents the same confirmation being counted through multiple evidence records.
Attestation remains provider-unconfirmed and separate from guest payments.
The generic opportunity mutation requires fresh Admin Owner authority before
receipt replay and at transaction execution; stage history retains its finance
proof. Loss and reopening require a reason, and reopening needs a dated next step.

`salesIntakeLinks` joins the exact reviewed Supply Intake candidate generation and
curation decision to its private organizer Sales companion. Explicit identity
selection precedes linking; retry can complete the private join after Intake
succeeded without overwriting an existing account or publishing the organizer.
Imports retain every reviewed cohort/source-row relationship and union cohort IDs
once per account, fenced by the preview's account revision. Unresolved identities
remain in offline review; neither import nor an assistant invents canonical IDs.

### Reviewed demo setup

Confirmed private-demo starts and completions project deterministic Sales
activities only for an existing active Sales account, with opportunity identity
checked against the same organizer. Preview, resume and assistance requests do
not imply a conversion.

A reviewed demo may contain a source-owned Forms template plan. Its content hash
includes materialized defaults; free-text mappings cannot create question logic.
`getSalesDemoSetup` is a read-only completed-session projection.
`prepareSalesDemoFormDraft` requires current verified invitation authority,
canonical claimed organizer state and current Forms manager authority in the
write transaction. It reuses Forms' transaction-level creation owner and stores
one durable `salesDemoSetups` receipt per organizer, blueprint revision and setup
hash. Retrying never overwrites a manager's subsequent edits. Preparation creates
an unpublished organizer-wide draft only; unsupported requirements remain manual.

### Current fit queue and import corrections

The private `salesFitQueueEntries` projection reuses the canonical seven-factor
score evaluator and qualification policy evaluator. Qualification-proof expiry
is separate from score expiry. Unknown factors retain null scores. All account
writes, accepted evidence and assessments invalidate the projection and advance
its generation; cursors bind that generation and both policy identities.
Historical refresh receipts cannot report current success after invalidation.
Bounded refresh and list actions confer no contact or sending authority.

New imports record exact per-organizer effects, account/cohort revisions and
immutable lineage. Admin Owners can preview and apply one exact correction:
remove only import-owned cohorts, or archive an unchanged newly created Sales
companion when no dependent business work exists. A cohort mutation token fences
later imports even when their cohort union is unchanged. Original import rows
and canonical organizers remain intact. Missing legacy proof, ambiguous lineage,
overflow or later cohort changes block correction. A deterministic effect marker
prevents cross-request repetition. Archived companions reject dependent writes
until an employee explicitly reopens them.


### Private Sales source history, reporting and privacy

`salesImportHistoryRows` accounts for reviewed source-row dispositions and
`salesImportHistoryRecords` preserves exact original cells with accepted import
lineage. History has nullable occurrence dates and explicit date certainty;
it is not a current activity, score, contact permission or provider receipt.
Preview/apply bind source hashes and current private accounts. Owner authority,
archive/hold state and the permanent restriction are rechecked before replay.
The history collections also prevent import compensation from archiving a
companion with later business work.

`salesPrivacyRestrictions/{organizerId}` is a permanent private processing
fence. Owner-reviewed `salesPrivacyPolicies`, `salesPrivacyPlans` and
`salesPrivacyBatchReceipts` govern bounded cleanup. Inventory keeps explicit
retained finance/audit records and unresolved external/shared records. Each
batch reads its source hashes and current policy/plan before atomically deleting
at most 20 reviewed records and recording the new cursor. Dependencies are
processed before their attribution parents, and explicit replacement plans
bind the prior active-plan ID. Product organizers, Forms and users remain
outside this owner. A completed internal plan never reports complete erasure.
These six collections deny every direct client read/write, including Admin
clients; only their current-role server operations expose private projections.

The company funnel callable reads accounts, opportunities, tasks, recent stage
history and privacy restrictions in one bounded read-only snapshot. It returns
separate distinct-host and opportunity totals, stage entries and obligations.
Overflow fails without partial totals. It does not infer conversion rates,
provider-confirmed revenue or contact authority.

### Organizer tracking configuration

`organizer_tracking_settings.schema.json` owns server-only validated Meta Pixel
and GA4 public identifiers plus bounded revision/private edit audit. Manager
callables validate generated schemas; writes recheck canonical manager authority,
verified claim or first-party ownership and expected revision inside the same
transaction. Private read projections omit audit and expose server-derived edit
eligibility. The public projection has a code-owned disabled publication gate
and null IDs pending reviewed advertising policy. Public organizer and event
eligibility cannot be supplied by a caller. No new client permissions, provider
credentials, guest information or advertising transmission are introduced.


## Catch-owned controlled support reply (CAT16)

`adminReviewCatchWhatsappInbound` reads one exact immutable inbound text receipt
for the configured Catch sender and verified recipient. `adminSendCatchWhatsappReply`
requires the reviewed text hash, `purpose=serviceSupport`, explicit confirmation
that the inbound requests support, and one bounded reply body. Both require the
configured current support/adminOwner actor, valid session, App Check and shared
rate limits. Neither reads organizer/workspace conversations or enrolls marketing.
The review output is scoped text/hash/deadline; the send output is the saved
operation ID, provider message ID, delivery status and replay flag.

The canonical private documents are `catchWhatsappReplyOperations/{operationId}`,
`catchWhatsappEndpointStops/{stopId}` and
`catchWhatsappReplyReadiness/{readinessId}`. Direct SDK access is denied even to
staff. Operation and STOP records have no TTL; raw webhook receipts keep their
original 30-day expiry and immutable payload. Claims are permanent per sender
and provider inbound ID; changed bodies and uncertain attempts cannot resend.
Status projection never grants sending, retry, consent or billing authority.

The reply runtime only reads readiness; there is no attestation API.
A separately reviewed record must bind the exact sender, recipient UID/endpoint,
configured evidence digest, complete historical STOP coverage through verified
atomic ingress, current owner reviewer and an expiry no later than 24 hours
after review. Historical coverage starts at epoch to assert the complete sender
history, including its inception; there is no partial lookback shortcut. An
empty retained-receipt query, expired receipts or a missing record cannot prove
clearance. Readiness revocation, recipient deletion, sender-wide withdrawal and
STOP are read again in the final send-claim transaction after credential loading.
Future STOP commits block later claims; a claim already committed before STOP
may have dispatched. Marketing-purpose withdrawal is not service permission.

The disconnected readiness adapter consumes one protected
`catchWhatsappReadinessApprovals/{approvalId}` review and writes the exact
readiness mutation plus create-only `catchWhatsappReadinessAudits/{auditId}`
in one Firestore transaction. It validates the actual project and default
database, complete scope, pinned `catchWhatsappReadinessIngress/{ingressId}`
evidence and current STOP, withdrawal, deletion and readiness records. These
three collections deny all client reads/writes, have no TTL, and contain no
message body, raw endpoint or credential. The internal protected publisher writes
review approvals; the operator adapter also admits exact revoke approvals. No
live approval producer or ingress writer is provided. An existing readiness cannot be renewed or reactivated; revocation
requires the approved digest of its exact current record. Ingress state is checked
during provisioning; the existing send path reads readiness, not this ingress
record. Later ingress revocation must also revoke readiness or disable outbound
gates: changing the ingress record alone is not a sending kill switch.

The source uses bounded current Auth observations and Firestore transaction
read sets for authority, consent and readiness. Auth observations do not make
Firebase Auth and Firestore atomic: an out-of-band role, identity or session
mutation can race the commit. Observed drift fails closed. Before live apply,
the operator must review that concrete residual race and any unresolved partial
outcome; this source does not require a new global Auth serialization platform.
The adapter itself invokes the bounded offline
`catch.whatsapp-history-archive/v1` verifier; this is a Catch normalization,
not a native Meta export parser. The trusted immutable source loader must pin
exact bytes and an independent authenticity/completeness audit. Empty history,
unsupported or truncated records, and historical STOP fail closed. No live authenticated
history producer is provided. Independent complete historical STOP provenance is also
mandatory: archive validation, current receipt queries and evidence hashes do
not establish missing historical truth. No live readiness write is authorized
by the source implementation or its synthetic fixtures.

The adapter disables SDK automatic retries and retries only definite ABORTED
conflicts, at most three attempts, reloading all facts each time. Unknown commit
outcomes propagate without an automatic retry; an approved review cannot be
reused after consumption. Create-only audit records are immutable through this
adapter, not against arbitrary privileged Admin SDK mutation. Outbound gates
remain off by default; this milestone makes no provider call, credential change,
backend deployment or activation. The 24-hour cutoff is a transport eligibility
rule, not a verified pricing claim.


`whatsappReadinessEvidence.ts` provides disconnected protected producer and
read-only loader protocols. Preparation accepts an opaque review reference and
requires independent authenticated-review, actual atomic-ingress audit and
immutable archive/pin sources. It validates existing contracts, exact decision
binding and historical session observations; unexpected fields and private
backend errors are rejected without exposing their values. Dependency arguments,
results and archive bytes are copied across awaits. The internal create-only
Firestore publisher and protected archive loader are implemented in
`whatsappReadinessFirestore.ts`. The operator setup adapter binds them to the
reviewed fixed scope and journals their effects in the same transaction. There
is no live authenticated producer or enabled readiness output. Hashes and
synthetic tests prove neither source authenticity nor historical completeness.

The review observation binds the verified token UID/project/auth_time and token
expiry to the observed tokens-valid-after cutoff, enabled owner role, review
time, exact decision digest and authenticated source provenance. Token expiry
bounds the proposed approval expiry. The current-session check also observes
the reviewer's revocation cutoff through the existing authority store. Neither
historical nor current observation prevents an out-of-band revoke/regrant or
delete/recreate race. The protected archive loader revalidates the exact approval
and existing history verifier; the operator loader additionally pins an immutable
storage generation, bytes and an independently authenticated completeness audit.
Caller-supplied hashes or pins cannot establish those facts. Live authorized
source configuration and independently audited history remain separate work.

### First Catch WhatsApp operator source boundary

`whatsappOperatorSetup.ts`, `whatsappOperatorSetupFirestore.ts` and
`whatsappOperatorSetupSources.ts` implement an internal protected first
operator engine. The private CLI composes these merged helpers; none is exported
from the Functions index or exposed by a callable or UI. The protected source binds one project, Google actor, recipient,
sender, credential-version digest and reviewed source SHA. Request input contains
only `planId`, `planSha256` and `replayKey`; identities, role claims, credential
metadata and history evidence never become caller facts. Configuration and tests
use synthetic identities. Planning is read-only and expires within 15 minutes.

The permanent project slot in `catchWhatsappOperatorSetupOperations` and
create-only phase receipts in `catchWhatsappOperatorSetupAudits` have no TTL or
reset path. The runner preserves unrelated custom claims, rejects pre-existing
owner/authority state and, except for the consolidated Admin case below, actor
assignment state. It journals Auth intent before the
single claim replacement. The concrete writer also consumes a create-only Auth
dispatch-intent receipt before calling Auth, so direct adapter replay cannot
redispatch even when the first call throws before applying. Unknown effects
require exact receipt reconciliation;
there is no blind second claim dispatch. The Firestore seed writes the canonical
denied authorities, admin assignment, admin audit and setup phase atomically.
The seed's next-second cutoff requires a new sign-in before root activation;
token refresh alone is insufficient. Root revision 2 has only reply/review;
recipient receive activation reuses the existing prepare/finalize store.

Recipient planning also admits the exact existing single-key claim shape
`{admin: true}` for preservation. The reviewed plan binds that decision through
the exact recipient UID, full `recipientClaimsSha256`, source SHA and plan digest;
bootstrap apply rechecks the full fingerprint at each mutation admission. No recipient
Auth claim is written or removed. Its pre-existing general Admin access remains;
legacy `admin` supplies no Catch capability. Only separately approved
endpoint-bound `receive` is granted. Recipient `adminOwner`, `support`, other
privileged combinations or extra claims alongside `admin: true` remain rejected.
Separate-account actor admission and permanent receipts are unchanged.

When the operator and recipient have the same UID, planning admits only an
existing exact `{admin: true}` account with an active, enabled `admin`-only
assignment for that UID. Both observations must agree on claims, creation time,
revocation time and the verified phone endpoint. The plan additionally binds
`actorAssignmentSha256`, a canonical digest of the full existing projection,
including its metadata. Changes before claim dispatch or seed fail closed.
The reviewed claim replacement preserves `admin` and adds `adminOwner`; seed
updates only roles and update attribution on the existing assignment, retaining
email, display name and other metadata. Other owner/authority state remains
forbidden. This is an explicit bootstrap mode, not a general self-grant API.

Consolidated setup creates one denied authority, then activates root revision 2
with `receive`, `reply`, `review` and the exact verified endpoint after the fresh
Google sign-in cutoff. No grant is issued to the same identity: the two receive
phases instead recheck the root and endpoint in the transaction that writes each
phase receipt and exact effect digest. Unknown responses retain the original
plan and phase chain. Readiness and reconciliation use that same root for both
roles and continue to enforce current identity, STOP, deletion, archive,
independent publication review and expiry. Legacy two-account plans retain their
original fields, separate receive grant and revision semantics.

Read-only reconciliation checks the current full recipient fingerprint alongside
account incarnation and endpoint. Observed claim drift requires reconciliation;
the status read neither changes claims nor redispatches an effect.

The concrete adapters include exact setup intent and pinned authority in the
actual transaction read set. Receive, publication and readiness effects share a
transaction with their setup phase receipt. Publication uses independent protected
review, ingress and immutable archive evidence; the archive loader pins generation
and byte digest and reuses the epoch-complete verifier. Revoke admits an exact
protected review and works after STOP or recipient deletion without loading
history or the recipient. Replays retain exact plan, scope, nonce and replay-key
binding and cannot renew or broaden a grant.

The CLI supplies a concrete, default-denied approval loader from an explicitly
delegated OS-owner policy directory. Planning creates a private pending plan and
stable replay request; it never creates reviewed authorization. Apply requires a
separately written reviewed plan and exact `bootstrap-apply` approval binding the
plan, full scope, source SHA, compiled execution digest, replay digest and expiry.
Missing approval fails before SDK initialization. The policy is reread before
mutation admission and after OAuth header waits immediately before Auth dispatch;
the runtime retains one exact plan/request binding. Remote enablement is not
approval. The execution digest pins
the bounded complete `functions/lib` tree, package/lock metadata, CLI, runtime
and readiness loader files. It catches changed approved bytes; it is not independent proof of
compilation or protection against a hostile process with the same OS UID.

The lazy runtime uses current project/default-tenant Admin Auth and default
Firestore, existing protected Google lookup, a private signature/revocation-
verified Google ID token, and exact Secret Manager version/IAM metadata. It never
accesses a secret payload, changes IAM or contacts Meta. Emulator redirection is
rejected in the default runtime. SDK reads/token verification are retained, but
the guarded claim setter uses public authenticated project-bound REST with one
HTTP attempt, redirect rejection and an abort deadline. The Admin SDK's default
mutation retries are deliberately bypassed after unknown outcomes. Only an
unambiguous unconditional direct accessor binding for the pinned runtime
principal is established by this metadata adapter;
unsupported inherited/group/conditional access remains unproven and is not a
request for another grant. Auth claim replacement and Firestore commit remain
separate services with the bounded observation race described above.

The command `setup-catch-whatsapp-reply.cjs` supports offline `inspect-plan` and
`fingerprint`, read-only `plan`/`reconcile`, and separately approved bootstrap
`apply`. Its concrete readiness loader accepts fixed private files from separately
authorized audit custody: actual deployed atomic-ingress audit, pinned epoch-to-
cutover archive and independent source/retention/normalization/late-arrival audits.
A delegated custodian admits their exact hashes and full operator scope. File
permissions, structured audit bodies and digests do not authenticate an auditor;
the custody delegation is an explicit live authorization prerequisite with no
default. Source publication grants none of that authority.

`readiness-plan` derives the review session from verified current Google Auth and
current root/recipient authority, validates existing strict history evidence, and
creates only private pending review and authentication receipts. Separate private
`readiness-ingress`, `readiness-publish` and `readiness-apply` action approvals bind
source, executable, original plan/scope/replay, review and audit hashes. The first
successful binding is immutable for each invocation; a coherently changed policy
or evidence bundle during an Auth wait cannot approve captured older effects.
Stage approval cannot outlive the review, token or admitted evidence; it never
renews the expired bootstrap plan or permanent project slot.

Approved ingress admission is create-only and uses the actual audited cutover;
conflicts and revocation are never overwritten. Publication reuses the merged
transactional publisher and records the exact publication digest, including its
actual authority-observation digest, as a private pre-write witness. That witness
is not approval. `readiness-review` reads the committed publication and returns
integrity evidence; an independent custodian must separately admit the exact
publication before `readiness-apply` reuses existing provisioning. No command
manufactures history, self-approves a review, renews readiness or sends a reply.

Reconcile checks the permanent slot, complete canonical phase audit chain, Auth
dispatch intent and authority effect hashes in a read-only transaction. At the
ready phase it additionally proves the publication, independent audit, consumed
approval and exact readiness record against current authority, ingress, STOP,
preferences, deletion and expiry. `readinessVerified=true` reports only a current,
unsuppressed, unexpired record. Expired plans and historical publication evidence
remain inspectable without any effect retry. Bootstrap completion alone does not
establish readiness, and readiness observation is not manual send approval.

The preserved `inspect-plan --plan-file <receipt>` path remains offline and prints
`liveApplyAvailable=false`: inspecting caller JSON never authorizes it. Runtime
configuration, commands, global admin-role consequences and the existing
production callable route are documented in
[release operations](release_operations.md#protected-catch-whatsapp-operator-cli).
Source tests and publication do not authorize live execution, grants, flags,
provider calls, deployment or sending.

### Readiness authority mutation boundary

The scoped source inventory identifies these paths; it is not an inventory of
live IAM, tenant configuration or every authorized principal:

| Path | Relevant behavior and limit |
|---|---|
| `functions/src/admin/adminUserRoles.ts` | Writes Auth custom claims, then projects `adminRoleAssignments` separately. The projection does not fence Auth changes inside a readiness transaction. |
| `functions/src/safety/accountDeletion.ts` | Writes the recipient `deletedUsers` tombstone before Auth deletion. Readiness reads that guard; direct Auth deletion bypasses this application path. |
| `tool/demo/cross_paths_demo_core.mjs` | Privileged fixture tooling can clear/reassign phone numbers, create users and alter test-phone configuration. It has scoped guards including an explicitly pinned production path, not a readiness lock. |
| `tool/firebase/probe_chat_storage_rules.mjs` | Mints and exchanges a custom token for a selected user after its own data preflight; it does not establish a readiness authority fence. |
| `lib/auth/data/auth_repository.dart`, `admin/src/shared/api/firebase.ts`, `website/src/firebase.ts` | Establish phone/email-link sessions, Google Admin sessions and sign out. These source flows do not fence backend role, identity or session mutations. |

The client SDK also exposes account deletion, linking/unlinking, password and
phone mutation capabilities independently of whether the current application UI
uses them. Their actual availability depends on provider configuration. Firebase
console, other Admin SDK/REST clients, privileged imports and automation, and
provider self-service routes remain outside this source inventory. No production
session-revocation or bulk-import writer was found in this scoped search; that
absence does not establish absence of external capability.

The send path observes actor roles, disabled state and token revocation cutoff,
plus the recipient's enabled state and exact verified phone. The readiness
reviewer check observes enabled/adminOwner status and the current session
revocation cutoff. These external Auth reads do not participate atomically in
Firestore commits. Role removal/regrant, enable/delete/recreate, session
revocation and phone unlink/reassign/restore through external principals remain
concrete residual races. No global Auth mutation lock is introduced.

The canonical lodging publication source adapter prepares per-guest stay writes
from the same complete transactional records used for feasibility. Planner
stays carry explicit `lodgingPartyId` and `lodgingInventoryId`; labels never
establish inventory identity. Desk readiness edits preserve these links, while
manual room/date/occupancy changes invalidate them. Unbound live stays require
verified adoption before planning; they cannot be ignored as spare capacity.
The adapter preserves checked-in stay documents and verifies native block
occupancy/date limits before queueing any writes. Its exact post-write stay
evidence must advance the source fence atomically with workflow/receipt writes.
`canonicalLodgingSource` now connects persisted private configuration, complete
native records, per-domain revision fences and this prepared writer to the Store.
`saveCanonicalLodgingConfig` requires current coordinator authority and an exact
configuration revision. Legacy adoption explicitly verifies the selected stay,
its revision, dates, room and existing occupancy; it does not infer sharing.
Configuration references canonical guest/group/hotel/block IDs and has no copied
contact records. Native membership with unknown acquisition evidence is marked
`canonical`; it is never relabelled as a manual decision. The private config is
retained only within the event and deleted by the archive sweep. The authenticated
`manageProgramLodging` callable validates strict action-specific requests and
role-specific responses, derives the actor from authentication, and exposes
revision-fenced manual proposals and independently checked destinations. Private
reviews include the exact snapshot and labels read in the same transaction;
native guest corrections invalidate that snapshot. The private Host stay-planner
route connects the current proposal to manual room moves, regeneration, host
approval, per-hotel confirmation and explicit guest publication. Confirmation is
bound to a hotel allocated by the exact approved proposal; an uncertain response
retains the same hotel and operation ID. It clears session-invalid projections
and preserves exact operation IDs for uncertain decision retries. Routed setup
edits dates, explicit sharing parties, inventory and pins against the current
configuration revision. Ordinary preview preserves the exact approved proposal
while its source remains compatible, including precisely its own publication
revision advance and unchanged native placements; explicit `regenerate: true`
creates a new current candidate without changing approval. Manual edits use the
current snapshot revisions. Acknowledged writes with failed reloads require a
fresh read instead of repeating an old write. Membership decisions work before
lodging setup exists and reload the current no-configuration view honestly.
Coordinator-only `readMembership`
projects one guest's bounded, immutable source-labelled assertions, canonical
memberships and selected inclusions/exclusions. `decideMembership` fences the
complete explicit group choice by the current guest revision and reuses the
existing evidence ledger and group-count writer, without editing contact or
household fields. Repeated imports leave selected manual choices authoritative;
new lists remain suggestions. The routed membership editor expires its complete
private catalog at the earliest setup/evidence deadline. Uncertain membership
CAS results require a fresh read rather than repeating an old revision; lodging
publication retains its separate exact operation receipt. Coordinator-only
`readSetup` also returns a bounded live catalog of
canonical guests, groups, hotels, contracted room blocks and consuming stays.
It includes guests without travel records, omits contact details and notes, and
keeps invitation households separate from explicit sharing decisions. Unknown
legacy occupancy bindings remain null and require explicit verified adoption;
contract occupant limits do not establish bed types or accessibility. A strict demo-only Firestore integration fixture verifies concurrent
configuration edits, publication replay, canonical roommate counting, transactional
rollback and stale native edits; private collection deny rules are also exercised.
Fresh captures and full combined release validation remain pending.
