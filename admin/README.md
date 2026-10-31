# Catch Admin

Internal admin and analytics console for Catch operations.

## CI/CD

`.github/workflows/admin-website.yml` validates admin-console changes on pull
requests and deploys the production Firebase Hosting `admin` target after
matching changes land on `main`. The exact build and promotion jobs use the
`prod-hosting` GitHub Environment Vite Firebase/App Check variables and fail
before build if the
dashboard would point at the wrong Firebase project or stay in sample mode.
The uncredentialed build runs once; the promoter deploys only the verified
package bound to Firebase project `catch-dating-app-64e51` and site
`catchdates-admin`.

## Local Development

```bash
npm install
npm run dev
```

The app defaults to `live` data mode. Sample data is available only when a local
development build explicitly sets `VITE_ADMIN_DATA_MODE=sample`; production
builds resolve that value back to `live`. The account menu discloses explicit
local sample mode and Firebase authentication is bypassed only in that mode.
In live mode the shell supports Google account selection and phone OTP sign-in
before any callable data loads. The existing admin-role checks apply to both. The shell
shows the signed-in uid and custom admin claims after Auth resolves, blocks
signed-in users with no Catch admin claim before dashboard data loads, and
surfaces sign-in, claim refresh, and sign-out errors in the UI.

For live Firebase calls, create a local `.env.local` from `env.example` and set:

```bash
VITE_ADMIN_DATA_MODE=live
VITE_ADMIN_FIREBASE_ENV=dev
VITE_ADMIN_APPCHECK_SITE_KEY=<dev-web-app-check-site-key>
VITE_ADMIN_PUBLIC_SITE_ORIGIN=https://catchdates.com
VITE_FIREBASE_MEASUREMENT_ID=<dev-web-measurement-id>
```

Live mode calls `adminGetOverview` for dashboard queue data and
`adminGetHostAnalytics` for host/admin analytics. Overview is a triage and
analytics workspace; access decisions, organizer claim decisions, and organizer
indexing decisions are handled in their owning tabs where the operator must
select a row and enter a review note.

`src/app/adminRoutes.ts` owns the Admin URL patterns, selected-record parameters,
workspace state, and titles. React Router matches this table; feature controllers
receive the resolved state and navigation callbacks. Unknown sections return to
the first permitted section after authentication and role resolution. Partner
and operator-session routes retain their separate entry boundaries.

The app shell owns shared navigation, Firebase auth, role gating, the
plain route title, and feature composition. Overview range state, refresh,
analytics loading, and queue triage live in
`admin/src/features/overview/controllers`.
The top bar omits the production environment label. Non-production environment
and local-data context appear in the account menu only when they change
operator risk; switching Firebase targets still happens through environment
variables and rebuilds.
Catch WhatsApp support on Overview uses the initialized Firebase project's
existing review/send callables. Availability requires successful remote-origin
`true` for the canonical `catch_whatsapp_support_enabled` Remote Config key.
The client and checked-in template default to `false`; no build-time key-name
input is required. Absent, local/default or remote-false values, failed fetch,
stale or retired sessions keep it unavailable. The source declaration does not
prove the live parameter exists or enable it. Remote Config does not approve
setup or sending.
App Check, current roles, backend readiness/suppression and exact human review
remain required. No flag is enabled by source publication.
Admin feature import direction is enforced by
`npm run check:boundaries` and by `npm run build`: app-shell modules may compose
features and shared modules; feature modules may import their own top-level
feature plus shared modules; shared modules must not import app or feature
modules.

The Access tab reads pending access application rows from `adminGetOverview`,
loads selected application detail through `adminGetAccessApplicationDetails`,
and calls `adminDecideAccessApplication` only after an operator explicitly
selects an application and enters a required review note plus an optional cohort
id. The detail panel shows launch-access source fields, referral/invite/social
signals, and bounded deterministic overlap checks. It is the launch-gate review
workspace only; account actions, safety history, payment history, and broad user
search need separate role-scoped contracts before they are exposed here.

