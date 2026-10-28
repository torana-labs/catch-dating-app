---
doc_id: backend_operation_catalog
version: 1.109.0
updated: 2026-10-28
owner: recursive_audit_loop
status: active
---

# Backend Operation Catalog

## Read Policy

Read this before changing Cloud Functions, Firestore rules, repository writes,
callable interfaces, trigger-owned projections, payments, safety workflows, or
notification fan-out. Treat `tool/contracts/firestore_contract.json` as the
machine-readable ownership contract and this document as the human map.

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

## Rehearsal completion summary

`getEventRehearsalSummary` is an App-Check-protected, rate-limited, organizer-manager
read of a completion boolean. The completion transaction alone stamps
`eventRehearsalMilestones/{organizerId}` alongside the completed session and action
receipt. Reset, fork, expiry, client preferences and navigation cannot erase or
create this milestone. Clients cannot directly read or write the collection.
Legacy completed sessions provide a bounded read-only fallback while retained.

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
| `operationDecisions/{decisionId}` | Revision-bound proposed or accepted decision | Trusted worker or reviewed admin path |
| `operationLeases/{leaseId}` | Fenced worker ownership and heartbeat | Trusted operations worker |
| `operationPublicationPlans/{publicationPlanId}` | Hash-bound preflight plan; not publication authority by itself | Trusted publisher boundary |
| `operationRuleProposals/{ruleProposalId}` | Evidence-derived extractor/rule proposal | Trusted learning worker |
| `operationRuleEvaluations/{ruleEvaluationId}` | Replay, holdout, shadow, and canary metrics | Trusted evaluation worker |
| `adminActionExecutions/{executionId}` | Hash-only start/terminal receipt for one agent CLI admin action | Role-gated admin execution callables |
| `eventMessagingBudgetDecisions/{decisionId}` | Revisioned finance decision bound to exact messaging setup evidence; never a spend grant | `adminDecideEventMessagingBudget` callable |
| `eventMessagingBudgetDecisionReceipts/{receiptId}` | Immutable request-hash replay evidence for a messaging budget decision | `adminDecideEventMessagingBudget` callable |
| `eventMessagingBudgetApplicationReceipts/{receiptId}` | Immutable proof that one current approval staged both channel spending ceilings in paused state | `adminApplyEventMessagingBudget` callable |

`contracts/admin/admin_action_catalog.json` binds every callable-backed admin
GUI action to the same stable CLI action id, role set, request schema, GUI
route, risk, confirmation policy, and contract-loop example. The catalog does
not bypass a callable: live CLI execution still uses Firebase Auth, App Check,
the callable's own role/rate/validation/transaction boundary, and a remotely
visible execution receipt. Mutation commands remain dry-run until both action
and target confirmations match the validated payload. Timeouts or malformed
transport responses terminate as `indeterminate` so an agent must reconcile the
target before deciding whether a retry is safe.

`adminListIntakeOperations` reads runs and work items for workflow
`supply-intake`. It grants no run-request, network, model, rule-deployment, or
public-write capability. The four persisted primary stages are exactly
`incoming`, `verify`, `resolve`, and `ready`; publication and terminal outcomes
remain lifecycle state rather than additional tabs.

Organizer Intake reads the latest immutable organizer-only run for each launch
market through that callable. Search candidates remain review work items in
`operationWorkItems`. A reviewed, net-new candidate may cross the separate
`adminCreateOrganizerDraftFromCandidate` boundary, which creates only an
unclaimed, hidden, source-backed `organizers/{opaqueAutoId}` draft plus a
compatibility `clubs/{opaqueAutoId}` document. The operator reviews a separate
public slug; the callable reserves that route transactionally and stores the
slug plus target-field provenance in the curation receipt. Unsupported public
copy and locality remain blank. It cannot publish, index, crawl, expose the
organizer in-app, or assign ownership. Exact retries reuse the deterministic
receipt. Organizer Intake
joins those receipts through `adminListIntakeOperations`, so completed
handoffs remain in Ready after refresh. `contracts/admin/admin_live_data_sources.json`
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
promotion command creates only a blocked review receipt; it does not create an
`operationPublicationPlans` record or execute a public write.

## Current Audit Findings

| Priority | Finding | Status |
|---|---|---|
| P0 | `tool/contracts/firestore_contract.json` was stale for `users/{uid}.firstName`, `lastName`, and `displayName`; the generated Functions type and Firestore rules already had the fields. | Fixed in this pass. |
| P0 | Account deletion anonymized `name` but did not clear retained `firstName`, `lastName`, or `displayName` on `users/{uid}`. | Fixed in this pass. |
| P1 | `RATE_LIMITS` declared several callable limits that were not applied at the handlers: `verifyRazorpayPayment`, `cancelEventSignUp`, `joinEventWaitlist`, `blockUser`, `unblockUser`, and `requestAccountDeletion`. `updateUserProfile` also had no configured limit. | Fixed. All listed handlers now call `checkRateLimit`; `updateUserProfile` is 60/minute to allow brisk field-by-field editing without leaving profile writes unbounded. |
| P2 | The machine-readable contract records operations by collection, but not the Dart initiator method for every operation. | This doc fills the human map; a later tooling pass can validate Dart initiators automatically. |
| P2 | Notification fan-out has a durable backend-owned Activity timeline for matches and event updates; messages instead update the conversation preview/unread flag. | Implemented; use the Notification Timeline table for category-specific ownership. |
| P1 | Edge documents were the source of truth, but event-club parent projections relied only on callable updates or batch repair tools. | Fixed. `syncClubMemberStats` recomputes `memberCount` from active membership edges, and `syncClubNextEvent` recomputes `nextEventAt` / `nextEventLabel` from active future event documents. Event callables also refresh the next-event projection before returning. |
| P0 | Historical events split attendee-facing venue text and coordinates across nullable legacy fields, so enforcing a required structured location in every Dart read would make unrepaired records unreadable. | Strict on new and edited writes, discovery, and self-check-in; compatibility-deferred for Dart deserialization only. Dev is 146/146 structured. The refreshed 2026-07-16 production dry run found 272 events: 125 valid, 138 deterministically repairable, and 9 unresolved coordinate blockers with no warnings; no production writes were applied. Keep `Event.meetingLocation` nullable until the production repair and follow-up validation complete, as tracked in `contracts/migrations/event_meeting_location.json`. |

`getEventViewerState` exposes the private account-scoped
`readEventViewerStateSource`. It shares policy, schedule, membership, inventory and
owned paid-admission readers in one read transaction. It keeps retained
admission and attendance separate from present eligibility, never applies seat
or identity plans, and returns unavailable for incomplete bounded sources.
The website selects the guest adapter with `surface: guest`, observing owned
roster/application/payment status without requiring a consumer profile. It never
reserves inventory or grants approval; existing mutation owners revalidate each
action. Native consumers retain their current adapter.

## Cloud Functions Inventory

Organizer authority is canonical. Club-named functions and paths in this
inventory are released-client compatibility projections only; new initiators
use the organizer-named operations below. The migration and retirement boundary
is `docs/migrations/clubs_to_organizers.md`.

