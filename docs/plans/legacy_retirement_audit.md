---
doc_id: legacy_retirement_audit
version: 1.1.3
updated: 2026-10-29
owner: data_platform
status: proposed
---

# Legacy Retirement Audit

## Decision

The repository should stop treating released-client and historical-data compatibility as a constraint. The application is not launched and the owner has confirmed that every environment contains only synthetic or demo data. In that setting, preserving two document shapes, two authorities, two callable vocabularies, or two storage layouts creates risk without protecting a real user.

The highest-value retirement is the `clubs` to `organizers` cutover, but it is not one deletion. `organizers` is already the Flutter read target and the recorded organizer backfill is complete; the remaining `clubs` graph is still load-bearing for server authority, host discovery, notifications, reviews, event descendants, rules, storage, and callable wrappers. The next highest-value cleanup is to make the event document canonical (`organizerId`, `meetingLocation`, `eventPolicy`, and explicit `eventOrigin`). Third is to finish the push-installation design: the app writes it, but every sender still reads `users.fcmToken`.

This audit found compatibility paths that are broken, not merely untidy:

1. the event schema requires `clubId` while the create-event request requires `organizerId`;
2. a missing `eventOrigin` is treated as Catch-native and therefore booking-capable even though current writers populate the field;
3. the legacy attendance toggle does not advance `attendanceRevision`;
4. the supply-capability migration says clients fail closed, but Flutter and the website still derive capabilities, with the website defaulting a missing authority to public-readable;
5. `pushInstallations` is written by Flutter but has no repository contract and is read by no sender;
6. the profile-photo contract says captions are no longer written, while current Dart and Functions paths still accept and emit them; and
7. the media hygiene tool calls a schema-retired path canonical and can copy `clubs/` media into it.

## Audit contract

- **Goal:** inventory the repository's backwards-compatibility artifacts, identify their live dependencies, and give a safe deletion order optimized for one clean schema.
- **Scope:** `contracts/`, `firestore.rules`, `firestore.indexes.json`, `storage.rules`, `lib/`, `functions/src/`, `admin/src/`, `website/src/`, route/design manifests, and related `tool/` migration, generator, validator, and seed code.
- **Exclusions:** no source, schema, rule, fixture, generated-output, or data changes; no remote mutation. `tool/data/migrate_clubs_to_organizers.mjs` was run only in its default read-only dry-run mode; no apply, backup, deletion, or compatibility retirement was performed.
- **Evidence base:** source tree at `fc800d43a2132816f6fd38506c37fba92bc0fcae`, live Firebase metadata, and read-only migration dry runs on 2026-08-19. The repository impact planner and context pack were also used read-only.
- **Acceptance for this audit:** each semantic compatibility artifact is assigned to a theme, supported by `file:line`, classified as load-bearing, deletion-only, broken, or not legacy, and placed in dependency order.

“Verified” below means the complete owning source file or the complete relevant machine contract was read. “Inference” is used where a conclusion depends on external state or on consumers outside this repository. Generated files and tests are satellites: change their source or generator and regenerate/update them in the same retirement tranche; never hand-edit generated output.

Difficulty and blast radius use a 1–5 scale. Difficulty measures implementation/verification effort. Blast radius measures how much product behavior or authority can fail if the change is wrong.

## Live revalidation — 2026-08-19

The live inventory confirms that compatibility retirement and cumulative
backend deployment must remain separate operations:

| Surface | Dev | Staging | Prod | Retirement implication |
|---|---:|---:|---:|---|
| `clubs` documents | 21 | 0 | 11 | The legacy authority is still live in dev and prod. |
| `organizers` documents | 21 | 0 | 13 | Production has canonical-only organizers as well as migrated club pairs. |
| Organizer migration writes needed | 79 | 0 | 0 | Dev needs repair or reseed first: 3 event-participation and 76 notification-item writes. |
| Organizer migration blockers | 0 | 0 | 0 | The audited migration graph is repairable; zero blockers is not deletion authorization. |
| Legacy Storage files scanned | 1 | 0 | 0 | The one dev file already has its canonical copy; no live copy operation is pending. |
| Composite indexes in `READY` | 138 | 133 | 140 | Environment inventories have drifted and should be rebaselined before retirement work. |
| Repository Functions missing live | 40 | 40 | 40 | All missing exports are the new Forms surface; the cumulative Functions snapshot is not deployed. |

The repository declares 280 Functions. Firebase reports 264 deployed app and
Extension Functions in dev and staging and 296 in production; 24, 24, and 56
respectively are environment-only, primarily installed Firebase Extensions.
The deployer must preserve those environment-only Functions. At the same time,
club-named app Functions such as `createClub`, `joinClub`, `addClubHost`, club
claim/admin operations, review/stat synchronizers, and club media/index triggers
remain deployed in every environment. Current Firestore and Storage rules also
differ from the live rulesets in every environment. These facts reinforce the
source audit's conclusion: client read migration is substantially complete,
but server authority, callable vocabulary, rules, triggers, and some stored
references are still load-bearing compatibility surfaces.

### Recommended simplification backlog

1. **Repair canonical correctness first:** require one event owner identity,
   explicit event origin/policy/location, revisioned attendance, and
   fail-closed supply capabilities; retain the now-passing canonical organizer
   media moderation regression.
2. **Finish the organizer authority cutover:** repair or reseed dev, repoint
   Functions/rules/admin/reviews/notifications/Event Success to `organizers`
   and organizer team/follower edges, then stop all `clubs` reads and dual
   writes.
3. **Remove the legacy public vocabulary:** replace club-named callables,
   response aliases, routes, analytics fields, and admin commands with
   organizer names; deploy consumers first, then remove the old exports.
4. **Collapse duplicate delivery models:** make `pushInstallations` the only
   push-token source; remove `users.fcmToken`, redundant `clubId` projections,
   `linkedClubIds`, `compatibilityClubId`, and dual organizer/club ID response
   arrays after one synthetic-data rewrite.
5. **Retire old storage and tooling:** move moderation/thumbnail ownership to
   `organizers/`, remove `clubs/` and retired `hostedMedia/` rule paths, then
   delete migration-only tools and add absence checks so legacy paths cannot
   return.
6. **Clean low-risk source shims last:** remove deprecated Dart aliases,
   constructor wrappers, route redirects, old Remote Config names, demo flags,
   and visual-token aliases only after persisted and server compatibility has
   been eliminated.

## Dependency graph

The generic “migrate, read, write, schema, delete” sequence is insufficient because authority and fan-out collections cross the themes. The repository-specific order is:

1. **Repair canonical contracts before deleting fallbacks.** Define `pushInstallations`; make supply capabilities fail closed; make attendance mutation consistently revisioned; decide the canonical event identity and policy fields. Canonical organizer media moderation is now covered by a regression test and should remain a prerequisite, not an open repair.
2. **Reseed or rewrite synthetic data into one canonical shape.** Re-run the organizer copier only with owner approval, then rewrite organizer-team authority, events and every event descendant, reviews, notifications/matches, Event Success plans, profiles/photos, invite links, and media references. Because the corpus is disposable, deleting and reseeding a feature corpus is preferable where it is simpler.
3. **Repoint every current read and authority decision.** Host discovery must stop querying organizer `hostUserId` projections; Functions and rules must stop consulting `clubs`; push senders must read installations; event policy/location/origin and Event Success must reject missing canonical fields.
4. **Stop compatibility writes and public entry points.** Remove dual writes, old callable exports, HTTP input aliases, old routes, raw invite-link bearer IDs, and old FCM payload keys. This prevents the synthetic corpus from becoming mixed again.
5. **Tighten source contracts and authorization together.** Make canonical fields required, remove old properties, update Firestore/Storage rules and indexes, regenerate TypeScript/Dart validators, and update focused tests and fixtures.
6. **Delete obsolete data and physical paths.** Delete `clubs` and its descendants, old authority/relationship collections, old event fields, retired profile arrays/captions, old hosted-media paths, and obsolete config/draft documents.
7. **Delete retirement machinery or convert it to an absence guard.** The organizer copier is additive and never deletes; once the cutover is verified, remove it and its compatibility scanner/allowlists, or replace them with a small check that rejects reintroduction of retired names.

