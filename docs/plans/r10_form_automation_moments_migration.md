---
doc_id: r10_form_automation_moments_migration
owner: program_operations
status: approved-spec
---

# R10 — shared delivery core + Moments orchestration: build spec

**Decision recorded.** Moments stays and becomes the scheduling and
orchestration layer over **one shared messaging delivery core** — an
expanded Option A, deeper than v0.2.0 described. Option B is rejected:
CRM actions do not move into Moments. The bridge slices from v0.2.0
remain useful during migration, but the required destination is a single
delivery core that Moments, campaigns, Event Assistance, and any future
messaging producer all execute through.

Sending a message on a fixed date does not need Moments — campaigns
already schedule. What justifies Moments is expressing sends relative to
changing operational facts: "90 days before the program," "only
households with outstanding RSVPs," "before *this guest's* function,
adjusted for travel time," "replan pending reminders when the program
moves," "alert assigned staff when a flight is disrupted." Those
capabilities belong to every messaging producer — ordinary events,
multi-day programs, and messages originating from other features — not
to a second delivery stack.

The redundancy to eliminate: Moments currently grows its own provider
dispatch, consent interpretation, retries, and delivery records beside
existing implementations.

## v0.3.0 — corrected findings (verified against source at `ca3028b09`)

These corrections supersede the v0.1.0/v0.2.0 capability comparison.
They are the reason the destination is a shared core rather than a
shared journal.

| Finding from source | Architectural implication |
|---|---|
| Moments already supports event *and* program scope for `scheduled`/`anchored` initiation; only `triggered` is program-restricted (`triggeredRequiresProgramScope` in `momentModel.ts`). | Broadening triggered scope is a targeted extension — not the migration driver. |
| Campaigns have per-recipient documents, provider message IDs, delivery callbacks, send-time checks, and a seven-day frequency cap (`organizerCampaigns.ts`). | The old comparison understated campaign delivery machinery. Consolidation must **preserve** these protections, not regress them. |
| `campaignHandoff` creates a campaign **and** invokes preview + approval programmatically (`organizerCampaigns.ts:461` calls `previewOrganizerCampaignHandler`). | "Draft awaiting human approval" was inaccurate. Dispatch stays separate, but migration must preserve the real approval semantics. |
| `notifyTeam` writes `activities` feed docs only — not a channel send. | Stays activity-only under the shared infrastructure; moving it to a channel send would be a product change, not plumbing. |
| Event Assistance already has a **transactional message outbox** and a shared SMS/WhatsApp/RCS worker (`firestoreMessageOutbox.ts`, `messageWorker.ts`): it reserves and claims an attempt transactionally *before* provider I/O, rechecks authority at claim time, and represents an interrupted submission as an `unknown` outcome requiring reconciliation. | This is the strongest existing implementation and the extraction seed — it was missing from earlier option analysis. Its contracts are bound to events/attendees/participation episodes, so the lifecycle must be extracted behind typed source adapters. Do **not** fabricate event-attendee records to fit program sends. |
| The Moments runner checks whether a send row exists, calls the provider, *then* writes the row (`momentRunner.ts`); a concurrent execution or interruption after provider acceptance can repeat the send. Its WhatsApp wiring discards the provider message ID (`momentWiring.ts`). | Adding campaign rows to that journal would unify reporting without establishing reliable delivery ownership. The journal is evidence; the outbox lifecycle is authority. |
| Anchored offsets are contract-limited to ±43,200 minutes (30 days) (`contracts/shared/moment_common.schema.json`); absolute scheduled dates go further but do not follow a changed event date; the `rsvpDeadline` anchor exists in the model while the fact loader always supplies `null` (`momentDocuments.ts`). | Weeks-or-months horizons need explicit contract work and real domain anchors. |
| Reproduced defect: a quiet-hours-deferred scheduled run is superseded once its *nominal* due passes the five-minute planning grace (`momentPlanning.ts` — `nominalDue < nowMillis - DEFAULT_GRACE_MILLIS` → `dueInPast`). | Scheduling recovery must be part of this integration's acceptance criteria. |
| The sweep takes the first 500 armed Moments and separately loads all planned runs. | Discovery needs an indexed, paginated strategy before horizons lengthen. |
| Communication routes already distinguish transport, sender identity, purpose, and capabilities (`platform/delivery/communicationRoutes.ts`). | Channel support shares execution while preserving per-route authority — Organizer WhatsApp, Catch WhatsApp, and personal handoff do not inherit each other's permissions. |