| Function | Type | Initiator | Writes | Notes |
|---|---|---|---|---|
| `listEventChats` | Callable | Consumer event conversations | Bounded candidate directory over owned memberships, participations and linked attendees | UID-bound continuation; current admission per event; deleted-account fences; access metadata only. |
| `getEventChatAccess` / `updateEventChatAccess` | Callable | Event chat access | Room availability, explicit participant memberships and replay receipts | Current canonical organizer/admission checks; claimed identity and phone verification for join; revision fences; no automatic admission, messages or card disclosure. |
| `sendEventChatMessage` / `listEventChatMessages` | Callable | Event conversations | Ordered, idempotent messages with same-room reply pointers and bounded private projections | Rechecks current joined admission, claim, blocks and deletion; no copied quotes or private profile data; moderation before writes. |
| `getEventChatProfileSharing` / `updateEventChatProfileSharing` | Callable | Participant event profile choices | Event-specific selected field/photo/card pointers and replay receipts | Verified identity for sharing; reviewed membership/profile/card revisions; own revocation survives lost admission and removed events. No copied answers or implicit sharing on join. |
| `getEventChatProfile` | Callable | Event participant mini-profile | None | Current admission, joined membership, claim and both block directions for viewer and subject; explicit selected core and same-organizer applicant answers only; bounded photo preview with permission recheck after processing. |
| `setEventChatReaction` / `setEventChatTyping` | Callable | Event conversations | Per-person reaction changes and expiring typing hints | Revision fences, payload-bound reaction retries, anonymous aggregates; typing contains no draft text and can be withdrawn after access revocation. |
| `listParticipantMessagingPreferences` / `withdrawParticipantMessagingPermission` | Callable | Participant WhatsApp permissions | Own Catch/organizer preferences and immutable permission receipts | UID-scoped bounded reads show independently recorded organizer operations, organizer marketing and Catch marketing. A withdrawal can stop one purpose or the whole sender; optimistic receipt fences and idempotent retries return the current canonical projection, including a newer opt-in after an old STOP. No opt-in, dispatch, booking, or profile mutation. |
| `promoteFormCommunicationIntent` | Callable | Submitted public form completion after phone verification | Private pending form intent, owned response and withdrawal bearer, canonical purpose receipts/preferences | App Check, UID rate limit and exact verified phone endpoint; rechecks organizer/form/version/response ownership, reviewed copy hash and decision order. Promotes only selected source-bound purposes, cannot revive a later STOP or withdrawn response, and replays without widening consent. New form-originated WhatsApp delivery remains provider-disabled. |
| `manageEventApprovalNotifications` | Callable | Signed-in guest event page | Private event approval preferences and immutable receipts | Expected UID and revision fences; verified owned endpoints; optional phone and email choices start off. Does not grant booking or marketing permission. |
| `onEventApplicationApprovalNotification` / `onEventApprovalNotificationPreference` | Firestore triggers | Approval transition or guest preference change | Deterministic approval outbox and Operations work | One phone lane and one independent email lane per approval revision; current source, permission, organizer and identity rechecked before submission. |
| `onEventApprovalNotificationMessage` / `retryEventApprovalNotifications` | Firestore trigger / five-minute scheduler | Durable approval work | Shared Operations leases, checkpoints, private dispatch proofs and account budgets | WhatsApp first, SMS only after confirmed technical failure; replaceable email transport. Unknown outcomes never authorize fallback. Provider settings default off. |
| `onEventApprovalWhatsappReceipt` | Firestore trigger | Verified provider webhook queue | Approval outbox receipt and durable work wakeup | Requires signed ingress evidence and immutable attempt/endpoint/payload correlation. Email and SMS acceptance records submission only, not delivery. |
| `getEventViewerState` | Callable | Authenticated Consumer event detail | No domain writes; canonical private viewer read source | Auth/App Check/rate limits; current grant/review/policy/inventory checks, independent retained admission/attendance, strict response and bounded incomplete-source rejection. |
| `listParticipantActivity` / `getParticipantActivity` | Callable | Own account form activity | No domain writes; bounded UID query and exact immutable response/version proof | Auth-derived account only, including email/account-only submissions. No profile claim, answers, private Host notes or admission inference. Subject/source-bound cursors advance over omitted rows. |
| `listParticipantFormProfiles` / `getParticipantFormProfile` / `getParticipantFormPhoto` / `claimParticipantFormProfile` | Callable | Participant form profile review | Private proposals, users, intake, selected card pointers and claim receipts | Verified phone and exact response ownership; explicit review, revision checks, payload-bound replay and deletion/withdrawal checks. No event admission or public grant. |
| `updateUserProfile` | Callable | `UserProfileRepository.updateUserProfile` | `users/{uid}` | Validates profile patches with generated Ajv contract validators; owns complex profile edits after initial create and increments the server profile revision; rate-limited at 60/minute. Verified phone is excluded from the patch contract and initial profile creation must match the Firebase Auth phone claim. |
| `listOrganizerAttentionItems` | Callable | Host Today | Reads bounded canonical event, practical guest-help case, event-assistance delivery work, participation, application, provider-sync, form-automation, organizer, and payout-account facts; reconciles `organizerAttentionItems` | App-Check-protected, rate-limited, manager-only read-through projection. It aggregates open event-lead help cases and validated delivery work in the explicit host-review phase per active event while keeping safety cases and private message details outside Host Today, resolves stale rows before returning at most 400 open items ordered by urgency and deadline, fails closed on every over-cap current source, reads only the latest terminal automation run per enabled rule and current revision (including resolving successes), merges legacy `clubId` and canonical `organizerId` ownership, and returns explicit coverage for client-local, shortcut-only, and missing-truth kinds. |
| `createEventRehearsal` / `getEventRehearsalBootstrap` / `updateEventRehearsalSetup` | Callable | Flutter `EventRehearsalRepository` | `eventRehearsals`, synthetic `eventRehearsalActors`; creation may read one authorized `events` source | App-Check-protected organizer-manager boundary. Creation enforces five active sessions and 50 actors, snapshots only safe source fields or a sample, and initializes a 24-hour deterministic room. Setup is revision-fenced and freezes after start. No production collection is written. |
| `controlEventRehearsal` / `controlEventRehearsalSpatial` / `injectEventRehearsalBehavior` / `completeEventRehearsal` | Callable | Flutter Host rehearsal console | Rehearsal session, synthetic actors, idempotent `eventRehearsalActions`, private `eventRehearsalMessages` and `eventRehearsalCases` | Revision-fenced virtual-clock and Room-placement reducers with a shared 500-action cap and stable client-action deduplication. They cover lifecycle/step/time controls, table move/confirm/release, and late/no-show/leave/return/walk-in/claim/opt-out/keep-apart/disconnect behavior. Typed assistance publish/dispatch/receipt and configure/pause/resume automation commands use canonical policy. Source-fenced `requestRequiredData` controls request only missing canonical fields from a synthetic actor, within the virtual event window; profiles retain completion identifiers and revisions without profile values. Typed `recordOutcome` controls write only revisioned practice completion, score or rank records for current synthetic units; ordered rounds, rank uniqueness and post-completion corrections are enforced, and no live outcome or standings collection is touched. Typed `controlReveal` decisions start, cancel or publish a virtual countdown; elapsed virtual time settles one pending round and moves synthetic guests to the reveal moment without changing a live plan or match. Typed allocation proposals preserve the current placement until a manager publishes a reviewed proposal; publication rechecks eligibility, synthetic capacity and keep-apart rules, advances a separate allocation revision, stales competing proposals and changes only practice actors. Typed roster reconciliation reviews one setup-bound synthetic source, retains every imported, duplicate, ambiguous and failed row, and never mutates a live roster. Explicit, bounded outcome scripts reevaluate on clock/lifecycle, behavior, placement, guest and receipt changes; cursors and messages commit with the parent action. Current organizer authority is rechecked in Host transactions. Practical `resolveAssistance` commands share live handling decisions, with source/revision fences, current-manager handoff and independent attendance. Practical requests remain actionable after completion within the session action cap. Reviewed `repairDelivery/manualHandoff` uses the common delivery evidence and action policy, with message-revision/hash fencing and the parent action receipt. Manual ownership stops future simulated attempts, preserves guest replies and late receipts, and permits an explicit takeover after the former manager loses authority. Host bootstrap exposes current-actor-message delivery reviews; synthetic recipes remain separate from live Operations coordination. Typed `resolveAccountability` reuses the live resolution reducer, binds outcomes to a distinct synthetic visit and reviewed source hash, and supports explicit reopening after completion within the action cap. Host-only bounded accountability reviews preserve unknown legacy evidence; physical transitions use virtual time, and rejoining cannot revive old proof. No provider is called. Changed assistance retries are rejected; assistance requires the reviewed setup generation before replay or mutation, so reset cannot reuse an old command. Advanced transport/data faults require internal/admin authorization. |
| `getEventRehearsalBootstrap` / `controlEventRehearsal` (`action: staff`) | Callable | Host rehearsal staff configuration and explicit practice-role reads; native integration pending | Private session `staff`, parent runtime revision and counted action receipt | Assign/remove up to 50 synthetic staff with at most 20 group duties each. Real organizer-manager authority is always required. Live and practice share role permissions and assignment windows; virtual time owns expiry. Explicit practice identities constrain departure, checkpoint, membership and accountability commands, retain named handover acceptance and current accepted-group scope, and cannot create real accounts or event staff grants. Changed setup and reset clear the roster; retries return current state without restoring removed duties. |
| `getEventRehearsalMovement` / `controlEventRehearsal` (`action: movement`) | Callable | Host movement review and native typed group controller; screen mounting pending | Private `eventRehearsalMovements` and `eventRehearsalRouteDecisions`, parent session revision and counted action receipt | Current managers rehearse explicit departures, source-fenced route recovery, checkpoint observations, reporter reassignment and close/reopen decisions using shared live decision rules. A route choice is an immutable overlay on the latest departure: it advances synthetic progress and joining guidance without manufacturing another departure or changing its roster/checkpoint evidence. Management has independent revisions and preserves original arrival evidence and deadlines; closeout requires current dispositions for every unconfirmed original member. Reads require the reviewed setup generation, cover at most 50 actors and page at 25 departures; older reports retain their original roster, and the response explicitly separates the selected departure from latest progress. Corrections require an explanation when removing prior observations. Reports remain available after completion. A departure or route recovery reevaluates enabled rehearsal joining automation and commits its actor/message changes atomically. Current saved progress fences publication, dispatch, guest projection and replies; client departure flags are not authority. No physical status, live record or provider is changed. |
| `resetEventRehearsal` / `rotateEventRehearsalGuestLink` / `exportEventRehearsalReproduction` | Callable | Flutter Host rehearsal recap and guest-link controls | Rehearsal-only reset/fork/link generation and practice message cleanup; bounded read-only reproduction export | Reset reproduces the current seed, fork creates a new room without changing the source, link rotation invalidates prior browser slots, and export returns only bounded rehearsal setup, actor, revision, and action evidence. |
| `getEventRehearsalGuestBootstrap` / `submitEventRehearsalGuestAction` | Public callable | React `/rehearse/:publicRehearsalId` | One `eventRehearsalGuestViews` browser lease and its synthetic actor/action | No Auth or OTP. A high-entropy public id plus stable browser instance redeems one deterministic actor; hashed slot tokens authorize only bounded arrival, opt-out, help, prompt-completion, typed assistance responses and synthetic required-data completion in the rehearsal domain. Required-data submissions are source/revision fenced, may complete a current prompt in parts and retain field identifiers only. Assistance replies commit their synthetic intention/help effect atomically with the message response and never check in a guest. Practical-help replies and direct help actions create clock-scoped rehearsal cases; retries cannot reopen settled requests. |
| `expireEventRehearsals` | Hourly scheduled function | Backend | Deletes expired rehearsal sessions and bounded actor/action/guest-view/message/case/movement/route-decision children | Enforces the 24-hour retention boundary; cleanup drains bounded write batches. |
| `onEventParticipationRosterProjected` | Firestore trigger on `eventParticipations/{participationId}` writes | Backend | `eventAttendees/{attendeeId}` | Uses Firebase Auth phone only as an event-scoped convergence key for a row the organizer already supplied. A Catch booking projects public display identity and operational status but never copies private-profile phone or email into Host data. |
| `syncPublicProfile` | Firestore trigger on `users/{uid}` writes | Backend | `publicProfiles/{uid}` set/delete, authored `reviews/{reviewId}.reviewerName` updates | Sole owner of dating/user-identity projections. Uses `displayName`, then first name, then legacy fallback; projects grouped `profilePhotos` and nested `activityPreferences.running`. It must not update organizer-manager identity. Existing stale public profiles can be repaired with `node tool/data/recompute_public_profiles.mjs --env dev --apply`; existing stale review author names can be repaired with `node tool/data/recompute_review_author_profiles.mjs --env dev --apply` after `npm --prefix functions run build`. |
| `syncHostProfile` | Firestore trigger on `hostProfiles/{uid}` writes | Backend | hosted `organizers/{organizerId}.hostName`, `hostAvatarUrl`, `hostProfiles[]` plus legacy club shadow | Sole owner of professional host display projections. Uses `hostProfiles/{uid}` only, never the dating public/private profile. |
| `generateProfilePhotoThumbnail` | Storage trigger on `users/{uid}/photos/{fileName}` finalize | Backend | Storage `users/{uid}/photoThumbnails/{fileName}`, `users/{uid}.profilePhotos` | Generates 160px JPEG thumbnails for avatar-scale surfaces. Dashboard/event-detail hype avatars must use thumbnail URLs, not full profile photos. Existing beta data can be backfilled with `npm --prefix functions run backfill:profile-thumbnails -- --apply` after setting `FIREBASE_STORAGE_BUCKET`; the script updates grouped `profilePhotos`. |
| `generateOrganizerMediaThumbnails` / `generateEventMediaThumbnails` | Firestore triggers after canonical media attachment | Backend | V2 sibling `thumbnail.jpg` Storage objects plus organizer/event `UploadedPhoto` thumbnail fields | Generates bounded-concurrency responsive JPEG thumbnails only after staged originals are attached, rechecks the current document before writing metadata, mirrors organizer thumbnails to the released `clubs` projection, and deletes a generated thumbnail when its source is no longer referenced. |
| `createOrganizer` | Callable | Flutter organizer repository | `organizers/{organizerId}`, owner `organizerTeamMemberships/{organizerId_uid}`, optional host profile seed, legacy shadows | Creates any supported organizer subtype, records type audit fields, starts a draft organizer public route, and accepts an ordered Host gallery without a product item cap; the separate optional logo remains outside the gallery. |
| `updateOrganizer` / `archiveOrganizer` / `deleteOrganizer` | Callable | Flutter Hosts organizer workspace | `organizers/{organizerId}` plus legacy shadow | Organizer-manager descriptive/media updates; owner-only type changes; safe archive/delete lifecycle. Gallery order owns the cover projection; logo replacement/removal is independent. Removed originals and thumbnails are deleted only after the Firestore transaction commits. |
| `manageWebsiteAccount` | Callable | Website onboarding and event/follow continuation | Private `users/{uid}` identity; reads own follow and public event age policy | Live Auth phone, disabled/deleted-account guards, UID and profile-revision fences. Name and phone only; optional real DOB; no social visibility or marketing opt-in. |
| `followOrganizer` / `unfollowOrganizer` / `setOrganizerNotificationPreference` | Callable | Website and Flutter consumer organizer surfaces | `organizerFollows/{organizerId_uid}` and `organizers/{organizerId}.followerCount` plus legacy shadows | Canonical consumer relationship; never stored in entity/user arrays. |
| `addOrganizerManager` / `removeOrganizerManager` / `transferOrganizerOwnership` | Callable | Flutter Hosts team workspace | `organizerTeamMemberships`, organizer ownership/host projections, legacy shadows | Owner-controlled team membership and audited ownership transfer. |
| `createOrganizerPost` | Callable | Flutter organizer posts repository | `organizers/{organizerId}/posts/{postId}`, `organizerPostDeliveryOperations/{postId}`, organizer Activity, preference-gated FCM, legacy shadows | Manager-authored, moderated, bounded follower update. A required client-generated request id deterministically owns the post and atomically creates a retry operation, so a lost callable response cannot duplicate the post or consume quota twice. Immediate delivery processes one bounded follower page; deterministic de-identified recipient receipts make cursor replay safe. |
| `dispatchPendingOrganizerFollowerUpdates` | Scheduled every 5 minutes | Backend | `organizerPostDeliveryOperations`, `organizerPostDeliveryRecipients`, organizer Activity, preference-gated FCM | Resumes pending or expired-lease follower-update delivery. Activity creation is deterministic and durable; push remains best-effort and is never repeated when a prior attempt's outcome is unknowable. Deleted accounts, the author, and blocked relationships are excluded. |
| `createOrganizerForm` / `duplicateOrganizerForm` | Callable | Host Forms library and template gallery | `organizerForms/{formId}`, `organizerFormDrafts/{formId}` | App-Check-protected, rate-limited manager boundary. A request-scoped deterministic form id makes retries idempotent. Template creation copies versioned source data into organizer-owned state; duplication remaps every section, question, option, rule, and public identity. |
| `updateOrganizerFormDraft` / `validateOrganizerFormDraft` / `getOrganizerFormEditor` | Callable | Host Forms builder and preview | Mutable `organizerFormDrafts/{formId}` and safe manager projections | Draft replacement is revision-guarded and archived forms fail closed. Save may preserve an invalid work-in-progress; the shared semantic validator reports publish blockers, including duplicate identities, type-invalid rules, backward routing, purpose requirements, and inconsistent validation ranges. |
| `listOrganizerForms` / `listOrganizerFormTemplates` | Callable | Host Forms library and create flow | Indexed bounded `organizerForms` read and generated template catalog | Manager-only, rate-limited projections. Form listing orders by update time plus document id, applies an opaque cursor, scans at most 400 documents per request, and excludes archived forms by default. Raw draft/version documents remain unreadable. |
| `publishOrganizerForm` | Callable | Host Forms builder | Immutable `organizerFormVersions/{formId_vN}` plus active metadata pointer | Runs the shared semantic validator in the transaction, enforces the expected draft revision, and never mutates a published version. `sourceDraftRevision` turns an exact publish retry into a replay instead of another version. |
| `setOrganizerFormLifecycle` / `deleteOrganizerFormDraft` | Callable | Host Forms library and builder actions | `organizerForms/{formId}` lifecycle or eligible draft/metadata deletes | Expected-state transitions permit published-to-paused, paused-to-published, and archival. Only a never-published draft with no active version can be permanently deleted. |
| `getPublicOrganizerForm` / `beginOrganizerFormResponse` | Callable | Public website `/f/:publicFormId/` respondent runtime | Reads one active immutable version; creates or resumes one TTL-bound `organizerFormResponseDrafts/{draftId}` | Returns only a safe active-version projection. Identity policy is enforced server-side; a routing token or source token grants no Firestore authority. A stable request id makes respondent bootstrap idempotent. Explicit own `reuseResponseId` offers compatible same-form organizer answers for review using immutable source proof; neither prior answers nor new consent are auto-applied. |
| `saveOrganizerFormResponseDraft` / `submitOrganizerFormResponse` / `withdrawOrganizerFormResponse` | Callable | Public website form autosave, completion, and receipt controls | Revision-guarded response draft; immutable `organizerFormResponses/{responseId}`; form counters; withdrawal timestamp; optional private `formCommunicationConsentIntents/{responseId}` | Every answer is rebuilt and validated against the exact published version. Unchecked v2 WhatsApp choices grant nothing; selected unverified choices create only an endpoint/source-bound pending intent. Verified legacy grants retain their established scope. Exact retries replay, paid finalization keeps choices frozen, and response withdrawal preserves the audit record while fencing later consent promotion. |
| `listOrganizerFormPayments` | Callable | Host form payment records | Form fee ledger | Manager-only, App Check and rate limited. Form ownership, status-bound pagination and a minimal financial projection. |
| `manageOrganizerFormPaymentConnection` | Callable | Host form payment settings | Merchant bindings and hashed OAuth state | Manager-only, App Check and rate limited. Begins one-use OAuth, lists safe status, refreshes an organizer-bound credential, or disables new checkout. |
| `organizerFormPaymentOauthCallback` | HTTP | Razorpay OAuth redirect | Connection and credential vault | Rechecks initiating manager, consumes expiring state once, provisions and verifies merchant webhook before readiness. |
| `prepareOrganizerFormPayment` / `getOrganizerFormPayment` | Callable | Public form checkout and recovery | Frozen payment ledger, locked draft, reserved capacity, normal response receipt | Verified-phone owner only. Amount/order/merchant and captured provider state are server authority; redirect requires a persisted response. |
| `findOrganizerFormPayment` | Callable | Account-owned recovery without browser identifiers | Latest financial projection and existing response receipt | Authenticated respondent and public-form scope; bounded reads; no provider side effects or dependency on current availability/version. |
| `organizerFormPaymentWebhook` / `onOrganizerFormPaymentWebhook` / `reconcileOrganizerFormPayments` | HTTP, trigger, schedule | Razorpay delivery and missed-callback recovery | Signed receipts, payment ledger, submitted response or idempotent refund | Exact raw-body signature and account binding; durable receipt before acknowledgment; retryable worker and bounded sweep. Verified offer receipts dispatch to the separate paid-offer ledger and admission transaction. |
| `prepareEventOfferInvitation` / `manageEventOfferCheckout` | Callable | Host link preparation, free acceptance and OTP recipient checkout | Private invitation, claim, admission receipt and offer-payment ledger | App Check and actor rate limits; current manager issuance, existing phone OTP plus current Admin Auth claim, strict scoped payloads, UID-owned discovery/status and frozen attempt replay; cash terms reviewed before preparation and explicit quoted-amount cancellation with atomic seat release and durable refund intent. Link secret stays in the URL fragment. New issuance/claim/reservation retain the event-offer source gate. |
| `reconcileOrganizerEventOfferPayments` | Schedule | Missed offer-payment callbacks and checkout expiry | Private offer-payment ledger, held seats, atomic admission or idempotent refund | Bounded oldest-first recovery; expiry runs independently of provider availability. Frozen merchant configuration and exact provider state own capture/refund. Review anomalies remain explicit. A separate due queue releases held Route transfers only after verified event completion and scheduled end, with durable intent and provider readback; admission itself never releases settlement. Host-cancellation refunds share the financial lease and require full transfer reversal. Guest-initiated cancellation remains an activation prerequisite. |
| `onCancelledEventOfferPayments` | Firestore update | Event enters cancelled state | Cancelled paid roster entries, released seats and durable full-refund intents | Retries page by remaining admitted status, with no purchase-age cutoff. Current event and immutable paid admission proof own cancellation; provider refunds run through the existing recovery queue and wait for settlement I/O. Explicit authority failures require review. |
| `getOrganizerFormShareAssets` / `createOrganizerFormShareLink` | Callable | Host Form share workspace | Reads one manager-owned published form; writes `organizerFormShareLinks/{linkId}` | Returns canonical, QR, and iframe assets. Organizer-created source links use opaque deterministic tokens; labels are bounded metadata and do not affect authority. |
| `publishOrganizerApplicationForm` | Callable | Host Applications import/form publishing | `organizerApplicationForms/{formId}`, immutable `organizerApplicationFormVersions/{versionId}` | App-Check-protected, rate-limited organizer-manager boundary. Import publishing accepts a deterministic form id so exact retries return the existing published version; changed content at that id fails closed. Provider names are provenance only. Canonical person-field ids and provider-header aliases come from `contracts/catalogs/person_fields.json`; proprietary questions stay unmapped and organizer-scoped. |
| `getParticipantOrganizerApplicationForm` | Callable | Authenticated participant application entry | Active published form version, private `participantIntakeProfiles/{uid}`, optional private `users/{uid}`, and verified Auth phone claim | Phone-authenticated and rate-limited. Returns only questions in the requested published form plus private suggestions labeled `portableIntake`, `privateProfile`, or `verifiedAuth`; every suggestion is marked review-required and nothing is written or exposed to the organizer. Event/campaign targets must belong to the form organizer. |
| `submitParticipantOrganizerApplication` | Callable | Participant-reviewed native application | One `organizerApplications` row, immutable `organizerApplicationResponses` snapshot, exact `participantOrganizerDataGrants` receipt, and optional participant-private intake revision | Requires the current active version, consent version, one canonical answer for every question, and explicit review of every question. The server rebuilds labels/privacy mappings from the version, verifies scoped ready assets, and atomically creates a UID-linked workflow row plus exact question/canonical-field grant. Saving eligible non-file values to portable intake is explicit; it never mutates `users`, public profile, CRM, booking or channel permission. |
| `revokeParticipantOrganizerDataGrant` | Callable | Participant application privacy controls | One participant-owned grant `revokedAt` and matching application withdrawal revision | Owner-only and optimistic. Retains the immutable platform audit snapshot, but manager list/detail reads immediately mask participant fields and the application can no longer be reviewed. |
| `previewOrganizerApplicationImport` | Callable | Host Applications CSV/XLSX mapping preview | Reads one published form version; writes nothing | Validates the complete explicit column mapping and at most 200 rows, returns bounded row errors and mapping confidence, and does not turn custom answers into global profile fields. |
| `importOrganizerApplications` | Callable | Host Applications confirmed CSV/XLSX import | `organizerApplications`, immutable `organizerApplicationResponses`, one `organizerApplicationImportReceipts/{receiptId}` | Hash-bound idempotent manager import. One atomic batch creates review rows and answer snapshots; canonical contact answers remain separate from organizer-only answers. It creates no Consumer user, public profile, CRM contact, event booking, or communication grant. |
| `listOrganizerApplications` | Callable | Host Applications review queue | Reads a bounded organizer application set plus native grant state | Manager-only search, form/person/status filtering, and newest/oldest/name sorting with a cursor bound to the filters and current ordered review state. The first tranche scans at most 500 organizer rows and fails closed beyond the bounded queue rather than pretending page-local sorting is global. Generic forms validate their exact submitted response/version; legacy native applications validate their grant. Unavailable evidence masks the applicant. Source origins preserve People links after merges; imported/connector rows are explicitly labeled organizer-acquired. |
| `getOrganizerApplicationDetail` | Callable | Host Application detail | Reads one application, immutable response, and native grant where applicable | Returns exact submitted generic-form answers or legacy-native grant-filtered answers, validated outreach actions, the source response and the current People link. Withdrawn or inaccessible evidence returns no answers/outreach. Phone calling requires E.164; Instagram and LinkedIn buttons require their exact HTTPS domains. |
| `reviewOrganizerApplication` | Callable | Host Application detail review actions | Atomic application status/note/reviewer update and, on approval, create-or-link organizer contact with source origin and CRM projection | Approval reuses a unique active contact or creates an unverified organizer-only contact; conflicting endpoint matches fail without a partial approval. Exact retries are idempotent. Generic form applications require their current submitted source response; legacy native applications require their exact participant grant. No verified identity, messaging permission or event booking is created. |
| `requestOrganizerClaim` / `adminDecideOrganizerClaim` | Callable | Website claim flow / admin claim queue | `organizerClaimRequests`, canonical organizer ownership/claim fields, team membership, notifications, legacy shadows | Claim submission never grants access; role-gated admin decision owns transfer. |
| `getOrganizerClaimVerificationOptions` / `startOrganizerClaimVerification` | Callable | Website claim page | Reads the organizer listing; writes `organizerClaimVerifications/{attemptId}` and reserves `organizerClaimInstagramCodes/{code}` | Signed-in accounts with a name and verified phone only. Shows a 30-minute six-digit code bound to one listing, account and method. Hidden until `CATCH_INSTAGRAM_CLAIMS_ENABLED` is on. Grants nothing by itself. |
| `instagramClaimWebhook` | HTTPS (Meta webhook) | Instagram direct messages to Catch's account | `organizerClaimInstagramMessages/{messageKey}` receipts, the attempt, then the shared claim approval (`organizerClaimRequests`, organizer ownership, team membership, notification) | Verify-token handshake on GET. On POST, an `X-Hub-Signature-256` check, one receipt per message id and a per-sender limit. The Graph API username must match the listing's handle. Replies in the thread. |
| `createPublicOrganizerReview` / `listPublicOrganizerReviews` | Callable | Public website listing | `reviews/{reviewId}` with `organizerId` and compatibility `clubId` | Public review scope is bound to a published canonical organizer route. |
| `adminGetOrganizerDetails` / `adminListOrganizerDetails` / `adminUpdateOrganizerDetails` | Callable | React admin Organizers workspace | canonical organizer read/update projections plus audited legacy shadow | Organizer-named admin wire contract; internal `AdminClub*` adapters are transitional only. |
| `adminDecideOrganizerEventCandidate` | Callable | React Organizer Intake review | `organizerEventCandidateReviewDecisions/{candidateId}` | Records approve/reject plus one explicit resolved/waived decision for every governed import blocker. A waiver must reference the accepted matching policy-gap decision. |
| `adminReviewEventMessagingBudget` | Admin callable | React Finance workspace and guarded Admin CLI | Read-only transaction over the exact event runtime, sender, current channel budget scopes and deterministic current decision | Restricted to Admin Owner or Finance. Returns only the validated setup review and bounded decision summary. It exposes no credential, private RCS agent id or guest roster, writes only an admin audit entry, and grants neither spending nor dispatch authority. |
| `managePaymentRoutingPolicy` | Admin callable | Finance/Admin Owner | `paymentRoutingPolicies/{policyId}`, `adminAuditLogs/{id}` | Read or expected-revision replacement of independent form-fee/event-admission app defaults and organizer overrides. Exact latest-command replay; no credentials, provider calls, account eligibility or checkout activation. |
| `adminDecideEventMessagingBudget` | Admin callable | React Finance workspace and guarded Admin CLI | `eventMessagingBudgetDecisions/{decisionId}`, immutable `eventMessagingBudgetDecisionReceipts/{receiptId}`, `adminAuditLogs/{id}`; transactionally reads the event runtime, sender and current channel budget scopes | Restricted to Admin Owner or Finance. Records approve, hold or reject with request-id replay, expected revision and current runtime/sender/budget-source hashes. Approval validates currency, existing charges, service horizon and applicable route selection. Both the stored document and response grant no spending authority, and no channel budget or provider is changed. |
| `adminApplyEventMessagingBudget` | Admin callable | React Finance workspace and guarded Admin CLI | Both exact channel budget documents, immutable `eventMessagingBudgetApplicationReceipts/{receiptId}`, `adminAuditLogs/{id}`; transactionally rereads the approved decision, runtime, sender and budgets | Restricted to Admin Owner or Finance. Consumes one exact current approved revision, rejects changed setup or charges, preserves conservative charges, advances both budget revisions, and binds the current RCS agent privately. Both ceilings remain paused, so no spending, provider call, outbox, dispatch, runtime configuration or worker activation occurs. |
| `adminPublishExternalEvent` | Callable | React Events external-supply workspace | `externalEvents/{eventId}`, `externalEventPublicationReceipts/{receiptId}` | Dry-run/apply authority for one reviewed outbound-only event. Enforces market identity, organizer capability/visibility ceiling, exact blocker decisions, immutable idempotency, and never writes canonical `events`. |
| `adminTakedownExternalEvent` | Callable | React Events external-supply workspace | `externalEvents/{eventId}`, `externalEventPublicationReceipts/{receiptId}` | Dry-run/apply takedown; preserves the record and attribution, records takedown metadata, and is idempotent. |
| `syncExternalEventVisibility` | Firestore trigger on `organizers/{organizerId}` writes | Backend | `externalEvents/{eventId}.discovery.appVisibility` | Keeps every external event's app visibility equal to its organizer's, in both directions; a deleted organizer hides its events. Reads nothing when the organizer's app visibility is unchanged and writes only rows that differ. |
| `onPublicPageOrganizerWritten`, `onPublicPageEventWritten`, `onPublicPageExternalEventWritten`, `onPublicPageReviewWritten` | Firestore triggers on `organizers`, `events`, `externalEvents` and `reviews` writes | Backend | `organizerPublicPage/{organizerId}`, `eventPublicPage/{eventId}`, `publicPageBuilds/{organizerId}` | Rebuild the organizer's public page read models when the changed document's public projection differs (CAT-250). Same publication rules as the website reader; a stale rebuild is discarded by the build marker; unchanged pages are not rewritten. |
| `onCityPlansOrganizerPageWritten`, `rebuildCityPlansHourly` | Firestore trigger on `organizerPublicPage` writes; scheduled hourly | Backend | `cityPlans/{citySlug}` | Rebuild a city's plans read model (the next 14 days of plans, format counts, organisers, live or launching soon) from its organizer page read models, or, for a city that has not launched, from the published organisers joining it (CAT-260). A rebuild that read older sources than the stored build is discarded. |
| `refreshPublicPageFollowers`, `reconcilePublicPages` | Scheduled (30 minutes, daily 03:30 IST) | Backend | Same as above | Batched follower-count refresh, and a daily rebuild of every page that moves ended events to past moments and heals missed changes. `functions/scripts/backfill-public-pages.cjs` runs the same rebuild on demand. |
| `adminListListingEventImports` | Callable | React Organizer Intake "Imported events" | Reads `supplyIntakeRequests` (approved, newest first), their `operationWorkItems`, `organizers` and `externalEvents` | Read-only. Each approved listing's events with their state (published by the policy or staff, withdrawn, ready, needs a check, blocked), blockers and the automated findings that left an event for a person. Roles `admin`, `adminOwner`, `support`. |
| `adminPublishListingEvents` | Callable | React Organizer Intake "Imported events" | `externalEvents/{eventId}`, `externalEventPublicationReceipts/{receiptId}`, `adminAuditLogs/{id}` | Dry-run/apply staff publication of chosen events of one approved listing. Full checklist required; per-event resolutions or accepted waivers clear governed blockers; one transaction and receipt per event; never overwrites a published event or republishes a withdrawn one. |
| `onSupplyIntakeListingApproved` | Firestore trigger on `supplyIntakeRequests/{requestId}` updates | Backend | `externalEvents/{eventId}`, `externalEventPublicationReceipts/{receiptId}` | When a listing's approval is recorded, publishes each imported event that the event publication policy allows: auto-publish mode, every automated check passed (no dating framing, attributed to the organizer) and an unblocked import plan. Receipts keyed on the request make redelivery replay. |
| `adminListSupplyIntakePolicies` | Callable | React Organizer Intake "Supply Intake policies" | Reads the four Supply Intake policy files from the packaged Operations runtime and `organizerPolicyGapReviewDecisions/{decisionId}` | Read-only. Each capability that waits for the owner (page fetch, scheduled crawl, agent research, model extraction) with its decision, limits and whether its policy file switches it on and cites the decision. Roles `admin`, `adminOwner`, `support`. |
| `adminRefreshOrganizerEvents` | Callable | React Organizer Intake "Imported events" (Check for new events) | `supplyIntakeRequests/{requestId}`, `adminAuditLogs/{id}` | Event-intake front door: an `event_refresh` request for an unclaimed, published organizer Catch lists, created with that organizer's approval and reading the given links or its page's event-calendar links. Deterministic per caller key; a claimed organizer is refused. Roles `admin`, `adminOwner`, `support`, `salesStaff`. |
| `createClub`, `updateClub`, `archiveClub`, `deleteClub`, `joinClub`, `leaveClub`, `createClubPost`, `requestClubClaim`, `adminDecideClubClaim` | Callable compatibility wrappers | Released clients only | legacy club projection and/or canonical organizer adapter | No new client may adopt these names. Remove only after released-client and remote-parity evidence. |
| `setReviewResponse` | Callable | Claimed organizer review UI | `reviews/{reviewId}.ownerResponse` | Server-owned owner response on public review documents. Only managers for the owning organizer can write responses; app and website render the canonical review snapshot. |
| `startOrganizerConversation` | Callable | `ClubHostContactController.startConversation` compatibility controller from organizer or event detail | `matches/{opaqueScopedId}` | Validates `organizerId` and optional `eventId`, prefers canonical organizer-manager authority with a legacy-club fallback during backfill, and checks the block/deleted-user boundary. New documents carry both `organizerId` and the compatibility `clubId`; legacy pair-id `clubHostInquiry` threads remain reusable. `startClubHostConversation` is a released-client wrapper only. |
| `startOrganizerContactConversation` | Callable | Host Customer detail through `HostCustomersController` | `matches/{opaqueScopedId}` after reading one restricted `organizerContacts/{contactId}` | Manager-authorized reverse entry into the same organizer-scoped conversation model. It fails closed for hidden, deleted, merged, ambiguous, unlinked, cross-organizer or self contacts and reuses the blocking/deleted-user checks. A manually entered name never becomes messageable by inference. |
| `syncClubMemberStats` | Legacy Firestore trigger on `clubMemberships/{membershipId}` write | Backend | compatibility `clubs/{clubId}.memberCount` | Maintains the released-client projection only. Canonical follower counts are owned by `syncOrganizerFollowerStats` on `organizerFollows`; no new consumer may depend on this legacy trigger. |
| `previewOrganizerFormAdmission` | Callable | Host response admission | Current form/CRM/offer/payment/seat authority | App Check, current manager, 30/min actor limit; shared commit preparation returns exact revisions or a blocker without writes. |
| `commitOrganizerFormAdmission` | Callable | Host response admission | Current form/CRM provenance or approved native application, issued offer, payment evidence and canonical seat authority; atomic attendee, ownership and request receipt | App Check, authenticated current manager in transaction, 20/min actor limit, strict input/output contracts. Missing or unreconciled seat authority fails closed; no client-supplied payment or capacity facts. |
| `previewEventOffers` / `commitEventOffers` / `mutateEventOffer` / `getEventOffer` / `listEventOffers` / `prepareEventOfferHandoff` / `getEventOfferConfiguration` / `configureEventOfferPreferences` / `previewEventOfferPreferences` | Callable | Host forms and CRM | `organizerEventOffers`, operation receipts/audits and current source/manager/event/payment authority | App Check, bounded 25-person atomic batches, rate limits and current-transaction authority. Manual attestation is not provider proof or admission. |
| `createPrivateEventSetup` / `updatePrivateEventBasics` / `updatePrivateEventPreferences` / `getPrivateEventSetup` / `setEventPublication` | Callable | Progressive Host setup | `events`, `eventSetupReceipts`, `eventSetupPreferences`, current organizer and deleted-account authority | App Check and per-actor rate limits; exact request/revision receipts, transaction-bound manager checks and safe minimal read projection. Mutations remain server-disabled until canonical schema, rules and public readers are migrated. |
| `reconcilePrivateEventSeats` | Callable | Host admission settings in progressive setup | Existing roster sources, staged migration pages, canonical seat ledger/fence, event terms and exact details receipt | App Check; 30/min actor limit; three page steps per request; current manager/deleted-account/event authority in every transaction. Missing reviewed terms apply only at ready activation; configured terms and offers are preserved. Cleanup and lost responses resume the same journaled command. Pre-apply discard cleans staged copies before releasing the fence with an exact rejected receipt; it cannot remove applied output or undo an acknowledged save. Production privacy and seat-writer gates remain closed. |
| `queryOrganizerFormResponses` | Callable | Host response-query gateway | Current organizer, published form/version and bounded response snapshot | App Check; actor 12/min and organizer 60/min; max 5,000 response rows plus sentinel, 8 MiB and 25 seconds per scan. Global sort and cursor/selection hash are bound to current safe data. Each page rescans; no page-size-only cost guarantee. Stale errors carry `details.reason=response-query-stale`. |
| `createEvent` | Callable | `EventRepository.createEvent` | `events/{eventId}` with `organizerId`, optional `sourceVenueId`, organizer next-event projection, organizer-follower notifications, compatibility mirrors | Organizer-manager authority is verified server-side; the callable requires and canonicalizes an exact `meetingLocation`, validates any saved-venue provenance against an active same-organizer asset while retaining an independent event snapshot, accepts an ordered Host gallery without a product item cap, initializes lifecycle/count projections, and refreshes the organizer next-event projection. |
| `upsertOrganizerEventVenue` | Callable | Host Create Event Where step | `organizerEventVenues/{organizerId_venueId}` | App-Check-protected organizer-manager mutation for reusable exact meeting places. It owns identity, timestamps, active/archived state, and optional capacity defaults; event creation copies rather than references mutable location/capacity values. |
| `updateEvent` | Callable | `EventRepository.updateEventDetails` | `events/{eventId}`, immutable `eventPlanChanges/{sourceId}`, organizer next-event projection, participant notifications | Host-editable schedule/descriptive fields and ordered event media. The first gallery photo owns `photoUrl`; every edit persists exact structured location plus legacy mirrors. An actual attendee-relevant change before event end advances the monotonic plan-change revision and atomically captures a server-only source record for bounded messaging; copy-only edits do not. Schedule/location changes still produce deterministic activity, and removed originals/thumbnails are cleaned up after commit. |
| `adminUpdateEventDetails` | Admin callable | Admin Event Details editor | `events/{eventId}`, `adminAuditLogs/{id}` | Admin and Admin Owner may toggle the default-false `crossPathsDiscoveryEnabled` selected-event gate. Enablement fails closed unless the event is active, at least six hours away, in `in-mh-mumbai`, and fewer than three other upcoming events are selected. Organizer-controlled pair inventory is allowed only through the canonical bounded admission policy and its server-owned hold/capacity checks. The audit note remains mandatory. Disabling invalidates pending Cross Paths invitations while preserving accepted plans. |
| `sendEventBroadcast` | Callable | Host Inbox broadcast composer through `EventRepository.sendEventBroadcast` | `eventBroadcasts/{broadcastId}`, `organizerBroadcastSummaries/{broadcastId}`, `notifications/{uid}/items/{notificationId}`, preference-gated Consumer FCM | Current event hosts can send bounded, moderated event updates to a server-resolved Booked (`signedUp` plus `attended`) or Prospective (`waitlisted`) roster. Inquiry/chat membership never determines recipients. A deterministic Activity item is the durable retry boundary; per-recipient receipt evidence prevents duplicate push attempts and is retained for 90 days through Firestore TTL. Finalization atomically writes the organizer-scoped, body-free Announcement history projection used by Sends and Customer detail. The callable is rate-limited to three logical requests per host per hour. |
| `onCancelledNativeEventRefunds` / `onNativeCancellationRefund` / `recoverNativeCancellationRefunds` | Firestore update/write and schedule | Native guest/host cancellation, rejected booking and late capture | Persisted refund intent, exact provider attempts and confirmed returned amount | Event and payment authority rechecked in transactions; paged event staging, original platform/provider binding, Stripe destination reversal, bounded oldest-due recovery without purchase-age cutoff, lease and idempotency fencing. Uncertain expired Stripe requests and definite mismatches require review. |
| `cancelEvent` | Callable | `HostEventManageScreen` | event cancellation fields, organizer next-event projection, canonical schedule-lock release, durable native refund staging, participant notifications | Current organizer-manager cancellation; exact replay resumes staging while retaining history. Provider acceptance alone does not mark a refund complete. |
| `deleteEvent` | Callable | `HostEventManageScreen` | event delete and organizer next-event refresh | Hard delete only for unused events; events with history are cancelled. |
| `syncClubNextEvent` | Firestore trigger on `events/{eventId}` write | Backend | canonical organizer and legacy club next-event projections | Compatibility-named trigger that queries `events.organizerId` and recomputes the organizer projection. |
| `signUpForFreeEvent` | Callable | `PaymentRepository.bookFreeEvent` | `eventParticipations/{eventId_uid}`, event booking/pair aggregate projections, optional `crossPathsPairHolds/{holdId}`, optional Cross Paths event plan, `notifications/{uid}/items/{notificationId}` | Delegates core booking to `signUpUserForEvent`, whose final transaction rechecks persisted host review rather than a preflight approval hint; an active caller-owned companion hold uses its frozen quote and converts atomically into a canonical booking plus event plan after live attendee consent/participation and safety revalidation. |
| `createRazorpayOrder` | Callable | `PaymentRepository.processPayment` | Razorpay order, same-environment public checkout key id, and optional Cross Paths hold attribution | Uses trusted event price and server-side credentials; rejects cancelled events before creating an order. The response supplies the public key id from the same Secret Manager environment as the order, so mobile builds do not embed a local `.env` value. The secret key never leaves Functions. An active caller-owned companion hold freezes price and is carried through fulfillment without widening payment authority. |
| `createRazorpayHostPaymentAccount` / `refreshRazorpayHostPaymentAccount` | Callable | `HostPaymentAccountController` from Host Payments | `hostPaymentAccounts/{uid}_razorpay` plus Razorpay Route linked account, stakeholder, product configuration, and settlement details | Organizer-owner-only, App-Check-protected and rate-limited. Catch persists only provider ids and activation/requirement state; PAN, bank, stakeholder, and contact KYC values are submitted directly to Razorpay and are not stored in Firestore. Provider ids are checkpointed after creation so retries continue the same Route account/product. Route activation remains an external Razorpay gate. |
| `createStripeHostOnboardingLink` / `refreshStripeHostPaymentAccount` | Callable | `HostPaymentAccountController` from Host Payments | canonical `hostPaymentAccounts/{uid}_stripe`, legacy `hostPaymentAccounts/{uid}` fallback, and Stripe Connect account/onboarding links | Organizer-owner-only provider seam for non-INR payouts. New writes are provider-scoped; legacy Stripe account documents remain readable and refreshable during migration. |
| `verifyRazorpayPayment` | Callable | Razorpay success callback in `PaymentRepository` | `payments/{paymentId}`, `eventParticipations/{eventId_uid}`, event count/gender projections, `notifications/{uid}/items/{notificationId}` | Rate-limited before signature validation or Razorpay fetch; verifies signature, books paid event, and writes an in-app booking confirmation. |
| `cancelEventSignUp` | Callable | `EventRepository.cancelSignUpViaFunction` | `eventParticipations/{eventId_uid}`, `events/{eventId}.bookedCount`, `events/{eventId}.waitlistedCount`, `events/{eventId}.genderCounts`, `payments/{paymentId}` refund status, `notifications/{uid}/items/{notificationId}`, FCM to promoted waitlisted user | Rate-limited before payment lookup; promotion and seat release commit with the frozen cash-refund intent. Replay resumes the original quote; provider recovery never treats request acceptance as returned money. Writes exact count projections after promotion math. |
| `joinEventWaitlist` | Callable | `EventRepository.joinWaitlistViaFunction` | `eventParticipations/{eventId_uid}`, `events/{eventId}.waitlistedCount` | Rate-limited before transaction work; server checks block boundary without exposing block state in rules. |
| `leaveEventWaitlist` | Callable | `EventRepository.leaveWaitlist` | `eventParticipations/{eventId_uid}`, `events/{eventId}.waitlistedCount` | Rate-limited before transaction work; marks the caller's waitlist edge cancelled. |
| `markEventAttendance` | Callable | `EventRepository.markAttendance` | `eventParticipations/{eventId_uid}`, `events/{eventId}.checkedInCount` | Host-only attendance toggle. |
| `importEventAttendees` | Callable | `EventAttendeeRepository.importAttendees` from Host Guests | `eventAttendees/{attendeeId}`, `eventAttendeeImports/{importId}` | App-Check-protected and rate-limited. Organizer-manager-only bounded import (250 rows/request); normalizes contact data, gives attendee-level source references precedence over shared contact values, keeps optional shared `arrivalGroup` booking/order data distinct, and includes financial fields in the client import key and canonical payload hash. Shared-phone distinct tickets fail pending attendee-level review because seat authority has one exclusive phone alias; email-only duplicate rows remain explicit exceptions. An existing phone-key attendee or Catch-booking roster fact rejects a conflicting referenced host import; checked-in/Catch-linked state remains guarded. Optional CSV revenue remains organizer-reported; an explicit per-guest fallback remains an organizer estimate. Repeated equal imported totals within one arrival group are allocated across those guests once. |
| `manageHostRosterIntake` | Callable | Host Guests existing-event upload and saved review | Server-only `hostRosterIntakeSessions/{sessionId}` and nested immutable `receipts/{receiptId}`; final apply delegates to `importEventAttendees` | App-Check-protected, rate-limited organizer-manager boundary for bounded CSV/XLSX evidence. It saves exact row and field provenance, presents additions/updates/unchanged/exclusions/identity conflicts, requires explicit exception exclusions and a review hash, then re-reads the current roster and commits through the canonical writer. Event/account scope, revisions, content hashes and immutable receipts fence late responses, retries and replay. Missing update fields preserve canonical values; similarity and email alone never merge people or tickets. Local storage keeps only the opaque event-scoped session id so a server-owned draft can be resumed after navigation or restart. No model provider, paid inference or guest-data transmission is enabled. |
| `markEventAttendeeAttendance` | Callable | Released Host clients only | `eventAttendees/{attendeeId}` | Compatibility-only replay-unsafe toggle retained while installed clients migrate. New Host code must not call it. |
| `setEventAttendeeAttendance` | Callable | `EventAttendeeRepository.setAttendance` from Host Guests | `eventAttendees/{attendeeId}`, event checked-in aggregate and `eventAttendeeAttendanceReceipts/{receiptId}` | App-Check-protected and rate-limited organizer-manager absolute mutation. It compares an expected attendance revision, preserves the pre-check-in roster state for undo, stores a 30-day idempotency receipt, returns exact replay/conflict state, and never synthesizes a Consumer participation or profile. |
| `getEventAttendanceDisposition` / `recordEventNoShow` | Callable | `EventAttendanceDispositionRepository` and account-scoped review/editor; Host UI integration pending | Reads canonical event, roster, organizer, runtime plan and current guest intention; writes only `eventAttendanceDispositions` and `eventAttendanceDispositionReceipts` | App-Check-protected, rate-limited and current-manager-only. Explicit record/clear decisions require reviewed source and separate attendance/disposition revisions. No unchecked guest becomes a no-show automatically. Source replacement hides old decisions; changed attendance/closure/cited guest evidence supersedes them. Exact retries preserve original operation revision and return the current view. Never changes check-in, admission, participation, messages, payments or report aggregates. |
| `getEventAttendanceReport` | Callable | `EventAttendanceReportRepository` and account-scoped report provider; Host UI integration pending | Reads canonical event, organizer, runtime plan and complete bounded `eventAttendees` roster with guest evidence and closeout annotations in one SDK read-only snapshot | Current-manager-only, App Check and ten reads/minute. Returns counts and compact member classifications using the individual closeout policy; includes imported/unlinked guests. Empty and unresolved remain explicit. Invalid evidence or more than 1,000 rows fails instead of returning partial totals. No report-cache, attendance, message or decision writes. |
| `setEventSuccessAccountabilityResolution` | Callable | Host Event Success return sweep | One `eventAttendees/{attendeeId}` accountability resolution | App-Check-protected, rate-limited organizer-manager mutation for a `sweep` event. It accepts only a currently checked-in attendee, binds returned/departed to that exact check-in timestamp, and can explicitly reopen the row. Imported and unlinked operational guests use the same path. |
| `controlEventSuccessLive` | Callable | `EventSuccessRepository` live controls | `eventSuccessPlans/{eventId}` live-control fields; reads bounded `eventAttendees` for sweep completion | Organizer-manager-only, App-Check-protected state reducer. It revision-fences step/completion/countdown/cancel actions, requires explicit reveal confirmation, derives countdown publication from a persisted server anchor, and never moves a published reveal index backwards. Unresolved `sweep` rows raise a warning unless the Host sends explicit `accountabilityAcknowledged`; acknowledgement permits completion rather than creating a hard lock. |
| `recordEventSuccessUnitOutcomes` | Callable | Host Event Success live reveal card | `eventSuccessUnitOutcomes/{eventId}`, optional `eventSuccessStandings/{eventId}` | Organizer-manager-only, App-Check-protected, revision-fenced complete-round replacement. Exact replay is idempotent. Scores accumulate across corrected snapshots, ranks require one complete contiguous ordering and use the latest round, completion stores Host-only facts, and `none` rejects recording. Score/rank tables reuse the plan's existing synchronized reveal cursor and confirmation. |
| `upsertEventSuccessLayout` | Callable | Host create-event layout authoring | `organizerEventSuccessLayouts/{organizerId_layoutId}` | App-Check-protected organizer-manager mutation for reusable parametric assets. It validates unique bounded grid units across the five supported shapes and preserves asset identity/timestamps; it never stores derived coordinates or creates event-scoped copies. |
| `getEventSuccessSpatialLayout` | Callable | Host and attendee Event Success runtimes | Reads the selected `organizerEventSuccessLayouts/{organizerId_layoutId}` asset through one event plan | Returns a timestamp-free selected layout only to an event manager or eligible participant. `wholeGroup` and unselected plans return `null`; it never returns attendee positions. |
| `controlEventSuccessSpatial` | Callable | Host Event Success room map | `eventSuccessPlans/{eventId}` scoped constraints/revision and one `eventSuccessAssignments/{eventId_moduleId_uid}` position | Organizer-manager-only destination preview, tap/drag reassignment, explicit position confirmation, and pinned release. Every write shares the T4 `liveControlRevision` fence; reassignment persists a named T2 constraint with explicit scope, clears prior confirmation, and rejects capacity, safety, or declared-constraint conflicts. |
| `generateEventSuccessRotations` / `overrideEventSuccessRotations` | Callable | Host Event Success rotation preview/editor | `eventSuccessAssignmentDrafts/{eventId_guided_rotations_uid}`, `eventSuccessPlans/{eventId}` draft/live revisions | Generates or overrides Host-only full-schedule drafts after verifying the expected live revision. `sequence` pair rotations enforce configurable resource capacity, fair sit-outs from the shared exclusion ledger, and layout-proximity placement; Host overrides cannot exceed the same capacity. It does not expose precomputed future rotations in attendee-readable assignments. Unsupported topology or algorithm combinations continue to return `unsupported`; they do not fall back to pair rotations. |
| `publishEventSuccessRotationRound` | Callable | Confirmed Host rotation-publish action | `eventSuccessAssignments/{eventId_guided_rotations_uid}`, `eventSuccessPlans/{eventId}` publication/live revisions | Transactionally publishes only the requested prepared round. Repeating an already-committed request is idempotent, future slots are filtered out, and assignment generation is not invoked on the transition path. |
| `onEventSuccessPlanLiveControlUpdated` | Firestore trigger on `eventSuccessPlans/{eventId}` update | Backend | Next-round `eventSuccessAssignmentDrafts`, `eventSuccessPlans/{eventId}` draft/live revisions | Asynchronously prepares round N+1 when live mode begins or round N publishes. Retry attempts use validated `EVENT_SUCCESS_DRAFT_PREPARATION_ATTEMPTS` deployment configuration (1-10, default 3), so transition latency never includes synchronous generation. |
| `heartbeatEventSuccessPresence` | Callable | Checked-in Flutter companion and no-download Event Success runtime | `eventSuccessPresence/{eventId_uid}` | App-Check-protected and rate-limited. It requires an attended unified-roster edge, writes only server timestamps, and returns the bounded active policy. Defaults are 30-second heartbeat, present through 90 seconds, idle through 300 seconds, then likely departed; invalid environment ordering falls back to those defaults. |
| `getEventSuccessPresenceSummary` | Callable | Host Event Success live control | Reads unified roster, server-only presence, next-round drafts, late-arrival resolutions, and plan revision | Organizer-manager-only bounded projection. Presence state is derived from the server clock. It reports only monitored liveness and checked-in attendees missing from the next draft; no raw presence collection access is granted. |
| `resolveEventSuccessLateArrival` | Callable | Confirmed Host late-arrival action | Next-round `eventSuccessAssignmentDrafts/{eventId_guided_rotations_uid}`, `eventSuccessPlans/{eventId}`, `eventSuccessLateArrivals/{eventId_uid}` | Organizer-manager-only, App-Check-protected, rate-limited and revision-fenced. It may fill a liveness-vacated draft slot, pair against a prepared sit-out, extend a draft group within its declared size, or hold with a stated reason. It never reads or writes a published round through `eventSuccessAssignments`. Exact resolution replay is idempotent. |
| `getEventSuccessConversationGraph` | Callable | Ended no-download Event Success runtime | Reads the unified attended roster, caller assignments, block edges, plan consent mode, and caller's optional `eventSuccessConversationGraphs/{eventId_uid}` | App-Check-protected and rate-limited attendee-private projection. It is available only after event end to a checked-in attendee, excludes self and blocked relationships, orders assigned candidates first, and derives format copy from interaction primitives without an activity-kind screen fork. Missing consent configuration resolves to explicit opt-in. |
| `submitEventSuccessConversationGraph` | Callable | Ended no-download Event Success runtime | `eventSuccessConversationGraphs/{eventId_uid}` | App-Check-protected, rate-limited, idempotent replacement of the caller's private response. Only currently eligible checked-in roster UIDs are accepted; skip cannot carry edges. Opt-out preselection remains removable. Raw edges never enter a Host-readable response. |
| `onEventSuccessConversationGraphWritten` | Firestore trigger on `eventSuccessConversationGraphs/{graphId}` write | Backend | Numeric-only `eventSuccessScorecards/{eventId}.conversationGraph` aggregate | Rebuilds the canonical Host scorecard after a raw response changes. The projection contains response, skip, conversation, assignment-opportunity, and exclusion counts only, never attendee IDs or name-to-name edges. |
| `getEventAssistanceSmsWithdrawal` / `withdrawEventAssistanceSms` | Public bearer callable | Original SMS link | Private SMS withdrawal grant and consent permission/receipt | App Check and network/credential rate limits. Separate withdrawal lifetime survives instruction expiry and event cancellation. Fixed event/recipient/subject binding; no identity response or enable action. CAS and immutable request receipts fence old withdrawals after later opt-in. |
| `getEventWhatsappWithdrawal` / `withdrawEventWhatsapp` | Public bearer callable | Original WhatsApp message link | Private withdrawal grant and event-service permission/receipt | App Check and network/credential rate limits. Grant commits with dispatch and binds the original event, subject, recipient and provider sender. Revocation survives expired instructions and unavailable sources; no enable action, recipient identity or current roster data. CAS and immutable receipts prevent stale requests reversing newer consent. |
| `getEventWhatsappPreference` / `setEventWhatsappPreference` | Public authenticated callable | Verified participant event WhatsApp preference for an explicit organizer sender | Own `eventAttendees` identity; private WhatsApp permission and immutable receipt | App Check, UID rate limits and linked-UID authorization. Grants require the signed phone claim, admitted status, eligible event, displayed sender/STOP hashes and a reviewed hash binding the full recipient, subject, source generations, event title, consent expiry/copy and sender. Changed numbers with the same suffix and unseen STOP evidence require fresh review. Credential/health revisions preserve unchanged terms. Withdrawal preserves prior evidence despite broken sender configuration and requires no grant review hash; revision checks and immutable exact-request replay fence stale grants. Required hash fields need coordinated API/web rollout. No announcement permission reuse, provider I/O or client collection access. |
| `getEventAssistanceParticipantContext` | Authenticated read-only callable | Consumer attendee identity before opening event messaging controls | Canonical event plus at most two own linked-UID roster matches | App Check and UID rate limits. Only a unique match returns identity; ambiguity exposes no candidates. Validates organizer and source generations, never guesses from booking ID, names or phone. No linking, roster mutation, consent, provider access or contact disclosure. Deploy the event/linked-UID index with the callable. |
| `getEventAssistanceSmsPreference` / `setEventAssistanceSmsPreference` | Public authenticated callable | Verified participant event text preference | Own `eventAttendees` identity; private SMS permission and immutable receipt | App Check, UID rate limits and linked-UID authorization. Opt-in requires matching signed phone claim, admitted status, eligible event and ready Catch sender. Each new decision echoes the displayed review hash and permission revision; changed recipient, source generation, event terms or consent proof requires fresh review. Withdrawal is independent of sender readiness. Immutable exact-request replays return current state without reapplying an old decision. Optional sender ID selects the reviewed SMS channel; omission retains the legacy Catch default. Every response confirms sender ID, and custom-sender receipt keys are separate. No client-selected phone or consent timestamp. |
| `onAssistanceRcsPermissionChanged` / `onAssistanceRcsSenderChanged` / `onAssistanceRcsBudgetChanged` / `onAssistanceRcsSubscriptionChanged` | Firestore write triggers | Canonical RCS consent, sender, spending and STOP changes | Bounded Operations source work; exact runtime sender and conversation permission discovery | Rechecks existing event/attendee work only. Ignores ordinary debits and START observations; STOP is conversation-scoped. No enrollment, consent, spending or send authority. |
| `EventRcsWorker` / `RcsDispatchStore` | Internal worker boundary | Shared Event Assistance channel selector | Current sender/permission/source/capability; approved event and UTC sender-day budgets; immutable dispatch and withdrawal evidence | Capability I/O precedes reservation. Claim rechecks authority and commits two worst-case charges with one outbox attempt. Frozen payload/expiry and deterministic provider identity fence sends; ambiguous or accepted submissions hold fallback. Production factory supplies the pinned-secret OAuth loader and bounded Google provider behind a default-off flag. Explicit sender selection and every existing authority check remain required; provisioning, deployment and activation remain pending. |
| `eventAssistanceRcsWebhook` | Public HTTPS POST | Google RBM callback or verification challenge at a registered endpoint path | Pinned endpoint key binding; raw-byte HMAC/agent validation; durable private callback inbox | Independent default-off ingress flag. Retained bindings accept receipts and replies after outbound pause or rotation. No acknowledgement before durable acceptance, no request-selected identity and no outbound authority. Provider registration, deployment and activation remain pending. |
| `onEventAssistanceRcsCallbackCreated` / `RcsCallbackConsumer` | Firestore create trigger and transactional consumer | Authenticated private RCS inbox | Callback conflict identity, immutable dispatch binding, message state, guest/case action and consumer receipt | Exact replay is atomic; signed delivery/revocation follows shared evidence ordering. Native replies use original offered indices, guest revision and source identity with current event rules. No outbound consent or send authority. Ingress activation and provider verification remain pending. |
| `getEventRcsWithdrawal` / `withdrawEventRcs` | Public bearer callable | Original RCS message link | Private withdrawal grant and RCS permission/receipt | App Check and network/credential rate limits. Revocation-only authority binds original event/attendee source generations, subject, endpoint and provider agent. Independent lifetime survives expired instructions and deleted sources without exposing identity or restoring guest access. The RCS dispatch claim issues withdrawal authority atomically; revisions and immutable receipts fence stale requests after renewed consent. |
| `listEventSmsPreferences` | Authenticated callable | Verified participant event text preferences | Canonical event/roster identity, saved runtime SMS sender and private permission history | App Check and UID rate limits. Read-only indexed 50-row pages require the same consent subject, attendee generation and recipient binding. Paused execution retains selection; changed source facts withhold it. Earlier grants remain discoverable after withdrawal without exposing contact/provider evidence. No consent or activation. |
| `listEventWhatsappPreferences` | Authenticated callable | Verified participant event messaging preferences | Shared canonical event/roster and saved runtime selection; participant-owned WhatsApp consent history | App Check and UID rate limits. Selects only the organizer WhatsApp route. Indexed 50-row pages retain earlier verified grant history after withdrawal, exclude stale recipient/attendee generations, and expose no contact, provider or consent evidence. No enrollment, connection lookup or provider I/O. |
| `listEventRcsPreferences` | Authenticated callable | Verified participant event messaging preferences | Canonical event/roster identity, saved runtime sender and participant-owned RCS permission page | App Check and UID rate limits. Current sender selection is distinct from consent and readiness; paused execution retains its selection. Indexed 50-row pages exclude stale recipient/source generations and never expose contact, provider or credential data. No permission write, runtime enrollment or provider I/O. |
| `getEventRcsPreference` / `setEventRcsPreference` | Public authenticated callable | Verified participant RCS preference for an explicit Catch sender | Own event/attendee source generations; private RCS permission, sender, subscription and immutable receipt | App Check and UID rate limits. Grants require the signed phone claim, admission, event window, approved sender and exact review hash over displayed scope and latest STOP. Credential rotation preserves consent; changing the agent requires fresh consent. Atomic receipts and revision checks fence retries; withdrawal retains the original binding despite broken sender configuration or receipt proof. No other channel permission, provider I/O or client collection access. |
| `getEventAssistanceGuestView` / `submitEventAssistanceGuestChoice` | Public callable | Scoped event-service guest link | Server-only `eventAssistanceGuestGrants`, `eventAssistanceThreads`, `eventAssistanceGuests`, `eventAssistanceMessages` and `eventAssistanceCases` | App Check and separate network/grant rate limits. A hashed bearer grant authorizes one workflow occurrence and guest episode, resolving the current instructions in a transaction. Replies bind intent and guest-state revisions; intent/help effects commit with the response. No roster enumeration, check-in, assignment or full runtime access. |
| `listEventAssistanceDepartureRosters` | Callable | Account-scoped departure history repository/provider | Reads canonical event/group authority, current progress, ten immutable departure rosters plus overflow witness and saved checkpoint reports | Auth, App Check, UID rate limit and current group-read authority. Descending revision pagination retains earlier checkpoint scope after later departures. Counts and historical request deadlines only; no guest identities, current obligation claims or writes. Rechecks expiry after all reads. |
| `listEventAssistanceDeliveries` | Callable | Host delivery review backend | Reads scoped outbox, guest/source identity and existing delivery coordinator | App Check, UID rate limit and current organizer-manager authorization. Bounded page with independent evidence, coordination and ownership states; private provider/recipient/link data excluded. |
| `repairEventAssistanceDelivery` | Callable | Reviewed Host manual handoff | Outbox `handoff` plus immutable `eventAssistanceDeliveryRepairs` | Typed `repairDelivery/manualHandoff` requires the reviewed revision/hash. Stops future send claims while preserving guest replies and late receipts; exact retries return current state with the original operation revision. Cannot fabricate delivery, nondelivery, consent or a refund. Provider lookup and verified retry remain unavailable. |
| `getEventRuntimeBootstrap` | Callable | No-download Event Success web runtime | Reads one `events` public-runtime projection and the caller's optional `eventRuntimeParticipants/{eventId_uid}` / linked `eventAttendees/{attendeeId}` / current `eventRuntimeDataRequests/{requestId}` state | App-Check-protected opaque-id resolver. It may run before authentication but returns only the event title, schedule, location label, and authenticated caller's own sanitized state. A missing-data request exposes canonical field ids and lifecycle only. It never enumerates the roster or treats the public runtime id as authorization. |
| `claimEventRuntimeAccess` | Callable | Phone-OTP runtime claim step | `eventRuntimeParticipants/{eventId_uid}`, optional `eventRuntimeClaimRequests/{eventId_uid}`, optional linked/auto-created `eventAttendees/{attendeeId}` | Requires Firebase phone authentication and an enabled runtime. Deterministic exact roster matches link in place; missing or ambiguous matches obey the event's deny, Host-approval, or auto-create policy. It creates no Consumer participation or public profile. |
| `submitEventRuntimeProfile` | Callable | Minimum Event Success questionnaire | `eventRuntimeParticipants/{eventId_uid}`, optional current `eventRuntimeDataRequests/{requestId}`, optional missing-field-only `onboarding_drafts/{uid}` prefill | Recomputes plan-derived required fields server-side, increments the accepted profile revision and reconciles any current required-data request. A Catch prefill requires separate consent and remains private; it cannot overwrite a completed Consumer profile. |
| `onEventRuntimeParticipantWritten` | Firestore write trigger | Automatic required guest-data workflow | Current runtime participant, event/plan/attendee source, `eventRuntimeDataRequests/{requestId}` and immutable receipt | Generates the typed `requestRequiredData` command only for current missing plan-derived fields. Exact retries are idempotent; stale source, unsupported fields and deadlines after event end fail closed. It cannot request arbitrary profile data or act with Host authority. |
| `approveEventRuntimeClaim` | Callable | Host pending-claims queue | `eventRuntimeClaimRequests/{eventId_uid}`, `eventRuntimeParticipants/{eventId_uid}`, selected `eventAttendees/{attendeeId}` | Organizer-manager-only transactional decision. Approval must bind an attendee from the same event (or create the allowed walk-in row); rejection reveals no roster identity to the claimant. |
| `configureEventRegistration` | Callable | Explicit host public registration mode | Event mode/revision and immutable `eventRegistrationReceipts` | App Check, manager and deletion checks, expected revision and replay hash; paid activation requires canonical open eligibility, seat migration readiness and a frozen ready route; preserves origin. |
| `managePublicEventCheckout` | Callable | Public event phone-OTP checkout and cancellation | `publicEventPayments`, `publicEventAdmissionReceipts`, canonical seat and roster | Strict quote/prepare/find/status/cancel commands; current phone Auth and UID ownership; reviewed price/cash terms; atomic 15-minute hold and verified-capture admission; no form or Consumer approval authority. |
| `reconcilePublicEventPayments` / `onCancelledPublicEventPayments` | Schedule / event trigger | Public payment recovery, settlement and host cancellation | Public ledger and immutable paid receipt | Bounded shared recovery; inventory expiry independent of provider availability; full-refund cancellation queue without age cutoff; completion and scheduled end required for Route release. |
| `registerPublicEvent` | Callable | Published marketing event phone-OTP form | `eventAttendees/{attendeeId}`, optional first `onboarding_drafts/{uid}`, optional `organizerCommunicationPreferences/{organizerId_uid}`, and immutable `organizerCommunicationPermissionReceipts/{receiptId}` | Requires a Firebase phone-auth identity, a published organizer and explicitly OTP-enabled future event. Links a matching imported phone row in place, enforces capacity transactionally, returns event-scoped state only, and never creates a Consumer profile or `eventParticipations` edge. A first registration privately seeds only the supplied name and verified phone for later intentional onboarding. Independent WhatsApp/SMS grants are written only for explicitly checked optional permissions whose terms version maps to server-reviewed consent copy; unchecked input and imports grant nothing. |
| `createEventInviteLink` / `createAttendeeInviteLink` | Callable | Host invite tools and eligible attendee share surface | `eventInviteLinks/{inviteLinkId}` plus deny-all `eventInviteLinkSecrets/{inviteLinkId}` | Produces a versioned opaque bearer token. Managers can create channel, direct-recipient, promoter, or partner links. A phone-verified runtime attendee or eligible Catch participation receives one stable personal referrer link per event; it does not require Catch checkout. When the attendee surface omits a destination, the server selects verified external booking for external-companion events and Catch registration otherwise. Explicit external destinations must be configured and runtime destinations must be active. |
| `getEventInviteLinkToken` / `disableEventInviteLink` | Callable | Host invite manager and attendee-owned share surface | Reads the aggregate link plus secret; disables the aggregate link without deleting history | Current organizer managers can manage every event link. An attendee can retrieve or disable only their own attendee-referrer link. Legacy document-id links remain readable during migration but new URLs use bearer tokens. |
| `recordEventInviteLinkOpen` / `recordEventShareIntent` | Callable | Marketing event page, no-download runtime, Host and Consumer share buttons | Short-lived `eventInviteTouches`, short-lived `eventShareIntents`, aggregate counters on `eventInviteLinks` | Opens are ten-minute deduplicated and separated into raw and likely-human counts. A share intent proves only that a Catch share control was used; it never claims message delivery or recipient identity. Both web entry points preserve the token through OTP registration/runtime claim. |
| `onOrganizerContactEventEdgeInviteAttributed` | Firestore trigger on `organizerContactEventEdges/{edgeId}` | Backend | Immutable `eventInviteAttributions`, aggregate link counters and organizer advocate traits | Credits and reverses one primary invitation for verified registration/check-in transitions. Direct-recipient self-use is not a referral; another verified contact using that link is. High-impact advocate status requires three referred checked-in attendees during the trailing 365 days. |
| `onEventAttendeeAudienceProjected` | Firestore trigger on `eventAttendees/{attendeeId}` | Backend | `organizerContacts`, deterministic `organizerContactOrigins`, identity evidence/claims, contact-event edges, contact traits, audience summary and TTL projection receipt | Uses a Secret Manager HMAC key for restricted organizer-scoped identity lookup. Imported endpoints remain proposed evidence; UID/OTP identity can converge one unambiguous contact. Trait, receipt and summary delta commit atomically and are retry-safe. |
| `onOrganizerCommunicationPreferenceAudienceProjected` | Firestore trigger on `organizerCommunicationPreferences/{preferenceId}` | Backend | Matching verified organizer contacts, traits, audience summary and TTL projection receipt | Projects an opt-in only when current state references complete evidence. Incomplete legacy grants project as unknown, while withdrawals remain effective. A roster endpoint remains unusable for marketing without this purpose-specific grant. |
| `getOrganizerCrmSummary` | Callable | Host Organizer analytics/CRM audience card | `organizerAudienceSummaries/{organizerId}`, with temporary bounded attendee/preference fallback until organizer backfill | App-Check-protected, rate-limited, and organizer-manager-only. Returns scalable projected counts without contact fields. Partial migration coverage remains marked through `truncated`, while zero-attendee organizers resolve as complete instead of appearing perpetually in migration; external delivery still reports its provider/DLT setup gate. |
| `getEventRosterInsights` | Callable | Manager view of Host Guests during setup, live facilitation, and reporting | One event's operational attendees joined to organizer contact-event edges, bounded organizer event/payment facts, and current advocacy traits | App-Check-protected, rate-limited, and organizer-manager-only. Attendance labels use only events completed before the current event starts, so check-in cannot rewrite a guest's live label. Single-source imported identities, ambiguous identity and incomplete projections fail closed per row. Spend is explicitly limited to completed, non-refunded Catch payments completed by the event start; external-provider spend is never inferred. Delegated event staff receive no CRM enrichment. |
| `requestOrganizerFormExport` / `onOrganizerFormExportRequested` | Callable / Firestore trigger | Host form response CSV/XLSX export | Private expiring export receipt and storage object | Optional typed query uses the response list compiler and snapshot reader, binds query/result hashes, preserves full filtered order, excludes sensitive/withdrawn answers, and fails before saving on stale results or scan bounds. Manager/deleted-account authority is checked when requesting and evaluating typed exports; signed downloads require current manager authority. Legacy date/status exports remain compatible. |
| `listOrganizerContacts` | Callable | Host Customers directory, summary quick filters, computed segments, manual-tag views, and sorting | Indexed manager-authorized reads from `organizerContacts`, `organizerContactTraits`, the organizer manual-tag vocabulary, organizer coverage summary, and a bounded canonical-history existence check while coverage is not exact | App-Check-protected, rate-limited, server-paginated name search and combined reviewed segment/tag selections. Additive `segmentIds` and `manualTagIds` fields retain legacy scalar clients; options combine with OR within Attendance, Reliability, Advocacy, Reachable and Tags, then AND across nonempty groups. Contacts clears segmentation; Attended uses the canonical `past_attendee` segment and resolves legacy traits from `attendedEventCount > 0`; Repeat uses `repeat_attendee`. Last seen, Most attended, and Name use versioned cursors bound to ordering and canonical filter selections; bounded filtered sorts fail explicitly rather than page-sort. Missing projection state is exact only for an organizer with no canonical attendee history. Returns organizer-owned contact routes and explainable CRM traits only; private Event Success, feedback, dating and safety data are excluded. |
| `createOrganizerContact` | Callable | Host Customers full-page manual-add flow | One `organizerContacts/{contactId}`, deterministic `organizerContactOrigins/{originId}`, proposed organizer-scoped phone/email identity links, optional private note, zero-history trait, and audience-summary delta | Manager-only. Requires display name plus phone or email. A first manual-only contact initializes exact summary coverage when no canonical attendee history exists; existing attendee history remains partial until projection completes. Endpoints remain unverified evidence and create no UID, attendee, Consumer profile, opt-in or channel permission. Later identity convergence requires reviewed evidence/merge rather than matching on a display name. |
| `createOrganizerContactNote` / `mutateOrganizerContactNote` | Callable | Host Customer detail memory section | `organizerContactNotes/{noteId}` append or optimistic body edit after validating the active organizer contact | App-Check-protected, rate-limited, and guarded by the same organizer-manager authority as sibling contact callables. Notes retain original author and timestamps, stamp the latest editor, return newest-first through bounded contact detail, and are excluded from exports. |
| `recordOrganizerContactOutreach` | Callable | Host Customer detail outreach logging | `organizerContactOutreach/{outreachId}` append-only create after validating the active organizer contact | App-Check-protected, rate-limited, and guarded by the same organizer-manager authority as sibling contact callables. Records are manager assertions of channel attempts (not provider receipts), author-stamped, reject future timestamps beyond a short skew, surface newest-first on the contact timeline with explicit coverage, and are excluded from exports. |
| `mutateOrganizerContact` manual tags | Callable | Host Customer detail memory section and directory filters | `organizerContacts.manualTagIds` plus `organizerContactTagVocabularies/{organizerId}` | Atomically resolves case-insensitive labels to deterministic ids, enforces twenty tags per organizer and five per contact, and never writes computed `organizerContactTraits.segmentIds`. |
| `getOrganizerContactDetail` | Callable | Host Customer detail and compatibility Host Audience person detail | One restricted contact, traits, at most 100 contact-event edges, at most 500 linked-UID payment rows, optional notes/send history, and newest receipt-backed active merges | App-Check-protected, rate-limited and manager-only. `includeHistory: false` skips operational-history joins for Overview and marks `historyLoaded: false`; History requests the complete projection on demand. Omission retains the legacy full response. Cross-organizer or merged/deleted ids return not-found. Missing optional history indexes or hydration no longer hide the customer: notes/sends return explicit `unavailable` coverage while core detail remains usable. Revenue includes completed non-refunded Catch payments only and returns explicit exact/partial/unavailable coverage. Active merge receipts are newest-first and individually reversible. The timeline excludes private questionnaire, wingman, compatibility, feedback and safety content. |
| `listOrganizerCampaigns` | Callable | Host Sends workspace | Organizer-scoped `organizerCampaigns`, `organizerBroadcastSummaries`, `organizers/{organizerId}/posts`, and message-template labels | App-Check-protected, rate-limited and manager-only. Returns a reverse-chronological mixed Campaign/Announcement/Follower update page behind an opaque stable cursor. The projection excludes message bodies, endpoints and raw operational receipts, and does not use a collection-group query. |
| `resolveOrganizerCommunicationPlan` | Callable | Host Customer detail Message action and Sends preview | Route catalog, organizer sender/capability state, saved or event audience reference, contact identity evidence, communication preferences and suppression state | Manager-only, rate-limited, intent-aware and server-time-bound. Returns managed-delivery, external-handoff and unavailable recipient outcomes with route ids and reasons. Individual plans resolve Catch chat first, then personal-device WhatsApp and email handoffs when an address exists; personal handoffs are never observable or dispatched by Catch. It is advisory: every later dispatch or handoff-open mutation rechecks the applicable authority. |
| `upsertOrganizerSavedAudience` / `listOrganizerSavedAudiences` / `previewOrganizerSavedAudience` / `archiveOrganizerSavedAudience` / `resolveOrganizerAudienceMembers` | Callable | Host Audience overview, builder and picker | `organizerSavedAudiences/{audienceId}` plus bounded contacts, traits, source origins, applications, immutable form answers and event edges | Manager-only closed predicates include the directoryFilters predicate (the same grouped segment/tag evaluator as People), form/status, versioned filterable answers named-event attendance, verified currency/window spend and exclusive static member ids. Static selection resolves merge aliases and unavailable records in a bounded manager-only projection. Optional authoring metadata uses organizer-scoped immutable labels. Preview returns exact member pages, reach and evaluated time; cursors bind full membership and revision, and the cached preview write rechecks the definition. Withdrawals, foreign sources and limit overflow fail closed. Event Booked/Prospective groups retain event authority. Messaging consumes ids and cannot submit an independent filter expression. |
| `prepareOrganizerManualSendTask` / `listOrganizerManualSendTasks` / `validateOrganizerManualSendTaskLaunch` / `openOrganizerManualSendTask` / `markOrganizerManualSendTask` / `replanOrganizerManualSendTasks` | Callable | Host Sends manual-work queue and individual customer handoff | `organizerManualSendTasks/{taskId}`, current contact/permission/suppression/capability state and external-link response payload | Manager-only, rate-limited and idempotent. Prepare persists a queued task after current route checks and before its first external launch. Every queue re-open first performs a revision-bound, read-only endpoint and permission validation; open then rechecks authority and records only that the device accepted the prefilled handoff. Marking sent is an explicit host assertion, never a provider receipt. Re-plan is an explicit read-only recheck: it never dispatches, completes, removes, or supersedes existing work. |
| `listOrganizerContactActivity` | Callable | Host Customer detail activity timeline | Bounded organizer-scoped origin, form/application, attendance, note, permission, send/reply and merge facts | Manager-only, cursor-bound and sanitized. It returns typed display rows and explicit per-source coverage without private Consumer, compatibility, safety, wingman, message-body or raw provider-receipt data. |
| `mergeOrganizerContacts` | Callable | Host Audience duplicate resolution | `organizerContacts`, source-origin event edges, identity evidence/claims, contact origins, and an immutable merge receipt | App-Check-protected, rate-limited and manager-only. Requires current optimistic revisions and explicit confirmation for contradictory UID, phone or email facts. The atomic merge is capped at 400 moved facts; larger histories require a controlled backend operation. |
| `unmergeOrganizerContacts` | Callable | Host Audience merge reversal | The exact source-origin facts named by one prior immutable merge receipt and a deterministic reversal receipt | App-Check-protected, rate-limited and manager-only. Reversal fails closed if any moved fact no longer belongs to the survivor or has a different origin; it never guesses which later facts belong to the source. |
| `listOrganizerContactMergeCandidates` / `reviewOrganizerContactMergeCandidate` | Callable | Host Customers duplicate-review sheet | Conflicted verified identity claims, exact proposed phone/email links, contact/event evidence, and `organizerContactMergeReviewDecisions` | Manager-only and rate-limited. Candidate ids are deterministic; source kinds, shared events and confidence are derived rather than inferred. Name-only pairs are never listed. Different people is durable and may be reopened only by the manager who recorded it; a merge still requires explicit survivor selection and conflict confirmation. |
| `mutateOrganizerContact` / `exportOrganizerContacts` | Callable | Host Audience person controls and CSV export | One contact suppression/privacy revision or a bounded organizer CSV projection | Manager-only, optimistic and organizer-scoped. Export applies the same combined segment/tag selections and name search as the directory, neutralizes spreadsheet formulas and excludes private Event Success/safety content; contact mutation can correct the display label, suppress WhatsApp or hide the contact without rewriting source history. |
| `upsertOrganizerCampaign` / `previewOrganizerCampaign` / `approveOrganizerCampaign` / `cancelOrganizerCampaign` / `getOrganizerCampaignReport` | Callable | Host Sends campaign composer/report | One Customers-owned `organizerSavedAudiences` reference, `organizerCampaigns`, frozen `organizerCampaignRecipients`, invite links and aggregate delivery report | Manager-only state machine. New drafts accept one saved-audience id, never a filter expression or legacy segment list, and persist its revision/hash. Changed or archived definitions block preview/approval. Host-supplied template values fail closed through the shared outbound-content policy; approval freezes recipient/render hashes; later delivery still rechecks moderation, permission, suppression, sender and template health. Legacy segment-authored campaigns remain readable. Cancel is allowed only before terminal dispatch. |
| `dispatchOrganizerCampaign` / `dispatchScheduledOrganizerCampaigns` | Callable / scheduler | Host campaign action and scheduled dispatcher | Recipient leases, Meta send attempts, monotonic campaign counters and operation receipts | Idempotent, bounded-concurrency dispatch. A connected organizer-owned Meta sender, approved template and exact WhatsApp permission are mandatory. Retry keys prevent duplicate sends; accepted is not delivered. |
| `completeOrganizerWhatsappConnection` / `getOrganizerMessagingSetup` / `syncOrganizerWhatsappTemplates` / `sendOrganizerWhatsappTest` / `disconnectOrganizerWhatsappConnection` | Callable | Host Messaging setup | Safe sender/template projections plus Secret Manager token reference | Organizer-manager-only. Authorization code exchange and tokens stay server-side. Test variables pass the shared outbound-content policy before provider handoff. Connection remains pending until phone/WABA ownership and a test send are verified; disconnect stops new sends and removes/revokes secret access. |
| `organizerWhatsappWebhook` / `onOrganizerMessagingWebhookEventCreated` | HTTPS / Firestore trigger | Meta webhook | Authenticated/deduplicated provider receipt, immutable participant withdrawal receipt, recipient status projection, reply/STOP routing, suppression, and resolved-contact inbound thread persistence | Verifies challenge/signature and an unambiguous WABA/phone tenant. Native template quick replies, reply buttons and list choices retain their exact typed identifiers and original-message context separately from display labels; bounded status callback data and sender IDs stay in the private 30-day queue. Native-choice evidence does not execute Event Assistance actions yet. A verified text STOP additionally commits an organizer/endpoint suppression record with the ingress receipt, independently of CRM resolution; its sender mapping is rechecked transactionally. Only a text message can be interpreted as a STOP command. Statuses advance monotonically. STOP appends an `inboundStop` permission receipt, points current preference to it, and immediately suppresses future organizer sends without deleting the prior grant. Replaying an older STOP cannot overwrite a later participant decision. Bounded inbound text is retained only for one unambiguously resolved organizer contact: 30 days in the processing queue and 12 months in the server-only Inbox thread store; it never enters CRM analytics. |
| `listOrganizerWhatsappThreads` / `getOrganizerWhatsappThread` / `sendOrganizerWhatsappReply` | Callable | WhatsApp facets in the existing Host Inbox | `organizerWhatsappThreads`, `organizerWhatsappMessages`, `organizerWhatsappReplyOperations`, active sender connection/token, and contact suppression state | Manager-only, rate-limited and organizer-scoped. Threads/messages use rolling 12-month TTL. Reply text passes the shared outbound-content policy and requires an unsuppressed active contact and sender plus an unchanged latest inbound inside the 24-hour service window. A durable reservation precedes the Meta call so concurrent idempotent attempts cannot duplicate delivery; uncertain provider outcomes fail closed for that key. |
| `getOrganizerProviderSetup` / `connectOrganizerLumaProvider` / `listOrganizerLumaEvents` / `syncOrganizerProviderEvent` / `disconnectOrganizerProvider` | Callable | Host Provider setup | `organizerProviderConnections`, `externalEventMappings`, `providerSyncRuns` and canonical event attendees | Luma API keys are exchanged/stored server-side. Manual poll follows pagination/cursors, reconciles identity/registration/provider check-in idempotently and publishes exact capability coverage. It does not claim webhooks, orders, refunds, revenue or referral fields. Other providers report their real setup/export/partner gate. |
| `getEventOperatorAccess` / `listEventStaff` / `grantEventStaff` / `revokeEventStaff` | Callable | Host staff setup and `/host/operator/:eventId` | `eventStaffGrants/{eventId_uid}` plus sanitized Auth-backed staff projection | Managers grant at most 50 active, at most 14-day event-scoped rows. Staff need Firebase Auth but no Consumer profile. Every operation revalidates event, organizer, expiry, revocation and explicit permission; cross-event, CRM, campaign, provider, import and event-edit access remain denied. |
| `createEventVenueSession` | Callable | Host live check-in QR | `eventVenueSessions/{sessionId}` | App-Check-protected, rate-limited, Secret-Manager-signed, and organizer-manager-only. Issues a configurable 30–300 second session only during the check-in window; the Host refreshes it before expiry. Static/share URLs are not attendance credentials. |
| `selfCheckInAttendance` / `checkInEventRuntime` | Callable | Consumer scanner / no-download runtime | Attendance edge or attendee row, `events/{eventId}.checkedInCount`, `eventVenueSessionRedemptions/{redemptionId}` | Requires a current signed Host venue session, validates its server row inside the attendance transaction, and creates a per-UID replay receipt atomically with attendance. Printable QR and latitude/longitude payloads fail schema validation. |
| `startEventSuccessFirstHelloMission` / `completeEventSuccessFirstHelloMission` | Callable | Consumer and no-download First Hello | `eventSuccessArrivalMissions/{eventId_uid}`, venue redemption, attendance edge/attendee row | Start redeems the same signed venue authority into a mission-bound proof. Completion consumes that proof and may finish after the display token expires; it never accepts GPS or silently substitutes ordinary check-in. |
| `fetchSwipeCandidates` | Callable | `SwipeCandidateRepository`, Event Recap, post-event attendee avatars | `events/{eventId}`, `eventParticipations`, `users`, `publicProfiles`, `profileDecisions`, `blocks` (read only) | App-Check-protected, rate-limited post-event resolver. Fails closed outside the 24-hour Catch window or without attended viewer state, and returns only public projections that pass reciprocal gender/age preferences, prior-decision exclusion, and blocks in both directions. Raw roster identities are never returned. |
| `setCrossPathsEventConsent` | Callable | `CrossPathsRepository.setEventConsent` from Event Detail | `eventCrossPathsConsents/{eventId_uid}`; reads `users/{uid}`, `events/{eventId}`, and `eventParticipations/{eventId_uid}` | App-Check-protected and rate-limited. Acts only for the caller. Enabling requires an explicit private global opt-in, current terms, an Admin-selected active upcoming Mumbai event, and the caller's confirmed `signedUp` participation. Disabling remains available after eligibility disappears. The response contains only event id, enabled state, and terms version. |
| `getCrossPathsSuggestions` | Callable | Cross Paths Explore provider | Reads bounded `events`, confirmed `eventParticipations`, private `users`, `publicProfiles`, `eventCrossPathsConsents`, `crossPathsShowcaseEligibility`, safety/match boundaries, and `crossPathsSuggestionExposures`; creates deterministic exposure receipts | App-Check-protected, explicitly rate-limited, and roster-private. Ignores every real event whose Admin-owned selected-event switch is absent/false or whose market is not `in-mh-mumbai`; then revalidates booking availability, consent, reciprocal compatibility, showcase approval, and safety before returning at most two sanitized person/event projections with a ten-minute signed token. Never returns roster identities or private preference values. |
| `sendCrossPathsInvitation` | Callable | Cross Paths profile preview | `crossPathsInvitations/{eventId_senderUid}`, recipient Activity notification and optional push; reads invitation token claims, event, participations, users, public profiles, consents, showcase eligibility, safety state, policy inventory, and existing invitations/plans | App-Check-protected, signing-key-backed, and rate-limited. Creates at most one sender invitation per event after transactional revalidation. The recipient must be signed up; the sender must be signed up or currently admissible through explicitly reserved companion inventory. Sending alone never books or holds a seat and never alters waitlist rank. |
| `respondCrossPathsInvitation` | Callable | Invitation detail / Activity | Invitation transition, optional `crossPathsPairHolds/{holdId}`, optional deterministic event plan, competing invitation invalidation, sender Activity notification and optional push | Recipient-only, idempotent, and rate-limited. Acceptance repeats eligibility and safety checks. A booked sender receives the event plan immediately; an eligible unbooked sender receives one short-lived companion hold and no conversation until canonical checkout succeeds. |
| `cancelCrossPathsInvitationOrPlan` | Callable | Explore/profile preview, invitation detail, event-plan chat | Pending cancellation or accepted invalidation, event-plan closure, and optional pair-hold release | Participant-scoped, idempotent, and rate-limited. A sender may cancel pending intent; either participant may close an accepted plan or hold. Confirmed event participation remains canonical; pair inventory accounting is released without changing waitlist rank. |
| `expireCrossPathsInvitations` | Scheduled every 15 minutes | Backend | Pending `crossPathsInvitations` whose `expiresAt` has elapsed | Bounded server-owned expiry transition; requires the `status + expiresAt` index and does not touch accepted plans. |
| `expireCrossPathsPairHolds` | Scheduled every 5 minutes | Backend | Active `crossPathsPairHolds` whose `expiresAt` has elapsed plus event held aggregates and invitation state | Bounded, idempotent release. Returns the reserved companion seat, records `hold_expired`, and never cancels the already confirmed attendee or moves either member on a waitlist. |
| `onCrossPathsParticipationWritten` | Firestore trigger on `eventParticipations/{participationId}` | Backend | Invitations and accepted event plans for the member/event | Loss of `signedUp` state invalidates pending invitations and closes accepted plans without changing canonical booking counters. |
| `onCrossPathsConsentWritten` | Firestore trigger on `eventCrossPathsConsents/{consentId}` | Backend | Pending invitations for the member/event | Defense-in-depth for consent writes outside the callable. Revocation invalidates pending invitations but deliberately preserves explicitly accepted plans. |
| `onCrossPathsEventWritten` | Firestore trigger on `events/{eventId}` | Backend | Invitations and accepted event plans for the event | Event cancellation/unavailability invalidates pending invitations and closes accepted plans. |
| `onCrossPathsBlockCreated` | Firestore trigger on `blocks/{blockId}` | Backend | Invitations and event plans for the blocked pair | Immediately invalidates pending invitations and closes accepted event plans in addition to the existing dating-match safety closure. |
| `adminListCrossPathsShowcaseCandidates` | Admin callable | `/cross-paths` Admin review workspace and guarded CLI action | Reads bounded `publicProfiles/{uid}` pages plus server-only `crossPathsShowcaseEligibility/{uid}` | App-Check-protected, rate-limited, and role-gated to Admin, Admin Owner, Safety Reviewer, or Support. Returns only public profile evidence, coarse objective blockers, fingerprint, and effective review status. It returns no consent, roster, preference, popularity, or attractiveness score. |
| `adminSetCrossPathsShowcaseEligibility` | Admin callable | `/cross-paths` Admin review workspace and guarded CLI action | `crossPathsShowcaseEligibility/{uid}`, `adminAuditLogs/{id}`; reads `publicProfiles/{uid}` transactionally | App-Check-protected, rate-limited, and restricted to Admin, Admin Owner, or Safety Reviewer. Approval requires neutral objective readiness and all human checklist items, increments review version, binds the decision to the current SHA-256 profile fingerprint, and writes a coarse audit entry without profile media or private data. |
| `onSwipeCreated` | Firestore trigger on `profileDecisions/{uid}/outgoing/{targetId}` create | Backend | `matches/{matchId}` | Deterministic match ID; creates a match only for reciprocal likes. Writes `eventIds` so a match can track every shared event over time. If a legacy pair-only id is occupied by a `clubHostInquiry`, the dating match uses a separate deterministic opaque id so organizer-support messages can never be converted into dating chat history. |
| `onMatchCreated` | Firestore trigger on `matches/{matchId}` create | Backend | `notifications/{uid}/items/{notificationId}`, FCM | Writes deterministic match activity notifications for both participants and sends push notifications when tokens exist. |
| `onMessageCreated` | Firestore trigger on `matches/{matchId}/messages/{messageId}` create | Backend | `matches/{matchId}`, `functionEventReceipts/{receiptId}`, FCM | Receipt prevents duplicate metadata writes/fan-out; unread is a 0/1 conversation flag and the sender's flag clears. No separate Activity item. App-role routing distinguishes customer inquiries (Host) from Host replies and personal chats (Consumer). Only dating matches refresh Event Success scorecards or emit participant chat-signal facts. |
| `moderateChatMessage` | Firestore trigger on match-scoped message create | Backend | `matches/{matchId}/messages/{messageId}`, `moderationFlags/{id}` | Deterministic moderation flag for blocked/flagged text. |
| `moderatePhotoOnUpload` | Storage trigger | Backend | `moderationFlags/{id}`, `users/{uid}.profilePhotos`, Storage delete | Deletes unsafe uploaded profile photos and removes the matching grouped photo from the private profile. |
| `createEventReview` | Callable | `ReviewsRepository.addReview` | `reviews/{eventId~uid}` | Attended-event review create. Server verifies the `eventParticipations/{eventId_uid}` edge, derives public reviewer name with the shared profile projection helper, and writes the deterministic review doc. |
| `updateEventReview` | Callable | `ReviewsRepository.updateReview` | `reviews/{reviewId}.rating/comment/updatedAt` | Author-only review edit. |
| `deleteEventReview` | Callable | `ReviewsRepository.deleteReview` | `reviews/{reviewId}` delete | Author-only review delete. `syncClubReviewStats` recomputes aggregate rating/count after deletion. |
| `syncClubReviewStats` | Firestore trigger on `reviews/{reviewId}` write | Backend | `organizers/{organizerId}.rating/reviewCount/verifiedReviewCount` plus legacy shadow | Compatibility-named trigger that queries `reviews.organizerId`; duplicate delivery is safe. |
| `blockUser` | Callable | `SafetyRepository.blockUser` | `blocks/{blocker}__{target}`, `matches/{matchId}` status | Rate-limited before writes; backend-owned safety edge and match closure. |
| `unblockUser` | Callable | `SafetyRepository.unblockUser` | `blocks/{blocker}__{target}` delete | Rate-limited before delete; removes directed block edge. |
| `onBlockCreated` | Firestore trigger on `blocks/{blockId}` create | Backend | `matches/{matchId}` status | Secondary safety guard to close matches after block edge writes. |
| `reportUser` | Callable | `SafetyRepository.reportUser` | `reports/{autoId}` | Bounded report payload. |
| `requestAccountDeletion` | Callable | `SafetyRepository.requestAccountDeletion` | `deletedUsers/{uid}`, `users/{uid}`, `publicProfiles/{uid}`, `onboarding_drafts/{uid}`, `organizerCommunicationPreferences`, `organizerCommunicationPermissionReceipts`, contact-origin actor redaction, `eventAttendees` and organizer-audience identity links/claims, `crossPathsShowcaseEligibility/{uid}`, Storage deletes, Auth delete, relationship cleanup across memberships, participations, Cross Paths consents/exposures/invitations/pair holds/event plans, saved events, profile decisions, matches, reviews, payments, notifications, blocks, reports, and `eventBroadcasts` | Rate-limited before destructive work; backend-only account deletion/anonymization. Writes a processing tombstone before cleanup so notification fan-out cannot race deletion; clears the OTP onboarding seed and organizer channel grants and receipts, redacts the deleted actor UID from retained origin classification, unlinks retained operational roster/contact history from the deleted UID, removes UID identity evidence/claims, and clears both private Cross Paths preferences, consent edges, showcase eligibility, suggestion receipts, participant invitations, and active companion reservations, while existing match cleanup closes event plans. It also deletes host-authored broadcast receipts, removes a recipient's target identifier and delivery evidence, deletes original profile photos plus thumbnails, and uses relationship-doc queries instead of scanning parent arrays. |
| `joinWaitlist` | HTTP function | Marketing member waitlist, WhatsApp city-launch notice and Host application | `launchWaitlist/{emailHash}`, `launchWaitlist/whatsapp_{phoneCityKey}`, `marketingConversionEvents/{leadId}`, `salesInboundIntents/{intentId}` | A member may instead leave a phone for one WhatsApp message when their city opens: no name or email, one row per number and city, the launch notice and a separate off-by-default marketing choice each recorded with wording version and time (CAT-72); nothing is sent until CAT-16. Host receipt identity and intent are committed atomically; email-level membership is not Host acquisition authority. Exact retries retain the receipt and legacy Host enquiries are not recounted. Prepared server measurement binds an optional allowlisted attribution snapshot to that first receipt under current analytics consent; Host legacy mutable attribution is omitted. Public endpoint with CORS and IP rate limiting; request/response shapes are versioned under `contracts/http/`, generated into website and Functions types, and validated at both boundaries. |
| `onHostPilotCheckIn` | Firestore trigger | Canonical Host roster check-in | Private `hostOrganizerActivations/{organizerId}` | Requires a current staff-confirmed `hostPilotEventReviews` record, a published event and matching current checked-in roster. One private receipt per organiser; no attendee identity or provider export. |
| `onHostApplicationAccepted` | Firestore create trigger (runtime export pending) | New website `salesInboundIntents` receipt | Private `hostOperatorAlerts/{eventId}` | Default-off, explicit activation cutoff, one durable notice per new Host receipt. Excludes attendee/honeypot paths, legacy/repeated acquisitions, internal_qa_ submission IDs, [QA] names and reserved test email domains. Never delays intake. |
| `dispatchHostApplicationAlerts` | Scheduled function (runtime export pending) | Every minute, at most 20 sequential notices | Private `hostOperatorAlerts/{eventId}` | Rechecks live intake, sends only an Admin link to the fixed operator via the scoped Resend adapter. Five bounded throttle retries within 24h; unknown/interrupted sends never auto-retry. Terminal receipts remain for deduplication without contact/answer snapshots. Secret, runtime identity and activation require a reviewed release; no advertising consent is required for this operational staff notification. |
| `hostAcquisitionConsent` | HTTP function | Host website privacy choice at `/api/host-acquisition-consent` | Private `hostAcquisitionConsents/{capabilityHash}` | Default-disabled grants; versioned purpose, bounded request, exact-origin CORS and separate grant/withdrawal rate limits. Transactional replay preserves expiry, and withdrawal tombstones prevent delayed grants from restoring permission. No raw capability or contact data is stored or logged. |
| `expireHostAcquisitionConsent` | Scheduled function | Every 15 minutes | Expired private `hostAcquisitionConsents` and optional Host intake attribution | At most 500 records per collection per invocation. Attribution withdrawal/expiry removes only the optional snapshot, preserving operational intake. Each transaction rechecks current expiry so concurrent withdrawal extensions are retained. Does not depend on a separately configured TTL policy. |