Deleting in a different order has two acute failure modes. Removing legacy fields before repointing authority locks hosts out. Removing the legacy sources of truth before replacing them silences push, changes booking eligibility, or makes Event Success plans deserialize with implicit behavior.

## Load-bearing summary

| Current source of truth or live fallback | Verdict |
|---|---|
| Organizer host projections and `clubs` server reads | **Load-bearing.** Flutter host queries, manager helpers, reviews, events, payments, profile sync, deletion, search, rules, and storage still use them. Migrate authority/readers first. |
| Event and descendant `clubId` | **Load-bearing.** Schemas and Firestore/Storage rules still require or compare it. Rewrite the whole descendant graph before schema deletion. |
| Event capacity/price/constraints/cohort/location scalars | **Load-bearing.** Policy, discovery, and Flutter synthesize canonical behavior from them when bundles are absent. Reseed canonical bundles/locations first. |
| `users.fcmToken` | **Only working push source.** `pushInstallations` is currently write-only. Build the sender side first. |
| Event Success structure/module/reveal defaults | **Load-bearing for old plan shape.** Prefer deleting/reseeding synthetic plans, then make all fields explicit. |
| `clubs/` and `hostedMedia/` Storage objects | **Potentially load-bearing by reference.** The targeted migration scan found one dev `clubs/` object with no copy pending and none in staging/prod; rewrite all persisted references and preserve organizer moderation before deleting rule paths. |
| Profile root activity fields, `bio`, old draft versions, old route redirects, `cityNames`, deprecated UI/type shims | **Deletion-only after local/fixture reseed.** Repository migration receipts say the significant remote backfills are complete, and no current runtime source was found for `cityNames`. |
| Raw invite-link document ID as bearer | **Not worth preserving.** Delete/reseed old links, then remove the weaker authentication branch. |

## Theme 1 — Organizer identity, authority, APIs, and storage

**Rating:** difficulty 5/5; blast radius 5/5. **Status:** mixed; several compatibility artifacts are load-bearing.

### What exists and why

The recorded migration is complete through canonical client reads, but intentionally stopped before freezing compatibility writes or deleting legacy storage. The migration contract records `organizers` as canonical, backfill and client cutover as complete, and `freeze_legacy_writes` plus `retire_legacy` as pending (`contracts/migrations/clubs_to_organizers.json:4-7`, `contracts/migrations/clubs_to_organizers.json:45-72`). Its production receipt reports 41 source and 41 canonical documents and no remaining blockers (`contracts/migrations/clubs_to_organizers.json:83-125`). The migration tool is additive and explicitly never deletes legacy documents (`tool/data/migrate_clubs_to_organizers.mjs:27-46`, `tool/data/migrate_clubs_to_organizers.mjs:886-905`).

The canonical client read path is already organizers-only (`lib/contexts/organizers/data/clubs_repository.dart:30-49`), and the current repository invokes organizer-named Functions (`lib/contexts/organizers/data/clubs_repository.dart:181-358`). The Dart type is still named `Club` and tolerates `entityKind`, `clubPhotos`, and `memberCount` in lieu of canonical organizer fields (`lib/contexts/organizers/domain/club.dart:115-245`). `Event` similarly stores the canonical JSON `organizerId` in a Dart member named `clubId` and exposes an alias getter (`lib/contexts/events/domain/event.dart:198-217`, `lib/contexts/events/domain/event.dart:256`). These names are compile-time compatibility, not proof that `clubs` remains the correct database authority.

The legacy storage graph is nevertheless active:

- `clubs/{clubId}` and `clubs/{clubId}/posts/{postId}` have live schemas (`contracts/firestore/clubs.schema.json:1-9`, `contracts/firestore/club_posts.schema.json:1-9`), public read rules and host-management rules (`firestore.rules:826-904`), indexes (`firestore.indexes.json:72-144`), and Storage paths (`storage.rules:122-153`).
- Old authority/relationship collections remain first-class: `clubClaimRequests`, `clubHostClaims`, `clubMemberships`, and `clubScheduleLocks` (`contracts/firestore/club_claim_requests.schema.json:8-35`, `contracts/firestore/club_host_claims.schema.json:8-22`, `contracts/firestore/club_memberships.schema.json:8-31`, `contracts/firestore/club_schedule_locks.schema.json:8-48`; rules at `firestore.rules:826-877`).
- Canonical organizer handlers still mirror to `clubs`, including create/update, follows, team, claims, posts, and logo thumbnails (`functions/src/organizers/createOrganizer.ts:55-82`, `functions/src/organizers/createOrganizer.ts:236-248`, `functions/src/organizers/mutateOrganizer.ts:61-79`, `functions/src/organizers/follows.ts:57-87`, `functions/src/organizers/manageOrganizerTeam.ts:64-91`, `functions/src/organizers/organizerClaims.ts:79-102`, `functions/src/organizers/organizerPosts.ts:64-92`, `functions/src/organizers/generateOrganizerLogoThumbnail.ts:132-178`).
- Legacy callables remain exported alongside canonical ones: club create/update/delete/archive, membership, hosts, claims, posts, conversations, admin club details/indexing, and club-logo generation (`functions/src/index.ts:85-114`, `functions/src/index.ts:225-228`, `functions/src/index.ts:294-309`). Their rate-limit identities also remain (`functions/src/shared/rateLimit.ts:101-108`, `functions/src/shared/rateLimit.ts:178-208`, `functions/src/shared/rateLimit.ts:252`).
- The admin layer adapts organizer handlers to `AdminClub*` result types (`admin/src/shared/types/adminTypes.ts:118-187`, `admin/src/shared/api/adminApi.ts:1669-1731`).
- The public site deliberately recognizes old club routes (`design/website/routes.json:277-294`, `website/src/features/organizers/routing.ts:19-24`), and route validation/build code requires those aliases (`tool/marketing/check_website_routes.mjs:431-586`). With no launched URLs to preserve, these are deletion candidates, not SEO obligations.
- Organizer documents themselves require or tolerate compatibility projections: `hostUserId`, `hostName`, `hostUserIds`, `ownerUserId`, `entityKind`, `entitySubtypes`, `displayCategory`, `clubPhotos`, and `memberCount` (`contracts/firestore/organizers.schema.json:89-98`, `contracts/firestore/organizers.schema.json:249-301`, `contracts/firestore/organizers.schema.json:901-909`). `supplyCapabilities` is optional despite the migration saying it is fully backfilled (`contracts/firestore/organizers.schema.json:344-350`).
- Search is also dual-wired. Algolia exposes club-shaped record interfaces, converts an organizer back into a legacy `ClubDocument`, writes both `clubId` and `organizerId` into event records, queries events by both keys, and deploys triggers on both root collections (`functions/src/search/algoliaExploreIndex.ts:27-62`, `functions/src/search/algoliaExploreIndex.ts:164-181`, `functions/src/search/algoliaExploreIndex.ts:207-230`, `functions/src/search/algoliaExploreIndex.ts:321-357`, `functions/src/search/algoliaExploreIndex.ts:510-535`). This is load-bearing for current search until the index shape and trigger are cut over.

Exactly 30 non-test Functions source files directly access the `clubs` collection. This is the server-side deletion inventory:

