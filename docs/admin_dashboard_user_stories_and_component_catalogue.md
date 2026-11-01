---
doc_id: admin_dashboard_user_stories_and_component_catalogue
version: 0.4.0
updated: 2026-10-30
owner: admin_console
status: active
---

# Admin Dashboard User Stories And Component Catalogue

## Read Policy

Read this before adding, removing, renaming, or refactoring an admin dashboard
tab, feature workspace, or shared React admin component. Pair it with the
[admin and analytics dashboard spec](https://github.com/torana-labs/catch-knowledge/blob/main/plans/admin-analytics-dashboard.md)
in catch-knowledge, `docs/app_architecture.md`, and `docs/data_contracts.md`.

## Audit Scope

This audit is based on the current React admin implementation under
`admin/src` after the feature-first and controller extraction passes.

Subagent roles used:

- Explorer: mapped every sidebar tab, sub-tab, owner file, data source, and
  obvious naming mismatch.
- Analyzer: wrote prospective user stories and judged current workflow fit.
- Critic: audited hand-rolled UI patterns and proposed primitive families.
- Synthesizer: judged feature-first/controller/repository scalability.

Files inspected:

- `admin/src/app/App.tsx`
- `admin/src/App.tsx`
- `admin/src/main.tsx`
- `admin/src/styles.css`
- `admin/src/shared/api/adminApi.ts`
- `admin/src/shared/api/firebase.ts`
- `admin/src/shared/api/sampleData.ts`
- `admin/src/shared/types/adminTypes.ts`
- `admin/src/shared/contracts/intakeApprovalContracts.ts`
- `admin/src/shared/ui/AdminPrimitives/`
- `admin/src/features/marketing/api/marketingRepository.ts`
- `admin/src/features/marketing/controllers/useMarketingOpsController.ts`
- `admin/src/shared/api/sampleOperationalData.ts`
- `admin/src/features/marketing/renderers/marketingFeatureDropRenderer.ts`
- `admin/src/features/marketing/ui/MarketingOpsScreen.tsx`
- `admin/src/shared/controllers/marketingReviewDecisionHelpers.ts`
- `admin/src/features/intake/events/api/eventIntakeRepository.ts`
- `admin/src/features/intake/events/controllers/useEventIntakeController.ts`
- `admin/src/features/intake/events/ui/EventIntakeWorkspace.tsx`
- `admin/src/features/intake/operations/api/intakeOperationsRepository.ts`
- `admin/src/features/intake/operations/controllers/useIntakeOperationsController.ts`
- `admin/src/features/intake/operations/ui/IntakeOperationsWorkspace.tsx`
- `admin/src/features/intake/organizer/api/organizerIntakeRepository.ts`
- `admin/src/features/intake/organizer/controllers/organizerIntakeHelpers.ts`
- `admin/src/features/intake/organizer/controllers/useOrganizerIntakeController.ts`
- `admin/src/shared/operations/sampleIntakeOperations.ts`
- `admin/src/features/intake/organizer/types/organizerIntakeTypes.ts`
- `admin/src/features/intake/organizer/ui/OrganizerIntakeScreen.tsx`
- `admin/src/features/safety/api/safetyTriageRepository.ts`
- `admin/src/features/safety/controllers/useSafetyTriageController.ts`
- `admin/src/features/safety/ui/SafetyTriageScreen.tsx`
- `admin/src/features/growth/api/growthKpiRepository.ts`
- `admin/src/features/growth/controllers/useGrowthKpiController.ts`
- `admin/src/features/growth/ui/GrowthKpiScreen.tsx`
- `admin/src/features/finance/api/financeOpsRepository.ts`
- `admin/src/features/finance/controllers/useFinanceOpsController.ts`
- `admin/src/features/finance/ui/FinanceOpsScreen.tsx`
- `admin/src/features/events/api/eventPublishingRepository.ts`
- `admin/src/features/events/controllers/useEventPublishingController.ts`
- `admin/src/features/events/controllers/eventPublishingHelpers.ts`
- `admin/src/features/events/ui/EventPublishingScreen.tsx`
- `admin/src/features/access/api/accessReviewRepository.ts`
- `admin/src/features/access/controllers/useAccessReviewController.ts`
- `admin/src/features/access/ui/AccessReviewScreen.tsx`
- `admin/src/features/users/api/userAnalyticsRepository.ts`
- `admin/src/features/users/controllers/useUserAnalyticsController.ts`
- `admin/src/features/users/ui/UserAnalyticsScreen.tsx`
- `admin/src/features/data-quality/api/dataQualityRepository.ts`
- `admin/src/features/data-quality/controllers/useDataQualityController.ts`
- `admin/src/features/data-quality/ui/DataQualityScreen.tsx`
- `admin/src/stories/AdminRoutes.stories.tsx`
- `design/admin/components.json`
- `functions/src/admin/**` and `functions/src/clubs/organizerClaims.ts` for API
  ownership context
- the admin and analytics dashboard spec, now
  [in catch-knowledge](https://github.com/torana-labs/catch-knowledge/blob/main/plans/admin-analytics-dashboard.md)
- `firebase.json`
- `.github/workflows/admin-website.yml`

## Executive Findings

The folder direction is correct: `app`, `features`, and `shared` now exist, and
Overview, Marketing, Event Intake, and Organizer Intake have feature-owned
controllers. The implementation is still transitional.

The sidebar exposes 12 role-gated top-level tabs:

- Overview
- Safety
- Launch access
- Growth
- Marketing
- Intake
- Organizers
- Events
- Users
- Finance
- Data quality
- Admin roles

Overview, Safety, Access, Growth, Marketing, Intake, Organizers, Events, Users,
Finance, Data quality, and Admin roles now branch to dedicated surfaces. The
remaining contract and source material now lives in this audit document or a
secondary disclosure instead of taking over whole tabs. The global chrome uses
one `Catch Admin` brand and one plain route title; it does not repeat prototype
kickers, subtitles, or sample-console labels.

The strongest current workflows are Marketing, Organizer Intake, Event Intake,
and the new canonical Organizers publishing workspace. Event Intake now owns its
admin read/write callables, generated bridge artifact, and guarded live
dashboard publish path. Organizers is now the first
fully real tab aimed at production supply bootstrapping: list rows come from
canonical `clubs/{id}` documents through `adminListOrganizerDetails`, editing uses
audited partial `adminUpdateOrganizerDetails` patches, and publishing uses
`adminSetOrganizerIndexStatus` with a visible checklist. Its Indore + Mumbai default
is backend filtered through a bounded `citySlugs` payload instead of relying on
client-side filtering after a generic list fetch. Events has moved beyond the
old analytics/intake/marketing registry: the root Events tab is now a canonical
`events/{id}` list/detail/editor for safe app-facing fields, backed by
`adminListEventDetails`, `adminGetEventDetails`, and audited
`adminUpdateEventDetails` writes. It also lists read-only external event supply
from `externalEvents/{id}` through `adminListExternalEventDetails`, keeping
source-backed candidate supply separate from Catch-hosted event documents.
Imported events publish from Organizer Intake's "Imported events" panels
through `adminPublishListingEvents`; the retired `eventSupplyReadiness/current`
readiness workspace is gone. Its
Indore + Mumbai default uses the same bounded launch-city pattern.
Safety, Launch access, Growth, Users, Finance, Data quality, and Admin roles now
use task-first, URL-owned directory/detail or exact-lookup workflows. Their
remaining gaps are the explicitly deferred backend contracts listed below, not
placeholder screen structure.

## Top-Level Tab Inventory

| Tab | Current owner | Current data | Current actions | Fit |
|---|---|---|---|---|
| Overview | `features/overview` repository, controller, and UI | `loadOverview`, `loadHostAnalytics`, local-preview fallbacks | refresh scoped analytics and route each queue row to its owning workflow | Good read-only command center; metric drilldown, saved filters, and pagination remain |
| Safety | `features/safety` | aggregate overview safety counts, capped queue previews, plus `adminGetSafetyTriageDetails` detail reads | inspect aggregate queue health and explicitly scoped preview analytics, filter/select triage rows, inspect normalized detail, assignment/SLA/evidence, assign owner, mark an explicitly selected row reviewed/dismissed with required notes | Partial triage workflow; honest queue-health analytics, assignment, and status-only decisions are wired, while full-backlog aging, escalation, restrictions, and resolution actions still need backend contracts |
| Launch access | `features/access`; Overview provides route-only queue previews | `adminGetOverview` capped access queue; direct `adminGetAccessApplicationDetails`; `adminDecideAccessApplication` | URL-owned list/detail review, inspect source evidence, enter a required note/cohort, choose exact backed outcomes, receive completion feedback | Real launch-gate review workflow; full directory, cohort catalogue, invitation, notification, and durable history still need contracts |
| Growth | `features/growth` | independently loaded overview metrics and host analytics | inspect four backed outcomes, apply endpoint-owned range, filter URL-owned signals, inspect accessible trend/table and source basis | Complete approved read-only KPI workflow; cohort conversion, attribution, referral, paid ROI, and retention claims remain absent |
| Marketing | `features/marketing` | immutable marketing ops bridge snapshot plus session working copies | URL-owned board/composer/libraries/activity/diagnostics, draft creation, edit, rights confirmation, review, manual export-ready decisions | Complete approved content-studio workflow; arbitrary edits remain session-only and direct social publishing/autosave remain absent |
| Intake | `features/intake` | Event Intake reads `adminGetEventIntakeDashboard` and writes `adminRecordEventIntakeReviewDecision`; Organizer Intake and Automation read canonical operations records through `adminListIntakeOperations`; reviewed organizer candidates create fail-closed drafts through `adminCreateOrganizerDraftFromCandidate`; typed synthetic records support sample/Storybook views without operational snapshots | review event and organizer intake, create an unclaimed hidden organizer draft, inspect persisted shadow runs and human exceptions | Strong but dense; candidate handoffs persist through curation receipts, while Automation remains read-only and publication/crawling/ownership stay separately gated |
| Organizers | `features/organizers` | canonical `organizers/{id}` plus `clubs/{id}` compatibility list/detail and bounded claims queue via admin callables | URL-owned Directory/Claims, receive an Intake draft handoff, inspect one record, edit governed enum and launch-market fields, follow field-targeted blockers and evidence-checklist tasks, diff, validate, save, publish/index through dedicated callable, review one claim | Complete approved canonical publishing workflow; Intake can scaffold a hidden draft but cannot publish, index, crawl, or assign ownership |
| Events | `features/events` | canonical `events/{id}` list/detail and bounded `externalEvents/{id}` supply | URL-owned canonical/external workspaces, URL filters, safe listing edits, backed performance, audited external-event takedown | Complete approved event workflow; external point read, organizer-owned lifecycle mutations, and Intake handoff remain contract-first |
| Users | `features/users` | one exact-UID `adminGetUserAnalytics` aggregate response | validate exact UID, mask prior UID while loading, inspect four outcomes and accessible activity summary with explicit missing/forbidden/stale/partial states | Complete approved read-only analytics lookup; broad identity search and account, safety, payment, or support actions remain absent |
| Finance | `features/finance` | independent overview and fixed 30-day host-analytics responses | inspect scoped issue counts, partial-source state, prioritized read-only issue evidence, inferred/unknown fields, malformed-row count, and manual provider handoff | Complete approved read-only reconciliation workflow; typed issue model, point reads, finance-role repair, and all money movement remain contract-first |
| Data quality | `features/data-quality` | four independently loaded overview, analytics, marketing, and intake sources | inspect source-health dimensions, retry one failed source, filter severity/owner, open URL-owned signal detail or validated owning workflow | Complete approved data-trust register; scheduler receipts, acknowledgement, backfill, and remediation remain absent |
| Admin roles | `features/admin-roles` | bounded 50-row assignment register plus exact Firebase Auth UID read and audited role mutation | local search, URL-owned UID detail, six governed role policies, before/after diff, self-owner lock, high-risk confirmation, save receipt and token-refresh guidance | Complete approved owner-only role workflow; broad Auth search, pagination, account state, session revocation, and non-admin claims remain absent |

## Auth And Admin Roles

Current implementation:

- `admin/src/shared/api/firebase.ts` initializes Firebase Auth, signs claimed
  app operators in through phone OTP with an invisible reCAPTCHA verifier, and
  retains Google popup sign-in for separately claimed internal accounts.
- `admin/src/app/App.tsx` subscribes to `onAuthStateChanged` only in live mode.
- `VITE_ADMIN_DATA_MODE=sample` bypasses Auth for local review. The top bar does
  not expose a `sample` product label; local-data context is explained inside
  the account disclosure, and the environment chip says `Local` or
  `Development` only when that non-production context matters.
- `VITE_ADMIN_DATA_MODE=live` shows the sign-in screen when no Firebase user is
  present. After sign-in, the shell reads custom admin roles from the ID token
  before any dashboard data loads.
- Signed-in users with no Catch admin custom claim are blocked on an
  unauthorized screen with Refresh claims and Sign out actions instead of seeing
  the full admin shell and waiting for callable failures.
- After at least one admin claim is present, the sidebar filters tabs by the
  live callable role allowlists. Overview remains available to every admin
  claim; host analytics are replaced with a restricted empty response when the
  current role cannot call `adminGetHostAnalytics`.
- Sign-in, claim refresh, and sign-out actions expose pending state and visible
  Firebase Auth errors.
- `admin/src/app/App.test.tsx` and `admin/src/shared/api/firebase.test.ts` are
  the executable phone-only guard: the rendered live sign-in screen must expose
  phone entry without a Google action, phone submission must normalize E.164
  input, and the adapter must retain the Firebase phone OTP integration.
- Backend authorization is enforced by callable functions, not by the React
  shell. `functions/src/admin/adminAuth.ts` accepts these custom claims:
  `admin`, `adminOwner`, `safetyReviewer`, `support`, `salesStaff`. The
  retired `finance` and `analyticsViewer` claims grant nothing.
- `adminOwner` users can open Admin roles to review the bounded assignment
  register, use exact Firebase Auth uid as a fallback, inspect current Catch
  admin claims, set/remove allowed claims with a required audit note, and write
  `adminRoleAssignments/{uid}`. The backend blocks admin owners from removing
  their own `adminOwner` claim.

Role intent:

| Role | Intended scope |
|---|---|
| `adminOwner` | Full admin ownership, all dashboards/actions |
| `admin` | Broad internal operations |
| `support` | Ops and support: the inbox, listing and event approval, claim recommendations, logged people search |
| `safetyReviewer` | Safety queues and limited user/event safety context |
| `salesStaff` | Sales associate: their own nominations and assigned Sales accounts |

Open auth gaps:

- The client role map is a convenience layer only; per-action enforcement still
  happens when callables are invoked.
- Admin roles exposes the 50 most recently updated assignment records with
  local search/status filtering, plus exact-uid fallback for users absent from
  that register. It does not provide unbounded Firebase Auth search,
  email/name/phone lookup, pagination, or a complete history of claims assigned
  before the register existed.
- There is no visible App Check/auth environment diagnostic beyond the current
  data-mode/auth-status display.

## Top-Level User Stories

### Overview

As an ops lead, I need a daily command center so I can spot launch health, open
queues, and risky marketplace signals before they become incidents.

Acceptance criteria:

- Shows fresh key metrics with source timestamp and loading/error state.
- Shows safety, access, claim, index, moderation, and payment queues.
- Lets me scope analytics by date, organizer, or event without implying that
  the controls affect headline stock metrics or live queues.
- Lets me drill from a queue row or metric into the owning workflow.
- Separates data quality warnings from product risk warnings.

Current adherence:

- Good: the streamlined command center keeps cross-vertical metrics, live
  owned queues, scoped host analytics, refresh, independent partial-source
  states, and the feature-owned Overview repository, controller, and UI.
- Good: event-directory work and source-quality diagnostics have moved to
  Events and Data quality instead of competing with the daily queue router.
- Good: six cross-vertical headline metrics identify their owning workflow;
  live queues appear before scoped analytics and route each row directly to
  its role-checked owning vertical.
- Good: date, organizer, and event controls are explicitly labelled as
  analytics-only rather than appearing to filter live stock or open queues.
- Weak: no metric drilldown, pagination, or saved filters exist yet.

Recommended next work:

- Add URL-owned metric drilldown only after each metric has an explicit detail
  contract and destination.

### Safety

As a safety reviewer, I need to investigate user and event reports with
evidence, history, policy context, and audited actions so I can resolve,
escalate, restrict, or notify safely.

Acceptance criteria:

- Dedicated safety queue with severity, SLA, status, and assignment.
- Report detail with reporter, subject, event, evidence, previous actions, and
  policy guidance.
- Actions for resolve, escalate, block/restrict, request more info, and note.
- Audit log for every privileged action.
- Clear separation between user safety and event safety reports.

Current adherence:

- Good: safety reports appear in Overview queues and in a dedicated Safety tab.
- Good: detail reads are normalized through `adminGetSafetyTriageDetails`.
- Good: detail reads now include backend-owned assignment, SLA, severity, and
  evidence metadata so operators are not inferring routing from free text.
- Good: detail reads now include bounded prior-history joins and deterministic
  outcome guidance, so reviewers can see repeated-user/event context and which
  outcomes are queue-only, manual, or still blocked on a dedicated contract.
- Good: `adminAssignSafetyTriageItem` supports explicit assignment/unassignment
  with required notes, role gates, partial updates, and audit logs.
- Good: `SafetyTriageScreen` now delegates rendering to a prop-driven
  `SafetyTriageWorkspace`, giving Storybook deterministic route/workspace
  coverage for queue detail, assignment, and status-only decision states.
- Good: metric cards use authoritative aggregate open counts and separately
  disclose returned preview row counts. Filtering and search apply only to the
  loaded preview; an empty preview does not imply an empty backlog.
- Good: metric labels and values remain readable without color, zero values are
  represented honestly, and machine queue codes use human-facing operational
  labels. The screen does not implement priority or age-distribution charts.
- Partial: `adminDecideSafetyTriageItem` supports reviewed/dismissed
  status-only decisions with explicit row selection and required notes.
- Weak: escalation, restrictions, account/content changes, and richer
  resolution actions are still intentionally absent because the current
  `reports`, `moderationFlags`, and `eventSafetyReports` schemas only support
  queue status/assignment fields.
- Weak: the queue response is capped and unordered, so full-backlog aging and
  SLA charts remain unavailable until the backend exposes a bounded ordered
  analytics contract.

Recommended next work:

- Add audited escalation, restriction, and resolution callables with separate
  role gates.
- Add an uncapped aggregate age distribution or bounded ordered analytics
  endpoint before describing age as full-backlog health.
- Add the corresponding account/content/event safety document contracts before
  enabling destructive safety actions from the admin console.

### Access

As launch/support ops, I need to approve or deny access applications with enough
applicant context so the launch cohort stays controlled.

Acceptance criteria:

- Full application detail, identity signals, source/referral, and history.
- Approve/deny with review note and optional cohort tag.
- Duplicate/provenance check.
- Audited callable write and optimistic UI update.

Current adherence:

- Good: the tab is feature-owned under `features/access`; it loads
  `overview.queues.accessApplications`, supports search/select, requires an
  explicitly selected application and review note, collects optional
  `cohortId`, calls `adminDecideAccessApplication`, removes reviewed rows
  locally, and reports the audited decision result through shared feedback.
- Good: selected rows now load `adminGetAccessApplicationDetails`, exposing
  city, role, event types, availability windows, host interest, invite code,
  Instagram, referral source, Why Catch, submission count, timestamps, and
  bounded deterministic overlap signals before an operator decides.
- Good: the route wrapper now delegates its rendered body to registered
  `AccessReviewWorkspace`, giving Storybook deterministic route/workspace
  coverage for the capped application directory without live reads or writes
  in previews. Direct `/access/{uid}` routes load their own detail and show an
  explicit retryable unavailable state instead of substituting another row.
- Good: Overview routes an application to Launch access; approve/deny remains
  owned by the detail workflow rather than duplicated in the command center.
- Weak: broad identity search, account state, safety history, payment history,
  and referral graph actions are still intentionally outside Access.

Recommended next work:

- Keep account/safety/payment actions out of Access until those workflows have
  audited callables and clear ownership.
- Add a broader user/referral lookup only after deciding whether it belongs in
  Users, Growth, or a launch-access-specific contract.

### Growth

As a growth lead, I need cohort, funnel, referral, waitlist, claim, and
activation reporting so I can decide where acquisition is working.

Acceptance criteria:

- Signup, onboarding, referral, waitlist, booking, claim, and activation funnels.
- Channel, city, date, and cohort filters.
- Retention and conversion breakouts.
- Links from growth anomalies to users, events, organizers, or campaigns.

Current adherence:

- Good: Growth is feature-owned under `features/growth` and has a dedicated
  read-only KPI workspace.
- Good: it combines overview metrics and host analytics into acquisition,
  supply, conversion, and marketplace stages with range and stage filters plus
  booking trend buckets, and labels the combined dashboard timestamp as load
  time rather than source-generated attribution.
- Good: the KPI table now has explicit signal selection and a detail panel for
  metric value, stage, status, source, and source-specific detail.
- Good: the route wrapper now delegates its rendered body to registered
  `GrowthKpiWorkspace`, giving Storybook deterministic route/workspace coverage
  for signal filters, selected detail, and booking trend buckets without
  running live query fetches in previews.
- Weak: no channel attribution, referral graph, cohort analysis, campaign
  action workflow, export workflow, or linked anomaly drilldown exists yet.

Recommended next work:

- Add channel/cohort/referral dimensions to the analytics contracts and
  BigQuery marts before adding campaign workflows.
- Keep campaign tasking and export actions out of Growth until attribution
  contracts exist.

### Marketing

As a content operator, I need to turn verified event and product inputs into
reviewed Instagram-ready content without implying Catch hosts third-party
events.

Acceptance criteria:

- Verified event/product input pool.
- Draft creation for event highlights and feature explainers.
- Editable slides, captions, compliance notes, and export settings.
- Step-by-step composer that shows one decision stage at a time.
- Review decisions with notes, blocked approval reasons, and audit trail.
- Manual export-ready state and PNG export.

Current adherence:

- Good: Posts board, New post flow, Composer, Event library, Media library,
  Activity, feature-drop renderer, review footer, and draft creation exist.
- Good: event inputs are labeled as reviewed marketing leads and candidate
  pools, not canonical `events/{id}` records. Canonical imports and app-event
  cleanup remain in Intake, Events, and Organizers.
- Good: the primary surface now has one `Marketing` route title, one `New post`
  action, and URL-owned Posts, New post, draft-step, Events, Media, Activity,
  and Diagnostics views. Command material and action boundaries live in
  Diagnostics instead of embellishing every task screen.
- Good: fetched data remains an immutable saved dashboard snapshot; working
  edits are labelled as session-only, review receipts are not described as
  saved edits, and unload warnings appear while a working copy is dirty.
- Good: image rights are explicit operator state and the frontend enforces the
  same 50,000-character serialized-edit limit as the backend before decision
  submission. Event review remains read-only source visibility, and PNG export
  is blocked when rights or size validation fails.
- Good: the route wrapper now delegates to the prop-driven
  `MarketingOpsWorkspace`, giving Storybook deterministic route/workspace
  coverage for the saved post board without live dashboard reads or marketing
  writes in previews.
- Weak: arbitrary draft edits have no persistence contract and remain
  session-only. The browser unload guard cannot intercept in-app sidebar
  navigation, so leaving Marketing can still discard a dirty working copy.
- Weak: direct Instagram publishing is intentionally not implemented.

Recommended next work:

- Keep Marketing focused on content packaging and manual export.
- Keep review-decision controls in shared admin UI because Marketing and Event
  Intake share the same button/card interaction pattern, even though their
  decision writes now use separate callables and collections.
- Add a route-transition dirty-state guard only after the shell has a shared,
  tested navigation-blocking contract.

### Intake

As an intake operator, I need one place to review event and organizer inputs
before they become canonical, public, or available to Marketing.

Acceptance criteria:

- Separate but adjacent event, organizer, and automation workspaces.
- Explicit status gates for source evidence, duplication, location, policy,
  publication, and claim handoff.
- Review decisions with notes and audit trail.
- Clear boundary between approved intake records and canonical app/website
  consumable records.

Current adherence:

- Good: Intake now covers Event Intake, Organizer Intake, and the durable
  Automation projection.
- Good: Automation displays canonical run/work-item inventory using the same
  four persisted primary stages as the CLI, rather than inferring run progress
  from the overlapping Event and Organizer review tabs.
- Good: the Automation workspace is explicitly read-only. It exposes evidence,
  blockers, run receipts, and human exceptions without browser controls for
  source fetches, models, rule deployment, or publication.
- Good: stage and exception totals come from the complete imported run rather
  than the current 200-item page. The controller drains the run-pinned,
  server-filtered human-exception lane before rendering, validates it against
  authoritative aggregates, and pages ordinary items only through **Load 200
  more**. Active stage queues exclude published/terminal history; run and item
  pages remain explicitly labelled as loaded when another cursor exists.
- Good: expiry and stale-evidence reconciliation produces a new lineage-bound
  run instead of mutating an immutable imported snapshot.
- Good: the default experience is now a task-first review workbench rather than
  the generated diagnostic wall. Both workspaces expose backed search and
  filters, Incoming/Verify/Resolve/Ready stages, a selectable queue, source
  evidence, readiness gates, downstream impact, notes, and the existing real
  decision actions.
- Good: the stage spine deliberately maps only durable operator states. It does
  not cosmetically present Crawl or Promote as live jobs when the backend has
  no persisted job state or canonical promotion contract.
- Good: generated pipeline, policy, crawl, curation, and import diagnostics are
  preserved behind a deliberate Diagnostics handoff with a clear return to the
  review queue.
- Good: event and organizer decisions retain their existing controller and
  callable boundaries. Event approval remains decision-only; organizer approval
  remains a publication handoff; neither implies ownership, app visibility,
  recurring crawl, or a canonical event write.
- Good: Organizer Intake exposes the deterministic discovery search plan,
  launch-city search terms, source config files, and operator commands, so
  search-term iteration is visible even though edits still happen in repo-owned
  JSON rather than a live web form.
- Good: Event Intake now uses event-owned read and review-decision callables.
- Good: Event Intake source and candidate cards now expose deterministic
  provenance from the bridge, including source profile ids, query template ids,
  observed timestamps, and linked source-result ids.
- Good: Event Intake is projected from completed Supply Intake runs and work
  items, so operational review state no longer depends on a generated
  Marketing bridge or a separate dashboard publication step.
- Good: the Intake entry point now shows a publication-boundary panel for both
  Event leads and Organizers, making the active read model, permitted decision
  writes, blocked canonical/app-facing writes, and required review gates visible
  before an operator enters the dense generated workspaces.
- Good: the Intake route now delegates to the prop-driven `IntakeWorkspace`,
  and Event Intake exposes `EventIntakePreviewWorkspace`, giving Storybook
  deterministic route/workspace coverage for the generated bridge, run plan,
  source-result review, and decision-only intake boundary without live reads or
  writes in previews.
- Good: Organizer Intake now delegates to the prop-driven
  `OrganizerIntakeWorkspace`, giving Storybook deterministic route/workspace
  coverage for workflow readiness, publication review packets, generated bridge
  guardrails, and mutation callback boundaries without live writes in previews.
- Good: organizer source freshness and discovery planning are owned by Supply
  Intake runs and immutable normalized input snapshots rather than generated
  bridge artifacts.
- Weak: Event Intake approvals remain decision records only; canonical import
  and external event promotion still need a dedicated reviewed write path.
- Weak: Automation does not yet join reviewed decisions into a follow-up run
  automatically; the worker still needs a reviewed normalized input step.
- Weak: no production worker currently persists Supply Intake runs; live mode
  remains empty until worker IAM, source policy, model budget, and publication
  authority are approved and deployed.

Recommended next work:

- Add a safe admin edit/publish path for discovery search config only after
  the repo-file workflow is stable enough to replace with audited mutations.
- Define a discovery-job contract with durable progress, failure, retry,
  generated-at, and output receipts before adding a Run discovery action.
- Activate the `operations/` worker in shadow mode first, measure correction and
  escalation rates, and keep the browser read-only while calibration is below
  the documented promotion thresholds.
- Define canonical event import and promotion side effects before adding a
  Promote action to the stage spine.
- Keep organizer publication, app visibility, and public website listing output
  aligned with shared contracts to avoid schema drift.

### Organizers

As organizer support/ops, I need to load, clean, verify, and publish organizer
listing fields before claim, indexing, or app visibility changes.

Acceptance criteria:

- Search by name, slug, URL, Instagram, or document ID.
- Safe editable fields with validation and before/after diff.
- Public preview and app preview.
- Evidence links and route reservation checks.
- Audited save.

Current adherence:

- Good: the tab is feature-owned under `features/organizers`; it starts from a
  searchable/filterable canonical organizer directory backed by
  `adminListOrganizerDetails`; selecting a row loads `clubs/{id}` through
  `adminGetOrganizerDetails`; editing builds minimal audited partial patches for
  `adminUpdateOrganizerDetails`; the UI shows before/after diff, validation,
  publish checklist, and public preview link; publish state goes through
  `adminSetOrganizerIndexStatus`.
- Good: save validation, route/search readiness, and publish blockers are
  consolidated into one `Readiness and blockers` summary. The UI asks for a
  review note only when there are pending save changes or a publishing
  decision, and both organizer edit/index callables enforce review notes
  server-side before writing audit-logged mutations.
- Good: the organizer directory exposes the list snapshot time in its scope
  note. Backend paths, callable names, route-guard mechanics, and generic
  publishing-contract telemetry stay out of the operator task flow; explanatory
  derivation or read-only context uses secondary disclosure.
- Good: route shape, duplicate canonical path checks, and durable
  `publicRouteReservations/{routeKey}` writes run server-side before save or
  index-ready publish. This prevents two `clubs` documents from owning the same
  `publicPage.canonicalPath` and gives website routing an explicit allocation
  record.
- Good: `adminListOrganizerDetails` now uses `clubs/{id}.adminSearch.tokens` for
  token-backed large-list search when an operator enters a query. Admin save and
  index-ready publishing rebuild that projection from canonical organizer
  fields, and the list exposes missing search-index state.
- Good: client-side filters no longer re-run the operator query against the
  visible table row fields, so backend matches from URL, Instagram, or other
  admin-search tokens are not dropped after `adminListOrganizerDetails` returns.
- Good: the launch-city default sends `citySlugs: ["indore", "mumbai"]` to the
  backend, avoiding incomplete client-filtered batches once the organizer
  collection grows.
- Good: existing live organizers created before the admin-search projection can
  be repaired with dry-run-first
  `tool/data/backfill_organizer_admin_search.mjs`.
- Good: the side panel now includes an app listing preview from the same
  `clubs/{id}` fields consumed by Flutter: visibility, location, display
  category, image/logo state, tags/formats, and listing copy.
- Good: the route wrapper now delegates to the prop-driven
  `OrganizerPublishingWorkspace`, giving Storybook deterministic
  route/workspace coverage for the canonical organizer directory without live
  reads or writes in previews. Directory and Claims are URL-owned, and direct
  claim links show a retryable unavailable state rather than a false selection.
- Weak: the search token strategy is deterministic and cheap, but it is not
  typo-tolerant or ranked like a dedicated search service.

Recommended next work:

- Dry-run `tool/data/backfill_organizer_admin_search.mjs` in dev/staging/prod
  and apply it after reviewing counts.
- Consider a dedicated search service only if operators need typo tolerance,
  ranking, or cross-field relevance scoring beyond deterministic token match.

### Events

As event ops, I need to inspect canonical app events and safely correct the
display/search fields consumed by the Flutter app without bypassing host event
mutation side effects.

Acceptance criteria:

- Searchable canonical `events/{id}` directory with launch-city filters.
- Read-only external `externalEvents/{id}` supply directory with launch-city
  filters and source attribution.
- Detail view sourced from the same event document the app reads.
- Safe editable fields with validation and before/after diff.
- Read-only visibility into schedule, capacity, price, status, availability,
  and discovery projection.
- Audited save that rebuilds deterministic admin search and event discovery
  projections.
- No lifecycle mutation until schedule locks, participants, policy, payments,
  private access, and notifications are handled through the existing event
  mutation path.

Current adherence:

- Good: the tab is feature-owned under `features/events`; it starts from a
  searchable/filterable canonical event directory backed by
  `adminListEventDetails`; selecting a row loads `events/{id}` through
  `adminGetEventDetails`; editing builds minimal audited partial patches for
  `adminUpdateEventDetails`; the UI shows before/after diff, validation, app
  preview, discovery projection, and search-index state.
- Good: the Events tab now also lists read-only external event supply through
  `adminListExternalEventDetails` against `externalEvents/{id}`. This keeps
  source-backed event candidates visible without merging crawler artifacts into
  canonical Catch-hosted `events/{id}` documents.
- Good: external supply rows are selectable and expose source URL, candidate id,
  normalized duplicate key, review batch, reviewer, publication state, and
  owner-safe copy/import-policy checks before any importer writes documents.
- Good: canonical event cleanup and external supply review now have separate
  search and filter state. The canonical table can focus on Full or Search
  issues without making the external supply queue look empty, while the
  external table defaults to the open Indore + Mumbai review queue.
- Retired 2026-10-29: the readiness workspace, which read
  `eventSupplyReadiness/current` through `adminGetEventSupplyReadiness` and
  published one row through `adminPublishExternalEvent`. Imported events now
  publish from Organizer Intake's "Imported events" panels through
  `adminPublishListingEvents`.
- Good: the launch-city default sends `citySlugs: ["indore", "mumbai"]` to the
  backend with `status: "active"` and `timeWindow: "upcoming"`, avoiding
  incomplete client-filtered batches and arbitrary limited result slices once
  the events collection grows.
- Good: sample mode now uses explicit canonical Indore and Mumbai event records
  instead of deriving the Events directory from host analytics rows, so the
  default tab demonstrates the real launch-city workflow.
- Good: `events/{id}.adminSearch.tokens` is server-owned and deterministic, so
  operator search can improve through backfills/saves without changing app
  runtime fields.
- Good: client-side canonical and external event filters no longer re-run the
  operator query against visible row fields, so backend token/source matches are
  preserved after the callable returns.
- Good: event save also rebuilds `eventDiscoveryProjection`, keeping activity,
  availability, age, and gate projections aligned with safe admin changes.
- Good: the route wrapper now delegates its rendered body to registered
  `EventPublishingWorkspace`, giving Storybook deterministic route/workspace
  coverage for canonical directory metrics, launch-city event rows, and
  external supply counts without live reads or writes in previews.
- Good: existing live events created before this projection can be repaired
  with dry-run-first `tool/data/backfill_event_admin_search.mjs`.
- Weak: schedule, capacity, price, event policy, cancellation, attendance,
  waitlist, safety, and payment actions are deliberately read-only in this tab.
  Those still need dedicated flows because the host event mutation code has
  schedule-lock, participant, private access, policy, payment, and notification
  side effects.
- Weak: scheduled imports are still not enabled. Imported events publish per
  approved listing from Organizer Intake through `adminPublishListingEvents`;
  recurring importer defaults, rollback, and app outbound-link behavior still
  need production review.

Recommended next work:

- Dry-run `tool/data/backfill_event_admin_search.mjs` in dev/staging/prod and
  apply it after reviewing counts.
- Add event lifecycle actions only through a shared admin/host mutation service
  that preserves schedule locks, participant guards, private access sync,
  event policy, and notifications.
- Add linked payment/safety/attendance panels after the owning Finance and
  Safety workspaces exist.
- Add the disabled policy-owned importer that writes reviewed candidates to
  `externalEvents/{id}` after preflight validation and keeps external booking
  outbound-only.

### Users

As support/safety/growth ops, I need a user lookup and risk/value profile so I
can resolve account issues and understand marketplace quality.

Acceptance criteria:

- Working user search.
- Read-only aggregate analytics lookup for a selected user id.
- Profile, account status, reports, payments, attendance, referrals,
  moderation, and audit history.
- Safe role-scoped actions.

Current adherence:

- Good: the tab is feature-owned under `features/users` and calls
  `adminGetUserAnalytics` for one selected `users/{uid}`. It surfaces
  user-safe summary cards, trend buckets, connection/profile aggregates,
  coaching refs, data-quality rows, and the read-only/audit boundary.
- Good: sample mode includes a deterministic `user-1` response, so the tab can
  be reviewed without BigQuery or live admin credentials.
- Good: `adminGetUserAnalytics` now has an explicit rate-limit entry.
- Good: the Users tab input normalizes exact `users/{uid}`, `uid:{uid}`, or raw
  uid values into the selected user scope; the duplicate shell lookup is gone.
- Partial: the Users tab now renders the exact lookup contract, normalized
  target path, allowed aggregate sources, unavailable domains, and blocked
  actions so operators do not confuse UID analytics lookup with identity search
  or account support tooling.
- Good: the route wrapper now delegates its rendered body to registered
  `UserAnalyticsWorkspace`, giving Storybook deterministic route/workspace
  coverage for lookup contract, aggregate report, and read-only mutation
  boundary without running live query fetches in previews.
- Weak: there is no user identity lookup by email, phone, or name, account
  status, moderation history, payment history, attendance roster, support
  notes, or audited user mutation path in this tab.

Recommended next work:

- Add a role-scoped admin user lookup callable before exposing email/phone/name
  search or profile details.
- Keep account, safety, and payment mutations out of Users until each action has
  an audited callable and clear owning workflow.

### Finance

As finance ops, I need failed payment, refund, commission, payout, and
settlement workflows that reconcile to provider authority.

Acceptance criteria:

- Payment issue detail and retry/refund review.
- Commission and settlement ledger.
- Payout readiness and restrictions.
- Provider reconciliation status.
- Audited financial actions.

Current adherence:

- Good: Finance is feature-owned under `features/finance` and has a dedicated
  read-only issue workspace.
- Good: it combines overview payment issue rows, host analytics payment
  anomalies, payout restriction counts, search/filter controls, and an
  explicit issue detail panel.
- Good: selected rows now show deterministic provider authority, source model,
  reconciliation status, required evidence, blocked actions, and mutation
  boundary, so operators can distinguish canonical payment rows, event
  analytics aggregates, and payout restriction aggregates before touching
  provider systems.
- Good: the route wrapper now delegates its rendered body to registered
  `FinanceOpsWorkspace`, giving Storybook deterministic route/workspace
  coverage for issue rows, selected detail, and reconciliation evidence without
  running live query fetches in previews.
- Weak: no provider ledger, payout lifecycle, reconciliation detail, refund
  execution, export, or audited finance mutation path exists yet. The tab
  deliberately surfaces the missing evidence instead of offering retry, refund,
  payout, or settlement buttons.

Recommended next work:

- Define provider-led ledger/read-model contracts before adding any money
  movement or reconciliation actions.
- Keep refund, payout release, and settlement edits out of the tab until each
  action has an audited finance callable and role gate.

### Data Quality

As an ops/data owner, I need to know which metrics are reliable and what
pipeline or source is blocking decisions.

Acceptance criteria:

- Data freshness, missing fields, export health, job health, and owner/runbook
  links.
- Clear distinction between "metric unreliable" and "product queue blocked".
- Remediation actions or links to the responsible workflow.

Current adherence:

- Good: Data quality is feature-owned under `features/data-quality` and has a
  dedicated read-only operations workspace.
- Good: it combines overview quality rows, host analytics quality rows,
  generated marketing bridge freshness, Event Intake dashboard freshness, and
  source crawl run-plan health.
- Good: disabled/not-configured crawl and import policies are visible as
  separate rows, so stale generated artifacts are not mistaken for failed live
  schedulers.
- Good: the table now supports explicit signal selection and a detail panel for
  source, state, owner, runbook, updated time, detail, and next action.
- Good: the route wrapper now delegates its rendered body to registered
  `DataQualityWorkspace`, giving Storybook deterministic route/workspace
  coverage without running live query fetches in previews.
- Weak: generated bridge metadata is still partly assembled in the
  frontend; there is still no scheduler last-run/last-error telemetry, backfill
  status, acknowledgement, or remediation workflow.

Recommended next work:

- Move generated bridge freshness and run-policy rows into
  source-owned admin contracts.
- Add scheduler last-run/backfill metadata and remediation actions only after
  each source has documented safe tooling.

### Admin Roles

As an admin owner, I need to grant, inspect, and revoke Catch admin claims from
the console so live admin access is not dependent on an invisible manual script.

Acceptance criteria:

- A bounded Firestore assignment register first, with local search and clear
  50-row scope, plus exact Firebase Auth uid lookup as a fallback.
- Role assignment is limited to the documented Catch admin claim allowlist.
- Every role change requires a note and writes an audit trail.
- Admin owners cannot remove their own last owner-capable claim.
- The UI clearly says this is not a broad user search or support workflow.

Current adherence:

- Good: Admin roles is feature-owned under `features/admin-roles`.
- Good: `adminGetAdminUserRoles` and `adminSetAdminUserRoles` are
  `adminOwner`-only callables, rate-limited, and backend-authorized.
- Good: role changes preserve unrelated custom claims, require notes, write
  `adminRoleAssignments/{uid}`, write `adminAuditLogs/{id}`, and block
  self-removal of `adminOwner`.
- Good: the register is the primary surface. It exposes the 50 most recently
  updated assignments, generated time, status filtering, and local-only search;
  exact uid lookup stays below it as the fallback and never becomes broad Auth
  directory search.
- Good: `/admin-roles/{uid}` owns selection and supports a target absent from
  the bounded register. The editor shows before/after roles, capability and risk
  policy, high-risk confirmation, a visibly locked self-owner control, and a
  server-confirmed save receipt with token-refresh guidance.
- Good: the route wrapper now delegates its rendered body to registered
  `AdminRoleManagementWorkspace`, giving Storybook deterministic
  route/workspace coverage for one role-assignment detail without running live
  query fetches or writes in previews.
- Weak: the bounded register is not a complete Firebase Auth directory. It does
  not search by arbitrary email/name/phone or backfill assignments for claims
  set manually before the register existed.

Recommended next work:

- Define a separately authorized Auth-directory and backfill contract before
  expanding beyond the Firestore assignment register.
- Add an App Check/auth environment diagnostic panel if live-mode setup becomes
  confusing during operations.

## Sub-Workspace User Stories

### Marketing: Posts

As a content operator, I need a board of post drafts by review stage so I can
prioritize the next item to compose or export.

Current fit: good board shape, but cards should become shared `AdminCard` plus
`StatusChip` composition.

### Marketing: New Post

As a content operator, I need a constrained draft creation flow so I can create
only publishable content types from valid source material.

Current fit: present and controller-backed. The flow should stay progressive,
not a vertically scrollable form.

### Marketing: Composer

As a content operator, I need to step through source selection, copy/layout,
brand compliance, and export one stage at a time so the task is not overloaded.

Current fit: present and step-based. Needs continued design-file comparison and
shared `Stepper` primitive.

### Marketing: Event Library

As a content operator, I need to review event inputs available to content so
Marketing only uses verified, source-backed events.

Current fit: useful. Event Intake review decisions now live in event-owned
contracts; Marketing should continue to treat those records as source-backed
inputs, not canonical event documents.

### Marketing: Media Library

As a content operator, I need screenshots and feature-drop assets organized by
role, device, and status so I can assemble app-feature explainers.

Current fit: useful, including PNG export. Needs shared media-card and file
picker primitives.

### Marketing: Activity

As a content lead, I need recent commands and review decisions so I can audit
what changed and what is ready for manual publishing.

Current fit: present, but should become a standard audit-log component.

### Intake: Events

As an event intake operator, I need source crawling, source inbox, and event
candidate verification before events feed Marketing or canonical event records.

Current fit: useful, with sub-tabs below. Frontend naming, read API, and review
decisions now present this as Event Intake. The read callable projects the
latest completed Supply Intake run; missing run data renders an explicit
unavailable state instead of falling back to Marketing data.

### Event Intake: Crawl Setup

As an intake operator, I need to inspect crawl source coverage, schedules,
budgets, and source risk before any event leads are trusted.

Current fit: present. Needs clearer run controls and policy gates.

### Event Intake: Source Inbox

As an intake operator, I need to inspect raw source results, edit extracted
fields, and decide whether a lead should advance.

Current fit: present. Needs stronger dedupe/source-confidence treatment.

### Event Intake: Event Candidates

As an intake operator, I need to edit event title/date/location/source evidence
and approve, hold, or reject candidates.

Current fit: present. Actual canonical import remains policy-limited.

### Finance: Commercial Terms

As Finance or the Admin Owner, I need to see and change what Catch charges
hosts without calling callables or pasting values.

Current fit: present at `/finance/commercial-terms` (feature
`features/commercial-terms`). It shows the platform defaults and their newest
revisions with what changed, offers the owner's 30 Oct 2026 decision as the
starting draft while platform terms are unsaved, and saves only after a
field-by-field preview against the reviewed revision and a reason. Organizer
overrides are listed, found by name, and edited at
`/finance/commercial-terms/organizers/{organizerId}`, where every unticked
term reads as inherited. An unconfirmed save is retried exactly; a conflict
keeps the draft and asks for a fresh review. Only the Admin Owner sees it.

### Finance: Payment Routing

As Finance or the Admin Owner, I need to see who collects event tickets, form
fees and host memberships, in which mode, and change it safely.

Current fit: present at `/finance/payment-routing` (feature
`features/payment-routing`) for the app policy. Each purpose shows its route
(host collects through `razorpayOAuth`, or Catch splits through
`razorpayRoute`) and a test or live badge. A change is previewed against the
saved revision, and turning a purpose live, choosing the Route split or turning
it off needs the phrase typed. Before the first app policy exists, the screen
says that form fees follow each organizer's own connection and that saving
replaces that. Organizer overrides are not edited here.

### Intake: Organizers

As an organizer intake operator, I need to curate discovered organizers into
canonical listings with evidence, publication, claim handoff, and app visibility
gates.

Current fit: broad and powerful. The task-first queue and secondary Diagnostics
split provide operator priority, while feature-private panels keep the route
entry small; live bridge refresh remains generated-artifact driven.

## Architecture Assessment

What is correct:

- Admin is a separate React/Vite surface, which matches the repo architecture.
- Backend authority remains in Functions/shared contracts, not direct client
  Firestore writes.
- Every top-level admin vertical has a feature-owned controller and
  repository/API adapter; remote reads and mutations use TanStack Query.
- Route/workspace entry components are lazy-loaded, while Functions and shared
  contracts remain the mutation authority.
- Marketing, Organizer Intake, Events, Organizers, and other dense routes are
  split into feature-private panel modules governed by feature-export and
  feature-UI-size scanners.
- Shared types, callable validation, the component registry, Storybook
  registry, and shared UI primitives provide enforceable boundaries.

What is weak:

- `App.tsx` remains a large auth, role-gating, navigation, lazy-composition,
  and hand-maintained path-parsing owner. Feature data and mutation
  orchestration no longer belong there, but route parsing would benefit from a
  declarative route registry.
- Several feature repositories remain thin adapters over the shared callable
  API. That is acceptable while they preserve feature ownership; add
  feature-specific normalization only when a real boundary requires it.
- Feature-private panel modules remain under the 1,200-line scanner ceiling,
  although several are close enough to require continued size-budget
  discipline.
- Generated intake and marketing bridges remain review inputs, not canonical
  publication authority.

State management decision:

- Continue feature-owned hook controllers plus the adopted TanStack Query
  remote-state boundary.
- Do not introduce Redux/Zustand unless a demonstrated cross-feature client
  state problem cannot be handled by route state, query cache, or explicit
  composition.

## Base Component Catalogue

Shared primitive ownership now covers shell/account/navigation, buttons and
links, search and segmented controls, directory/detail stacks, filters and
toolbars, metrics and trends, cards/tags/status, tables and alerts, fields and
editor sections, sticky decision footers, secondary disclosure, and specialized
Intake/Marketing composition. `admin/src/shared/ui/AdminPrimitives/index.ts` is
the canonical export inventory.

- The global top bar owns the only route title. `PageHeader` is reserved for
  nested record/detail context and must not repeat a top-level route title.
- Overview owner digests and route-only queue actions compose shared panel,
  state-row, queue-row, and button primitives.
- Former raw families such as `table-wrap`, `marketing-ops-header`,
  `intake-workspace-header`, marketing/intake cards, badges, search-candidate
  cards, and quality rows are now implemented inside shared primitive owners.
  Their CSS class names are implementation details, not feature-level migration
  debt.

No named primitive migration remains from the previous list. Add a new
primitive only when repeated code demonstrates a missing shared contract, then
update component governance, registry coverage, and scanner enforcement in the
same change.

Component rule:

New admin UI should not add raw `button`, `article`, `header`, badge, table, or
field markup when an admin primitive exists. If the needed primitive does not
exist, add the visual shell to the appropriate `AdminPrimitives/` family first, then build the
feature screen through composition. Use a focused shared admin component file
only for non-primitive behavior, and document why the shell does not belong in
the central primitive owner.
Admin feature UI files may export route or workspace entry components such as
`*Screen` and `*Workspace`; reusable panels, cards, lists, badges, and sections
should live in shared admin UI or stay private. This is enforced by
`node tool/run.mjs check web:admin-feature-exports`.
Admin route/workspace entries, shared admin primitives, and admin feedback
providers are registered in `design/admin/components.json`. Update that
registry before exporting or renaming admin screens, workspaces, primitives, or
providers, then run `node tool/run.mjs check web:admin-components`.
Admin preview coverage lives in Storybook under `admin/src/stories`. Registry
entries may use `preview.status: "ready"` only when the story export declares a
matching `parameters.catchComponent.id` and state list; verify with
`node tool/run.mjs check web:admin-components` and
`node tool/run.mjs check web:admin-storybook`.
Current ready coverage includes shared admin primitives, the Overview route
preview, and Access, Admin Roles, Data Quality, Events, Event Intake, Finance,
Growth, Intake, Marketing Ops, Organizer Intake, Organizer Publishing, Safety,
plus Users route/workspace previews.
Route stories should use explicit fixture props or controller seams instead of
app-level live data.
A registry state list describes the deterministic fixture rendered by that
story; it is not proof of independently rendered alternate states. Distinct
loading, empty, error, unavailable, mutation, and receipt variants need
separate deterministic story exports before being claimed as visual-state
coverage. The current registry checker validates metadata alignment, not
state-specific rendering.
Admin import direction is enforced by
`node tool/admin/check_import_boundaries.mjs`: app shell may compose features
and shared modules; features may depend on their own top-level feature and
shared modules; shared modules must not import app or feature modules.

## Prioritized Improvements

1. Add dedicated external-event point reads and typed Finance issue/detail
   contracts before claiming complete deep-link support.
2. Build the next high-risk Safety mutation set: audited escalation,
   restriction, and resolution actions. The current tab is intentionally
   limited to explicit assignment plus status-only review/dismiss decisions
   over read-only assignment/SLA/evidence metadata.
3. Add source-owned scheduler last-run/last-error and backfill metadata so Data
   quality can distinguish stale generated artifacts from failed live jobs.
4. Add a route-transition dirty-state guard or persisted-edit contract for
   Marketing; the current warning protects browser unload, not every SPA
   navigation.
5. Add distinct deterministic Storybook fixtures for loading, empty, error,
   unavailable, mutation, and receipt states.
6. Verify and apply the organizer admin-search backfill where production rows
   predate the projection.
7. Keep event lifecycle mutations and intake promotion out of display editors
   until their side effects have shared contracts.
8. Keep canonical organizer/event output aligned across admin, app, and public
   website consumers.