## Direct Client Firestore Writes

| Dart initiator | Collection/path | Operation | Rule owner | Keep direct? |
|---|---|---|---|---|
| `UserProfileRepository.setUserProfile` | `users/{uid}` | Initial profile create after onboarding identity step. | Owner create plus full shape validation. | Yes. This is initial owner-owned profile creation. |
| `SavedEventRepository.watchSavedEvent` / `saveEvent` / `unsaveEvent` | `savedEvents/{uid_eventId}` | Render, save, or unsave one event for the current user. | Owner direct edge read/create/delete with deterministic ids. | Yes. No user-profile projection is maintained. |
| `FcmService._saveToken` | `users/{uid}/pushInstallations/{installationId}` plus legacy consumer `users/{uid}.fcmToken` | Store app-role scoped push tokens for side-by-side host/consumer installs; consumer attempts both representations independently so one rollout-era denial cannot suppress the other write. | Owner direct create/update of bounded push installation docs; legacy owner update of only `fcmToken`. | Yes. Runtime token update. |
| `OnboardingDraftRepository.saveDraft/deleteDraft`; first public OTP registration seed | `onboarding_drafts/{uid}` | Private draft set/delete; server creates a name/phone continuation seed only when no draft exists. | Owner-only direct access plus server callable ownership. | Yes. Private volatile draft state, never a public/Consumer profile by itself. |
| `LaunchAccessRepository.fetchApplication/watchApplication/submitApplication` | `accessApplications/{uid}` | Read the current user's application and create or revise editable application fields. | Owner-only path, strict field/enum/length shape, server timestamps, monotonic submission count, and editable-status boundary; review/cohort/activation fields remain Admin-SDK-owned. | Yes. One narrow owner-authored source document; review decisions remain callable-owned. |
| `SwipeRepository.recordSwipe` | `profileDecisions/{uid}/outgoing/{targetId}` | Create own outgoing profile decision. | Path/data identity, attended-event, block, and payload rules. | Yes. Match creation remains trigger-owned. |
| `ChatRepository.sendMessage` | `matches/{matchId}/messages/{id}` | Create text message. | Match participant create only. | Yes. Match preview/unread/moderation are trigger-owned. |
| `ChatController.sendImage` / `ChatRepository.sendImageMessage` | Storage `matches/{matchId}/images/*`, then `matches/{matchId}/messages/{id}` | Shared `ImageUploadRepository` picks/compresses/uploads the chat image; repository writes the image message. | Storage rules prove match participation from `user1Id`/`user2Id` with legacy `participantIds` fallback; message create rules prove active match participation before Firestore write. | Yes. Media picking/compression is centralized with profile/onboarding/event-club image upload policy. |
| `MatchRepository.resetUnread` | `matches/{matchId}.unreadCounts.{uid}` | Reset own unread count to zero. | Participant narrow update. | Yes. |
| `EventSuccessRepository.savePlan` | `eventSuccessPlans/{eventId}` | Revision-checked partial update of setup-owned plan fields before the event is live. | Host-only setup update; participant activity, event start, live status, or `frozenAt` freezes setup fields. | Yes. The transaction rejects stale/frozen plans and never overwrites live-control fields. |

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