The Organizers tab calls `adminListOrganizerDetails` for the canonical
`clubs/{id}` directory, `adminGetOrganizerDetails` for detail hydration,
`adminUpdateOrganizerDetails` for audited partial edits, and
`adminSetOrganizerIndexStatus` for index-ready/noindex publishing decisions.
Organizer save and index decisions require a review note whenever an audited
mutation is sent; unchanged saves short-circuit in the UI without calling the
backend. The organizer list response includes a `generatedAt` snapshot timestamp
shown in the directory scope note. Operator screens do not expose backend
paths, callable names, or generic publishing-contract panels; implementation
details stay in the repository architecture and contract documentation.
Organizer save and index-ready publishing also reserve
`publicRouteReservations/{routeKey}` so website routes are claimed before
canonical listings become indexable.
Organizer save and index-ready publishing also rebuild the server-owned
`clubs/{id}.adminSearch` projection used by `adminListOrganizerDetails` for
token-backed large-list search. Backend query matching owns token search; the
client table only applies tab filters to the rows returned by the callable.
The default Organizer Indore + Mumbai view sends a bounded `citySlugs` backend
filter so the launch-city directory remains complete as the canonical
organizer collection grows.
Organizer public-page previews use `VITE_ADMIN_PUBLIC_SITE_ORIGIN` plus
`clubs/{id}.publicPage.canonicalPath`; if the env var is omitted, the admin
console falls back to `https://catchdates.com`.
The same Organizers workspace lists pending organizer claims through
`adminListOrganizerClaimRequests`, loads bounded requester/profile/club evidence
through `adminGetOrganizerClaimRequestDetails`, and sends approve/reject decisions
through `adminDecideOrganizerClaim`. Approval stays disabled when the requester
profile is incomplete or the claim target is missing, and every decision
requires an operator note. The backend rejects competing active claims and
stale decisions; rejected applicants receive a deterministic activity
notification.
For older organizer documents, dry-run the admin search projection repair
before applying it:

```bash
node tool/data/backfill_organizer_admin_search.mjs --env dev --summary-only
node tool/data/backfill_organizer_admin_search.mjs --env dev --apply
```

The Events tab calls `adminListEventDetails` for the canonical `events/{id}`
directory, `adminGetEventDetails` for detail hydration, and
`adminUpdateEventDetails` for audited safe app-facing edits. Event saves rebuild
the server-owned `events/{id}.adminSearch` projection and event discovery
projection. The default Indore + Mumbai view sends a bounded `citySlugs`
backend filter plus `status: "active"` and `timeWindow: "upcoming"` so the
launch-city list remains complete and chronologically ordered as the event
collection grows. The client-side launch-city, upcoming, and full filters use
the callable response `generatedAt` timestamp as their snapshot clock so visible
rows stay aligned with the server-side time window. Backend query matching owns
admin-search/source-token search; the canonical table and external supply table
now have separate search and filter state so canonical cleanup states such as
Full or Search issues do not hide the source-backed supply review queue, and a
canonical search does not silently constrain external candidates. The external
supply default is the open Indore + Mumbai review queue. Schedule, cancellation,
capacity, pricing, payments,
attendance, and policy fields are intentionally read-only in this first
canonical editor. The same Events workspace also calls
`adminListExternalEventDetails` for read-only `externalEvents/{id}` supply:
reviewed external candidates stay outbound-only, do not use Catch booking,
payments, reservations, or waitlists, and remain separate from canonical
Catch-hosted `events/{id}` documents until a policy-owned importer exists.
External supply rows are selectable so operators can inspect source attribution,
candidate ids, normalized duplicate keys, review batch state, and owner-safe
copy/import-policy checks without opening raw artifacts. Imported events
publish from Organizer Intake's "Imported events" panels through
`adminPublishListingEvents`; the Events workspace only inspects and takes down
external supply. The readiness workspace that read `eventSupplyReadiness/current`
and published one row through `adminPublishExternalEvent` was retired on
2026-10-29, and old `/events/readiness` links open the directory.

Organizer Intake requires an explicit Resolved or Waived choice for every
governed event-import blocker. Waived choices must name the accepted matching
policy-gap decision; selecting approval never silently clears a blocker. The
Events workspace also exposes a separate dry-run-first takedown action. Takedown
preserves the source record and attribution and appends an immutable receipt;
it does not delete the external event.
Sample mode uses explicit canonical Indore and Mumbai event records rather than
host analytics rows, plus read-only external event rows, so the default Events
tab exercises the same launch-city workflow as live mode.
For older event documents, dry-run the admin search projection repair before
applying it:

```bash
node tool/data/backfill_event_admin_search.mjs --env dev --summary-only
node tool/data/backfill_event_admin_search.mjs --env dev --apply
```

The Users tab calls `adminGetUserAnalytics` for a selected `users/{uid}` and
renders the user-safe aggregate analytics response: summary cards, trend
buckets, connection/profile aggregates, coaching refs, and data-quality rows.
It is intentionally read-only. The Users tab input normalizes exact
`users/{uid}`, `uid:{uid}`, or raw uid values into one callable scope.
The tab also shows the lookup contract, normalized target path, allowed
aggregate sources, unavailable domains, and blocked actions so this exact UID
analytics lookup is not mistaken for identity search or support tooling. User
identity search by email, phone, or name, account state, safety history, payment
history, and support actions need separate role-scoped admin contracts before
they are exposed here.

