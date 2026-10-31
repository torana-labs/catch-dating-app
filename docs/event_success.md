---
doc_id: event_success
version: 1.154.0
updated: 2026-09-23
owner: recursive_audit_loop
status: active
---

# Event Success

This is the source of truth for the live-wired but still evolving event-success
layer. It replaces the separate event-success completion, hardening, in-
development, runtime, manual-QA, and participant-metrics trackers.

Read this before deleting, moving, auditing, or changing `lib/event_success/**`,
`test/event_success/**`, event-success Firestore collections, event-success
Functions, production review coverage, event-success scorecards, or participant
metrics.

## Current State

Event success is intentional live product code, not dead code. It is wired to
live event routes, host setup/manage surfaces, attendee companion surfaces,
Firestore rules, generated contracts, demo data, and Functions.

The current production loop supports two entry paths:

1. A Consumer member joins/books through Catch, or a Host creates an
   operations-only event and imports/adds its operational attendees.
2. The Host marks attendance; a linked event-scoped or Consumer attendee may
   self-check in when the event policy permits it. Event-runtime self check-in
   requires an admitted `registered` operational attendee; imported invitations
   and waitlist entries cannot turn themselves into attendance.
3. Profile-independent Event Success setup can guide the live event through
   structure, run-of-show prompts, attendance and Host controls. Assignment,
   First Hello, compatibility and wingman code is migrating from Consumer
   participation/profile eligibility to the event-runtime identity contract
   below.
4. A phone-verified imported attendee enters the dedicated web runtime without
   installing the Consumer app. Swiping, mutual Catch, cross-event discovery
   and chat remain Consumer/profile pipelines; First Hello, event-scoped
   compatibility, groups, rotations, wingman and feedback do not.

Event success does not own a duplicate post-event interest surface. Private
target identities remain attendee-private unless the attendee explicitly asks
the host for help through the wingman request flow.

### Standalone Host Runtime Boundary

Event Success must no longer infer that every human at an event has an
`eventParticipations/{eventId_uid}` document. The Host runtime consumes the
unified operational roster described in
`docs/host_product.md#host-tooling-decisions`.

- Host-only facilitation, run-of-show, prompts, manual attendance and aggregate
  reporting can address an `eventAttendee` without a linked UID. Existing
  participant QR, feedback and private companion actions remain UID-backed.
- Attendee-private runtime moments require a server-linked event-scoped OTP UID
  or Consumer UID. The target assignment contract will use attendee ids as the
  event identity and keep the optional linked UID only as an authorization
  projection; current assignment documents are still UID-keyed.
- Preference-driven modules may use only explicit event answers and consents.
- Public/dating profile inspection, compatibility derived from a dating
  profile, swiping, catches and chat require the Consumer profile tier.
- A missing identity tier produces a visible capability unlock; it must never
  silently drop the attendee, synthesize profile attributes, or widen roster
  visibility.

During migration, existing UID-keyed Event Success documents remain valid for
Catch-booked participants. UID remains the private authorization key because
phone OTP creates a real Firebase Auth identity, while the new runtime edge
links that UID to the operational attendee and declares its identity version.
Generators resolve the event-runtime participant first instead of treating a
Consumer participation or public profile as the event identity.

The 2026-08-11 Direction 3 bounded reference closes the first Host-only slice
of this boundary. Canonical Host Manage Live derives checked-in and expected
counts from `eventAttendees`, accepts an external-only roster with zero
`eventParticipations` or profiles, and moves attendance work behind Guests.
The roster is still passed separately from the UID-keyed assignment and private
companion data required by optional advanced cards; this does not claim the
general attendee-id assignment migration is complete.

Direction 3's Quiet Command Console is the selected live hierarchy: one dark
current-beat stage, one next beat, flat Guests and recovery destinations,
honest acknowledged/pending/failed persistence, Previous, and one pinned
primary action. Live transitions are revision-fenced backend writes, and reveal
or rotation publication requires an explicit confirmation. The persisted plan
is the restart source of truth, so process death resumes the current beat and
published rounds without a local recovery mode. Revisioned undo and pause are
not part of the shipped control model.

## Typed event assistance

The event-assistance outcome vocabulary is owned by
`contracts/catalogs/event_assistance_workflows.json`. Its 46 definitions map
to correlated policy variants in
`contracts/shared/event_assistance_common.schema.json`. Command variants bind
the command kind, payload and live/rehearsal context. Generated TypeScript
contracts and Dart vocabularies must be regenerated together; the schema check
requires complete catalog/configuration coverage.

Each catalog definition also names its actor-specific automatic, Host and guest
commands, its override policy, its resolution boundary, and the Host surfaces
and presentation that own the workflow. The catalog therefore answers "what can
happen?", "where does the Host handle it?", and "which domain resolves it?"
without making a runtime executor implicit. Contract validation requires every
command kind to appear in at least one workflow and every workflow to have a
valid Host projection. TypeScript compilation proves that automatic, Host and
guest command lists agree with command authority; the generated Dart descriptor
exposes the same closed relation to Today, setup, live Now, live Guests, live
Room and report code.

`contracts/catalogs/event_assistance_command_bindings.json` separately records
the implementation boundary for every command in both live and rehearsal
modes. A `directCommand` binding names a callable that consumes the canonical
command envelope; a `domainAdapter` names an existing typed domain operation;
an `internalCoordinator` names worker-owned execution; and `contractOnly`
means no executor is implemented. Complete bindings have no missing capability;
none and partial bindings name one. A partial binding partitions a command's
discriminator values into implemented and missing variants, and validation
checks that the partition exactly covers the schema enum. Validation also
requires all command kinds in schema order and executable bindings to name at
least one operation. Generated TypeScript and Dart catalogs keep
product code from treating type coverage as runnable coverage and expose the
remaining dependency as a closed enum.

`workflowActionPlanForSurface` is the shared product projection over that
catalog. It accepts one surface, execution mode and an explicit set of event
capabilities, then returns every applicable workflow with its presentation,
resolution boundary, actor-owned commands, executor operations, coverage and
missing capability. Workflow status is `external`, `complete`, `partial` or
`unavailable`. The planner retains partial and unavailable work so Today,
setup, live runtime, rehearsal and reporting can explain a gap rather than
silently omit an action. Capability composition remains independent of
`activityKind`; the saved event format and operating state own those facts.
Flutter mirrors this projection in
`event_assistance_action_plan.dart`, using the generated workflow and command
binding descriptors directly. The resulting action and command lists are
immutable and preserve the distinct live and rehearsal coverage states.

The live `sendOperationalMessage` binding is complete. Late-join `joining`
messages run through the guest worker. `planChange` and `followUp` use a durable
Operations fanout that enrolls the current event attendee episode, verifies an
immutable source revision and exact saved-policy revision, then invokes the
same publication and dispatch boundary per guest. The functions remain dormant
in deployment policy, so complete source coverage does not claim live
activation or provider delivery.

Seven workflows intentionally resolve through existing product domains instead
of duplicating Event Assistance commands. Venue, route and format readiness use
event configuration; messaging readiness uses messaging configuration;
financial readiness uses payment configuration; context boundary uses
navigation; and event learning uses report review. Their empty command lists
and explicit external resolution boundaries are checked together. All other
workflows use `eventAssistanceCommand` and must name at least one command.

`functions/src/eventSuccess/operations/` owns the pure policy evaluators and
command-boundary validation. The late-join evaluator accepts explicit time,
attendance, admission, guidance, participation episode and policy authority.
Reported intention cannot manufacture physical attendance; confirmed presence
resolves an older decline. Throttled material updates retain a next evaluation
time. Effect identities include the execution context and participation episode.
Live and rehearsal adapters must use this policy with mode-scoped effects;
the pure evaluator alone does not establish application integration.

Rehearsal connection state is now independent of its actor status. Disconnect
and reconnect affect only that connection fact, preserving attendance,
placement, guest moment and safety choices. A disconnected actor retains their
known check-in and Room assignment, but contributes no synthetic heartbeat.
The existing legacy `disconnected` actor status is still readable; its prior
attendance cannot be recovered, and reconnect alone cannot manufacture arrival.
An explicit arrival action restores that physical fact. Host and guest callable
projections carry connection state separately, with native attention counts and
the guest connection notice retaining that distinction. Rehearsal now exercises
late join, practical help, participation, membership and handovers, scoped staff
duties, movement, checkpoints, accountability, delivery takeover, runtime
settings, attendance closeout and unit outcomes through the transaction adapters
described below. Catalog families without a registered executor remain modeled
coverage rather than runnable rehearsal behavior.

Scheduled rehearsal behaviors now resolve their guests against the configured
2–50-person roster. Existing guest indices remain stable when present; roles
outside a smaller roster use distinct available guests. Mapping uses the whole
scenario, so exit/return and disconnect/reconnect pairs retain the same guest
across separate clock advances. The default 12-person roster therefore includes
the capacity scenario's walk-in instead of silently dropping its fifteenth-guest
cue. Clock jumps apply every crossed behavior in time order, preserving earlier
state changes. An incomplete stored roster blocks control until reset. Tests
cover every scenario and supported roster size, partitioned clock advances and
rehearsal-only state; scenarios driven by manual Host actions gain no invented
automatic cues. This changes existing rehearsal execution without new schemas
or live-event effects.

`eventRehearsal/assistanceMessages.ts` now provides pure transitions over the
existing typed message record for practice outreach, delivery outcomes and
guest choices. It reuses the live late-join evaluator, message/choice protocol,
route selection and delivery-evidence ordering. Simulated WhatsApp uncertainty
holds fallback; confirmed technical non-delivery permits SMS under the same
backoff and attempt limits. Duplicate replies and receipts retain their prior
result; conflicting delivery evidence requires Host review. Practice messages,
attempts and responses require the same rehearsal, virtual event and clock,
and reject live sender bindings and response sources. An intention response
does not check anyone in. These pure transitions have no persistence, provider
or credential port.

The existing `controlEventRehearsal` callable now accepts typed assistance
commands to publish a joining instruction, simulate dispatch and record a
subsequent delivery receipt. The Host supplies an explicit practice policy,
confirmed departure, joining guidance, permitted routes and retry limits.
Venue, itinerary-stop and group-checkpoint destinations use the same canonical
policy. The adapter rebuilds attendance, participation, intention and time
from the synthetic actor and virtual clock. Complete bounded message history
uses the same projection as live late-join evaluation. Published instructions
can refresh after the outreach cap is reached; dispatch separately rechecks
that cap, cooldown and current actor state.

Practice records live only in `eventRehearsalMessages`. A guest's
`respondToAssistance` action validates the current anonymous slot and commits
the message response and synthetic intention/help effect in one transaction.
Host authorization and runtime revision are rechecked at mutation time.
Request hashes reject changed retries. Message identities and history queries
include the rehearsal clock generation, so reset cannot reuse an old run's
message. Reset and expiry remove practice history in bounded batches.
Host bootstrap exposes sanitized instructions and simulated attempt status;
guest bootstrap exposes only that actor's instruction and response choices.

The existing public rehearsal page now renders the actor's joining instruction
and exact server-projected choices ahead of its ordinary guest controls.
Replies carry message identity and intent revision; arrival remains a separate
action. The controller serializes mutations, freezes uncertain replies for an
exact retry and prevents competing choices until refreshed evidence resolves
them. Cancelled or older reads cannot undo a confirmed response to that
instruction. Query state belongs to one mounted phone, and changing public
links remounts the controller. Saved replies remain visible after closure;
expired or stale instructions cannot offer new responses. Rendering uses the
existing Event Runtime primitives and keeps the practice banner visible.
Snapshot freshness lasts at most 15 seconds from request start, measured by the
browser's monotonic clock independently of the paused or advanced virtual time.
Refresh restores controls only after another successful read.

The native rehearsal domain now retains typed guest intention, joining
instructions, response choices and simulated delivery evidence from that Host
bootstrap. Malformed instruction pointers fail closed. A reported intention
still cannot change attendance. Rehearsal plans reuse the live template's
`AssistanceLateJoinRules` value, with a concrete joining destination, explicit
departure confirmation and channel choices that contain no live sender binding.
Closed command types distinguish publish, dispatch, confirmed receipt and
configure/pause/resume automation; an
unknown dispatch outcome cannot be used as a receipt. The existing rehearsal
repository and action controller accept a frozen command tied to the reviewed
session, setup revision, runtime revision and client action id. The assistance
callable requires `expectedSetupRevision` and checks it before receipt replay
and inside the mutation transaction. A reset can therefore reuse a runtime
revision without accepting an old run's pending assistance command. Exact retries
preserve that request; a result must include its matching action receipt before
being returned as confirmation. This confirms command handling, not message
delivery.

`EventRehearsalAssistance` now loads a deliberate Host review within the
shared `AuthenticatedSession` period. Live assistance retains its existing
account API through that same auth-owned provider. Sign-out, authentication
failure or a changed account invalidates old reviews even if the same UID
returns. Rehearsal reviews also retire when explicitly refreshed; slow or
foreign-session reads cannot replace the current review. The rehearsal editor is
owned by session ID and opens an explicit current review. One unresolved command
keeps its original review, role, payload and request ID across dismissal, refresh
and attempted replacement with another command. Reentrant taps share the same
future. A rate limit preserves an earlier unknown outcome; reload is unavailable
until that operation is confirmed or definitively rejected. First submission
requires current review and movement evidence; exact retry retains the original
request so the server can confirm its receipt or reject its stale generation.
The controller independently verifies the receipt before reporting confirmation.
A refreshed page does not invalidate proof that the original action was applied;
the runtime is fetched again for current state. A temporary strong auth listener
retires detached pending work on sign-out or same-UID re-entry, and old completions
cannot restore it. Dedicated delivery, membership and visit controllers retain
ownership of those commands. The generic editor still needs Host UI and coach
wiring; it does not persist pending requests across app restarts or retry them
automatically.

`RehearsalPublicationDraft` now assembles a practice instruction through that
same guarded editor. Joining choices come from the copied venue, configured
itinerary stops and configured pace-group checkpoints with a location or route
distance. They are review candidates, not reports of current position or safe
intercept recommendations. The Host supplies guidance, departure confirmation,
policy, channel order and retry limits explicitly. Concrete policies retain
their destination scope; unresolved confirmed-progress policies bind to the
reviewed destination and compatible later choices. Foreign, reset or changed
setup choices cannot be silently reused. Lists are frozen before submission.
The stored virtual start and configured duration bound instruction expiry;
elapsed time cannot restart that window. Material identity follows the target,
text and expiry, so unrelated clock or runtime revisions do not manufacture a
new instruction. Assembly never changes attendance or dispatches a message.

The rehearsal backend also supports explicit `configureAutomation`,
`pauseAutomation` and `resumeAutomation` commands. Configuration saves a private
actor-scoped plan and a script of one to six simulated delivery outcomes.
Clock/lifecycle controls, injected behavior, Room placement, guest actions and
receipts reevaluate enabled recipes through the canonical late-join and outbox
policies. Every actor history is read before writes; the script cursor,
messages, actor state and parent action receipt commit together. At most one
scripted attempt is consumed per transition. Clock jumps use the final observed
actor state, without inventing sends at missed historical times.

Practice recipes now retain the same optional rule setting as live templates:
observe, prepare, execute within policy, or disabled. The server supplies the
rehearsal policy version. Observe/prepare evaluates current facts for Host review
without creating a guest instruction or consuming a delivery outcome; disabled
rules cancel the policy. Manual publication cannot bypass these modes. Changing
an executable recipe to a restricted mode supersedes its old instruction and
preserves uncertain delivery evidence. Older recipes without a setting keep
their earlier behavior and exact wire identity. Native source-derived recipe
assembly retains the mode and rejects publication from a preview-only recipe.
The event-wide adapter now saves one isolated rule per event/group and one
explicit simulated delivery configuration. Rules reuse live template modes,
destinations, cutoffs and limits; groups can inherit, override or switch off.
The suggested prepare mode is not saved authority. The runtime separately saves
ordered synthetic channels, response deadline, retry limits, optional later
joining choices and one-to-six outcomes. No sender account or permission is
copied from the source event.

The existing control callable commits each settings command, bounded actor
reevaluation and receipt together. It requires current Host authority, reviewed
setup/runtime revisions and the current configuration source. Synthetic staff
can inspect settings but cannot change them. Reset, fork and setup replacement
do not inherit settings. Native readers, typed decisions and repository bindings
retain this review and reject mismatched confirmations. The Host runtime now
mounts a compact rehearsal settings entry in its existing setup slot. Event
rules use the same late-arrival form as live mode, with current group overrides
under progressive disclosure. Simulated channel order, timing, retry limits and
all eleven delivery outcomes remain configurable; the suggested configuration
is never submitted automatically. Consumed script entries are read-only.

One account-bound settings owner retains an unresolved event or group decision
through dismissal, source refresh and navigation to another settings choice.
Exact retry cannot change the decision, and account transitions retire private
state. Confirmed results show current settings, including newer state returned
by a replay. Pending and completed controls display readable values without
interactive affordances. Rehearsal and live mode share timing/limit controls;
the overall attempt ceiling may be lower than the per-channel ceiling.

Focused widget tests exercise entry, optional configuration, exact retry,
subsequent rule editing and closed runs at normal and double text size. Isolated
Widgetbook previews mount these same controls; their shared generated index and
widget inventory registration await the existing file claim. Provider activation,
real delivery and device verification remain separate integration work.

The rehearsal joining-rule form now validates the runtime timing evidence before
Save. An enabled rule that requests Host review cannot be saved against a
configured practice runtime with no response deadline, including a paused one.
The form explains the missing prerequisite and uses the same typed validation as
the immutable command. Turning the rule off, inheriting a group rule, or choosing
to keep arrival unknown remains available. A rule may still be prepared before
runtime configuration; the runtime's own validation then requires a deadline.
Live timing that has not been loaded stays explicitly unreviewed, preserving its
existing server-owned activation checks rather than guessing at a missing value.

New event-enrolled recipes follow current accepted group membership and saved
departure. Unassigned pace-group guests receive no inferred route. Explicit
per-guest recipes remain separately owned; an individual pause or delivery
handoff survives event edits. A global pause holds inherited execution without
turning each guest's own pause on. Disabling a rule retires its instruction even
while the runtime is paused. Rebinding preserves the consumed script prefix,
episode limits and uncertain attempts; configuration cannot rewrite prior
outcomes or authorize fallback from uncertainty. Missing configuration/source
produces a distinct held evaluation. Shared setting controls accept named
practice destinations without inventing coordinates; live location validation
and retained coordinates remain intact.

Uncertain delivery holds fallback until confirmed evidence arrives. Backoff,
outreach caps, deadlines and exhausted scripts remain explicit evaluation
states. Arrival and decline stop outreach; intention replies retain independent
attendance. Manual publish or dispatch pauses the recipe, while resume retains
its script cursor and bounded attempt history. Reconfiguration supersedes an
obsolete instruction without resetting episode outreach limits. Invalid history
holds automatic assistance for review without discarding an independent
physical actor change. Host clock, behavior and placement transactions recheck
current organizer authority before they can run assistance. Host bootstrap
exposes the saved recipe and typed evaluation; guest bootstrap excludes them.
Reset rebuilds actors without recipes and deletes rehearsal message history.

Native Host bootstrap now retains that saved plan, immutable outcome script,
cursor and typed evaluation. Policy results reuse the live
`AssistanceJoinDecision` model; delivery results distinguish paused, stopped,
delivered, reconciliation, backoff, stale facts, exhausted scripts and Host
review. Unknown variants and malformed scripts fail closed. A response without
the optional automation field remains readable. The guarded rehearsal editor
assembles configuration from the reviewed publication draft and freezes its
script before submission. Configure, pause and resume use the same account,
generation and exact-request retry protections as manual commands. Tests cover
every schema-declared command, policy and delivery variant, including uncertain
configuration retries and immutable caller inputs.

Practical help also has a rehearsal lifecycle. Anonymous `askForHelp` actions
and practical-help message replies create an actor- and clock-bound request in
`eventRehearsalCases`, in the parent guest transaction. The existing assistance
control accepts a reviewed `resolveAssistance` command. Live and rehearsal use
the same handling decision: resolved/declined settle the request under the
acting manager, while transfer keeps it open and requires a current organizer
manager. Replayed replies cannot reopen settled requests. Settling one request
preserves other open requests and never changes attendance. Requests survive
ordinary event completion and can still be handled, within the existing session
action limit; reset and expiry delete their rehearsal-only records.

Host bootstrap includes a clock-bound request view, bounded by the 500-action
session limit, and explicit untracked actor flags from older data. It checks
current manager access and assignment authority. Guest bootstrap retains only
the existing help flag, with no Host request or assignment details. Native
open/closed request types carry rehearsal identity, share the live assignment,
resolution and decision values, and cannot form a live event command. The
rehearsal editor accepts only a case from its reviewed bootstrap and preserves
an uncertain command for exact retry. These data and controller bindings still
need the claimed Host UI/coach integration. Restricted safety cases retain their
separate owner; this practical-help path does not create or settle them.

This integrates backend fact assembly, storage, guest effects, automatic
reevaluation, the guest web reply flow and the native typed command/data and
plan assembly boundaries. Host presentation and setup/coach wiring remain
unfinished. The simulation advances through
existing rehearsal actions; it does not run a wall-clock scheduler. No real
sender or delivery is enabled.

The registered `event-assistance` workflow now evaluates bounded late-join
snapshots through the existing Operations engine. Its manifest exposes plan,
run, resume, queue and status, with zero network/public-write authority. A run
is one event/context and frozen evaluation time; duplicate participation
episodes, schema-invalid facts and changed plan authority fail closed. Its
queue separates evaluating, waiting, host review, proposed effect and terminal
outcomes. Completion means snapshot evaluation finished, not that a guest was
contacted or the event is complete.

`lateJoinPolicy.ts` is the single authored pure implementation. The Operations
runtime generator transpiles it to the checked JavaScript module consumed by
Operations;
the Functions adapter validates the same schemas before invoking it. Changing
the policy therefore requires both generated-output parity and runtime tests.
The local shadow factory does not load live event facts or send messages.
The live late-join reader, publisher, durable worker and dormant source/scheduler
handlers are described below. Other workflow fact readers/executors, deployed
provider coordination and the Host/rehearsal application adapters remain
integration work.

### Attendance closeout decisions

`getEventAttendanceDisposition` and `recordEventNoShow` add an explicit,
manager-only decision for one live event roster guest. An unchecked registration
starts as `unreviewed`; elapsed time and unanswered messages never record a
no-show. The typed `recordNoShow` command carries separate expected attendance
and decision revisions, a reviewed source hash and an immutable operation id.
The decision is either a host-confirmed record, a record citing the exact current
`notComing` guest episode/revision, or an explicit clear with a supported reason.
Guest-declined labels supplied without that canonical evidence are rejected.

A running Event Success plan remains open after a scheduled overrun. Recording
requires an admitted, unchecked guest and either a completed runtime with valid
completion evidence or a passed scheduled end with no running runtime. Cancelled
events, waitlists and invitations cannot create no-shows. Clearing a mistake
does not establish attendance; attendance-correction and no-longer-applicable
reasons require their matching current facts.

Callable-only `eventAttendanceDispositions` annotations and immutable
`eventAttendanceDispositionReceipts` commit together. They never write physical
attendance, admission, participation, assignments, messages or payments. Current
organizer authority is re-read inside the transaction, including on retries.
Exact retries return the original operation revision and the latest view.
Event/roster creation generations and reviewed guest identity prevent replacement
rows from inheriting or replaying old decisions. Attendance facts (including
check-in timestamp precision, independently of the attendance revision), event
closure changes and changed cited guest intention supersede earlier decisions.
A fresh review is required before a new decision can commit.

The native `EventAttendanceDispositionRepository` now reads and submits through
these callables with generated request DTOs. Its domain has separate sealed
unreviewed, recorded, cleared, source-changed and superseded states; private
constructors preserve server-reviewed evidence. The parser rejects foreign
scope, malformed values, contradictory availability, future evidence and
inconsistent receipts. The prepared command freezes both revisions, source
hash, actor expectation and decision. A later replay correction stays
separate from the original operation revision.

`EventAttendanceDisposition` binds each guest review to the shared uninterrupted
authenticated session, hides previous values while loading and exposes backend
failures without inventing attendance. `EventAttendanceDispositionEditor`
starts without a choice, validates the selected evidence/reason, shares one
future across duplicate taps and retains the exact command after uncertainty.
Source conflicts require a fresh review. Sign-out, auth errors or an account
switch permanently revoke the old form, including after the same UID returns;
late responses cannot restore it. An in-flight submission retains its owner
until the result is reconciled. Success refreshes that guest's closeout review
and the exact event/account attendance report. Pending, failed or old-account
submissions cannot optimistically change counts or refresh another report.

`getEventAttendanceReport` projects the current unified `eventAttendees` roster
through the same authority, source-validation and disposition policy as the
individual review. Its explicit SDK read-only transaction reads event, manager
membership, runtime plan, roster, guest evidence and decisions in one snapshot.
No Consumer booking or linked profile is required. Each roster id has exactly
one classification: attended, recorded no-show with its evidence kind,
unresolved with its review reason, or not expected with its admission or event
cancellation reason. Physical attendance takes precedence; a cleared or
superseded annotation never establishes attendance or a new no-show.

Counts and compact member classifications cover the same snapshot. An empty
roster is explicitly `emptyRoster`. `completeRoster` means every canonical Host
roster row was read, not that every guest has been reviewed or that another
system has finished importing. Reads are bounded at 1,000 members, with overflow
or any invalid source failing the whole request rather than returning partial
totals. The source hash includes exact event/plan creation and timestamp
evidence plus all member review hashes. Member ids let the Host UI open a fresh
individual closeout review; the aggregate grants no mutation authority. The
callable is App-Check-protected, current-manager-only and limited to ten reads
per minute. It neither writes report caches nor changes scorecard semantics.

The native `EventAttendanceReportRepository` reads the callable with a generated
request DTO. `EventAttendanceReportView` preserves sealed classifications,
separate evidence/review/admission enums and typed count records. It reuses
`AttendanceClosure`, rejects unknown fields and unsafe values, and requires
unique members with matching coverage, roster length and every count bucket.
Event cancellation and open-event states cannot carry contradictory no-shows.
Parsed member collections are immutable. Each member supplies only its scoped
id for the existing individual review; report evidence labels cannot form a
closeout command or substitute for the guest episode/revision evidence.

`EventAttendanceReport` binds the snapshot to the same uninterrupted Host auth
period as individual closeout. Loading, reload, backend failure, sign-out or auth
failure hides the prior report. An account switch or a later login with the same
UID cannot restore an old response. Reads have explicit reload and no automatic
retry. Successful closeout, including an exact replay, invalidates only the
matching event/account report and waits for new server totals.

Host roster and recap UI integration remain pending.
Existing report no-show counts retain their current semantics until their
separate aggregation and UI integration use this explicit decision model.

### Participation commands

`getEventAssistanceParticipation` and `setEventAssistanceParticipation` expose
explicit active, temporary-break and departed states on the existing assistance
guest record. Organizer managers and the attendee's current server-linked UID
can read/change this state; check-in staff and bearer message links cannot.
The writer re-reads canonical event, roster, organizer and plan documents inside
its transaction. Command context, source hash, participation revision and episode
must still match. An immutable receipt makes exact retries return their original
operation revision and the latest state, without replaying an earlier choice.

Participation and joining intent remain separate from admission, physical
attendance, seating, group membership, message consent and safety cases. A break
or departure suppresses joining guidance and activity prompts at publication,
guest interaction and SMS/WhatsApp dispatch. Essential plan/cancellation updates
and post-event follow-up remain eligible for their independent window and consent
checks. Re-entry, including an explicit return after declining, creates a fresh
episode and clears earlier joining intent; old grants and buttons cannot act on
it. Source identity includes both Firestore event/roster creation generations,
so identical deleted/recreated source rows cannot inherit a guest episode.

A temporary break may carry a planned return point from the saved itinerary.
That value is a preference, not an observed return: clock time and a scheduled
stop never reactivate a guest. Other programme/round return points require their
canonical unit reader before they become selectable. The shared late-join policy
requires known active participation; unknown participation waits, and inactive
participation cancels its proposed work. Missing guest records remain uninitialized
on reads. The Flutter `EventAssistanceParticipationRepository` now exposes
typed reads and changes through these callables. Its sealed participation
values permit a return point only for a break; commands retain the reviewed
source hash, episode, revision and operation ID across retries. Strict response
parsing rejects another event/organizer/attendee, rehearsal mode, malformed
revisions and inconsistent state. Replayed receipt revisions stay separate
from the current view. Missing deployment is a visible unavailable error,
never an empty or active guest.
Automatic enrollment's first saved guest revision is zero. The client
distinguishes that current (or source-changed) record from uninitialized state
by its episode, and retains revision zero in the first reviewed host command.

The participation review now uses the shared uninterrupted authentication
session. Loading, reload, errors and account transitions remove prior data;
obsolete or foreign reviews cannot create a command. The scope-owned
`EventAssistanceParticipationEditor` retains one unresolved decision across page
refresh and sheet closure. It starts with no implicit selection, offers itinerary
return points only for a temporary break, and clears the point on another choice.
Duplicate and reentrant triggers share one future. An uncertain result permits
only the exact retry; it cannot reload or replace the command. Definitive
conflicts release the pending action and require new authority. A temporary
strong auth subscription also clears detached pending state on sign-out,
same-UID re-entry or auth failure; late responses cannot restore it.