| Area | Direct `clubs` access evidence |
|---|---|
| Admin/intake | `functions/src/admin/clubDetails.ts:374`; `functions/src/admin/clubIndexing.ts:78`; `functions/src/admin/organizerDraftFromCandidate.ts:138` |
| Legacy club handlers | `functions/src/clubs/clubClaims.ts:83`; `functions/src/clubs/clubHostConversations.ts:116`; `functions/src/clubs/clubPosts.ts:92`; `functions/src/clubs/createClub.ts:85`; `functions/src/clubs/generateClubLogoThumbnail.ts:130`; `functions/src/clubs/manageClubHosts.ts:72`; `functions/src/clubs/membership.ts:62`; `functions/src/clubs/mutateClub.ts:63`; `functions/src/clubs/syncClubMemberStats.ts:27`; `functions/src/clubs/syncClubNextEvent.ts:53` |
| Canonical organizer handlers still mirroring | `functions/src/organizers/createOrganizer.ts:82`; `functions/src/organizers/follows.ts:57`; `functions/src/organizers/generateOrganizerLogoThumbnail.ts:132`; `functions/src/organizers/manageOrganizerTeam.ts:64`; `functions/src/organizers/mutateOrganizer.ts:61`; `functions/src/organizers/organizerClaims.ts:79`; `functions/src/organizers/organizerPosts.ts:64` |
| Event/review/payment/profile/safety | `functions/src/events/mutateEvent.ts:221`; `functions/src/payments/createStripeCheckoutSession.ts:223`; `functions/src/profiles/syncPublicProfile.ts:143`; `functions/src/reviews/mutateReview.ts:257`; `functions/src/reviews/syncClubReviewStats.ts:69`; `functions/src/safety/accountDeletion.ts:355` |
| Shared/operations | `functions/src/shared/eventOrganizers.ts:25`; `functions/src/shared/organizerManagerAuthority.ts:16`; `functions/src/eventSuccess/layoutAssets.ts:453`; `functions/src/demoOps/suvbot.ts:1494` |

The callable-contract side of the same graph is also explicit. Old-only club requests are `add_club_host`, `admin_get_club_details`, `admin_set_club_index_status`, `admin_update_club_details`, `archive_club`, membership, create/post/delete club, public reviews, remove host, claim, notification preference, host conversation, ownership transfer, and update club (`contracts/callables/add_club_host_payload.schema.json:8-14`, `contracts/callables/admin_get_club_details_payload.schema.json:8-10`, `contracts/callables/admin_set_club_index_status_payload.schema.json:8-10`, `contracts/callables/admin_update_club_details_payload.schema.json:9-11`, `contracts/callables/archive_club_payload.schema.json:8-10`, `contracts/callables/club_membership_payload.schema.json:9-11`, `contracts/callables/create_club_payload.schema.json:8-14`, `contracts/callables/create_club_post_payload.schema.json:9-13`, `contracts/callables/delete_club_payload.schema.json:8-10`, `contracts/callables/create_public_club_review_payload.schema.json:9-17`, `contracts/callables/list_public_club_reviews_payload.schema.json:8-10`, `contracts/callables/remove_club_host_payload.schema.json:8-10`, `contracts/callables/request_club_claim_payload.schema.json:8-10`, `contracts/callables/set_club_notification_preference_payload.schema.json:8-10`, `contracts/callables/start_club_host_conversation_payload.schema.json:8-10`, `contracts/callables/transfer_club_ownership_payload.schema.json:8-10`, `contracts/callables/update_club_payload.schema.json:9-11`). `create_club` returns `clubId` (`contracts/callable_responses/create_club_response.schema.json:8-10`). Canonical or shared APIs still accepting/returning both identities are create event, event review, admin event filters, host analytics, organizer analytics, Explore search, and runtime bootstrap (`contracts/callables/create_event_payload.schema.json:9-28`, `contracts/callables/create_event_review_payload.schema.json:8-11`, `contracts/callables/admin_list_event_details_payload.schema.json:10-18`, `contracts/callables/host_analytics_query_payload.schema.json:10-18`, `contracts/callables/record_organizer_analytics_event_payload.schema.json:8-15`, `contracts/callable_responses/explore_search_response.schema.json:8-18`, `contracts/callable_responses/host_analytics_response.schema.json:37-43`, `contracts/callable_responses/host_analytics_response.schema.json:84-112`, `contracts/callable_responses/get_event_runtime_bootstrap_response.schema.json:79-96`). These contracts must change with their handlers and generated registries, not after them.

### What is load-bearing

- **Host discovery and manager authority:** current Flutter queries `organizers` by the legacy projections `hostUserId`, `hostUserIds`, and `ownerUserId` (`lib/contexts/organizers/data/clubs_repository.dart:62-151`). Server manager checks use the projected host fields, and another shared helper falls back from host arrays to the single-host shape (`functions/src/shared/organizerHosts.ts:16-86`, `functions/src/shared/clubHosts.ts:21-76`). These fields cannot be deleted until reads are repointed to `organizerTeamMemberships` or another single canonical ownership model.
- **Organizer trust:** the authority resolver still infers canonical ownership, claim, provenance, verification, and publish defaults from `hasLegacyOwner` when structured records are absent (`lib/contexts/organizers/domain/organizer_authority.dart:212-258`). Requiring the structured authority records must precede removing that argument.
- **Server operations:** reviews, payments, account deletion, public-profile synchronization, and event mutation still consult `clubs` at the lines above. Deleting the collection first produces incomplete cleanup, failed authorization, or missing organizer metadata.
- **Rules and media:** `clubs` still grants public reads, host writes, and logo/cover access. Removing storage or rules before references are rewritten breaks media and host operations.
- **Callable compatibility:** old exports are load-bearing only for repository callers/tests that still invoke them; no launched client requires them. Search and replace internal callers, then delete rather than support a release window.

Everything else in this theme—the old public routes, old callable vocabulary, admin type aliases, and most Dart `Club` aliases—is deletion/refactor work after authority is repointed.

### Retirement requirements and wrong-order breakage

1. With owner approval, verify or rerun the organizer copier against the disposable environment, then make `organizerTeamMemberships` plus a single owner field the only authority. The existing tool is useful for parity but is not a deletion tool.
2. Repoint host discovery, manager helpers, reviews, payments, profiles, event mutation, safety deletion, posts, follows, claims, and admin intake to canonical organizer paths.
3. Stop every organizer-to-club mirror and all legacy trigger/callable exports. Remove old routes at the same time as route generators/checks and tests.
4. Migrate the dependent `clubId` graph described in Theme 2, then tighten rules and indexes.
5. Rewrite media references into `organizers/`, add organizer moderation first, then delete `clubs/` and `users/{uid}/hostedMedia/` objects and rules.
6. Remove old schemas, source adapters, generated contract output, fixtures, and the additive migration tool; change `tool/check_organizer_nomenclature.mjs:36-154` from a migration allowlist into a no-reintroduction guard or retire it.

Deleting `clubs` before steps 1–3 can lock hosts out and break review/payment/profile/event operations. Removing `clubId` before Theme 2 is complete breaks rule authorization and all Event Success descendants. Removing storage rules before media reference repair produces broken images.

## Theme 2 — Event organizer identity and descendant collections

**Rating:** difficulty 5/5; blast radius 5/5. **Status:** `clubId` is load-bearing in rules and many server documents; the dual-field contract is internally inconsistent.

The root event schema requires `clubId` but only declares `organizerId` as optional (`contracts/firestore/events.schema.json:20-28`, `contracts/firestore/events.schema.json:60-70`). The create-event payload does the reverse: it requires `organizerId` and marks `clubId` deprecated (`contracts/callables/create_event_payload.schema.json:8-30`). The writer then persists both (`functions/src/events/mutateEvent.ts:284-298`) and uses both in dependent writes (`functions/src/events/mutateEvent.ts:335-351`). Flutter reads `organizerId ?? clubId`, stores that value as `clubId`, and aliases it back to `organizerId` (`lib/contexts/events/domain/event.dart:198-217`, `lib/contexts/events/domain/event.dart:256`). This is verified schema/writer disagreement, not merely naming debt.

Rules still authorize event reads and writes through the fallback (`firestore.rules:155-208`), Event Success rules explicitly require/compare `clubId` (`firestore.rules:1324-1343`, `firestore.rules:1532-1678`), and Storage event authority falls back across identities (`storage.rules:185-205`).

### Complete Firestore identity inventory