## Paid host membership operations

Paid host memberships ([spec](plans/host_memberships_spec.md)) are entirely
server-owned; clients write nothing.

- `manageHostMembershipProgram` (manager) snapshots the organizer owner's ready
  Route account and requires `feeBasisPoints.hostMembership` in the pinned
  platform config before enabling. Billing pause/resume only records intent;
  `processHostMembershipBillingPause` pages through members with the provider.
- `manageHostMembershipPlans` (manager) owns `hostMembershipPlans`; publishing
  creates one immutable Razorpay plan per interval and price revision.
- `manageHostMembershipCheckout` (member) reserves cap capacity with an open
  checkout, creates the Razorpay subscription and returns its hosted
  authorization link; `refresh` pulls provider state.
- `hostMembershipRazorpayWebhook` verifies the HMAC, account, project and
  Catch notes, writes a create-once receipt and is, with checkout refresh,
  self-serve and billing pause, the only path into
  `membershipStore.applySubscriptionSnapshot` — the single writer of
  `hostMemberships` and member counters. Foreign or unknown payloads write
  nothing.
- Each `subscription.charged` payment is recorded in `hostMembershipCharges`
  and split with a payment-level Route transfer under a lease;
  `reconcileHostMembershipCharges` retries with read-before-resend recovery.