## Target architecture — one owner per responsibility

```mermaid
flowchart TD
    A["Forms and CRM automations"] --> B["CRM actions and workflow state"]
    A --> C["Approved communication request"]
    D["Campaign composer"] --> C
    E["Event and program facts"] --> M["Moments: timing, conditions, audiences"]
    C --> M
    M --> I["Message intents"]
    F["Event Assistance decisions"] --> I
    I --> O["Shared delivery core: policy, outbox, attempts, receipts"]
    O --> W["WhatsApp"]
    O --> S["SMS / RCS"]
    O --> P["Catch activity / push"]
    O --> N["Managed email adapter"]
    O --> H["Delivery history and host attention"]
```

Logical responsibilities inside the existing backend — no microservices:

- **Forms/CRM automations** own business actions: create a contact, tag,
  queue update, webhook. Their messaging consequences enter the shared
  path as approved communication requests — the automation engine never
  dispatches a channel message itself.
- **Campaigns** own composition, audience review, and approval. Scheduled
  execution ultimately runs through Moments; campaign reporting becomes
  a view over shared delivery evidence rather than its own ledger.
- **Moments** owns *when* a communication is due and *who qualifies*.
  It produces **durable message intents** — it does not call providers.
- **Delivery core** owns *execution*: current authority, consent, sender
  and template readiness, quiet hours, budgets, atomic claims, attempts,
  receipts, and permitted fallback.
- **Event Assistance** retains domain decisions (e.g. whether a guest
  still needs joining guidance) and uses the same delivery core.
- `notifyTeam` remains activity-only; Catch conversations keep their
  conversation model and are not scheduled Moments.

## Message intent — the durable handoff shape

A message intent identifies: purpose, owning organizer, source
occurrence, recipient, approved content, allowed routes, and expiry.
Each source adapter renders the channel version and supplies its own
readiness and receipt semantics. Required behaviors:

- A reminder may create a Catch activity item and optionally send push
  according to preferences.
- WhatsApp→SMS fallback requires permission for the *fallback* route.
- An **unknown** WhatsApp outcome must not immediately produce an SMS
  duplicate — ambiguous provider outcomes reconcile first.
- Urgent operational alerts carry a different interruption policy than
  marketing.
- Managed email is a real adapter with its own delivery lifecycle — the
  currently registered personal-email route is a manual `mailto`
  handoff, not automated delivery.

## Long-horizon scheduling — explicit requirements

- **Long-lived definitions** supporting fixed dates and meaningful
  relative dates; "three calendar months before" and "90 days before"
  get explicitly defined behavior (not just minutes ≤ 43,200).
- **Real domain anchors** — program/function dates and RSVP deadlines;
  `rsvpDeadline` must be populated by the fact loader.
- **Separate identity axes**: occurrence identity ≠ scheduled time ≠
  next retry time ≠ expiry. Moving a reminder for quiet hours must not
  mint a new occurrence or erase the existing one.
- **Missed-reminder and late-join policy**: a late-added guest gets an
  appropriate *current* message, not every historical reminder.
- **Current recipient resolution**: RSVP changes, withdrawals, function
  moves, and opt-outs during the waiting months are evaluated at send
  eligibility, not at enrollment.
- **Indexed, paginated discovery** — replace the 500-armed sweep + full
  planned-run load.
- **Quiet-hours recovery**: a deferred run survives past its nominal
  grace (the reproduced supersede defect is an acceptance case).

## Implementation sequence

Each phase is PR-sized and independently landable. During migration a
bridge is acceptable; sharing only a journal and a quiet-hours helper is
**not** the destination.

1. **This document** — revised spec (done here).
2. **Extract and prove the delivery core with one program reminder.**
   Lift the Event Assistance outbox lifecycle (transactional reserve →
   claim → authority recheck → provider I/O → receipt/unknown
   reconciliation) behind typed source adapters; keep EA behavior
   unchanged while Moments emits durable intents executed by the core.
3. **Long-horizon scheduling.** Contract + planner work for anchors,
   occurrence identity, rescheduling, quiet-hours recovery,
   cancellation, late joins, dynamic audiences, bounded discovery.
