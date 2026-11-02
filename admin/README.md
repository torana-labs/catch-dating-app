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

Before pushing Admin work, run `npm run check:admin` from the repository root.
It runs CI's Admin lane locally, including the checks `verify_local` and
`typecheck` skip. See [TESTS.md](../TESTS.md).

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

Each Admin area is its own pair of files in `src/app/areas/`, and no list names
them, so two PRs adding different areas do not collide:

- `areas/<id>.ts` holds the area's address, title, icon, roles, place in each
  job's navigation, URL patterns and route state. It declares its own id with
  `declare module "../adminAreaKit" {interface AdminNavIds {<id>: true}}`. The
  sign-in entry loads these, so they import no screens.
- `areas/<id>.screen.tsx` renders the area's screen, loading it lazily.
- `areas/<id>.test.ts` tests that area's routes.

`src/app/adminRoutes.ts` combines them into the route table React Router matches,
and `src/app/adminAreas.tsx` adds the screens. A feature's stories, registry
entries (`design/admin/components/<feature>.json`) and actions
(`contracts/admin/actions/<workflow>.json`) follow the same one-file rule. Feature
controllers receive the resolved state and navigation callbacks. Unknown sections return to
the first permitted section after authentication and role resolution. Partner
and operator-session routes retain their separate entry boundaries.

The app shell owns shared navigation, Firebase auth, role gating, the
plain route title, and feature composition. Overview range state, refresh,
analytics loading, and queue triage live in
`admin/src/features/now/controllers`.
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
Pending organizer claims are items in the Inbox, which loads bounded
requester/profile/club evidence through `adminGetOrganizerClaimRequestDetails`
and sends approve/reject decisions through `adminDecideOrganizerClaim`. Approval
stays disabled when the requester
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
publish from the Inbox through
`adminPublishListingEvents`; the Events workspace only inspects and takes down
external supply. The readiness workspace that read `eventSupplyReadiness/current`
and published one row through `adminPublishExternalEvent` was retired on
2026-10-29, and old `/events/readiness` links open the directory.

The Inbox requires an explicit Resolved or Waived choice for every
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
history, and support actions live in People search and Safety, not here.

The Cross Paths showcase page is retired (Admin redesign PR 15). Its callables
remain deployed with no Admin caller until the backend follow-up retires them.

System (`/system`) is one activity log of what people and agents did in Admin,
from `adminListActionExecutions`, filtered by who acted and by problems, beside
the health of each data source. Health reads `adminGetOverview`,
`adminGetMarketingOpsDashboard`, `adminGetEventIntakeDashboard` and, for the
owner only, `adminGetHostAnalytics`. Each source loads and retries on its own,
and each signal shows its evidence, owner, runbook and next step. System does
not trigger backfills, inspect scheduler last-run telemetry, or acknowledge
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

Growth reads `adminGetGrowth` over a range: organizers by the month they listed,
channels and what they cost, nominators, and the best organizers. Nominator
credit is approved and recorded as paid through `adminManageNominatorCredits`.
Per-campaign ad tables and export are not built.

Money is the working queue for money that needs a person. Payment issues come
from `adminManagePaymentIssues` and the month's bills to organizers from
`adminManageOrganizerBills`; every action is audited. Refunds still happen in
the organizer's Razorpay and are recorded here, and reminders are recorded, not
yet sent to organizers.

Marketplace reads `adminGetMarketplace` over a range, optionally one city:
events, how full they are, no-shows, guests who book again by month, bookings
each week and organizers going quiet. It reads the warehouse, and says so when
the warehouse can't be read rather than showing zeros.

Finance reads `adminGetFinanceMonth` for one month line by line: sales, what
Catch earned, what it cost and what isn't Catch's money. Costs other than ad
spend are entered by hand through `adminManagePlatformCosts`, and the ledger
downloads for the accountant through `adminExportMoneyLedger`.

Production apply requires `--allow-prod`.
The signed-in Firebase user must have at least one admin custom claim
for overview reads: `admin`, `adminOwner`, `safetyReviewer`, or `support`.
Admin is three jobs: owner (`adminOwner`), sales associate (`salesStaff`), and
ops and support (`support`). The retired `finance` and `analyticsViewer`
claims grant nothing; a role save strips them, and their surfaces are the
owner's.
Access application Approve/Deny and organizer listing approval require
`admin`, `adminOwner`, or `support`. Ops (`support`) recommend organizer
claims; only `admin` or `adminOwner` approve or reject them.
User analytics lookup requires `adminOwner`.
Organizer canonical edits and publishing currently require `admin`,
`adminOwner`, or `support`.
Event canonical safe edits currently require `admin`, `adminOwner`, or
`support`.
Safety assignment and status decisions currently require `admin`, `adminOwner`,
or `safetyReviewer`.
The Admin roles tab is available to `adminOwner` only. It loads an exact
Firebase Auth uid through `adminGetAdminUserRoles`, lists the bounded
`adminRoleAssignments` register through `adminListAdminRoleAssignments`,
assigns/removes the five Catch admin custom claims through
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
Growth, Users, Money, Marketplace and Finance are the owner's, and Data
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

Supply Intake reaches people through the Inbox: one item for each nomination,
claim, enquiry, access application or imported event, with the journey that
brought it there. A nomination that could not be read waits as stuck. The owner
or Sales can fill it in by hand, which starts a new nomination from the typed
details and closes the stuck item; ops can pick it up or dismiss it. Settings →
Intake holds the policy decisions and who can nominate by message.

The old Intake review (Event leads, Organizers and Automation) retired on
2026-11-02, and `/intake/*` opens the Inbox. Candidates from command-line
discovery runs have no review screen until discovery is built into Admin; the
callables they used stay in Functions until then.

The checked `contracts/admin/admin_live_data_sources.json` inventory covers every
Admin route and fails if production feature code imports generated operational
JSON. Live builds also fail if any generated Event Intake, Organizer Intake,
Marketing Ops, or external-event plan fixture survives in the Vite manifest.

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