- `manageEventMembershipRules` (manager) owns `eventMembershipRules`, outside
  `eventPolicy`. `getEventViewerState`, `signUpForFreeEvent` and
  `managePublicEventCheckout` evaluate it through
  `hostMemberships/entitlement.ts` after the policy quote; the free and public
  paid paths record `hostMembershipBenefitUses`, and `cancelEventSignUp`
  releases them.
- `onHostMembershipAudienceProjected` and the daily
  `refreshHostMembershipSegments` project memberships onto linked organizer
  contacts (CRM definition version 4).
- `requestAccountDeletion` cancels a deleted member's live subscriptions
  immediately, then erases membership, checkout and benefit-use roots.

## Backend-Owned Collections And Fields

| Path/field | Owner | Client rule |
|---|---|---|
| `publicProfiles/{uid}` | `syncPublicProfile` trigger | Read-only to clients. |
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
| `organizerAttentionItems/{attentionId}` | Host Today read-through attention reconciliation | Server-only evaluated projection. The policy catalog owns predicates; the row stores bounded provenance, urgency, destination, and resolution state. Managers receive sanitized callable results, and unsupported kinds remain explicit coverage gaps rather than inferred tasks. |
| `organizerForms`, `organizerFormDrafts`, `organizerFormVersions`, `organizerFormResponseDrafts`, `organizerFormResponses`, `organizerFormShareLinks` | Generic Host Forms lifecycle, respondent runtime, and share callables | Server-only. Managers receive bounded projections, drafts use optimistic revisions, public identities grant no Firestore access, published versions and responses are immutable snapshots, and source tokens grant attribution only. |
| `organizerApplicationForms`, `organizerApplicationFormVersions`, `organizerApplications`, `organizerApplicationResponses`, `organizerApplicationAssets`, `organizerApplicationSourceMappings`, `organizerApplicationImportReceipts` | Organizer application publishing, import, listing, detail and review callables | Server-only. Managers receive bounded callable projections; form versions and responses are immutable snapshots, receipts are idempotency evidence, and provider metadata never grants authority. |
| `participantIntakeProfiles`, `participantOrganizerDataGrants/{grantId}` | Authenticated participant form load/submission/revocation callables | Server-only contract boundary. Portable prefill stays private and separate from `users`; each native application/response grant records only exact submitted questions and canonical fields for the recorded purpose. Revocation changes only the grant timestamp and Host projection. Host imports write neither collection. |
| `eventStaffGrants/{eventId_uid}` | Event staff grant/revoke and authority guards | Direct client access denied. Staff receive only the event-scoped sanitized callable projection allowed by their unexpired, unrevoked permissions. |
| `eventSuccessPlans/{eventId}` live revision/publication fields | Event Success live-control callables and draft trigger | Active participants may read the plan, but direct clients cannot create or update backend-owned live metadata. Host setup writes use a narrow pre-live field set. |
| `eventPlanChanges/{sourceId}` | `updateEvent` and trusted operational-notice source reader | Server-only immutable revisions. Direct client reads and writes are denied; a source applies only to the latest event revision and a qualifying roster row that existed when it committed. |
| `eventAttendees/{attendeeId}` accountability fields | `setEventSuccessAccountabilityResolution` and live completion | Authorized Hosts may read the operational roster, but every direct write remains denied. Resolution is valid only for the exact current check-in timestamp. |
| `organizerEventSuccessLayouts/{organizerId_layoutId}` | Event Success layout callable | Organizer managers may get/list their reusable assets. Direct client writes are denied, and participants receive only the selected timestamp-free projection through a callable/runtime bootstrap. |
| `eventSuccessAssignmentDrafts/{eventId_moduleId_uid}` | Event Success rotation generator, override callable, and draft trigger | Event Host get/list only; direct client writes and participant reads are denied. |
| `eventSuccessPresence/{eventId_uid}` | `heartbeatEventSuccessPresence` callable | Direct client reads/writes are denied. Hosts use the server-clock summary callable instead of reading raw attendee heartbeat timestamps. |
| `eventSuccessLateArrivals/{eventId_uid}` | `resolveEventSuccessLateArrival` callable | Subject attendee and authorized Host may get the deterministic resolution. Lists and every direct client write are denied. |
| `eventSuccessConversationGraphs/{eventId_uid}` | Event Success conversation graph callables | Only the subject attendee may get the deterministic document. Hosts, other attendees, collection queries, and every direct client write are denied; Hosts receive only the numeric scorecard projection. |
| `eventSuccessUnitOutcomes/{eventId}` | `recordEventSuccessUnitOutcomes` callable | Event Host get only. Lists, attendee reads, and every direct client write are denied. |
| `eventSuccessStandings/{eventId}` | `recordEventSuccessUnitOutcomes` callable | Authorized Host, active participant, or ready external runtime identity may get the event projection. Lists and every direct client write are denied. |
| `eventInviteLinkSecrets`, `eventInviteTouches`, `eventShareIntents`, `eventInviteAttributions` | Invite bearer-token, measurement and verified-fact attribution callables/triggers | Server-only. Touch and intent evidence use TTL; raw tokens and immutable attribution facts are never directly exposed. |
| `organizerAudienceSummaries/{organizerId}` / `organizerAudienceProjectionReceipts/{receiptId}` | Audience projection and CRM summary callable | Server-only. Receipts require TTL on `expiresAt`; summaries expose only authorized aggregate responses. |
| `organizerClaimRequests/{requestId}` / `organizerScheduleLocks/{lockId}` | Organizer claim and scheduling callables | Server-only; direct client reads/writes denied. |
| `organizers/{organizerId}` writes | Organizer create/update/archive/delete, admin publishing, and projection triggers | Public read; direct client writes denied. |
| `organizers/{organizerId}/posts/{postId}` | `createOrganizerPost` callable | Authenticated clients can read; direct writes denied. |
| `organizerPostDeliveryOperations/{postId}` | `createOrganizerPost` callable and `dispatchPendingOrganizerFollowerUpdates` scheduler | Server-only lease, cursor, and aggregate receipt. Managers receive only sanitized counts through callable responses. |
| `organizerPostDeliveryRecipients/{receiptId}` | `createOrganizerPost` callable and `dispatchPendingOrganizerFollowerUpdates` scheduler | Server-only post-scoped, de-identified per-recipient evidence retained for 90 days through Firestore TTL. The deterministic receipt id hashes the post and UID together; no raw recipient UID or cross-post recipient key is retained. |
| Legacy `clubs`, `clubMemberships`, `clubHostClaims`, `clubClaimRequests`, and `clubScheduleLocks` | Compatibility callables/projections | Not valid authority for new behavior; retirement is migration-controlled. |
| `users/{uid}.deleted`, `deletedAt` | Account deletion callable | Direct client writes denied. |
| `organizers/{organizerId}.followerCount` | Organizer follow callable plus recompute trigger | Direct client writes denied. |
| `organizers/{organizerId}.rating`, `reviewCount`, `verifiedReviewCount` | review-stat trigger | Direct client writes denied. |
| `organizers/{organizerId}.nextEventAt`, `nextEventLabel` | Event callables plus next-event trigger | Direct client writes denied. |
| `organizers/{organizerId}.status`, archive fields, and type audit fields | Organizer mutation callables | Direct client writes denied. |
| `events/{eventId}.bookedCount`, `waitlistedCount`, `checkedInCount`, `genderCounts` | Booking, waitlist, attendance, payment callables | Direct client writes denied. |
| `events/{eventId}.status`, `cancelledAt`, `cancellationReason` | `createEvent` / `cancelEvent` / `deleteEvent` callables | Direct client writes denied. |
| `events/{eventId}.eventOrigin`, `runtimeAccess` | Event creation/runtime configuration callables | Server-owned immutable provenance and opaque runtime join configuration. Legacy absence is supported; direct client writes are denied. |
| `eventParticipations/{eventId_uid}` | Booking, waitlist, attendance, cancellation, account deletion callables. Event detail and shared event streams read only the current viewer's edge(s); authorized event hosts retain managed-roster access. `fetchSwipeCandidates` owns identified post-event discovery for the swipe deck, Event Recap, and attendee-avatar enrichment. | Direct client writes denied. Reads allow only the participant's own edge or an authorized host for that event; arbitrary authenticated roster enumeration is denied. |
| `eventRuntimeParticipants/{eventId_uid}` | Runtime claim/profile callables and later Event Success module operations | Owner get only by deterministic path; list and all direct writes denied. A ready edge grants event-scoped runtime use without synthesizing Consumer booking/network state. |
| `eventRuntimeDataRequests/{requestId}` / `eventRuntimeDataRequestReceipts/{receiptId}` | Required-data trigger, runtime bootstrap and profile submission | Server-only current request plus immutable exact-command receipt. Clients receive only the caller's bounded request through bootstrap; no direct reads, lists or writes. |
| `eventRuntimeClaimRequests/{eventId_uid}` | Runtime claim and Host decision callables | Authorized organizer managers may read their event's pending queue; all direct writes and claimant roster-detail reads are denied. |
| `eventCrossPathsConsents/{eventId_uid}` | `setCrossPathsEventConsent` callable | Caller may read only their own deterministic edge, including an own-edge constrained query that returns empty when no choice exists. Direct client writes and other-member reads are denied. |
| `crossPathsShowcaseEligibility/{uid}` | `adminSetCrossPathsShowcaseEligibility` callable and account-deletion cleanup | Server-only reviewed status, coarse reasons, versions, neutral checklist, and profile fingerprint. Every client read/write is denied; authorized reviewers use the sanitized Admin callable projection. |
| `eventMessagingBudgetDecisions/{decisionId}` | `adminDecideEventMessagingBudget` callable | Server-only finance review evidence. Direct access is denied even to signed-in Admin clients; the callable is the role, validation, revision and audit boundary. It is not a dispatch budget and grants no spending authority. |
| `eventMessagingBudgetDecisionReceipts/{receiptId}` | `adminDecideEventMessagingBudget` callable | Server-only immutable request receipt. It preserves exact replay after later decisions and contains no spending authority. |
| `eventMessagingBudgetApplicationReceipts/{receiptId}` | `adminApplyEventMessagingBudget` callable | Server-only immutable application receipt. It binds the exact decision and resulting paused event/sender-day ceiling hashes, records that the ceilings were staged, and fixes spending authority, dispatch authority, provider contact and worker activation to false. |
| `crossPathsSuggestionExposures/{exposureId}` | `getCrossPathsSuggestions` callable and account-deletion cleanup | Server-only session-idempotent exposure/fatigue receipt. Every client read/write is denied; it contains no roster projection or private preference value. `expiresAt` requires the environment's 30-day Firestore TTL policy. |
| `crossPathsPairHolds/{holdId}` | `respondCrossPathsInvitation`, canonical booking/payment fulfillment, lifecycle triggers, expiry scheduler, and account deletion | Participant-get-only, server-write-only companion reservation. `active` is not a booking; frozen quote, independent booking states, expiry/release, payment, and plan linkage remain callable-owned. List is denied and aggregate capacity lives on the event document. |
| `eventBroadcasts/{broadcastId}` | `sendEventBroadcast` callable and account-deletion cleanup | Server-only operational receipt. Direct client reads and writes are denied; clients receive only sanitized callable response counts. `expiresAt` requires a 90-day Firestore TTL policy. |
| `organizerBroadcastSummaries/{broadcastId}` | `sendEventBroadcast` and `listOrganizerCampaigns` | Server-only durable Announcement history projection. Direct client reads and writes are denied; manager callables expose bounded organizer/contact-scoped summaries without body or raw receipt evidence. |
| `hostAnalyticsSnapshots/{uid}_{scopeHash}` | `getHostAnalytics` callable and account-deletion cleanup | Server-only 15-minute response cache. Identity includes the authenticated uid, current authorized clubs, absolute local-day range, granularity, preset, and IANA timezone; direct client reads and writes are denied and `expiresAt` has a Firestore TTL policy. |
| `payments/{paymentId}` | Payment verification/cancel callables and native refund recovery | Direct client writes denied. Admission and payment commit atomically; cancellation/rejection intent fences repeat admission and freezes provider/charge/amount authority; only full confirmed return marks refunded. |
| `reviews/{reviewId}` writes | Review mutation callables plus review-stat trigger | Direct client writes denied. |
| `matches/{matchId}` create/status/preview/unread flags | Matching/message/block triggers plus `startClubHostConversation` | Direct client creation denied; only participant unread reset allowed. Dating matches use `eventIds` as shared-event history. Host inquiries are independently scoped by club, optional event, and participant pair; a general inquiry keeps `eventIds` empty and must never be inferred as event-specific. The current two-participant model is a personal contacted-host thread, not a team-shared organizer inbox. Dart reads legacy `eventId` while older seeded/live data is being cleaned up. |