4. **Migrate campaign delivery and scheduling incrementally.** Preserve
   approvals, consent, seven-day frequency control, and reports. Every
   migrated message has **exactly one active executor** at any time.
5. **Retire superseded execution paths.** Compatibility adapters may
   remain temporarily with explicit removal criteria; historic records
   stay readable without remaining executable.

## Retirement ledger (phases 5–6 state)

Removed execution paths and the evidence of each removal:

- **Moments direct WhatsApp path** (`sendTemplateToPhone`/`sendTemplate`
  in `momentWiring.ts`, and its `moment:{runId}:{key}` callback tag):
  deleted. Every phone-endpoint audience is program-scoped, so the only
  reachable sendTemplate sends dispatch through `deliverProgramReminder`
  into the core; the tag never had a webhook consumer. Fail-closed
  replacement: unroutable action×endpoint pairs journal `suppressed` /
  `hostReview` instead of aborting the run.
- **Campaign claim/deliver internals** (`claimRecipient`,
  `deliverRecipient`, `recordDeliveryFailure` in
  `organizerCampaignDispatcher.ts`): replaced by
  `CampaignDeliveryWorker` over the shared outbox. The dispatcher keeps
  lease/queue orchestration only.
- **`campaignHandoff` self-dispatching campaign mint**
  (`prepareCampaign` + `automationOrigin` campaign creation in
  `organizerFormAutomations.ts`): replaced by
  `handoffAutomationMessage`, which atomically mints the companion
  Moment, the `organizerMomentRuns` occurrence, and the
  `automationDeliveryMessages` intent. `AutomationDeliveryWorker`
  executes the send through the shared outbox with transactional
  authority rechecks; `AutomationWhatsappDeliveryStore` reconciles
  status receipts after run completion.
- **`sendEventReminders` cron**: already absent before this work;
  `eventStartReminder`/`eventFeedbackPrompt` moments are its replacement.

Retained compatibility surfaces — readable, with explicit removal
criteria (none may produce a send):

- `organizerMomentSends` journal rows: evidence for run rollups,
  per-day caps, and the staffAttention attention projection. Remove the
  send-row write only when reporting reads shared delivery evidence.
- `processStatus` CRM projection in `whatsappWebhookProcessing.ts`:
  keeps campaign reports/contact channel state current by
  `providerMessageId`. Remove when campaign reporting reads
  `campaignDeliveryMessages` evidence directly.
- `organizerWhatsappThreads` reply operations and the setup test send:
  conversational/session sends and a synchronous verification ping —
  different primitives, not scheduled delivery. Out of core scope.
- `deliverProgramReminder`'s `retry` outcomes (withheld claims, expired
  permits, in-flight reconciliation) keep re-firing the run; the durable
  attempt owns the evidence trail until expiry.
- Campaign scheduling stays in `dispatchScheduledCampaigns` (fixed
  dates need no Moments per the decision above); the scheduler now also
  re-drives stalled `resolving`/`sending` leases and `blocked`
  campaigns.
- `automationOrigin` campaigns minted before the phase-6 cutover were
  the retained drain path — none existed in production, so the field, the
  deterministic legacy-campaign id check (`autocampaign_<hash>`), the
  `legacyOwned` handoff outcome, and the per-occurrence mint
  (`prepareAutomatedOrganizerCampaign` +
  `requireAutomationCampaignAuthority`) are removed rather than kept
  readable. Reintroducing a legacy executor now requires restoring this
  commit.

## Acceptance demonstration

The integration is proven when the system can, end to end: schedule a
reminder 90 days ahead; move the program date (pending occurrences
replan, identity preserved); change the guest's RSVP and channel
permission (eligibility reflects current state); simulate a worker
interruption after provider acceptance (reconciles as `unknown`, no
automatic duplicate); and process delayed receipts (truthful delivery
reporting to the shared history).

## Phase 6 — form-automation messaging → triggered Moments

Approved design decisions (product owner, 2026-09-29). This phase retires
`campaignHandoff`'s self-dispatching campaign mint; the automation engine
keeps owning triggers and business actions while the messaging consequence
executes through Moments + the shared delivery core.

1. **The automation rule stays the single authored object.** The existing
   editor owns trigger, conditions, delay, business actions, and approval.
   Companion `organizerMoments` docs are server-managed projections — one
   per messaging action — never independently edited, armed, or approved.
   Two configurations must never disagree about whether a message sends.
