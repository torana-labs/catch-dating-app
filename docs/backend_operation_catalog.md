---
doc_id: backend_operation_catalog
owner: recursive_audit_loop
status: active
---

# Backend Operation Catalog

## Read Policy

Read this before changing Cloud Functions, Firestore rules, repository writes,
callable interfaces, trigger-owned projections, payments, safety workflows, or
notification fan-out. Treat `tool/contracts/firestore_contract/` (one file per
collection) as the machine-readable ownership contract and this document as the human map.

## Operating Rules

- Public projections such as `publicProfiles/{uid}` are backend-owned. The
  client reads them but must not write them directly.
- Multi-document product mutations should be callable-owned unless the direct
  Firestore rule is narrow, owner-scoped, and easy to test.
- Trigger-owned derived fields must be idempotent or recomputed from source
  documents.
- Direct client writes require explicit Firestore rules tests for ownership,
  field allowlists, and path/data identity where relevant.
- Storage writes count as backend-surface operations. If a Storage upload also
  changes Firestore, the Firestore write owner must be documented separately.

## Boundary Decision Guide

Use direct client edge writes only when the write is the user's own narrow
source-of-truth action and Firestore rules can prove the full invariant from
the path, authenticated UID, allowlisted fields, and small cross-doc checks.
Good examples are saved events, outgoing profile decisions, and match-scoped chat messages.

Keep callables when the server must decide whether the mutation is valid across
multiple documents, hidden safety state, capacity, schedule conflicts, payment
state, role/host authority, rate limits, or account lifecycle. Good examples
are event-club membership, event creation, booking, waitlist, attendance, reviews,
payments, safety actions, and account deletion.

Use Firestore triggers for projections and side effects after a canonical edge
or entity write exists. Triggers must either recompute from source documents or
use an idempotency receipt when retrying an increment-like update could double
count. Parent relationship projections such as `memberCount` and `nextEventAt`
should be repairable from edge/source documents.

## Interface Types

| Interface | Meaning | Primary enforcement |
|---|---|---|
| Direct Firestore | Flutter repository writes a document directly. | Firestore rules and rules tests. |
| Callable Function | Flutter repository/controller calls a Firebase callable. | Auth, App Check, Zod validation, Admin SDK writes, tests. |
| Firestore Trigger | Function reacts to document create/write. | Source document rules plus trigger idempotency. |
| Storage Trigger | Function reacts to Storage object finalize/delete. | Storage rules plus trigger validation/moderation. |
| HTTP Function | External web/client POST endpoint. | CORS, validation, rate limiting, server writes. |
| Server/Admin Only | No client write surface. | Firestore rules deny client writes. |

## Product commands