Both the repository and action owner verify the resulting scope, receipt
revision and, for an applied result, the requested state/return point, source
hash and unchanged attendance fact. A replay preserves the original receipt
revision and displays the newer authoritative view. Success refreshes the guest
review and Host assistance projection without calling attendance or inferring
presence. These are controller guarantees; the live sheet must bind controls,
retry and route dismissal to this owner and handle its returned errors.
The live roster controls, module-specific opt-outs, future allocation exclusion,
and rehearsal adapters remain integration work. Moving-group
membership now has its own scoped command boundary below. The new command receipts need terminal retention before activation.

### Host assistance guest read

`getEventAssistanceHostGuests` is a manager-only, read-only projection for an
explicit selection of 1–50 unique roster attendee IDs in one live event. It
authenticates and rate-limits the caller, checks organizer management before
source reads, then batches canonical event, plan, runtime configuration, roster,
guest and current-episode Operations records in one transaction. Missing and
foreign roster rows share an unavailable result. Invalid source or incomplete
work records fail the read instead of becoming an empty queue.

The closed row variants distinguish unavailable, ineligible, uninitialized,
sourceChanged and current participation. Only a current episode exposes reported
joining intention and its work. Physical check-in remains a separate canonical
roster fact. Work distinguishes notEnrolled from a recorded run; configuration
status and current/unbound/changed permission binding remain separate from that
run's stored status. A new episode cannot inherit an old episode's work.

Recorded work exposes its last evaluation time and the existing typed live-work
observation, next evaluation due time, expiry and published-intent count. These
are historical observations and scheduling data, not a worker heartbeat or a
promise that a due evaluation has executed. Publication counts message intents,
not sends or delivery; this read does not inspect the delivery outbox. The
response excludes roster contacts, sender credentials, budget authority, guest
grants and Operations record identifiers. Reads never enroll a guest, evaluate
policy, publish, schedule or send.

Coverage is explicitly `selectedAttendees` for `lateJoin`; a selection cannot
claim an event-wide all-clear or execution coverage for the other 45 workflows.
The Flutter `EventAssistanceHostGuestsRepository` consumes this callable using
the generated request DTO. Its ordered value-equality selection is immutable and
bounded to 50 guests. Strict parsing rejects missing, duplicate, reordered or
foreign rows, unknown states, extra fields, unsafe numbers, future observation
times and inconsistent terminal work. Sealed guest, participation, intention,
destination, decision and observation types retain the backend distinctions.
Contract-driven tests enumerate every current live-work observation and
late-join reason; adding a server variant requires a client parsing decision.
No production JSON-schema interpreter or direct Firestore reader is added.

`EventAssistanceHostGuests` owns the presentation read state and explicit reload
action. Screens must consume this outer provider: it hides previous guest data
immediately during sign-out, authentication failure or account changes. Its
internal async family separates caches by account and ordered selection and
checks the account again after I/O. Late completions cannot replace a newer
account or reload. Successful participation commands invalidate assistance read
queries as well as the individual participation view; no optimistic check-in or
automation result is synthesized. Missing deployment, permission and malformed
responses remain visible read errors.

Host attention/roster presentation, rehearsal projection and activation remain
integration work. The existing runtime and participation commands retain their
own reviewed mutation boundaries.

### Practical guest-help queue and handling

`listEventAssistanceCases` reads open or settled practical requests for one
live event. Each manager-authorized transaction returns at most 50 cases and
an explicit continuation cursor. Coverage is one page at the returned server
time, not an event-wide count, a live subscription or an all-clear. The query
filters for the event-lead owner before reading requests; comfort/safety cases
remain exclusively in the authorized safety-operator boundary.

New guest-help responses preserve both canonical source-generation hashes and
start with an unassigned, revision-zero handling state. Legacy cases remain
readable as `legacy`; missing historical identity evidence is never fabricated.
Recreated, deleted or foreign guest sources produce `sourceChanged`. These
variants hide attendee identity and prohibit mutation. Current requests retain
explicit open/settled state, assignment authority and the recorded resolution.
An assignee whose management access was removed is shown as revoked, without
removing the request from the queue or granting continued access.

`resolveEventAssistanceCase` implements the typed `resolveAssistance` command
for organizer managers. `resolved` and `declined` record the authenticated
manager and timestamp and settle the request. `transferred` assigns a current
organizer manager and keeps it open. A named recipient is not itself an
access grant; the canonical organizer is re-read in the mutation transaction.
Every command requires the reviewed source hash and case revision. Immutable
`eventAssistanceCaseReceipts` make exact retries return their original operation
revision with the latest case view; reused operation IDs with changed content
fail. Concurrent resolutions cannot overwrite one another.

The Dart client represents current open, current settled, source-changed and
legacy requests as separate sealed types. Only an open request from a reviewed
page can enter the action editor. The callable repository uses generated request
DTOs and validates response scope, pagination, revision, assignment and resolution
before publishing a result. A replay keeps its original operation revision
separate from the latest request state.

The account-scoped page provider and action editor share the departure flow's
uninterrupted sign-in identity. Loading, sign-out and account changes remove
private page/form state; returning to the same UID cannot revive an old decision.
The editor starts without a selected action, freezes one command while submitting,
deduplicates pending submissions, and allows an uncertain retry only with that
exact command. Conflicts or lost authority require a new review. Success refreshes
the queue without retaining the old actionable page while it loads. Reads retry
only on explicit reload; neither the page nor the editor fabricates settlement.

The case editor is keyed by the stable event/case scope, with an explicit `open`
review. Retiring a page disables its unsubmitted decisions; opening a fresh page
cannot replace a submitted or uncertain command. A temporary strong auth subscription
keeps account changes visible while the sheet is detached. Exact retry is distinct
from new submission, and unknown outcomes prohibit reload. The state owner validates
the typed result against its own command before clearing uncertainty.

`EventAssistancePendingCases` holds only account-bound discovery references to these
case owners. This allows the queue to recover an uncertain save even when the server
has already moved that case out of the open page. It stores no second command or
receipt. Each successful or definitively rejected operation removes only its own
reference; account changes retire the index. Tests cover missing rows, multiple
pending cases, detached retries, reentrant taps and same-UID sign-in replacement.

The shared runtime now mounts a practical-help entry, open/handled queue and atomic
request decision sheet in live mode and rehearsal. Verified guest names, category,
request time, assignee and outcome use readable records. Only transfer configuration
reveals a manager picker; self-assignment, transfer, resolution and decline require
an explicit save. Unnamed or indistinguishable other managers cannot be selected.
A review binds the current guest name into its source hash. Missing or replaced
sources redact the name; omitted older name/choice projections remain unknown.
Manager choices are caller-bound snapshots; every server write independently
rechecks current manager authority. The choice list cannot grant or extend access.

Live pagination preserves an explicit cursor history without claiming an event-wide
count. Practice pages slice the bounded session queue and preserve untracked legacy
flags separately. Both queues expose pending-command discovery even when a case is
no longer open. The rehearsal case owner binds organizer/session, setup generation,
clock and case; it retains one exact command across refresh and detached sheets,
retires account authority on sign-out, and verifies the specific help outcome behind
the parent receipt. Current manager choices gate transfer selection in both owners.
Delegated practice roles can review help but cannot handle it as the Host.

The help entry also remains in every report availability state, including waiting
for feedback or a disabled report module. Event completion never hides practical
follow-up. Actual backend read fixtures exercise both adapters; shared widget tests
cover handoff, unconfirmed save, sheet closure, exact retry and resolution at normal
and 2x text size. Isolated Widgetbook previews use those fixtures and simulated
uncertainty; their shared generated index remains claimed by another task.

Handling never changes attendance, participation, allocations, guest intention,
message delivery, consent or the restricted safety queue. Check-in, a new guest
episode, event cancellation and the event end time do not settle an unanswered
help request. A retried guest reply cannot reopen a settled case. Case records
and receipts remain server-only. Host Today integration, audited legacy repair and terminal retention remain
subsequent work; these callables have not been deployed by this source change.

### Delivery review and manual handling

`listEventAssistanceDeliveries` returns a manager-authorized page of up to 50
recorded messages for one live event. Each row separates delivery evidence,
coordinator progress and manual ownership. Accepted, unknown, reserved, failed,
verified-revoked, delivered/read and conflicting states remain distinct; a failed
attempt cannot hide another pending submission. Coverage is only the returned
page. Endpoints, provider IDs, templates, private message content and guest-link
secrets are excluded. Missing/recreated guest sources hide attendee identity and
remove available actions; malformed matching records fail visibly.

`repairEventAssistanceDelivery` implements `repairDelivery/manualHandoff`. A
current organizer manager must supply the exact reviewed message revision and
review hash, which also binds guest/source and coordinator state and the current
owner's authority. The command records manual ownership on the immutable message
and an `eventAssistanceDeliveryRepairs` receipt in one transaction. It stops future
reservations and claims; an already-issued provider permit may still finish.
Taking over does not mark the message delivered or failed, refund spending, or
change consent. A removed owner's message can be explicitly taken over after a
fresh review. Ownership applies to this message, not future messages for the guest.

The message lifecycle stays active so valid guest replies remain usable. Late
receipts still update its evidence, and exact command retries return the original
operation revision with the current view. The existing dormant coordinator
observes the handoff as `hostStopped` and closes its work without claiming a
provider outcome. Host commands do not write Operations checkpoints directly.
Provider lookup and verified retry actions are still unavailable and are not
advertised in the returned actions.

The native delivery repository uses the generated callable DTOs. Strict,
SDK-free Dart models distinguish actionable, observed and source-changed rows;
only an actionable row can construct a handoff. Sealed coordinator states keep
queued, waiting for receipts, retrying, review and completed work separate from
provider evidence. Contract-driven tests cover each canonical phase/reason and
message purpose. Parsers reject leaked fields, foreign scope, contradictory
summaries, impossible deadlines and invalid pagination. An applied handoff must
retain the reviewed attempt evidence and belong to the authenticated actor;
replays preserve later receipts, source changes and ownership without replacing
their original operation revision.

The account-scoped page provider hides old rows while loading, after sign-out
and across authentication failures. A review is bound to its actual page row
and uninterrupted sign-in period. The per-message controller requires that
current review before a new action, deduplicates submissions and retains one
immutable request through uncertain failures, sheet dismissal and page reload.
A temporary strong auth subscription fences unseen account changes while the
sheet's normal provider dependencies are paused. Definitive conflicts discard
the request and require a fresh page. Success invalidates delivery pages and
uses the returned current state, with no optimistic delivery or handoff.
Rehearsal Host bootstrap adds a `deliveryReviews` projection scoped to the current
clock and the latest message for each synthetic actor. Coverage is explicitly
`currentActorMessages`; it is not a historical delivery total. Rows reuse the
live evidence, ownership and action shapes, and the same pure evidence ordering
and handoff availability rule. Coordination remains `untracked` because the
rehearsal recipe is exposed separately; no Operations run is invented.

Rehearsal `repairDelivery/manualHandoff` requires the reviewed message revision
and hash in addition to the existing setup/runtime generation and immutable
parent action id. The hash binds actor identity/timestamps, participation facts,
recipe, virtual clock, message and current ownership authority. Ownership is
stored on the private rehearsal message wrapper; live outbox handoff markers
remain forbidden in rehearsal records. The parent transaction commits ownership,
action history and runtime revision together. Exact retries return current
bootstrap evidence without replaying the action, and resets reject old commands.

Manual handling stops further explicit and scripted attempts, including after a
late failure or conflicting receipt. It preserves the script cursor, guest
intentions, physical attendance, message lifecycle and valid guest reply path.
Later receipts retain their actual evidence. A removed owner can be replaced
only after a fresh review. A new instruction has independent ownership, and
reset/expiry use the existing message cleanup. Provider lookup and verified retry
remain unavailable in rehearsal as in the live Host action.

Native rehearsal bootstrap now parses those reviews using the same immutable
delivery-evidence model as live delivery. A separate rehearsal scope binds the
session, organizer, setup generation, virtual clock and message. Parsing checks
the complete current-actor coverage against the actor's instruction and route
attempts; private fields, foreign clocks and stale offered actions fail closed.
Only a reviewed actionable row can construct `RehearsalTakeDelivery`, through
the existing rehearsal callable. Immediate confirmation must retain the original
attempt evidence and record the authenticated host's ownership. Replays retain
later receipts and allow a replaced instruction to leave current-only coverage
only when the original action receipt and later runtime revision are present.

`EventRehearsalDeliveryController` owns one pending handoff per rehearsal message
and uninterrupted sign-in period. Its current-page review is required for a new
request; an uncertain request survives page refresh and sheet closure with its
original setup/runtime revisions, review hash and action id. Duplicate or
reentrant taps share the pending future. A temporary strong auth subscription
revokes pending state across account changes even while the sheet is closed.
Definitive rejection requires a fresh review, and confirmed completion refreshes
the rehearsal runtime and review. The generic rehearsal editor rejects delivery
takeover so it cannot replace that message-scoped retry owner.

The shared runtime now mounts message-delivery entry points in live and rehearsal
modes, including all report availability states. A bounded message list leads to
one per-message sheet showing provider evidence, automatic follow-up and manual
responsibility separately. Taking responsibility is explicit. Accepted, unknown,
revoked and conflicting reports never appear as confirmed delivery; manual
handling shows that automatic attempts are stopped even while a coordinator
checkpoint awaits its next update. Late reports and guest replies remain visible.
Rehearsal reuses these components and labels its synthetic sending and Host role.
Delegated practice roles can review but cannot take responsibility.

Current guest names come from verified attendee/actor records, are included in
the review hash and disappear after source replacement. Older omitted names
remain unknown. Fresh source-change or access-denied responses take precedence
over a frozen private review. Live page sessions retire when invalidated; a
retired form cannot authorize a new takeover. The state owner independently
validates the returned handoff against the original command. Account-scoped
pending-message indexes contain discovery references only, so an interrupted
handoff can be reopened and confirmed after sheet closure or when the message
leaves the current page. They never duplicate a command or infer delivery.

Backend-generated live and rehearsal fixtures cover uncertain, handed-off and
later delivered messages. Native tests exercise those projections, exact-command
recovery, page navigation, account changes, redaction and report entry points;
real-adapter widget tests cover both modes at normal and doubled text size.
Isolated Widgetbook previews use these fixtures. Shared index registration remains
pending while its owning worktree holds that generated file. Provider lookup,
verified retry and deployment remain subsequent integration work.

### Rehearsal visit accountability

Synthetic actors now record distinct physical visits. Arrival stores the virtual
check-in time; leaving and rejoining advance a separate attendance revision,
including when both happen at the same virtual instant. Crossed scenario cues
use each cue's scheduled time. Connection state, consent flags, guest moments
and table placement do not create a visit or invalidate its outcome. Legacy
presence without visit evidence stays unknown until an explicit observation.

The Host-only bounded review distinguishes unavailable evidence from an unresolved
current visit. A typed `resolveAccountability` command records returned/departed
or explicitly reopens that visit using the live accountability reducer. It binds
the reviewed actor, episode, visit and resolution revision through a source hash,
alongside the rehearsal setup/runtime revisions and immutable action receipt.
Current organizer-manager authority is required. Stored historical outcomes
cannot carry over to a new visit; exact retries return the current review without
reapplying old proof. Completion still permits follow-up within the session cap.

The parent rehearsal transaction owns actor changes, action history and runtime
revision. Reset rebuilds visits and rejects earlier commands; expiry removes them.
Guest projections remain unchanged, and the resolving Host identity stays in
private audit evidence. No attendance, group movement, help request, consent or
provider effect follows from an accountability decision.

Native bootstrap now parses these reviews into immutable, bounded visit evidence
and distinct actionable/observed rows. Clock and episode identities match the
backend; foreign or incomplete rosters, fractional revisions, leaked audit fields
and inconsistent availability are rejected. Missing legacy projections stay null.
The shared live disposition enum supplies returned, departed and unresolved.
Only an actionable row from the current review can construct the typed rehearsal
command; it cannot supply a live command context.

`EventRehearsalAccountabilityController` retains one immutable pending decision
per synthetic guest, rehearsal generation and uninterrupted account session.
Duplicate or reentrant taps share that request. A refresh or closed sheet cannot
replace an uncertain decision, including after a retry is rate-limited; sign-out,
account changes and authentication errors retire it. The generic assistance
editor rejects these commands so it cannot replace their retry owner.
Immediate confirmation must match the visit, disposition, revision and virtual
time. Exact retries verify the original receipt while preserving later visits,
departures and corrections. Successful decisions refresh runtime and review
providers. Host screen mounting and rehearsal departure, checkpoint and closeout
workflows remain subsequent integration work.

### Saved assistance settings

`event_assistance_settings.schema.json` defines reusable templates for all 46
workflow configurations. Templates omit a runtime subject and the server-owned
policy implementation version. Runtime `EventAssistancePolicy` instances retain
their correlated event/guest/group/resource/unit scopes. Catalog checks enforce
complete template coverage and configuration/authority constraint parity.

`getEventAssistanceSetting` and `setEventAssistanceSetting` expose manager-owned
settings for one event/group/workflow. Groups inherit the event default unless
they have an override; `inherit` resets an override and `disabled` suppresses
that workflow. A configured template can also retain its configuration with a
disabled setting. The projection distinguishes unconfigured, configured,
disabled and sourceChanged, and identifies whether the value came from the
event or group. A late-join suggestion uses review-before-send authority and
confirmed group progress, an event-end cutoff, three messages and ten minutes
between material updates. Suggestions are never implicitly persisted or enabled.

Saving re-reads organizer authority, canonical event/group source, own and
inherited settings, and a command receipt in one transaction. Source hashes
bind event creation generation, format, schedule, routing, admission and pricing
inputs while excluding attendance counters and live step progress. Changed
configuration source requires review; explicit disablement remains effective.
Revision checks and immutable receipts prevent concurrent or replayed requests
from replacing a newer choice. Explicit joining destinations must exist in the
reviewed group/event setup. No setting write creates a guest episode, message,
workflow run or provider authority.

`bindPolicyTemplate` adds a concrete runtime subject and the server-owned policy
version. The late-join selector resolves only from supplied current confirmed
group progress and its saved destination choices; absent guidance remains
unresolved. It does not infer pace-group membership from seating or social pods.
The source reader below now joins live participant, group, settings and progress
facts. Late-join communication facts now join them through the evaluator below.
The atomic policy-aware publisher below now prepares current instructions.
Durable worker scheduling, complete runtime readiness checks, Host settings
controls and the rehearsal adapter remain integration work. Configured preferences
do not claim that an executor is implemented or activated. Terminal setting/receipt
retention remains to be defined before activation.

The Host Dart client now implements the late-join settings path with typed
joining destinations, cutoff, message limits, unanswered policy and template
authority. Event defaults (`event:whole`), group overrides, explicit disablement
and reset-to-inherit remain distinct. A disabled configured template retains its
configuration; stale enabled settings preserve the recorded choice for review
while withholding an effective policy. The server suggestion remains unselected
until the Host chooses it. These types describe settings, not provider readiness.
The settings review also supplies a bounded list of named joining destinations
with locations and the current event end, from the same source hash as the
preference. Event-wide choices include configured meeting places and itinerary
stops; pace-group choices contain that group's configured route checkpoints.
They describe setup, never current movement. The native parser shares joining
option validation with group progress, rejects duplicate or foreign-group
options, and distinguishes an older response without setup from a confirmed
empty list. Cross-stack fixtures come from actual settings reads and writes,
including custom, disabled and replayed preferences. This projection prepares
configuration controls without selecting a destination or saving a preference.

The callable repository validates closed response shapes, event/group/workflow
scope, own revision, inheritance origin, source freshness and recorded timestamps.
A save freezes its reviewed source hash, own revision, request ID and typed
preference. Applied responses must confirm that exact choice; replays preserve
the original operation revision independently of the latest current setting.
Account-scoped reads hide stale private state during loading, sign-out and auth
errors. Each event/group has one stable preference editor for an uninterrupted
sign-in. Retired review pages cannot authorize a new choice; explicit open,
select, submit and exact retry operations retain the same immutable command
through page refresh and sheet dismissal. Reload cannot discard an uncertain
save. A temporary strong authentication subscription clears detached pending
state on sign-out, same-UID re-entry and authentication failure. The state owner
independently validates the receipt's scope, revision, applied preference,
manager and timestamps. Conflicts or lost authority require fresh review;
success reloads settings without optimistic execution or enrollment. Focused
tests cover detached recovery, foreign-group and actor receipts, and immediate
retry callbacks.

The actual Event Success Setup tab now mounts a compact late-arrival settings
entry. Event defaults open directly; configured group overrides appear on demand.
The shared form shows the saved status and current proposal, with destination,
cutoff, per-guest update limit, minimum interval and unanswered handling behind
customization. Mode changes preserve all customized rules, and disabling a
configured preference retains its template. Group inheritance explicitly removes
the local override on save. Joining points come only from the reviewed setup;
removed points and out-of-window custom cutoffs require a new choice. Missing
setup from an older API permits disablement or group inheritance, not invented
configuration options. Defaults and edits stay local until Save rules.

A pending-settings index contains only scope references and keeps uncertain saves
reachable even when current group setup changes. Each stable editor still owns
its command and exact retry; the index cannot execute or replace it. The live
sheet hides private data on lost access or authentication and validates saves at
the state owner. Normal and large-text widget tests exercise customization,
disabling without losing rules, dismissed saves, exact retry and sign-out.
Widgetbook preview sources use real backend read fixtures and a local transport;
shared generated index registration awaits its current owner.

The rehearsal settings adapter and event messaging controls remain integration
work. The shared form does not activate a sender or claim messages are running.
This client currently edits the late-join workflow; other catalog entries still
need their corresponding Host configuration adapters. A setting change issues
no message, attendance, progress or allocation command.

### Live late-join source assembly

`readLateJoinSource` is a bounded, transaction-based internal worker reader.
It joins canonical event/roster records, the current participation episode,
accepted moving-group membership, saved policy and confirmed group progress.
The reader and settings callables share `readSettingState` / `resolveSetting`,
including group inheritance, explicit suppression and changed-source review.
It performs no writes, creates no episode and grants no provider authority.
It is not a public callable; consumers must authorize event/guest scope.

The result distinguishes ready domain facts from missing episode/membership,
replaced guest/group source, unconfigured/disabled/changed settings, a closed
or non-live event, and absent/stale progress or destinations. Pending transfers
keep the accepted group's policy and guidance. Acceptance uses the receiving
group's settings; re-entry requires current membership. Scheduled itinerary
items and an elapsed clock never imply confirmed movement. Attendance uses the
canonical roster status/revision, independently of reported ETA or participation.

`LateJoinDomainFacts` intentionally cannot satisfy the evaluator input on its
own. `completeLateJoinInput` requires separately sourced delivery eligibility,
complete episode message history and a response deadline when policy requires
one, with matching event/organizer/guest/episode and observation time. It then
uses the existing canonical validator and shared late-join evaluator. There are
no default zero message counts or assumed eligible channels. Source errors
propagate rather than producing a safe-looking empty state.

The source hash is evidence for a single snapshot, not a lasting execution
permit. The communication/history join below completes live late-join evaluation.
The atomic publication and final dispatch recheck below now consume these facts.
Durable worker scheduling, provider activation, Host UI and rehearsal runtime
integration remain required before automatic assistance can execute in the app.

### Live communication facts and evaluation

`readLiveLateJoinEvaluation` joins the domain reader, episode message history and
per-route contactability in one read-only transaction, then runs the existing
canonical late-join evaluator. Its sender choices and optional response deadline
are supplied by the trusted workflow configuration, never a client request or an
inferred consent record. A policy requiring a response deadline stays unresolved
until that scoped value is available. No source read publishes, schedules, debits,
loads credentials or submits a provider message.

`readSmsMessagePermission`, `readWhatsappMessagePermission` and
`readRcsMessagePermission` are shared by
pre-publication contactability and the final channel dispatch readers. They bind
current event/attendee source, phone and linked identity to exact immutable consent
receipts, sender identity and expiry. WhatsApp also checks endpoint STOP and a
bounded set of CRM/provider/admin suppression records. Regranting event consent
does not bypass an independent pause. Each selected channel needs its own proof;
WhatsApp suppression does not revoke a separately granted SMS preference. RCS
binds the configured Catch sender and its current agent, recipient prefix,
allowed purpose, approval and quote window. STOP comes from the shared verified
conversation reader; START does not change its permission or evidence hash.
The canonical automatic RCS route now requires `senderId`, just like SMS and
WhatsApp. Old senderless placeholders cannot authorize preparation or dispatch;
configuration must be reviewed with an explicit sender before activation.

Contactability permits preparation only. It checks sender activation, quote window,
purpose mapping and consent without a secret or guest bearer token. Exact message
rendering, current template material, credentials, spending ceilings and the
reservation/claim boundary remain mandatory at dispatch. No reachable or delivered
claim is inferred from an eligible preparation result.

`readLateJoinMessageHistory` reads at most 201 rows for the exact live organizer,
event, attendee, episode and lateJoin workflow. It includes every occurrence and
lifecycle, supported by an explicit Firestore composite index. More than 200 rows
returns historyLimit rather than evaluating a partial page. Reserved and possibly
submitted messages count once per intent, including superseded/cancelled records
and uncertain outcomes. Channel retries/fallback attempts do not multiply this
logical message count. A queued intent without attempts, or attempts all proven
notDispatched, consumes no outreach allowance. Conflicting delivery evidence and
ambiguous latest material stop evaluation for review.

The latest logically created attempted intent determines the previous material;
the latest observed attempt-state time across the episode conservatively bounds
cooldown. A delayed older receipt cannot replace newer guidance or shorten the
interval. Complete empty history can yield zero; unavailable, malformed, foreign
or truncated history cannot. These records must remain retained while an episode
can execute. The evaluator result is a proposal, not an execution permit. Durable
worker scheduling, UI case handling and other workflow fact adapters remain
integration work.

### Atomic late-join publication and current dispatch policy

`LiveLateJoinPublisher` evaluates current domain facts, consent and complete episode
history inside the same transaction that publishes an immutable message and moves
its workflow thread. It accepts a trusted expected guest episode and runtime
configuration, never caller-authored instructions or an eligibility verdict. An old
episode cannot act on a re-entered guest. Suggestion-only settings and unresolved
required response deadlines publish nothing.

The publisher uses one lateJoin occurrence per guest episode. Its semantic message
identity includes current confirmed guidance, policy binding, sender selection,
response choices and delivery policy while excluding the evaluation clock. An exact
retry reuses the original immutable creation time and existing thread revision.
Changed content creates a new intent and supersedes the previous thread message;
existing guest links follow the current thread. Interrupted commits create neither
a partial thread nor a partial message.

An automatic joining intent carries a strict optional `automation` binding containing
policy version, selected setting identity/revision, accepted group, exact ordered
sender routes and the explicit response deadline. The field is optional only for
the pre-existing trusted explicit publisher path; absence is never automatic
execution authority. Rehearsal and non-lateJoin intents cannot claim this binding.
The automatic publisher always attaches it. No new client access is granted.

Current instructions may be published while outreach is capped or throttled, so the
joining page can stay useful without sending another message. At both reservation
and final dispatch claim, automatic messages re-evaluate current policy, saved
setting revision, group, participation, attendance, intent, consent and episode
history. The message's own exact immutable intent is excluded only from that final
outreach count/cooldown calculation: retries reuse one logical slot rather than
charging that slot twice. Its conflicting delivery evidence still blocks execution,
and all other attempted intents, including superseded messages, still count.
The existing outbox independently gates retry/fallback and ambiguous submissions.
Disabling, replacing or reducing the authority of a setting withholds queued sends.
A different ready sender cannot substitute for the frozen sender selection.

Plan-change and post-event follow-up notices can now carry a separate strict
`operationalNotice` automation binding. It ties the notice purpose, workflow
occurrence, source revision, semantic content hash, selected setting revision
and ordered sender routes together. Their saved policy owns those routes and
the retry limits. Setting writes verify that each selected sender is currently
eligible for the notice purpose; publication accepts no caller-owned delivery
options. Only those two command variants can use the
binding; a changed body, source revision, workflow or route list fails contract
parsing. The shared delivery coordinator and SMS, RCS and WhatsApp workers can
execute a correctly bound notice. They recheck the saved setting at reservation
and claim time, including its current source, execution authority, policy
version, route order, retry limits and expiry ceiling. Pausing, replacing or
narrowing the setting stops a queued notice before a provider call.

`prepareOperationalNoticePublication` is the trusted publication boundary for
these notices. It accepts message content only from a typed domain source-reader
adapter, verifies that the source applies to the exact guest, reads the current
saved policy, and enforces `maximumPerGuest` with a roster-generation-bound
quota. The message, delivery work, quota and immutable source-publication
receipt commit together. A retry of the same source revision reuses the receipt;
a later source revision consumes the next quota slot. Re-entering an event does
not resend the same source occurrence, while a genuinely recreated roster row
cannot inherit the earlier row's quota.

`EventPlanChangeSourceReader` reads an immutable, monotonic source written with
an attendee-relevant event edit. It rejects superseded revisions and roster
rows created after the change. `PostEventFollowUpSourceReader` reads the
terminal Event Success plan revision and admits only checked-in attendees after
the scheduled end. Both derive bounded copy and acknowledgement/help choices
from source facts. `OperationalNoticeFanoutStore` owns the durable coordinator:
it freezes the immutable source and selected policy revision, scans at most 20
attendees per checkpoint, creates or reuses their stable current enrollment,
and publishes one source-bound notice per eligible guest. Plan changes are due
immediately; post-event follow-up waits until the scheduled event end. A source
or policy revision change stops unfinished work instead of silently changing
the audience, copy, routes or authority mid-run.