## User Identity Projection Inventory

| Projection | Source | Sync owner | Repair / validation |
|---|---|---|---|
| `publicProfiles/{uid}.name`, `profilePhotos`, `activityPreferences`, and public profile fields | `users/{uid}` | `syncPublicProfile` | Firestore trigger plus `tool/data/validate_firestore_data.mjs` profile checks and `tool/data/recompute_public_profiles.mjs` repair. |
| `organizers/{organizerId}.hostName`, `hostAvatarUrl`, `hostProfiles[]` | `hostProfiles/{uid}` professional host profile | `createOrganizer` on create, organizer-team callables on manager changes, then `syncHostProfile` | Legacy club projections are updated during the compatibility window. |
| `reviews/{reviewId}.reviewerName` | Reviewer `users/{reviewerUserId}` | `createEventReview` on create, then `syncPublicProfile` on profile writes | `tool/data/recompute_review_author_profiles.mjs`; validator emits `reviewer-name-drift`. |
| `notifications/{uid}/items/{id}.actorName`, notification `title`/`body` with names | Event-time public profile at notification creation | Notification trigger/callable that created the event | Historical notification copy. Do not back-update unless product decides notifications should become live profile cards. |
| `matches/{matchId}.lastMessagePreview` | Latest message content | `onMessageCreated` | Message-content preview snapshot, not a user profile projection. |
| `eventParticipations/{eventId_uid}.genderAtSignup`, `events/{eventId}.genderCounts` | User profile at booking/attendance time | Booking/attendance callables and aggregate repair tools | Signup-time constraint snapshot; do not rewrite after profile edits. `tool/data/repair_future_event_attendance.mjs` downgrades stale future-event `attended` edges to `signedUp`, fixes affected aggregates, and deletes invalid swipe artifacts. |
| `notifications/{uid}/items/{notificationId}` | Match/message triggers, create-event fan-out, host event update/cancellation/broadcast, and booking/cancellation callables now; remaining event producers should use the same backend-owned helper. | Owner can read own items and update only `readAt`; client create/delete/content edits are denied. |
| `blocks/{blockId}` | Safety callables | Direct client writes denied. |
| `reports/{reportId}` | Safety callable | Direct client writes denied. |
| `moderationFlags/{id}` | Moderation triggers | Direct client writes denied. |
| `deletedUsers/{uid}` | Account deletion callable | Direct client writes denied. |
| `rateLimits/{key}` | Rate-limit helper | Direct client writes denied. |
| `functionEventReceipts/{id}` | Idempotent triggers | Direct client writes denied. |

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
| Event signup | `signUpUserForEvent` via `signUpForFreeEvent` and `verifyRazorpayPayment` | Yes, deterministic `runSignup_${eventId}` item for the booked user. | No; this is normally caused by the user's active booking action. | Implemented. |
| Waitlist promotion | `signUpUserForEvent` when a waitlisted user books, and `cancelEventSignUp` when a cancellation promotes the first eligible waitlisted user. | Yes, deterministic `waitlistPromotion_${eventId}` item for the promoted user. | Yes when promotion happens from another user's cancellation, `prefsRunStatusUpdates != false`, and token exists. | Implemented. |
| Event schedule/location change | `updateEvent` callable best-effort fan-out after the event update commits. | Yes, deterministic `eventUpdated_${eventId}` item for signed-up and waitlisted participants. | Yes when `prefsRunStatusUpdates != false` and token exists. | Implemented. |
| Host event broadcast | `sendEventBroadcast` callable from the event-scoped Host Inbox. | Yes, deterministic `eventUpdated_${broadcastId}` item for the server-resolved Booked or Prospective audience. | At most once when `prefsRunStatusUpdates != false` and a Consumer token exists; retries report unknown rather than duplicating a send. | Live. Every Host release verifies the production callable before archiving. |
| Event cancellation | `cancelEvent` callable best-effort fan-out after the event status update commits. | Yes, deterministic `eventCancelled_${eventId}` item for signed-up and waitlisted participants. | Yes when `prefsRunStatusUpdates != false` and token exists. | Implemented; exposed from Host Manage with confirmation and retained-history copy. |
| New event posted by followed organizer | `createEvent` callable best-effort fan-out after the event commits | Yes, deterministic `organizerUpdate_${eventId}` item for active followers, excluding the host. | Two-tier: activity for followers; push only when the follow preference and user preference allow it. | Implemented. |
| New follower post by followed organizer | `createOrganizerPost` callable plus retryable `dispatchPendingOrganizerFollowerUpdates` scheduler | Yes, deterministic `organizerUpdate_${postId}` item for active followers, excluding the host, deleted accounts, and blocked relationships, with `postId` routing metadata. | Two-tier: durable Activity for followers; preference-gated at-most-once push with accepted, failed, or unknown receipt state. | Live source; deployment required for the new retry scheduler. |