| Shape | Collections and evidence | Classification |
|---|---|---|
| `clubId` only, required | `club_claim_requests` (`contracts/firestore/club_claim_requests.schema.json:14-35`), `club_host_claims` (`contracts/firestore/club_host_claims.schema.json:14-22`), `club_memberships` (`contracts/firestore/club_memberships.schema.json:21-31`), `club_schedule_locks` (`contracts/firestore/club_schedule_locks.schema.json:25-48`) | Delete with the old organizer authority graph. |
| Both required | `event_attendee_imports` (`contracts/firestore/event_attendee_imports.schema.json:14-34`), `event_attendees` (`contracts/firestore/event_attendees.schema.json:14-40`), `event_roster_handoffs` (`contracts/firestore/event_roster_handoffs.schema.json:14-27`), `event_runtime_claim_requests` (`contracts/firestore/event_runtime_claim_requests.schema.json:14-30`), `event_runtime_participants` (`contracts/firestore/event_runtime_participants.schema.json:14-34`), `event_success_assignment_drafts` (`contracts/firestore/event_success_assignment_drafts.schema.json:14-33`), `reviews` (`contracts/firestore/reviews.schema.json:21-35`) | Redundant shadow identity; rewrite and require only `organizerId`. |
| `clubId` required, `organizerId` optional | `event_broadcasts` (`contracts/firestore/event_broadcasts.schema.json:14-45`), `event_invite_links` (`contracts/firestore/event_invite_links.schema.json:14-40`), `event_participations` (`contracts/firestore/event_participations.schema.json:22-44`), `event_private_access` (`contracts/firestore/event_private_access.schema.json:14-27`), `event_safety_reports` (`contracts/firestore/event_safety_reports.schema.json:14-31`), `event_waitlist_offers` (`contracts/firestore/event_waitlist_offers.schema.json:22-43`), `user_event_schedule_locks` (`contracts/firestore/user_event_schedule_locks.schema.json:25-53`), and `events` itself (`contracts/firestore/events.schema.json:20-70`) | Legacy field is still the schema source of truth; migration must precede deletion. |
| Event Success: `clubId` required, organizer optional | arrivals, assignments, compatibility responses, feedback, plans, preferences, scorecards, standings, outcomes, and wingman requests (`contracts/firestore/event_success_arrival_missions.schema.json:22-42`, `contracts/firestore/event_success_assignments.schema.json:22-41`, `contracts/firestore/event_success_compatibility_responses.schema.json:22-37`, `contracts/firestore/event_success_feedback.schema.json:22-40`, `contracts/firestore/event_success_plans.schema.json:22-43`, `contracts/firestore/event_success_preferences.schema.json:22-38`, `contracts/firestore/event_success_scorecards.schema.json:22-48`, `contracts/firestore/event_success_standings.schema.json:14-71`, `contracts/firestore/event_success_unit_outcomes.schema.json:14-85`, `contracts/firestore/event_success_wingman_requests.schema.json:22-39`) | Load-bearing in schema and rules; migrate as one Event Success tranche. |
| Both optional | activity notifications and matches (`contracts/firestore/activity_notifications.schema.json:92-101`, `contracts/firestore/matches.schema.json:125-129`) | Rewrite synthetic documents/producers, then delete `clubId`. |

The generated registry faithfully amplifies these source contracts (`tool/contracts/generated/schema_contract_registry.mjs:17188-28586`), as do generated Functions/Dart types and Freezed output. Those are not separate design decisions; regenerate them from corrected source schemas and domain sources.

### Retirement requirements and wrong-order breakage

Rewrite root events and every descendant in one data operation or delete/reseed the synthetic feature corpus. Repoint Functions, Flutter, admin, rules, Storage, indexes, analytics payloads, notifications, matches, and routes to `organizerId`. Then stop dual writes, require `organizerId`, delete `clubId`, and regenerate artifacts. Removing `clubId` from root events before rules and Event Success are repointed rejects legitimate host actions; removing it from descendants first breaks joins and cleanup; changing only Dart names leaves the database dual-shaped.

## Theme 3 — Event policy, location, and provenance

**Rating:** difficulty 4/5; blast radius 5/5. **Status:** legacy scalar fields remain load-bearing; provenance fallback is broken.

### What exists and why

- `eventOrigin` and `eventPolicy` are optional, and missing origin is documented as Catch-native (`contracts/firestore/events.schema.json:68-71`). Current create/update writes populate origin and policy (`functions/src/events/mutateEvent.ts:820-875`), so missing-origin tolerance protects only older/malformed documents.
- Booking authority rejects only an explicitly external origin; absence passes as Catch (`functions/src/events/eventOrigin.ts:4-11`). That is a fail-open authorization defect once current writers guarantee provenance.
- The canonical policy bundle falls back to capacity, price, constraints, and gender-count scalars in Functions (`functions/src/events/eventPolicy.ts:113-165`, `functions/src/events/eventPolicy.ts:234`, `functions/src/events/eventPolicy.ts:558`) and Flutter (`lib/contexts/events/domain/event.dart:301-335`).
- Flutter additionally synthesizes a `legacyUnattributed` cohort from `bookedCount` when cohort maps are absent (`lib/contexts/events/domain/event.dart:202`, `lib/contexts/events/domain/event.dart:317-333`). That fallback is part of the policy/counter migration and must disappear only after explicit cohort maps are seeded.
- The meeting-location migration still preserves `meetingPoint`, `startingPointLat`, `startingPointLng`, and `locationDetails` (`contracts/migrations/event_meeting_location.json:5-53`). Functions normalize/synthesize and mirror both shapes (`functions/src/events/mutateEvent.ts:887-893`, `functions/src/events/mutateEvent.ts:1334-1436`, `functions/src/events/mutateEvent.ts:1499-1545`); Flutter and discovery projection also synthesize (`lib/contexts/events/domain/event.dart:286-300`, `functions/src/events/eventDiscoveryProjection.ts:74-108`).
- The migration receipt reports nine unresolved production documents (`contracts/migrations/event_meeting_location.json:45-50`). Under the owner's synthetic-data policy, that is a reseed/repair list, not a reason to preserve the fallback.

### Retirement requirements and wrong-order breakage

Choose and document `EventPolicyBundle`, `meetingLocation`, and explicit `eventOrigin` as required canonical fields. Rewrite/reseed all events, validate coordinates and origin, repoint discovery/booking/waitlist/admin/Flutter reads, then reject old input fields and remove mirrors. Tighten schema and rules last. Deleting location scalars before discovery is repointed loses coordinate indexing; removing policy scalars before all consumers use the bundle changes price/capacity/eligibility; requiring origin before repairing data rejects events, but continuing the fail-open fallback can grant Catch booking to an external event.

## Theme 4 — Push tokens and notification payloads

**Rating:** difficulty 4/5; blast radius 4/5. **Status:** `fcmToken` is load-bearing; the intended replacement is incomplete and therefore broken.

Flutter writes both `users.fcmToken` and an installation document (`lib/platform/push/fcm_service.dart:223-258`). Firestore rules permit both (`firestore.rules:404-452`, `firestore.rules:685-704`), but there is no `pushInstallations` contract and no Functions reader. Every production sender still reads the single `fcmToken`: club/organizer posts (`functions/src/clubs/clubPosts.ts:278-282`, `functions/src/organizers/organizerPosts.ts:203-223`), event broadcast/decisions/attendance/reminders/waitlist/mutations (`functions/src/events/sendEventBroadcast.ts:697-715`, `functions/src/events/decideEventJoinRequest.ts:325-327`, `functions/src/events/markEventAttendance.ts:241-250`, `functions/src/events/sendEventReminders.ts:127-133`, `functions/src/events/waitlistOffers.ts:762-766`, `functions/src/events/mutateEvent.ts:1899-1983`), matches/messages (`functions/src/matching/onMatchCreated.ts:114-119`, `functions/src/matching/onMessageCreated.ts:163-170`), and Cross Paths invitations (`functions/src/crossPaths/invitations.ts:1270-1276`). The broadcast source explicitly says producers must migrate together (`functions/src/events/sendEventBroadcast.ts:698-715`).