2. **Layer responsibilities.** Automation engine: trigger matching, answer
   conditions, business delay, action ordering, business-action retries.
   Moments: durable messaging occurrence, recipient resolution, scheduling
   and deferral, organizer-visible run history. Delivery core: atomic
   reservation/claim, current permission checks, provider submission,
   uncertain outcomes, receipt reconciliation. Channel adapter: provider
   payload, credentials, transport constraints, callbacks. `notifyTeam`,
   tags, conversions, queues, and signed webhooks stay automation actions.
   The integration is a typed messaging handoff — the automation engine is
   not moving into Moments.
3. **Organizer scope, narrowly.** `MomentScope = event | program |
   organizer`. Organizer scope initially supports only the system-managed
   case: triggered initiation, individual contact subject, approved
   messaging action. No general organizer-triggered editor and no
   organizer date anchors in this phase.
4. **One durable occurrence identity.** Derive the messaging occurrence
   from organizer + rule + action + source event kind + source occurrence
   (`sourceId` + `occurredAtMillis`). Rule and recipe revisions ride as
   authorization bindings, not identity. Delay, retry, or quiet-hours
   changes preserve identity; editing a rule invalidates a pending
   execution without minting a second send for the same historical
   occurrence. A withdrawal followed by resubmission is a distinct
   occurrence (`occurredAt` moves), so it may send again — a replayed
   write may not.
5. **Business delay stays in the automation engine.**
   `eligibleAt = max(sourceOccurredAt, eventEndAt) + delayMinutes`; the
   action reaches Moments only when the engine's ordering semantics say
   so — an earlier business action may have created the contact this send
   needs. Moments owns deferrals *after* the handoff (quiet hours etc.).
   The delivery claim still rechecks current due-ness (e.g. a moved
   `eventEndAt`).
6. **Preserve complete recipe semantics.** The action's recipe carries a
   revision-pinned saved audience (eligibility filter for the one
   contact), sender + template requirements, an event destination, a
   personalized invitation link, and rendered variables. Consent and
   reachability evaluate at send eligibility. Invitation creation becomes
   a reusable capability with truthful automation provenance — never
   fabricate a campaign or campaign-recipient row to obtain a link or
   satisfy an adapter contract.
7. **Transactional delivery authorization.** The claim transaction reads:
   rule enabled + approved revision, recipe revision + permitted config,
   source-event validity + current contact identity, due-ness, contact
   permission/suppression, sender/template readiness, and
   frequency/budget. Calling `requireAutomationCampaignAuthority` before
   provider I/O is insufficient — its reads sit outside the outbox claim.
   Authority and contact-policy readers are extracted and shared by the
   campaign and automation delivery paths.
8. **Shared policy execution.** The delivery boundary enforces the same
   policy definitions Moments previews. Frequency accounting is shared
   (`organizerContactChannelStates.lastCampaignAcceptedAt` /
   `campaignAcceptedCount`) so campaigns and automation sends count
   against one per-contact window — separate counters would let each
   producer stay "within limit" while collectively over-messaging.
   Concurrent claims fence on the outbox lease; an `unknown` outcome does
   not release the occurrence for a competing executor.
9. **Evidence authoritative; journal a projection.** The outbox owns the
   attempt and outcome; the Moment journal references it. States:
   `planned → claimed → submitted/unknown → accepted → delivered/read`,
   plus `failed`. A journal row never labels an `unknown` provider outcome
   as sent. Receipts reconcile after run completion; repairing a missing
   journal row never requires another provider submission.
10. **Cutover enforces one executor.** Every occurrence belongs to
    Moments + the shared core. The legacy `automationOrigin` drain branch
    (deterministic `autocampaign_<hash(runId, actionId)>` ownership check
    inside the run-creation transaction) was retired once production
    confirmed zero legacy campaigns — the field, mint path, and
    `legacyOwned` outcome no longer exist. It
    is not the enforcement mechanism.

## Explicit non-goals

- Moving CRM/action kinds into Moments (Option B — rejected).
- Converting `notifyTeam` into a channel send.
- Unifying Catch conversations into Moments.
- Organizer-authored triggered moments (organizer-scope authoring in the
  Moments editor) — a later, additive capability gated on UI.
- Any new service boundary — this is module ownership inside
  `functions/`.