`prepareGuestMessagePublication` and `prepareLiveLateJoinPublication` complete all
reads before returning their write-staging closures, allowing a fenced
Operations checkpoint to share the commit. The automatic preparation expires after
at most 30 seconds and never crosses the intent or unanswered-response deadline.
`LiveAssistanceWorkStore` now persists due times, decisions, message references,
terminal/review outcomes and its Operations checkpoint in the publication
transaction. Its worker uses current leases and durable wake receipts. Source
changes enqueue bounded resumable fanout; work-item and scheduled handlers
advance saved due work. These handlers remain dormant in deployment policy.
See [Operations runtime](operations_platform.md#durable-live-assistance-work)
for execution limits and the source-change lifecycle. The broader Host/rehearsal
workflow remains separate integration work. A
publication result does not assert provider submission or delivery.

### Event automation permission

`getEventAssistanceRuntimeConfig` and `setEventAssistanceRuntimeConfig` give
organizer managers a single event-scoped late-join execution configuration.
This complements the 46 typed policy settings: policy defines the allowed
behavior, while runtime configuration selects ordered sender routes, explicit
response deadline, retry policy, optional later joining choices, work expiry
and evaluation limit. A ready provider, consent or enabled policy is not implied
by saving the configuration. Other workflow executors remain unimplemented.

The Host client now has typed runtime configuration, callable reads/writes,
account-scoped review state and a configure/pause editor. It preserves sender
order, nullable response deadlines and optional choices for fixed places,
itinerary stops and group checkpoints. Configure and pause remain explicit
decisions. One stable editor per event and uninterrupted sign-in owns the frozen
command; a refreshed page cannot replace an uncertain configure or pause. Opening
a review, selecting a command, first submission and exact retry are separate
operations. Retired pages cannot authorize a new choice, and reload cannot discard
an uncertain save. The command survives closed sheets, with a temporary strong
authentication subscription that discards it after sign-out, same-UID re-entry or
an authentication error. The state owner validates the returned scope, original
operation revision, actor and applied configuration independently of the repository.
A replay shows current saved state, including a newer pause. Conflicts require a
fresh review. Focused tests cover detached recovery, account changes, rejected
foreign receipts and reentrant retry callbacks. Rehearsal integration remains
separate work.

The runtime read now includes optional `senderSetup`: up to 20 scanned records
per SMS, organizer WhatsApp and RCS channel, plus any saved selections outside
those pages. Cursors advance by scanned document identity, including filtered
records; a deleted cursor does not strand the next page. WhatsApp discovery is
restricted to the current organizer. Closed projections contain only channel,
sender reference, display name/address, review hash and a typed eligibility
state. They distinguish setup required, approval/quote expiry and unavailable
joining templates. Neither eligibility nor a saved runtime proves guest consent,
recipient capability, budget, current credentials or provider delivery. Missing
setup in an older response stays unknown, never an empty verified directory.

Each configure command now re-reads its selected sender sources and rejects
missing, foreign or currently ineligible senders, including expiry during
preparation. Optional `senderReviews` binds each selected channel and sender to
the exact displayed source hash; native changes from a reviewed directory include
these hashes. Paging preserves channel identity, immutable choices and cursor
progress. Legacy requests without hashes still undergo current provisioning
checks, but have no displayed-identity comparison. Pause and exact receipt replay
do not depend on current sender eligibility. Reads and command review neither
load secrets nor contact providers. Cross-stack fixtures are generated from real
server reads and a reviewed configure, with focused coverage of paging, ownership,
source changes, template withdrawal, expiry and immutable native payloads.

The live Event Success settings section now opens `EventAssistanceRuntimeSheet`.
Its compact form presents named sender choices in explicit first/fallback order;
opening a new configuration selects no channel. Event end, no response deadline,
three total attempts, one attempt per channel, a thirty-second retry gap and a
bounded internal evaluation ceiling are proposed defaults, never writes. Saved
configuration wins over defaults, including absent versus empty later-joining
choices and existing evaluation limits. Timing, optional host-review deadline
and retry limits expand on request. The current UI preserves later-joining
choices; editing those named choices remains separate work.

`EventAssistanceRuntimeSenders` binds paged choices to one event review and
authentication epoch. It merges only the requested channel, retains filtered
page continuations, rejects backwards clocks/cursors, and requires a full reload
when event revision, source, availability or an already-reviewed sender changes.
Retired directories cannot supply new configuration decisions. A page loading
or losing access cannot expose choices from another account or continue an old
callback. Each selected sender contributes the displayed hash to the frozen
command; the server still rechecks every source at submission.

Pause is a separate action that remains available without eligible senders.
Unconfirmed configure/pause decisions disable edits, survive sheet dismissal,
and expose a recovery entry in event settings until exact retry resolves them
or authentication retires them. The sheet distinguishes configuration from
enrollment and delivery, and explains that an accepted provider message may
still arrive after pausing. Normal and large-text widget tests exercise sender
selection, progressive limits, lost replies, dismissal/reopening, pause and
sign-out. Four local Widgetbook previews cover the form, sheet, channel choices
and limits; shared-index registration remains pending its existing file claim.

Runtime options cover the whole event. After verifying the complete saved
configuration, publication includes only later joining choices allowed by that
guest's current policy. Choices for another group no longer prevent publication;
the saved configuration and its dispatch authority remain unchanged. Duplicate
channels, duplicate joining targets and deadlines beyond expiry are rejected
before a configuration write. Record reads enforce the same invariants.

The command is a strict configure/pause union. Both operations re-read manager
authority and the reviewed event source, check the runtime revision and commit
the record with an immutable request receipt. Configuration saves its roster
run/item in that same transaction, so activation or trigger delay cannot lose
the enrollment request. Configuration must expire within
the open event; a paused record can retain its prior configuration. Exact
authorized retries return the original operation revision and current state,
so replaying an old configure cannot undo a later pause. Event replacement,
schedule or format changes require fresh review. Plan completion, cancellation
or expiry withholds execution without manufacturing guest attendance.

The private `eventAssistanceRuntimeConfigs` and
`eventAssistanceRuntimeConfigReceipts` collections allow no client reads/writes;
callables expose the manager projection. A configured response means permission
was saved, not that guests were enrolled or messages sent. The configuration
transaction saves a durable roster scan; the background
handlers remain dormant and Host controls remain integration work.

The trusted `LiveAssistanceEnrollmentStore.ensure` boundary verifies the current
saved configuration and canonical registration in one transaction. For an eligible
registration, missing current participation and its first Operations run/item are
created together. Identity is stable across retries and runtime revisions. Existing
breaks, departures, not-coming responses and closed participation are preserved;
enrollment does not check anyone in. Replaced registration identities receive a new
episode; explicit re-entry uses its already assigned episode. Erased participation
cannot be reconstructed over existing work. Current, completed, expired, held and
rebind-required results stay distinct. The resumable roster worker calls this
boundary for each discovered registration and uses the leased rebind action
when existing work needs the current saved configuration.

`LiveAssistanceWorkStore.rebind` adopts a current manager configuration under the
existing work-item lease and an immutable action receipt. It keeps the guest
episode, messages, thread, participation, consumed evaluations and delivery budgets.
Run/item basis hashes change atomically with the configuration binding. Lowering a
limit below consumed evaluations holds further evaluation; raising it only allows
the remaining difference. Fresh evaluation is due immediately unless an existing
evaluation-limit hold still applies. Completed and expired work cannot restart.
Historical rebind/evaluation receipts remain replayable after later changes or
pause without reapplying effects. The caller supplies only a saved binding, never
replacement options or a reset request.

Scheduled guest evaluation requires a runtime id/revision binding. Bound work
initialization verifies the complete configuration. Publication copies that
binding to the immutable message; reservation and final dispatch re-read the
current runtime in the same transaction. Pause, replacement, wrong event,
changed source or expiry withholds new publication/claims, and permits cannot
outlive configuration expiry. Automatic messages without a runtime binding
cannot claim provider dispatch; trusted store/publisher fixtures without a
binding also cannot become scheduler authority; expiry cleanup remains allowed.
A dormant configuration-change trigger wakes existing enrolled work and reuses
the saved enrollment/rebind scan for the current runtime revision. Registration changes
and explicit re-entry request guest-scoped scans, including registrations added
behind an existing scan cursor. Replies do not repeatedly request enrollment.
The setup callable queues work without creating participation, resetting guest
history, granting consent or invoking a provider. See
[resumable roster enrollment](operations_platform.md#resumable-roster-enrollment).

### Confirmed group progress

Rehearsal now records group departures and checkpoint observations through
`controlEventRehearsal` with `action: movement`. Its closed commands reuse the
live `confirmDeparture` and `recordCheckpoint` payloads and decision rules.
They have a group scope and no invented synthetic actor target. Parent receipts,
setup/runtime revisions, current organizer authority, 24-hour expiry and the
500-action cap apply to each mutation. Replays preserve later reports and never
restore an earlier observation set.

`getEventRehearsalMovement` returns a manager-only review for a frozen whole-event
or pace-group scope. It checks the complete bounded actor roster, exposes current
candidate visits, and pages history at 25 departures. An explicit revision can
select an older departure independently of the latest group position. Scheduled
stops and synthetic GPS never confirm departure. Whole-event venue/itinerary
choices use the frozen setup; subgroup checkpoints require a configured pace group
and route path. A selected guest must have a current physical visit and active
participation, plus accepted membership for a subgroup.

`eventRehearsalMovements` stores immutable departure fields and a separately revised
checkpoint report. No recorded roster, an explicitly empty roster and a selected
roster remain distinct. New checkpoint observations require the original departure
visit; previously recorded observations can survive a later visit. Removing earlier
observations requires an explanation. Guests remain in the original denominator.
A reporting request names a current rehearsal Host and a virtual deadline; overdue,
discrepancy and revoked-owner states remain visible after event completion.
Completion permits reports, but not new departures. Reports never change attendance,
participation, membership, movement or return-sweep accountability.

Rehearsal route recovery consumes the same typed `changeRoute` payload as live
operation. The manager chooses an opaque alternative from the current frozen
setup after a recorded departure. `eventRehearsalRouteDecisions` stores the
source-fenced choice as an immutable overlay with the action operation ID and
decision ID. It advances the shared synthetic progress revision while retaining
the original departure time, roster and checkpoint. A later physical departure
supersedes the overlay. Reset and expiry remove both record types.

Saved movement progress now drives rehearsal joining instructions. Publication,
scripted attempts, Host/guest projection and replies re-read the latest departure
and any newer route overlay in the selected group. Client-authored directions and
the legacy departure flag cannot confirm movement. The server derives text and
targets from the frozen source; later-stop choices must exist in that source. Each
new message binds the confirmed progress revision and source hash. Old unbound
messages remain delivery evidence.

Confirming a departure or applying a route recovery reevaluates enabled assistance
in the same transaction as the parent action, actor changes and messages. A new
destination refreshes the guest page while complete history retains cooldown and
episode caps. Reconfirming the same destination preserves the current automated
message and script cursor. Current accepted membership still gates subgroup
directions; virtual time and GPS never substitute for a departure. A source change
or reset withholds stale instructions.

The native movement adapter now validates opaque alternative identities and the
complete immutable route-decision overlay, derives guidance from the active
overlay and sends `changeRoute` with the reviewed source and progress revision.
An immediate response must return the exact decision and action receipt; a later
retry can rely on that receipt after a newer departure supersedes the overlay.
Movement screen composition remains integration work.


`movementDecisions.ts` owns the shared, side-effect-free departure and
checkpoint-observation rules. Its payloads come from the canonical typed command
union and accept source/visit reviews without a persistence or execution-mode
dependency. Live stores call these rules inside their existing transactions,
after authorization and exact-receipt handling. Source reads, current membership,
reporter access, deadlines, durable work and writes retain their existing owners.
The rules preserve missing versus explicitly empty departure rosters and require
original-visit proof for new checkpoint observations; a return-sweep outcome is
independent. Removing prior observations requires an explanation. Rehearsal
departure, route-decision and checkpoint persistence call these rules inside the
rehearsal-only parent transaction. They grant no live authority.

`getEventAssistanceGroupProgress`, `confirmEventAssistanceDeparture` and
`changeEventAssistanceRoute` provide the live movement command boundary for
the typed workflow. The read projects
destinations from canonical meeting location, itinerary stops with locations,
and configured pace groups with a saved route path. `event:whole` is the
whole-event scope; saved pace-group IDs cannot collide with that namespace.
Itinerary and route references use the event-local `:itinerary` and `:route`
identities. Each choice also carries an opaque `alternativeId` derived from its
current typed target. Scheduled offsets never prove that a group has moved.

Confirmation consumes the existing typed `confirmDeparture` command and the
source hash the Host reviewed. In one transaction it re-reads the event,
current organizer/group-duty authority, live plan, group progress and command
receipt.
The destination must still be one of the current saved choices, the event must
be open and its runtime live, and both source and progress revisions must match.
The source hash includes Firestore event/plan creation generations, so a
replacement document cannot inherit an old confirmation. Clock time does not
confirm movement. The selected destination and actual confirmation time are
persisted separately from assistance policy, message state and attendance.

Route recovery consumes the typed `changeRoute` command. Its group, source
hash and route revision bind the Host's current review; its opaque alternative
must still resolve to a different current destination after a confirmed
departure. Only a current organizer manager may apply it. The transaction
stores the decision ID on group progress and in the immutable receipt, then
advances the same progress revision used by joining guidance. It does not edit
the event itinerary, route plan or schedule.
That keeps emergency operating direction separate from canonical event setup,
while the existing plan-change notice path can continue to own actual setup
edits.

`eventAssistanceGroupProgress` holds the current result per event/group;
`eventAssistanceProgressReceipts` keeps immutable command deduplication evidence.
An exact older retry returns its original operation revision and the latest
view without repeating movement. Reusing its ID with changed content fails.
Source changes preserve the old fact but withhold current joining guidance
until the Host confirms the current setup. Each pace group has independent
progress. No new command sends messages, checks guests in or changes assignments.

All three callables require Auth and App Check and apply rate limits. Organizer
managers retain full authority. A current scoped lead/pacer duty authorizes
progress reads and departure confirmation for its own group; a sweep can read
progress. Route recovery remains manager-only. The legacy check-in permissions
do not imply group authority. Staff
expiry is checked again after transaction reads, including command receipt
lookup. Workflow scheduling, Host controls and the rehearsal adapter remain
separate integration work. The shared late-join evaluator accepts guidance derived from
this record. The transaction reader is also shared by message publication,
link issuance, guest view/reply resolution and the live channel dispatch gate.
It binds joining guidance to the confirmed group's current source, destination,
content and validity window. A newer confirmation of identical material keeps
an older valid link usable; a future instruction revision, longer validity or
altered content is rejected. Changes of destination/setup, replaced event/plan
source, missing progress or a closed runtime withhold current instructions.
Temporary database read errors propagate for retry instead of terminating a
message as superseded.

The callable response also identifies its current caller and exposes a typed
`departureAuthority`: readOnly for a sweep, or canConfirm for a manager/current
lead/pacer. Both carry the current permission expiry. A manager's checkpoint
reporter choice is any currently authorized operator; a scoped lead/pacer may
name only themself. These are role permissions, separate from the view's event
and live-runtime readiness and destination choices. They do not grant access
or guarantee a later command: confirmation rechecks current scope, permission,
expiry, source, revision and any named checkpoint reporter. Duty changes cannot
preserve the earlier UI permission or make an old command executable.

The Flutter departure repository now decodes this response into typed group
scope, role authority, confirmed progress, saved destination choices and current
guidance. It rejects mixed scopes/accounts and inconsistent or expired evidence.
The shared joining-target value supports exact command serialization and value
comparison. A prepared departure freezes the reviewed source and revision;
transport retries retain that decision and operation ID, while a replay's newer
current view remains separate from its original receipt revision.

Roster review binds the explicit, sorted attendee selection to that exact
client snapshot. An omitted roster remains different from an explicitly reviewed
empty roster. A checkpoint request requires that review and a route/itinerary
target, and applies the caller's reporter restriction before submission. The
backend still rechecks selected attendance, membership, source, revision and the
reporter's current duty/deadline. The repository does not retry automatically,
write attendance, or send messages.

The Flutter departure read and form controller now bind each review to one
continuous authenticated account identity. Signing out, switching accounts, or
switching away and back removes the renderable form and cannot revive a pending
decision. Reads and commands recheck that identity after asynchronous work;
an older account's completion cannot publish a view or trigger success navigation.
The form requires an explicit destination choice, discloses roster review and
checkpoint configuration progressively, and clears their dependent decisions
when the host changes selection or destination. A fresh roster review discards
its earlier proof before reading. Confirmation freezes all controls and shares
one request across duplicate triggers. Ambiguous failures retain the exact
command for retry; source/permission conflicts require a newly loaded review.
The editor is owned by group, with an explicit current-review handoff. Refreshing
progress or closing and reopening its sheet cannot replace an unresolved decision.
Both roster reads and confirmations coalesce reentrant triggers before publishing
busy state. Unknown outcomes, malformed receipts and rate limiting retain the
original command; only definitive rejection permits a new review. A temporary
strong auth subscription retires a detached pending action after sign-out, including
a same-account return. Old read completions cannot authorize a refreshed departure.
Repository and controller boundaries validate receipt scope, actor and operation
revision; a newer replay projection is kept separate from its original receipt.
Success refreshes group progress and the Host assistance read.

The shared Event Success runtime now mounts group movement for events with located
itinerary stops. One configured group is selected automatically; pace-group hosts
choose which group to review. The same departure sheet is connected to live
callables or a generation-bound rehearsal movement controller. Scheduled destinations
remain choices until the host explicitly confirms movement. The previous confirmed
destination remains separate from a pending decision and a newer replay projection.

Roster capture is optional and starts with nobody selected. Searchable, paged
checkable rows record the people the host actually observed leaving, with a separate
server review of attendance and accepted membership before live confirmation.
An explicitly empty roster stays different from an omitted roster. Changing the
destination or selected people clears the dependent checkpoint choice. The optional
checkpoint request names the current operator and a bounded reporting deadline;
confirmation records the request without inventing arrival observations. Selecting
another authorized reporter, targeted live candidate projections and operator-only
navigation remain subsequent work. Host entry currently uses the existing authorized
event attendee read; rehearsal supplies its reviewed eligible synthetic candidates.

The shared controls expose pending, uncertain, stale and saved states; reopening a
sheet retains the exact unresolved operation. Both runtimes use the same form,
searchable roster, selection semantics and confirmation action. Native tests cover
normal and 2x text, the real rehearsal runtime entry, optional/empty rosters, checkpoint
dependencies, detached retries and authentication transitions. The backend-produced
movement fixture also exercises the shared self-reporter default. This change does
not activate messaging. Checkpoint reporting now mounts as described below;
reporter-selection controls remain subsequent work.

An existing link follows the workflow thread once a fresh instruction is
published. Until then it returns `noInstructions`, and neither web nor native
buttons can act on the stale destination. The dispatch check applies to SMS
and WhatsApp, including reservation-to-claim changes, without charging a send.
Operational notices retain their separate event-window rules. This binding
also verifies the guest's accepted membership for group checkpoints. The
complete policy/participation fact reader and workflow publisher remain
integration work.

### Departure rosters for checkpoint reporting

`getEventAssistanceDepartureRoster` reviews an explicit selection of up to 1,000
attendee IDs. It requires current group read authority before looking up guests.
The response contains a source-bound selection, without contact details or an
implicit event-wide roster scan. Every selected guest must be currently checked
in. A selected pace-group guest also needs a current accepted membership;
pending receiving handovers do not qualify. Existing participation must
be resumed if paused or departed. Whole-event capture works without initializing
assistance or requiring linked guest accounts. Reported intentions do not count
as physical evidence and do not override a host's explicit observation.

The optional `confirmDeparture.payload.departureRoster` binds this selection to
the current event setup, progress revision, registration generations, exact
check-in and accepted membership. Confirmation re-reads these facts in its
transaction, rechecks staff expiry and event end after roster reads, and writes
an immutable `eventAssistanceDepartureRosters` record with progress and receipt.
The record pins its confirmed destination plus attendee IDs and
source/visit/membership evidence.
Each departure has its own roster identity; later moves, cancellations or group
changes cannot rewrite who was recorded as departing on the earlier leg.

An absent selection means the departure roster was not recorded. It does not
reuse the previous departure's roster or imply an empty group. An explicitly
confirmed empty selection creates an empty immutable roster. Capture never
checks a person in, starts participation, transfers a group, assigns a seat,
resolves accountability or sends a message.

This slice supplies the stable departure scope required by the typed checkpoint
workflow. Acceptance covers atomic interruption/retry, exact-visit and source
changes, scoped authority, bounds and emulator concurrency. Departure-roster
corrections/additions during a leg remain separate implementation work. The shared
roster selection and rehearsal departure adapter are mounted as described above.
No live automation or provider boundary is activated by this change.

### Checkpoint observations

The typed `listEventAssistanceDepartureRosters` read and account-scoped native
history query preserve access to each original recorded departure after later
movement. The ten-row page returns only counts, historical report status and
original request deadline, with an exclusive revision cursor. It distinguishes
omitted rosters, explicitly empty rosters, fixed destinations and legacy records.
Current source labels are withheld after setup changes. The scoped checkpoint
detail read still owns current guest eligibility, reporter and closeout evidence;
history never claims that a former observation establishes present location.
Pagination, revoked/expired duties, changed source, corrupt overflow witnesses
and native account transitions are covered.

Both live and rehearsal movement now open the shared departure-history section.
Checkpoint rows open the exact recorded departure; fixed-destination records remain
read-only. The shared checkpoint form shows the original roster with explicit
observation controls, search and bounded visible rows. Its count describes recorded
observations rather than current physical presence. Previously observed people stay
selected; removing one reveals the required correction explanation. Empty rosters
require an explicit report, while omitted rosters have no observation action.

Live names come from the authorized checkpoint projection and match the original
registration and source generations. Deleted or replaced guest records keep their
original denominator and prior observations, but the UI disables their unidentified
rows. Names are not joined to an independently refreshed event guest list. Rehearsal
uses its immutable fictional departure names with the same form and validation.

The live controller and shared rehearsal movement controller retain unknown outcomes
through closing and reopening the sheets. A pending rehearsal command prevents
another departure's form from replacing its retry. Saved counts come from the latest
server receipt, including newer reports returned by an exact replay. Account changes
hide retained forms. Native flow tests exercise both runtimes at normal and 2x text,
historical navigation, exact retry after reopening, corrections and unavailable rows.
Isolated Widgetbook previews mount the real controls without Firebase; registration
in the shared generated Widgetbook index awaits release of its active file claim.

`getEventAssistanceCheckpoint` and `recordEventAssistanceCheckpoint` operate on
one checkpoint and one explicitly recorded departure revision. Each new departure
roster pins the actual confirmed destination. A legacy roster without that fact
is distinguished from a confirmed empty roster; neither a schedule nor the latest
group position is used to invent the earlier destination. Whole-event itinerary
stops and saved pace-group checkpoints use the same report model.

The typed `recordCheckpoint` command supplies the full accounted-for set, expected
checkpoint revision and optional correction explanation (explicitly null for an
ordinary report). Partial reports leave every other departure member unconfirmed.
Concurrent reviews cannot silently replace each other's observations. Removing a
previous observation requires a nonblank reason; immutable receipts preserve the
original report and each correction. Exact retries return their original operation
revision with the latest report and never reapply older observations.
Checkpoint and consent callbacks share the bounded SDK retry adapter for the
exact closed-transaction read error; uncertain commits remain outside that
adapter and must resolve through their immutable request receipts.

New observations must match the departure member's exact registration generation
and check-in/attendance revision. Missing, changed or malformed registrations stay
visible as unresolved original roster members and cannot receive new proof. Earlier
observations remain historical facts after a guest's visit changes, and can still
be corrected with a reason. Later membership transfers, participation changes and
reported intentions do not erase the original departure scope or establish arrival.
Guests who did not depart on this roster cannot be silently added to its report.

Current managers and the group's current lead/pacer/sweep duties authorize reads
and writes; authority is checked before roster reads and expiry again after all
reads, including receipt lookup. Reports can be finished after later departures,
scheduled event end, completion or cancellation. Changed event setup or replaced
source documents withhold new reports; saved reports remain visible when their
source record is intact. No action changes attendance, group progress, membership,
end-of-event accountability, messaging or consent. An empty roster is complete only
after an explicit empty report. Read projections expose IDs, checkpoint facts and
optional verified display names, without guest contact data. A renamed original
registration invalidates a pending observation review; a reused attendee ID cannot
supply the replacement guest's name.

The optional `confirmDeparture.payload.checkpointRequest` names a responsible
operator and UTC-millisecond reporting deadline. It requires an explicitly selected
roster and checkpoint destination and is saved in the immutable roster, in the same
transaction as departure and its receipt. No reporter is inferred from staff role,
late-join configuration author, or departure confirmer. Managers may name another
currently authorized reporter; staff who can confirm departure may name only
themselves. Existing access must last beyond the deadline. The deadline is
bounded to seven days after departure and four hours after scheduled event end.
This assignment grants no access and has no messaging effect.

Checkpoint reads project an optional request with `awaitingReport`, `overdue`,
`discrepancy`, `complete`, `closedOut`, or `sourceUnavailable` state. A partial observation retains
the discrepancy even before its deadline. Current permission loss or access shortened
below the deadline marks the owner as needing reassignment; it never removes the
original request. Permission is re-read, and source/database errors propagate instead
of being treated as revocations. Any currently authorized observer may report; the
recorded reporter can differ from the responsible operator. Complete observations
survive later setup changes and require no new owner. Correcting a complete report
back to a partial set reopens the discrepancy. A wrong checkpoint never inherits
another stop's request. Legacy rosters invent no request or owner, and empty rosters
still require an explicit empty report.

Departure confirmation also creates durable Operations request work atomically.
The worker reconciles the report at the saved deadline and finite reporter expiry;
unreported, overdue, incomplete, unavailable-source and unavailable-owner states
remain distinct. A report-change hook wakes its exact original request, including
corrections. Scoped staff changes enter bounded event fanout. Complete reports go
dormant with no due timer; a correction reopens the same work through a fenced
action receipt. Source-read failures have five scheduled attempts before review,
and changed source evidence can wake the request again. Event end is never an
automatic closeout of unresolved departure members.

Acceptance covers atomic enrollment/interruption/retry, current authority,
deadline/lease races, corrected reports, bounded source fanout, source failures
and Firestore concurrency. The hooks and scheduler remain explicitly dormant.
Staff notification delivery remains integration work;
no provider effect is activated.

The native checkpoint boundary now retains the exact group, saved stop and
recorded departure revision. Its roster view keeps each original member, visit
availability, arrival observation and independent event-visit disposition. Missing
legacy disposition, assignment and closeout projections remain explicitly unknown;
they do not become unresolved results or an absent request. Request deadlines,
owner availability, reporter reassignment and closeout history have typed models
with independent revisions. A closed request with explained departures remains a
partial arrival report, and closeout eligibility does not grant manager authority.

`EventAssistanceCheckpointController` owns one pending report per checkpoint and
recorded departure. A report supplies the complete observation set; new observations
must match the original visit, and removal of earlier observations requires a
nonblank correction explanation. Previously observed members with changed visits
remain visible and can be retained or corrected. Empty rosters become complete only
after an explicit empty report. Uncertain retries retain the exact source hash,
report and departure revisions, observation set, correction and operation ID across
refresh and sheet closure. Account changes retire old state. Applied results must
confirm the actor, report identity, timestamp and chosen observations; replays
preserve newer corrections. Reads and writes use the generated callable DTOs.
The shared native observation and historical navigation controls are mounted in
both runtimes, including verified reporter selection. Staff notifications remain
integration work. Reporting does not change physical attendance, group movement, membership,
consent or event-visit accountability.

### Reviewed checkpoint closeout

`setEventAssistanceCheckpointCloseout` implements the typed
`setCheckpointCloseout` command. The current responsible reporter, with current
group reporting permission, or an organizer manager can explicitly close or
reopen a durable checkpoint request. Closing requires an explicit partial
arrival report and a current post-departure `returned` or `departed` disposition
for every original member who is still unconfirmed. It never marks those
people as arrived or changes attendance, participation, membership or progress.
Legacy departures without durable requests cannot acquire closeout work through
this command. A complete arrival report needs no closeout.

The checkpoint view exposes an independent closeout revision, review hash,
eligibility and state. Missing reports, unresolved members, unavailable sources,
complete reports and already closed requests remain distinct. A changed report,
disposition, original visit or reporter assignment invalidates a pending review;
background worker revisions do not. Both close and reopen require a nonblank
reason. Server-owned proof preserves the full report and exact dispositions in
an immutable receipt. The client cannot supply or replace that proof.

Closeout shares the checkpoint Operations lease. The work/run change, domain
receipt and generic action receipt commit atomically; the latter hashes the
full saved proof. Current authorization is checked before roster reads and
again after preparation. Exact retries return their original closeout revision
and the current view without restoring an older decision. Completed closeout
projects `closedOut` with no owner requirement or due timer, while retaining
the original roster, reporter, deadline and factual arrival report.

A corrected report or disposition reopens review, preserving historical proof.
A later check-in or changed registration also requires review: this adapter
does not maintain a separate historical accountability ledger for every visit.
A fully confirmed arrival report supersedes closeout; correcting that report
can reopen the obligation. Explicit reopening records a new decision rather
than deleting history. Event completion or cancellation does not itself close
an unresolved request. Staff notifications and terminal retention remain separate
integration work.

The shared checkpoint request section is now reachable from the arrival report in
both live and rehearsal mode. It retains the original deadline and saved arrival
count, explains missing report, unresolved member and changed-source blockers, and
offers explicit close/reopen actions only after current permission review. Each
decision requires a reason. Live uses the existing account-scoped request owner;
rehearsal uses its existing group movement owner and the same typed decision.
`RehearsalCheckpointRequestPermissions` supplies both the UI and command eligibility.
An unconfirmed practice decision remains reachable from the parent checkpoint after
sheet closure. Reopening retries the original decision; it never creates a new one.
A confirmed related action may reload the settled observation form, while unknown
outcomes cannot be cleared by reload. Normal and 2x-text tests cover the real parent
entry, close, detached retry, fresh reopen and sign-out in both execution modes.
Original unconfirmed guests now appear as searchable, paged record rows with their
visit outcomes. Both runtime adapters open the existing atomic visit section for
the selected original departure. Resolved visits stay in the original denominator;
only a separate arrival observation changes the arrival count. Live opens an
authorized checkpoint-scoped visit read, including changed or missing records so
an earlier pending decision remains reviewable. Practice uses the movement owner's
new `RehearsalResolveCheckpointVisit` command and can reopen an unknown visit outcome
from the parent request and observation sheets. Settled outcomes refresh closeout
eligibility. The report itself is unchanged.

The rehearsal checkpoint projection optionally supplies `accountabilityReviews` for
every original departure member. Each row binds its original visit hash, current
accountability revision, setup source, group and operator. A missing legacy
projection grants no action. Current original-group duties govern historical work
after a guest transfers, while a new physical visit or replaced actor cannot inherit
the old scope. Like live mode, a recorded checkpoint enables these outcomes even
when the general accountability sweep module is disabled. Missing legacy visit
proof remains readable and explicitly unavailable. The control transaction changes only the selected actor's visit outcome
and parent action receipt/counters; it neither moves the group nor records an arrival.
Applied native confirmations verify unchanged movement/report facts and the selected
outcome; exact replays show later corrections or explicit visit unavailability.
Verified reporter selection is also mounted in this request flow. These controls
send no staff or guest messages.

### Checkpoint reporter reassignment

`reassignEventAssistanceCheckpointReporter` implements the closed typed
`reassignCheckpointReporter` action. An organizer manager can transfer an
outstanding report to a currently authorized observer for that exact group.
The original departure roster, reporter and deadline remain immutable; a
separate assignment revision records the new reporter, previous reporter,
authenticated manager, server time and nonblank reason. It grants no duty and
changes no attendance, membership, report observation or messaging state.

The existing checkpoint read returns the effective reporter and an optional
`assignment` review with its own source hash and revision. Background work
revisions do not invalidate that review. A changed report, original source or
assignment does; a complete or closed-out report cannot be reassigned. Report review hashes
exclude ownership changes, so another authorized observer can still submit
previously reviewed observations. Source-unavailable requests require repair
before reassignment. Legacy requests without durable work expose no assignment
review and cannot silently acquire a new worker or owner.

Manual changes use the same Operations lease as background report evaluation.
The work/run update, generic action receipt and full domain assignment receipt
commit atomically. Reads validate the current assignment against both receipts;
replays return the original assignment revision and latest view, without restoring
an older reporter. Current manager authority is required even for a replay.
Reporter access is checked again after all preparation reads and must extend
beyond both server time and the original deadline. Reassignment after that
deadline remains overdue; event completion or cancellation does not prevent an
authorized manager from taking responsibility for an outstanding report.

The native `EventAssistanceCheckpointRequestReview` combines the shared checkpoint
read with a fresh, account-bound group-permission read. The latter's existing
`anyAuthorizedOperator` permission identifies an organizer manager; scoped leads,
pacers and sweeps may resolve a request only when they are its responsible reporter.
The review checks exact group identity and permission expiry across both reads.
Event/runtime readiness remains separate, allowing outstanding work after the event
ends. Eligibility never grants permission, and the server rechecks authority,
reporter access and the original deadline when applying the command.

`ReassignCheckpointReporter`, `CloseCheckpointRequest` and `ReopenCheckpointRequest`
are explicit native decisions with nonblank reasons. They use generated callable
DTOs and the appropriate assignment or closeout hash/revision. Closing verifies
the complete reviewed report and each unconfirmed member's visit disposition in
the server-owned receipt; the command cannot supply arrival or disposition proof.
Reopening remains possible when old closeout evidence needs review, but not after
a complete arrival report supersedes it. Reassignment grants no staff access.

`EventAssistanceCheckpointRequestController` retains one unresolved request action
per recorded departure across refresh and sheet closure. Uncertain retries reuse
the exact decision, actor, hash, revision and operation ID. A definitive rejection
requires fresh review and an explicit new action. Account transitions retire the
pending action, including callbacks retained by a closed sheet. Applied results
verify ownership, original deadline and unchanged arrival facts; exact replays
preserve later changes. Success refreshes the shared checkpoint read and its
permission-dependent review. Close/reopen and verified reporter controls are mounted
in both runtimes. Staff notifications remain integration work.

The optional `reporterOptions` projection binds the requesting manager, assignment
review hash and a review expiry of at most 30 minutes. Its bounded list combines
organizer managers and current group observers whose authority extends strictly
beyond both the server clock and the original deadline. Each candidate exposes only
an account ID, nullable verified display name and authority deadline. Live discovery
refuses overflow instead of silently showing an incomplete roster. Staff readers,
closed or complete requests and unavailable sources expose null; omitted legacy
metadata remains unknown. Native decisions require membership in the reviewed list,
and the existing transaction still rechecks target authority before saving.

The existing request section reveals a reporter picker on demand, retains the
original deadline, and requires a reason and explicit save. Unnamed other hosts
remain unselectable; self is labelled You. Connection loss freezes the selected
person and exact operation for retry across sheet closure. Rehearsal uses the same
control and decision, with virtual group duties and the original virtual deadline.
A current reporter whose shortened duty no longer covers that deadline explicitly
needs reassignment even while the duty is still active. Neither selection nor
reassignment grants a duty, moves a guest or records an arrival. Normal and 2x-text
interaction tests cover selection, interrupted save, detached retry, confirmation
and account retirement in both modes.

### Scoped group staff

Group duties extend the existing `eventStaffGrants` authority. Managers can look
up an existing Catch staff account, review its group duty and assign or remove
one duty using `getEventAssistanceGroupStaff` and `setEventAssistanceGroupStaff`.
Phone lookup follows manager authorization; the write rechecks that authority,
the verified target UID, reviewed group source and staff revision in a single
transaction. No new account or invitation is created.

Whole-event groups support lead/sweep; saved pace groups also support pacer.
Each person has at most one duty per group. Event-wide check-in/operator access
has its own `operatorExpiresAt`, independently of each duty expiry. The staff
row's overall expiry remains the latest expiry for discovery and the existing
active-staff limit. Adding a duty cannot renew expired check-in access. Removing
one duty preserves the person's other duties; revoking staff revokes all access.
A new assignment to previously revoked staff does not restore old duties.

Each duty binds the event creation generation and saved group configuration.
A changed or removed group withholds authority until reviewed, while routine
attendance, schedule and progress updates preserve it. Stale duties remain
visible to managers for removal. Immutable `eventAssistanceStaffReceipts` fence
retries and concurrent changes. Group staff projections expose only the selected
duty and basic staff identity, not full phone numbers or the event guest roster.

The duty permission map now authorizes progress, departure, membership and
accountability and checkpoint commands. Delegated staff controls and receipt
retention remain implementation work. Group duties alone do not grant the existing event-wide live-location publishing permission.

The native group-staff boundary now supplies an explicit phone lookup, verified
account review and typed assign/remove decisions. Lookup requires a country code;
provider labels show only the last four digits. The view separates the selected
recorded duty from current authority and exposes event-wide operator expiry
independently. Expired, revoked and changed-group records can be reviewed for
removal without being treated as active duties. Pacer is offered only for a saved
pace group; assignment expiry is checked locally against the reviewed time and
rechecked by the server against event closeout and staff limits.

`EventAssistanceGroupStaffController` owns one pending decision per group and
verified staff UID. The full phone lookup, expected UID, source hash, staff revision,
actor and request ID remain frozen for an uncertain retry across lookup refresh
and sheet closure within the app session. A later phone lookup cannot silently
retarget that decision. Account transitions retire old reviews and pending state;
late results cannot restore them. Applied results must confirm the selected duty
and preserve still-valid event-wide operator access. Replays display the latest
duty record rather than restoring an older assignment. Successful writes invalidate
staff lookups because all duties for a person share the same staff revision.
The read uses a generated callable DTO; the nested assign/remove write union has
a handwritten typed adapter checked against the generated canonical schema.
Native setup screen mounting and delegated live controls remain integration work.

### Typed accountability commands

`getEventAssistanceAccountability` and
`resolveEventAssistanceAccountability` bind the typed
`resolveAccountability` command to the existing attendee visit result.
Both this command and `setEventSuccessAccountabilityResolution` use the same
writer fields and monotonic `accountabilityRevision`; clearing advances that
revision too. Current resolution requires the exact check-in timestamp,
including nanoseconds. A new visit cannot inherit a prior result.

Managers can resolve the whole event. A current whole-event lead/sweep can do
the same within its duty lifetime. A pacer, lead or sweep assigned to a pace
group can read and resolve only guests with a current accepted membership in
that group. A pending handover grants no receiving-group authority. Current
permission is rechecked inside the transaction and again after receipt reads
for expiry; legacy check-in access alone grants no accountability duty.

The reviewed source hash binds the event/roster generations, format, current
check-in, accepted group where scoped, assistance episode or explicit absence,
and accountability revision/result. Exact retries reuse an immutable
`eventAssistanceAccountabilityReceipts` entry; changed requests, replaced
registrations, new visits and stale reviews cannot write. Replies and reported
intentions do not invalidate a physical sweep review or become physical proof.
The record never changes attendance, participation, placement, consent or
messaging. Assistance need not be enabled or initialized to resolve a checked-in
guest. Scheduled end, completion and cancellation do not erase an outstanding
sweep; current staff authority is still required.

Without a checkpoint scope, the read distinguishes an available sweep from a
non-sweep format or a guest who is not currently checked in. Both callables
require Auth/App Check and rate limits. Host sweep controls and synthetic visit adapters now use the shared atomic visit
sheet described below. Checkpoint entry points remain integration work.

An explicit optional `checkpoint` scope names a recorded departure revision
and its actual checkpoint destination. It permits the same observed `returned`,
`departed` or `unresolved` visit result for that departure member, including a
bar crawl whose event-wide accountability setting is `none`. It never changes
that setting or enables sweep completion gates. `departed` means the person
has left the event; it does not mean the group left its last stop. `returned`
is the event-visit disposition and never means arrival at this checkpoint.

This scope requires an immutable roster, the named original destination,
unchanged source setup and the exact original registration/check-in. Absent
rosters, nonmembers, changed visits and changed setup have distinct typed
unavailability. The receipt pins checkpoint scope and full roster hash in
addition to the existing visit identity. Scoped permission is checked before
attendee/roster reads and expiry again after all reads. After an accepted group
transfer, former group staff cannot change the global visit result; a manager
can review the original departure using event-wide authority. Existing retry
receipts remain valid only under their original context and current authority.

Checkpoint member projections now include separate disposition evidence. A
usable result identifies the disposition, actor, revision and time, with a
hash preserving precise timestamp evidence. Results from before departure,
malformed/future facts and changed visits cannot prove a new closeout. Clearing
or correcting the canonical result changes that evidence. It never adds the
guest to the checkpoint's accounted-for set or changes the arrival-report
review hash. These facts prepare explicit closeout; they do not close a request,
remove overdue work, send a message or create a second accountability record.

The native accountability flow now reads the exact guest, group and optional
recorded checkpoint scope through generated callable DTOs. Its closed availability
model covers all nine server reasons and withholds writes when the visit cannot be
resolved. A missing assistance episode remains explicit `null`; it does not prevent
an authorized physical-visit decision. Returned, departed and unresolved retain
the shared event-visit semantics. None of these results reports checkpoint arrival,
checks a guest in, changes participation, closes a checkpoint or sends a message.

`EventAssistanceAccountabilityController` owns one pending decision per guest and
authenticated account across all group and checkpoint views. Refreshing the review,
changing the viewed stop or closing/reopening the sheet cannot replace an uncertain
command with a contradictory result. Retries retain the original operation ID,
source hash, episode, group, departure revision and disposition. Fresh reviews and
an explicit selection are required after a definitive rejection. Account changes
retire reviews and pending decisions; old completions cannot restore them. Applied
results must confirm the original scope, episode, next revision and disposition;
replays preserve any later correction. The server remains responsible for verifying
the exact physical check-in and source generations. Successful writes invalidate
accountability and Host guest reviews. Rate-limited retries preserve the original
unconfirmed request; throttling does not prove an earlier save failed.

The live runtime now uses `EventAssistanceLiveSweepSection` to open one guest's
`EventAssistanceVisitSheet`. Rehearsal mounts the same `EventAssistanceSweepSection`
and `EventAssistanceVisitSection` through synthetic adapters. Both show the current
recorded result, explicit returned/departed/unmarked actions, saving, unconfirmed
retry, changed-review and saved states. Dismissal preserves the pending owner;
account changes remove the private review. Checkpoint-scoped reads include a clear
boundary between event-visit disposition and checkpoint arrival. The rehearsal
runtime projects recorded check-in timestamps and visit results into the existing
completion warning, without changing check-in, seating or arrival reports.
Checkpoint arrival reporting has its own controller and observation semantics above;
its runtime entry points remain integration work.

### Guest group membership and handovers

Rehearsal now executes the same six membership decisions through
`controlEventRehearsal` with `assistance.kind: transferGroup`. The live and
rehearsal stores share `membershipDecisions.ts`; each retains its own context,
authority, persistence and receipts. Current organizer managers can place a
synthetic guest in a saved pace group, propose a handover to another current
manager, accept or reject a handover addressed to them, cancel it, or remove the
membership. Proposal does not move the guest. Only acceptance atomically replaces
the single accepted group. Rehearsal now also supports synthetic lead, pacer and
sweep duties through `action: staff` and explicit `practiceOperatorId` reads and
commands. The real caller remains an organizer manager; practice identities
grant no real account or event access. The shared live duty policy governs
permissions and assignment windows, while the rehearsal clock governs expiry.
Receiver acceptance, former-group accountability revocation and checkpoint
reporter authority apply to those synthetic duties. The full private staff
contract and native integration boundary are owned by
[Data Contracts](data_contracts.md).

Synthetic actors now have explicit participation revisions and re-entry episodes.
First arrival, reconnecting, social opt-out and seating changes preserve group
membership. Departure or pending admission withholds new placement/acceptance;
re-entry creates a new episode and makes prior membership historical. Old actors
without participation evidence remain unavailable until reset. Clock generation,
actor creation evidence, source hash, both revisions, current manager authority,
deadlines and the parent 500-action limit fence changes. Reset drops the actor
state; exact retries return the current result without restoring an earlier group.
Complete sessions permit cancellation, rejection and removal, not new handovers.

The private `membershipReviews` bootstrap covers the entire bounded synthetic
roster, including explicit non-applicability for events without pace groups. It
does not expose group audit data to guest pages or write live memberships. Native
readers and commands reuse `AssistanceMembershipFacts` and the shared membership
decision validation/confirmation logic. The ordinary assistance editor cannot
submit group changes; the dedicated membership controller retains one unresolved
command per synthetic guest across role changes. Reporter reassignment and closeout now
execute in rehearsal with independent revisions and the original arrival proof;
`EventRehearsalStaffController` now owns one unresolved staff edit per rehearsal,
including new fictional operators. The optional Practice team section in Practice
tools supports assignment, removal, group, duty, name and expiry with configured
group and event-end defaults. Invalid input cannot reuse a previously valid draft.
Dismissal and refresh preserve an uncertain save for exact retry; a definitive
rejection requires fresh review. Sign-out retires the private draft and delayed
responses. Group duties and responsibilities reuse live types and copy.

The role-selection controller is scoped to the authenticated Host and clock
generation. Deliberate assistance reads include the chosen synthetic operator in
query identity and independently verify returned Host and role. Membership and
accountability controllers use that exact role review while retaining the original
role on an unresolved command. Practice tools now offer an optional assistance-role
selector, and the persistent strip identifies a selected synthetic operator. Host
controls still run the rehearsal. The visit sheet names the original role on an
unresolved command, even after the selector changes. Expired or unassigned roles
remain read-only according to their current server review. Departure, checkpoint
and messaging action surfaces remain integration work.

The existing Event Success live workspace now includes a compact guest selector
for saved pace groups. It loads operational attendees for that capability even
when the format has no sweep or score module. Rehearsal supplies the same selector
and group-action controls through its synthetic adapter. Opening a guest performs
an explicit authority review; choosing an action, destination group, receiver or
deadline does not write. Confirmation submits one of the six existing decisions.
The sheet distinguishes accepted membership, pending/expired handover and changed
source, and offers only server-reviewed actions. It discloses group/receiver/deadline
fields for placement and handover as needed. Receiver choices retain per-group
deadlines; an older server without choices withholds new handover configuration.
Practice resolves names and deadlines from its current fictional team and virtual
clock, without reading production staff. Both modes retain the original role,
decision and request during an uncertain outcome, including across sheet closure
and refreshed reads; exact retry is the only offered write until resolved. The
submitted details are shown while unresolved, and a confirmed response displays
current membership without repeating a historical selection as current state.
Auth changes hide private guest content. These controls do not change physical
attendance or the existing social/table assignment engine, and handovers do not
send a message. Staff-only navigation and pending-handover discovery still require
integration with the operator workspace; this shared Host runtime connection alone
does not provide that separate entry path.

Group-checkpoint practice messages now bind the accepted assignment, group source
and participation episode. The server derives this proof when publishing; Host
plans cannot supply it. Proposal, rejection, cancellation and expiry preserve the
accepted assignment revision. Placement, acceptance and removal advance it, even
at the same virtual instant. Publication, automation, dispatch, guest projection
and replies withhold directions when acceptance is missing, historical or changed.
Old unbound group messages remain readable as delivery evidence but cannot supply
instructions or accept replies. A duplicate response never reapplies its intention
or help effect. Whole-event venue and itinerary directions need no subgroup.
A new accepted group requires a reviewed matching plan and a saved departure for
that group. The private movement binding complements accepted-membership proof.

`getEventAssistanceMembership` and `transferEventAssistanceGroup` own one
accepted moving-group membership per guest, independently of physical attendance,
social allocation, seating, joining intent and message consent. Memberships apply
to saved pace groups; whole-event guidance does not require hosts to assign every
guest to an artificial subgroup. Reads never initialize participation or membership.
A current, admitted participation episode is required for placement and transfers.

The existing typed `transferGroup` command now has six closed decisions: place,
propose, accept, reject, cancel and leave. Initial placement is manager-only and
records that manager's acceptance of responsibility. Alternatively, a manager can
propose an initial assignment to a named receiving operator with no source group.
Leads/pacers can propose a transfer from their current group; sweeps can inspect
its membership but cannot transfer it. Only the named receiving operator with a
current target-group duty (or organizer management authority) can accept. A manager
cannot accept on another operator's behalf. Pending transfers retain the original
accepted group and responsible operator. Reject, cancel and timeout never move a
guest. A pending initial assignment cannot be bypassed by direct placement.

Live membership reads now include an optional `handoverReview` when proposing is
available. It supplies current organizer managers and named event staff with
receiving authority for each saved group. The projection exposes no phone numbers,
private grant details or expanded guest roster. Each group choice carries its own
authority deadline, capped by the event end and the 30-minute handover window.
Expired, revoked, stale-source and sweep-only duties cannot supply a receiving
choice. The read verifies source-guest access before the bounded staff query and
rechecks time and access afterward. It reads one overflow witness beyond the
50-active-staff limit and rejects incomplete or malformed coverage rather than
claiming a partial directory is complete. The writer independently reauthorizes
the named receiver; a previously offered choice grants no lasting permission.
Native readers retain immutable receiver choices, validate their group/deadline
bounds, and accept older responses without this optional projection. New proposals
assembled against this projection cannot substitute an unoffered receiver, group
or later deadline. This is review evidence, not a membership change or a message.

The pending/closed transfer records are correlated schema unions. Closed records
require a resolving actor and time; pending records require both to be null.
Acceptance replaces the single accepted membership atomically. There is no interval
in which a guest belongs to both groups. Deadlines are bounded to 30 minutes and
the current event end. Source-group operators/managers can cancel a pending request
or remove membership; removal also cancels any pending handover. Earlier transfers
remain auditable in immutable command receipts.

The writer re-reads canonical event, roster, organizer, plan, participation,
membership, actor grant and any receiving grant inside one transaction. It checks
the reviewed source hash, membership revision, participation revision and episode;
then rechecks time and authority after all reads. Creation generations fence
replacement event/roster rows. Each accepted membership and proposed target binds
its saved group configuration. A changed target requires a fresh handover without
invalidating the still-current source membership. Breaks/departures withhold new
placement and acceptance; returning in a new episode requires placement review.

`eventAssistanceMemberships` holds current state, and server-only
`eventAssistanceMembershipReceipts` stores the authenticated command and original
operation revision atomically. Exact authorized retries return that revision and
latest state. A former operator loses access once the guest transfers away; a
rejected/cancelled/expired receiving request grants no continuing guest access.
Reads expose one guest's operating state and group choices, without contact fields
or a full roster. Record/receipt retention remains required before activation.

The native membership repository now uses the generated live callable requests.
Its immutable models separate uninitialized, current and source-changed records;
historical accepted groups cannot become current membership. Pending, expired,
source-changed and closed transfers retain their different meaning. Strict
parsing rejects mixed scopes, leaked fields, contradictory action offers, unsafe
times and invalid ownership. Contract tests require coverage of every canonical
decision and transfer state.

Closed native decisions cover place, propose, accept, reject, cancel and leave.
They bind the reviewed source, participation episode, both revisions and one
operation id. Group choices come from the current review; only the named receiver
can form an acceptance or rejection. Proposal deadlines are bounded to 30 minutes
from the reviewed server time; the server still checks the current event end and
receiving duty at mutation time. Applied results must prove the selected ownership
change and preserve unrelated transfer evidence. Replays return newer current
membership without reapplying the original move.

The account-scoped read provider removes prior data during reload, sign-out,
account changes and authentication failures. Its per-guest controller begins
without a selected decision, freezes a submitted command, deduplicates concurrent
triggers and retains uncertain requests across page refresh and editor closure.
A temporary strong authentication subscription revokes that pending state even
while the closed editor's normal dependencies are paused. Definitive conflicts
require fresh review. Confirmation refreshes membership and Host assistance reads;
it does not optimistically assign a group or change attendance. These native
bindings are composed into the shared Host roster, live-assistance and rehearsal
surfaces. Pending requests are not persisted across app restarts.

Group-specific joining guidance now checks accepted membership at publication,
link issuance, guest view/reply resolution and the shared SMS/WhatsApp dispatch
boundary. Pending transfers keep old-group instructions usable; acceptance,
removal, a replaced source or a new participation episode withholds stale group
instructions. The next valid publication can update the existing workflow link.
This does not infer a guest's location, check-in or actual arrival at a checkpoint.
Host roster controls, runtime enrollment, operator handovers, checkpoint
responsibility reassignment and matching rehearsal adapters use the reviewed
commands above. The live late-join worker consumes membership-change signals;
it does not execute automatic reassignment or other catalog workflows.

### Shared message delivery

`contracts/shared/event_assistance_messaging.schema.json` separates immutable
message intent, a channel attempt and a guest response. Joining updates carry
only approved joining choices; operational notices carry scoped acknowledgements
or help requests. A response cannot represent physical check-in. Provider
attempts require a live context and a sender binding correlated with the route;
rehearsal attempts cannot carry that binding. Reserved attempts freeze the
permission revision, validity interval and instruction revision used to select
the route. Opaque provider ids are not restricted to Firestore path syntax.

`messageProtocol.ts` creates late-join message proposals and reservations,
validates wire records, and resolves a scoped submitted choice to its stored
value. An expired grant, changed episode, stale instruction, unknown choice or
duplicate response cannot create a new effect. The trusted adapter must resolve
the bearer grant or provider correlation and atomically persist an accepted
response with the owner domain's revision check; this pure resolver is not an
authenticated endpoint or a persistence implementation.

`messagingPolicy.ts` owns the shared delivery decision. Reserved, accepted and
uncertain attempts require reconciliation, and delivered/read attempts cannot
trigger fallback. Confirmed technical failures permit bounded retries across
freshly eligible routes. Policy rejection, suppression, invalid recipient and
provider-owned fallback create owned exceptions. Event/guest state, current
instruction, expiry, permission freshness and attempt limits are checked before
selection. `deliveryReceipts.ts` preserves delivered/read evidence when delayed
or contradictory provider statuses arrive, and rejects another sender,
connection revision, endpoint or provider message id. The WhatsApp consumer
correlates the signed private webhook queue and dispatch evidence; the SMS
consumer verifies per-attempt report credentials. The SMS HTTP boundary below
is dormant; verified callback activation and reviewed WhatsApp failure finality
remain pending.

`FirestoreMessageOutbox` persists immutable intents and at most six attempts in
the private `eventAssistanceMessages` collection. Re-enqueueing the same scoped
intent returns its existing history; changed content cannot reuse the identity.
Reservation and dispatch claiming each re-read trusted domain and permission
facts in their Firestore transaction. The fact reader is trusted server authority.
`EventMessageWorker` composes the concrete SMS and WhatsApp readers through one
outbox, so both independent permissions and spending limits are checked before
selection and claim. A prepared credential must match the current sender
snapshot. Single-channel stores cannot reserve mixed-route intents; RCS remains
explicitly unavailable.

Only one transaction can claim a reserved live attempt. It records an uncertain
outcome before returning a short-lived dispatch permit, and the provider runs
after commit. An interrupted claim therefore requires reconciliation; replay
does not grant another send. Provider adapters must check permit expiry and use
the attempt id for provider idempotency when supported. This boundary does not
claim exactly-once delivery by an external provider.

A worker interrupted before claiming can recover after the reservation's
original authorization expires. The next reservation transaction preserves
that attempt as `notDispatched/reservationExpired`; a fresh attempt uses a new
id, current authority and bounded backoff. Adapter-proven expiry before all
provider I/O uses `permitExpired`. These unsent attempts consume the total
recovery ceiling but not the route's submission allowance. Neither elapsed
time nor sender unavailability can release an unknown or accepted submission.
Claimed spending remains conservatively charged until reconciliation.

Normalized receipts can update an expired or cancelled message independently
of its workflow run. They cannot reopen sending. Contradictory evidence creates
a persistent conflict that withholds new dispatch, including an already
reserved fallback. Rehearsal reservations cannot obtain a live dispatch permit
or accept a real provider receipt. The selected worker connects the outbox to
Gupshup SMS or Meta WhatsApp outside the transaction. An unknown or accepted
submission holds all fallback even if its channel later becomes unavailable.
The dormant delivery coordinator below now resumes the published automatic
late-join messages. Host delivery review has a typed backend boundary and shared
live/rehearsal runtime controls described above. Terminal cleanup must be added before
activation and retain deduplication state throughout the provider reconciliation
window.

`GuestAssistanceStore` supplies the trusted publisher and scoped guest-response
boundary. Private guest state records the roster document's exact creation
generation and a participation episode. Each workflow occurrence has its own
thread head, so joining guidance and another operational notice can coexist.
Publishing a replacement atomically supersedes the prior message. A link
resolves the thread's current head; an old button cannot mutate newer guidance.

The worker issues a bounded, revocable grant using a versioned signing key.
Firestore stores only its secret hash. Link redemption rechecks current event,
roster generation, admission, episode, instruction expiry and message purpose.
Cancellation and post-event notices have their own event-phase eligibility.
The public App-Check-protected callables return only the event label, current
instruction and approved response labels, not guest identity or roster data.
A response and its effect commit together: joining intent advances a fenced
private participation revision, acknowledgement records the receipt, and help
creates an owned case. Comfort/safety requests require the restricted safety
owner. None of these responses checks in, cancels or assigns an attendee.

`readEventAssistanceMessageGate` is the concrete transaction-scoped event and
roster gate for all channel adapters. It rejects a replaced episode or thread
head, expired event phase, declined guest or confirmed arrival. Channel-specific
consent, suppression and sender authority must still be read in the same outbox
transaction. The guest webpage at `/event-update/:linkId` uses the public
read/reply boundary and the existing web runtime primitives. Practical Host case
reads and resolution now have typed backend and Dart client boundaries described
above. Open practical cases also project as one event-level Host Today task that
routes into the live workspace. Restricted comfort/safety cases stay outside
the Host projection and enter the Admin event-safety queue. An authorized
safety reviewer can assign one or close it as handled or declined through the
existing audited triage callable; the adapter updates only the case's nested
handling state. Key provisioning and the rehearsal response adapter remain
separate steps.

### Durable message delivery coordination

Automatic late-join publication with a saved runtime binding, and a trusted
source-bound plan-change or follow-up notice, create a `liveMessageDelivery`
Operations run/item in the same transaction as the message/thread. Explicit
legacy publications, unbound operational notices and rehearsal intents do not
enroll automatic delivery. Retries reuse the immutable message identity and one
per-message guest grant across channel attempts. A publication counter still
means an intent was created; it does not measure provider submission or delivery.

`AssistanceDeliveryWorkStore` resumes due work under an Operations lease, while
`LiveMessageDispatcher` loads signing keys, issues the deterministic grant and
composes the current SMS/WhatsApp workers. The outbox retains independent final
claim authority. Slow key/credential access cannot start a new send after the
worker deadline. A lost checkpoint after a claimed or accepted submission reads
the outbox on restart and cannot repeat that submission. Neither a work lease
nor a signing key grants recipient permission, template approval or spending.

The existing dormant message-change handler wakes saved delivery work after a
receipt or response. It cannot create delivery work from an arbitrary outbox
row. The existing work handler and scheduled recovery also process delivery
items. One execution invokes at most one channel worker; outbox retry bounds and
backoff remain authoritative. Refreshed guidance can wait until the shared
late-join policy permits outreach; its temporary cooldown is preserved as a due
time. Unreachable routes retain review work instead of completing the job.
Missing keys or domain facts have five bounded
repair attempts, and a work item permits at most 100 evaluations. Unresolved
provider outcomes get one bounded receipt wait, then a review flag with the next
check at message expiry. Review keeps the coordinator runnable for a receipt;
it does not grant a new provider submission.

Recorded delivery evidence remains readable after sender or event authority
changes. Completed Operations work never reopens; later contradictory or delayed
receipts remain in the outbox, whose current state informs the Host delivery
review above. Validated live delivery work in the explicit review phase now
projects as one event-level Host Today task without exposing private recipient,
route, link, or receipt details.
Relevant event/guest changes and event-specific SMS/WhatsApp/RCS consent now also
wake saved delivery work, including unsent items held for missing permission.
The bounded source job revalidates each target's scope and forwards only a
signal identity. Immutable delivery wake receipts prevent a replayed source
page from repeating an evaluation. A source wake preserves an unchanged
provider receipt deadline and pending-review state; it does not manufacture
nondelivery evidence or reset a recovery cap.
Sender, template, budget and sender-wide suppression changes now discover
affected saved runtime/permission scopes and enqueue the same event/guest wakes.
These lookups exclude expired records, retain bounded cursors and revalidate
their targets; they do not enroll guests or grant sender permission. Budget
debits and inbox counters are filtered to avoid repeated fanout during ordinary
delivery. RCS STOP discovery uses the permission's receipt-covered
`subscriptionId` to find only that agent/phone conversation across events. START
observations and their counters create no repair work; STOP deletion/replacement
and actual spending releases do. Discovery grants no consent, and final claims
still recheck current facts. See the [source lifecycle](operations_platform.md#source-changes-and-due-work-recovery).
Provider lookup/finality, retention and financial reconciliation remain separate
work.

The worker reads a pinned numbered Secret Manager version named by
`EVENT_ASSISTANCE_GUEST_KEY_VERSION`, under the
`EVENT_ASSISTANCE_GUEST_KEYS` secret. Its `catch.event-assistance-guest-keys/v1`
envelope contains a current key id and up to ten uniquely identified 256-bit
keys encoded as canonical base64url. Retain old keys through outstanding grant
lifetimes; replacing a key under the same id cannot silently regenerate an
existing grant. Secret bytes and response-link secrets never enter Operations
payloads or errors. The same loaded key ring serves grant issuance and both
channel renderers. WhatsApp also requires `META_WHATSAPP_ENABLED=true`; sender,
consent, template, credential and budget checks still apply independently.
No secret or sender is provisioned or activated by this implementation.

### WhatsApp native reply boundary

`WhatsappReplyStore` freezes the exact offered choices in the private
`eventAssistanceWhatsappReplyBindings` collection as part of the outbox's
single dispatch-claim transaction. The mapping pins the immutable intent and
attempt authority, original sender/account/phone, recipient endpoint, roster
generation, participation episode and guest revision. Native IDs are opaque
correlation, not bearer grants. This resource does not authorize sending;
the live sender must compose it with event-service consent, approved template,
credential and spending authority.

The consumer reads an event ID from the existing signature-verified private
WhatsApp queue. It checks sender and recipient ownership again, matches the
exact native reply kind and the provider's original message ID, then resolves
the stored choice. Unknown original-message correlation returns `waiting`
without a domain effect. Display labels, free text and callback data cannot
select an action. Changed instructions, roster generation, phone, episode or
participation revision cannot inherit the old choice's authority.

Web and WhatsApp responses use `applyGuestChoice` in the same message/guest
transaction. Concurrent responses have one winner, help requests create one
owned case, and reported joining intent cannot change physical attendance or
registration. Safety requests retain their restricted owner. Server time is
sampled again after source reads, and the shared event gate cannot extend a
pre-event action past event end.

`onEventAssistanceWhatsappEventCreated` connects the signed queue to the
delivery and native reply consumers. Its retry-enabled Firestore trigger records
an independent, source-bound `assistanceProcessing` checkpoint. An early reply's
`waiting` result retries until correlation becomes available or authority
expires. Permanent rejections terminate. Checkpoint failure after a successful
guest effect retries idempotently; concurrent completion cannot be overwritten
by an older waiting result. Campaign/Inbox processing retains its own fields.
Signed-ingress tests and real Firestore contention tests cover these boundaries.

Signed status ingestion preserves all error codes in
`providerErrorEvidence`, with distinct `none`, `codes` and `unusable`
variants. Lists over ten entries, malformed entries and non-array error values
become unusable rather than being truncated into apparent success. The bound
is ours, not a provider guarantee; diagnostic text is excluded. The existing
first-code field remains available to campaign processing for complete lists.
Event Assistance requires explicit error-free evidence before accepting a
positive status. Legacy queued statuses without this field remain unconfirmed;
their missing error information cannot be reconstructed from a null first code.
Later complete signed evidence can still resolve the same outbox attempt.
`normalizeWhatsappDeliveryStatus` also classifies complete signed `failed`
statuses after the same immutable dispatch correlation. Only a list consisting
entirely of temporary-service (`131016`) and throughput (`130429`) codes becomes
a technical failure. Known policy, quality or window restrictions require host
resolution; a reported marketing opt-out (`131050`) blocks retry as suppressed
without changing event-service consent. A known restriction wins over other
codes in the list. Unknown codes, ambiguous recipient failure (`131026`),
mixed technical/unknown evidence, malformed lists and failed statuses without
codes remain unconfirmed. These are explicit mappings from Meta's
[error-code reference](https://developers.facebook.com/documentation/business-messaging/whatsapp/support/error-codes/),
reviewed on 2026-09-07; code ranges and diagnostic titles cannot grant recovery.

The shared outbox owns all subsequent decisions. A verified technical failure
can select an independently eligible SMS route after backoff; the callback
cannot send, grant consent or release spending. Reservation and final claim
recheck current facts, permission, template and budget. Duplicate failures
cannot debit or send again. Conflicting delivery or restriction evidence
persists a host-review hold, including when it arrives before an SMS claim.
Signed-ingress tests exercise lost submission responses and real Firestore
contention across both channels.

The Meta worker connects approved template material, named/positional
parameters, native choices, sender credentials and dispatch deadlines to the
permission/budget transaction. Callback echo and terminal-failure behavior
still need controlled account/version verification before activation.
Unconfirmed failures cannot establish fallback eligibility. Reply handling
itself never sends an acknowledgement or fallback. Live executor integration
and activation remain separate work. Retention must preserve binding evidence
through outbox reconciliation before activation.

### Reviewed WhatsApp message material

`whatsappTemplate.ts` composes a current synchronized template, the server-only
`eventAssistanceWhatsappPolicies` policy, a message intent and its guest grant.
Review binds provider content and send metadata together; changed template
copy, variable destinations, category, sender ownership or native action
semantics cannot inherit the old review. Quotes declare a maximum message cost,
currency and supported recipient prefixes; they are neither actual prices nor
spending debits. Template freshness, review, quote and guest-link expiry bound
the prepared material's lifetime.

Every template retains a scoped guest-page link. Native buttons can offer a
subset of the approved choices without removing the others from that page.
Native payload indices follow the frozen choice order independently of the
provider's button positions. Content hashes are rechecked before those IDs are
constructed. Both joining updates and operational notices use this renderer;
acknowledgements keep their instruction revision and help categories retain
their exact meaning. A policy record alone grants no recipient permission.
Event-specific WhatsApp consent now has verified-participant get/set callables,
explicit sender identity, revision-fenced permission and immutable receipt
contracts. They do not read organizer announcement permission. Invalid sender
provisioning blocks new grants while preserving withdrawal. The owning data
contract describes identity, expiry and replay semantics. Guest UI wiring,
independent message-link withdrawal, provider submission and delivery/reply
reconciliation remain necessary before this material can be submitted.
`WhatsappDispatchStore` now composes current consent, authenticated endpoint
STOP state, approved material, two spending ceilings and native reply bindings
inside one outbox claim. It returns prepared material only after that transaction
commits, with no provider I/O or activation. UTC sender-day and event debits
remain conservative until financial reconciliation is implemented.

### SMS submission and spending boundary

`SmsDispatchStore` reads the current sender, exact guest generation/linked UID
and phone, event-service permission, revocable guest grant, approved template,
and event/sender-day budgets in the same transaction as dispatch authority.
A permission must use the Catch event-service copy and verified subject;
existing organizer marketing opt-ins cannot grant this purpose. Verified guest
registration and the no-download runtime now offer optional event text controls
through `getEventAssistanceSmsPreference` and `setEventAssistanceSmsPreference`.
The server records exact consent receipts with the current permission and
requires their matching hash before dispatch. Repeat requests are idempotent;
withdrawal fences old grants. Each preference view includes a review hash.
New decisions must echo that hash as well as the permission revision, so a
changed verified number, replacement source record or changed event window
requires a fresh review even when the permission revision is unchanged.
Ordinary time passage and check-in do not invalidate unchanged consent terms.
The website submits the review it displayed, retains the complete original
request on an uncertain retry, rejects stale read results and scopes pending
state to the current account and event. Exact receipt replays return current
state without reapplying consent, even when the original review is now stale.
No configured sender or prior permission leaves web enrollment hidden and the
native channel marked unavailable. A configured but unavailable sender explains
its current limitation; an existing
grant retains withdrawal when the sender is paused.

The native entry can now resolve its own operational attendee through
`getEventAssistanceParticipantContext`. A signed-in booking ID is never treated
as an attendee ID. The read-only boundary returns one verified linked scope,
explicitly unlinked state, or ambiguity without a candidate list. Native reviews
are bound to an uninterrupted account and retire on refresh or account changes.
The Consumer event detail page now exposes Event messages for signed-in users
with a booking record, including past or cancelled bookings. It uses this
identity boundary before reading SMS, WhatsApp or RCS preferences. No attendee
ID is inferred from the booking ID and no private account phone is copied into
Host-visible attendee data. Explicit enrollment can use a private verified
account number when the roster has no phone. An invalid or conflicting roster
number does not silently fall back to the account number.

The single native sheet progressively discloses each channel's current
permission, exact server consent, masked recipient, expiry and available actions.
No initial read grants consent. Unlinked and ambiguous identities offer reload
and Host help without reading channel permissions. Authentication loss removes
all prior terms and actions. Each channel uses its retained owner, so dismissing
and reopening an uncertain save offers the same request for retry. SMS/WhatsApp/RCS
history loads explicitly; earlier senders permit withdrawal only, and opaque IDs
are never presented as sender names. The normal and enlarged-text interaction
checks exercise independent consent, historical withdrawal and recovery.

SMS, WhatsApp and RCS now share a closed recipient binding: roster phone or
private verified phone, with the exact linked UID and Firestore source generation.
Legacy records without the binding retain their original roster-phone check;
clearing a roster phone never upgrades prior consent. New grants bind the exact
origin in the reviewed hash and immutable consent receipt. Private permissions
remain in server-only collections and never write the account number to the
Host roster. Phone verification, event admission, sender readiness, STOP state,
spending and delivery authority remain separate checks.

An active private grant continues to name its reviewed phone if the account
phone changes. It can be withdrawn without a current signed phone claim; a new
number requires a subsequent explicit review. Expiry, a verified STOP or a
replacement sender releases that old number for a fresh review; the new number's
STOP state is checked independently and no consent transfers automatically.
All three channel reviews recheck the clock after their database reads, so slow
reads cannot extend consent eligibility or publish a stale enabled state.
Withdrawal preserves the old
endpoint and evidence, so a corrected recipient may correctly return no current
permission. Native SMS recognizes that confirmed outcome at the exact next
revision. Dispatch, sender-history discovery and native WhatsApp/RCS replies use
the same source binding. Native reply records retain the binding and an endpoint
hash, without copying the raw phone into callback records or the roster.

`listEventSmsPreferences` now resolves the saved `catchEventSms` runtime sender
and earlier permissions for the verified attendee. It shares the bounded,
read-only discovery rules used by WhatsApp and RCS: paused execution retains its
selection, changed source facts withhold it, and historical rows require the
same linked UID, attendee generation and recipient binding. The new indexed
query scans at most 51 rows per page and returns at most 50 earlier sender IDs.
Withdrawn grants remain discoverable; opt-out tombstones without prior consent
do not create history. No contact, credential or provider data is returned.

Both native and web enrollment use this discovered sender. Earlier permissions
are withdrawal-only, with explicit paging. SMS requests now accept `senderId`,
and every response names it. Omitted sender IDs retain the original
`catch-event-sms` sender behavior; custom senders have separate immutable receipt
keys, so reusing a request ID cannot collide across senders. The original
omitted-sender payload still replays its existing default-sender receipt.
Consent never transfers when the Host chooses another sender. The native sheet
uses one retained sender-preference owner per channel, and the website composes
the existing sender controller with an SMS-specific validated wire adapter.
SMS review hashes include current permission evidence and therefore change after
a write; applied results confirm the sender, decision and exact next revision.

Deploy the discovery callable, its Firestore history index, updated response
contract and matching web/native readers together. Existing clients that enforce
closed responses need the updated reader before receiving `senderId`. The
new source does not provision or activate a sender.

The native SMS preference controller now retains the exact unresolved request
through sheet dismissal, including after a response is lost. Its temporary
strong authentication subscription clears detached private state on sign-out,
same-UID re-entry or authentication errors; a confirmed result or definite
rejection releases the lease. The controller independently validates the review
scope and returned decision before presenting saved consent. An uncertain error
is actionable immediately, so a retry callback cannot accidentally reuse the
previous failed future. These controllers do not persist pending requests across an app restart.

The required review hash is a coordinated API/client rollout change. Old web
tabs must reload before making a new decision; submissions without a review
hash fail validation. Do not deploy the server contract without the updated
web client. This source change does not activate or deploy a sender.

Web registration and guest runtime supply verified opt-in and withdrawal.
The SMS dispatch claim additionally issues narrow withdrawal authority for its
response link. The guest update page loads that text preference independently
of instruction availability, so guests can stop texts after cancellation or
instruction expiry. The link cannot enable texts, change registration, expose
identity or reopen event instructions. Its current-revision check prevents an
old withdrawal request from undoing a later verified opt-in. Revoked links and
replacement recipients cannot act on the original permission.

Waitlist marketing preferences do not authorize event-service texts. Provider inbound opt-out handling, deployed verification
and retention cleanup remain integration work; no sender has been activated by
these controls.

The standalone `EventSmsPreferenceController` remains a compatibility adapter
with explicit sender scope and the original default-sender wire behavior.
The Consumer Event messages sheet uses `EventSenderPreferenceController` for all
three channels. Its SDK-free model validates the closed response, selected
sender, consent version, masked number and consistent preference/expiry state.
Applied results must match the submitted decision and next revision; replays
show the server's current state, including a subsequent withdrawal. Native
reloads retire old reviews; account changes fence old callbacks and delayed
responses, including an A-to-B-to-A sign-in sequence. An unresolved write keeps
its original request through dismissal and only permits an identical retry.
These source controls and local checks do not establish distributed-build or
production enrollment availability.

`EventSmsWorker` loads an exact numbered Secret Manager credential before the
short reservation window. The resource claim atomically debits both spending
ceilings and records the exact material hash with the outbox's single-send
claim. A competing message cannot spend the same remaining budget. Payload,
recipient, template, config and permission changes invalidate the reservation,
even if a provisioning writer failed to advance its revision. Only hashes and
scope/cost evidence enter dispatch records; credentials and the response-link
secret remain in worker memory. The sender-day window is Asia/Kolkata.

`smsProtocol.ts` renders exact approved DLT template parts with bounded
variables. It never truncates or rewrites the instruction to fit a widget or
SMS limit. GSM extension characters and Unicode pairs are counted when packing
segments. Overlong content, missing approval, expired quote or insufficient
budget withholds delivery. The configured rate ceiling is conservative spend
control, not a claim about the provider's final invoice.

`GupshupSmsProvider` submits one HTTPS POST with the configured entity, header,
template, alphanumeric attempt correlation and a random per-attempt reporting
credential in `extra`. Correlation is not provider idempotency. It checks the
permit immediately before I/O; acceptance is stored
separately from delivery. Unknown/malformed responses, transport loss and the
provider's auto-resubmitting maintenance response remain uncertain and cannot
cause fallback. Explicit account/policy/recipient rejection needs resolution.
If permit expiry provably prevented provider I/O, the attempt is recorded as
not dispatched. Debits are conservatively retained until reconciliation;
there is no automatic refund or release on timeout or rejection.

`SmsDeliveryReportStore` accepts decoded Enterprise GET report fields only when
the echoed credential matches the hash committed with that attempt's debit.
It binds the original recipient endpoint, sender mask when reported, fragment
count and known provider message id. Provider time is bounded by a five-minute
clock-skew tolerance; state timestamps use the server receipt clock. Reports
need no current roster, sender, grant, permission or event liveness, so closing
an event cannot erase later delivery evidence. Duplicate reports converge in
the outbox transaction. Contradictory final reports retain a delivery conflict;
unknown causes, deferred delivery, SMSC timeout and missing operator
acknowledgement cannot authorize fallback. Policy, suppression and invalid
recipient causes retain their distinct meaning. Reporting never sends a
message, changes consent or releases a spending debit.

This bearer credential is scoped to one attempt; it is not a Gupshup signature.
The field contracts come from Gupshup's [single-message API](https://docs.gupshup.io/docs/send-message-to-single-number)
and [delivery-report documentation](https://docs.gupshup.io/docs/real-time-delivery-reports).
`eventAssistanceSmsDeliveryWebhook` now supplies the GET HTTP boundary. It is
excluded from logical and exact deployment plans and its
`EVENT_ASSISTANCE_SMS_REPORTS_ENABLED` parameter defaults to false. The handler
limits the raw request target to 4,096 bytes, accepts only the documented fields,
rejects duplicate or nested parameters after URL decoding, and validates the
complete field strings before opening the reporting store. Express query
coercion, request bodies and forwarded identity headers supply no authority.
Only the matching per-attempt credential can reach delivery reconciliation.

Responses are opaque plain text with no-store headers. A successful response
follows completed reconciliation; duplicate, contradictory and indeterminate
reports acknowledge without a new send. Rejected credentials cannot update the
outbox. Processing failures return 503 with Retry-After rather than claiming an
acknowledged commit, and application logging receives no URL, query, phone,
credential or thrown error. Provider retries must still be verified; a retry
header is not a delivery-recovery guarantee.

Before activation, verify the account's actual echoed field names, HTTPS
callback configuration and finality with provider evidence. GET callbacks carry
the report credential and phone in the URL: application log hygiene cannot
redact platform request logs. Verify request-log redaction/exclusion across the
deployed ingress and provider support tooling before enabling this endpoint.
POST reporting requires provider support configuration and has a different
shape; the handler rejects it rather than guessing a mapping from the malformed
documentation example. Missing credentials or a different shape cannot update
the outbox. Local HTTP-boundary and Firestore tests do not prove account setup
or deployed transport behavior.

This is an invocable server worker tested with an injected transport and the
Firestore emulator, not an enabled provider integration. Gupshup is the first
candidate adapter; account selection and actual use-case/DLT approvals remain
unconfirmed. The channel-specific worker only accepts SMS-only intents;
multi-route intents use `EventMessageWorker` and its shared authority reader.
Before activation, complete audited sender/budget provisioning, activation of
the dormant coordination,
verified callback activation and lookup/reconciliation, provider freshness/expiry behavior,
financial reconciliation and retention. Provision the guest signing key and
verify the deployed branded response route. No fabricated approval receipt,
fixture permission or quote can satisfy live onboarding. Host and rehearsal
projections now expose runtime configuration, guest help, movement, checkpoint,
delivery and attendance-closeout state without widening provider authority.

The rehearsal adapter now executes `requestRequiredData` end to end with only
synthetic profile-completion evidence. A Host review exposes the canonical ten
runtime field identifiers, current completion, source hash, profile revision,
request revision and virtual deadline. The Host can request only missing fields
inside the virtual event window. The anonymous practice guest receives that
prompt and may simulate completion in one or more submissions; each submission
advances the synthetic profile revision and closes the prompt only after every
requested field is complete. Changed source, reset generation, stale revisions,
expired virtual time and changed idempotency content fail closed. The rehearsal
stores no real profile values and does not touch runtime participants, onboarding
drafts, provider channels or any live event collection.

The rehearsal adapter also executes `recordOutcome` against a revisioned state
stored only on the rehearsal session. Source-event rehearsals freeze the same
`completion`, `score`, `rank` or `none` primitive as the live event format;
custom legacy sessions derive a conservative completion default only when their
frozen modules include pods or rotations. A Host records one current synthetic
unit at a time. New rounds must be contiguous and cannot start until every
current unit has an outcome in the prior round; corrections replace one
unit/round value and advance the global outcome revision. Rank values are whole,
bounded by the current unit count and unique within the round. Setup changes and
reset clear the practice state, while completion still permits post-event
correction. The Host projection exposes the current primitive, unit ids,
revision and records. No rehearsal outcome writes `eventSuccessUnitOutcomes`,
`eventSuccessStandings` or another live event collection.

The rehearsal `controlReveal` adapter owns a separate revisioned virtual
countdown. A manager may start the next round's ten-second practice countdown,
cancel it before virtual expiry, or publish the next round directly. Advancing
the rehearsal clock past the deadline settles the pending round exactly once;
the same decision id cannot be reused for another action. Publication moves the
synthetic roster to the existing reveal moment and reevaluates rehearsal
assistance in the same parent transaction. Reset and setup changes clear the
state. The Host projection exposes status, pending/published round, countdown
start and reveal revision, with no live plan, match or attendee write.

The rehearsal allocation adapter now executes both `proposeAllocation` and
`publishAllocation` inside the synthetic room. A manager prepares one or more
placement proposals against the reviewed allocation revision. Proposal creation
does not move a guest. Publication names the reviewed proposal and a stable
decision id, then revalidates the current synthetic roster, eligibility,
four-person practice-unit capacity and keep-apart rules. One publication moves
only its named practice guests, clears stale position confirmation, advances
the allocation revision and invalidates competing proposals from the prior
revision. The Host projection exposes current assignments and proposal status;
the anonymous guest sees the existing assignment moment and resulting practice
unit. Reset and setup changes clear this state. No live assignment draft,
published assignment, attendee or event-success plan is touched.

The rehearsal `reconcileRoster` adapter now operates on an explicit committed
synthetic source for the current setup generation. Every generated practice
actor has an imported source row. Relevant scenarios also retain bounded
duplicate, failed or ambiguous rows so the Host can account for imperfect input
without the system claiming it resolved those rows. The command fences the
reviewed source id and revision, marks that source reconciled and exposes every
row and outcome count. Setup changes and reset rebuild the source at the next
generation. The adapter does not add, delete or relabel practice actors and
never reads or writes a live import, attendee or event roster.

The native rehearsal client parses required-data, outcome, reveal, allocation
and roster reviews into closed types and checks each projection against the
current actor and unit scope. Host changes freeze the reviewed setup/runtime
generation, operation-specific revision or source hash, and one client action
id. An uncertain retry therefore resends the same payload. The response must
contain the matching action receipt; an immediate response must also prove the
requested state transition. These adapters are exposed through the rehearsal
repository and controller without adding a second Event Success runtime UI.
An exact legacy fixture state without Host review metadata remains readable but
does not grant the required-data command.

The production Host rehearsal screen now projects the frozen unit-outcome
primitive, synthetic units, complete score/rank rounds and rehearsal reveal
clock into the existing Event Success workspace. Partial rounds stay out of
standings and remain the current editable round. A route-scoped operation owner
sequences the backend's per-unit commands, keeps the current command and client
action id across an uncertain result, and resumes the remaining units only
after that exact command is confirmed. The same owner freezes reveal decisions
and survives temporary route detachment while the authenticated account is
unchanged. Practice-role views remain read-only for these manager operations.

The command-binding catalog now reports programme control from executable
source facts. Dress rehearsal pause and resume are backed by the existing
revision-fenced `controlEventRehearsal` transaction and are recorded as partial
coverage. Extend, skip and reorder remain unavailable. The live control
callable changes the active guide step, reveal state and completion state; it
does not execute the canonical pause, resume, extend, skip or reorder command,
so the former complete live binding is now an explicit capability gap.
It also cannot execute `controlUnitProgress`: that command names a unit and a
revision-fenced `ready`/`active`/`paused`/`completed` transition, while the live
callable has no per-unit progress state. The live unit-progress binding is
therefore contract-only until its owning operation exists.
The group and rotation assignment override callables do not apply an expiring
scoped rule waiver, and foreground position publishing does not execute the
scoped `setLocationSharing` command. Those live bindings remain contract-only
even though their narrower assignment and position controls are available.

With the shared execution and SMS/WhatsApp/RCS boundaries in source, the next
implementation sequence is:

1. Implement the `contractOnly` live/rehearsal entries in the command-binding
   catalog against authoritative source facts, upgrading a row only when its
   direct command, domain adapter or internal coordinator exists.
2. Bind externally owned resolution boundaries and unresolved workflow
   occurrences to the mapped Today, setup, live Now, live Guests, live Room and
   report projections. A surface mapping does not manufacture readiness or
   occurrence state.
3. Complete audited consent and sender/budget onboarding, verify SMS, WhatsApp
   and RCS activation, integrate and deploy, and verify the journey on device.

The initial RCS contracts and rendering draft are preserved on
[`codex/event-assistance-rcs-backlog`](https://github.com/suvratgarg/catch-dating-app/tree/codex/event-assistance-rcs-backlog)
at commit `bed3e804249ee553d95be4ab2cb1014268cf599e`. Its reviewed replacement
now supplies the canonical Google RBM sender configuration and rendering
boundary described below; generated outputs come from the current generator.
The RCS backend now includes consent and withdrawal APIs, capability/readiness
checks, shared outbox dispatch, OAuth loading, authenticated HTTP ingress, and
delivery/native-reply consumers. Remaining work includes audited sender/budget
onboarding, retention and financial reconciliation, provider registration,
deployment, activation and end-to-end verification. The Host and Consumer
source handoffs are integrated. Neither the parked prototype nor the restored
source establishes live provider selection, provisioning or readiness.

Catalog membership describes an
outcome contract; it does not assert a registered executor or provider readiness.
Applicability, implementation availability, missing facts and host settings must
remain separate. Existing format, attendance, assignment, safety and payment
owners remain authoritative. Ordinary check-in remains an atomic domain command.

The delivery acceptance includes typed/wire-invalid fixtures, duplicate and
reordered signals, revision/context fences, provider ambiguity, current consent,
mode isolation and live/rehearsal parity. Production sends, provider activation,
full layout redesign, autonomous emergency judgement, new payment/tournament
engines and continuous background interception require their own implemented
adapters and acceptance; they are not conferred by these type definitions.

### Verified WhatsApp sender discovery

`listEventWhatsappPreferences` is an App-Check-protected, authenticated,
rate-limited read for one participant's event and attendee. It shares canonical
participant and saved-runtime selection with RCS through
`readMessagePreferenceDiscovery`, then selects only `organizerEventWhatsapp`.
It never substitutes a platform RCS sender or enumerates organizer connections.
A paused runtime keeps its saved sender; a changed source withholds the stale
default. Sender selection does not assert consent, connection readiness,
approved templates, budget or dispatch authority.

Previous preferences use indexed 50-row pages plus one lookahead, scoped to
live organizer/event, attendee and `evidence.subjectUid`. An earlier verified
grant remains discoverable after withdrawal because its subject evidence is
retained. An initial withdrawal without a grant has no verified subject evidence
and is not listed as prior enrollment. Relinking the roster UID cannot expose
the previous participant's senders. Phone or attendee-generation mismatches are
filtered; malformed matching records and future timestamps fail the read.
Cursors advance by scanned records, including filtered ones, and survive a
deleted cursor document. No contact, provider account/phone ID, credential,
consent evidence or other attendee data appears in the response.

The guest client must load the existing `getEventWhatsappPreference` for the
selected sender and review its name, displayed sender number, consent text and
phone suffix before an explicit grant. `setEventWhatsappPreference` binds the
displayed sender and STOP hashes plus the required server `reviewHash`. The
latter pins the full recipient, source generations, event title and consent
expiry, selected sender, STOP evidence and consent copy. A changed phone with
the same displayed suffix still needs fresh review. Withdrawal keeps its
original recipient/sender evidence and requires no grant review hash. Sender discovery makes
no writes and cannot enroll the guest or supply organizer marketing permission.
`EventWhatsappPreferencesPanel` now composes that review after verified public
registration and on the guest venue/live page. It displays the organizer name,
business number, verified phone suffix and server consent copy. Earlier senders
appear on demand for withdrawal only. An enabled preference keeps its withdrawal
action when the sender is unavailable. No offer appears before verified roster
admission or in rehearsal.

WhatsApp and RCS share the sender-navigation, auth-epoch and exact-retry controller
and the presentation card. Each has a separate typed port, closed response parser,
query identity and consent request. Both channels compare the reviewed hash even
when the permission revision is unchanged. Ordinary time, check-in and credential
rotation preserve unchanged WhatsApp consent terms. The required WhatsApp view
and grant hash needs coordinated API/web rollout and a reload of existing tabs.
A malformed or unknown write outcome freezes navigation and
new choices until the exact request is retried or definitively rejected. Auth or
event/attendee changes discard private presentation state and fence delayed reads
and saves. Discovery remains stable during the page session; selected preference
reads refresh while visible and pause during unresolved saves. Neither channel
can authorize the other or grant marketing permission. Provider provisioning and
live activation remain separate work.

The native `EventSenderPreferenceController` now owns WhatsApp/RCS sender
discovery, selected-sender review, earlier-sender withdrawal and exact retry.
Its scope includes channel, event and attendee; authentication epochs also
invalidate delayed results and callbacks across sign-out, auth errors or an
A-to-B-to-A account change. `EventWhatsappPreferenceView` retains the displayed
business number and sender/STOP hashes. `EventRcsPreferenceView` retains its
event title and sender name. Both use the required server review hash and
separate consent-copy versions; no channel can authorize another.

The native state owner repeats the repository's participant/channel, selected
sender and applied-receipt checks before exposing terms or saved consent. Foreign
pages and reviews become failures; invalid confirmations retain the original
uncertain request. Sender paging must advance even when records are filtered.
Immediate retry callbacks receive the new active future, preserving the exact
reviewed request. Focused tests exercise these boundaries separately for WhatsApp
and RCS.

Only the configured sender offers enrollment. Earlier senders are fetched on
selection and permit withdrawal only. History loads in explicit bounded pages,
including empty filtered pages with a continuation cursor. A changed configured
sender across pages requires fresh discovery. Closed parsers reject foreign
scope, private fields, invalid values and non-advancing or foreign-channel
cursors. Applied responses must confirm the next revision and decision;
withdrawal can return `notSet` for a replacement recipient while revoking the
original binding. Exact replays display current server state. RCS can expire
under a shortened event before its originally recorded consent expiry.

Uncertain native saves retain the complete request even if the preference sheet
is dismissed, until an exact retry resolves it or authentication invalidates the
private state. Refresh and sender navigation cannot replace that request.
Definite rejection requires fresh review. Generated request DTOs handle reads;
canonical-schema tests verify the closed mutation unions. The Consumer event-detail sheet mounts these owners through the verified
participant context. Each disclosure shows current permission and exposes
channel-specific terms and actions without enrolling other channels. Returning to the app refreshes identity and resolved channel reviews while
retaining uncertain requests. Device verification and deployment remain pending; source
integration is not evidence of a distributed or activated Consumer flow.

### RCS authenticated callback boundary

The callback boundary supplies a bounded Google RBM parser, a Firebase HTTP
export and a durable Firestore evidence inbox. Acceptance verifies signature
and agent isolation, separate delivery/revocation/reply/subscription
observations, retry identity, private-data minimization and acknowledgement
only after durable acceptance. Delivery and native-reply consumers are wired
below. Provider registration, retention cleanup, deployment and activation
remain open.

`rcsWebhookProtocol.ts` authenticates the base64-decoded `message.data` bytes
with the configured client token's SHA512 HMAC. It requires the signed agent ID
to match trusted endpoint configuration. Pub/Sub IDs, attributes, publish times
and HTTP callback-type headers do not supply authority. Wrapper additions are
tolerated. Payloads and signatures are byte bounded, canonical base64 and valid
UTF-8; malformed supported variants fail closed. The initial challenge echoes
a bounded secret only after its client token matches. These boundaries follow
Google's [webhook verification protocol](https://developers.google.com/business-communications/rcs-business-messaging/guides/integrate/webhooks).

The canonical typed observations distinguish delivered/read, confirmed TTL
revocation and inconclusive revocation, native suggestions, subscription
requests and unstructured messages. [Google's event definitions](https://developers.google.com/business-communications/rcs-business-messaging/guides/build/events/receive-events)
and [message definitions](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/UserMessage)
own the provider shapes. Missing provider time stays unknown; it is never
replaced with unsigned Pub/Sub time. Provider event identity is scoped by agent,
endpoint and message/event family; retries keep the same receipt key, while
changed signed content retains a different hash for conflict handling.

Normalized evidence contains an endpoint hash, no raw phone, free text, file URL,
location, displayed button label, signature or client token. Location messages
cannot establish physical attendance. Native choice/page correlations do not
authenticate a guest; the consumer validates the immutable attempt,
recipient, choice, current episode and expiry before applying a typed command.
UNSUBSCRIBE and documented country-specific STOP equivalents now preserve a
conversation restriction during inbox acceptance. SUBSCRIBE/START preserve a
request to re-enable messaging; they never grant event consent or change
SMS/WhatsApp permission. Inconclusive revocation never becomes proof
of non-delivery or a fallback permit.

`rcsWebhookIngress.ts` owns POST verification and durable acknowledgement.
`rcsDeliveryWebhook.ts` exports `eventAssistanceRcsWebhook`, whose path suffix
selects an exact trusted endpoint binding from `RcsWebhookKeyStore`. The default
queue is `RcsCallbackStore`; disabled or malformed requests cannot enqueue work.
Verified callbacks receive an acknowledgement only after stored, duplicate or
durably preserved conflict. Queue/credential failure returns an opaque 503;
logging receives no private payload or error. Only authenticated unsupported
traffic may be ignored without persistence. The export is disabled by default;
its presence does not establish deployment or provider registration.

`rcsCallbackStore.ts` implements the injected queue with canonical records from
`contracts/shared/event_assistance_rcs_callbacks.schema.json`. It commits each
immutable signed-payload variant to `eventAssistanceRcsCallbacks` together with
its provider identity in `eventAssistanceRcsCallbackIdentities`. Exact retries
preserve the first reception and storage times. A different payload for the same
agent, endpoint, family and provider event preserves both variants and marks
the shared identity conflicted. Failed commits leave neither a partial callback
nor an unmarked conflict; the HTTP handler returns 503 so the provider can retry.
Both collections deny all direct client reads and writes.

Consumers call `readForConsumption` in the same transaction as
their receipt and domain effect. It revalidates persisted evidence and withholds
conflicted identities, participating in Firestore contention with concurrent
conflict writes. A conflict received after an effect committed cannot undo that
effect; it blocks later consumption. Subscription restrictions commit with inbox
acceptance as described below. Acceptance changes no event consent, delivery,
guest-response or attendance state. No automatic cleanup is enabled:
retention must preserve identities and evidence needed by pending consumers and
retries before this boundary can be activated. Emulator tests cover concurrent
duplicates and a consumer racing a conflict. Local tests do not prove a
registered agent, deployed worker or actual callback delivery.

### RCS conversation subscription restrictions

`rcsSubscriptions.ts` stores separate latest stop and subscribe-request
observations in `eventAssistanceRcsSubscriptions`. The key binds the Google RBM
agent and hashed phone endpoint across events and survives credential rotation.
It does not require a current roster entry, event, or CRM contact to record a
restriction. Both the callback and this projection commit before HTTP success;
a failed commit rolls both back. Direct client access is denied.

This product treats an authenticated unsubscribe as a restriction on Catch event
service messages from that agent. Google's [subscription events](https://developers.google.com/business-communications/rcs-business-messaging/guides/build/events/receive-events)
distinguish conversation subscription from consent to a specific service.
A subscribe event therefore remains an explicit request, retaining any stop
until the event permission owner obtains fresh scoped consent. It does not
silently restore an old permission, create a guest grant, or enable SMS fallback.

First durable storage time orders each observation independently; callback ID
breaks equal-time ties. Provider time never clears a stop, and exact retries do
not move its time forward. Replaying an older inbox entry can repair a missing
projection without overwriting a newer observation. Conflicting signed payloads
still preserve a stop restriction while ordinary callback consumers remain
withheld. This restriction cannot undo a send that committed before it arrived.

`readRcsSubscription` revalidates the snapshot and its immutable callback
provenance inside the caller's transaction. Missing, corrupt or cross-recipient
provenance fails closed. The record's absence is not consent. Event-specific
preference APIs and their shared permission reader now review this restriction
as described below. The RCS dispatch store now rechecks that restriction in
its claim transaction; callback domain consumption and retention cleanup remain
implementation work.
No provider sender or network worker is activated by this projection.

### RCS event consent

`getEventRcsPreference` and `setEventRcsPreference` are App-Check-protected
callables for the event attendee's linked Firebase UID. A grant requires the
signed phone claim to match the roster, an admitted attendee, an eligible event
and a ready, approved Catch sender covering the recipient prefix. The caller
selects an explicit sender ID; the response exposes its display name, the event
name and masked recipient number, never provider agent IDs or credentials.

`eventAssistanceRcsPermissions` stores independent event-service permission;
`eventAssistanceRcsConsentReceipts` proves the exact decision and resulting
permission hash. Both bind the Firebase subject, phone, attendee creation
generation and Firestore event/attendee source generations. Sender records in
`eventAssistanceRcsSenders` use the canonical RCS configuration, now including
the reviewed display name. Their existence is not audited live provisioning.

The grant submits a revision, request ID, copy version and review hash. The
review hash binds the displayed sender identity, participant, event name and
window, source generations and latest STOP. Changes require a fresh review;
clock passage, credential rotation and unrelated START observations do not
invalidate it. A fresh grant must acknowledge the current STOP and follow its
first storage time. START alone cannot restore event consent. Exact retries
return current state and cannot reverse a later withdrawal or STOP.

Permission and receipt commit atomically. Withdrawal preserves the originally
bound phone, sender, generations and grant evidence even if current sender
configuration, phone claim or receipt proof is unavailable. An initial opt-out
creates a revoked record without inventing grant evidence. Permission cannot
extend beyond the event end captured at grant plus 24 hours; current event
timing is checked again before use.

`readRcsMessagePermission` supplies the shared transactional consent check for
planning and final dispatch. It requires the exact receipt, current recipient
and source binding, unchanged provider agent, valid lifetime and current STOP
provenance. Its allowed result contains a granted permission but no spending,
sender-readiness, capability or send authority. Renaming the same provider
agent preserves existing consent; a newly reviewed grant captures the updated
name. Tests cover stale review hashes, source replacement, rollback, receipt
tampering, withdrawal, concurrent retries and a STOP racing a grant. Audited provisioning, deployment and activation remain
open.
No live sender is activated by these callables.

`listEventRcsPreferences` discovers the saved RCS sender for a verified
participant's event and earlier preferences owned by that participant. It
requires App Check and sign-in, checks the current roster UID before private
reads, and returns only event/attendee scope, server time, the configured sender
ID, up to 50 previous sender IDs and an explicit continuation cursor. It does
not expose phone numbers, provider agent IDs, credentials, consent evidence,
budgets or other roster members.

The configured sender comes from the canonical saved runtime configuration.
A paused execution retains its selection; a mismatched event source does not.
Selection is independent of sender readiness, consent, policy enablement and
actual delivery. Each guest-facing card must still load `getEventRcsPreference`
and submit its exact review hash through `setEventRcsPreference`.

Previous preferences are queried by live organizer/event, attendee and signed
UID with a composite index and a 51-row lookahead. Source-generation or phone
changes exclude stale records; malformed matching records fail the read instead
of masquerading as an empty history. The cursor advances by the last scanned
row, including filtered records, and remains usable if that row is removed.
Each page rechecks participant ownership. A current sender is excluded from the
previous-sender list. Discovery neither grants nor withdraws permission, creates
no runtime work and performs no provider I/O. Tests cover sender changes,
paused configuration, participant relinking, stale source evidence, bounded
history and real Firestore pagination.

`EventRcsPreferencesPanel` composes this discovery and reviewed-consent flow
on successful public registration and the guest venue/live runtime, using only
the authenticated participant's event and attendee scope. It shows the saved
sender's display name, event title, verified phone suffix and server consent
text before offering an explicit opt-in. An unconfigured event with no previous
preferences hides the optional panel. Unavailable offers explain their current
reason; enabled preferences retain withdrawal when the sender is paused.

Earlier senders are disclosed on demand, one preference at a time, with explicit
paging past filtered history. Those cards permit withdrawal only; discovery is
never enrollment. The page-session sender selection remains stable during a
review. Preference reads refresh on focus/reconnect and while visible, but pause
while a save is unresolved. Submission binds the exact displayed revision and
review hash, including STOP changes at the same revision. Account epochs and
keyed event/attendee instances fence delayed replies; private cache is discarded
on unmount. Unknown or malformed write responses retain the original request
for an exact retry and disable sender navigation. Closed response validation
rejects foreign scopes, unexpected data and non-advancing cursors before cache.
SMS and WhatsApp preferences remain independent, and rehearsal never mounts
this live controller. Consumer app enrollment, audited provisioning, deployment
and activation remain separate work.

### RCS message-link withdrawal

`getEventRcsWithdrawal` and `withdrawEventRcs` are App-Check-protected bearer
callables with network and credential rate limits. They accept only the original
message link and secret; withdrawal additionally requires a revision and request
ID. They do not require sign-in or authorize opt-in. The response contains only
the recorded event preference, revision and lifetime, without guest, phone, event
or provider identity. The preference is not a delivery-readiness assessment.

`eventAssistanceRcsWithdrawalGrants` binds the original permission, event and
attendee source generations, Firebase subject, recipient endpoint and provider
agent. `prepareRcsWithdrawal` verifies the exact persisted permission, consent
receipt and guest grant, then stages immutable issuance in its caller transaction
and `RcsDispatchStore` commits them with the outbox claim and budget charges.
Retries preserve the original
lifetime. A longer consent window requires a new link; an old distributed bearer
cannot silently acquire a longer lifetime. This preparation is not a dispatch
permit and does not replace source, STOP, sender, capability or budget checks.

The link can withdraw through its own captured consent lifetime even after the
joining instructions expire or current event, roster and sender records vanish.
The referenced guest grant must be retained until that withdrawal lifetime ends.
A revoked or replaced guest grant is rejected, and expired read/reply access is
never restored. Changed permission generations, subject, endpoint or provider
agent invalidate the old link; same-agent renaming preserves it.

Withdrawal atomically preserves the original grant evidence, revokes only RCS
event consent, and creates a `messageLink` receipt with a null actor and a
revoke-only decision. Revision checks and immutable request receipts prevent
replays or stale reviews from reversing newer consent. A fresh reviewed request
can withdraw a subsequent grant for the same identity. No event, attendance,
SMS/WhatsApp consent, conversation subscription or provider delivery state is
changed. Tests include real Firestore concurrent issuance, duplicate withdrawals
and a withdrawal racing renewed consent. Live deployment and verified provider
acceptance remain integration work.

The existing `/event-update/:linkId/` guest update page now includes an independent
RCS withdrawal control beside SMS and WhatsApp. Each channel reads its own
issued grant; unissued or revoked grants hide that control. Instruction expiry,
event closure and sender pause do not remove a still-valid withdrawal grant.
The page names RCS and explains that it operates in the phone's Messages app,
with SMS and WhatsApp preferences remaining independent. It offers no opt-in
from the bearer link and displays confirmation only after a valid server result.

The shared controller uses exhaustive channel-to-API and copy mappings. Its
query and mutation boundaries validate the closed generated response shapes,
safe revisions, timestamps and operation outcomes before caching. Unknown fields
and malformed responses never become preference state. A lost or invalid write
response retains the exact request ID and reviewed revision for an explicit
retry. A replay finding later consent requires another deliberate choice.
Credential or channel changes remount the controller and discard old pending
results; secrets and link IDs stay out of query keys and mutation variables.
Tests cover this page after event closure, independent channel calls, stale
responses and uncertainty. Storybook covers RCS enabled, disabled, uncertain
and failed reads using fixtures. Verified participant opt-in discovery,
provisioning, deployment and live provider acceptance remain separate work.

### RCS sender configuration and message rendering

`event_assistance_rcs_config.schema.json` owns the reviewed Google RBM sender
shape: agent and region, pinned credential version, recipient prefixes, allowed
event-service purposes, approval window, price ceiling and maximum queue time.
The configuration also owns the sender display name reviewed during consent.
Google RBM is a canonical RCS binding only; it is not an SMS or WhatsApp provider.
Agent IDs retain the provider's `@rbm.goog` form. This operational configuration
schema does not provision a sender, grant recipient consent or debit a budget.

`prepareEventRcs` validates current live intent/grant scope, sender purpose and
validity, signing-key material, Unicode and provider text limits. It prepares
content before route selection with an authority hash that stays stable across
observation clocks. `renderEventRcs` takes an outbox attempt ID and prepares the
material for a future dispatch claim. It derives a deterministic UUID and
freezes an absolute expiry bounded by the queue limit, intent, grant, approval
and quote deadlines,
and hashes the exact serialized provider body. Transport retries must retain
this material; rendering again at a later clock is a new preparation, not a
retry. The renderer itself cannot create a dispatch permit.

Operational notices retain their title and full body. Native replies keep the
original immutable choice indices and reuse the authenticated callback parser's
correlation format. Labels that exceed a chip's limit and options beyond the
first ten remain on the scoped guest page without truncation or renumbering.
One of the eleven suggestion slots is reserved for the page action. When
open-URL actions are unavailable, the response link remains in the text. RCS content uses the
same [Google message contract](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/phones.agentMessages)
as the injected provider adapter. Rehearsal and stale/mismatched grants cannot
produce live RCS material. Permission reads, bounded capability observations, transactional budget/dispatch
claims and the shared composer connection are implemented below. Audited sender
and budget provisioning, deployment and authenticated ingress activation
remain required before live messaging.

### RCS dispatch and shared channel selection

`RcsDispatchStore` and `EventRcsWorker` now participate in `EventMessageWorker`'s
single immutable intent and attempt history. RCS, SMS and WhatsApp retain their
independent sender and recipient permissions. An unavailable RCS capability can
leave a separately permitted SMS or WhatsApp route eligible; it cannot grant
that other channel's consent. Automatic messages still honor their saved sender
selection. Rehearsal and unpermitted routes cannot load live RCS credentials.

Capability lookup occurs outside Firestore transactions, after checking the
current sender, both active agent/currency-bound budgets, event consent,
original guest episode and recipient prefix. Missing, paused, expired or
insufficient budgets stop before credential access and provider capability I/O.
The in-memory observation binds the exact config and permission hashes, agent,
endpoint, request ID and open-URL support. It expires within 60 seconds of lookup
start, bounded further by OAuth, sender, consent and guest-link lifetimes.
Slow or unsuccessful lookups cannot extend that window. Reservation and claim
re-read source state, STOP, permission, sender, grant and both budgets; the
observation must still match and be fresh. Lookup results never grant sends.

Private `eventAssistanceRcsBudgets` contains separately approved event and UTC
sender-day budgets. Each binds the agent and currency; wrong currency, replaced
agent, paused authority, clock drift or insufficient remaining funds blocks
RCS. Both worst-case charges, immutable `eventAssistanceRcsDispatches` evidence,
message-link withdrawal authority and the outbox claim commit atomically.
Dispatch evidence records each budget's approval, before/after revisions and
charges, plus exact permission/capability/payload hashes and provider message ID.
It contains no OAuth token, guest secret, phone or message body.

The message body and absolute delivery expiry freeze at claim time. Expiry is
bounded by sender queue duration, intent, grant, approval, quote, recipient
consent and the current event-service window. A fresh capability observation can
support the same reserved content, but cannot extend its original authorization.
Capability loss does not remove the signed page link or renumber native choices.

Before its sole provider call, the worker checks the claimed sender, endpoint,
intent hash, deterministic provider ID, frozen body hash, credential lifetime
and short dispatch permit. Acceptance remains pending delivery. Network errors,
duplicate IDs and uncertain responses retain unknown state and both budget
charges; neither queue expiry nor DELETE acknowledgement authorizes fallback.
Only explicit submission rejection or proven no-I/O failure can become failed
submission evidence for the shared selector. Concurrent workers contend on the
same attempt and cannot duplicate a provider submission or debit.

The production `LiveMessageDispatcher` factory now constructs `EventRcsWorker`
for the explicitly saved RCS sender when `EVENT_ASSISTANCE_RCS_ENABLED` is true.
It supplies `RcsCredentialStore` and the bounded Google RBM provider while
preserving every shared selection and transactional authority check. Disabled
RCS cannot load its credential or reserve an attempt. Tests use an injected
provider transport and include RCS-to-SMS/WhatsApp fallback, independent consent,
STOP between
lookup and claim, stale source/credentials/capability, atomic rollback, queued
expiry, opt-out from an actual claim and real Firestore dispatch contention.

### RCS credentials and endpoint configuration

`RcsCredentialStore` reads the sender configuration's exact numbered Secret
Manager version before every use, including cached OAuth tokens. Its closed
`catch.event-rcs-credential/v1` envelope contains only `schema`, `senderId`,
`agentId`, `region`, `clientEmail` and `privateKey`. Sender, agent and region
must match the current canonical configuration. The account uses a Google
service-account email and a PKCS8 RSA private key with a 2048–8192-bit modulus.
Raw service-account JSON, ambient outbound identity, alternate token URLs,
delegated subjects and credential file paths are not accepted.

The installed Google authentication library signs and refreshes the token using
only the [RCS messaging scope](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/phones.agentMessages/create).
The token exchange is pinned to Google's HTTPS token endpoint, with bounded
response size and time, redirects and retries disabled, and no SDK request-data
logging interceptors. Secret reads have a three-second deadline; OAuth requests
have an eight-second deadline. Failures expose a fixed error without an SDK
cause, key, assertion or token. At most 32 OAuth clients remain cached; changing
the pinned secret or account binding isolates the cache. Missing, disabled or
malformed secrets cannot use a cached token. Tokens must retain more than 30
seconds of validity, and the dispatch worker checks its own deadline again.

Inbound configuration has a separate numbered secret reference in
`EVENT_ASSISTANCE_RCS_WEBHOOK_KEY_VERSION`, pointing to
`projects/<project>/secrets/EVENT_ASSISTANCE_RCS_WEBHOOK_KEYS/versions/<number>`.
Its closed envelope is `{schema: "catch.event-rcs-webhooks/v1", endpoints: [...]}`.
Each of 1–20 unique entries contains exactly `endpointId`, `agentId` and
`clientToken`; tokens are 32–256 printable ASCII characters without whitespace.
An endpoint ID is 1–80 letters, digits, underscores or hyphens, beginning with a
letter or digit. Register the native Functions URL ending in
`eventAssistanceRcsWebhook/<endpointId>` with Google. Request paths select only
these reviewed bindings; request bodies cannot select credentials or agents.
Keep prior endpoint bindings through pending callback and reply lifetimes when
rotating agent credentials or webhook URLs.

`EVENT_ASSISTANCE_RCS_ENABLED` and `EVENT_ASSISTANCE_RCS_WEBHOOK_ENABLED` both
default to false and are independent. Pausing outbound sends must leave inbound
verification enabled so delivery receipts, STOP and guest replies can still
arrive. Inbound handling never requires a current outbound token or an active
sender. An emulator integration test covers automatic publication through the
production worker factory, budgeted dispatch and a signed receipt after sender
pause, including duplicate replay. All provider and secret transports in those
tests are fixtures; no account, credential, approval, budget or flag is
provisioned or activated by this change.

### RCS delivery and native reply consumption

`RcsCallbackConsumer` reads the private signature-verified inbox and its conflict
identity in the same transaction as the effect and immutable processing receipt.
The exported `onEventAssistanceRcsCallbackCreated` trigger retries failed commits;
exact retries return the existing outcome. No HTTP payload or trigger body can
provide domain authority. Conflicted evidence remains quarantined; a later
conflict cannot retroactively undo an already committed action.

Delivery events resolve one dispatch by its deterministic provider message ID,
then verify agent, hashed endpoint, intent, immutable attempt scope and receipt
clock bounds. Sender readiness and the current recipient phone do not erase
historical delivery evidence. READ/DELIVERED reuse the shared monotonic merge;
contradictory non-delivery retains positive delivery and marks the conflict.
Only Google's signed
[`TTL_EXPIRATION_REVOKED`](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/ServerEvent.EventType)
confirms expiry revocation. Failed revocation, queue time alone and DELETE ACKs
cannot authorize fallback. A confirmed revocation still leaves consent, current
instructions, budget and retry backoff to the shared selector.

At dispatch, native choices snapshot the guest revision, episode, subject UID,
source generations and only the original indices actually rendered. Replies
resolve that binding using the signed
[suggestion postback](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/SuggestionResponse),
not its display text. ACTION/page taps and unstructured text cannot invoke guest
commands. Legacy unspecified suggestion type is accepted only for an exact offered
reply postback. A verified tap proves delivery even if the send response was lost;
expired or now-unneeded answers still record that delivery evidence but cannot
change current guest state. Reply lifetime is distinct from queue expiry.

The shared `applyGuestChoice` path records joining intention, typed practical or
restricted help, or acknowledgment. It never checks in a guest or assigns a seat.
Current identity, source generations, instructions, event window and guest revision
fence stale decisions. Opt-out and paused senders do not discard a valid inbound
answer or restore outbound permission. The action, message state and consumer
receipt commit together. Tests cover lost-send-response races, monotonic and
conflicting receipts, old/foreign buttons, identity changes, failed commits,
independent fallback consent and real Firestore contention.

The trigger and signed HTTP wrapper are source-wired. Trusted endpoint
configuration, approved senders/budgets, deployment and live provider testing
are still required before RCS is available to users.

### RCS provider transport boundary

`GoogleRbmProvider` supplies an independent, injected HTTP adapter for capability
lookup, text/choice submission with an absolute expiry, and revocation requests.
Its transient wire types in `googleRbmProtocol.ts` do not introduce persistence,
sender approval or dispatch authority. Acceptance covers bounded requests and
responses, recipient/message correlation, deadline checks and ambiguous outcomes.

The adapter uses an explicit supported regional Google endpoint, validates and
encodes identities, and keeps OAuth credentials in headers. It copies only the
supported text/reply/open-URL union. Text, suggestion count, labels, URLs, Unicode
and total bytes are bounded before I/O; unknown content fields cannot silently
change the payload. Every submission sets an absolute expiry so a delayed request
cannot restart its lifetime. The caller supplies a stable UUID for the immutable
attempt; this adapter never generates a replacement ID or retries a request.
These shapes follow Google's [message resource](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/phones.agentMessages).

Capability success reports current reachability and open-URL support only.
A documented 404 remains agent-or-recipient unavailability: it does not diagnose
the handset or grant consent. A successful send must echo the exact message
resource and expiry and means accepted, including potentially queued delivery.
Duplicate IDs, rate limits, transport errors and uncertain responses stay unknown.
Only explicit matching invalid-argument/not-found provider errors are submission
rejections. These distinctions follow the [capability API](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/phones/getCapabilities)
and [sending guide](https://developers.google.com/business-communications/rcs-business-messaging/guides/build/messages/send).

DELETE success reports `revocationRequested`, never confirmed non-delivery.
Neither it nor a DELETE 404 may authorize fallback; delivery can race with the
[revocation request](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/phones.agentMessages/delete).
The outbox consumer below reconciles authenticated receipts; the shared selector
revalidates current route authority before deciding on SMS. Errors contain no provider body,
phone, token or guest link. The adapter remains injectable; the production
worker factory supplies its network client and credential loader. Event-scoped
RCS preference APIs, message-link withdrawal, sender rendering, transactional
dispatch, signed callback persistence and consumers are implemented in source.
The verified web and Consumer-app consent flows are implemented above. Audited
provisioning, deployment and provider activation remain open.

## Format Mapping And Wiring

Event-success setup is driven by the saved `EventFormatSnapshot`, not by raw
event names alone. The intended live path is:

```text
activity kind or custom event name
  -> EventFormatSnapshot interactionModel
  -> EventSuccessActivityProfile and structure defaults
  -> saved eventSuccessPlans/{eventId}
  -> Host Manage setup/live/report UI
  -> attendee companion runtime moment
```

The currently wired pieces are:

- create-event format selection persists `activityKind`, custom label, and
  selected `interactionModel`;
- event-success defaults, structure, Host Manage setup, and preset labels use
  the saved full format snapshot;
- `createEvent` can create the event and initial event-success plan in one
  backend transaction when event-success defaults are enabled;
- Firestore rules allow direct Host setup writes while the event is still
  pre-live, then freeze setup-shaping fields after bookings, waitlist activity,
  check-ins, event start, or live-plan freezing. Live-control fields are
  callable-owned and cannot be changed directly by clients;
- attendee companion routing, event-detail entry, and check-in auto-launch use
  the saved plan/runtime rather than raw event type.

### Founding Organizer Format Packs

The pilot product is one event runtime with format packs, not a collection of
separate quiz, run-club, racket, dinner, or mixer applications. Every pack must
reuse the same operational kernel: event, roster, check-in, saved format,
run-of-show, revision-fenced live controls, manual recovery, and recap. A pack
may change vocabulary, defaults, unit outcomes, and bounded optional modules;
it must not fork routing, attendance, or reporting.

The create-event activity choice is the pack chooser. After selection, the Host
must see a concise `Catch prepares` preview of the resulting operating model
before saving. Custom formats additionally choose an interaction model. The
saved `EventFormatSnapshot` remains the authority; the preview is explanatory
copy, not a second configuration or persistence layer.

The founding packs are:

| Pack | Operating units | Live cadence | Outcome/accountability | Pilot boundary |
|---|---|---|---|---|
| Social run | Pace pods plus a composable route plan | Timed legs | Completion plus finish sweep | Static route operations only; no live GPS tracking |
| Pickleball/padel/racket | Pair assignments and bounded resources | Timed rounds | Ranked outcomes | Existing pair-rotation engine; no bracket/tournament engine |
| Pub quiz | Host/imported teams | Quiz rounds | Numeric points and standings reveal | Not a question authoring, answer validation, or buzzer system |
| Dinner | Tables | Courses | No competitive outcome | True table-seating optimization remains unsupported |
| Mixer/open | Social groups or whole group | Rounds or continuous beats | Optional reveal or no outcome | Uses only saved interaction primitives |

Format-specific language belongs at the edges. The generic Host route remains
`/host/organizers/:organizerId/events/:eventId/success`; the runtime derives whether
the primary nouns are team/round/points, pod/leg/sweep, pair/round/rank, or
table/course/prompt. Separate navigation routes per event type would fragment
the operating model and are not part of this contract.

#### Quiz points

Quiz points use the existing `unitOutcome: score` recorder and standings
projection. A scoreable team is resolved in this order:

1. an existing score assignment unit, preserving its stable unit id; then
2. each distinct, non-empty `arrivalGroup` on a currently checked-in
   `eventAttendee`, normalized case-insensitively for duplicate detection.

Roster import and the no-download runtime's required `teamName` field both feed
`arrivalGroup`. Registered but absent teams do not appear in the live recorder.
The Host records one complete numeric score set per round; corrections replace
that round under the existing outcome revision fence and recompute standings.
Attendees see standings only through the existing reveal gate. The first pilot
does not need automatic team balancing to keep score, but it does need every
team to have an arrival group before points can be recorded.

#### Route-based event plan contract

A route plan describes how an event moves, stops, and stays accounted for. It
is not a Flutter navigation route and it is not limited to running. The first
shipped contract is a typed, static Host-authored `RouteEventPlan` persisted at
`EventFormatSnapshot.activityDetails.routePlan`.

The plan composes six independent operational axes:

- movement: run, walk, ride, or mixed;
- route shape: loop, out-and-back, or point-to-point;
- group strategy: together, pace groups, or self-directed;
- stop cadence: continuous, flexible stops, or hosted stops;
- stop modules: water, regroup, venue, photo, viewpoint, hazard, and
  turnaround; and
- route roles: lead, sweep, pacer, stop host, marshal, and photographer.

Activity kind selects only a useful default; it is not the capability gate.
Social runs start with pace groups and a continuous cadence, walks start as one
group with flexible stops, rides add marshal and turnaround operations, and bar
crawls start as hosted point-to-point walks with venue stops. A custom event,
including a photography walk, can opt into the same plan and then compose any
of the axes. This keeps event taxonomy, live interaction model, and route
operations orthogonal.

The initial implementation does not store route names, coordinates, ordered
waypoints, distance, surface, elevation, emergency notes, or attendee map
projections. It must not claim turn-by-turn navigation, live GPS tracking,
off-route alerts, route geocoding, or GPX fidelity. Those are later modules on
top of the route-plan contract, not fields that should be guessed into the
first operational configurator.

#### Pilot activation contract

The first 100 organizers are a concierge cohort, not evidence that onboarding
can remain manual indefinitely. For the first event, Catch should collect the
format, expected headcount, current booking/roster source, team/table/pace data,
venue or course constraints, and the one live failure the organizer fears most.
The operator then imports a realistic roster, runs the saved guide in rehearsal
with synthetic attendees, and reviews the recap after the real event.

Rehearsal is a required next product slice: a read-only or isolated synthetic
roster, explicit `REHEARSAL` chrome, no production attendance/messages/outcome
writes, and a resettable clock. Until that isolation exists, onboarding may use
staging fixtures but the product must not label a production event as safely
rehearsable.

Pilot success is activation and repeated operational use, not account creation:
time to first configured event, roster readiness before doors open, successful
check-in, live-guide use, recoveries/overrides, completed points or sweep when
the format calls for them, recap viewed, and a second event scheduled. Billing,
marketplace demand, a general quiz engine, tournament brackets, live run
tracking, and fully self-serve onboarding are outside this first tranche.

Assignment generation is deliberately narrower than the format taxonomy. The
format primitives now resolve a `matchingObjective` independently from
`compatibilityPolicy`: the objective selects the product goal (`coverage`,
`romantic`, `affinity`, `novelty`, `balance`, or `spread`), while the policy is
the sole authority for which profile, questionnaire, or activity signals may
be read. `coverage` is the engine default and remains meaningful with no
profile or questionnaire data. An objective whose permitted inputs are absent
falls back explicitly to `coverage` and records the reason; it must not widen
the policy to obtain a score.

Saved format primitives may override the objective. Otherwise pace pods bind
to `affinity`, pair rotations to `balance`, team rotations to `spread`, seated
tables to `affinity`, mutual-interest mixers to `romantic`, and other mixers or
host/open formats to `coverage`. These bindings are resolved from the saved
interaction model rather than by event-type branches in generators or screens.
The Functions contract owns an exhaustive resolution table for every
assignment-algorithm, compatibility-policy, matching-objective, and topology
combination.

The saved format primitives also resolve `unitOutcome` independently from the
assignment algorithm. `none` records no result, `completion` records done/not
done units, `score` accumulates numeric round totals, and `rank` records a
complete ordering. Pace pods default to `completion`, team rotations to
`score`, pair rotations to `rank`, and dinner/seated-table formats to `none`;
an explicit saved value wins. The Functions resolver enumerates this axis with
the other primitives rather than branching on an event name.

`accountability` is another saved, format-neutral primitive with `none`,
`rollCall`, and `sweep`. `pacePods` defaults to `sweep`; every other interaction
model defaults to `none`, and an explicit event-format value wins. Runtime code
branches on that primitive only, never on `activityKind`. T11 implements the
end-of-event `sweep`; `rollCall` remains a distinct value and does not silently
inherit sweep completion behavior.

`durationShape` gives the existing flat run-of-show list format-owned grouping
and transition vocabulary without creating a second schedule model. The four
values are `continuous`, `rounds`, `courses`, and `segments`; saved format
primitives may override the playbook default. Pace-pod formats default to
segments, paired/team/free-form formats to rounds, seated-table formats to
courses, and host-led/open formats to continuous. The Host control room labels
the same next-step transition as a Beat, Round, course, or Leg from this
primitive. Screens do not branch on `activityKind` to choose that language.

V1 supports set-based pair rotations and generic micro-pods, plus
capacity-aware `sequence` scheduling for pair rotations. Sequence scheduling
uses the saved `resourceCapacity.concurrentUnits` value rather than a
format-specific court constant. Null is unconstrained; a selected organizer
layout still bounds the usable physical units. Each round stores explicit
sit-outs and stable resource-unit ids, prioritizes the T3 cumulative exclusion
ledger when capacity is scarce, and minimizes attendee movement over the T5
derived unit-proximity graph. Host-authored overrides are rejected when a round
exceeds the same configured capacity.

### Event-local structured answer matching

The Host may map up to eight typed, published `organizerCustom` form questions,
each bound to its exact form version, to soft assignment features. The mapping supports
category, multi-select set, bounded number, and explicit ordinal option-score
values, with `preferSimilar`, `preferDifferent`, or
`balanceAcrossGroups` modes. The Host preview reads the published version,
shows saved mappings and aggregate current-roster usable/missing coverage,
and does not show another person's answer. Coverage is a planning estimate;
the eligible runtime pool can differ. Host configuration never grants answer
use. Unsupported adjacency/table engines and invalid mappings fail before
save or generation; old events without feature rules retain their old solver
result.

The event-detail matching sheet lets a verified respondent review only their
own eligible answer and separately allow or withdraw its use for this event.
Its current and historical grants remain withdrawable after a mapping or
source changes. The grant is distinct from organizer-card, event-room and
messaging consent. The server checks the exact event, organizer, form,
published version, question, submitted response, verified endpoint, subject,
purpose and current revision. It excludes withdrawn or missing answers. An
account deletion removes the private matching decisions. Firestore clients
cannot directly read or write the decision collection.

The existing assignment engine consumes only authorized typed snapshots;
hard admission, safety, capacity, compatibility and repeat-pair constraints
run first. Missing or withheld answers are neutral. Group balance compares
each unit to the eligible pool rather than pairing different values blindly.
Configured runs cap the roster at 1,000 before profile reads. Pod publication
and rotation draft preparation cap total mutations at 400 and fail closed
above that bound. Prepared rotations recheck exact response, consent and
configuration during both preparation and publication, so withdrawal before
publish aborts the draft. Published assignments retain only algorithm
version, configuration hash and an opaque digest of the source snapshot
identity; private answers, subject IDs, response IDs and receipt IDs stay out
of attendee-readable assignment documents. Existing manual Host overrides
remain explicitly marked as such and do not fabricate a feature audit.

Algorithms without a dedicated engine, including `none`, `teamBalancer`, and
`tableSeating`, resolve to `unsupported` with an honest reason. They never run
an implemented neighbouring behavior or rewrite existing assignments.
`topology: adjacency` likewise remains unsupported, including when table
resource and seat counts are present. True table-seating, team-balancing, and
dance-partner engines remain future backend work.

Operational roster imports now retain an optional `arrivalGroup` from reviewed
provider booking, order, group, or ticket-buyer columns. Provider adapters keep
the attendee-level reference distinct from that shared arrival group, so two
guests on one booking do not collapse into one import identity. The value stays
private on `eventAttendees` and is carried into the server-side Event Success
roster; it is never returned as public roster data.

The assignment engine accepts pairwise `affinityConstraint` values
`mustPair`, `mustSplit`, `avoidRepeat`, and `neutral`, each scoped to
`thisRound` or `pinned`. The engine applies the active constraints it is given;
the live-control owner is responsible for consuming `thisRound` after one
round and retaining `pinned` until explicit release. Safety block edges are
evaluated first and always override `mustPair`.

Assignment fairness also carries a format-neutral exclusion ledger. It tracks
cumulative minutes that each assignment participant is unassigned, starting at
the later of event start or attendee check-in and subtracting merged assignment
intervals. The optimizer minimizes the maximum projected exclusion before
assignment score within the active compatibility and safety tier. The Host
control room raises only an aggregate intervention prompt at the inclusive
threshold; it does not reveal attendee names. Forty minutes is the shared
default, exposed as configuration at both the optimizer input and Host surface
rather than embedded in event-type logic.

## Code Map

| Surface | Path |
|---|---|
| Domain/runtime/playbooks | `lib/contexts/live/domain/` (runtime), `lib/contexts/formats/domain/` (playbooks, structures, questionnaires, defaults) |
| Repository/providers | `lib/contexts/live/data/event_success_repository.dart` |
| Host provider and workspace boundaries | `lib/event_success/presentation/event_success_host_screen.dart` owns provider reads and mutation callbacks; `event_success_host_workspace_page_body.dart` owns tab selection, fixture callbacks and live-action debounce over explicit state. |
| Host setup and report components | `lib/event_success/presentation/host_setup/` owns setup editing, readiness and attendee target controls; `host_report/` owns the report, data-quality metrics, funnel and empty state. Host presentation has no handwritten part files. |
| Host live control and shared components | `lib/event_success/presentation/host_live/` owns the live workspace, control room, step actions, accountability, presence, room summary and alerts; `host_components/` owns the tab chrome, plan/activity summaries, compatibility, help and resource errors. `event_success_host_keys.dart` and `event_success_control_room_state.dart` expose their shared plain contracts. |
| Attendee companion UI | `lib/event_success/presentation/event_success_companion_screen.dart` and `companion_parts/` |
| Companion loading UI | `lib/event_success/presentation/companion/event_success_companion_loading_page_body.dart` (page, stage, and primary-action skeletons) |
| Companion moment presentation | `lib/event_success/presentation/event_success_moment_presentation_state.dart` (localized copy, icons, and choreography projection) |
| Shared Host/attendee room map | `lib/event_success/presentation/event_success_room_map.dart` |
| Assignment generation and overrides | `lib/event_success/presentation/assignments/` (pod/rotation sections, override sheets, typed draft models) |
| Live reveal UI | `lib/event_success/presentation/reveal/` (host/attendee surfaces, countdown, assignments, standings, and shared clock state) |
| Backend generators/wingman callables | `functions/src/eventSuccess/` |
| No-download guest runtime | `website/src/features/eventRuntime/` |
| Feedback scorecards/safety mirror | `functions/src/marketplace/eventSuccessScorecards.ts` |
| Tests | `test/event_success/`, `functions/src/eventSuccess/*.test.ts`, `functions/src/marketplace/eventSuccessScorecards.test.ts` |

## Firestore Contracts

| Collection | Owner and visibility |
|---|---|
| `eventSuccessPlans/{eventId}` | Host-owned setup plus backend-owned live state. `liveControlRevision`, draft revision, and published rotation/reveal indexes are callable-owned. Setup fields freeze once participant activity/start/live status begins; active participants can read through event-success rules. |
| `eventSuccessFeedback/{eventId_uid}` | Attendee-owned decomposed post-event feedback. Raw notes and safety details are private to attendee/backend. |
| `eventSuccessConversationGraphs/{eventId_uid}` | Server-written post-event conversation edges. Only the subject attendee may get the deterministic document; Hosts, other attendees, lists, and every direct client write are denied. |
| `eventSafetyReports/{feedbackId}` | Backend-owned Catch-private safety mirror for concerning feedback. |
| `eventSuccessPreferences/{eventId_uid}` | Attendee-owned live-guidance opt-outs. |
| `eventSuccessCompatibilityResponses/{eventId_uid}` | Attendee-owned compatibility answers. Hosts cannot read individual answers. |
| `eventSuccessWingmanRequests/{eventId_uid}` | Attendee consent document for host-visible introduction help. Target is not notified by this surface. |
| `eventSuccessArrivalMissions/{eventId_uid}` | Server-owned First Hello mission. Attendee can read only their own mission; clients cannot create, update, list, or delete. |
| `eventVenueSessions/{sessionId}` | Short-lived server-owned Host venue authority. Direct client reads/writes are denied; TTL uses `expiresAt`. |
| `eventVenueSessionRedemptions/{sha256(eventId_sessionId_uid)}` | Server-only single-use receipt. One live session may admit multiple attendees, but the same authenticated attendee cannot replay it. TTL uses `expiresAt`. |
| `eventSuccessAssignments/{eventId_moduleId_uid}` | Server-owned assignment docs for micro-pods/guided rotations. |
| `eventSuccessAssignmentDrafts/{eventId_moduleId_uid}` | Server-owned, Host-readable next-round rotation drafts. Participants cannot read or write this collection. |
| `eventSuccessPresence/{eventId_uid}` | Server-owned heartbeat timestamps for checked-in Flutter and no-download runtime attendees. Every direct read/write is denied; Host summaries are callable-derived. |
| `eventSuccessLateArrivals/{eventId_uid}` | Server-owned Host resolution for one checked-in late attendee. The attendee and event Host may get the deterministic document; list and every direct write are denied. |
| `eventSuccessUnitOutcomes/{eventId}` | Server-owned complete round facts for completion, score, or rank outcomes. Hosts may get the event document; attendee reads, list access, and every direct write are denied. |
| `eventSuccessStandings/{eventId}` | Server-owned score/rank snapshots through each recorded round. Authorized Hosts, active participants, and ready external runtime identities may get the event document; list and direct writes are denied. |
| `organizerEventSuccessLayouts/{organizerId_layoutId}` | Reusable organizer-owned parametric room-layout assets. Organizer managers may read their assets; all writes use the validated callable. Participants receive only the selected layout's timestamp-free projection through an authorized callable/runtime bootstrap. |
| `eventSuccessScorecards/{eventId}` | Server-owned aggregate coaching scorecard. Host-readable through event-success policy. |

Schemas live under `contracts/firestore/` and generated outputs under
`functions/src/shared/generated/`, `lib/platform/schema_contracts/generated/`, and
`tool/contracts/generated/`.

### Presence and late arrivals

An open checked-in companion sends `heartbeatEventSuccessPresence` from both
Flutter and `website/src/features/eventRuntime/`. The server stores only the
latest timestamp and derives `present`, `idle`, or `likelyDeparted` from its own
clock. Deployment configuration owns the bounded policy:

- `EVENT_SUCCESS_HEARTBEAT_INTERVAL_SECONDS` defaults to 30;
- `EVENT_SUCCESS_PRESENCE_PRESENT_SECONDS` defaults to 90;
- `EVENT_SUCCESS_PRESENCE_LIKELY_DEPARTED_SECONDS` defaults to 300.

Invalid, out-of-order configuration fails back to the reviewed defaults.
Attendees without any monitored heartbeat are not inferred to have departed.
`getEventSuccessPresenceSummary` is Host-only and supplies the liveness prompt
and newly checked-in late-arrival candidates. A Host explicitly regenerates the
next draft after reviewing likely departures; the server never silently edits a
live round.

`resolveEventSuccessLateArrival` is Host-confirmed and shares the live revision
fence. It may replace a `likelyDeparted` draft slot, turn a prepared sit-out into
an open pair, extend an unpublished group up to its declared unit size, or hold
the attendee for the next round with a visible reason. It writes only
`eventSuccessAssignmentDrafts` and `eventSuccessLateArrivals`. Published
`eventSuccessAssignments` are immutable through this operation.

### Accountability sweep

For `accountability: sweep`, the Host control room lists every currently
checked-in `eventAttendees` row, including imported or unlinked guests. A Host
may mark each row `returned` or `departed`. The server stores the exact
`checkedInAt` timestamp beside the resolution; checking in again makes the old
resolution stale and reopens that attendee without requiring a destructive
history rewrite.

Unresolved rows raise a completion warning. `Review sweep` returns to the list;
`Finish anyway` sends an explicit acknowledgement and completes normally. This
is intentionally a safety aid rather than a checkout mandate: guests may leave
quietly, and unresolved state is not evidence of an incident. `none` and
`rollCall` never inherit the sweep warning.

First Hello check-in is modeled as an optional arrival module with server-owned
mission assignment/completion. `startEventSuccessFirstHelloMission` verifies the
attendee is signed up, the check-in window is open, a current signed Host venue
session is redeemed, the module is selected, and a compatible checked-in target
exists. The mission persists that venue proof. `completeEventSuccessFirstHelloMission`
verifies the active mission, unconsumed proof, answer, and block state, records
only the observer's answer on the mission, consumes the proof, and marks
attendance without a second location or QR claim.

### Conversation graph

After the event ends, a checked-in attendee sees one roster-chip prompt in the
no-download runtime. Assigned attendees are shown first and the label is
derived from the saved interaction primitive (running partners, teammates,
tablemates, or opponents/partners); the screen and submission mechanism do not
fork by activity kind. The server excludes the caller and every blocked
relationship before returning candidates.

The per-event `conversationGraphConsentMode` is configurable during Host setup.
The reviewed default is `optIn`: assigned attendees are suggested but no chip
is selected. `optOut` preselects only visible assigned attendees, and the
attendee can remove selections or skip. Missing legacy configuration resolves
to `optIn`.

`getEventSuccessConversationGraph` and
`submitEventSuccessConversationGraph` require an attended unified-roster edge
and an ended event. Submission is idempotent and stores the raw UID edges only
in the attendee-private conversation-graph document. The Host scorecard
receives numeric response, conversation, assignment-opportunity, and exclusion
counts. It never receives who named whom.

### Live Control Robustness

`controlEventSuccessLive` owns step, completion, reveal countdown, reveal
publication, and pre-expiry countdown cancellation. Every non-idempotent write
compares `expectedRevision` with `liveControlRevision`. Reveal publication is
monotonic: an expired countdown is already published according to its persisted
server anchor, and neither cancellation nor a later action can move the
published reveal index backwards.

For a sweep event, completion also reads the bounded operational roster. An
unresolved row requires `accountabilityAcknowledged: true`; acknowledgement is
the warning override, not a hard block. Already-complete actions remain
idempotent.

Guided rotations use a two-stage boundary. `generateEventSuccessRotations` and
Host overrides write only `eventSuccessAssignmentDrafts`; the Firestore trigger
`onEventSuccessPlanLiveControlUpdated` prepares round N+1 asynchronously while
round N is live. `publishEventSuccessRotationRound` transactionally publishes
only the requested prepared round to attendee-readable assignments and is
idempotent for retry. The beat-transition module does not import or invoke the
assignment generator. Trigger preparation retries are bounded by the validated
deployment setting `EVENT_SUCCESS_DRAFT_PREPARATION_ATTEMPTS` (1-10, default
3).

When the plan selects `topology: sequence`, generation runs the deterministic
round-robin scheduler. Every allowed pair meets once before a configured repeat
cycle, safety and must-split edges are never scheduled, odd rosters receive
fair byes, and court/table/lane/board capacity is enforced independently of the
event type. Legacy plans without `topology` continue to resolve to `set`.

### Unit Outcomes And Live Standings

`recordEventSuccessUnitOutcomes` lets an organizer manager replace one complete
round under an outcome revision fence. Exact replay is idempotent. New rounds
must be sequential; score corrections recompute all accumulated snapshots and
rank corrections replace the affected complete ordering. Duplicate units,
partial or non-contiguous rank orders, an entry shape inconsistent with the
saved format, and `unitOutcome: none` fail closed. Completion facts stay in the
Host-only source collection and intentionally produce no standings document.

For `score` and `rank`, the Host recorder appears inside the existing live
reveal card. Flutter companions and the no-download runtime read the same
standings projection and select the latest snapshot no later than
`publishedRevealRoundIndex`. The existing `idle` / `countingDown` / `revealed`
state and server anchor mask the table until publication on every runtime.
There is no second reveal confirmation, countdown, or ceremony implementation;
the existing assignment-reveal slot switches its payload to standings.

### Spatial Layout And Control Room

Host Manage treats the saved live plan as a command workspace, not a generic
dashboard. Below the local 900 px component breakpoint, Live Now remains the
single-column Quiet Command Console with one pinned Previous/Continue region.
At or above that width, the same provider-free state reflows into a dominant
dark current-beat stage and one 360 px supporting-operations lane. Guests,
fallback help, cumulative-exclusion warnings, and current-step controls remain
concurrent there; the roster itself stays the canonical lazy overlay. No
additional mutation, permission, or source of live truth appears on wide
screens, and text scale 1.4 or above uses the compact flow to protect reading
width and semantic order.

An event-success plan may select one reusable organizer layout by `layoutId`.
The layout remains an organizer asset rather than being copied into the event.
Create Event and post-creation Host Setup use the same provider-free room setup
component to select or author this asset, and saving Host Setup persists the
selected `layoutId` with the plan. Its parametric specification is a bounded
list of coarse integer-grid units;
each unit declares one of `round`, `rect`, `row`, `court`, or `zone`, plus a
capacity and stable order. The app authoring sheet exposes unit count, capacity,
column count, and all five shapes. It does not provide a to-scale venue editor.

Normalized rendering rectangles and the complete Euclidean unit-proximity
graph are derived from the parametric grid. Proximity has no hidden cutoff.
Flutter and the React guest runtime prove their render normalization against
the same `contracts/catalogs/event_success_layout.json` fixture.

Non-`wholeGroup` assignments carry an assigned `layoutUnitId` and a separate
nullable `confirmedLayoutUnitId`. An outline means assigned; only explicit Host
confirmation fills the position. The Host can tap an attendee and then any
valid destination on every device. Invalid destinations remain visible with a
capacity, safety, or declared-constraint reason. Drag is an additive large-
surface affordance selected by
`ComponentBreakpoints.eventSuccessSpatialDragBreakpoint`; it is never the only
path. The companion and no-download guest runtime are read-only and receive no
other attendee positions.

`controlEventSuccessSpatial` previews or writes a placement under the same
`liveControlRevision` single-writer fence as T4. Every reassignment persists a
T2 `mustPair` constraint with explicit `thisRound` or `pinned` scope; a pinned
placement survives regeneration until released, while a this-round placement
does not. `upsertEventSuccessLayout` owns reusable organizer asset writes and
`getEventSuccessSpatialLayout` returns only the selected authorized projection.
`wholeGroup` plans return no spatial projection or map.

## Product Guardrails

- Keep high-churn state out of `events/{eventId}`. Use event-success edge docs.
- Setup fields that affect attendee expectations freeze once the event starts
  or participant activity begins unless product explicitly adds a late-change
  path with attendee notice.
- Compatibility tools are conversation context, not a promise of chemistry.
- First Hello check-in is an optional arrival ritual, not a replacement for
  ordinary attendance. The normal check-in path remains available as a host
  fallback, QR scan, or self-check-in fallback.
- Social runs should stay lightweight; structured mixers, racket pairs, dinners,
  and quiz/team formats can carry more live facilitation.
- Safety/comfort feedback is Catch-private first. Hosts see aggregate coaching,
  not raw safety notes or personally identifying safety details.
- Host reports should teach hosts how to run better events, not expose attendee
  intelligence.
- Guided-rotation drafts are Host-only and become attendee-readable only through
  explicit round publication. Already-published assignment documents remain
  attendee-readable; publication is not a reversible secrecy control.
- "Help me meet someone" without a selected attendee is deferred. Launch host
  help is specific-person only.

## Runtime Model

`EventSuccessRuntime` decides host and attendee moments from the saved plan,
participation status, active run-of-show step, reveal state, and event-ended
state. Screens should not infer availability directly from plan booleans.

Booked attendees are in pre-arrival planning. Checked-in attendees see one
step-synced companion moment at a time. Ended attended users see feedback and
post-event follow-up. Do not reintroduce a stacked attendee dashboard that shows
every enabled module at once.

First Hello sits between signed-up arrival and attended state. Runtime shows a
startable First Hello moment when the module is selected, check-in is open, and
the user is still `signedUp`; after the backend assigns a mission, the same
moment renders the target and answer options. If First Hello is unavailable, the
runtime falls back to the normal questionnaire/self-check-in/pre-arrival flow.

Activity recommendations live in
`lib/contexts/formats/domain/event_success_activity_profile.dart`. Do not add
activity-specific toggles directly in screens.

## External Booking Overlay Runtime Implementation Contract

This section is the implementation and handoff contract for Event Success on
events booked through another platform. A lower-context implementation agent
must be able to take one numbered tranche below, inspect only the named owner
files, and prove it with the named tests without re-deciding product scope.

### Durable product boundary

Event Success requires an authenticated event participant, not a Catch
Consumer profile. First Hello, event-specific compatibility, micro-pods,
guided rotations, specific-person wingman requests, synchronized reveals,
ordinary QR/manual attendance, private feedback and Host-safe reporting are
available to an imported attendee after phone verification, roster claim,
required-field completion, disclosure and opt-out. Full public/dating profiles,
mutual Catch, persistent chat, Cross Paths, cross-event discovery and
longitudinal recommendations remain Consumer-network capabilities.

Ordinary check-in is a platform primitive. A Host can check in any operational
attendee. Static join links and QR codes grant no attendance by themselves.
First Hello is an optional arrival ritual and cannot be the only check-in path.

### Event provenance and capability projection

`events/{eventId}` remains the operational aggregate for both Catch-native and
externally booked events. `externalEvents/{eventId}` remains read-only public
supply and is never promoted into an operational authority in place.

Each operational event stores one immutable `eventOrigin`:

```json
{
  "mode": "catchNative | externalCompanion",
  "bookingAuthority": "catch | external",
  "rosterAuthority": "catchProjection | hostImport | providerSync",
  "provider": "catch | generic | luma | eventbrite | partiful | posh | bookmyshow | district | sortmyscene | airbnb",
  "externalEventId": null,
  "externalEventUrl": null,
  "sourceExternalEventId": null,
  "adapterVersion": null,
  "connectedAt": null,
  "connectedBy": null
}
```

Existing events without `eventOrigin` read as `catchNative`. Creation persists
the field for every new event. Origin never changes after creation. Publication,
registration, payments and network access remain independent server-derived
capabilities; do not add a Host-writable `hybrid` mode or infer capability from
price/count fields.

`externalCompanion` invariants: external checkout remains booking authority;
Catch booking/payment/waitlist writes fail closed; roster import/manual entry,
phone-OTP claim and Event Success remain enabled; imported rows do not increment
Consumer booking counters; operational aggregates derive from
`eventAttendees`; conversion to Catch booking is a migration for a future
occurrence, not an in-place flag flip against shared inventory.

### Identity graph

| Collection | Identity and authority |
|---|---|
| `eventAttendees/{attendeeId}` | Host-visible event-scoped operational person, imported contact/source, attendance and optional `linkedUid`. |
| `eventParticipations/{eventId_uid}` | Catch booking, payment, waitlist and Consumer-network lifecycle. It is optional for Event Success. |
| `eventRuntimeParticipants/{eventId_uid}` | Participant-private access, roster claim, disclosures, minimal runtime profile and readiness. |
| `eventRuntimeDataRequests/{requestId}` | Server-only current missing-data request, fenced to one participant profile and event source. |
| `eventRuntimeDataRequestReceipts/{receiptId}` | Immutable exact-command receipt; never a guest or Host read surface. |

The deterministic runtime-participant id is `${eventId}_${uid}`. Its required
shape is:

```json
{
  "eventId": "event-id",
  "organizerId": "organizer-compatibility-id",
  "organizerId": "organizer-id",
  "uid": "firebase-auth-uid",
  "eventAttendeeId": "opaque-roster-id",
  "identityVersion": 1,
  "claimMethod": "verifiedPhone | signedAttendeeToken | verifiedEmail | hostApproval | catchParticipation",
  "accessStatus": "needsInput | ready | optedOut | revoked",
  "requiredFieldIds": [],
  "completedFieldIds": [],
  "profileRevision": 0,
  "runtimeProfile": {
    "displayName": "Attendee supplied name",
    "gender": null,
    "interestedInGenders": [],
    "relationshipGoal": null,
    "dateOfBirth": null,
    "paceBand": null,
    "skillBand": null,
    "dietaryAndSeatingNotes": null,
    "questionnaireAnswerIds": [],
    "teamName": null
  },
  "consents": {
    "runtimeTermsVersion": "event-runtime-v1",
    "sensitiveDataTermsVersion": null,
    "saveAsCatchPrefill": false
  },
  "claimedAt": "timestamp",
  "readyAt": null,
  "revokedAt": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

The participant can get only their deterministic document. List access is
denied. Hosts do not read this collection. Host UI receives non-sensitive
runtime readiness from a server projection or callable and never receives
gender-interest, relationship-goal or compatibility answers.

### Runtime-profile requirements

`eventSuccessPlans/{eventId}` owns a server-compiled participant-requirements
projection: questionnaire version; required and sensitive field ids from
`displayName`, `gender`, `interestedInGenders`, `relationshipGoal`, and
`dateOfBirth`, plus exactly one resolved pre-event payload when the format
requires it: `paceBand`, `skillBand`, `dietaryAndSeatingNotes`,
`questionnaireAnswerIds`, or `teamName`; whether module opt-out is allowed; and
module disclosure versions. Clients cannot widen or narrow requirements. Do
not collect a sensitive value unless an enabled algorithm consumes it.

The pre-event field is selected from the effective interaction model rather
than `ActivityKind`. It is part of the ordinary required/completed-field state,
so `accessStatus: ready` and `readyAt` remain the countable, non-sensitive Host
readiness source. Pace/skill values are assignment attributes, mixer answers
also update the private compatibility-response edge, and quiz team names update
the existing operational `arrivalGroup`. Dinner constraints remain private and
event-scoped; they do not enable or imitate `tableSeating`, and Host surfaces
must not expose the answer while that engine remains unsupported.

Existing private Consumer values may prefill the event form but must be
confirmed. Event answers never overwrite `users/{uid}`. When the participant
explicitly selects `saveAsCatchPrefill`, the server fills only missing
`onboarding_drafts/{uid}` fields, records field provenance, and never creates
`users`, `publicProfiles`, marketing consent or an `eventParticipation`.

### Runtime access state machine

```text
anonymous -> phoneVerified -> rosterClaimed | hostApprovalPending
  -> needsInput | ready -> checkedIn -> active -> completed

Any linked state -> revoked
needsInput -> optedOut (for optional private modules only)
```

Phone verification is Firebase Auth, not proof of one roster row. Claim
resolution uses: one unique normalized-phone row; one valid attendee-specific
signed token plus OTP; one verified email row plus OTP; explicit Host approval;
or Host-enabled walk-in creation followed by link. Names are never credentials.
Ambiguous matches do not merge automatically. One buyer phone may own multiple
provider tickets, so multiple active matches enter approval unless a single-use
attendee token disambiguates them.

### Public runtime operations

All writes are App-Check-protected authenticated callables that validate event
window, capability, hidden safety state and deterministic ids.

| Operation | Required behavior |
|---|---|
| `getEventRuntimeBootstrap` | Accept opaque public runtime id; return sanitized event, required fields, auth/claim/readiness state and current moment. Never return roster or raw contacts. |
| `claimEventRuntimeAccess` | Link/reuse exactly one attendee row, create/update runtime participant, and return `ready`, `needsInput` or `hostApprovalPending`. |
| `submitEventRuntimeProfile` | Accept only required fields, validate consent/version, recompute completeness and optionally fill missing onboarding draft fields. |
| `heartbeatEventSuccessPresence` | Accept only a checked-in caller and record a server-timestamped liveness heartbeat. Return the active configurable cadence and thresholds. |
| `setEventSuccessAccountabilityResolution` | Organizer-manager-only returned/departed/unresolved write for one currently checked-in operational attendee on a `sweep` event. Bind the result to that exact check-in timestamp. |
| `setEventRuntimeModuleOptOut` | Purpose-scoped opt-out that does not cancel attendance or identity. |
| `checkInEventRuntime` | Redeem a current signed Host venue session after identity/profile readiness and apply absolute attendance; never a blind toggle. |
| `approveEventRuntimeClaim` | Host approves one pending UID-to-attendee claim or rejects it with a bounded reason. |

The internal `EventRuntimeRequiredDataStore` owns the source-fenced typed
request boundary. It reviews current plan-derived fields and atomically writes
one request plus an immutable receipt. It is intentionally not a Host callable:
`requestRequiredData` has `systemWithinPolicy` authority. A participant-write
trigger creates the command only for current missing required fields, bootstrap
returns its bounded guest projection, and accepted profile submission records
completion. The live source binding is complete; deployment and rehearsal
support remain separate.

Static join URLs use opaque `publicRuntimeId`, never event id plus phone. An
attendee token is random, single-purpose, revocable and hashed at rest. A venue
check-in QR uses a configurable, bounded short-lived signed session and refreshes
automatically on the Host screen. The token travels in the guest URL fragment,
is cleared after route intake, and is verified against a server-owned session
row inside the attendance transaction. A printable or shared join QR has no
token and cannot prove physical attendance. Location fields are rejected by all
three attendee attendance schemas.

### Unified Event Success participant resolver

Functions under `functions/src/eventSuccess/` consume one shared module:

```ts
resolveEventRuntimeParticipant(db, eventId, uid)
listEligibleEventRuntimeParticipants(db, eventId, requirements)
resolveEventRuntimeCandidateProjection(db, eventId, viewerUid)
```

For Catch-native participants the resolver may project from Consumer edges and
profiles. For imported participants it uses the linked attendee and runtime
profile. All generators filter revoked, opted-out, unready and inappropriate
attendance states here. Candidate projections contain only event-scoped safe
fields. `publicProfiles` is not required. Consumer blocks still apply; separate
event-scoped keep-apart/hide/report edges protect OTP-only participants.

### Dedicated web runtime

The guest surface is the React + TypeScript route owned by
`website/src/features/eventRuntime/` and shipped in the existing `website/`
workspace on the `marketing` Firebase Hosting target. There is no `runtime/`
workspace or `runtime` Hosting target. It shares generated callable types,
Firebase Auth, App Check, and website primitives; it does not share the
Consumer Flutter router.

```text
/e/:publicRuntimeId -> bootstrap -> phone -> OTP -> claim/approval
  -> name + one format-bound pre-event answer
  -> event moment -> completed/feedback
```

The shell is mobile-first, noindex, accessible, refresh-safe and low-bandwidth.
It caches only its shell and sanitized latest moment. OTP, claim and sensitive
writes require connectivity. Retryable actions are idempotent.

When `social_missions` is enabled, the generated moment catalog also owns one
three-level prompt sequence per interaction model. The live run-of-show selects
light disclosure at step 0, personal disclosure at step 1, and reflective
disclosure from step 2 onward. Flutter and web resolve the same prompt id and
level; neither samples a stage bucket or branches on `ActivityKind`.

### Roster adapters and ingestion

The authoritative adapter engine is backend-owned so Flutter upload, email,
WhatsApp and later APIs cannot drift. Adapters declare provider/version, header
signatures, confidence, status mapping, default-country requirements,
buyer/guest/ticket behavior, warnings and normalized output.

Launch ids are `generic-v1`, `luma-v1`, `eventbrite-v1`, `partiful-v1`, and
`posh-v1`. BookMyShow, District, SortMyScene and Airbnb stay `sample_required`
until reviewed exports and policy evidence exist. Each adapter needs synthetic
golden fixtures for free, paid, group-ticket, custom-question and missing-phone
cases. A bare ten-digit number is never globally assumed to be Indian.

Large imports use `eventRosterIngestionJobs/{jobId}`, temporary encrypted
Storage, type/size validation, chunked idempotent writes, bounded errors,
progress and a terminal receipt. The 250-row callable remains compatibility
only. Email uses an event-specific revocable address/token, preview and Host
confirmation. WhatsApp Business document ingestion reuses the job pipeline and
is transport, not marketing consent. Credentials, DNS and webhook registration
are release configuration, not source-code acceptance.

The first practical forwarding slice is now implemented without claiming that
an inbound vendor is live:

- `createEventRosterHandoff` verifies organizer management and creates a
  random, SHA-256-addressed, 30-day `eventRosterHandoffs` capability;
- the Host roster sheet shows email and WhatsApp instructions only when
  `ROSTER_INBOUND_EMAIL_DOMAIN` or `ROSTER_INBOUND_WHATSAPP_NUMBER` is set;
- `ingestEventRosterWebhook` accepts a provider-normalized JSON envelope,
  verifies an exact-body HMAC from `ROSTER_INGESTION_WEBHOOK_SECRET`, requires
  provider-confirmed sender identity, and matches that identity to the Host's
  Firebase Auth email or phone;
- the endpoint accepts one CSV up to 4 MiB, maps at most 250 attendees through
  the backend adapter engine, and reuses `importEventAttendeesForHost`; the
  provider message id becomes the retry-safe import key; and
- raw attachment bytes are processed in memory and not retained. XLSX
  forwarding, files above 250 rows, temporary Storage, progress UI and
  conflict-aware undo still belong to the asynchronous job tranche.

An email-routing or WhatsApp Business provider must transform its proprietary
webhook into the normalized envelope and sign it. Deploying the endpoint alone
does not make the displayed mailbox or phone number operational.

### Security and abuse invariants

- Uniform public errors prevent event/phone/roster enumeration.
- Rate limits cover bootstrap, claim, profile submission, check-in and approval.
- URLs/tokens contain no phone, name, roster id or provider reference.
- Imported contacts grant no future communication permission.
- Sensitive fields are event-scoped and absent from Host reads/logs/analytics.
- Phone recycling, duplicates, plus-ones, minors, cancellation and revocation
  have negative tests.
- Public runtime operations never scan an unbounded roster in a transaction.

### Reviewable implementation tranches

1. Contracts/origin, generated outputs and compatibility fixtures.
2. Bootstrap, claim, profile, approval, attendance, rules and backend tests.
3. Shared resolver plus pods, rotations, First Hello, compatibility and wingman.
4. React runtime, Firebase/App Check, route state machine and build/a11y tests.
5. Host external-companion create/edit, source, adapter preview, QR and approval.
6. Async ingestion, email/WhatsApp endpoints and replay/security tests.
7. Organizer-page capability story, adapter availability and beta application.

Each tranche updates its owner docs and checks in the same commit. Generated
files come from contract sources. No tranche claims a vendor or domain is live
without external verification.

### End-to-end acceptance

- External companion events cannot enable Catch booking/payment/waitlist.
- Re-importing a mixed/provider roster does not duplicate attendees.
- A phone guest claims exactly one attendee or enters Host approval.
- Sensitive fields are minimal, private, versioned and skippable when optional.
- First Hello, compatibility, pods, rotations and wingman work for OTP-only
  participants without `eventParticipations`, `users` or `publicProfiles`.
- Manual and venue-QR check-in work independently of First Hello.
- Runtime refresh resumes the participant's safe moment.
- Later Consumer login sees only explicitly saved, reviewable draft prefill.
- Host views expose readiness and aggregates but no private answers.

## Theatrical Experience Workstream

`docs/event_success_theatrical_experience_tracker.md` is the temporary active
tracker for making the live event companion and host live mode feel more like a
playful synchronized ceremony. Keep durable architecture here, but track phase
status, references, acceptance criteria, and resume notes in that tracker until
the live ceremony, invite loop, private afterglow recap, and branded audio
questions close.

Current defaults:

- live ceremony comes first;
- native haptics and `SystemSound` cues come before a branded audio package;
- pre-event invites are the strongest shareability primitive;
- post-event recap artifacts are private-first unless sharing psychology becomes
  clearer.

Current theatrical implementation state:

- the attendee companion stage redesign, invite loop, and private afterglow
  recap are implemented for visual review;
- First Hello check-in is implemented as an optional arrival module with
  server-owned mission assignment/completion and signed venue-session proof;
- the Host check-in QR is live, signed, short-lived, and auto-refreshing;
  printable/static join links grant no attendance, and Consumer plus guest-web
  attendance callables reject GPS/location claims;
- invite sharing now routes through shared event-invite copy across event
  detail, payment confirmation, and host private-link surfaces;
- post-event companion follow-up now starts with a private in-app afterglow
  recap and keeps host reporting aggregate-safe.

## Production Verification

The former dev-only Event Success lab, preview, and manual-QA routes were
removed after the functionality became available through Host event setup and
Manage plus the attendee companion. Review production widgets directly through
their focused tests, Widgetbook coverage, and real dev/staging event flows.

Check:

- activity profiles: social run, racket pairs, quiz teams, singles mixer/live
  reveal;
- host setup/live/report surface switching;
- optional First Hello arrival mission from host controls through attendee
  completion and checked-in state;
- host `Previous`/`Next` run-of-show transitions updating both panes;
- countdown, confirmed reveal-now, pre-expiry cancellation, and irreversible
  post-publication state;
- confirmed, idempotent publication of the next prepared rotation round with no
  future-round assignment leakage;
- process-death restart during a round resumes the persisted current beat;
- pre-arrival attendee state without live prompt/reveal/partner leakage;
- checked-in attendee moment sync;
- questionnaire, opt-out, wingman request, feedback, and report states;
- organizer questionnaire configuration stays compact: reusable packs show a
  one-row title, description, and question count summary, while detailed
  question inputs appear only when the host selects a custom pack;
- organizer structure configuration stays flat: flow fields are direct section
  rows, whole-group mode omits irrelevant size/count controls, and Match clue
  mode has one disclosure owner inside a full-width structural field section;
- host-help candidate filtering by attendance and interested-in/cohort
  eligibility.

Use a real dev/staging event for write-path proof:

1. Save event-success setup as host.
2. Book/check in at least two attendee accounts.
3. Generate pods or prepare rotations, then edit the Host-only rotation draft.
4. Confirm publication of one prepared rotation round and verify no later round
   is attendee-readable.
5. Drive countdown/reveal from host live mode; cancel only before expiry and
   confirm a published reveal has no reset path.
6. Submit questionnaire, opt-out, wingman request, and feedback as attendee.
7. Confirm host report aggregate signal quality.

## Participant Metrics And Warehouse

Participant success metrics are private marketplace infrastructure. Clients
must not calculate marketplace score, desirability percentile, or event success
scorecards locally.

Current implemented foundation:

- raw facts: `participantSignalFacts/{factId}`;
- counters: `participantMetricCounters/{uid}`;
- future user-facing summaries: `participantMomentum/{uid}`;
- future admin summaries: `participantMarketplaceMetrics/{uid}`;
- event scorecards: `eventSuccessScorecards/{eventId}`;
- client access to raw/admin metrics denied by rules;
- dev/staging Firestore-to-BigQuery extension manifests and datasets exist for
  marketplace metrics exports.

Remaining gates:

- Enable Firebase Analytics BigQuery export in dev/staging when
  Analytics-scoped console/API access is available.
- Add client-side profile impression batching only after the product question is
  concrete.
- Decide host analytics anonymity threshold: 3, 5, or dynamic by event size.

These gates are external access or product-decision items, not hidden app
wiring work. Do not mark them complete from code changes alone.

## Recent Technical Closure

The temporary Event Success technical-fixes tracker from 2026-05-23 is folded
into this source-of-truth doc. Durable outcomes from that pass:

- reveal countdowns are server-anchored and derive end time from
  `revealStartedAt + structureConfig.revealCountdownSeconds`;
- the companion route renders one stable scaffold across loading/error/content
  states;
- host reports no longer fabricate negative coaching from an absent scorecard;
- the dead repeat-signup scorecard metric was removed;
- wingman candidate fetching batches block/profile reads;
- custom event formats persist from create-event through defaults, Host Manage,
  and saved plans;
- assignment callables share topology and compatibility policy guards;
- companion auto-open/post-event runtime regressions have focused coverage;
- local simulator phone-auth test bypass is guarded to non-production builds.

## Setup Configuration Contract

The 2026-07-16 modernization replaces the original pre-design-system setup
wizard with a compact shared form. Durable outcomes:

- **Phase 1 — surface unification.** `EventSuccessSetupBody` is the shared
  setup widget consumed by both `EventSuccessDefaultsSection` (create-event last
  step) and the Host Manage setup tab. The two surfaces stay in sync
  automatically — no copy or behaviour drift.
- **Room setup parity.** `EventSuccessRoomSetupSection` is the shared layout
  selector and authoring entry used by Create Event and post-creation Host
  Setup. Live Operations exposes Now and Room as local workspaces while Guests
  remains the canonical overlay roster; the Room workspace renders explicit
  whole-group, unconfigured, loading, error, waiting-for-placement, and ready
  states instead of making the map disappear.
- **Format-first disclosure.** The saved `EventFormatSnapshot` remains the
  event-format authority and is the first setup row. The host sees the format
  and playbook summary before detailed tools; an explicit `Customize` action
  reveals the module rows. Closing and reopening that disclosure never
  rewrites the draft, so customized module, cadence, reveal, questionnaire, and
  grouping values remain lossless.
- **Stage-based live guide.** The shared body groups selectable tools by their
  domain stage: Before the event, When people arrive, During the event, and
  After the event. Catalog order remains stable inside each stage, and
  recommendation or advanced guidance stays on the relevant toggle row.
- **Contained configuration.** Rotation cadence, reveal countdown, and match
  clue configuration appear directly beneath the tool that enables them in
  `CatchSection.containedFieldRows`. Room grouping appears only when a grouping
  tool or non-whole-group structure makes it relevant. Host goal and attendee
  prompt remain direct editable fields.
- **Inline questions.** Template and custom-question editing stays in the form;
  there is no secondary bottom sheet. Raw text remains editable until save,
  where normalization and validation run once.
- **Immediate switches.** In Organizer defaults, Event Success enablement and
  live-tool switches persist as soon as they change through functional updates
  and the serialized `HostOrganizerDefaultsSaver` queue. Text, numeric, and choice
  fields keep field-local explicit actions so partial input is never saved
  accidentally.
- **Spoke ownership.** Club-level Event Success defaults live on the dedicated
  Live event guide spoke reached from the four-row Club settings section. The
  Edit tab no longer embeds the form alongside profile, payout, and team UI.
- **Platform boundary.** Attendance/check-in, safety controls, crowd balance,
  wingman requests, contextual openers, attendee feedback, and host analytics
  are event-platform primitives. Catalog metadata hides them from host setup;
  effective reads and new defaults/plans include every platform-owned id that
  the active playbook contains, while untouched legacy JSON remains unchanged.
  The two legacy boolean fields stay serialized as `true` until a later schema
  migration. First Hello remains the only Event Success arrival ritual.
- **Phase 4 owner-review prototype.** Widgetbook contains an owner-review-only
  `EventSuccessModuleConsolidationPrototype` under
  `Event Success / Phase 4 owner review`. It demonstrates the proposed single
  How people mix choice, conditional size/count/cadence/repeat row order,
  recommendation copy, and a five-decision visible tool set. Production now
  owns the prerequisite format-first disclosure and lossless Customize path.
  The prototype still has no writer, and its composite grouping control remains
  an owner-review surface until it can preserve the pair-only backend-safe
  interaction honestly.
- **Guarded persistence.** Setup saves are transactionally revision checked,
  reject frozen or stale plans, and update only setup-owned fields. A newer
  remote snapshot never silently replaces local unsaved edits.
- **Topology parity.** Guided rotations normalize to two-person pairs, and
  client structure estimates clamp fixed group counts using the same bound as
  the assignment backend.
- **Companion ergonomics.** Hero re-frames around "what now". Live
  cards use Switch-based include/skip toggles instead of buttons. Pre-arrival
  is informational only — no opt-out levers before the event starts. Three-tier
  privacy badges (Private to you / Host can see / Catch private) appear on
  every surface that produces persisted data. The companion build method is a
  flat list-builder pattern, and the dead `if (showLiveReveal) reveal else
  pod/rotation` inner branches inside `showPodAssignment` and
  `showRotationSchedule` are removed (those runtime kinds are mutually
  exclusive with `liveReveal`).

## Phase 5 — Kinetic Companion Immersion

The 2026-05-24 kinetic pass turned the companion stage from a static gradient
into a perpetually-moving cinematic surface with audio, co-presence, and a
marquee reveal moment. The vibe is moment-keyed: theatrical for arrival,
pulse for live event beats, sunrise for afterglow. The generated presentation
contract now selects the palette and motif ids per beat, while
`_CompanionStageTheme.forMoment` maps those ids into Flutter design tokens.

The durable choreography source is now
`contracts/catalogs/event_success_moment_presentations.json`, generated into
typed Dart and TypeScript. `EventSuccessMomentPresentation.forMoment` continues
to own localized copy and icons, but it resolves palette, accent policy, motif,
phase durations, tempo, idle-pulse period, particle density, deterministic
seed rule, server-clock reference, and ambient bed from that catalog. Flutter
and the no-download runtime both resolve the reveal from the same
`revealStartedAt` server anchor and saved reveal countdown. The shared seed is
derived from event id, moment kind, reveal round, and that anchor. This is one
moment model for every event format; there is no event-type presentation fork.
Web retains the metadata for parity and ships no per-attendee audio.

- **Portable marquee assets.** Three checked-in Lottie vector documents under
  `assets/motion/event_success/` own theatrical, pulse, and sunrise art for the
  Flutter companion and React guest runtime. The generated motif id selects
  one asset, and the catalog's idle-pulse period drives playback. The former
  stage, arrival-ring, and reveal `CustomPainter` implementations are deleted;
  they are not retained as a parallel path.
- **Idle pulse + touch microinteractions.** `_StagePanel` breathes on a 6s
  sine border-glow. `_StageGlyph` runs an entry spring tween then a
  continuous 4s breath modulating scale + accent glow blur. `_StageBouncyPress`
  + `_StageBouncyChip` give chips and tap targets a 220ms scale-down +
  elastic spring-back + glow flare instead of Material's ink ripple.
  Questionnaire and First Hello answer chips now use the kinetic variants.
- **Audio infrastructure.** `audioplayers ^6.6.0` ships a multi-channel
  controller in `event_success_live_effects_controller.dart`. One persistent
  ambient bed player (looped) and one reusable low-latency one-shot player
  (effects). `EventSuccessAmbientBed` enum (theatrical / pulse / sunrise /
  silent) is selected through the generated per-moment presentation contract.
  Per-kind volume tuning — reveal lands at 0.95, taps at 0.48. Missing
  assets are caught + memoized so the UI never blocks on the sound designer.
  Six curated stock sounds to source are documented in
  `assets/audio/event_success/README.md`.
- **Reveal cinematic (the marquee).** `_RevealCinematicOverlay` composes the
  portable vector assets with ordinary Flutter widgets over the full stage:
  anticipation (vignette darkens 0.18→0.6, 14 gold spokes rotate with
  acceleration `pow(anticipation, 1.4) × 2π × 1.8`, and the contracted particle
  field drifts inward), climax (white flash and seeded particle burst), then
  settle (vignette release and sunrise art). A configurable 100ms clock samples
  the generated timeline, so phase entry does not wait for a Firestore status
  transition and remains inside the 250ms cross-runtime gate.
- **Co-presence layer.** Three surfaces wired off the existing
  `Event.checkedInCount` (denormalized + maintained by Cloud Functions — no
  new Firestore listeners): `_LiveArrivalRing` on arrival moments (140×140
  Lottie-backed ring with 24 anonymous dot slots, big tabular numeral in center,
  scale-pulse on increment), `_LiveOthersInRoomLine` on the questionnaire
  progress rail (pill with chip pulse on count climb), and a shared
  anonymous-dot ring inside the reveal cinematic pulsing on the same
  server-derived tick clock so every attendee's screen pulses on the *same* shared
  rhythm during the countdown.
- **First Hello completion celebration.** When the answer submits, the
  card overlays a sunrise gradient sweep (triangle-wave alpha to 0.62 over
  800ms), `guideComplete` haptic + chime fires, and the animation runs in
  parallel with the network call so the gradient never snaps off
  mid-animation when the moment transitions.
- **Afterglow paced reveal.** `_AfterglowBeatGrid` is Stateful: beats slide
  in from below + fade with a 1.4s stagger between rows. Beats can carry an
  optional `countValue` (the "X people remembered" beat uses it) — the
  first run of digits in the value string animates 0→countValue over 600ms
  on an easeOutCubic curve.
- **Test-mode animation gate.** All repeating Tickers (portable motif playback,
  panel pulse, glyph breath, cinematic tick, arrival ring pulse, others-in-
  room pulse) check `_kStageAnimationsEnabled =
  !Platform.environment.containsKey('FLUTTER_TEST')` before `.repeat()`.
  Production runs fully kinetic; widget tests get a static surface and
  `pumpAndSettle` resolves.

## Host Sales And Reporting Closure

The completed host-sales gap tracker is folded into this document. The durable
product truth is that Event Success now supports a credible host story around
turnout, event operations, participant connection, and post-event reporting
without exposing private attendee identities.

Implemented host-facing proof points:

- Invite links are attributed performance objects with opens, requests,
  bookings, paid completions, check-ins, catches, matches, and chats.
- Waitlist movement supports host-created expiring offers, attendee
  accept/decline paths, paid handoff, reserved-capacity checks, expiry cleanup,
  and report/export visibility.
- Scorecards refresh from feedback, attendance, catches, matches, first-message
  activity, payment state, invite-link writes, participation writes, and
  waitlist-offer writes.
- Host reports show a funnel from invite opens and demand through bookings,
  attendance, catches, matches, chats, repeat attendees, and coaching signals.
- Host-visible "caught someone" metrics are aggregate only:
  `catchSentCount`, `attendeesWhoCaughtSomeone`, `catchRecipientCount`, and
  `catchRate`. Hosts never see target identities for private catches.
- The assignment engine is primitive-driven. It accepts group size, rotations,
  gender/orientation fit, questionnaire signal, blocks, opt-outs, host
  keep-together/keep-apart/anchor constraints, scoped pairwise affinity
  constraints, activity attributes, repeat strategy, maximum pair meetings,
  and richer slot metadata.
- Assignment docs carry unit kind/index/label, reason summaries, reason codes,
  rotation fairness counts, slot ids, peer counts, and sit-out slots.
- Host setup persists repeat strategy, max pair meetings, balance/cluster
  activity goals, and activity attribute goals where the event format supplies
  safe inputs.

Marketing and sales caveats:

- Synthetic demo metrics are near-term proof. Do not present them as production
  benchmarks or customer outcomes.
- Pre-install invite-click tracking is intentionally not part of early host
  proof. Current app/callable attribution is sufficient until hosts ask for
  channel-level diagnosis before install/open.
- Pace, skill, role, and activity-specific attributes are optional future
  inputs unless the format has a clear host-facing reason and a privacy-safe
  source of truth.
- Strict no-repeat guarantees for complex table/team rotations require a
  small-cohort search/repair pass. The current group-rotation repeat policy uses
  placement costs and fairness metadata rather than an absolute guarantee.
- Host-readable explainability exists in backend results, but a durable
  host-facing generation audit/summary should be added before claiming hosts can
  inspect every relaxed constraint and missing-data reason.
- Per-link and per-offer drilldowns are deferred reporting surfaces; the
  underlying data is recorded, but product demand should justify the UI.
- Event cancellation should eventually mark active waitlist offers `cancelled`
  instead of relying only on expiry.
- Host screenshots should remain deterministic synthetic states until founding
  host usage creates enough production-data-backed or anonymized proof.

## Open Product Decisions

- Should a safety/comfort concern always create a Catch-private report, or
  should the attendee choose between host feedback and safety report?
- Should hosts ever see free-text attendee notes, or only thresholded summaries?
- Do we need event-level safety reports without a specific target user?
- What should the host analytics anonymity threshold be?
- Once QA coverage is complete, should Host Manage hide the setup editor
  entirely for events that started without a saved live guide and show only the
  locked explanatory state plus attendance/report surfaces?

## Verification

Current code verification is distributed across focused tests:

- `test/event_success/*`
- `functions/src/eventSuccess/*.test.ts`
- `functions/src/marketplace/eventSuccessScorecards.test.ts`
- `functions/test/firestore.rules.test.cjs`
- `tool/demo/seed_demo_data_schema.test.mjs`
- `test/core/schema_contracts_generated_test.dart`

Do not keep long command transcripts in this doc. Git and CI preserve the
exact-SHA test results; update this owner document only when the durable event-
success contract changes.