Define a push-installation schema, uniqueness/lifecycle/invalid-token policy, and account-deletion behavior. Refactor all senders to fan out over active installations and prune invalid tokens. Only after those tests pass should Flutter stop writing `fcmToken`, the user schema/rules/generated types drop it (`contracts/firestore/users.schema.json:291-296`), and account deletion stop removing it (`functions/src/safety/accountDeletion.ts:141`). Deleting `fcmToken` first disables all push despite the apparent dual write.

FCM navigation also accepts `organizerId ?? clubId` (`lib/platform/push/fcm_service.dart:39-95`). Migrate every notification producer and stored activity notification to `organizerId` before removing the payload fallback.

## Theme 5 — Organizer supply capabilities

**Rating:** difficulty 2/5; blast radius 5/5. **Status:** backfill recorded complete, but client behavior contradicts the contract.

The migration says Flutter and web fail closed and production backfill is complete (`contracts/migrations/organizer_supply_capabilities.json:39-46`, `contracts/migrations/organizer_supply_capabilities.json:70-73`). In reality:

- Dart derives missing capabilities and treats legacy host ownership as managed (`lib/kernel/organizer_supply_capabilities.dart:99-128`).
- The website has an explicit compatibility branch that defaults missing authority to public-readable and derives claims/reviews from other fields (`website/src/features/organizers/organizerPolicy.ts:111-181`).
- Functions also derives a missing projection, although its ownership-based derivation is more conservative (`functions/src/shared/organizerSupplyCapabilities.ts:41-65`).
- The organizer schema leaves `supplyCapabilities` optional (`contracts/firestore/organizers.schema.json:344-350`).

This is broken contract conformance, not needed compatibility. Verify/reseed every organizer with an explicit projection, require the property, and have all three runtimes reject or return no capability when absent. Do this before removing derivation. Removing fallback before fixing documents hides booking/contact/review actions, while retaining the website's fallback can expose unsupported actions.

## Theme 6 — Profiles and profile-photo storage

**Rating:** difficulty 3/5; blast radius 3/5. **Status:** mostly stale deletion paths; caption handling is broken.

### Activity preferences, bio, and name

The activity-preferences contract records remote cleanup complete in all environments (`contracts/migrations/profile_activity_preferences.json:43-50`), yet Dart and the Functions projection still read root running fields (`lib/contexts/profiles/domain/user_profile.dart:340-374`, `lib/contexts/profiles/domain/public_profile.dart:79-135`, `functions/src/shared/profileProjection.ts:121-155`). These fallbacks are deletion-only after fixtures are canonical.

`bio` is tolerated by both private and public profile schemas (`contracts/firestore/users.schema.json:312-314`, `contracts/firestore/public_profiles.schema.json:157-159`) and read by the same Dart/Functions adapters (`lib/contexts/profiles/domain/user_profile.dart:301-374`, `lib/contexts/profiles/domain/public_profile.dart:79-135`, `functions/src/shared/profileProjection.ts:158-190`). No current writer was found. Delete it after reseeding the synthetic profiles.

Private users require `name`, `firstName`, `lastName`, and `displayName` (`contracts/firestore/users.schema.json:13-16`, `contracts/firestore/users.schema.json:38-54`); public projection falls back to `name` (`lib/contexts/profiles/domain/user_profile.dart:301-308`, `functions/src/shared/profileProjection.ts:59-68`). Choose structured identity plus `displayName` for private users, rewrite writers/data, then remove private `name`. `publicProfiles.name` is the deliberate public display projection and is not itself legacy.

### Photos and captions

The photo migration says the object shape is canonical, legacy arrays have been retired, and new captions are no longer written (`contracts/migrations/profile_photos_storage.json:64-89`). The embedded schema calls `caption` legacy-only (`contracts/embedded/photo_prompt_answer.schema.json:5-29`). Current code contradicts that contract: Functions accepts/preserves/writes captions (`functions/src/profiles/updateUserProfile.ts:271-294`, `functions/src/profiles/updateUserProfile.ts:505-520`) and projects them (`functions/src/shared/profileProjection.ts:198-217`); Dart serializes them (`lib/contexts/profiles/domain/profile_prompts.dart:82-90`, `lib/contexts/profiles/domain/profile_prompts.dart:151-159`, `lib/contexts/profiles/domain/profile_prompts.dart:198-253`, `lib/contexts/profiles/domain/profile_photo.dart:145-160`, `lib/contexts/profiles/domain/profile_photo.dart:270-288`). Fix the current writer/model, clear synthetic captions, and then remove the field.

`tool/demo/seed_demo_data.mjs:1141-1198` accepts legacy photo arrays. Convert its input fixtures/source and delete that adapter. `tool/data/validate_firestore_data.mjs:30-38` is useful as an absence check until cleanup, then should reject rather than tolerate the old fields. The migration contract says the one-time photo backfill is retired, while `tool/tools_manifest.json:2312-2323` still marks it active and the script remains present; that is tool-registry drift.

Thumbnail-URL fallback to a full photo while a thumbnail is being generated is runtime resilience, not a legacy schema, and should remain. Likewise, a flattened `photoUrls` response used by Cross Paths is a current API projection, not proof of old array storage.

## Theme 7 — Event Success implicit defaults and organizer identity

**Rating:** difficulty 4/5; blast radius 4/5. **Status:** load-bearing defaults; easiest retirement is a synthetic-corpus reseed.

In addition to the `clubId` collections in Theme 2, Event Success accepts old/missing plan structure:

- `EventSuccessStructureConfig.legacyDefault` and its parser synthesize missing structure (`lib/contexts/formats/domain/event_success_structure.dart:171-205`, `lib/contexts/formats/domain/event_success_structure.dart:273-343`).
- default factories and migration heuristics infer old behavior (`lib/contexts/formats/domain/event_success_defaults.dart:27-35`, `lib/contexts/formats/domain/event_success_defaults.dart:66-124`, `lib/contexts/formats/domain/event_success_defaults.dart:191-238`).
- missing platform modules are inserted while reading (`lib/contexts/formats/domain/event_success_models.dart:237-245`).
- plans default revisions/flags and infer a legacy reveal index (`lib/contexts/live/domain/event_success_plan.dart:34-52`, `lib/contexts/live/domain/event_success_plan.dart:188-199`).
- backend assignment topology and reveal state also default missing values (`functions/src/eventSuccess/assignmentTopology.ts:118-130`, `functions/src/eventSuccess/liveControl.ts:472-483`); the optimizer contains compatibility wrappers and legacy relaxation identifiers (`functions/src/eventSuccess/assignmentOptimizer.ts:354-442`, `functions/src/eventSuccess/assignmentOptimizer.ts:825`).
- runtime treats check-in as always enabled even when an old plan carries the former module id (`lib/contexts/live/domain/event_success_runtime.dart:104-108`), and host-draft normalization maps old grouping module ids and deprecated team-rotation defaults to current structure (`lib/contexts/formats/domain/event_success_feature_state.dart:144-161`, `lib/contexts/formats/domain/event_success_feature_state.dart:286-343`).

Reseed plans with explicit structure, module set, revisions, topology, and published/reveal indices; migrate the entire Event Success identity graph to `organizerId`; then make those fields required in Dart, Functions, schemas, and rules before deleting fallbacks. Removing defaults first can change assignment or reveal behavior for any remaining plan. The product's compatibility questionnaire, compatibility score, and ranking policy are matching-domain concepts (`contracts/firestore/event_success_compatibility_responses.schema.json:1-9`, `contracts/firestore/event_success_assignments.schema.json:243-420`), not backwards compatibility, and must remain.

## Theme 8 — Attendance revision versus legacy toggle

**Rating:** difficulty 2/5; blast radius 4/5. **Status:** broken coexistence.

