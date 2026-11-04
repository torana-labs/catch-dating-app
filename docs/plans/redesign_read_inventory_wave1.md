---
doc_id: redesign_read_inventory_wave1
version: 1.0.0
updated: 2026-11-02
owner: redesign_programme
status: active
---

# Read Inventory For Host Wave 1

Every read the host wave-1 screens perform today, whether it is a Cloud Function
call or a Firestore listener, why, and what it would take to change it. Issue
[#1480](https://github.com/torana-labs/catch-dating-app/issues/1480), under P0
[#1461](https://github.com/torana-labs/catch-dating-app/issues/1461). Row 0.4 of
the redesign programme asks for it before the caching foundations
([#1323](https://github.com/torana-labs/catch-dating-app/issues/1323)) are sized.

This document reports facts and makes no recommendation. The owner decides the
default for redesigned screens, and the decision is recorded in
`catch-knowledge`. Everything was read from the code at commit
`6fb4785b15b2e5f9c86646432e7bc270ad0eddad`; the appendix lists how to re-run it.

## The two ways a screen can read

### A listener

The phone opens a subscription to a Firestore document or query. The first time,
Firestore sends the documents and the phone keeps a copy on disk. After that, any
change arrives by itself, and reopening the screen shows the saved copy at once
while the phone checks for changes. Nobody has to ask again.

Security rules decide who may read. Rules see a whole document: they can refuse
it, but they cannot hide one field inside it. So a listener can only show what the
person is allowed to see in full.

### Asking a Function

The phone calls a Cloud Function, called a callable here, and gets one answer. The
Function runs on the server, so it can join many collections, hide fields, add
things up and use secrets. The answer is a snapshot: it does not change until the
phone asks again, and the phone has to keep its own copy if it wants one. Today
most screens keep none, so reopening the screen asks again. That repeated asking,
and the wait it causes, is the reason the caching contract in #1323 exists.

A third shape appears in this table: a one-shot `.get()`, which reads Firestore
directly and once. It costs no Function but also does not update by itself.

### A read model joins the two

A read model is a document a Function writes ahead of time, holding exactly what a
screen shows and nothing private. The screen listens to that document. The joining
and hiding still happen on the server, but when the data changes rather than when
the screen opens. `functions/src/hostReadModels` already does this for contacts,
forms, unpublished events, groups and responses.

### What each one costs in this codebase

| Cost | Listener | Callable | Read model (listener plus writer) |
|---|---|---|---|
| Waiting on a cold server | None. Firestore is always on | A cold Function costs about 8 s. There are no minimum instances (0 hits for `minInstances` in `functions/src`) and the budget is zero. Production medians: Host People 1.57 s, CRM summary 4.07 s, Groups 6.22 s, Forms 6.99 s, and 7.54 s when a request overlaps a cold start (#1047, quoted in the caching contract) | None for the reader. The writer has cold starts too, but no person is waiting on the screen |
| Security rules | Each collection read for the first time needs a new `match` block and rule tests. `firestore.rules` is 3,228 lines. Each rule that looks up an organizer or event is billed as extra document reads | None. The Function checks authority in code | One new `match` block per view, using helpers that already exist |
| Writes | None added | Most wave-1 callables also run a rate-limit transaction, a read and a write on `rateLimits`, on every call. Four use an in-memory limiter instead | A trigger on every source collection. `hostReadModels/triggers.ts` has 15 of them at 512 MiB with retries. One write can fan out: a tag vocabulary change pages through every contact |
| Staleness | Shows changes within moments, but only when a document is written. Anything that depends only on the clock, such as "this item is now due", needs the client's clock or a timed job | Exactly as fresh as the last time it asked, and the answer is computed at server time | Behind the source by the time the trigger takes. `docs/data_contracts.md` calls these "server-maintained views with eventual updates" |
| Offline | Works. `persistenceEnabled: true` in `lib/app_bootstrap.dart`; a listener serves the disk copy and catches up later | Fails. The caching contract records that assistance views are online-only | Works, if read with a listener. Today's `HostSummaryReader` forces `Source.server`, so today's read models do not work offline |
| Private data on the device | Stored on disk. The caching contract records that every account on a device shares this cache, sign-out does not clear it, and rules are not checked against it | Held in memory only | Stored on disk, like any listener |
| Command fences | A write command that needs a hash the server computed cannot get one from a plain document | The read returns `sourceHash` and the command echoes it. Most live console sheets work this way | The writer must compute and store the hash too |

## Summary counts

There are **71 reads** across the seven wave-1 screens. The same backend read
can appear on more than one screen, so there are **51 distinct
backend reads**: 26 callables, 17 listeners,
6 one-shot reads and 2 one-shot reads with a callable
fallback. The table counts one row per read per screen.

**How each screen reads today**

| Screen | Reads | Callable | Listener | One-shot `.get()` | `.get()` with callable fallback |
|---|---|---|---|---|---|
| Shell and navigation (3.0) | 4 | 0 | 3 | 1 | 0 |
| Today (3.1) | 7 | 2 | 2 | 2 | 1 |
| Create event (3.2) | 12 | 11 | 0 | 1 | 0 |
| Door (3.3) | 18 | 7 | 7 | 4 | 0 |
| Live console (3.4) | 23 | 14 | 7 | 1 | 1 |
| Insights (3.5) | 1 | 1 | 0 | 0 | 0 |
| Event report (3.5) | 6 | 0 | 4 | 1 | 1 |
| **All wave 1** | **71** | **35** | **23** | **10** | **3** |

**Whether each read could be a listener**

| Screen | Already a listener | Could be now | After a rules change | With a new read model | No |
|---|---|---|---|---|---|
| Shell and navigation (3.0) | 3 | 1 | 0 | 0 | 0 |
| Today (3.1) | 2 | 3 | 1 | 1 | 0 |
| Create event (3.2) | 0 | 1 | 5 | 4 | 2 |
| Door (3.3) | 7 | 2 | 0 | 2 | 7 |
| Live console (3.4) | 7 | 2 | 0 | 11 | 3 |
| Insights (3.5) | 0 | 0 | 0 | 0 | 1 |
| Event report (3.5) | 4 | 2 | 0 | 0 | 0 |
| **All wave 1** | **23** | **11** | **6** | **18** | **13** |

The buckets mean:

- **Already a listener** (23): no change.
- **Could be now** (11): the data and the rules already allow it, so
  only client code changes.
- **After a rules change** (6): the document exists and holds what
  the screen shows, but rules deny clients.
- **With a new read model** (18): a server writer has to be built
  first.
- **No** (13): the reasons are below.

| Why not | Rows |
|---|---|
| dry run | C8, C12 |
| per-row rule | D8, L9 |
| secret or signed token | D9, D16 |
| external API | D12 |
| command handshake | D13, L14 |
| export | D17, D18 |
| server-only provider records | L22 |
| BigQuery and free date ranges | I1 |

**Among the 26 distinct callables today:** 2
could be a listener now, 3 after a rules change,
14 with a new read model, and 8
could not. `getEventAssistanceRuntimeConfig` is in two groups: its configuration
could move (L21) but its sender picker could not (L22).

**What is already a listener.** The door's core reads are: the event, the bookings,
the guest list with check-in state and pending claims (D2, D3, D4, D6, D7). So are
the run of show, the scores and the report scorecard (L1, L2, R1). The live console
has 14 callable rows. Two
load with the console (L3, L5). The rest run only when a host opens a sheet.

## Read models that would have to be added

14 would be needed to move every "with a new read model" row:
13 new collections, and `organizerAttentionItems`, which exists
but is written only during the read. The names are illustrative, not a design.
Each would follow the `hostReadModels` pattern: a trigger on each source, a
transaction that rereads current sources, and safe replay.

| Read model (names are illustrative) | Rows | What it holds | What would write it | Note |
|---|---|---|---|---|
| `organizerAttentionItems` | T3 | Open attention rows for one organizer | Triggers on the 12 sources in T3, plus a timed job for items that become due or expire with no write. Writers move out of the callable | Existing collection; today only the callable writes it during the read. Built in P1.8 (PR #1518) |
| `hostEventSetupViews` | C3, C4, C6, C9 | One event's setup, as the create flow shows it | Triggers on `events`, `eventSetupPreferences`, `organizers`, and the seven commitment collections (`eventAttendees`, `eventAttendeeImports`, `eventParticipations`, `eventWaitlistOffers`, `organizerEventOffers`, `payments`, `razorpayPendingOrders`) | Readiness depends on time: the client or a timed job has to re-evaluate it. Built in P1.8 (PR #1528) |
| `hostEventSetupDefaultViews` | C2, C5, C7, C11 | One organizer's event setup defaults, hashes included | Triggers on `organizerEventSetupDefaults` and `organizers` | Added in P1.8: rules cannot compute the reviewed-defaults hash that fences the defaults update and the first-save basics, so a rules change on `organizerEventSetupDefaults` was not enough. Built in P1.8 (PR #1528) |
| `hostEventRosterInsightViews` | D5 | One row of history and spend per guest, per event | Triggers on `eventAttendees`, `organizerContactEventEdges`, `organizerContacts`, `organizerContactTraits`, `payments` | One payment or contact change can touch rows on many events. Built in P1.8 (PR #1530) with `organizerSpendTotals` and `hostOrganizerSpendProjections` |
| `hostProviderSetupViews` | D11 | Provider connection status, no secrets | Triggers on `organizerProviderConnections`, `externalEventMappings` | Low write rate. Built in P1.8 (PR #1530) as `hostProviderConnectionViews`, with `externalEventMappings` readable by managers |
| `eventSuccessPresenceSummaries` | L3 | Present, likely gone and late guests for one event | Triggers on `eventSuccessPresence`, `eventParticipations`, `eventRuntimeParticipants`, `eventSuccessAssignmentDrafts`, `eventSuccessLateArrivals` | Heartbeats arrive every 30 s per guest: at 100 checked-in guests that is 200 writes a minute, each one a trigger run. State also depends on time. Not built: P1.8 (PR #1533) took the alternative below and opened `eventSuccessPresence` and `eventSuccessLateArrivals` to managers |
| `hostEventCaseViews` | L11 | Practical help requests, no safety cases | Triggers on `eventAssistanceCases`, `eventAttendees` (built with `events` and `organizers` too) | Filter on `owner` stays on the server. Built in P1.8 (PR #1533) |
| `hostEventDeliveryViews` | L12 | Message delivery status per message | Triggers on `eventAssistanceMessages`, `eventAssistanceGuests`, `eventAttendees`, `operationRuns`, `operationWorkItems` (built with `events` and `organizers` too) | Delivery receipts write often during a broadcast. Built in P1.8 (PR #1533) |
| `hostEventGroupProgressViews` | L13 | Departure state per group | Triggers on `eventAssistanceGroupProgress`, `events`, `eventSuccessPlans` | Group-lead access needs duties stored per group. Built in P1.8 (PR #1534) |
| `hostEventDepartureViews` | L15 | Past departures per group | Triggers on `eventAssistanceDepartureRosters`, `eventAssistanceCheckpoints`, `events`, `eventSuccessPlans` | Rosters are immutable once written. Built in P1.8 (PR #1534) |
| `hostEventCheckpointViews` | L16, L17 | Checkpoint report and visits | Triggers on `eventAssistanceCheckpoints`, `eventAssistanceDepartureRosters`, `eventAttendees`, `eventAssistanceGuests`, `eventAssistanceMemberships`, `operationWorkItems`, `eventStaffGrants`, `organizers`, `events`, `eventSuccessPlans` | Fence hash must be stored; group-lead access as above. Built in P1.8 (PR #1534) |
| `hostEventAccountabilityViews` | L18 | One guest's visit state | Triggers on `eventAttendees`, `eventAssistanceMemberships`, `eventAssistanceGuests`, `events`, `eventSuccessPlans` | One document per guest; fence hash stored. The checkpoint-scoped review reads the member entries of `hostEventCheckpointViews`. Built in P1.8 (PR #1538) |
| `hostEventMembershipViews` | L19 | One guest's group and handover options | Triggers on `eventAttendees`, `eventAssistanceGuests`, `eventAssistanceMemberships`, `eventStaffGrants`, `organizers`, `events`, `eventSuccessPlans` | One document per guest; fence hash stored; receivers keep their own authority instants. Built in P1.8 (PR #1538) |
| `hostEventAssistanceSettingViews` | L20 | Late-join setting, merged with its parent | Triggers on `eventAssistanceSettings`, `events` | Low write rate; fence hash stored. Built in P1.8 (PR #1538) |
| `hostEventRuntimeViews` | L21 | Automation configuration and status | Triggers on `eventAssistanceRuntimeConfigs`, `events`, `eventSuccessPlans`, `organizers` | Low write rate; the sender picker stays callable (L22). Built in P1.8 (PR #1538) |

Nothing has to be moved all at once. Any row can stay on its callable while the
others move, and `hostReadModels` already gates each model behind a per-organizer
marker with a backfill script.

## Collections newly exposed to client reads

Rules deny clients today on every existing collection named below.

**Rows that need only a rules change** open 3 collections:

| Collection | Rows | What a manager would newly read |
|---|---|---|
| `eventRehearsalMilestones` | T5 | `organizerId` and `completedAt`; built in P1.8 (PR #1528) |
| `organizerEventSetupDefaults` | C2, C5, C7, C11 | Private event defaults, already shown to managers through the callable. Not opened: the `hostEventSetupDefaultViews` read model replaced it, built in P1.8 (PR #1528) |
| `eventSetupPreferences` | C10 | Saved payment terms and preferences for one event. Not opened in P1.8: deferred to the events-convergence packet, decision Q |

**Rows that need a read model** open the 14 collections in the table
above and none of their sources. These sources stay closed: rules cannot hide a
field, and each one holds something a host should not read directly.

- `eventAssistanceCases` holds safety cases alongside practical ones.
- `organizerProviderConnections` holds `secretVersionResource`.
- `organizerContacts`, `organizerContactTraits` and `organizerContactEventEdges`
  hold restricted CRM data and identity evidence.
- `eventAssistanceMessages`, `eventAssistanceGuests`, `operationRuns` and
  `operationWorkItems` hold private operations state.
- `eventInviteLinkSecrets`, `hostRosterIntakeSessions` and
  `hostAnalyticsSnapshots` stay closed under every option.

**One alternative.** L3 could instead open `eventSuccessPresence` to managers and
compute present or departed on the phone, with no summary document. That listener
would receive one update per guest every 30 s. P1.8 took this route (PR #1533).

**Already readable, no rules work** (rows marked "could be now"):
`hostDirectorySummaries`, `hostFormSummaries`, `organizerEventSuccessLayouts`,
`events` (published list, single private event), `organizers`, `config/cities`
and the caller's own `eventStaffGrants` document.

**Rules work this implies:**

- One `match` block per collection: up to 17
  if every row moves (3 from rules-change rows, 14
  from read models).
- Manager-level views can reuse `isHostSummaryManager` (organizer scope) or
  `isOrganizerHostForEvent` (event scope). `hasActiveEventOperatorGrant` covers
  event-level staff permissions.
- **Group leads have no helper.** L13, L15, L16, L18 and L19 also serve staff with a duty
  on one group. `requireGroupPermission` checks a `groupDuties` array with an
  expiry and a source hash on each entry, which rules cannot search by field. A
  view for group leads needs duties stored per group, or stays manager-only.
- Rule tests (`npm run test:rules` in `functions`), a schema under
  `contracts/firestore`, any new indexes in `firestore.indexes.json`, and a
  section in `docs/data_contracts.md` per collection.

## Two scope statements for #1323

Row 1.3 of the programme says #1323 is sized by this decision. Both statements
assume the #1323 text as filed. The listeners already in the table stay listeners
under both.

### If wave 1 reads through listeners by default

The caching foundations must contain:

- `appClockProvider`. It matters more here: a listener never fires because time
  passed, so "now" for T1, T3, L3 and event phases comes from the shared clock.
- The one retry policy for transient errors, with the 17 per-provider opt-outs
  removed.
- Write-side invalidation in `Mutation.run`, for the reads that stay on
  callables, and removing the sixteen after-write invalidations that #1326 says
  tear down listeners that would have delivered the write.
- `CachePolicy`, `ref.retain`, cache tags and the `CACHE-*` rules, scoped to the
  reads that stay on callables.
- A decision on wiping the Firestore disk cache at sign-out. #1323 lists this as
  optional; under this option more personal data sits in that cache (guest names in
  the read models above).
- The contract text in `docs/app_architecture.md`.

Which reads stay on callables depends on how many read models are built:

- **Move with client or rules work only** (5 callables):
  `getEventOperatorAccess`, `getEventSuccessSpatialLayout`, `getEventRehearsalSummary`, `getOrganizerEventSetupDefaults`, `getEventOfferConfiguration`. P1.8 moved `getEventRehearsalSummary` (a direct read) and `getOrganizerEventSetupDefaults` (a read model, `hostEventSetupDefaultViews`); `getEventOfferConfiguration` is deferred to the events-convergence packet (decision Q).
- **Always stay**, because they could not move (8 callables):
  `previewEventOfferPreferences`, `createEventVenueSession`, `listOrganizerLumaEvents`, `manageHostRosterIntake`, `getEventInviteLinkToken`, `getEventAssistanceDepartureRoster`, `getEventAssistanceRuntimeConfig`, `getHostAnalytics`.
- **Until their read model lands** (14 callables):
  `listOrganizerAttentionItems`, `getPrivateEventSetup`, `getEventRosterInsights`, `getOrganizerProviderSetup`, `getEventSuccessPresenceSummary`, `listEventAssistanceCases`, `listEventAssistanceDeliveries`, `getEventAssistanceGroupProgress`, `listEventAssistanceDepartureRosters`, `getEventAssistanceCheckpoint`, `getEventAssistanceAccountability`, `getEventAssistanceMembership`, `getEventAssistanceSetting`, `getEventAssistanceRuntimeConfig`.

If the read models are not built before the live console PR (row 3.4), those
14 callables need lifetimes and tags like any other, so the
foundations do not shrink for the live console until they land. Under this option the work moves out
of #1323 and into 14 read models, up to 17
rules blocks with tests, and backfills. None of that is in #1323 or its lanes today.

### If wave 1 keeps callables

The caching foundations must contain everything #1323 lists: `appClockProvider`,
`CachePolicy` and the freshness table, `ref.retain` and `ref.retainForSession`,
typed cache tags with a session-scoped registry, `ref.providesTags`, write-side
invalidation in `Mutation.run`, one retry policy, the optional disk-cache wipe,
`fake_async` with the six-test harness, the seven provider-graph rules, and the
contract text.

The lanes then carry wave 1 as follows:

| Lane | Wave-1 rows it names | Rows |
|---|---|---|
| #1324 Audience and Forms | 3 | T4, L10, R6 |
| #1325 Reports | 5 | T1, T2, T3, T4, I1 |
| #1326 Event manage and roster writes | 19 | D2, D3, D4, D5, D6, D7, D14, D15, L1, L2, L4, L6, L7, L8, L23, R1, R2, R3, R5 |
| #1327 Live operations | 13 | L3, L11, L12, L13, L14, L15, L16, L17, L18, L19, L20, L21, L22 |
| #1328 Chat | 0 | — |
| #1329 Discovery | 0 | — |

#1328 and #1329 name no wave-1 read. **19 rows go through a
callable and no lane names them**, so they need a lane or an entry in the freshness
table: T5, C2, C3, C4, C5, C6, C7, C8, C9, C10, C11, C12, D9, D10, D11, D12, D13, D16, L5. The whole create flow is among
them. #1327 also names reads no host screen mounts (see below).

Two questions in the caching contract decide how the live console behaves under
this option: question 3 (may a host see cached rows marked "updating"?) and question
11 (host offline at the door). The contract records that roster and check-in already
work offline through listeners and the attendance outbox, and that assistance views
stay online-only. No server read models are added.

## The table

Rows are numbered S (shell), T (Today), C (create), D (door), L (live), I (insights)
and R (report). "Lane" says which of #1324 to #1329 names the read; "(group)" means
#1326's count of 17 Host event manage listeners includes it without naming it.

| Screen | Read (what the user sees) | Provider or repository method | Path today | Function source | Why a callable | Read-model document today? | Could be a listener? | Freshness today | Caching lane |
|---|---|---|---|---|---|---|---|---|---|
| S1 Shell | Inbox unread badge | `totalUnreadCountProvider` → `watchMatchesForUserProvider` → `MatchRepository.watchMatchesForUser` | `matches` where `user1Id` or `user2Id` is the user, `status` active, two `.snapshots()` queries merged | — | Not a callable | No separate document. `unreadCounts` on each match, written by `functions/src/matching/onMessageCreated.ts` | Already a listener | Realtime | None (#1328 moves the chat list, not this badge) |
| S2 Shell | Organizer avatar, name and switcher in the navigation | `hostOperableOrganizersProvider` → `watchOrganizersHostedByProvider`, `watchOrganizersOwnedByProvider` | `organizers`, two `Filter.or` queries (`hostUserId` or `hostUserIds`; `hostUserId` or `ownerUserId`), limit 30, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | None |
| S3 Shell | Own profile, read at the app root to detect location (no visible output) | `profileLocationInitializerProvider` (mounted by `MyApp`, no app-role guard) → `watchUserProfileProvider` | `users/{uid}` `.snapshots()` | — | Not a callable | No | Already a listener | Realtime, kept alive | None |
| S4 Shell | City catalog for the nearest city, only when the profile has no coordinates | `CityRepository.nearestCity` → `fetchCities` | `config/cities` `.get()` | — | Not a callable | No | Yes, now. A static catalog, so a listener would change nothing visible | Once | None |
| T1 Today | Featured event and later event cards | `hostTodayFeedControllerProvider` → `EventRepository.fetchActiveEventsPage` | `events` where `publicationState` published, `organizerId`, `status` active, `endTime` after the session boundary, limit 30, `.get()` | — | Not a callable | No. Private events are not on this list; `hostEventSummaries` covers them for the Events tab | Yes, now. Rules allow listing published events. The query uses a fixed session boundary, so "which events are current" still needs a clock | On open, on return to Today, on app resume | #1325 names Today's hand-written re-entry and resume refresh |
| T2 Today | Whether past events exist (changes the empty state) | `hostTodayFeedControllerProvider` → `EventRepository.fetchPastEventsPage` | `events` where `publicationState` published, `organizerId`, `status` active, `endTime` before the boundary, limit 30, `.get()` | — | Not a callable | No | Yes, now. Only a yes/no is used | On open, on return to Today, on app resume | #1325 (same refresh) |
| T3 Today | Attention queue | `hostTodayFeedControllerProvider` → `HostAttentionRepository.fetch` | Callable `listOrganizerAttentionItems` | `functions/src/organizers/organizerAttention.ts`, `organizerAttentionPolicy.ts` | Aggregates, computes and hides. Reads 12 sources (`organizers`, `events`, `eventParticipations`, `eventAssistanceCases`, `operationWorkItems`, `organizerApplications`, `providerSyncRuns`, `organizerFormAutomationRules`, `organizerFormAutomationRuns`, `organizerMomentSends`, `organizerEventOffers`, `hostPaymentAccounts`), derives items from the current time, and writes `organizerAttentionItems` during the read. It reduces private Operations rows to safe facts | `organizerAttentionItems` exists, but only this callable writes it and rules deny clients. Not usable as a read model today; built in P1.8 (PR #1518) | Yes, new read model. It needs triggers on the 12 sources plus a timed job, because items become due or expire with no write | On open, on return to Today, on app resume | #1325 names `listOrganizerAttentionItems` |
| T4 Today | Audience step of the roadmap | `hostCrmSummaryProvider` → `HostContactsRepository.getSummary` | `hostDirectorySummaries/{organizerId}` `.get(Source.server)`; falls back to callable `getOrganizerCrmSummary` until `contactSummaryVersion` is 1 | `functions/src/organizers/organizerCrm.ts` (fallback) | The fallback aggregates. It reads `organizerAudienceSummaries`, and when coverage is not exact it scans `eventAttendees` and `organizerCommunicationPreferences`. Rules deny the projection and the contact data | `hostDirectorySummaries/{organizerId}`, written by `functions/src/hostReadModels/contactStore.ts` via the contact triggers | Yes, now. Rules already allow managers to `get` this document | On open, on return to Today | #1324 and #1325 name `getOrganizerCrmSummary` and CRM counts |
| T5 Today | Rehearsal step of the roadmap | `hostTodayRehearsalCompletionProvider` → `EventRehearsalRepository.hasCompletedRehearsal` | Callable `getEventRehearsalSummary` | `functions/src/eventRehearsal/summary.ts` | Hides fields. Reads `eventRehearsalMilestones/{organizerId}`, then a legacy query on `eventRehearsals`, and returns one boolean ("without returning sessions or roster identity") | `eventRehearsalMilestones/{organizerId}` (fields `organizerId`, `completedAt`), written by `functions/src/eventRehearsal/handlers.ts`. Rules deny clients; built in P1.8 (PR #1528) | Yes, after a rules change on `eventRehearsalMilestones`. The milestone holds no private data. The legacy fallback would be dropped under the pre-launch wipe | On open, on return to Today | None |
| T6 Today | Payouts step of the roadmap (owner only) | `watchHostPaymentAccountsProvider` | `hostPaymentAccounts` where `userId` is the user, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | None |
| T7 Today | Which organizer Today is scoped to | `hostOperableOrganizersProvider` (same listeners as S2) | `organizers`, two `Filter.or` queries (`hostUserId` or `hostUserIds`; `hostUserId` or `ownerUserId`), limit 30, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | None |
| C1 Create | Organizer for the route | `fetchOrganizerProvider` | `organizers/{id}` `.get()`, skipped when the route passes an `Organizer` as `extra` | — | Not a callable | No | Yes, now. Rules allow `get` on an organizer | On open | None |
| C2 Create | Basics step: organizer defaults | `PrivateEventCreateScreen.readOrganizerDefaults` → `ManagerEventSetupDefaultsRepository.get` | Callable `getOrganizerEventSetupDefaults` | `functions/src/organizers/eventSetupDefaults/callables.ts`, `service.ts` | Hides fields and computes. A transaction reads `organizers`, `deletedUsers`, `organizerEventSetupDefaults`; it adopts a legacy timezone once and hashes the result (`preferencesHash`). Rules deny the defaults document | None. The source is `organizerEventSetupDefaults/{organizerId}`; built in P1.8 (PR #1528) | Yes, after a rules change on `organizerEventSetupDefaults`. The update command needs `preferencesHash`, so the hash must move onto the document or the fence must change | On open of the step | None |
| C3 Create | Basics step: the saved event, when resuming | `CreateEventDraftController.getPrivateEventSetup` → `PrivateEventSetupRepository.get` | Callable `getPrivateEventSetup` | `functions/src/events/progressiveSetup/callables.ts`, `readModel.ts`, `commitments.ts` | Computes and joins. One transaction reads `organizers`, `deletedUsers`, `events`, `eventSetupPreferences` and one row each from the commitment collections, then computes `canEditBasics` and `publicationReadiness` from server time. Rules deny `eventSetupPreferences`, and the client `Event` model cannot decode a basics-only event | None for one event. `hostEventSummaries/{eventId}` holds only a list row; built in P1.8 (PR #1528) | Yes, new read model. Readiness depends on time, so a writer alone does not keep it true | On open of the step | None |
| C4 Create | Details step: event | `PrivateEventDetailsController.load` → `PrivateEventSetupRepository.get` | Callable `getPrivateEventSetup` | `functions/src/events/progressiveSetup/callables.ts`, `readModel.ts`, `commitments.ts` | Computes and joins. One transaction reads `organizers`, `deletedUsers`, `events`, `eventSetupPreferences` and one row each from the commitment collections, then computes `canEditBasics` and `publicationReadiness` from server time. Rules deny `eventSetupPreferences`, and the client `Event` model cannot decode a basics-only event | None for one event. `hostEventSummaries/{eventId}` holds only a list row; built in P1.8 (PR #1528) | Yes, new read model. Readiness depends on time, so a writer alone does not keep it true | On open of the step | None |
| C5 Create | Details step: organizer defaults | `PrivateEventDetailsController.load` → `ManagerEventSetupDefaultsRepository.get` | Callable `getOrganizerEventSetupDefaults` | `functions/src/organizers/eventSetupDefaults/callables.ts`, `service.ts` | Hides fields and computes. A transaction reads `organizers`, `deletedUsers`, `organizerEventSetupDefaults`; it adopts a legacy timezone once and hashes the result (`preferencesHash`). Rules deny the defaults document | None. The source is `organizerEventSetupDefaults/{organizerId}`; built in P1.8 (PR #1528) | Yes, after a rules change on `organizerEventSetupDefaults`. The update command needs `preferencesHash`, so the hash must move onto the document or the fence must change | On open of the step | None |
| C6 Create | Preferences step: event | `PrivateEventPreferencesController.load` → `PrivateEventSetupRepository.get` | Callable `getPrivateEventSetup` | `functions/src/events/progressiveSetup/callables.ts`, `readModel.ts`, `commitments.ts` | Computes and joins. One transaction reads `organizers`, `deletedUsers`, `events`, `eventSetupPreferences` and one row each from the commitment collections, then computes `canEditBasics` and `publicationReadiness` from server time. Rules deny `eventSetupPreferences`, and the client `Event` model cannot decode a basics-only event | None for one event. `hostEventSummaries/{eventId}` holds only a list row; built in P1.8 (PR #1528) | Yes, new read model. Readiness depends on time, so a writer alone does not keep it true | On open of the step | None |
| C7 Create | Preferences step: organizer defaults | `PrivateEventPreferencesController.load` → `ManagerEventSetupDefaultsRepository.get` | Callable `getOrganizerEventSetupDefaults` | `functions/src/organizers/eventSetupDefaults/callables.ts`, `service.ts` | Hides fields and computes. A transaction reads `organizers`, `deletedUsers`, `organizerEventSetupDefaults`; it adopts a legacy timezone once and hashes the result (`preferencesHash`). Rules deny the defaults document | None. The source is `organizerEventSetupDefaults/{organizerId}`; built in P1.8 (PR #1528) | Yes, after a rules change on `organizerEventSetupDefaults`. The update command needs `preferencesHash`, so the hash must move onto the document or the fence must change | On open of the step | None |
| C8 Create | Preferences step: what the settings would do | `EventOfferPreferencesRepository.preview` | Callable `previewEventOfferPreferences` | `functions/src/organizerEventOffers/callables.ts` | Needs server trust. Source comment: "Read-only review uses exactly the same resolver and fences as saving". It is a dry run of a command, not stored data | None | No. It evaluates an unsaved draft, so there is no document to listen to | On each review | None |
| C9 Create | Publication step: event and readiness | `EventPublicationController` → `PrivateEventSetupRepository.get` | Callable `getPrivateEventSetup` | `functions/src/events/progressiveSetup/callables.ts`, `readModel.ts`, `commitments.ts` | Computes and joins. One transaction reads `organizers`, `deletedUsers`, `events`, `eventSetupPreferences` and one row each from the commitment collections, then computes `canEditBasics` and `publicationReadiness` from server time. Rules deny `eventSetupPreferences`, and the client `Event` model cannot decode a basics-only event | None for one event. `hostEventSummaries/{eventId}` holds only a list row; built in P1.8 (PR #1528) | Yes, new read model. Readiness depends on time, so a writer alone does not keep it true | On open of the step | None |
| C10 Create | Offer preferences: saved terms | `EventOfferPreferencesController.load` → `EventOfferPreferencesRepository.get` | Callable `getEventOfferConfiguration` | `functions/src/organizerEventOffers/callables.ts`, `eventOfferService.ts` | Computes and hides. A transaction checks the manager, reads the event and `eventSetupPreferences`, and computes `suggestedExpiresAtMillis` from server time. Rules deny `eventSetupPreferences` | None. The source is `eventSetupPreferences/{eventId}`. Not built in P1.8: deferred to the events-convergence packet, decision Q | Yes, after a rules change on `eventSetupPreferences`. The suggested expiry would move to the client clock | On open | None |
| C11 Create | Offer preferences: organizer defaults | `EventOfferPreferencesController.load` → `ManagerEventSetupDefaultsRepository.get` | Callable `getOrganizerEventSetupDefaults` | `functions/src/organizers/eventSetupDefaults/callables.ts`, `service.ts` | Hides fields and computes. A transaction reads `organizers`, `deletedUsers`, `organizerEventSetupDefaults`; it adopts a legacy timezone once and hashes the result (`preferencesHash`). Rules deny the defaults document | None. The source is `organizerEventSetupDefaults/{organizerId}`; built in P1.8 (PR #1528) | Yes, after a rules change on `organizerEventSetupDefaults`. The update command needs `preferencesHash`, so the hash must move onto the document or the fence must change | On open | None |
| C12 Create | Offer preferences: what the settings would do | `EventOfferPreferencesRepository.preview` | Callable `previewEventOfferPreferences` | `functions/src/organizerEventOffers/callables.ts` | Needs server trust. Source comment: "Read-only review uses exactly the same resolver and fences as saving". It is a dry run of a command, not stored data | None | No. It evaluates an unsaved draft, so there is no document to listen to | On each review | None |
| D1 Door | Organizer for the route | `HostEventManageRouteScreen` → `fetchOrganizerProvider` | `organizers/{id}` `.get()` | — | Not a callable | No | Yes, now. Rules allow `get` on an organizer | On open | None |
| D2 Door | Event for the route | `HostEventManageRouteScreen` → `watchEventProvider` | `events/{id}` `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 names the Host event manage listeners as a group |
| D3 Door | Booked count and capacity | `watchEventParticipationRosterProvider` | `eventParticipations` where `eventId`, `status` in visible statuses, limit 1000, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| D4 Door | Guest list with check-in state | `watchEventAttendeesProvider` | `eventAttendees` where `eventId`, limit 1000, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime, but roster writes invalidate it (#1326 counts these) | #1326 (group, and names the after-write invalidations) |
| D5 Door | Roster insight chips (returning guests, spend, member signal) | `hostEventRosterInsightsProvider` → `HostContactsRepository.getEventRosterInsights` | Callable `getEventRosterInsights` | `functions/src/organizers/eventRosterInsights.ts` | Joins, aggregates and hides. Reads `events`, `eventAttendees`, `organizerContactEventEdges`, `organizerContacts`, `organizerContactTraits`, and `payments` across all the organizer's events. Rules deny all the CRM collections. Manager only | None | Yes, new read model per event, rewritten on contact, trait, edge, attendee and payment changes. It would have to hold spend per guest | On open, and after each roster write | #1326 names roster insights as a function read to tag. Built in P1.8 (PR #1530) |
| D6 Door | Pending guest claims to approve (during the event) | `watchPendingEventRuntimeClaimsProvider` | `eventRuntimeClaimRequests` where `eventId`, limit 1000, `.snapshots()`, filtered on the client | — | Not a callable | No | Already a listener | Realtime, invalidated after each review | #1326 (group) |
| D7 Door | Booked guests list with requests and waitlist | `attendanceSheetViewModelProvider` → `watchEventParticipationsForEventProvider`, `watchEventProvider` | `eventParticipations` where `eventId`, `status` in visible statuses, limit 1000, `.snapshots()`, plus `events/{id}` `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| D8 Door | Names and photos in the booked guests list | `attendeeProfilesProvider` → `EventAttendeeLookup.fetchProfiles` | `publicProfiles/{uid}` one `.get()` per person, in parallel | — | Not a callable | `publicProfiles` is itself a projection, written by the profile sync Function | No, by policy. `docs/data_contracts.md` Read Path Discipline forbids one listener per tile. It stays a one-shot Firestore read, no Function needed | On open | None |
| D9 Door | Check-in QR code (external-booking events with a web runtime) | `eventVenueSessionProvider` → `EventRepository.createVenueSession` | Callable `createEventVenueSession` on a timer | `functions/src/events/venueSessions.ts` | Needs server trust. It signs a short-lived token with a server secret after a manager check | None | No. The token cannot be computed or stored for a client to read | Timed, on `refreshAfterMillis` (1 s to 240 s) | None |
| D10 Door | Staff door: what this person may do | `hostEventOperatorAccessProvider` → `HostEventStaffRepository.getAccess` | Callable `getEventOperatorAccess` | `functions/src/events/eventStaff.ts` | None apparent beyond a role calculation. Reads `events`, `organizers` and the caller's `eventStaffGrants` document and returns the role and permissions. Rules enforce the same authority on the roster itself | None | Yes, now, from three documents the rules already allow. The role calculation moves to the client | On open | None |
| D11 Door | Guest sources: connected booking provider (before the event) | `HostOperationalRosterController.getProviderSetup` → `HostProviderRepository.getSetup` | Callable `getOrganizerProviderSetup` | `functions/src/organizers/organizerProviderSetup.ts` | Hides fields. Reads `organizerProviderConnections` and `externalEventMappings` and copies out a safe subset, leaving out `secretVersionResource` | None | Yes, new read model. Rules cannot hide one field of a document, so the connection document cannot be opened as is | On open of guest intake | None. Built in P1.8 (PR #1530) |
| D12 Door | Guest sources: pick a Luma event | `HostOperationalRosterController.listLumaEvents` | Callable `listOrganizerLumaEvents` | `functions/src/organizers/organizerProviderSetup.ts` | Needs server trust. It calls the Luma API with the API key the host typed | None | No. The data is at Luma, not in Firestore | On demand | None |
| D13 Door | Guest sources: resume an uploaded roster | `HostOperationalRosterController.resumeRosterIntake` → `HostRosterIntakeRepository.resume` | Callable `manageHostRosterIntake` (resume action) | `functions/src/events/hostRosterIntakeApply.ts` | Hides fields. `hostRosterIntakeSessions` holds uploaded evidence with private guest contact data; rules deny it. One callable handles start, resume, exclude and apply | None | No. It is one step of a server-owned command flow | On demand | None |
| D14 Door | Private access code (invite-only events, Manage shell) | `watchEventPrivateAccessProvider` | `eventPrivateAccess/{eventId}` `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| D15 Door | Named invite links (invite-only events, Manage shell) | `watchEventInviteLinksProvider` | `eventInviteLinks` where `eventId`, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime, invalidated after each link change | #1326 (group) |
| D16 Door | Copy a named invite link | `EventRepository.getInviteLinkToken` | Callable `getEventInviteLinkToken` | `functions/src/events/inviteLinks.ts` | Hides fields. The token is in `eventInviteLinkSecrets`, which rules deny to everyone | None | No. The secret must stay off the client until asked for | On tap | None |
| D17 Door | Ops and revenue export: participations | `HostEventManageController` → `fetchHostReportParticipationsForEvent` | `eventParticipations` where `eventId`, `status` in report statuses, limit 1000, `.get()` | — | Not a callable | No | No, by policy. `docs/data_contracts.md` says explicit exports are one-shot | On tap | None |
| D18 Door | Ops and revenue export: names | `PublicProfileRepository.fetchPublicProfiles` | `publicProfiles/{uid}` one `.get()` per person, in parallel | — | Not a callable | `publicProfiles` is itself a projection, written by the profile sync Function | No, by policy. Part of the same one-shot export | On tap | None |
| L1 Live | Run of show and current step | `watchEventSuccessPlanProvider` | `eventSuccessPlans/{eventId}` `.snapshots()` | — | Not a callable | No | Already a listener | Realtime, invalidated after a step change | #1326 (group) |
| L2 Live | Scores and standings (score or rank formats) | `watchEventSuccessStandingsProvider` | `eventSuccessStandings/{eventId}` `.snapshots()` | — | Not a callable | Yes. This document is a read model, written by `functions/src/eventSuccess/unitOutcomes.ts` | Already a listener | Realtime | #1326 (group) |
| L3 Live | Room: who is present, likely gone, late | `watchEventSuccessPresenceSummaryProvider` → `EventSuccessRepository.fetchPresenceSummary` | Callable `getEventSuccessPresenceSummary` on a timer | `functions/src/eventSuccess/presence.ts`, `eventSuccessRoster.ts` | Aggregates and computes. Reads `events`, `eventSuccessPlans`, `organizers`, `eventParticipations`, `eventRuntimeParticipants`, `eventSuccessPresence`, `eventSuccessAssignmentDrafts`, `eventSuccessLateArrivals`; derives present or departed from server time. Rules deny `eventSuccessPresence` | None | Yes, new read model, but each guest's phone writes a heartbeat every 30 s, so a summary document would be rewritten constantly. The other route is a rules change on `eventSuccessPresence` with the state computed on the client; P1.8 took it (PR #1533) | Timed, every 30 s (`heartbeatIntervalSeconds`); the callable allows 6 calls a minute | #1327 names it |
| L4 Live | Sweep and pace-group guest list | `watchEventAttendeesProvider` | `eventAttendees` where `eventId`, limit 1000, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime, invalidated after accountability writes | #1326 (group) |
| L5 Live | Room map layout | `eventSuccessSpatialLayoutProvider` → `EventSuccessRepository.fetchSpatialLayout` | Callable `getEventSuccessSpatialLayout` | `functions/src/eventSuccess/layoutAssets.ts`, `spatialLayout.ts` | Hides fields, for guests. It also serves participants, so it returns only `layoutId`, `label` and `units`. A host can already read the full layout document | None | Yes, now, for hosts. Rules allow managers to read `organizerEventSuccessLayouts`; guests would keep the callable | On open | None |
| L6 Live | Roster behind the console | `watchEventParticipationRosterProvider` | `eventParticipations` where `eventId`, `status` in visible statuses, limit 1000, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| L7 Live | Wingman help requests | `watchEventSuccessWingmanRequestsProvider` | `eventSuccessWingmanRequests` where `eventId`, `status` active, `hostVisibleConsent` true, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| L8 Live | Guest preferences | `watchEventSuccessPreferencesProvider` | `eventSuccessPreferences` where `eventId`, limit 1000, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| L9 Live | Names on wingman requests | `eventSuccessAssignmentPeerProfilesProvider` → `fetchPublicProfiles` | `publicProfiles/{uid}` one `.get()` per person, in parallel | — | Not a callable | `publicProfiles` is itself a projection, written by the profile sync Function | No, by policy. `docs/data_contracts.md` Read Path Discipline forbids one listener per tile. It stays a one-shot Firestore read, no Function needed | On open | None |
| L10 Live | Published forms, for the assignment features panel | `hostFormsDirectoryControllerProvider` → `HostFormsRepository.listForms` | `hostDirectorySummaries/{organizerId}` then `hostFormSummaries` query, both `.get(Source.server)`; falls back to callable `listOrganizerForms` until `formSummaryVersion` is 1 | `functions/src/organizers/organizerForms.ts` (fallback) | Hides fields. The fallback reads `organizerForms` after a manager check. Rules deny `organizerForms`; the summary holds only the list row, not the editable draft | `hostFormSummaries/{formId}`, written by `functions/src/hostReadModels/simpleStore.ts` via `onHostFormSummaryChanged` | Yes, now. Rules already allow managers to read the summary and marker | On open; watched whenever the console section is ready, used only by the assignment features panel | #1324 names `listOrganizerForms` |
| L11 Live | Needs: guest help requests | `eventAssistanceCasesProvider` → `EventAssistanceCasesRepository.fetch` | Callable `listEventAssistanceCases` | `functions/src/eventSuccess/operations/hostCasesHandlers.ts`, `hostCasesStore.ts` | Joins and hides. Reads `eventAssistanceCases` filtered to `owner` eventLead ("Safety ownership never crosses this boundary"), joins `eventAttendees`, `organizers`, `events`, and drops the name when the source changed. Rules deny `eventAssistanceCases` | None | Yes, new read model. The raw collection also holds safety cases, so it cannot be opened. Built in P1.8 (PR #1533) | On open of the sheet, no timer | #1327 names `listEventAssistance*` |
| L12 Live | Messages: delivery problems | `eventAssistanceDeliveriesProvider` → `EventAssistanceDeliveriesRepository.fetch` | Callable `listEventAssistanceDeliveries` | `functions/src/eventSuccess/operations/hostDeliveriesHandlers.ts`, `hostDeliveriesStore.ts` | Joins and computes. For each `eventAssistanceMessages` row it reads `eventAttendees`, `eventAssistanceGuests`, `operationRuns`, `operationWorkItems`, then projects a status. Rules deny all of them except `eventAttendees` | None | Yes, new read model, rewritten on message, guest and work-item changes. Built in P1.8 (PR #1533) | On open of the sheet, no timer | #1327 names `listEventAssistance*` |
| L13 Live | Movement: group departure state | `eventAssistanceDepartureProvider` → `EventAssistanceDepartureRepository.fetch` | Callable `getEventAssistanceGroupProgress` | `functions/src/eventSuccess/operations/groupProgressHandlers.ts`, `groupProgressStore.ts`, `groupProgressReader.ts`, `groupStaffAuthority.ts` | Needs server trust and computes. Reads `events`, `eventSuccessPlans`, `eventAssistanceGroupProgress`, `eventStaffGrants`. Group leads pass through a duty check against an array of duties with expiry and a source hash | None; built in P1.8 (PR #1534) as `hostEventGroupProgressViews` | Yes, new read model for managers. Group-lead access would need duties stored per group, because rules cannot search that array by field | On open of the sheet, no timer | #1327 names `getEventAssistance*` |
| L14 Live | Movement: review who is leaving | `EventAssistanceDepartureRepository.reviewRoster` | Callable `getEventAssistanceDepartureRoster` | `functions/src/eventSuccess/operations/departureRosterHandlers.ts`, `departureRosterStore.ts`, `departureRosterSource.ts` | Needs server trust. Takes the attendee ids the host selected and returns `expectedSourceHash`, which `confirmEventAssistanceDeparture` must present | None | No. It is the first half of a command, keyed by an unsaved selection | On each review | #1327 names `getEventAssistance*` |
| L15 Live | Movement: checkpoint history | `eventAssistanceDepartureHistoryProvider` → `EventAssistanceDepartureHistoryRepository.fetch` | Callable `listEventAssistanceDepartureRosters` | `functions/src/eventSuccess/operations/departureHistoryHandlers.ts`, `departureHistoryStore.ts` | Joins and hides. Pages `eventAssistanceDepartureRosters` (which hold guest names), joins `eventAssistanceCheckpoints`, and summarizes after a group permission check. Rules deny both | None; built in P1.8 (PR #1534) as `hostEventDepartureViews` | Yes, new read model. The rosters are immutable once written, so the writer is small | On open of the sheet, no timer | #1327 names `listEventAssistance*` |
| L16 Live | Movement: checkpoint report | `eventAssistanceCheckpointProvider` → `EventAssistanceCheckpointRepository.fetch` | Callable `getEventAssistanceCheckpoint` | `functions/src/eventSuccess/operations/checkpointHandlers.ts`, `checkpointStore.ts`, `checkpointReader.ts` | Joins and computes. Reads group progress, `eventAssistanceDepartureRosters`, `eventAssistanceCheckpoints` and each member in `eventAttendees`, then computes visits and dispositions | None; built in P1.8 (PR #1534) as `hostEventCheckpointViews` | Yes, new read model, rewritten when a guest's check-in changes | On open of the sheet, no timer | #1327 names `getEventAssistance*` |
| L17 Live | Movement: reassign a checkpoint request | `eventAssistanceCheckpointRequestProvider` (composes L13 and L16) | Callables `getEventAssistanceCheckpoint` and `getEventAssistanceGroupProgress` | As L13 and L16 | As L13 and L16 | None; built in P1.8 (PR #1534) as the L13 and L16 views | Yes, from the L13 and L16 read models | On open of the sheet, no timer | #1327 names `getEventAssistance*` |
| L18 Live | Sweep: account for a guest | `eventAssistanceAccountabilityProvider` → `EventAssistanceAccountabilityRepository.fetch` | Callable `getEventAssistanceAccountability` | `functions/src/eventSuccess/operations/accountabilityHandlers.ts`, `accountabilityStore.ts` | Needs server trust and computes. Group permission check, then membership, attendee and checkpoint reads; returns a source hash the resolve command must echo | None; built in P1.8 (PR #1538) as `hostEventAccountabilityViews` | Yes, new read model per guest. It must also carry the fence hash | On open of the sheet, no timer | #1327 names `getEventAssistance*` |
| L19 Live | Groups: move a guest | `eventAssistanceMembershipProvider` → `EventAssistanceMembershipRepository.fetch` | Callable `getEventAssistanceMembership` | `functions/src/eventSuccess/operations/membershipHandlers.ts`, `membershipStore.ts`, `membershipReader.ts`, `membershipReceivers.ts` | Joins and computes. Seven documents per guest (`events`, `eventAttendees`, `organizers`, `eventSuccessPlans`, `eventAssistanceGuests`, `eventAssistanceMemberships`, `eventStaffGrants`) plus the handover receivers | None; built in P1.8 (PR #1538) as `hostEventMembershipViews` | Yes, new read model per guest. It must also carry the fence hash | On open of the sheet, no timer | #1327 names `getEventAssistance*` |
| L20 Live | Settings: late-join messages | `eventAssistanceLateJoinSettingProvider` → `EventAssistanceLateJoinSettingRepository.fetch` | Callable `getEventAssistanceSetting` | `functions/src/eventSuccess/operations/policySettingsHandlers.ts`, `policySettingsStore.ts`, `policySettingsReader.ts` | Computes. Manager check, then `events`, `organizers` and two `eventAssistanceSettings` documents (own and parent), merged with a source hash. Rules deny the collection | None; built in P1.8 (PR #1538) as `hostEventAssistanceSettingViews` | Yes, new read model. The settings hold no private data, but the merge and fence hash are server logic | On open of the sheet, no timer | #1327 names `getEventAssistance*` |
| L21 Live | Settings: event automation | `eventAssistanceRuntimeProvider` → `EventAssistanceRuntimeRepository.fetch` | Callable `getEventAssistanceRuntimeConfig` | `functions/src/eventSuccess/operations/runtimeConfigHandlers.ts`, `runtimeConfigStore.ts` | Computes. Manager check, then `events`, `eventSuccessPlans`, `organizers`, `eventAssistanceRuntimeConfigs`, with a computed status. Rules deny the collection | None; built in P1.8 (PR #1538) as `hostEventRuntimeViews` (the sender picker, L22, keeps the callable) | Yes, new read model for the configuration itself | On open of the sheet, no timer | #1327 names `getEventAssistance*` |
| L22 Live | Settings: pick message senders | `eventAssistanceRuntimeSendersProvider` → `fetchSenderPage` | Callable `getEventAssistanceRuntimeConfig` with `senderCursors` | `functions/src/eventSuccess/operations/runtimeSenderSetup.ts` | Hides fields. Pages provider sender records, WhatsApp policies and message templates, all denied to clients | None | No. Provider sender records stay server-side | On open of the picker, paged | #1327 names `getEventAssistance*` |
| L23 Live | Setup tab: saved room layouts | `watchOrganizerEventSuccessLayoutsProvider` | `organizerEventSuccessLayouts` where `organizerId`, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| I1 Insights | Organizer insights: stages, trends, funnel | `hostAnalyticsProvider` → `HostAnalyticsRepository.getHostAnalytics` | Callable `getHostAnalytics` | `functions/src/analytics/hostAnalytics.ts`, `hostAnalyticsBigQuery.ts` | Aggregates. Reads BigQuery rows plus `organizers`, `events`, `eventAttendees` for the authorized scope, for any date range the host picks | `hostAnalyticsSnapshots/{uid}_{scopeHash}` is a server cache with a 15-minute life, written by this callable. Rules deny clients | No, for free date ranges: the numbers are in BigQuery, not Firestore. A scheduled rollup for fixed presets would be a new pipeline | On open, on range change, on pull; disposed at tab exit | #1325 names `getHostAnalytics` |
| R1 Report | Event scorecard and funnel | `watchEventSuccessScorecardProvider` | `eventSuccessScorecards/{eventId}` `.snapshots()` | — | Not a callable | Yes. This document is a read model, written by `functions/src/marketplace/eventSuccessScorecards.ts` (six triggers, plus calls from the matching Functions) | Already a listener | Realtime | #1326 (group) |
| R2 Report | Plan behind the report | `watchEventSuccessPlanProvider` | `eventSuccessPlans/{eventId}` `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| R3 Report | Guest reviews | `watchReviewsForEventProvider` | `reviews` where `eventId`, ordered by `createdAt`, limit 50, `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| R4 Report | Organizer for the route | `HostEventManageRouteScreen` → `fetchOrganizerProvider` | `organizers/{id}` `.get()` | — | Not a callable | No | Yes, now. Rules allow `get` on an organizer | On open | None |
| R5 Report | Event for the route | `HostEventManageRouteScreen` → `watchEventProvider` | `events/{id}` `.snapshots()` | — | Not a callable | No | Already a listener | Realtime | #1326 (group) |
| R6 Report | Published forms (watched by the console section on this tab too) | `hostFormsDirectoryControllerProvider` → `HostFormsRepository.listForms` | `hostDirectorySummaries/{organizerId}` then `hostFormSummaries` query, both `.get(Source.server)`; falls back to callable `listOrganizerForms` until `formSummaryVersion` is 1 | `functions/src/organizers/organizerForms.ts` (fallback) | Hides fields. The fallback reads `organizerForms` after a manager check. Rules deny `organizerForms`; the summary holds only the list row, not the editable draft | `hostFormSummaries/{formId}`, written by `functions/src/hostReadModels/simpleStore.ts` via `onHostFormSummaryChanged` | Yes, now. Rules already allow managers to read the summary and marker | On open; watched whenever the console section is ready, used only by the assignment features panel | #1324 names `listOrganizerForms` |

## Traced and not counted

**Reads on the device, not the backend.** These never reach Firestore or a Function.

| Screen | What | Provider | Where it comes from |
|---|---|---|---|
| Shell | Who is signed in | `uidProvider` | Firebase Auth `authStateChanges()` |
| Shell | Selected organizer | `hostOrganizerSelectionProvider` | Memory, kept alive |
| Shell | Push setup | `appShellFcmInitializationProvider` | Writes the device token; nothing is shown from it |
| Shell | Force update and offline banner | `forceUpdateRequiredProvider`, `isObviouslyOfflineProvider` | Remote Config already activated at startup, package info, connectivity |
| Today, Create | Event drafts | `organizerEventDraftsProvider`, `CreateEventDraftController.loadDrafts` | `SharedPreferences` |
| Today | Focus or skip choice | `hostTodayPreferenceProvider` | `SharedPreferencesAsync` |
| Today, Door | Check-ins not yet sent | `hostAttendanceOutboxProvider` | Command journal on the device |
| Create | Unsent event edits | `PrivateEventUpdateJournal` and the details, preferences, publication journals | Device journal |
| Insights | Device timezone | `hostAnalyticsDeviceTimezoneProvider` | Plugin, kept alive |

**The older create screen is not routed.** `CreateEventScreen` is constructed only
in tests and the capture catalog; the host route builds `PrivateEventCreateScreen`.
These reads therefore do not run in production:

| Where | Provider | Path |
|---|---|---|
| `CreateEventScreen` · `WhereStep` | `watchOrganizerEventVenuesProvider` | `organizerEventVenues` where `organizerId`, `.snapshots()` |
| `CreateEventScreen` · `EventSuccessStep` | `watchOrganizerEventSuccessLayoutsProvider` | `organizerEventSuccessLayouts` where `organizerId`, `.snapshots()` |
| `CreateEventScreen` · photo recovery | `CreateEventPhotoRecoveryController` → `EventRepository.fetchEvent` | `events/{id}` `.get()` |

**Live callables that no widget mounts.** Providers exist and have tests, but nothing
in `lib/` or `apps/` outside their own files watches them, so a host never triggers
them today:

| Provider | Callable | Function source | Lane |
|---|---|---|---|
| `eventAssistanceHostGuestsProvider` | `getEventAssistanceHostGuests` | `functions/src/eventSuccess/operations/hostGuestsStore.ts` | Named by #1327 as a group |
| `eventAssistanceParticipationReviewProvider` | `getEventAssistanceParticipation` | `functions/src/eventSuccess/operations/participationStore.ts` | Named by #1327 as a group |
| `eventAssistanceGroupStaffProvider` | `getEventAssistanceGroupStaff` | `functions/src/eventSuccess/operations/groupStaffStore.ts` | Named by #1327 as a group |
| `EventAttendanceDisposition` provider | `getEventAttendanceDisposition` | `functions/src/events/attendanceDispositionStore.ts` | Named by #1327 |
| `EventAttendanceReport` provider | `getEventAttendanceReport` | `functions/src/events/attendanceReport.ts` | Named by #1327 |

**Formats runtime, out of scope by the brief.** The console section still subscribes
to these while a host is on it, and their loading state can hold the section, so a
rebuilt console needs its own answer for them:

| What | Provider | Path |
|---|---|---|
| Pods and rotations | `watchEventSuccessAssignmentsProvider`, `watchEventSuccessRotationAssignmentsProvider`, `watchEventSuccessRotationDraftsProvider` | `eventSuccessAssignments`, `eventSuccessAssignmentDrafts` `.snapshots()` |
| Names on pods and rotations | `eventSuccessAssignmentPeerProfilesProvider` | `publicProfiles/{uid}` `.get()` |
| Assignment features and consent | `EventSuccessAssignmentFeaturesSection`, `EventAssignmentFeatureChoiceRepository` | Callables `previewEventAssignmentFeatures`, `listEventAssignmentFeatureChoices` |

**`host_operations*` is the Organizer workspace, not the door.** The brief listed it
under door. The library's only wave-1 content is the Insights tab (I1); its other
parts are organizer settings, which redraw in P5:

| What | Provider | Path |
|---|---|---|
| Organizer list | `hostOperableOrganizersProvider` | Same listeners as S2 |
| Host profile | `watchHostProfileProvider` | `hostProfiles/{uid}` `.snapshots()` |
| Own user profile | `watchUserProfileProvider` | `users/{uid}` `.snapshots()` |
| Audience counts | `hostCrmSummaryProvider` | As T4 |
| WhatsApp setup | `hostMessagingSetupProvider` | Callable `getOrganizerMessagingSetup` |
| Event defaults editor | `hostManagerEventSetupDefaultsControllerProvider` | `hostEventSetupDefaultViews/{organizerId}` `.snapshots()` (P1.8; was callable `getOrganizerEventSetupDefaults`) |
| Organizer events | `watchEventsForOrganizerProvider` | `events` query `.snapshots()` |

Also on Host event manage and outside wave 1: event staff in the preparation phase
(`HostEventStaffSection` → callable `listEventStaff`). `OrganizerMomentsEntryField`
is navigation only and reads nothing.

**No reads to list:**

- **QR scanner.** `EventCheckInQrScannerSheet` is on the guest side, inside the
  companion screen. It reads nothing from the backend; the scanned token goes to a
  self check-in command. There is no host-side scanner today, so `RbHostDoorScan`
  has no read path to replace. The host's side of the QR is D9.
- **`lib/dashboard`.** It has no host pieces. Its route sits in the consumer branch
  of `lib/routing/go_router.dart`, and no host file imports it.
- **`lib/routing/shell/adaptive_tab_scaffold.dart`,
  `lib/routing/host_workspace_destination.dart`,
  `apps/host/lib/host_platform_app.dart`.** No backend reads.

**Not measured:**

- Whether `contactSummaryVersion` and `formSummaryVersion` are set in dev or prod.
  That needs an admin read of live data. `docs/data_contracts.md` says activation has
  not been applied to a live environment by the source change, so T4, L10 and R6 may
  still reach their callable fallback in production. The table describes the code.
- Money. Firestore and Functions billing for either option is not estimated here.

## Found while tracing

Nothing below was changed.

1. `loadOrganizerAttentionSources` runs the same `events` query twice and the same
   `eventParticipations` query twice (`canonical` and `compatibility` variants have
   identical filters), on every Today open.
2. The five unmounted callables above. #1327 names two of them specifically.
3. `CreateEventScreen` and its steps remain in `lib/` with no route.
4. `getEventSuccessPresenceSummary` allows 6 calls a minute and polls every 30 s, so
   three open screens by one host use the whole allowance. Retired in P1.8
   (PR #1533): the console listens instead.

## Appendix: how to re-run this

Run from the repository root at the commit above. `--include` filters exclude
generated files where it matters (`grep -v '\.g\.dart'`).

**Call-site counts.** #1480 quotes 163 callables and 67 listeners inside
`lib/contexts`. At this commit the same greps give 164 and 67.

```bash
grep -rn "httpsCallable" lib/contexts --include='*.dart' | grep -v '\.g\.dart' | wc -l
grep -rn "\.snapshots()" lib/contexts --include='*.dart' | grep -v '\.g\.dart' | wc -l
```

**Finding each screen's providers.** The provider graph was walked from these seeds
with a throwaway script: find `@riverpod` definitions, then follow provider names
through their bodies. Every result was then read by hand.

```text
Shell:  lib/routing/shell/host_app_shell.dart, lib/routing/shell/adaptive_tab_scaffold.dart,
        lib/routing/shell/app_shell.dart, lib/routing/host_workspace_destination.dart,
        lib/routing/host_navigation_workspace.dart, lib/routing/host_workspace_index_screen.dart,
        lib/routing/host_route_extras.dart, apps/host/lib/host_platform_app.dart, lib/app.dart,
        lib/contexts/profiles/data/profile_location_initializer.dart
Today:  lib/hosts/today/**
Create: lib/hosts/presentation/event_management/**
Door:   lib/hosts/presentation/host_operational_roster*, host_roster*, host_event_manage*,
        host_event_operator_screen.dart, widgets/host_operational_roster*, widgets/host_roster*,
        widgets/host_event_roster*, widgets/host_event_manage*, widgets/host_event_participants*,
        widgets/host_event_check_in_qr_section.dart
Live:   lib/event_success/presentation/event_success_host_*, host_live/, host_report/,
        host_components/, event_assistance_*, event_attendance_*
Report: lib/hosts/presentation/widgets/host_event_reviews_panel.dart, host_report/
Insights: lib/hosts/presentation/host_operations/**, lib/hosts/presentation/host_operations_screen*
```

```bash
grep -n "ref\.\(watch\|read\|listen\|invalidate\)" lib/hosts/today/presentation/host_today_screen.dart
grep -rn "httpsCallable\|\.snapshots()\|\.get(" lib/contexts/live/data lib/contexts/events/data lib/contexts/bookings/data
grep -rln -i "insight\|report" lib/hosts --include='*.dart'
```

**Which live providers are mounted.** No output outside the provider's own file
means nothing mounts it.

```bash
grep -rl "eventAssistanceHostGuestsProvider\|eventAttendanceReportProvider\|eventAttendanceDispositionProvider" lib apps --include='*.dart' | grep -v '\.g\.dart'
grep -rl "eventAssistanceParticipationReviewProvider\|eventAssistanceGroupStaffProvider" lib apps --include='*.dart' | grep -v '\.g\.dart'
grep -rn "[^a-zA-Z_]CreateEventScreen\b" lib apps --include='*.dart' | grep -v '\.g\.dart'
grep -rn "dashboard/" lib/hosts lib/routing/host_*.dart apps/host/lib --include='*.dart' | grep -v '\.g\.dart'
```

**Function sources and rate limits.**

```bash
grep -n "<callableName>" functions/src/index.ts
grep -rln "export const <callableName>\b" functions/src --include='*.ts' | grep -v generated
grep -n "collection(\|getAll" functions/src/eventSuccess/operations/<store>.ts
grep -rn "minInstances" functions/src --include='*.ts' | grep -v test
grep -rn "checkInstanceRateLimit" functions/src --include='*.ts' | grep -v test
grep -c "onDocumentWritten" functions/src/hostReadModels/triggers.ts
```

The last grep returns 16: 15 triggers and one import line.

**Rules.**

```bash
grep -n "match /eventAssistance\|match /eventSuccess\|match /hostDirectorySummaries\|match /hostFormSummaries" firestore.rules
grep -n "match /organizerAttentionItems\|match /eventRehearsalMilestones\|match /eventSetupPreferences\|match /organizerEventSetupDefaults" firestore.rules
grep -n "function isHostSummaryManager\|function isOrganizerHostForEvent\|function hasActiveEventOperatorGrant" firestore.rules
```

**#1326's count of 17 listeners.** #1326 gives the number without listing them. This
table's Host event manage listeners are the event, roster, participations, attendees,
claims, private access, invite links, plan, standings, wingman, preferences, layouts,
scorecard and reviews (14 providers). The three formats listeners (assignments,
rotation assignments, rotation drafts) bring it to 17, so the "(group)" attribution is
a match by count.

**Other sources read.** The caching contract linked from #1323 (cold-start cost,
offline behaviour, disk cache, questions 3 and 11); the redesign programme in
`catch-knowledge` (`plans/redesign-implementation-programme.md`, section 7 step 3,
row 0.4, table P3); `docs/data_contracts.md` (Host read models, Read Path Discipline,
Host Analytics Snapshots).