The Data quality tab is a read-only operations workspace over
`adminGetOverview`, `adminGetHostAnalytics`, `adminGetMarketingOpsDashboard`,
and `adminGetEventIntakeDashboard`.
It groups quality rows by source, owner, runbook, state, and next action, and
checks generated marketing bridge freshness, Event Intake dashboard freshness,
and source crawl run plan health. It does not
trigger backfills, inspect scheduler last-run telemetry, or acknowledge
incidents until each source has a safe backend tool and audit contract.

The Safety tab is a triage workspace over `adminGetOverview` safety queues plus
`adminGetSafetyTriageDetails` detail reads. It groups user reports, moderation
flags, and event safety reports with priority, route-owner guidance, normalized
detail fields, assignment/SLA/evidence metadata, bounded prior-history joins,
policy outcome guidance, and next actions. Assignment changes use
`adminAssignSafetyTriageItem`; review and dismiss decisions use
`adminDecideSafetyTriageItem`. Both require an explicit selected queue row plus
a reviewer note and only update the queue document status/assignment fields.
Restriction, escalation, and account-level safety actions are intentionally
absent until their audited mutation callables and document contracts exist.

The Growth tab is a read-only KPI workspace over `adminGetOverview` and
`adminGetHostAnalytics`. It groups launch signals by acquisition, supply,
conversion, and marketplace stages, supports range selection, shows booking
trend buckets, and labels the combined dashboard timestamp as client load time.
Channel, cohort, referral, campaign tasking, and export actions need explicit
analytics contracts before they are exposed here.

The Finance tab is a read-only issue workspace over `adminGetOverview` payment
queues and `adminGetHostAnalytics` event payment signals. It surfaces failed
payments, event payment anomalies, payout restriction counts, and revenue
summary only, with issue detail shown only after an operator explicitly selects
a row. Selected rows include deterministic provider authority, source model,
reconciliation status, required evidence, blocked actions, and mutation
boundary, so operators can tell payment documents apart from event analytics or
payout aggregates before leaving the admin console. Refunds, payout releases,
settlement edits, and provider reconciliation need ledger/read-model contracts
and audited finance callables before they are exposed here.

Production apply requires `--allow-prod`.
The signed-in Firebase user must have at least one admin custom claim
for overview reads: `admin`, `adminOwner`, `safetyReviewer`, `support`,
`finance`, or `analyticsViewer`.
Access application Approve/Deny and organizer claim Approve/Reject require
`admin`, `adminOwner`, or `support`.
User analytics lookup requires `adminOwner` or `analyticsViewer`.
Organizer canonical edits and publishing currently require `admin`,
`adminOwner`, or `support`.
Event canonical safe edits currently require `admin`, `adminOwner`, or
`support`.
Safety assignment and status decisions currently require `admin`, `adminOwner`,
or `safetyReviewer`.
The Admin roles tab is available to `adminOwner` only. It loads an exact
Firebase Auth uid through `adminGetAdminUserRoles`, lists the bounded
`adminRoleAssignments` register through `adminListAdminRoleAssignments`,
assigns/removes the six Catch admin custom claims through
`adminSetAdminUserRoles`, requires an audit note, writes
`adminRoleAssignments/{uid}`, and blocks admin owners from removing their own
`adminOwner` claim. It shows the exact-uid scope contract, normalized assignment
path, source-of-truth records, unsupported lookup inputs/actions, and blocks
no-op saves so unchanged role sets do not create audit noise. The register is
an admin assignment list, not email/name search or an unbounded user directory.
After a claim is assigned, the blocked live-mode screen can force-refresh the
user's ID token with Refresh claims.
The sidebar filters tabs from the same current callable allowlists: support can
see support-owned workflows, safety reviewers can see Safety and Overview,
analytics viewers can see Growth, Users, Finance, and Overview, and Data
quality is currently admin-owner only because it combines host analytics and
marketing dashboard callables. The backend remains the authority for every
read/write.

## Marketing Ops

The Marketing tab is the human review console for the weekly event-guide loop.
Live Marketing state is read from `marketingOpsDashboards/current`. Event
Intake is projected from the newest completed Supply Intake run in each launch
market, including its bounded source profiles, source results, and event work
items. Sample mode uses small typed synthetic objects in
`admin/src/shared/api/sampleOperationalData.ts`; it never retains a copy of
production operations data.