`attendanceRevision` is optional and missing means zero (`contracts/firestore/event_attendees.schema.json:113-118`, `lib/contexts/bookings/domain/event_attendee.dart:45-65`). Current absolute attendance operations use the revision, but the exported legacy toggle callable changes attendance status without incrementing it (`functions/src/events/eventAttendees.ts:248-317`, `functions/src/events/eventAttendees.ts:1008-1015`). The old contract and repository wrapper remain (`contracts/callables/mark_event_attendee_attendance_payload.schema.json:1-12`, `lib/contexts/bookings/data/event_attendee_repository.dart:119-140`). A revisioned client can therefore accept stale state after a toggle.

Remove all internal callers and the exported toggle first. Rewrite attendee documents with explicit `attendanceRevision: 0` and explicit pre-check-in status, then require the field and remove all `?? 0` parsing. Removing the field fallback before the reseed rejects documents; retaining the toggle invalidates the concurrency contract.

## Theme 9 — Invitation bearer-token fallback

**Rating:** difficulty 2/5; blast radius 4/5. **Status:** a security downgrade, not worthwhile compatibility.

Version 2 invite links use opaque secrets, but token resolution still accepts a raw invite-link document ID for pre-v2 links (`functions/src/events/inviteLinks.ts:483-503`, `functions/src/events/inviteLinks.ts:971-993`). Callable contracts explicitly allow the legacy ID (`contracts/callables/claim_event_runtime_access_payload.schema.json:19`, `contracts/callables/register_public_event_payload.schema.json:16`, `contracts/callables/record_event_invite_link_open_payload.schema.json:5-6`). A document ID is not an equivalent bearer secret.

Delete/reseed pre-v2 links and secrets, require v2 tokens, remove raw-ID branches and compatibility fixtures/copy, and keep `inviteLinkId` only as internal attribution. Removing the fallback before deleting old links invalidates them; with no launched users, that is acceptable once synthetic links are reseeded.

## Theme 10 — Media paths and moderation

**Rating:** difficulty 3/5; blast radius 4/5. **Status:** old paths are partially load-bearing; tooling is broken, while canonical moderation has been repaired.

The schema calls `users/{uid}/hostedMedia/{fileName}` retired and read-only (`contracts/storage/hosted_media.schema.json:5-15`), yet Storage rules keep it public (`storage.rules:222-244`) and the current uploader contract parser accepts both `hostedMedia/` and `clubs/` in addition to canonical organizer/event paths (`lib/contexts/profiles/data/image_upload_repository.dart:501-522`). The organizer migration also retains `clubs/` logos/covers (`storage.rules:122-153`, `storage.rules:189-203`).

`tool/data/hygiene_media_paths.mjs:365-385` can copy legacy `clubs/` objects into `hostedMedia/`, and its report labels that retired path current/canonical (`tool/data/hygiene_media_paths.mjs:480-510`). Under the current contracts, that tool moves data in the wrong direction and must not be used for retirement without redesign.

Moderation now recognizes both canonical `organizers/` and legacy `clubs/`
paths (`functions/src/moderation/moderatedPhotoPath.ts:1-17`), and the Functions suite
locks that behavior with the “canonical and legacy organizer media paths are
moderated” regression (`functions/src/moderation/moderatedPhotoPath.test.ts:5-14`). Treat that repair as a satisfied migration prerequisite:
rewrite all stored URLs/storage paths, then remove legacy path acceptance,
rules, old thumbnail triggers, and objects while preserving canonical
moderation coverage.

## Theme 11 — Small persisted/API compatibility surfaces

**Rating:** difficulty 1–3/5 each; blast radius 1–3/5. **Status:** mostly deletion-only after reseeding the named synthetic state.

| Artifact | Evidence and current role | Retirement and ordering |
|---|---|---|
| Match singular event fallback | `eventIds` reads old `eventId`; matches also carry `clubId` and `organizerId` (`lib/contexts/connections/domain/match.dart:13-45`, `lib/contexts/connections/domain/match.dart:70-80`; backend producer at `functions/src/matching/onMatchCreated.ts:165-177`). | Rewrite matches, change producers, regenerate Freezed/JSON, then delete fields/fallback. Difficulty 2, blast 2. |
| Host-inquiry match IDs | old Host conversations can occupy the same pair-only match ID as dating matches; the legacy conversation handler resolves that ID and the swipe trigger creates a hashed alternate to avoid overwriting it (`functions/src/clubs/clubHostConversations.ts:107-138`, `functions/src/clubs/clubHostConversations.ts:205-219`, `functions/src/matching/onSwipeCreated.ts:138-169`, `functions/src/matching/onSwipeCreated.ts:198-210`). | Delete/reseed old Host inquiry matches and old handler, then remove the collision branch and fallback ID function. Difficulty 2, blast 3. |
| Onboarding draft versions | v0/v1 step identifiers are migrated on local-draft load (`lib/onboarding/presentation/onboarding_controller.dart:550-565`). | Clear disposable local drafts and delete migration. Difficulty 1, blast 1. |
| Consumer Remote Config names | Consumer reads role-prefixed keys with fallback to old unprefixed keys (`lib/contexts/account/domain/app_version_config.dart:9-33`, `lib/contexts/account/domain/app_version_config.dart:38-73`); template contains both (`firebase/remote_config.template.json:3-86`). | Publish/reset role-scoped configuration first, then remove fallback/template keys. External live Remote Config was not inspected. Difficulty 2, blast 3. |
| Explore response aliases | backend returns both `organizerIds` and `clubIds`; Flutter falls back; schema requires both (`functions/src/search/exploreSearch.ts:108-113`, `lib/contexts/discovery/data/explore_search_repository.dart:58-73`, `contracts/callable_responses/explore_search_response.schema.json:8-15`). It also falls back to old Algolia env names (`functions/src/search/exploreSearch.ts:169-179`). | Rename config, deploy, switch response/client, then delete old field/env names. Host analytics has the same dual list (`contracts/callable_responses/host_analytics_response.schema.json:37-43`). Difficulty 2, blast 2. |
| Waitlist role `runner` | HTTP schema, website, and Functions normalize `runner` to `member` (`contracts/http/join_waitlist_request.schema.json:34`, `functions/src/waitlist/joinWaitlist.ts:20-23`, `functions/src/waitlist/joinWaitlist.ts:189-195`, `functions/src/waitlist/joinWaitlist.ts:457`). | Remove old fixture/input branch in one tranche. Difficulty 1, blast 1. |
| Deleted-user tombstone | schema requires `status`; handler treats missing-status tombstone as completed (`contracts/firestore/deleted_users.schema.json:10-29`, `functions/src/safety/accountDeletion.ts:53-63`). | Clear/reseed tombstones, then delete fallback. Difficulty 1, blast 2. |
| Event-intake decision shape | admin accepts an old flat decision edit (`functions/src/admin/eventIntakeDashboard.ts:471-488`). | Rewrite/delete synthetic decisions before removing branch. Difficulty 1, blast 1. |
| Host profile linked clubs | `linkedClubIds` is current persisted nomenclature (`contracts/firestore/host_profiles.schema.json:48-53`, `firestore.rules:496-514`, `lib/contexts/organizers/data/host_profile_repository.dart:75-91`). | Prefer deriving access from canonical team membership; otherwise rename to `linkedOrganizerIds` with one rewrite. Difficulty 2, blast 3. |
| External-event compatibility ID | `compatibilityClubId` is required even though the importer writes the same value as `canonicalHostId` (`contracts/firestore/external_events.schema.json:16-43`, `tool/organizer_intake/lib/event_import_plan_core.mjs:265-266`, `tool/organizer_intake/lib/event_import_plan_core.mjs:346-347`, retired 2026-10-29 and last present at `bb58cad05`). | Delete redundant producer/schema/admin/Dart/generated/fixture field together. Difficulty 2, blast 2. |
| Public/app legacy routes | Flutter redirects old Host paths (`lib/routing/go_router.dart:571-630`, `lib/routing/go_router.dart:722-780`); website stores `legacyPaths` (`contracts/public/website_host_listing_projection.schema.json:59-66`, `contracts/firestore/organizers.schema.json:450-462`). | With no launched URLs, delete route aliases plus manifests/generators/checks/tests in one tranche. Difficulty 2, blast 2. |
| Review organizer alias | `reviews` requires both organizer and deprecated club identity (`contracts/firestore/reviews.schema.json:21-35`); review writer and stat sync still consult clubs (`functions/src/reviews/mutateReview.ts:257`, `functions/src/reviews/syncClubReviewStats.ts:69`). | Migrate with Theme 2, repoint stats, then remove `clubId`. Difficulty 2, blast 3. |
| `config_cities.cityNames` | schema calls it a compatibility whitelist (`contracts/firestore/config_cities.schema.json:213-216`), but rules now use `launchMarketIds` (`firestore.rules:55-68`). Only schema/fixtures/generated tooling and the config writer remain (`tool/lib/location_markets.mjs:352-363`). | Deletion-only after rewriting synthetic config and generated output. Difficulty 1, blast 1. |
| Profile readiness version fallback | versionless running preferences with selected values are accepted as a legacy complete profile (`lib/contexts/profiles/domain/profile_readiness.dart:30-65`). | Require the current preference version after profile reseed. Difficulty 1, blast 2. |
| Deprecated demo CLI flag | `--no-messages` remains accepted even though no-message behavior is already the default (`tool/demo/demo_ops.mjs:1547`). | Remove flag/help/parser/tests together. Difficulty 1, blast 1. |