`contracts/commands/catalog.json` lists the commands that the website try-it
tools, Catch Host, the `catch` CLI and later WhatsApp call (owner decision,
18 Nov 2026; issue #2058). Each surface is a thin client of one callable;
a website demo is the same command run in the visitor's own try-it
workspace, never a separate demo path. Every command:

- takes the shared envelope (`contracts/shared/command_envelope.schema.json`):
  `mode` (`preview` or `apply`), a client `idempotencyKey`, the calling
  `surface`, an optional `confirm`, and a closed `input` small enough for an
  AI caller to fill;
- answers with `status`, a `previewHash`, a plain-language `summary`, the
  `effects` written or proposed, `next` commands and the `receiptId`;
- writes nothing durable on preview; on apply it recomputes, refuses a
  `confirm` whose preview changed, and records its response in
  `commandReceipts` (`functions/src/commands/envelope.ts`), so a retry with the
  same key replays and the same key with another request is refused;
- declares an effect class. `messages-guests` and `moves-money` need a
  matching `confirm`.

`functions/src/commands/catalog.test.ts` keeps the catalog, the schemas and the
Functions exports in step. The commands so far are `workspace.ensure`
(`ensureTryItWorkspace`), `organizer.import-from-link`
(`importOrganizerFromLink`), `guests.import-list` (`importGuestList`),
`event.import-from-link` (`importEventFromLink`), `promotion.create-kit`
(`createPromotionKit`), `form.import-from-link` (`importFormFromLink`),
`night.plan` (`planNight`) and `sales.import-past` (`importPastSales`), all below. The try-it link commands that read organizer and event pages share one
reader, `functions/src/commands/linkRead.ts`, which reads through a Supply
Intake request. Links read outside a Supply Intake request (`form.import-from-link`
and the Luma claim check) use `functions/src/commands/pageRead.ts`: the try-it
read budgets (`spendTryItReadBudget`, which `linkRead.ts` also spends, each
command under its own limiter names), the do-not-list check that fails closed
(`registryLinkSuppression`, `linksSuppressed`) and the guarded page fetcher
under a monthly allowance (`withPageSource`). No command opens
`pageSourceFor` or checks the registry on its own. `guests.import-list` is the one guest importer: converters for each file
format live in `functions/src/guestImport`, and every surface reviews and
applies through the host roster intake session.

The try-it AI fallback (`functions/src/commands/aiFallback`, #2062) is shared
by every command that reads a link or file its own parser cannot. It ships off:
`AI_FALLBACK_POLICY` needs the owner's decision id and the published privacy
notice reference before it can be enabled, and `aiFallbackPolicies/current` can
only lower limits or switch it off. Each paid read reserves its worst case
against the monthly cap and the visitor's daily reads in `aiFallbackUsage` in a
transaction, settles to the priced tokens, caches its result in
`aiFallbackResults` (so a preview and its apply share one call) and writes a
counts-only `aiFallbackAudit` row. It calls Anthropic through the programme
assistant's federation token source; no key is stored. A refusal
(`ai_cap_reached`, `ai_daily_limit`, `ai_unreadable`) leaves the command on its
non-AI answer. `guests.import-list` and `sales.import-past` send only headers
and column shapes (`functions/src/guestImport/mappingFallback.ts`);
`form.import-from-link` sends the page text of a form its parser cannot read
(`functions/src/formImport/aiForm.ts`); `organizer.import-from-link` and
`event.import-from-link` send the text of the page snapshot Supply Intake
already stored for the request, never a second fetch
(`functions/src/commands/aiPage.ts`).

[Command Layer Map](command_layer_map.md) shows which surface calls which
command, the shared modules each command stands on, and the paths that still
repeat a command's job.

The `catch` CLI (`operations/src/catch-cli/main.mjs`) is the CLI client: it
previews by default and its effect-class confirmation rules live in
`packages/command-client/src/confirmation-policy.mjs`.
`operations/scripts/check-command-catalog.mjs` keeps the catalog in step with
its clients ([Product Command CLI](operations_platform.md#product-command-cli)).

## Rehearsal completion summary

The completion transaction alone stamps `eventRehearsalMilestones/{organizerId}`
alongside the completed session and action receipt. Reset, fork, expiry, client
preferences and navigation cannot erase or create this milestone. Current
organizer managers get the document under rules and Host Today listens to it
(a missing document means not yet); no client writes or lists the collection.
There is no fallback to retained completed sessions.

## Durable Operations Platform

Long-running, resumable admin workflows use the canonical contracts under
`contracts/operations/` and the server-only collections below. Direct client
reads and writes are denied; a separately authorized worker owns mutations.
The current admin callable is a role-gated, rate-limited read projection only.

| Collection | Record | Owner |
|---|---|---|
| `operationRuns/{runId}` | Frozen scope, budgets, counters, checkpoint, and terminal state | Trusted operations worker |
| `operationWorkItems/{workItemId}` | One exclusive primary stage plus orthogonal task/blocker flags | Trusted operations worker |
| `operationActionReceipts/{actionId}` | Immutable idempotency and action evidence | Trusted operations worker |
| `operationLeases/{leaseId}` | Fenced worker ownership and heartbeat | Trusted operations worker |
| `adminActionExecutions/{executionId}` | Hash-only start/terminal receipt for one agent CLI admin action | Role-gated admin execution callables |
| `eventMessagingBudgetDecisions/{decisionId}` | Revisioned finance decision bound to exact messaging setup evidence; never a spend grant | `adminDecideEventMessagingBudget` callable |
| `eventMessagingBudgetDecisionReceipts/{receiptId}` | Immutable request-hash replay evidence for a messaging budget decision | `adminDecideEventMessagingBudget` callable |
| `eventMessagingBudgetApplicationReceipts/{receiptId}` | Immutable proof that one current approval staged both channel spending ceilings in paused state | `adminApplyEventMessagingBudget` callable |

`contracts/admin/actions/` binds every callable-backed admin
GUI action to the same stable CLI action id, role set, request schema, GUI
route, risk, confirmation policy, and contract-loop example. The catalog does
not bypass a callable: live CLI execution still uses Firebase Auth, App Check,
the callable's own role/rate/validation/transaction boundary, and a remotely
visible execution receipt. Mutation commands remain dry-run until both action
and target confirmations match the validated payload. Timeouts or malformed
transport responses terminate as `indeterminate` so an agent must reconcile the
target before deciding whether a retry is safe.

The Supply Intake run and work-item reader (`adminListIntakeOperations`) and
the candidate-to-draft handoff (`adminCreateOrganizerDraftFromCandidate`) were
retired on 16 Nov 2026 with the old Intake review screen, which the Admin
redesign removed on 2 Nov. Their curation receipts stay as read-only records.
`contracts/admin/admin_live_data_sources.json`
is the checked route inventory for every Admin tab and sub-workspace.

`functions/scripts/operations/import-shadow-projection.cjs` is the only shipped
local-to-Firestore bridge. It is dry-run by default and requires explicit apply,
an environment whose configured alias exactly matches the project id,
project-aware production confirmation, and matching run confirmation. It
revalidates contracts, shadow authority, joins, totals, hashes, and the frozen
work-item budget; creates `operationWorkItems` before `operationRuns`; repairs
missing items on exact replay; rejects changed records; and never writes a
public product collection. Imported run ids are immutable snapshots. Whole-run
stage and human-review aggregates are stored in run metadata and are required
for reads. The callable supports a canonical `humanReviewRequired` server
filter backed by the `taskFlags` array index; that filter cannot be combined
with unindexed stage/entity/lifecycle filters. The admin controller eagerly
hydrates only that exception lane and lazily pages ordinary inventory, while
`loadedRunCount`, `nextRunCursor`, and `nextWorkItemCursor` describe loaded
inventory honestly. The 10,000-item run cap, 200-item pages, and 120/minute read
limit are cross-contract tested.

The portable work-item schema remains workflow-neutral; the Supply Intake
callable rejects any work item outside its four-stage vocabulary. Local
reconciliation creates a new immutable child run bound to the source plan and
inventory hashes, so imported snapshots are never updated in place. The shipped
promotion command creates only a blocked review receipt; it does not execute a
public write.

## Current Audit Findings

| Priority | Finding | Status |
|---|---|---|
| P0 | `tool/contracts/firestore_contract.json` was stale for `users/{uid}.firstName`, `lastName`, and `displayName`; the generated Functions type and Firestore rules already had the fields. | Fixed in this pass. |
| P0 | Account deletion anonymized `name` but did not clear retained `firstName`, `lastName`, or `displayName` on `users/{uid}`. | Fixed in this pass. |
| P1 | `RATE_LIMITS` declared several callable limits that were not applied at the handlers: `verifyRazorpayPayment`, `cancelEventSignUp`, `joinEventWaitlist`, `blockUser`, `unblockUser`, and `requestAccountDeletion`. `updateUserProfile` also had no configured limit. | Fixed. All listed handlers now call `checkRateLimit`; `updateUserProfile` is 60/minute to allow brisk field-by-field editing without leaving profile writes unbounded. |
| P2 | The machine-readable contract records operations by collection, but not the Dart initiator method for every operation. | This doc fills the human map; a later tooling pass can validate Dart initiators automatically. |
| P2 | Notification fan-out has a durable backend-owned Activity timeline for matches and event updates; messages instead update the conversation preview/unread flag. | Implemented; use the Notification Timeline table for category-specific ownership. |
| P1 | Edge documents were the source of truth, but event-club parent projections relied only on callable updates or batch repair tools. | Fixed. `syncOrganizerMemberStats` recomputes `memberCount` from active membership edges, and `syncOrganizerNextEvent` recomputes `nextEventAt` / `nextEventLabel` from active future event documents. Event callables also refresh the next-event projection before returning. |
| P0 | Historical events split attendee-facing venue text and coordinates across nullable legacy fields, so enforcing a required structured location in every Dart read would make unrepaired records unreadable. | Strict on new and edited writes, discovery, and self-check-in; compatibility-deferred for Dart deserialization only, so `Event.meetingLocation` stays nullable on reads. The historical-event repair is moot under wipe-and-reseed. |

The app's event viewer reads no callable. The Consumer app composes a guest's
booking state from its own listeners (`composeEventViewerState` in
`lib/contexts/bookings/domain/event_viewer_composition.dart`), mirroring the
booking commands' policy and membership rules, which
`functions/src/events/eventBookingViewerParity.test.ts` keeps in step. It never
reserves inventory or grants approval; existing mutation owners revalidate each
action. The `getEventViewerState` callable that served older builds is retired
(`functions/retired-functions.json`).

The website's event page reads no callable either. A phone-verified guest's step
comes from three listeners: `eventGuestEntries/{eventId}` (how a guest with no
record of their own enters the published event, for a community member and
for anyone else), the guest's own `guestEventStatuses/{eventId}_{uid}` row
(booking, roster place, website or offer payment, application and offer
invitation) and `guestBookingFacts/{uid}` (community membership). The browser
decides the step in the order the retired `surface: guest` read used
(`website/src/features/events/guestEventState.ts`) and closes the entry when
the event starts or an offer invitation expires. Every command still decides.

## Cloud Functions Inventory

Organizer authority is canonical. Club-named functions and paths in this
inventory are released-client compatibility projections only; new initiators
use the organizer-named operations below. The migration and retirement boundary
is `docs/migrations/clubs_to_organizers.md`.

Each top-level `functions/src/` area keeps its rows in its own file under
[`backend_operation_catalog/functions/`](backend_operation_catalog/functions/),
named after the area (`chats.md` for `functions/src/chats/`), so changes to
different areas never touch the same file. Each file is a table with the
columns Function, Type, Initiator, Writes and Notes. Add or edit a Function's
row in its area's file, creating the file with that header if the area has
none. `node tool/docs/function_catalog.mjs` prints the whole inventory as one
table and `--check` validates the files; the combined table is not committed.

## Host read path decisions (Nov 2026)

The screen-read migration (#1339 and its follow-ups) moved Host screens from
read callables to Firestore listeners where rules can say who reads a document
and the document holds nothing that reader may not see. These reads stay
callables. Each reason is the concrete one; a later migration needs a new
answer to it, not just a read model.

**Read path decision (Nov 2026): server-trust, per-viewer filtering.**
`fetchEventSuccessWingmanCandidates` is roster-private and drops blocked people
in both directions, like the swipe candidates. `getEventChatProfile` applies
blocks both ways for each viewer. `getEventAssistanceParticipantContext` matches
the roster on the caller's linked uid and hides ambiguous candidates rather than
guessing. Rules cannot express these filters over documents the reader may not
otherwise hold.

**Read path decision (Nov 2026): server-trust, review fences the next command.**
`getEventChatProfileSharing` returns the revisions that fence the sharing
update. `getEventRehearsalMovement` is the review that fences
`controlEventRehearsal`, built over private practice documents.
`listEventAssignmentFeatureChoices` compares the signed phone claim with the
form responses, and its revision is the consent fence of the assignment write.
`previewEventAssignmentFeatures`,
`previewOrganizerFormConversion` and `previewOrganizerFormAdmission` are
reviews computed before a commit and checked again by it.

**Read path decision (Nov 2026): server-trust, private source data.**
`listEventSmsPreferences`, `listEventWhatsappPreferences` and
`listEventRcsPreferences` are the discovery step of the consent review, over
private permission history. `getOrganizerMessagingSetup` reads server-only
sender connections. `getOrganizerBillingStatus` moved to
`hostOrganizerBillingViews` (#2306): the trigger copies only the trial length
from the server-only commercial terms, with the trial's anchor, start and end
and the plan status, and the readers derive the state and days left.

**Read path decision (Nov 2026): server-trust, computed or issued data.**
`getUserAnalytics` queries BigQuery. `getOrganizerFormResponseDetail` signs
photo links under a dedicated signing identity, and `listEventHostPhotos`
returns signed URLs. `listSuvbotDemoActions` returns a catalog generated in
code, with no stored documents to listen to.

**Read path decision (Nov 2026, #2306 batch C): form editor, analytics and
templates.** `getOrganizerFormEditor` moved to `hostFormEditorViews`: the
trigger copies the draft into a view only current managers read, and the
draft revision that fences `updateOrganizerFormDraft` travels on the view as
`form.draftRevision`, so a save from a stale view still fails on the server.
`getOrganizerFormAnalytics` moved to `hostFormAnalyticsViews` and
`hostFormSourceViews`: the aggregates were already precomputed, and the
trigger applies the privacy threshold through the callable's own projection,
so thresholded counts never reach a view. `getOrganizerFormShareAssets` was
already replaced by a link built on the device from `hostFormSummaries`
(#2309). `listOrganizerFormTemplates` returned a catalog in code; the Host app
now ships the gallery, generated from the same catalog.

**Read path decision (Nov 2026): recorded fallback.** `listOrganizerFormResponses`
is called only when `HostResponseSummaryReads.supports` is false: answer,
identity, contact or text filters, and the other combinations the
`hostResponseSummaries` read model does not index. Supported requests read the
read model.

**Not reads.** `resolveEventAssistanceAccountability`,
`resolveEventAssistanceCase`, `resolveEventSuccessLateArrival`,
`resolveProgramAlert`, `previewOrganizerCampaign`,
`previewOrganizerSavedAudience` and `previewProgramAssistantReply` have
read-like names but are commands: each writes (a resolution, a receipt or a
cached preview) or spends a provider call, so none is a listener candidate.

**No current client (removed November 2026).** The Host app no longer holds
client code for `getEventAssistanceGroupStaff` / `setEventAssistanceGroupStaff`,
`getEventAssistanceParticipation` / `setEventAssistanceParticipation`,
`getEventAttendanceReport` and `getEventAssistanceHostGuests`: no mounted
screen reached their repositories, reviews or editors. The callables stay
deployed for the Host screens that will adopt them (`docs/event_success.md`).

## Direct Client Firestore Writes

Every client `create`, `update` or `delete` that `firestore.rules` allows has a
schema in `contracts/client_writes/`, named in the last column.
`tool/contracts/check_client_write_contracts.mjs` fails when a rules block lets
clients write without one, when a contract outlives its rule, or when a
contract's data names a field its document schema does not have. A row's
schema says what the client writes; the rules still decide whether it may.

| Dart initiator | Collection/path | Operation | Rule owner | Keep direct? | Contract |
|---|---|---|---|---|---|
| `UserProfileRepository.setUserProfile` | `users/{uid}` | Initial profile create after onboarding identity step. | Owner create plus full shape validation. | Yes. This is initial owner-owned profile creation. | `create_user_profile` |
| `HostProfileRepository.ensureHostProfile` / `saveHostProfile` | `hostProfiles/{uid}` | Merge set: create the host profile, then edit its name, role and bio. | Owner create/update with full shape validation. | Yes. Owner-authored display profile. | `create_host_profile`, `update_host_profile` |
| `SavedEventRepository.watchSavedEvent` / `saveEvent` / `unsaveEvent` | `savedEvents/{uid_eventId}` | Render, save, or unsave one event for the current user. | Owner direct edge read/create/delete with deterministic ids. | Yes. No user-profile projection is maintained. | `create_saved_event`, `delete_saved_event` |
| `PushInstallationStore.save` / `delete` (from `FcmService`) | `users/{uid}/pushInstallations/{installationId}` | Store app-role scoped push tokens for side-by-side host/consumer installs. Installations are the only push address store; the app no longer writes `users/{uid}.fcmToken`. | Owner direct create/update/delete of bounded push installation docs. | Yes. Runtime token update. | `upsert_push_installation`, `delete_push_installation` |
| `OnboardingDraftRepository.saveDraft/deleteDraft`; first public OTP registration seed | `onboarding_drafts/{uid}` | Private draft set/delete; server creates a name/phone continuation seed only when no draft exists. | Owner-only direct access plus server callable ownership. | Yes. Private volatile draft state, never a public/Consumer profile by itself. | `upsert_onboarding_draft`, `delete_onboarding_draft` |
| `LaunchAccessRepository.fetchApplication/watchApplication/submitApplication` | `accessApplications/{uid}` | Read the current user's application and create or revise editable application fields. | Owner-only path, strict field/enum/length shape, server timestamps, monotonic submission count, and editable-status boundary; review/cohort/activation fields remain Admin-SDK-owned. | Yes. One narrow owner-authored source document; review decisions remain callable-owned. | `create_access_application`, `update_access_application` |
| `SwipeRepository.recordSwipe` | `profileDecisions/{uid}/outgoing/{targetId}` | Create own outgoing profile decision. | Path/data identity, attended-event, block, and payload rules. | Yes. Match creation remains trigger-owned. | `create_profile_decision` |
| `ChatRepository.sendMessage` | `matches/{matchId}/messages/{id}` | Create text message. | Match participant create only. | Yes. Match preview/unread/moderation are trigger-owned. | `create_chat_message` |
| `ChatController.sendImage` / `ChatRepository.sendImageMessage` | Storage `matches/{matchId}/images/*`, then `matches/{matchId}/messages/{id}` | Shared `ImageUploadRepository` picks/compresses/uploads the chat image; repository writes the image message. | Storage rules prove match participation from `user1Id`/`user2Id` with legacy `participantIds` fallback; message create rules prove active match participation before Firestore write. | Yes. Media picking/compression is centralized with profile/onboarding/event-club image upload policy. | `create_chat_message` |
| `MatchRepository.resetUnread` | `matches/{matchId}.unreadCounts.{uid}` | Reset own unread count to zero. | Participant narrow update. | Yes. | `reset_match_unread_count` |
| `ActivityNotificationRepository` mark read | `notifications/{uid}/items/{notificationId}` | Mark one of the user's notifications read. | Owner narrow `readAt` update. | Yes. | `mark_notification_read` |
| `EventSuccessRepository.ensurePlanForEvent` | `eventSuccessPlans/{eventId}` | Create the default live event guide in a transaction that writes only when it is absent. | Host-only create in setup status with no live-control fields. | Yes. | `create_event_success_plan` |
| Host builds released before #2195 (`EventSuccessRepository.savePlan`) | `eventSuccessPlans/{eventId}` | Revision-checked partial update of setup-owned plan fields before the event is live. Current builds call `saveEventSuccessPlanSetup` instead. | Host-only setup update; participant activity, event start, live status, or `frozenAt` freezes setup fields. | Only until the Host minimum version passes #2195; then deny the client update and delete the contract. | `update_event_success_plan` |
| `EventSuccessRepository` feedback | `eventSuccessFeedback/{eventId_uid}` | A checked-in guest's post-event feedback. | Guest create/update with validated ratings after the event ends. | Yes. | `upsert_event_success_feedback` |
| `EventSuccessRepository` preferences | `eventSuccessPreferences/{eventId_uid}` | A guest's live-module opt-outs. | Guest create/update with validated shape. | Yes. | `upsert_event_success_preference` |
| `EventSuccessRepository` compatibility answers | `eventSuccessCompatibilityResponses/{eventId_uid}` | A participant's compatibility questionnaire answers. | Participant create/update with validated answers. | Yes. | `upsert_event_success_compatibility_response` |

## Workspace field and community membership operations

Program guest/household upserts and manifest imports acquire exact immutable
`workspaceFieldAssertions`; explicit coordinator conflict choices append
`workspaceFieldDecisions`. Lists and message delivery resolve selected evidence
through `workspaces/workspaceFieldAuthority`. Final delivery rechecks phone proof,
consent and household binding. Program retention owns erasure; imported phone/name
acquisition proves no account identity, membership or attendance. Whole-program
manifest preview/commit requires one program-wide guestRelations assignment;
manual edits/choices retain coordinator authority.

`decideOrganizerCommunityMembership` is a manager-only, App-Check-protected,
rate-limited transaction using the application-review budget. Grant consumes
current approved native generic organizer-target application evidence for the
exact UID. Revoke requires an active grant; exact retries report decision/current
revisions without restoring an old grant. The callable owns the current
`organizerCommunityMemberships` edge and immutable decision receipts. Native
booking/waitlist/checkout owners read that authority without duplicating it.
Participation stores historical grant evidence; revoke is prospective and never
initiates paid-booking cancellation/refund. Subject account deletion erases these
roots; actor deletion leaves other subjects' immutable authority intact.

Account/viewer read projections, legacy/manual/exemption sources and gated
public OTP/external continuations remain future adapters, with existing payment,
seat, offer and attendance owners retained. All four new roots deny direct client
reads/writes; grants do not publish a profile or disclose private endpoints.

## Programme live weekend, departures and web links

`getProgramLiveBoard` derives the live board on read: the function on now,
today's schedule in the programme's zone, inbound travel counts and alerts
merged from staff attention sends, cancelled or diverted flights and
disrupted journeys. `resolveProgramAlert` writes only the resolution
(`programAlerts/{programId}_{alertId}`: take, finish, reopen), fenced by
`expectedRevision` with a `requestId` replay. Function leads see the staff
alerts for duties they hold; managers and coordinators see every alert.
The departures desk (`programDepartureViews`, hotel desk duty scoped)
mirrors the arrivals roster for outbound journeys from one hotel. `issueProgramWebLink`
mints expiring signed links that `getProgramDriverTrip` and
`getProgramVendorRunSheet` read without sign-in; they reuse the household
RSVP secret with a kind-separated HMAC and return no contact data. A
manager's `family` link (subject = the programme) opens
`getProgramFamilyView`: the stakeholder counts with function names, heads
per function and households replied, with no guest or household names.
The household RSVP view and every web link read return the programme's
optional `branding`; the RSVP view also says whether the programme
collects guest IDs (`collectsGuestIds`, from the accommodation capability).
`listOrganizerMoments` adds per-moment plans (anchor, sent count, next run,
board state) and the programme's active WhatsApp sender (current Host builds
read the moments and plans from `organizerMomentViews`, see the read paths
below);
`listOrganizerPrograms` rows add bounded guest, flying-in and replied
counts; `updateOrganizerProgram` sets or clears optional `branding`.

## Programme read paths (#1339)

The owner approved moving the programme screens from read callables to
Firestore listeners on 18 November 2026. Each read is decided on its own, in
batches by screen area: the access view and rules helpers first, then the live
board and door, arrivals, departures and hotel, guests and staff, and last
WhatsApp, photos and the lists. Every old callable stays deployed for older
builds and is listed as retire-later when its screen moves; the reads no
current Host build calls were retired in Nov 2026 (listed below).

`getProgramWorkAccess` moves to a listener on the caller's own
`programAccessViews/{programId__uid}` document. A trigger keeps the view from
the staff grant and the programme: the owner-approval proof, the grant expiry
and each assignment's expiry are folded into per-duty instants, so the view is
what `requireProgramAccess` and `activeProgramDuties` decide, without the
clock. Security rules answer every programme read model from that one view
(`hasProgramDuty`, `programDutyCoversPickup`, `programDutyCoversHotel`,
`programDutyCoversFunction`, `isProgramManager`), comparing the instants with
`request.time`. Rules enforce online; a phone offline enforces the same
instants itself from its cached view and its clock, and stops showing cached
rows when the duty or grant has expired, been revoked or been narrowed.
Commands still re-check authority from the source documents.

`getProgramWorkAccess` moves, with the access view, to the work shell's
read models: `programWorkSummaries` (the programme header) and
`programResourceViews` (pickup point, hotel and function labels), both
trigger-kept and readable under rules through the account's access view. The
callable stays deployed for older builds, retire-later.

**Read path decision (Nov 2026, #1339): server-trust.** The two phone-import
checks (`phone_import_adapter` before the import commit, and the import route's
access refresh) keep calling `getProgramWorkAccess` live: each is the review
before a write, and the current wedding-wide guest grant it confirms must come
from the server, never a cache.
`getProgramFunctionDoorView` moves to the door read models
(`programDoorFunctions`, `programDoorRows`, `programDoorJournalViews`):
function-scoped, readable when the account's function check-in or function
lead duty covers the function, with no contact fields; the door's offline
outbox and journal writes are unchanged. `getProgramLiveBoard` and
`listProgramStaffAttention` move to `programAlertViews` (duty-tagged alerts
with their resolution, readable by duty, travel alerts by full reach only),
`programTravelCountViews` and the function labels of `programResourceViews`;
the phone computes the schedule phases from its clock. `resolveProgramAlert`,
`recordProgramDoorJournal` and `createProgramWalkIn` stay commands with their
revision and request-id fences. `listProgramStaffAttention` was retired in
Nov 2026; the other two callables stay deployed for older builds,
retire-later.

`getProgramArrivalsRoster`, `getProgramDeparturesRoster` and
`listTransportVendors` move to read models: `programArrivalViews` (readable
where one greeter, dispatcher or coordinator assignment covers the journey's
pickup point and hotel together, through the access view's `arrivalRoutes`),
`programDepartureViews` (hotel desk duty covering the hotel) and
`programVendorViews` (dispatchers; the callable never returned the vendor's
phone number, and the view cannot hold it). The desk counts come from the rows
and the phone's clock. All three callables were retired in Nov 2026.
`getProgramTransportPlan` stays server-trust below.

`listProgramTrips` and `getProgramHotelInbound` move to `programTripViews`
(readable where one reconciliation viewer, dispatcher or coordinator assignment
covers the trip's pickup point and hotel together, through the access view's
`tripRoutes`; and by the destination hotel's desk while the trip is en route)
and `programHotelInboundViews` (the hotel desk's expected guests). Both
callables were retired in Nov 2026.

Current Host builds read all of these read models (the retired
`getProgramArrivalsRoster`, `getProgramDeparturesRoster`,
`listTransportVendors`, `listProgramTrips` and `getProgramHotelInbound`)
through listeners gated on the account's access view
(`ProgramTransportViewsRepository`): lists are read a page of 100 at a time up
to 500 rows, ordered by document id, with no cursors; the trip ledger export
shares the live ledger.

`listProgramStaff` moves to `programStaffViews` (administrators and the owner;
the row is the callable's with its status's facts, and the revoke command keeps
its revision fence). `listProgramStaffAttention` needs no new read model: it
reads the staff attention alerts of `programAlertViews` (source
`staffAttention`, alert id `{runId}_{duty}`), under the same duty rule. Both
callables were retired in Nov 2026.

**Read path decision (Nov 2026, #2306): sender display.** The programme sender
(`listProgramWhatsappThreads`' header, `listOrganizerMoments`' new-message
sender, `getProgramAssistantSettings`' number) moved to `programSenderViews`,
and the assistant settings to `programAssistantSettingViews`: the trigger
copies only the display number, verified name, status and connection id, so
provider ids and secrets stay on `organizerSenderConnections`.
`getEventAssistanceRuntimeConfig` stays a callable: its sender picker pages
Catch SMS and RCS senders with WhatsApp ones and computes each choice's
availability for the event and a review hash.

**Read path decision (Nov 2026, #1339, revised by #2306).** `listProgramGuests`
moved to `programGuestDirectoryViews`: its trigger resolves phone numbers and
emails from the workspace field assertions exactly as the callable did, so that
evidence and the `fieldAuthority` (which no client read) stay server-only, and
the rows carry the revisions `upsertProgramGuest` and `upsertProgramHousehold`
fence on. `listProgramHouseholds` stays a callable for the guest editor's
household picker.

**Read path decision (Nov 2026, #1339): server-trust.** `getProgramStakeholderCounts`
and `getProgramAttendanceReport` stay callables: the stakeholder viewer and the
reconciliation viewer see counts and guest ids only, computed over every
guest, household, function and journey row, which those roles must not hold,
and the freshness contract is `hostReports` (five minutes), not a live view.

**Read path decision (Nov 2026, #1339): server-trust.** `getProgramTransportPlan`
stays a callable: it groups waiting parties into vehicles with an algorithm
that depends on the current time (wait overdue, dispatch-by) and on every
party, hotel and vehicle class, and a second copy of that logic on the phone
would drift from the server's.

**Read path decision (Nov 2026, #1339): server-trust.** `listProgramIdTracker` and
`getProgramGuestIdStatus` stay callables: they depend on guest ID documents and
their review state, which the client must not hold.

**Read path decision (Nov 2026, #1339): server-trust.** `getProgramHotelHandover`
stays a callable: it reads guest ID documents the client must not hold and
records the handover in the same call.

**Read path decision (Nov 2026, #1339): server-trust.** `getProgramAssistantSettings`
stays a callable: it reads the assistant's settings and credential
references, which no client may hold.

`listProgramWhatsappThreads` (for its rows) and `getProgramWhatsappThread`
move to listeners (batch 5). The inbox reads `programWhatsappThreadViews`, one row per thread:
exactly the summary the list returned, without the clock-dependent
`serviceWindowOpen` (the phone derives it from `lastInboundAtMillis`), plus
the household's label, primary contact name and guest count from the thread
header. The Needs you, Handled and All counts are the phone's tally of its own
rows. A thread's messages are read directly from `programWhatsappMessages`
(a query naming the programme and the thread, newest first). Managers and the
communications duty read both under rules; the phone hash, sender connection,
who took the thread over and the reply reservations stay on server-only
documents, and the views and messages go with the archived programme's
retention sweep. A planner reply names its author by `authorUid` and, since
the author-label change, by `authorLabel`: the author's display name copied
from their staff grant when the reply is written (null for the assistant and
for the owner, who holds no grant; filled onto earlier replies by the
`program-whatsapp-author-labels` migration), so communications staff, who
cannot read `programStaffViews`, still see who answered. Opening a thread used to mark it read; that write is
now `markProgramWhatsappThreadRead` (same payload, same access, a no-op on an
archived programme or an already read thread), which answers the thread's
handling and its new revision: use that revision as the next
`setProgramWhatsappThreadHandling` `expectedRevision`, because a view lags its
thread by a trigger. `listProgramWhatsappCannedReplies` becomes a direct read of
`programWhatsappCannedReplies` by the same duty (the phone drops archived rows
unless asked and orders by `sortOrder`, then label); saving stays
`upsertProgramWhatsappCannedReply`. `getProgramWhatsappThread` and
`listProgramWhatsappCannedReplies` were retired in Nov 2026. Current Host builds read all of this through listeners
gated on the communications duty (`ProgramInboxViewsRepository`): the thread
rows a page of 50 at a time up to 500, a conversation's newest 200 messages
(`truncated` when more exist), the saved replies up to 100. Opening a thread
marks it read once per revision, and the next handling command is fenced by
the newer of the view's revision and the one marking it read answered.

**Read path decision (Nov 2026, #1339): server-trust.** The `sender` block of
`listProgramWhatsappThreads` (the wedding's number as displayed, its
connection id and health) stays on that callable: it resolves a bound or
first-active connection from `organizerSenderConnections`, which holds
credentials references and stays server-only, and no view of it exists yet. The
inbox header asks the callable for it (`limit: 1`) until a sender read model is
approved.

`listProgramPhotos` splits in two. Photo records are read directly:
`programPhotos` is readable by managers and the communications duty (a query
naming the programme), so albums, counts, captions and visibility come from the
phone's own grouping, and function names come from the programme's function
labels in `programResourceViews`, which the communications duty lists whatever
its work list reaches (#2175). The one thing a phone cannot make is a short-lived URL, so
`signProgramPhotoUrls` (managers and communications staff, at most 60 photo ids
and optionally the cover) reads each named photo itself, signs only files that
belong to this programme and returns URLs that expire within ten minutes. It
never signs a path the phone names, and Storage rules stay closed to client
reads (a download URL carries a token that does not expire). `listProgramPhotos`
was retired in Nov 2026. Current Host builds list the
records (a page of 100 at a time up to 1,000, newest first), build the albums
and name them from every function label of the programme (read under the same
communications gate), and sign the cover and the albums' first photos and the
photos shown in calls of at most 60.

`listOrganizerPrograms` and `getOrganizerProgram` move to
`organizerProgramViews`: the programme object, its creator, the function count
and the function, pickup point and hotel setup lists, kept by triggers on the
programme and those three collections. Rules admit exactly what
`requireProgramSetupAccess` admits: the creator (listing by `createdBy`), the
organizer's current managers (listing by `organizerId`) and a live
`programAdmin` duty (one programme by id); a deleted account reads nothing. A
function's expected and checked-in counts are not in the view (they move with
every check-in); the phone reads them from `programResourceViews`. The list is
the organizer's programmes ordered on the phone by start. Both callables stay
deployed for older builds, retire-later.

**Read path decision (Nov 2026, #1339): server-trust.** The guest, flying-in and
replied counts of a `listOrganizerPrograms` row, and the guest, household,
inbound journey and active staff counts of `getOrganizerProgram`, stay on those
callables. They are tallies over every guest, household and journey of the
programme, which change with each RSVP, import and flight update; stored copies
would need a counter that every one of those writes contends on, or a recount of
thousands of documents per write. Current Host builds read the programme and
the organiser's list (`OrganizerProgramViewsRepository`) from
`organizerProgramViews` by `organizerId`; the programme's detail asks
`getOrganizerProgram` for its counts alongside, and shows without them when that
fails. The Events tab (`hostEventsProgrammes`) paints its programme rows from
`organizerProgramViews` first and lays the counts of the first
`listOrganizerPrograms` page over them when that read returns; it falls back to
the callable's rows when the views read fails. The planner home
(`programmesOverview`) still reads whole rows from the first
`listOrganizerPrograms` page and waits for it. The Inbox programme audience
checks the programme's identity and title from its `organizerProgramViews`
document before it asks for guest pages. Rules end these reads online. Offline
the phone gates them on the account's access views (#2175): an organiser
manager who did not create the programme gets a setup-only view
(`organizerManager: true`, inactive for duties) from the trigger on
`organizers`, kept current as the organizer's managers change. The detail opens
while its programme's view holds setup authority (creator, organiser manager or
a live `programAdmin` duty); the list shows only the rows whose programme's view
is the creator's or an organiser manager's, read with one query on the
account's own views naming its uid and the organiser.

`getProgramHotelRooms` moves to `programHotelRoomViews/{programId}__{hotelId}`:
one board per hotel, exactly the callable's reply without the caller's access
expiry and the read time (the room blocks with their peak occupancy and rooms
left, every stay with the guest's display name and its revision, and the
routed guests with no live stay with the block the allocation policy
suggests), kept by triggers on stays, room blocks, the hotel, inbound
journeys, guests' names and groups and the programme's time zone. The hotel
desk covering the hotel (coordinators and the owner too) reads it by id; a
board past the callable's complete-read caps is written as `overflow` with
empty lists and the phone says so, as the callable refused it. The stay
revision the phone sends to `upsertProgramStay` comes from the board, so a
board that has not caught up with a write is refused by the fence and reloads
live. The callable stays deployed for older builds, retire-later.

`listMyHostAssignments` moves to `hostAssignmentViews/{uid}__{kind}_{scopeId}`:
one row per programme staff grant, event staff grant and organiser team
membership of an account, with the title, the organiser's name and the duties
the callable listed, plus the facts its clock-dependent filtering used (status,
the owner approval instant, the grant's expiry and each duty's own expiry;
duties already expired are left out). Only that account reads its rows (a query
naming `uid`); the phone keeps the live ones at its clock, ends access at the
grant's or soonest live duty's expiry, and lands an account with an active team
membership in the manager shell, as the callable's shell entry did. The rows
grant nothing: every destination re-checks its own authority. The callable
stays deployed for older builds, retire-later.

`listOrganizerMoments` splits in two. The moment rows and their plan summary
move to `organizerMomentViews/{momentId}`: the moment exactly as the callable
returned it and its sent count and next planned run (while armed) from
`organizerMomentRuns`, kept by triggers on moments and runs; the phone works out
the board state that compares moments (which armed moment runs next).
Programme rows are read by the owner and the communications duty (a query naming
`scopeKind` and `programId`), event rows by the event organiser's current
managers (a query naming `scopeKind` and `eventId`); organiser-scope automation
moments have no row. The event Moments screen and the programme's planned
messages read them through listeners. The callable stays deployed for older
builds, retire-later for its moment rows.

**Read path decision (Nov 2026, #1339): server-trust.** The
`senderConnectionId` of `listOrganizerMoments` (the organiser's active WhatsApp
sender that new planned messages send through) stays on that callable: it is
resolved from `organizerSenderConnections`, which holds credential references
and stays server-only, and no view of it exists. The planned message screen
asks the callable for it alongside the listener, and saves only once it has
answered.

**Retired programme reads (Nov 2026).** No Host build since 1.0.5 calls them,
and they are listed in `functions/retired-functions.json`:
`getProgramArrivalsRoster` (replaced by `programArrivalViews`),
`getProgramDeparturesRoster` (`programDepartureViews`), `listTransportVendors`
(`programVendorViews`), `listProgramTrips` (`programTripViews`),
`getProgramHotelInbound` (`programHotelInboundViews` and `programTripViews`),
`listProgramStaff` (`programStaffViews`), `listProgramStaffAttention`
(`programAlertViews`), `getProgramWhatsappThread`
(`programWhatsappThreadViews` and `programWhatsappMessages`),
`listProgramWhatsappCannedReplies` (`programWhatsappCannedReplies`) and
`listProgramPhotos` (`programPhotos` plus `signProgramPhotoUrls`).

**Retire-later callables (programme read batches 3 to 5, #1339).** Deployed for
older builds, no current client calls them: `listProgramWhatsappThreads` for
rows (still called with `limit: 1` for the header's number), `getProgramHotelRooms`,
`listMyHostAssignments` and `listOrganizerMoments` for moment rows (still called
by the planned message screen for the sender). The overview and rollup counts of
`listOrganizerPrograms` and `getOrganizerProgram` are still called.

## Programme WhatsApp threads, replies and the assistant settings

Wedding guests message the programme's own WhatsApp number (an organiser
sender connection bound through `updateOrganizerProgram`
`whatsappSenderConnectionId`; unbound programmes fall back to the
organiser's first active sender). The organiser webhook's inbound
processing resolves the programme and the household
(`programWhatsappEndpointIndex`, kept by triggers on `programHouseholds` and
`programGuests`) before any CRM matching and stores the message in the
household's `programWhatsappThreads` thread; a STOP revokes the household's
messaging consent and keeps the organiser suppression path.
`listProgramWhatsappThreads` (the sender header), `markProgramWhatsappThreadRead`
and `setProgramWhatsappThreadHandling` are the planner inbox commands and reads
(managers and the communications duty). `sendProgramWhatsappReply` sends free text only inside
the 24-hour window: a `programWhatsappReplyOperations` reservation precedes
the Meta call, an uncertain outcome stays unknown, and a
`whatsappDispatches` record (`source: program`, `kind: service`) routes delivery
receipts back to the message. `sendProgramServiceReply` is the same path for
the assistant (lane W2). `upsertProgramWhatsappCannedReply` keeps saved
replies, which the phone reads from `programWhatsappCannedReplies`;
`getProgramAssistantSettings` / `updateProgramAssistantSettings` keep
`programAssistantSettings` (managers and coordinators).
`onProgramWhatsappInboundMessageCreated` is the assistant's trigger point.

## Programme guest IDs, hampers, photos and vendor bills

`createProgramAssetUpload` signs one upload of a programme file (guest ID,
hamper photo, function photo, guest page cover) into private Storage; it
writes nothing. `submitProgramGuestId` (household RSVP token) stores one
member's ID after verifying the uploaded objects; `decideProgramGuestId`
accepts it or asks again (guest relations, revision fence, `requestId`
replay); `getProgramGuestIdStatus` (household RSVP token) returns each
member's name and ID status for the household's own ID page, and nothing
else about the ID; `listProgramIdTracker` lists staying guests with ID status and
signed image URLs; `getProgramHotelHandover` (a `hotelHandover` web link
from `issueProgramWebLink`) gives the front desk its rooming list with
accepted IDs and records each look. `reconcileProgramVendorBill` reviews,
checks, questions or approves one vendor's bill against its recorded trips
(writes are manager-only). `upsertProgramHamper` marks a room's hamper
placed, by a porter through a `hamperPorter` link or by hotel desk staff;
`getProgramHamperWebView` is the porters' list. `upsertProgramPhoto` adds or
changes a function photo; `signProgramPhotoUrls` signs short-lived URLs for
photos the phone lists from `programPhotos`, and the cover. Every command keeps a `requestId` receipt on its
document. The guest ID, hotel and porter web pages are P4.10.

## Programme assistant

The wedding assistant ([owner doc](programme_assistant.md)) has one entry
point and one callable. `handleProgramWhatsappInbound` is called by the
programme WhatsApp inbound trigger for each guest message (it exports no
Function of its own). It skips threads the planner has taken over. While
the assistant is off it marks the thread `needsYou`. Otherwise it either
answers from the household's fact pack through `sendProgramServiceReply`,
or passes the message on: thread `needsYou` with `escalationReason`, a
staff attention journal row in `organizerMomentSends` (duty
`communications`), an assigned `programAlerts` row, and a holding reply
while the 24-hour window is open. `previewProgramAssistantReply`
(`communications` duty) runs the same path for the settings screen's Try it
and sends nothing. Both write one `programAssistantRuns` audit row per run
and draw on the programme's daily `programAssistantBudgets` ledger. The
run's intent and its reservation commit before any model call, and a run is
never resubmitted.

## Paid host membership operations

Paid host memberships ([spec](plans/host_memberships_spec.md)) are entirely
server-owned; clients write nothing.

- The organizer's money flow is the `hostMembership` payment route. The
  owner's chosen default, `hostCollected` (`razorpayOAuth`, set as the app
  route), runs plans and subscriptions on the organizer's own Razorpay account
  through its OAuth connection. With no route, memberships are unavailable.
  `platformSplit` (`razorpayRoute`) keeps the original Route split and is off
  unless selected.
- `manageHostMembershipProgram` (manager) reports the effective mode, account
  readiness, commercial terms and the first unavailable reason. Enabling
  `hostCollected` probes Subscriptions on the organizer's account, registers a
  per-connection membership webhook there, and snapshots the binding
  (`moneyFlow`, merchant account, connection id, mode, webhook id) on the
  program. Billing pause/resume only records intent;
  `processHostMembershipBillingPause` pages through members with the
  provider for each membership's own binding.
- `manageHostMembershipPlans` (manager) owns `hostMembershipPlans`; publishing
  creates one immutable Razorpay plan per interval and price revision on the
  bound account, recording that account on the price.
- `manageHostMembershipCheckout` (member) rechecks the mode, connection,
  commercial terms and price account in its transaction, reserves cap
  capacity with an open checkout bound to the program's account, creates the
  subscription there and returns its hosted authorization link; `refresh`
  pulls provider state from the same account.
- `hostMembershipRazorpayWebhook` verifies the HMAC with the delivering
  account's secret (the connection's for a merchant webhook, which carries
  `connectionId`; the platform's otherwise), the account, project and Catch
  notes, writes a create-once receipt and is, with checkout refresh,
  self-serve and billing pause, the only path into
  `membershipStore.applySubscriptionSnapshot` — the single writer of
  `hostMemberships` (apart from the savings totals below) and member
  counters. A snapshot applies only to a
  checkout bound to the delivering account. Foreign or unknown payloads write
  nothing.
- Each `subscription.charged` payment is recorded in `hostMembershipCharges`
  with its frozen commercial terms. `hostCollected` charges deduct nothing
  and transfer nothing; `platformSplit` charges are split with a payment-level
  Route transfer under a lease, and `reconcileHostMembershipCharges` retries
  with read-before-resend recovery. `listHostMembershipChargesForStatement`
  is the commission statement's membership source.
- `manageEventMembershipRules` (manager) owns `eventMembershipRules`, outside
  `eventPolicy`. `signUpForFreeEvent` and `managePublicEventCheckout`
  evaluate it through
  `hostMemberships/entitlement.ts` after the policy quote; the free and public
  paid paths record `hostMembershipBenefitUses`, and `cancelEventSignUp`
  releases them.
- `onHostMembershipBenefitUseWritten` keeps `savedInPaise` and
  `memberPricedBookings` on each membership from its benefit uses that are not
  released, applying each write's difference with its dedupe receipt in one
  transaction.
- `onHostMembershipAudienceProjected` and the daily
  `refreshHostMembershipSegments` project memberships onto linked organizer
  contacts (CRM definition version 4).
- `requestAccountDeletion` cancels a deleted member's live subscriptions
  immediately, then erases membership, checkout and benefit-use roots.

### Shared delivery collections

`deliveryMessages/{messageId}` is the outbox for automation, programme,
campaign and approval-notification sends, and `whatsappDispatches/{attemptId}`
holds their WhatsApp dispatch evidence. Every document carries a `source`
(`automation`, `program`, `campaign` or `approvalNotification`); ids are
content hashes over the source's own context, so sources never collide. Each
source keeps its own contract and parser, and the WhatsApp receipt router
picks the owning store by `source`. Senders write dispatch evidence only
through `functions/src/delivery/whatsappDispatches.ts`, which validates each
document against its source's contract inside the sender's transaction.
Event-day assistance keeps its per-channel
collections by owner decision (12 Nov 2026).


## Backend-Owned Collections And Fields

| Path/field | Owner | Client rule |
|---|---|---|
| `publicProfiles/{uid}` | `syncPublicProfile` trigger | Read-only to clients. |
| `publicOrganizers/{organizerId}` | `syncPublicOrganizer` trigger | Read-only to clients: anyone may get one by id; lists return only discoverable rows. |
| `hostProfiles/{uid}` | Host profile owner writes and organizer team/create seed paths | Public readable professional host identity; dating/profile fields are not stored here. |
| `organizerTeamMemberships/{organizerId_uid}` | Organizer team callables | Scoped reads; direct client writes denied. |
| `organizerFollows/{organizerId_uid}` | Organizer follow callables and account deletion | Owner-scoped reads; direct client writes denied. |
| `organizerCommunicationPreferences/{organizerId_uid}` | Public registration, future self-service/STOP and account deletion | Server-only; Hosts receive aggregate reachability counts, not the cross-organizer consent ledger. |
| `organizerCommunicationPermissionReceipts/{receiptId}` | Participant registration, self-service/unsubscribe, inbound STOP, account deletion | Server-only immutable decision history; managed delivery requires a complete current grant receipt. |
| `organizerContactOrigins/{originId}` | Approved contact creators, contact merge/unmerge, account-deletion actor redaction | Server-only provenance; source identity is stable while current contact identity follows receipt-backed merge state. |
| `organizerContacts`, `organizerContactNotes`, `organizerContactTagVocabularies`, `organizerContactIdentityLinks`, `organizerContactIdentityClaims`, `organizerContactMergeReviewDecisions`, `organizerContactEventEdges`, `organizerContactTraits` | Organizer audience, merge review, and invite-attribution projections plus manager-only CRM callables | Server-only; raw contact, organizer-authored memory, identity evidence, review decisions and traits never have direct client collection access. |
| `organizerCampaigns`, `organizerCampaignRecipients`, `organizerBroadcastSummaries`, `organizerCampaignWebhookReceipts`, `organizerSenderConnections`, `organizerMessageTemplates`, `organizerWhatsappThreads`, `organizerWhatsappMessages`, `organizerWhatsappReplyOperations` | Organizer CRM, Sends history, campaign dispatcher, Meta setup/webhook operations, and Inbox WhatsApp facets | Server-only; clients use sanitized manager callables. Announcement summaries are body-free organizer-scoped projections; provider tokens stay in Secret Manager. Resolved-contact WhatsApp bodies and at-most-once reply reservations are retained only in TTL-bound stores and never enter analytics projections. |
| `organizerProviderConnections`, `externalEventMappings`, `providerSyncRuns` | Provider setup, mapping and reconciliation callables | Server-only; safe connection health/capability projections are returned by callables, while credentials never enter client-readable documents. |
| `organizerPublicPage/{organizerId}`, `eventPublicPage/{eventId}`, `publicPageBuilds/{organizerId}` | `functions/src/publicPages` rebuild triggers, schedules and backfill | Server-only. The website server reads one page document per organizer or event route with the Admin SDK; the build marker is private. |
| `cityPlans/{citySlug}` | `functions/src/cityPlans` trigger and hourly rebuild | Server-only. The website server reads one city document per homepage, Explore or city page with the Admin SDK. |
| `publicFoundingHostOffers/{marketId}` | `adminManageFoundingHostOffers` and the founding place grant | Public read (get and list): cap, places left, status, trial days and deadline only, for the website's founding-host strip. No organizer, owner or staff identity. Direct client writes denied. `foundingHostOffers`, `foundingHostPlaces` and `foundingHostOwnerPlaces` are server-only. |
| `organizerAttentionItems/{attentionId}` | Host Today read-through attention reconciliation | Server-only evaluated projection. The policy catalog owns predicates; the row stores bounded provenance, urgency, destination, and resolution state. Managers receive sanitized callable results, and unsupported kinds remain explicit coverage gaps rather than inferred tasks. |
| `organizerForms`, `organizerFormDrafts`, `organizerFormVersions`, `organizerFormResponseDrafts`, `organizerFormResponses`, `organizerFormShareLinks` | Generic Host Forms lifecycle, respondent runtime, and share callables | Server-only. Managers receive bounded projections, drafts use optimistic revisions, public identities grant no Firestore access, published versions and responses are immutable snapshots, and source tokens grant attribution only. |
| `organizerApplicationForms`, `organizerApplicationFormVersions`, `organizerApplications`, `organizerApplicationResponses`, `organizerApplicationImportReceipts` | Organizer application import, listing, detail and review callables | Server-only. These hold imported (CSV/XLSX or connector) applications: the import publishes its form version, writes immutable response snapshots and an idempotency receipt. Applications converted from Generic Forms keep only the `organizerApplications` review row; their answers are read from `organizerFormResponses` and its version, with no copy. Managers receive bounded callable projections; provider metadata never grants authority. |
| `participantIntakeProfiles` | Generic Forms response and profile-claim callables | Server-only. Portable prefill stays private and separate from `users`. The retired participant application flow (`participantOrganizerDataGrants`, `organizerApplicationAssets`, `organizerApplicationSourceMappings`) had no client and no data; it was removed on 12 Nov 2026. |
| `eventStaffPresence/{eventId}_{uid}` | `heartbeatEventStaffPresence` | Managers and active `viewRoster` staff of the event may read (listener by `eventId`); every direct write is denied. Rows are current only while `expiresAt` is in the future. |
| `eventStaffGrants/{eventId_uid}` | Event staff grant/revoke and authority guards | Direct client access denied. Staff receive only the event-scoped sanitized callable projection allowed by their unexpired, unrevoked permissions. |
| `eventSuccessPlans/{eventId}` live revision/publication fields, `stepOverrides`, `stepStartedAtMs`, `pausedAtMs`, `crawlStopChanges` | Event Success live-control callables (`controlEventSuccessLive`, `saveEventPlanStep`, `changeEventCrawlStop`) and draft trigger | Active participants may read the plan, but direct clients cannot create or update backend-owned live metadata. Host setup writes use a narrow pre-live field set. |
| `eventPlanChanges/{sourceId}` | `updateEvent` and trusted operational-notice source reader | Server-only immutable revisions. Direct client reads and writes are denied; a source applies only to the latest event revision and a qualifying roster row that existed when it committed. |
| `eventAttendees/{attendeeId}` accountability fields | `setEventSuccessAccountabilityResolution` and live completion | Authorized Hosts may read the operational roster, but every direct write remains denied. Resolution is valid only for the exact current check-in timestamp. |
| `organizerEventSuccessLayouts/{organizerId_layoutId}` | Event Success layout callable | Organizer managers may get/list their reusable assets. Direct client writes are denied, and participants receive only the selected timestamp-free projection through a callable/runtime bootstrap. |
| `eventSuccessAssignmentDrafts/{eventId_moduleId_uid}` | Event Success rotation generator, override callable, and draft trigger | Event Host get/list only; direct client writes and participant reads are denied. |
| `eventSuccessPresence/{eventId_uid}` | `heartbeatEventSuccessPresence` callable | Current organizer managers get or list an event's heartbeats; attendees cannot read them and every client write is denied. |
| `eventSuccessLateArrivals/{eventId_uid}` | `resolveEventSuccessLateArrival` callable | Subject attendee and authorized Host may get the deterministic resolution. Lists and every direct client write are denied. |
| `eventSuccessConversationGraphs/{eventId_uid}` | Event Success conversation graph callables | Only the subject attendee may get the deterministic document. Hosts, other attendees, collection queries, and every direct client write are denied; Hosts receive only the numeric scorecard projection. |
| `eventSuccessUnitOutcomes/{eventId}` | `recordEventSuccessUnitOutcomes` callable | Event Host get only. Lists, attendee reads, and every direct client write are denied. |
| `eventSuccessStandings/{eventId}` | `recordEventSuccessUnitOutcomes` callable | Authorized Host, active participant, or ready external runtime identity may get the event projection. Lists and every direct client write are denied. |
| `eventInviteLinkSecrets`, `eventInviteTouches`, `eventShareIntents`, `eventInviteAttributions` | Invite bearer-token, measurement and verified-fact attribution callables/triggers | Server-only. Touch and intent evidence use TTL; raw tokens and immutable attribution facts are never directly exposed. |
| `organizerAudienceSummaries/{organizerId}` | Audience projection and CRM summary callable | Server-only. Summaries expose only authorized aggregate responses; the projection's redelivery receipts are `commandReceipts` entries. |
| `organizerClaimRequests/{requestId}` / `scheduleLocks/{lockId}` | Organizer claim callables; event publication, schedule edit, booking and waitlist callables (organizer locks `organizer_{organizerId}_{slot}`, user locks `user_{uid}_{slot}`) | Server-only; direct client reads/writes denied. |
| `organizers/{organizerId}` writes | Organizer create/update/archive/delete, admin publishing, and projection triggers | Public read; direct client writes denied. |
| `organizers/{organizerId}/posts/{postId}` | `createOrganizerPost` callable | Authenticated clients can read; direct writes denied. |
| `organizerPostDeliveryOperations/{postId}` | `createOrganizerPost` callable and `dispatchPendingOrganizerFollowerUpdates` scheduler | Server-only lease, cursor, and aggregate receipt. Managers receive only sanitized counts through callable responses. |
| `organizerPostDeliveryRecipients/{receiptId}` | `createOrganizerPost` callable and `dispatchPendingOrganizerFollowerUpdates` scheduler | Server-only post-scoped, de-identified per-recipient evidence retained for 90 days through Firestore TTL. The deterministic receipt id hashes the post and UID together; no raw recipient UID or cross-post recipient key is retained. |
| Retired `clubs`, `organizerMemberships`, `organizerHostClaims`, `organizerScheduleLocks` and `userEventScheduleLocks` | None since 11 Nov 2026 | No code reads or writes them. Payout setup checks `organizerTeamMemberships` owner seats, follows live in `organizerFollows`, and locks in `scheduleLocks`. Existing documents stay in place until the 7 Nov 2026 data hold lifts. |
| `users/{uid}.deleted`, `deletedAt` | Account deletion callable | Direct client writes denied. |
| `organizers/{organizerId}.followerCount` | Organizer follow callable plus recompute trigger | Direct client writes denied. |
| `organizers/{organizerId}.rating`, `reviewCount`, `verifiedReviewCount` | review-stat trigger | Direct client writes denied. |
| `organizers/{organizerId}.nextEventAt`, `nextEventLabel` | Event callables plus next-event trigger | Direct client writes denied. |
| `organizers/{organizerId}.status`, archive fields, and type audit fields | Organizer mutation callables | Direct client writes denied. |
| `events/{eventId}.bookedCount`, `waitlistedCount`, `checkedInCount`, `genderCounts` | Booking, waitlist, attendance, payment callables | Direct client writes denied. |
| `events/{eventId}.status`, `cancelledAt`, `cancellationReason` | `createEvent` / `cancelEvent` / `deleteEvent` callables | Direct client writes denied. |
| `events/{eventId}.eventOrigin`, `runtimeAccess` | Event creation/runtime configuration callables | Server-owned immutable provenance and opaque runtime join configuration. Legacy absence is supported; direct client writes are denied. |
| `eventBookings/{eventId_uid}` | Booking, waitlist, attendance, cancellation, account deletion callables. Event detail and shared event streams read only the current viewer's edge(s); authorized event hosts retain managed-roster access. `fetchSwipeCandidates` owns identified post-event discovery for the swipe deck, Event Recap, and attendee-avatar enrichment. | Direct client writes denied. Reads allow only the participant's own edge or an authorized host for that event; arbitrary authenticated roster enumeration is denied. |
| `eventRuntimeParticipants/{eventId_uid}` | Runtime claim/profile callables and later Event Success module operations | Owner get only by deterministic path; list and all direct writes denied. A ready edge grants event-scoped runtime use without synthesizing Consumer booking/network state. |
| `eventRuntimeDataRequests/{requestId}` | Required-data trigger, runtime bootstrap and profile submission | Server-only current request; its exact-command receipt is a `commandReceipts` entry. Clients receive only the caller's bounded request through bootstrap; no direct reads, lists or writes. |
| `eventRuntimeClaimRequests/{eventId_uid}` | Runtime claim and Host decision callables | Authorized organizer managers may read their event's pending queue; all direct writes and claimant roster-detail reads are denied. |
| `eventCrossPathsConsents/{eventId_uid}` | `setCrossPathsEventConsent` callable | Caller may read only their own deterministic edge, including an own-edge constrained query that returns empty when no choice exists. Direct client writes and other-member reads are denied. |
| `crossPathsShowcaseEligibility/{uid}` | Account-deletion cleanup only; the reviewing callables were retired on 16 Nov 2026 | Server-only reviewed status, coarse reasons, versions, neutral checklist, and profile fingerprint, kept read-only. Every client read/write is denied. |
| `eventMessagingBudgetDecisions/{decisionId}` | `adminDecideEventMessagingBudget` callable | Server-only finance review evidence. Direct access is denied even to signed-in Admin clients; the callable is the role, validation, revision and audit boundary. It is not a dispatch budget and grants no spending authority. |
| `eventMessagingBudgetDecisionReceipts/{receiptId}` | `adminDecideEventMessagingBudget` callable | Server-only immutable request receipt. It preserves exact replay after later decisions and contains no spending authority. |
| `eventMessagingBudgetApplicationReceipts/{receiptId}` | `adminApplyEventMessagingBudget` callable | Server-only immutable application receipt. It binds the exact decision and resulting paused event/sender-day ceiling hashes, records that the ceilings were staged, and fixes spending authority, dispatch authority, provider contact and worker activation to false. |
| `crossPathsSuggestionExposures/{exposureId}` | `getCrossPathsSuggestions` callable and account-deletion cleanup | Server-only session-idempotent exposure/fatigue receipt. Every client read/write is denied; it contains no roster projection or private preference value. `expiresAt` requires the environment's 30-day Firestore TTL policy. |
| `crossPathsPairHolds/{holdId}` | `respondCrossPathsInvitation`, canonical booking/payment fulfillment, lifecycle triggers, expiry scheduler, and account deletion | Participant-get-only, server-write-only companion reservation. `active` is not a booking; frozen quote, independent booking states, expiry/release, payment, and plan linkage remain callable-owned. List is denied and aggregate capacity lives on the event document. |
| `eventBroadcasts/{broadcastId}` | `sendEventBroadcast` callable and account-deletion cleanup | Server-only operational receipt. Direct client reads and writes are denied; clients receive only sanitized callable response counts. `expiresAt` requires a 90-day Firestore TTL policy. |
| `organizerBroadcastSummaries/{broadcastId}` | `sendEventBroadcast` | Server-only durable Announcement history projection. Direct client reads and writes are denied; manager callables and the `hostSendSummaries` rows expose bounded organizer/contact-scoped summaries without body, recipient or raw receipt evidence. |
| `hostAnalyticsSnapshots/{uid}_{scopeHash}` | `getHostAnalytics` callable and account-deletion cleanup | Server-only 15-minute response cache. Identity includes the authenticated uid, current authorized clubs, absolute local-day range, granularity, preset, and IANA timezone; direct client reads and writes are denied and `expiresAt` has a Firestore TTL policy. |
| `guestPayments/{paymentId}` (purpose `booking`) | Payment verification/cancel callables and native refund recovery; the paying guest reads their own | Direct client writes denied. Admission and payment commit atomically; cancellation/rejection intent fences repeat admission and freezes provider/charge/amount authority; only full confirmed return marks refunded. |
| `reviews/{reviewId}` writes | Review mutation callables plus review-stat trigger | Direct client writes denied. |
| `matches/{matchId}` create/status/preview/unread flags | Matching/message/block triggers plus `startOrganizerHostConversation` | Direct client creation denied; only participant unread reset allowed. Dating matches use `eventIds` as shared-event history. Host inquiries are independently scoped by club, optional event, and participant pair; a general inquiry keeps `eventIds` empty and must never be inferred as event-specific. The current two-participant model is a personal contacted-host thread, not a team-shared organizer inbox. Dart reads legacy `eventId` while older seeded/live data is being cleaned up. |

## User Identity Projection Inventory

| Projection | Source | Sync owner | Repair / validation |
|---|---|---|---|
| `publicProfiles/{uid}.name`, `profilePhotos`, `activityPreferences`, and public profile fields | `users/{uid}` | `syncPublicProfile` | Firestore trigger plus `tool/data/validate_firestore_data.mjs` profile checks and `tool/data/recompute_public_profiles.mjs` repair. |
| `organizers/{organizerId}.hostName`, `hostAvatarUrl`, `hostProfiles[]` | `hostProfiles/{uid}` professional host profile | `createOrganizer` on create, organizer-team callables on manager changes, then `syncHostProfile` | Legacy club projections are updated during the compatibility window. |
| `reviews/{reviewId}.reviewerName` | Reviewer `users/{reviewerUserId}` | `createEventReview` on create, then `syncPublicProfile` on profile writes | `tool/data/recompute_review_author_profiles.mjs`; validator emits `reviewer-name-drift`. |
| `notifications/{uid}/items/{id}.actorName`, notification `title`/`body` with names | Event-time public profile at notification creation | Notification trigger/callable that created the event | Historical notification copy. Do not back-update unless product decides notifications should become live profile cards. |
| `matches/{matchId}.lastMessagePreview` | Latest message content | `onMessageCreated` | Message-content preview snapshot, not a user profile projection. |
| `eventBookings/{eventId_uid}.genderAtSignup`, `events/{eventId}.genderCounts` | User profile at booking/attendance time | Booking/attendance callables and aggregate repair tools | Signup-time constraint snapshot; do not rewrite after profile edits. |
| `notifications/{uid}/items/{notificationId}` | Match/message triggers, create-event fan-out, host event update/cancellation/broadcast, and booking/cancellation callables now; remaining event producers should use the same backend-owned helper. | Owner can read own items and update only `readAt`; client create/delete/content edits are denied. |
| `blocks/{blockId}` | Safety callables | Direct client writes denied. |
| `reports/{reportId}` | Safety callable | Direct client writes denied. |
| `moderationFlags/{id}` | Moderation triggers | Direct client writes denied. |
| `deletedUsers/{uid}` | Account deletion callable | Direct client writes denied. |
| `rateLimits/{key}` | Rate-limit helper | Direct client writes denied. |
| `commandReceipts/{command}_{id}` | Idempotent callables and triggers (`functions/src/shared/commandReceipts.ts`) | Server only; TTL policy on `expiresAt`, approved by the owner on 18 Nov 2026 after the legal hold was narrowed. |

## Notification Timeline

Durable in-app activity lives under
`notifications/{uid}/items/{notificationId}`. Notification content and routing
metadata are backend-owned; clients can read their own timeline and mark items
read by updating only `readAt`.

| Moment | Current owner | Durable item | Push | Status |
|---|---|---|---|---|
| New match | `onMatchCreated` | Yes, deterministic `match_${matchId}` item for each participant. | Yes when `prefsNewCatches != false` and token exists. | Implemented. |
| New chat message | `onMessageCreated` | No separate Activity item; conversation preview and unread flag are the durable surface. | Preference-gated app-role-specific installations; customer inquiries target Host, Host replies and personal chats target Consumer. | Implemented in source; deployment must be verified separately. |
| Upcoming event reminder | `organizerMomentSweep` provisions an armed system-default event-start Moment and fires due runs every 5 minutes; the reminder is anchored at T-15 minutes. | Yes, a deterministic `eventReminder` Activity item keyed by the Moment run for each signed-up participant. | Yes when the event-reminder preference allows it and a Consumer token exists; the Activity item does not depend on that preference. | Implemented in source through Moments; remote Function and Scheduler state require separate verification. |
| Event signup | `signUpUserForEvent` via `signUpForFreeEvent` and the Stripe webhook | Yes, deterministic `runSignup_${eventId}` item for the booked user. | No; this is normally caused by the user's active booking action. | Implemented. |
| Waitlist promotion | `signUpUserForEvent` when a waitlisted user books, and `cancelEventSignUp` when a cancellation promotes the first eligible waitlisted user. | Yes, deterministic `waitlistPromotion_${eventId}` item for the promoted user. | Yes when promotion happens from another user's cancellation, `prefsRunStatusUpdates != false`, and token exists. | Implemented. |
| Event schedule/location change | `updateEvent` callable best-effort fan-out after the event update commits. | Yes, deterministic `eventUpdated_${eventId}` item for signed-up and waitlisted participants. | Yes when `prefsRunStatusUpdates != false` and token exists. | Implemented. |
| Host event broadcast | `sendEventBroadcast` callable from the event-scoped Host Inbox. | Yes, deterministic `eventUpdated_${broadcastId}` item for the server-resolved Booked or Prospective audience. | At most once when `prefsRunStatusUpdates != false` and a Consumer token exists; retries report unknown rather than duplicating a send. | Live. Every Host release verifies the production callable before archiving. |
| Event cancellation | `cancelEvent` callable best-effort fan-out after the event status update commits. | Yes, deterministic `eventCancelled_${eventId}` item for signed-up and waitlisted participants. | Yes when `prefsRunStatusUpdates != false` and token exists. | Implemented; exposed from Host Manage with confirmation and retained-history copy. |
| New event posted by followed organizer | `createEvent` callable best-effort fan-out after the event commits | Yes, deterministic `organizerUpdate_${eventId}` item for active followers, excluding the host. | Two-tier: activity for followers; push only when the follow preference and user preference allow it. | Implemented. |
| New follower post by followed organizer | `createOrganizerPost` callable plus retryable `dispatchPendingOrganizerFollowerUpdates` scheduler | Yes, deterministic `organizerUpdate_${postId}` item for active followers, excluding the host, deleted accounts, and blocked relationships, with `postId` routing metadata. | Two-tier: durable Activity for followers; preference-gated at-most-once push with accepted, failed, or unknown receipt state. | Live source; deployment required for the new retry scheduler. |

Every push reads `users/{uid}/pushInstallations`; nothing reads the retired
`users/{uid}.fcmToken`. Match/message pushes send to every installation of the
recipient's `appRole` and deduplicate token addresses. Single-recipient
producers (event, waitlist, broadcast, Cross Paths, follower and moment pushes)
send to the newest Consumer installation; staff moment and programme activity
pushes send to the newest Host installation. Account deletion removes every
installation. Explicit `prefsMessages: false` and
`prefsNewCatches: false` still suppress their respective categories. Host-only
recipients may lack a Consumer profile; absent message preferences default on. Stable notification IDs,
recipient UID, app role and optional public/professional avatar metadata travel
in the push data for foreground validation and rendering. A per-trigger receipt
prevents repeated fan-out, but FCM remains best-effort, not guaranteed delivery.

When adding a new durable Activity producer, write the timeline item through
`functions/src/shared/notifications.ts`, keep IDs deterministic where the
source event has a stable ID, add Functions tests for duplicate delivery, add a
rules test if the client read/update contract changes, and extend the
collection's file in `tool/contracts/firestore_contract/collections/`.

Internal demo tooling marks source documents with `demoOps`, `demoOpsId`,
`demoOpsCommand`, `seedPrefix`, and `synthetic`. Trigger-owned notification
projections should copy those fields through
`functions/src/shared/demoMetadata.ts` so cleanup and single-user reset commands
can remove derived demo activity precisely.

### Travel-triggered staff activity

`programTravelLegMoments` immediately creates a stable occurrence from the
CloudEvent source, ID, fact kind, leg and Moment identity. A later Moment edit
does not create another occurrence for the same event. The committed run freezes
its original revision and six-hour send window. `programActivityDelivery.ts`
uses the existing delivery outbox for staff Activity and FCM; at most three
attempts may recover work proven not to have reached provider I/O, subject to
current program, Moment, scoped duty, user, preference and endpoint checks.
Unknown provider outcomes never resend. Local Activity receipts name the local
document and preserve read state; they do not claim FCM acceptance.

The existing five-minute Moment sweep repairs committed receipts before current
send-policy checks. An SDK-settled unknown result is distinct from an interrupted
or still-running invocation. Provisional unknowns and missing receipt projections
keep the run planned for reconciliation, even after expiry; their next wake moves
five minutes ahead without renewing sending authority. A crashed worker or failed
receipt write may therefore need indefinite reconciliation until stronger evidence
exists. Expiry alone never proves that an SDK invocation has finished.

Legacy status-keyed runs have no authoritative event identity. An incoming event
at or before the old run's recorded wake time, or a malformed old wake time, is
conservatively held. Old wake times may have been deferred, so this can withhold
genuine historical events and is not exact replay proof. Later genuine events
remain eligible. No historical replay or migration is implied. Trigger platform
retries preserve the same CloudEvent identity and resume incomplete ingestion;
they do not renew the send window or authorize resending an unknown outcome.
Source publication does not establish deployment or provider acceptance.

## Audience automations

`organizerFormAutomations.ts` owns manager-approved rules for submitted/withdrawn
responses, published-answer conditions, application acceptance and checked-in
attendance. A null form scope is allowed for acceptance and attendance; optional
attendance event scope and a 0–10,080 minute delay are explicit rule settings.
Attendance actions run after the current event end plus delay. Enabling or editing
increments the rule revision and applies to future source events, without replay.
Answer conditions bind to the reviewed published version; republishing requires
review. Rule changes update form consequence projections for both old and new
form scopes.

Host automations, the form automation screen and the rule editor read rules
and runs through listeners: `onHostFormAutomationRuleChanged` writes each rule's
row (`hostFormAutomationRuleViews/{ruleId}`) exactly as
`listOrganizerFormAutomationRuns` returns it, the webhook secret reduced to
`webhookSecretConfigured`, and `onHostFormAutomationRunChanged` writes each run's
row (`hostFormAutomationRunViews/{runId}`) with its rule's current name joined
in; a rename or owner change reconciles that rule's run views in pages of 100.
Each view is rebuilt in a transaction that rereads its sources and writes only
on change, so lease and retry bookkeeping writes nothing. Current managers read
both under rules: every rule of the organizer or of one form in one bounded
listener, runs newest first in live pages of 50. A saved or switched rule shows
from the command's answer until its view reaches that revision.
`listOrganizerFormAutomationRuns` stays deployed for older builds,
retire-later; saving and switching stay on the revision-fenced
`createOrganizerFormAutomation` and `setOrganizerFormAutomationState`.

`onOrganizerFormResponseAutomated`, `onOrganizerApplicationAutomated` and
`onOrganizerAttendanceAutomated` reload source authority before enqueueing.
`retryOrganizerAutomations` processes at most 100 due runs per minute with a
bounded execution window. Run identity binds rule revision, source and event;
a fenced 330-second lease protects action progress. Transient failures retry up
to five times. Successful actions retain their result IDs and do not replay.
Pausing, lost manager authority, revoked source access or invalidated revisions
stop remaining actions. Per-action receipts record failures without webhook
secrets, answers or endpoint payloads.

Campaign actions reuse an unscheduled, reviewed WhatsApp draft and its revision.
At handoff the engine mints a deterministic server-managed companion
`organizerMoments` row per messaging action, a stable `organizerMomentRuns`
occurrence, and a durable `deliveryMessages` intent (`source: automation`) in one
transaction. The shared delivery core owns reservation, claim-time authority
rechecks, provider submission, uncertain outcomes and receipt reconciliation;
Moments owns scheduling, deferral and the organizer-visible journal. The
claim re-reads live rule, recipe revision, source event, merged contact
identity, consent, endpoint, sender/template readiness and shared frequency
accounting before any provider call. The pre-cutover `automationOrigin`
campaign drain path is retired — production held no legacy campaigns, so the
ownership check, mint path, and field were removed rather than kept dormant. A successful automation receipt means the durable intent
was recorded, not that the message was delivered.

Signed webhook delivery requires public HTTPS on port 443, validates and pins DNS,
disallows redirects and limits DNS/request duration and response size. Its minimal
JSON envelope carries version, delivery/rule IDs and source identifiers/timing;
it excludes answers, contact endpoints and financial data. Receivers verify
`X-Catch-Signature: v1=<hex HMAC-SHA256(secret, timestamp + "." + exactBody)>`
using `X-Catch-Timestamp` (Unix seconds), enforce their replay window, and deduplicate
`X-Catch-Delivery-Id` / `Idempotency-Key`. Delivery is at least once across uncertain
network outcomes; receiver idempotency is required. Signing secrets remain in
server-only rule documents and are never returned by callable projections.

| `updateOrganizerEventSetupDefaults` | Callable | Idempotent private defaults save with current-manager and revision checks. |

## Private host Sales operations

`admin/sales/callables.ts` owns bounded account, contact, evidence, suggestion
review, task, opportunity, custom-field, inbound-intent and import operations.
Commercial pilot/quote handlers execute inside the same current-authority and
receipt transaction. Read projections are bounded and organizer scoped.
`admin/salesIntelligence/callables.ts` owns private configurable score policy,
reviewed factors and approved outreach clauses; missing factors remain unknown.
Draft review/copy recheck source material and suppression and grant no send
permission. Production draft execution remains a separate runtime acceptance
step.

`admin/salesIntelligence/providerRuntime.ts` is a disabled internal writing
preparation worker, with no callable or trigger export. It reuses current
employee/assigned-staff or own participant drafting eligibility, requires
separate trusted public-disclosure and exact stage/billing authorization ports,
and invokes the packaged native adapters through the existing preparation
helper. Firestore intent and run/month reservations precede provider I/O;
uncertain intent never authorizes another submission. Validated clause
selections and cache receipts commit with bounded accounting under the current
source and lease fence. They are separate preparation records, not rendered
drafts consumed by existing review/copy callables. General research orchestration,
live authorization sources, pricing, credentials and activation remain separate.

`salesAssistant` provides scoped third-party access through a registered service
identity and short-lived employee delegation. Every operation revalidates the
client, employee, delegation and budget; there is no direct database credential
handoff. Evidence suggestions enter an employee review queue. Connecting a
particular assistant vendor is separate from deploying this endpoint.

`salesDemo/callables.ts` owns preview, explicit verified-contact start, synthetic
steps, owner blueprint/invitation management and bounded expiration cleanup.
Activation requires the private runtime capability record and a valid
`SALES_DEMO_GRANT_KEY` secret. These source exports do not establish deployment
or live feature activation.

The private Sales workspace additionally exposes evidence-based fit review,
owner policy editing, current clause approval, deterministic draft jobs and exact
manual copy. Draft preparation uses the existing Operations workflow with no
model provider or sending capability by default. Stale source facts invalidate
review/copy. Host settlement attestation and Intake-to-Sales joining are separate
employee operations with strict request/response contracts; their records have
no direct browser access. These source APIs do not establish deployed activation.

### Demo-to-Forms setup

`getSalesDemoSetup` and `prepareSalesDemoFormDraft` in `salesDemo/callables.ts`
project a reviewed setup plan and explicitly prepare its draft. The completed
session grant authenticates the invited contact; canonical organizer claim and
Forms manager checks separately authorize product mutation. Preparation uses the
existing Forms transaction helper and an immutable `salesDemoSetups` receipt.
It returns the existing Host Forms editor route and grants no publication,
response, payment or messaging authority.

`adminListSalesFitQueue`, `adminRefreshSalesFitQueue` and
`adminRefreshSalesFitQueueBatch` own the employee-only bounded current ranking
projection. `adminPreviewSalesImportCompensation` and
`adminApplySalesImportCompensation` own read-only owner review and exact-hash
application of one proven import correction. Each action is registered in the
Admin action catalog; no assistant delegation exposes these controls.


### Private Sales history, report and privacy operations

| Operations | Authority and behavior |
|---|---|
| `adminPreviewSalesImportHistory`, `adminApplySalesImportHistory` | Current Owner, source-cell/import-lineage proof, exact preview hash and immutable row/cell identity; current privacy/archive/hold checks also apply to retries. No current score, contact or send effect. |
| `adminListSalesImportHistory`, `adminListSalesImportHistoryRows` | Current employee, one host and bounded pages; original source history is separate from current activity. |
| `adminGetSalesFunnelReport` | Current employee only; one bounded read-only company snapshot, separate hosts/opportunities and dated stage movements, no partial totals or revenue inference. |
| `adminReviewSalesPrivacyPolicy`, `adminRestrictSalesOrganizer` | Current Owner only; source-bound retention decision or permanent Sales processing fence. Policy documents stay private. |
| `adminPreviewSalesPrivacyPlan`, `adminReviewSalesPrivacyPlan` | Current Owner, bounded complete inventory, explicit retained/unresolved records, exact source/policy hashes and active-plan replacement binding. |
| `adminApplySalesPrivacyBatch`, `adminGetSalesPrivacyCase` | Current Owner including receipt replay/post-read checks; atomic reviewed batches of at most 20 records, dependency-first order, saved cursor and receipts. Product ownership is untouched; `completeDeletion` remains false. |

The new operations use strict request/response contracts and appear in the
Admin action catalog as control-plane operations; they are not delegated
third-party assistant actions. App Check and bounded rate limits apply to
callables. The Admin host Activity pane shows source history, Pipeline shows
company totals, and Owner privacy controls are reachable both from a host and
through a canonical-name lookup in Settings after a Sales companion is removed.

### Organizer advertising settings (local implementation)

`getOrganizerTrackingSettings` and `setOrganizerTrackingSettings` use canonical
organizer manager authority, strict generated contracts and bounded rates. The
`organizerTrackingSettings` document stores validated Meta Pixel and GA4 IDs,
revision and the last manager to save. Writes require a first-party organizer
or verified claim and the current revision. Client writes are denied. No OAuth
grant, credentials, arbitrary JavaScript or GTM is accepted.

**Read path (Nov 2026, #1339).** The ids are configuration, not credentials,
and the rest of the document is the revision fence and a manager's uid, so the
organizer's current managers get the document directly under rules
(`isHostSummaryManager`); a document never saved reads as missing and shows the
defaults. Current Host builds listen to it and derive `canEdit` from the
organizer they already listen to, with the same test as the server's
`trackingConfigurationEligible` (not archived, not suppressed, an owner, and
first-party or a verified claim); the save still goes through
`setOrganizerTrackingSettings`, which rechecks eligibility and the revision.
`getOrganizerTrackingSettings` stays deployed for the website and older Host
builds, retire-later for the app.

The public tag projection is built into the page read models (`tracking` on
`organizerPublicPage` and `eventPublicPage`, #2063): null for an organizer that may
not configure tags (`trackingConfigurationEligible`), otherwise disabled with null
IDs, the event's policy reason, and, on the organiser page only, whether its
published events classify the profile eligible for Catch's own tags
(`classifyOrganizerProfile`). The page rebuild triggers already run on every input
(organizer, event, imported event); the retired `readPublicOrganizerTrackingSettings`
callable answered the same per page view. Publication is decided by the versioned, code-owned record in
`functions/src/analytics/organizerTrackingPublicationPolicy.ts`. Version 1 cites
the owner's 18 Nov 2026 decision on #2063 (the technical checklist belongs to the
command layer, the owner signs off policy) and keeps `publicationAllowed: false`;
every `enabled` field and the public projection read it, and IDs are never
returned publicly. Its exclusion lists keep canonical social, singles/mixer and
unknown event classifications out. Only a reviewed new version citing the
owner's policy sign-off, together with the public response contract, can widen
it. The same public read answers `profileTagsEligible` for an organiser page read
(`eventId` null): whether Catch's own tags may run on that profile (owner
decision, 19 Nov 2026, #2063). `organizerProfileClassification.ts` reads the
organiser's native and external events by owner (at most 200 each; more fails
closed) and classifies the profile: eligible only when every published,
active native event is canonically classified and none is in the policy
version's excluded classes, and every captured upcoming external listing
passes the policy's `externalListingAllowance` (a supply-intake activity label
on its allow list, which includes scraped runs and dinners, and no blocked
dating word; owner decisions relayed 19 Nov 2026). Native runs and dinners,
seated dinners included, are no longer excluded; singles and crawl classes and
the excluded interaction models (paired rotations, free-form mixers, route
stops) still are. An organiser with neither a native event nor an upcoming listing stays
unknown, and `externalListingsCountAsUnknown` can still exclude every
organiser with a public listing. The answer
is a boolean, never the class, because public pages do not reveal dating
classification. Event reads always answer false. Saving an ID
does not constitute connecting a provider or permission to transmit advertising
activity. These exports do not establish deployment or production enablement.

### Organizer owner view (#1109)

`getOrganizerOwnerView` (read) and `manageOrganizerOwnerPage` (setLinks,
setPhotoOrder, sendFollowerMessage) serve the website owner view. Both require
auth, App Check, generated payload validation and a per-user rate limit, and
derive the role from the organiser document (owner, editor for managers and
hosts; analyst reserved). setLinks reuses the owner-link policy of
`adminUpdateOrganizerDetails`; setPhotoOrder only permutes stored photos;
sendFollowerMessage reserves one of two monthly sends in a transaction, then
calls `createOrganizerPost` (whose weekly quota still applies) and releases the
slot if that fails. `rollupOrganizerInsightsDaily` runs at 03:30 IST and writes
yesterday's UTC `organizerInsights`; `functions/scripts/backfill-organizer-insights.cjs`
fills up to 30 days (dry run unless `--apply`).


## Catch-owned controlled support reply (CAT16)

`adminReviewCatchWhatsappInbound` reads one exact immutable inbound text receipt
for the configured Catch sender and verified recipient. `adminSendCatchWhatsappReply`
with `purpose=serviceSupport` (the trial; `purpose=supportConversation` is the
Support reply described in the Support rows above) requires the reviewed text
hash, explicit confirmation
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

The scoped Auth mutation inventory and remaining external-administration gap are
recorded in [Readiness authority mutation boundary](data_contracts.md#readiness-authority-mutation-boundary).
Role projections, token observations and application deletion tombstones do not
make Auth observations atomic with Firestore commits.

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
owner/authority or actor assignment state, and journals Auth intent before the
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
Actor admission, no-existing-owner/authority/assignment checks and permanent
receipts are unchanged.

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

### Program Lodging Planner

`manageProgramLodging` provides authenticated private setup/review/preview,
independently validated manual proposals and alternatives, immutable proposal
save, and host approval/hotel confirmation/guest publication commands. Actor
identity comes from `requireAuth`; current canonical authority and source are
read in the same transaction as writes. Setup requires coordinator authority
and exact revisions. Lifecycle receipts bind actor, operation ID and command.
Hotel-desk reads return only the hotel-scoped operational projection; setup,
affinity memberships and functional requirements remain coordinator-private.
Canonical stay publication does not activate a provider or make a booking.

## Guest payments ledger

`guestPayments/{paymentId}` holds every guest checkout: website registration
(`purpose: publicEvent`, ids `pp_`), paid form submissions (`purpose: form`,
ids `fp_`) and event offers (`purpose: offer`, ids `ep_`). Each flow keeps its
own contract and parser over a shared money core (amount, currency, provider
order, payment and refund ids, routing, status, timestamps) and filters its
own queries by `purpose`; billing, growth replay and payment issues read the
one ledger. In-app Catch booking payments are purpose `booking` in the same ledger (16 Nov 2026). The growth
trigger `onOrganizerGrowthGuestPaymentWritten` replaced the per-collection
`onOrganizerGrowthPublicPaymentWritten` and `onOrganizerGrowthOfferPaymentWritten`
(12 Nov 2026).