The Intake tab shows an active publication-boundary panel for Event leads and
Organizers before the dense workspaces render. Event leads write review
decisions only and do not create `events/{id}`, `externalEvents/{id}`, bookings,
payments, or waitlists. Organizer Intake records review, curation, policy, and
location decisions; canonical organizer publication, route indexing, and claim
handoff still pass through promotion tooling and the Organizers workspace.

In live mode Organizer Intake loads the newest completed organizer-only Supply
Intake run for Indore and Mumbai through `adminListIntakeOperations`. Candidate
rows and bounded organizer publication-review packets are persisted
`operationWorkItems`. The packet projection contains only the identity,
market, blockers, checklist, aggregate evidence counts, public-state summary,
decision state, and next actions needed by the workbench; evidence records,
public copy, local commands, and raw provider payloads do not enter Firestore.
The workbench treats record approval, public-page publication, search indexing,
and app discovery as separate choices. Web and app exposure show their own
evidence checks; indexing requires a published page, suppression clears every
surface, and the backend repeats the same checks before accepting a decision.
The browser never infers a hidden-app default for an approval.
Immutable packets created before those controls were split are accepted only
when they match the complete legacy shape and its original decision semantics:
approve is published and indexed, hold is draft and noindex, and suppress is
suppressed and noindex. Existing app visibility is preserved. Mixed, unknown,
or contradictory legacy state still fails closed, and current producers must
write every explicit visibility field required by the operations contract.
Until a run contains that packet projection, live Verify, Resolve, and Ready
show an explicit unavailable state rather than reporting zero work. Sample and
Storybook views continue to use typed synthetic operation records. The checked
`contracts/admin/admin_live_data_sources.json` inventory covers every Admin
route and fails if production feature code imports generated operational JSON.
Live builds also fail if any generated Event Intake, Organizer Intake,
Marketing Ops, or external-event plan fixture survives in the Vite manifest.

The third Intake workspace, Automation, reads canonical Supply Intake runs and
work items through `adminListIntakeOperations`. It mirrors the persisted
Incoming, Verify, Resolve, and Ready stages and highlights the human exception
queue. It is read-only in both sample and live mode: the browser cannot request
a run, fetch a source, call a model, deploy a rule, or publish a listing.

Event Intake is one batch workspace rather than a queue plus a parallel
Marketing-derived diagnostics screen. Incoming source rows and event-candidate
rows use stage-specific columns. Candidate stages are mutually exclusive,
upcoming work is ordered by projected event start time, Operations expiry stays
visible as separate provenance, and passed events stay reviewable in a separate
filter but cannot be approved. Editing happens in
the inspector; decisions persist changed fields only as audited before/after
pairs and decided rows stay in the current visual snapshot until Refresh.
The inspector keeps diagnostics collapsed, compares duplicate candidates in
place, and reports partial duplicate-resolution failures.

The callable overlays decisions onto each refreshed Supply Intake projection
and joins an attributed organizer's current Firestore `appVisibility` as a
fail-closed ceiling. Event Intake remains a review surface; the separate
external-event pipeline still owns publication, identity, location, dedupe, and
import-policy gates. An orphan row is labeled `organizer required`, links its
direct event evidence, and links to the paired organizer discovery lead created
by Supply Intake. It cannot pass the Intake approval checklist until a
canonical organizer is attributed.

Live mode calls `adminGetMarketingOpsDashboard`,
`adminRecordMarketingReviewDecision`, and `adminCreateMarketingContentDraft`.
These callables record review decisions and append editable draft objects only:
they do not publish Instagram posts, create app events, or run crawlers.
The Marketing screen shows the same action boundary in the UI: reviewed source
leads and content drafts can be packaged for manual export, while canonical
supply writes, booking, payments, waitlists, and direct Instagram posting stay
outside this workspace.
Marketing review decisions require a review note for the audit log.
Marketing Ops actions require `admin`, `adminOwner`, or `support`.

Host analytics live mode reads the shared BigQuery-backed
`adminGetHostAnalytics` callable. Production hosting builds must set
`VITE_ADMIN_DATA_MODE=live`, `VITE_ADMIN_FIREBASE_ENV=prod`, and
`VITE_ADMIN_APPCHECK_SITE_KEY`; otherwise the deployed dashboard remains in
sample mode or fails App Check before it reaches the analytics backend.
Firebase Hosting deploys run `node tool/env/check_web_hosting_env.mjs admin`
before building so missing Firebase/App Check env fails before a dashboard can
be shipped.