## Theme 12 — Compile-time and visual compatibility shims

**Rating:** difficulty 1–3/5; blast radius 1–2/5. **Status:** low-priority source cleanup, not data migration.

The following deprecated wrappers/aliases are real compatibility artifacts, but they are not load-bearing data sources. Delete or rename their remaining internal/test call sites and then remove the symbol:

- deprecated repository/domain wrappers: organizer analytics alias (`lib/contexts/organizers/data/clubs_repository.dart:360`), attendance toggle (`lib/contexts/bookings/data/event_attendee_repository.dart:121`), event eligibility alias (`lib/contexts/events/domain/event.dart:361`), participation aliases (`lib/contexts/bookings/domain/event_participation.dart:57-61`), Explore club-ID alias (`lib/contexts/discovery/data/explore_search_repository.dart:72`), and health/runner/weekly-activity typedefs or SharedPreferences fallback (`lib/contexts/bookings/data/health_activity_repository.dart:121-153`, `lib/contexts/bookings/domain/runner_activity.dart:5-44`, `lib/contexts/bookings/domain/weekly_activity_summary.dart:13-36`, `lib/contexts/bookings/domain/weekly_activity_summary.dart:263`).
- UI composition aliases: club-detail dock names (`lib/clubs/presentation/detail/widgets/club_detail_dock.dart:22`, `lib/clubs/presentation/detail/widgets/club_detail_dock.dart:217`), top-bar alias (`lib/core/widgets/catch_top_bar_components.dart:165`), old dashboard constructor/provider names (`lib/dashboard/presentation/dashboard_full_view_model.dart:83-90`, `lib/dashboard/presentation/dashboard_full_view_model.dart:292`, `lib/dashboard/presentation/dashboard_full_view_model.dart:552-555`), `HostEmptyActionCard` (`lib/hosts/presentation/widgets/host_empty_action_card.dart:10`), and inline editor prompt compatibility input (`lib/user_profile/presentation/widgets/profile_inline_prompt_entry_editor.dart:44`).
- internal composition seams: the host editor still uses `ProfileInlineTextValue` as an adapter over canonical `CatchField.input` (`lib/user_profile/presentation/widgets/inline_editor_text.dart:200-268`); Explore items accept a direct `_status` test/legacy override instead of `ViewerEventAvailability` (`lib/explore/presentation/explore_feed_view_model.dart:145-173`); and Explore's body accepts optional club rails and a non-pinned flat sliver mode (`lib/explore/presentation/widgets/explore_body.dart:20-55`). Remove these only after their internal call sites/tests use the canonical constructors.
- theme aliases: `accent`, `accentInk`, `heroGrad`, and `sunsetLight`/`sunsetDark` (`lib/platform/theme/catch_tokens.dart:73-102`, `lib/platform/theme/catch_tokens.dart:210-220`); website CSS legacy aliases generated from token source (`design/tokens/catch.tokens.json:66-82`, `tool/design_tokens.dart:116-126`); and the large Material-icon facade that exists to move callers off direct `Icons.*` (`lib/platform/theme/catch_icons.dart:128-401`). These are a design-system migration, not schema compatibility. Retire only through the design-system owner and generated-token flow, after replacing call sites; do not couple them to the data cutover.

`CatchField.content` deliberately preserves the older Flutter meaning of `body` while adding the React supporting-copy contract (`lib/core/widgets/catch_field.dart:101-130`). This is an active component API choice, not stale persisted data. `ErrorLogger.logError`, `logFlutterError`, and `logAppException` are labeled backward-compatible convenience methods but all delegate to the canonical structured logger (`lib/platform/errors/error_logger.dart:185-226`); keeping ergonomic delegates does not create a second data or authority model, so there is little value in retiring them solely for the comment.

## Tooling disposition

Tool mentions were separated from runtime debt rather than counted as 83 cleanup items:

- **Keep only until their named migration is executed, then delete or turn into rejection checks:** organizer copy (`tool/data/migrate_clubs_to_organizers.mjs:27-46`), event-location backfill (`tool/data/backfill_event_meeting_locations.mjs:65-207`), profile-photo backfill (`tool/data/backfill_profile_photos.mjs:86-215`), public-profile recomputation (`tool/data/recompute_public_profiles.mjs:295-310`), host-profile recomputation (`tool/data/recompute_club_host_profiles.mjs:190-205`), and Firestore retired-field validation (`tool/data/validate_firestore_data.mjs:29-38`, `tool/data/validate_firestore_data.mjs:312-328`). These are appropriate retirement tools; their existence is not an argument to preserve the old shape.
- **Delete/extract after the organizer cutover (done 2026-10-29):** `tool/organizer_intake` was retired with its `legacyClubCompatibility` and `legacyPaths` entity builder, batch schema and promotion-bridge check; they last existed at `bb58cad05`. The URL normalizer moved to `operations/src/cli/normalize-surface-url.mjs` and the Firestore boundary check to `tool/web/check_admin_review_bridge.mjs`.
- **Low-risk app/build aliases:** the root Consumer `lib/main.dart` wrapper and the root `lib/main_consumer*.dart`/`lib/main_host*.dart` entrypoints were removed on 2026-10-22 after every package, CI, and release invocation had moved to `apps/<role>/lib/main*.dart`; `tool/app_targets.json` no longer declares legacy entrypoints. The Functions parameter preparer uses quoted whitespace to satisfy Firebase's parameter discovery (`tool/firebase/prepare_functions_params_for_deploy.mjs:35-45`); that is compatibility with a current external CLI constraint, so verify a current CLI accepts empty/unset values before retiring it.
- **Do not treat as app-schema debt:** BigQuery `--use_legacy_sql=false` flags select standard SQL (`tool/analytics/deploy_host_analytics_bigquery.sh:139-145`, `tool/analytics/deploy_user_analytics_bigquery.sh:130-136`); Xcode Cloud names are rollback/audit metadata rather than client data (`tool/app_targets.json:401`, `tool/app_targets.json:462`); denial scanners and fixtures that assert retired paths stay absent are enforcement; design adoption ledgers, screenshot inventories, and migration receipts are historical evidence. They should not be mass-deleted to reduce a grep count.

The field-surface adoption ledger and component-catalog text use “legacy” to describe completed component adoption or supported constructor inputs (`design/components/flutter_field_surface_adoption.json:12-121`, `design/components/catch.components.json:2842-2854`). Those are design governance records, not live data shapes. Keep the historical decision text; separately remove any compatibility constructor input when its code call sites reach zero.

## Artifacts that should not be retired for tidiness

Several grep hits are canonical product or platform terminology:

- `organizerType: "club"` is a canonical organizer subtype, not a storage fallback (`contracts/shared/event_common.schema.json:465-475`). Preserve the value even if Dart folders/types are later renamed.
- Event Success “compatibility” questions, scores, assignment signals, and `compatibilityAffectsRanking` describe interpersonal matching, not backwards compatibility (`contracts/firestore/event_success_compatibility_responses.schema.json:1-9`, `contracts/firestore/event_success_plans.schema.json:107-111`).
- `swipes.reactionTargetType: "compatibility"` describes the profile-card section that received a reaction (`contracts/firestore/swipes.schema.json:60-72`). Preserve it. The `swipes` schema filename/title is historical nomenclature because the actual collection is `profileDecisions`, but the product verb “swipe” remains legitimate (`contracts/firestore/swipes.schema.json:1-12`, `contracts/migrations/swipes_to_profile_decisions.json:40-67`).
- BigQuery's `useLegacySql: false` selects standard SQL and is correct platform configuration; it must not be “cleaned up.”
- Generic `x-callable-aliases` commonly groups multiple current actions behind one schema, for example organizer campaign and Event Success actions (`contracts/callables/organizer_campaign_action_payload.schema.json:6`, `contracts/callables/event_success_live_action_payload.schema.json:6`). Retire only the specifically club-named or superseded entry points, not the schema-sharing mechanism.
- Historical migration receipts, audit prose, fixtures explicitly asserting rejection of old shapes, and CI evidence are not runtime tolerance. Keep completed migration records as history unless the documentation lifecycle owner archives them. Do not recreate the removed audit-registry layer.
- Operations `shadow`/`compatibility-only` workflow modes are controlled rollout semantics (`contracts/operations/workflow_manifest.schema.json:157-190`), not user-data backwards compatibility.
- Organizer thumbnail fallback to a full-size image while processing catches up is availability resilience, not an old schema.

## Broken rather than legacy

| Finding | Direct evidence | Consequence |
|---|---|---|
| Event identity contract inversion | event schema requires `clubId` (`contracts/firestore/events.schema.json:20-28`); create payload requires `organizerId` (`contracts/callables/create_event_payload.schema.json:8-30`) | Generated contracts encode two different sources of truth. |
| Event provenance fails open | missing origin is called Catch-native (`contracts/firestore/events.schema.json:68-71`); checker rejects only explicit external (`functions/src/events/eventOrigin.ts:4-11`) | Missing/malformed provenance can receive Catch booking behavior. |
| Attendance revisions can be bypassed | old toggle changes state without revision update (`functions/src/events/eventAttendees.ts:248-317`) while revision protocol exists (`contracts/firestore/event_attendees.schema.json:113-118`) | Stale absolute writes can be accepted. |
| Capability migration claim is false | complete/fail-closed claim (`contracts/migrations/organizer_supply_capabilities.json:39-46`, `contracts/migrations/organizer_supply_capabilities.json:70-73`) versus Flutter/web derivation (`lib/kernel/organizer_supply_capabilities.dart:99-128`, `website/src/features/organizers/organizerPolicy.ts:111-181`) | Unsupported actions can appear; clients disagree on absence. |
| Canonical organizer media moderation | **Resolved:** the trigger accepts canonical and legacy organizer paths (`functions/src/moderation/moderatedPhotoPath.ts:1-17`) and the Functions suite covers both (`functions/src/moderation/moderatedPhotoPath.test.ts:5-14`). | Keep the regression while retiring legacy paths. |
| Push replacement is write-only | Flutter writes installations (`lib/platform/push/fcm_service.dart:240-258`); all senders use `fcmToken`, and only rules mention the subcollection (`firestore.rules:685-704`) | Removing the old token today disables push; multi-device state is unused. |
| Caption contract disagrees with writers | legacy-only schema (`contracts/embedded/photo_prompt_answer.schema.json:5-29`) versus active writes (`functions/src/profiles/updateUserProfile.ts:271-294`, `functions/src/profiles/updateUserProfile.ts:505-520`) | New documents can recreate supposedly retired data. |
| Media migration tool targets a retired path | retired schema (`contracts/storage/hosted_media.schema.json:5-15`) versus tool destination/report (`tool/data/hygiene_media_paths.mjs:365-385`, `tool/data/hygiene_media_paths.mjs:480-510`) | Running it can move media away from the canonical organizer layout. |
| Tool registry disagrees with migration state | photo migration marks cleanup tool retired (`contracts/migrations/profile_photos_storage.json:84-89`); manifest marks it active (`tool/tools_manifest.json:2312-2323`) | Tool discovery advertises obsolete operational behavior. |
| Contract catalog still assigns club owners | old collections/callables remain active in `tool/contracts/firestore_contract.json:240-356` | Governance checks normalize the transitional design instead of exposing it. |

## Starting-point verification

| Starting claim | Verdict |
|---|---|
| Clubs-to-organizers migration is incomplete; about 30 Functions files use `clubs`; rules expose public reads. | **Substantively correct, but phase wording needs precision.** The data backfill, canonical primary read, and Flutter fallback retirement are recorded complete; only write freeze and deletion remain (`contracts/migrations/clubs_to_organizers.json:45-72`). Exactly 30 non-test Functions source files directly access `collection("clubs")`, and `firestore.rules:880-882` allows public club reads. |
| `events.organizerId` is optional while `clubId` is required; Dart falls back/aliases. | **Correct.** `contracts/firestore/events.schema.json:20-28`, `contracts/firestore/events.schema.json:60-70`, and `lib/contexts/events/domain/event.dart:198-217`, `lib/contexts/events/domain/event.dart:256`. The additional finding is that the create payload has the inverse requirement. |
| About 15 schemas contain legacy/compat/deprecated fields. | **Directionally correct but materially undercounts the dependency graph.** The named examples exist, except `swipes.reactionTargetType: compatibility` is product semantics, not legacy. More than two dozen event/relationship schemas carry `clubId`, and several compatibility fields are not described with those grep words. |
| `config_cities.cityNames` is a compatibility field. | **The schema description is stale.** It calls `cityNames` a rules whitelist (`contracts/firestore/config_cities.schema.json:213-216`), but current rules use `launchMarketIds` (`firestore.rules:55-68`). No runtime reader was found; it is deletion-only. |
| Approximately 63 `lib`, 65 `functions/src`, 24 `contracts`, and 83 `tool` files match `legacy` case-insensitively. | **Correct at the audited SHA.** The counts are exact. They are not debt counts: product compatibility semantics, historical receipts, rejection fixtures, platform flags, and migration tools account for many hits. |

## Verification and implementation gates for a future retirement

Only read-only migration dry runs and metadata inventories were run for this audit; no apply or mutating check ran. A future implementation should be split into reviewable tranches and prove the following before destructive deletion:

1. canonical organizer/event/profile/push schemas validate all reseeded fixtures and disposable remote data;
2. no production source reads or writes `clubs`, old organizer authority fields, `event.clubId`, old event scalars, `users.fcmToken`, raw invite IDs, or retired profile fields;
3. Firestore and Storage emulator tests prove organizer-team authority, event descendant ownership, external-event fail-closed behavior, media moderation, and push fan-out;
4. source contracts regenerate cleanly and `node tool/run.mjs check --manifest-only` plus the registered data-contract checks pass;
5. focused Flutter, Functions, admin, website, rule, and route tests pass without compatibility fixtures except explicit rejection/absence fixtures;
6. the deletion target is resolved exactly and backed by a recoverable export or accepted disposable-environment reset; and
7. the final tree contains an absence scanner, not a new tracked evidence registry.

Targeted organizer documents, deployed Functions, rules, composite indexes, and
legacy organizer Storage prefixes were inspected live. Remote Config, Algolia,
untargeted collection contents, and untargeted Storage prefixes were not. Claims
about those remaining systems are therefore source- or receipt-derived. Under
the owner's explicit synthetic-data assertion, those gaps affect operational
sequencing, not the conclusion that compatibility may be retired.