Match/message pushes resolve `users/{uid}/pushInstallations` by `appRole` and
deduplicate token addresses. Only Consumer may fall back to legacy `fcmToken`;
Host never uses that fallback. Explicit `prefsMessages: false` and
`prefsNewCatches: false` still suppress their respective categories. Host-only
recipients may lack a Consumer profile; absent message preferences default on.
Existing non-conversation producers are unchanged. Stable notification IDs,
recipient UID, app role and optional public/professional avatar metadata travel
in the push data for foreground validation and rendering. A per-trigger receipt
prevents repeated fan-out, but FCM remains best-effort, not guaranteed delivery.

When adding a new durable Activity producer, write the timeline item through
`functions/src/shared/notifications.ts`, keep IDs deterministic where the
source event has a stable ID, add Functions tests for duplicate delivery, add a
rules test if the client read/update contract changes, and extend
`tool/contracts/firestore_contract.json`.

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
occurrence, and a durable `automationDeliveryMessages` intent in one
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

| `getOrganizerEventSetupDefaults` | Callable | Current-manager projection of private event defaults. |
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
private server-only `organizerTrackingSettings` document stores validated Meta
Pixel and GA4 IDs, revision and private edit audit. Writes require a first-party
organizer or verified claim and the current revision. Direct client access is
denied. No OAuth grant, credentials, arbitrary JavaScript or GTM is accepted.

`readPublicOrganizerTrackingSettings` verifies published organizer eligibility,
canonical event ownership and published active events before returning a minimal
projection. Current immutable publication policy is disabled pending policy and
live integration review; IDs are never returned publicly. Canonical social,
singles/mixer and unknown event classifications remain excluded. Saving an ID
does not constitute connecting a provider or permission to transmit advertising
activity. These exports do not establish deployment or production enablement.


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
