---
doc_id: marketing_website_architecture
version: 0.16.0
updated: 2026-10-24
owner: marketing_website
status: active
---

# Marketing Website Architecture

This document owns the code organization and refactor target for the public
React marketing website in `website/`. Use `docs/web_surface_architecture.md`
for domains, deploy targets, CI/CD, and cross-surface hosting boundaries. Use
`design/website/routes.json` for the route-first contract and
`design/website/components.json` for the component-first registry.

## Next.js public rendering migration

`website/app/[[...path]]/page.tsx` is the Next.js App Router entry for the
public site. `src/app/next` adapts the existing feature pages, Router query/hash
state, pending-action protection and per-provider TanStack Query client. Reuse
existing content, primitives and layouts; do not introduce a second design
system. Authored Host/legal pages render without catalog access. Discovery,
organizer, claim and event pages receive current server-authorized DTOs.
The current Firebase Hosting deployment still serves the Vite `dist` output;
Next.js is a separately packaged migration candidate until cutover approval.

`src/server/publicCatalog.ts` reads only the published organizer, Catch-event
and external-event collections, bounded to 400 rows each with an eight-second
read deadline. `publicReadPolicy.ts` rejects synthetic, withdrawn, suppressed,
archived, malformed and non-live-market organizer records. Admin SDK access is
not publication authority. `publicOrganizerProjection.ts` reuses the extracted
CLI projector and validates its closed output contract before serialization;
contact information, owner identities and arbitrary raw objects do not leave
this boundary. External events retain outbound-only booking capabilities.
The Next validator adapter compiles the same generated schemas as repository
checks, with parity tests, without the CLI dependency-discovery loader.

Public responses are uncached. React cache only deduplicates a render's reads;
there is no cross-request snapshot or ISR fallback. The request gate checks
availability, organizer aliases and missing live-route statuses before streaming
(including RSC, where a late `notFound()` otherwise retains HTTP 200); the render independently
reauthorizes its data. This currently costs two bounded reads for those pages.
A failed preflight returns 503; a failure after that preflight can still surface
as Next's uncached 500. The read-only gRPC fault acceptance test permits the
three preflight queries, then rejects render queries and verifies that exact
500/no-store response without stale content. Neither error authorizes stale
content or a false 404.
The browser refreshes at 25 seconds/focus and withholds its snapshot at 30
seconds or on transport failure. Refresh requests time out after eight seconds
so a later focus can recover without reloading. Live withdrawals remove page content and
structured data. Booking price/capacity authority stays in existing Functions.
The standalone lifecycle suite also verifies HTML/RSC/data/sitemap withdrawal
across two instances copied outside the checkout, query-bound refusal and
unavailable readers.

Next owns initial canonical/social metadata, escaped Organization/Event JSON-LD,
robots and a live index-policy-filtered sitemap. Generated organizer snapshots
are replaced with an empty module in both the Next graph and retained private
shell; only request-authorized DTOs populate public pages. Reveal styling keeps
initial HTML visible with JavaScript disabled. The consent banner supplies
viewer-independent initial HTML; hydration reconciles local consent without
delaying the first paint or escalating an existing choice. Legacy Host redirects remain
301 and preserve queries before destination anchors.

Existing `/join`, `/booking`, `/offer`, `/event-update`, `/rehearse`, `/invite`,
`/rsvp`, `/f` and `/demo` flows retain the existing browser app. A fixed shell is
built in `.next-legacy` and copied only into the standalone runtime's
`public/_legacy`, then served by `app/private-shell/route.ts` with
`no-store`, `noindex,nofollow` and `no-referrer`. Signed path/query/fragment values
never enter RSC props. Only the allowlisted route-family enum enters the
internal rewrite, supplying a generic title/description/canonical without any
private identifier. The request gate parses the actual Host authority; unknown
hosts receive only this shell and the existing custom-form domain gate. They
cannot read the public catalog endpoint. The accepted custom-domain controller
and integration coverage remain in place.

`tool/web/check_website_import_boundaries.mjs` recognizes Next entry and server
layers, parses imports and re-exports with the TypeScript AST, denies browser
imports of server modules/privileged packages (including `use client` entries), and keeps
the public projector's external imports explicitly bounded. Run the normal
marketing build for both the existing Vite artifact and the Next candidate;
`test:next-policy` is part of pretypecheck. `test:next-runtime` requires the
isolated local emulator and packaged server described in `website/README.md`.

## Canonical public chrome

`shared/site/PublicSiteChrome.tsx` owns `PublicSiteHeader` and `PublicSiteFooter`
for marketing, discovery, directory/listing, public event detail, claim,
Host product/application, legal/help and 404 pages. Every one of those routes
renders the same header and footer: there are no per-route variants, local
navigation props or route actions. `content/site.ts` owns the Find events,
Organisers and For organisers links, root brand, menu copy, operator credit and
global footer/legal links. Route-specific links belong in the page itself (the
Host and Host application pages use the Host section navigation row).
`SiteHeader` and `SiteFooter` remain low-level presentation primitives.
The import scanner permits only `PublicSiteChrome.tsx` and its focused test to
read resolved `content/site.ts`; arbitrary shared UI and every route-specific
content import remain rejected by scanner self-tests. Transactional/private
shells keep their existing composition and authority.

## Public content ownership

The consumer root previews upcoming events by city, explains optional Catch
Experiences, introduces organisers and hands business enquiries to Catch Host. The detailed sitemap, content destinations
and deleted page inventory are maintained once below in
[Public sitemap and conversion ownership](#public-sitemap-and-conversion-ownership).

Public organiser profiles retain Events, About and Reviews navigation. Catch
and external event cards precede About. Historical source events remain labelled
as evidence, not current booking inventory. Provider links, review gates,
claim policies and source provenance remain unchanged.

Claim submission requests ownership review. It does not grant publishing,
listing editing, owner replies, analytics or team permissions. Those capabilities
need separate authority design; claim approval still requires `profileComplete`.
Instagram control proof is not implemented, and marketing permission remains
separate from ownership. Removed concept promises are preserved only in Git
history, not in a runtime or test-only duplicate of the old pages.

## Current State

The website is already split out of the old monolithic shell:

- `website/src/App.tsx` is a compatibility re-export for the app entrypoint.
- `website/src/app/App.tsx` owns the React Router shell, metadata selection,
  page-level lifecycle hooks, and route-level lazy loading.
- `website/src/app/routeRegistry.ts` owns runtime route patterns.
- `website/src/features/eventRehearsal/` owns the no-login
  `/rehearse/:publicRehearsalId` synthetic guest phone. TanStack Query redeems
  and persists one deterministic browser slot, polls the Host virtual clock,
  caches returned guest mutations, and slows its cadence under the explicit
  low-bandwidth fault. `EventRehearsalPreview` is the provider-free Storybook
  and unit-test seam; it composes shared Event Runtime primitives with a
  persistent practice banner, bounded guest actions, fault notices, and a
  read-only completion state. Auth, OTP, production registration and private
  Host data are deliberately absent.
- `website/src/content/meta.json`, validated by
  `website/src/content/meta.schema.json` and
  the browser-safe `website/src/content/metaContract.ts`, owns static page
  metadata and the static labels used for generated organizer and event HTML.
  `website/src/app/pageMeta.ts` runtime-validates on client module load;
  `tool/marketing/website_meta_contract.mjs` adds filesystem reading for Node
  postbuild. Ajv parity tests run valid and invalid fixtures through both the
  JSON Schema and browser validator. Neither consumer owns a duplicate validator
  or copy of the strings.
- `website/scripts/postbuild.mjs` emits route-specific static HTML after Vite.
  Generated organizer routes include semantic profile content, Organization and
  breadcrumb JSON-LD. Generated event routes include read-only event details,
  source-aware registration handoff, event-scoped reviews, Event and breadcrumb
  JSON-LD, canonical/robots metadata, and organizer-derived freshness before
  React executes. `checkOrganizerBuildOutputs.mjs` fails builds that regress
  those crawlable outputs.
- Postbuild emits root `404.html`; the marketing Hosting target intentionally
  has no catch-all SPA rewrite, so unknown direct URLs reach Firebase's custom
  404 response with status 404. The route contract declares that status, the
  route checker compares it with `firebase.json`, and deployment performs a
  unique-path HTTP probe.
- `design/website/routes.json` records the public route contract, review
  states, and Storybook/manual state coverage.
- `design/website/components.json` records route and section ownership, CSS
  ownership, and Storybook coverage status. It is validated bidirectionally
  against referenced Storybook `parameters.catchComponent` declarations by
  `tool/marketing/check_website_components.mjs`.
- `design/features/feature_coverage.json` classifies every marketing route as a
  contracted, grouped, planned, or explicitly excluded feature projection.
  Shared product outcomes may target a cross-runtime identity such as
  `feature.explore` or `feature.organizer_detail`; route metadata, static output,
  React components, actions, and evidence remain owned by the website runtime.
  Organizer Search is the first live projection: the feature compiler resolves
  its three real route states, controller actions, route/section Storybook
  previews, focused controller tests, and public listing projection schema into
  the same generated `feature.explore` artifact as Flutter Explore. The removed
  `saved-organizers` route state belongs to organizer detail storage and was not
  an Organizer Search state.
- All stateful marketing route authorities are now compiled. Marketing Home
  owns public discovery handoffs, store availability, Host routing, and member
  waitlist conversion. Host Acquisition owns the standalone-tooling narrative,
  external-booking setup walkthrough, live-module catalog, explicit
  current-versus-coming-later boundary, and the five-stage beta application.
  Organizer Claim binds both the
  canonical workspace and dynamic lookup route so known, not-found, pending,
  already-claimed, and unavailable authority states remain exact. Privacy,
  Terms, Help, and 404 stay explicitly excluded as static/fallback surfaces;
  the legacy organizer-listing route stays grouped because its difference is
  static canonical/noindex policy rather than an independent workflow.
- Marketing mutations use the frozen-snapshot variant of
  `ARCH-PENDING-SNAPSHOT-001`. Waitlist, Host application, canonical Claim,
  and listing Claim register one active request, disable their complete native
  form boundary, guard controller entry points against same-tick duplicates,
  and temporarily block sibling forms, shared route links, and browser exit.
  This keeps the visible draft, auth session, step, and submitted payload
  identical until the request settles.
- Marketing Home and Host Acquisition bind their remote lead mutation to the
  shared `contracts/http/join_waitlist_request.schema.json` and
  `join_waitlist_response.schema.json` contracts. The generator projects the
  same types into website and Functions code, while both boundaries reject
  malformed payloads and responses.
- `website/src/generated/hostListings.json` is production-only and excludes
  `dataOrigin: "catchDemo"` plus Firestore organizer records that do not
  resolve to a `live` city in the active market pack. Legacy scraped seed
  directories and their CLI inputs are retired; production materialization
  reads canonical `organizers/{id}` documents only. Multi-market organizer
  listings expose only their live-market projection in production. Storybook reads the explicit demo-inclusive
  `hostListings.demo.json` projection through `stories/fixtures/hostListings.ts`.
  The production read-only snapshot stage regenerates `hostListings.json` from
  canonical Firestore organizer documents and passes only the validated listing
  outputs to the uncredentialed exact build; promotion never rematerializes
  them. The committed JSON is a static build projection, never the operational
  source of truth. The pretypecheck gate validates both outputs.
- Public event pages are the acquisition boundary for standalone Host events.
  A capability-eligible event may offer phone-OTP RSVP/waitlist without asking
  for Consumer dating-profile setup. The mutation is server-owned, links or
  creates an `eventAttendees` record with `webOtp` source, and returns only the
  attendee's event-scoped state. The website never reads a private roster or
  writes `eventParticipations` directly. A first registration may seed a private
  onboarding draft with the attendee-supplied name and verified phone for an
  intentional later Consumer onboarding continuation; this does not create a
  profile. Optional organizer WhatsApp and SMS permissions are independent,
  unchecked by default, and organizer-scoped. Event registration, imported
  contact data, and account prefill do not grant either channel or Catch
  advertising permission. Catch ticketing and profile-dependent
  Consumer features remain separately gated capabilities. The read-only
  production materializer publishes only explicitly OTP-enabled events and
  obtains capacity totals through Firestore `count()` aggregation; it never
  downloads attendee rows or contact fields into the website build.
- Public Forms at `/f/:publicFormId/` are a standalone respondent product
  surface rather than a marketing conversion form. The route lazy-loads its
  controller and governed primitives, resolves only a server-sanitized active
  version, and supports version-bound autosave, explicit review, submission
  receipts, withdrawal, source-link attribution, and iframe presentation.
  Identity policy can require verified phone, email magic link, or a Catch
  account without requiring Consumer app installation. File and signature
  controls stay unavailable until their secure upload and consent tranche is
  complete; the UI does not pretend that placeholder inputs are functional.
- Organizer website URLs come from the canonical document's
  `publicPage.canonicalPath`; the Firestore `organizers/{organizerId}` auto-id
  is an internal identity and is not a URL convention. Route reservations make
  slugs unique independently of document creation.
- Organizer listings consume the canonical `supplyCapabilities` projection.
  Unclaimed supply never renders Catch booking, payment, waitlist, or direct
  host-contact actions; it remains claimable, and review eligibility begins
  only after an event ends. Missing or invalid capabilities fail closed. The
  generated static projection derives legacy records conservatively while the
  production backfill completes, but React does not re-infer policy from
  provenance or claim copy.
- `design/public_surface_behavior.json` is the cross-surface authority and
  action matrix described by
  `docs/web_surface_architecture.md#public-viewer-and-listing-authority-matrix`.
  Website listing policy must consume canonical ownership, claim,
  verification, publication, independent claim/review-target/read/write
  capability fields, and runtime availability; it must not infer an enabled
  action from provenance or sign-in state. Published-but-suppressed records and
  review capabilities without a verified canonical target fail closed. The
  strict checker plus
  `website/src/features/organizers/publicSurfaceBehavior.test.ts` prove every
  registered website row against production policy and presentation adapters.
- Home event discovery applies the pure `homeEventEligibility.ts` selector:
  only future Catch events in market-pack live cities are eligible. External
  events remain listing-page evidence, and city aliases normalize at this
  boundary. The selector receives `now` explicitly and has focused tests.
- `tool/marketing/check_website_routes.mjs` validates route URL, metadata,
  static output, generated listing coverage, and referenced Storybook
  `parameters.catchRoute` declarations.
- `tool/web/check_react_ui_primitives.mjs` prevents feature/app/story code from
  hand-rolling native interactive controls outside shared primitive owners.
- `tool/web/check_react_component_governance.mjs` prevents React app/feature
  code from hand-rolling governed component families. Its `--families-json`
  output is generated on demand and documents the known-family blocklist
  limitation; it is not a checked-in reader snapshot.
- Website buttons, fields, checkboxes, choice chips and grids, choice cards,
  empty states, status badges and data tables adapt the `@catch/web-ui` native
  controls; each adapter's entry in `design/website/components.json` names its
  contract with `componentId`. Visual classes, authored labels, domain variants
  and feature composition stay website-owned until Phase 7e ships the styled
  components. The `web:shared-ui-adoption` inventory gate requires that
  decision for every shared export matching a registered contract.
- Shared route/page shell presentation lives in `website/src/shared/site` as
  `PageShell` and `WebsitePageMain`. `website/src/app/App.tsx` owns React
  Router, route metadata, lifecycle hooks, and page-class selection, but
  configures `PageShell` instead of rendering raw `page-shell` markup. Ordinary
  route files use `WebsitePageMain`; routes with their own visual shell keep
  using shared route-specific mains such as `ClaimFlowMain`. Raw `page-shell`
  wrappers and raw `<main>` tags are
  blocked by `web:react-component-governance`.
- `website/src/features/host/HostPage.tsx` is the single canonical host route.
  `/host/preview{,/**}` is retired at Firebase Hosting with a permanent redirect
  to `/host/`. Host sections live under `website/src/features/host/sections/**`:
  `hostLandingSections.tsx` renders the route, and `HostPageSections.tsx`
  keeps `HostApplySection` for `/host/apply/`. The pre-#704 host sections
  were retired in CAT-218; Linear CAT-224 records their copy. The public route starts with an external guest
  list and a no-download attendee runtime; Catch-native booking, member
  profiles, chats, and network effects stay below the explicit coming-later
  boundary.
  Host application form state lives under `website/src/features/host/application/**`.
- The remaining legacy-named `HostPreviewSection`, `HostPreviewSectionHead`
  and `HostPreviewFaqList` primitives serve the claim page;
  no preview route or preview feature owner remains. New public concepts use
  Host or Playbook names and must not recreate the retired route boundary.
- Shared Host Application flow shells live in
  `website/src/shared/ui/primitives/` as `HostApplication*` and
  `OperationalNote`. `HostApplicationFlow.tsx` owns the form state and field
  choices, but configures shared flow shells instead of rendering raw
  `host-application*`, `submitted-panel__mark`, or `operational-note` markup.
- Shared app capture card shells live in
  `website/src/shared/ui/primitives/` as `CaptureCard`.
  Home and Host sections pass capture manifests and fallback labels to that
  primitive instead of rendering raw `capture-card` figure shells.
- Shared product module grid shells live in
  `website/src/shared/ui/primitives/` as `ProductModuleGrid`. Host fill-room
  sections pass module content into that primitive instead of rendering raw
  `product-module-grid` or `product-module-card` shells.
- Shared listing event action cards live in
  `website/src/shared/ui/primitives/` as `EventActionCard`. Organizer
  listing event sections own the event-card content and analytics callback, but
  configure the shared card instead of rendering raw `event-action-card` shells.
- Shared organizer identity display shells use `ActivityMark` and
  `StatusBadge`. The listing-strength heuristic remains available only for
  internal ordering; public organizer cards, directory results, and listing
  diagnostics must not render it as a percentage or quality score. The shared
  `ProfileStrength` meter remains a host-application completeness primitive,
  not an organizer reputation signal.
- Shared process status panels live in
  `website/src/shared/ui/primitives/` as `ProcessStatusPanel`. Claim route
  sections own state-specific copy and CTA analytics callbacks, but configure
  the shared panel instead of rendering raw `process-status-panel` shells.
- Shared Event Success grids are configured through
  `EventSuccessModuleGrid` and `ListingSuccessMetricGrid`.
  `SuccessGrid` is an internal implementation detail; feature sections pass
  module or metric arrays instead of composing `SuccessGrid` children directly.
- `website/src/features/host/HostPages.tsx` is a compatibility re-export only.
- `website/src/features/home/HomePage.tsx` is now a thin home route shell.
  Visible Home route sections live in
  `website/src/features/home/sections/consumerHomeSections.tsx`, with route and
  section Storybook coverage registered in `design/website/components.json`.
- Shared marketing shells live in `website/src/shared/ui/primitives/` as
  `MarketingLoopList` and `FeaturedOrganizerCardGrid`; feature sections
  configure them with item arrays and route-specific copy.
- Shared marketing consent banner presentation lives in
  `website/src/shared/ui/primitives/` as `MarketingConsentBannerShell`.
  `website/src/features/marketing/MarketingConsentBanner.tsx` owns consent
  state and analytics choices, but configures the shared shell instead of
  rendering raw `consent-banner` markup.
- Featured organizer cards use `FeaturedOrganizerCardGrid`; listing
  recommendations provide card item config through
  `featuredOrganizerCardItemForListing` rather than rendering feature-owned
  mini-card shells.
- App-download CTAs and store buttons were retired in CAT-218 (Linear
  CAT-224). `web:react-component-governance` still blocks raw
  `app-download-ctas` and `store-button` markup, so a rebuild goes through
  `@catch/web-ui`.
- The consumer waitlist form was retired in CAT-218 (Linear CAT-224). The
  `joinWaitlist` contract and `/api/join-waitlist` route stay, because the
  host application flow submits through them.
- Shared UI label shells live in `website/src/shared/ui/primitives/` as
  `UiLabel`, with the base `.ui-label` style owned by `site-shell.css`.
  Route sections and legacy website display components configure `UiLabel`
  instead of rendering raw uppercase label spans directly. `UiLabel` maps to
  `catch.ui_label` for hierarchy; status-oriented `StatusBadge` remains mapped
  to `catch.badge`.
- `website/src/features/organizers/OrganizerSearchPage.tsx` now composes
  organizer-owned search sections from
  `website/src/features/organizers/sections/OrganizerSearchSections.tsx`; the
  controller remains the URL/search-param state owner.
- `website/src/features/organizers/HostListingPage.tsx` now uses
  `website/src/features/organizers/useHostListingPageController.ts` for
  listing-derived nav, claim CTA, save/share state, local persistence, and
  listing analytics, and
  `website/src/features/organizers/sections/HostListingSections.tsx` for the
  ordered route-section assembly. The visible listing sections retain their own
  Storybook/component-registry entries.
- Shared organizer listing shells live in
  `website/src/shared/ui/primitives/` as `ListingSection`,
  `ListingSectionIntro`, `ListingFactGrid`, `ListingFormatRow`,
  `ListingEventEvidenceList`, and `ListingReview*`.
  Organizer sections configure those primitives; they do not render raw
  `listing-*` structural shells or revealed intro wrappers directly.
- `ListingFactsSection.tsx` owns the compact About and organizer-format
  presentation beneath the polaroid.
- `ListingEventsSections.tsx` owns event data selection and outbound analytics
  behavior, but configures `ListingEventEvidenceList` instead of composing
  event card/meta shells directly.
- `ListingSourcesSection.tsx` owns source data and analytics event selection,
  but configures the compact `ListingRailLinkList` so sources remain visible in
  the sticky action rail without feature-owned anchor shells.
- Shared organizer profile shells live in
  `website/src/shared/ui/primitives/` as `ListingProfileLayout`,
  `ListingProfilePrimary`, `ListingProfileRail`, `ListingPolaroid`,
  `ListingStatusLedger`, and the `ListingRail*` slots. `ListingHeroSection`
  owns listing data and the Catch polaroid presentation, while
  `ListingHeroRailSection` owns capability-aware claim, save, share, and
  ownership presentation. Organizer profiles use a white-mat polaroid with a
  mono location caption and upright Archivo identity; event notches,
  perforation, and ticket-stub typography remain exclusive to Event Detail.
- Shared organizer listing review shells live in
  `website/src/shared/ui/primitives/` as `ListingReviewSummary`,
  `ListingReviewWorkspace`, `ListingReviewLanes`, `ReviewSignalLane`,
  `ReviewSignalCard`, `OwnerResponsePrompt`, `ListingReviewEmptyState`,
  `ListingReviewForm`, and `ListingReviewCheckbox`. `ListingReviewsSection`
  owns review controller state, copy, submission behavior, and analytics
  callbacks, but configures shared review shells instead of rendering raw
  `review-signal-*`, `owner-response-prompt`, `listing-owner-response`, or
  `listing-review-*` form/state markup.
- Shared organizer listing claim shells live in
  `website/src/shared/ui/primitives/` as `ClaimMissingEvidenceList` and
  `ClaimRequestForm`, alongside the existing `ClaimBand*` and
  `ClaimRequestPanel*` primitives. `ListingClaimSections.tsx` owns claim
  controller state, auth actions, copy, and analytics, but configures shared
  claim list/form shells instead of rendering raw `missing-list` or
  `claim-request-form` markup.
- Shared organizer search result shells live in
  `website/src/shared/ui/primitives/` as `OrganizerResultCard*` and
  `OrganizerEventHighlights`. Organizer search sections configure those
  primitives; they do not render raw result-card, topline, highlight, or footer
  shells directly.
- Shared organizer search section shells live in
  `website/src/shared/ui/primitives/` as `OrganizerSearchSection`,
  `OrganizerSearchStats`, `OrganizerResultSummary`, and
  `DirectoryClaimPressure*`. Organizer search sections own controller-driven
  filters, result mapping, and claim links, but configure shared section shells
  instead of rendering raw `organizer-search-*`, `organizer-result-summary`,
  `directory-claim-pressure*`, or `organizer-results` markup.
- Shared claim-flow route shells live in
  `website/src/shared/ui/primitives/` as `ClaimFlowMain`,
  `ClaimFlowHero`, `ClaimFlowWorkspace`, `ClaimFlowPanel`,
  `ClaimFlowStage`, `ClaimListingResults`, `ClaimResultButton`,
  `SelectedListingCard`, `VerificationMethodGrid`, `OwnerUnlockBoard`, and
  `AuthStatusRow` variants.
  `ClaimPage.tsx` owns site chrome and route-level branching, while
  `ClaimPageSections.tsx` configures those primitives instead of rendering raw
  `claim-flow`, `claim-flow__*`, or `claim-auth-row*` shells directly.
- `website/src/features/claims/ClaimPage.tsx` now keeps route shell and
  controller selection only. Claim URL parsing lives in
  `website/src/features/claims/claimRouting.ts` and is injected from the React
  Router shell in `website/src/app/App.tsx`; the claim controller must not read
  `window.location` or import organizer routing helpers. Claim hero,
  URL-state panels, and form workspace rendering live in
  `website/src/features/claims/sections/ClaimPageSections.tsx`, with route and
  section Storybook coverage registered in `design/website/components.json`.
- `website/src/shared/site/**` owns neutral site shell/display primitives:
  `SiteHeader`, `SiteFooter`, and `SectionHeader`.
- The legacy `website/src/components/site.tsx` barrel is retired. New website
  code must import neutral site primitives from `website/src/shared/site/**`,
  governed visual primitives from `website/src/shared/ui/primitives/`, and
  domain adapters from their owning feature folder.
- `website/.storybook/**`, `website/src/stories/MarketingRoutes.stories.tsx`,
  `website/src/stories/HostSections.stories.tsx`, and
  `website/src/stories/ClaimSections.stories.tsx`,
  `website/src/stories/OrganizerSearchSections.stories.tsx`, and
  `website/src/stories/OrganizerListingSections.stories.tsx` provide the first
  component-first workbench for route-linked and section-linked review.
- Website CSS is split from the former `shared-core.css` aggregate into
  ordered ownership files under `website/src/styles/**`. `responsive.css`
  remains a mixed responsive layer until the next finer-grained CSS pass.
- TanStack Query is installed in both React apps. `website/src/shared/query/**`
  and `admin/src/shared/query/**` own query providers and query-key factories.
  Admin Data Quality is the first admin reference migration from manual loading
  state to `useQuery`; Admin Role Management now uses query keys for assignment
  reads and exact-uid role loads, with exact-user pending state derived from
  query fetching plus an explicit save mutation and assignment cache
  invalidation. User Analytics report reads now use payload-scoped query
  keys while lookup inputs, range controls, and the active report handoff remain
  controller-owned. Marketing Ops bridge loading now uses a shared query key and
  updates that cache after draft creation and local review decisions; review and
  draft-create pending rows are derived from TanStack mutation state. Event
  Intake dashboard bridge loading now uses the same query-cache pattern while
  review decisions and local source/candidate edits update the bridge cache;
  review-decision pending rows are derived from TanStack mutation state.
  Organizer Intake decision, curation, event-candidate, policy-gap, and
  location-resolution pending rows are also derived from named mutation keys
  instead of local in-flight maps.
  Finance Ops overview loading now uses the finance query key while issue
  filters and selected issue state remain local to the controller. Growth KPI
  snapshot loading now uses range-scoped query keys while stage/search filters
  and selected signal state remain local to the controller. Overview dashboard
  loading now uses separate overview and analytics query keys keyed by mode,
  role access, and analytics payload while filter form state remains
  controller-local. Safety Triage queue and detail reads now use explicit query
  keys while filters, selection, review notes, assignment notes, and recent
  session receipts remain local to the controller. Event Publishing canonical
  list, external supply list, supply readiness, and selected-detail reads now
  use explicit query keys while query inputs, filters, active view, selected
  external row, and edited event form state remain local to the controller.
  Listing public reviews are the first website reference migration for remote
  reads, mutations, cache updates, and invalidation. Claim request submission,
  waitlist submission, and host application submission follow the same website
  mutation convention and frozen-snapshot pending boundary. TanStack mutation
  state drives the visible disabled boundary; a synchronous controller ref
  prevents a duplicate before React can publish that state.
- Feature folders exist under `website/src/features/**`.
- `website/src/features/events/**` owns the generated event-detail route,
  event projection normalization, and event-scoped review filtering. It
  composes organizer authority and event-scoped review presentation with the
  existing guest entry controller. The shared invitation primitives place event
  artwork beside identity, host and essential facts on desktop, and stack them
  with one persistent guest action on mobile. The inline and mobile actions
  consume the same account-scoped server state. Phone verification and booking
  retain their existing controllers inside an accessible dialog; polling never
  replaces an active transaction controller. Optional description, itinerary,
  requirements, accessibility and reviews are omitted when absent. Artwork comes
  from the published event, with a typographic fallback; the illustrated dinner
  poster is a synthetic Storybook fixture only. The public display contract
  references canonical event media, meeting-location and itinerary definitions;
  generated browser schemas validate those optional projections. The route
  loads bounded published reviews for the resolved organiser/event only (50 per
  query), preserving moderation, anonymity and review capability checks. Failures
  render an unavailable state, never a zero-review claim. Upcoming events use
  explicitly labelled organiser feedback; completed events prefer their own
  reviews. Public rating counts distinguish verified attendance from followers.
  Age requirements come from canonical constraints; admission, waitlist and
  cancellation labels come from event policy. Optional host-authored guest notes
  are read only from `eventFormat.activityDetails.publicDetails` (requirements,
  accessibility, included; nonblank strings up to 2000 characters each). This
  existing extension namespace is opt-in public content; other activity details
  never enter the DTO. Host creation, saved drafts, repeat prefills,
  published-event editing and private setup expose accessibility and inclusion notes through this namespace.
  Clearing either note removes it without replacing sibling format settings;
  absent notes stay absent. Requirements remain available to existing producers.
  Public location/address and itinerary duration are rendered without inventing missing values. Registration context is separate
  from the account controller: restricted web registration is not a closed event,
  and closed events retain booking recovery. The route
  retains authorized `/join/` entry rather than recreating the live runtime;
  shared Catch tokens own its type, color, spacing, radius, and activity accent.
- `website/src/styles/catch-language.css` is the single design-language layer,
  imported in `styles.css` immediately after `base.css`. It owns the motion
  duration/easing tokens, the Archivo `font-stretch: 78%` voice axis, the
  `.catch-kicker`/`.catch-data` helpers, the `.catch-dark` dark-surface
  variable remap (including derived `color-mix` values and focus ring), the
  `[data-activity]` pigment map, and the warm matte photo grade. Route
  stylesheets consume the generated `--catch-*` tokens and these helpers rather
  than re-declaring design values. The former `organizer-public.css` aggregate
  was folded into `home.css`, `organizers.css`, and `flows.css` and deleted.
- Home and Host heroes are dark "wow" surfaces: their shells add `.catch-dark`,
  `SiteHeader` accepts a `tone="dark"` prop so chrome reads correctly over them,
  and hero stages show real app captures in the shared phone-capture frame
  instead of invented product mock panels or metrics. `SiteHeader` also owns
  the mobile menu dialog; its labels arrive via the required `menuCopy` prop
  from `content/site.ts` (`siteMenuCopy`) so shared chrome never imports
  route-specific content.

The next refactor should focus on page and style decomposition, not another
top-level framework rewrite. The largest current files are page or style
aggregation points:

| File | Current role | Refactor pressure |
|---|---|---|
| `website/src/features/home/HomePage.tsx` | Thin home route shell that wires site chrome to `consumerHomeSections` | Keep route assembly here; move future Home section edits into `features/home/sections/` and only promote neutral, repeated shells to shared UI. |
| `website/src/features/organizers/HostListingPage.tsx` | Thin listing route shell that wires site chrome to `useHostListingPageController` and `HostListingSections` | Keep page-local sections under `features/organizers/sections/`; avoid moving listing-specific blocks into shared UI too early. |
| `website/src/features/host/HostPage.tsx` | Canonical host assembly with core, supporting, and Playbook section imports | Keep the route file as a table of contents; section bodies stay under `features/host/sections/`. |
| `website/src/features/claims/ClaimPage.tsx` | Thin claim route shell using injected `ClaimRouteState`, `useClaimFlowController`, and `ClaimPageSections` | Keep route URL parsing in `features/claims/claimRouting.ts` and the React Router shell; keep auth/submission behavior in the controller; keep visible route sections in `features/claims/sections/`. |
| `website/src/shared/ui/primitives/` | Family-split governed visual primitives used by website feature sections | Keep repeated shell markup in the relevant family module; state, analytics, and domain mapping stay in feature controllers/adapters. |
| `website/src/styles/responsive.css` | Mixed responsive selectors preserved from the former aggregate stylesheet | Split by feature only when visual output can be checked route-by-route. |

## Architecture Rules

1. Route-first before component-first.

   Public route behavior starts in `design/website/routes.json`. Any route,
   metadata, robots, sitemap, generated listing, or static-output change must
   update that contract and pass:

   ```sh
   node tool/run.mjs check marketing:website-routes
   ```

   Route stories with `review.stateCoverage.storybook` must declare matching
   `parameters.catchRoute.id`, `reviewStates`, and `stateCoverage` entries.
   Manual-only route states stay in `stateCoverage.manual`; do not mark a route
   `ready` unless it has at least one Storybook-backed state.

   Static metadata is read from `website/src/content/meta.json`; both the
   client and postbuild readers must pass the same validated contract.

2. Marketing-authored copy belongs to the content layer.

   `web:website-copy-ownership` scans production `.ts` and `.tsx` and blocks
   new visible JSX text (including single-word labels), accessibility copy,
   copy-bearing prop/data literals, and validation/status messages outside
   `website/src/content/**`. The current component copy is recorded as
   migration debt in `tool/web/website_copy_baseline.json`.
   Move entries into direct page-specific content imports and shrink that
   baseline; permanent technical exceptions belong in the reasoned allowlist.
   The gate rejects malformed, duplicate, overlapping, or stale registry
   entries, so completed migration debt cannot remain hidden in an inflated
   baseline and allowlist exceptions cannot survive without a live finding.

   ```sh
   node tool/run.mjs check web:website-copy-ownership
   ```

   Templates use `content/interpolate.ts`. Its runtime contract rejects
   missing, extra, and misspelled tokens and is shared by client metadata and
   Node postbuild validation. Literal templates infer exact token keys at
   compile time; `interpolate.typecheck.ts` proves missing and extra keys fail.
   Copy-bearing template expressions are included in the ownership ratchet.

3. Component ownership follows the route contract.

   Component review starts from `design/website/components.json`. Route and
   section stories must attach `parameters.catchComponent.id`, `routeIds`, and
   `states` to registered component coverage, and any component marked
   Storybook-ready must pass:

   ```sh
   node tool/run.mjs check marketing:website-components
   ```

   Keep component entries route-linked through `routeIds`; do not create a
   parallel component inventory that cannot be traced back to public route
   review. The checker validates both directions: ready registry entries must
   point to matching story exports, and referenced stories must point back to
   known ready component ids, valid route ids, and registered state names.

   Storybook stories that render query-backed sections must wrap those sections
   in `WebsiteQueryProvider` so the workbench matches the runtime root. The
   global Storybook preview now provides that runtime boundary for every story.

   Accessibility runs through the Storybook Vitest addon in Playwright
   Chromium with axe failures blocking by default. Existing visual findings
   are exact, reasoned `todo` entries under `WEB-A11Y-001` in
   `design/website/a11y.todo.json`; the pretypecheck debt scanner rejects new,
   missing, duplicate, or stale annotations. The CI runner therefore blocks
   regressions while allowing the legacy set to shrink without silently
   disabling accessibility analysis.

4. The app shell resolves routes and lifecycle only.

   `App` should choose the route, metadata, page class, page-level captures, and
   shell lifecycle hooks. It should not own page content, feature state, form
   mutation logic, analytics payload assembly, or generated-listing selectors.

5. Page components compose sections; controllers own state.

   Page files should mostly assemble feature sections. Hooks/controllers own URL
   state, forms, local persistence, Firebase calls, analytics side effects, and
   mutation status.

6. Feature folders own domain-specific UI.

   Do not promote a component to shared UI because it is visually reusable once.
   Shared UI is for neutral primitives with stable semantics across multiple
   features. Domain blocks such as listing diagnostics, host product sections,
   claim proof panels, and review lanes stay feature-owned until reuse is real.

7. Interactive controls go through shared primitives.

   Feature, app, and Storybook code must not render raw `<button>`, `<a>`,
   `<input>`, `<select>`, or `<textarea>` elements. Use the website shared UI
   primitives, add a new primitive there when the concept is genuinely missing,
   or add a temporary `react-ui-primitive-allow: <debt-id>` comment with a
   removal plan. The gate is:

   ```sh
   node tool/run.mjs check web:react-ui-primitives
   ```

8. Governed component families and class names go through shared primitives.

   Website and admin code must not hand-roll governed component shells in
   feature, app, or Storybook code. Feature code also must not pass `className`
   directly; class ownership belongs in `website/src/shared/ui`,
   `website/src/shared/site`, or `admin/src/shared/ui`. The class-name gate is:

   ```sh
   node tool/run.mjs check web:react-classname-boundaries
   ```

   The canonical governed-family list is printed on demand by
   `node tool/web/check_react_component_governance.mjs --families-json`. This is a
   known-family blocklist: passing the scanner does not classify novel shell
   families automatically, so repeated new shell drift must become a scanner
   family before handoff. The gate is:

   ```sh
   node tool/run.mjs check web:react-component-governance
   ```

   Exported website feature components are also governed. Any uppercase
   component exported from `website/src/features/**/*.tsx` must be declared in
   `design/website/components.json` as a route, section, flow, or supporting
   component, or made private. The component registry gate is:

   ```sh
   node tool/run.mjs check marketing:website-components
   ```

9. Generated data remains explicit.

   `website/src/generated/hostListings.json` is a generated projection. Feature
   code should read it through `features/organizers/data.ts` and typed selectors,
   not directly from pages outside the organizer feature.

10. Metadata and static output stay coupled.

   Client metadata in `pageMeta.ts`, route resolution in `App`, and postbuild
   output in `website/scripts/postbuild.mjs` must stay covered by the route
   contract. Legacy organizer routes must preserve canonical/noindex behavior
   before and after hydration. Firebase Hosting must route `/claim/**` to the
   generated `/claim/index.html` shell so direct claim lookup links do not fall
    through to root metadata.

    Website analytics payloads are also version-coupled to the copy migration:
    `trackMarketingEvent` appends the immutable `website_copy_v2` content
    version, and the pretypecheck analytics contract covers page events plus
    unset, essential-only, and accepted consent presentation states. Both CTA
    wrappers use the same tested `marketingCtaClickParameters` builder, keeping
    the existing `cta_label`/`cta_href` transport exact.

11. Analytics and Firebase boundaries stay centralized.

   Consent, event IDs, attribution, GTM/dataLayer emission, and organizer
   analytics dispatch should go through shared analytics services. Feature
   controllers may decide when a business event happened, but should not
   duplicate low-level analytics mechanics.

12. CSS ownership follows component ownership.

   Global CSS defines tokens, resets, shell utilities, and shared primitives.
   Feature CSS belongs beside feature concepts, even if it remains imported from
   a central stylesheet during the migration. Avoid adding unrelated rules to
   broad compatibility files such as `responsive.css`.

## React Dependency Decisions

The React apps should use maintained ecosystem primitives for routing and
server state instead of growing custom pathname, query-string, loading, retry,
and mutation machinery.

| Need | Flutter app analogue | React decision | Scope |
|---|---|---|---|
| URL routing, dynamic path params, search params, links, back/forward behavior | `go_router` | Add `react-router` | `website/` and `admin/` |
| Firebase/server reads, callable mutations, cache invalidation, loading/error states, retry/dedupe | Riverpod async providers and repositories | Add `@tanstack/react-query` | `website/` and `admin/` |
| Cross-feature client-only state | Riverpod client state providers | Keep local React state, `useReducer`, and narrow context first | Add a store only when a real shared client state appears |
| Long form state and validation | Form models plus generated validation contracts | Defer form library selection | Re-evaluate when refactoring host application, claim flow, or admin intake forms |

### Router Direction

Use React Router as the default router for both React apps.

- In `website/`, React Router owns the route shell in `website/src/app/App.tsx`
  and route patterns in `website/src/app/routeRegistry.ts`. It must not replace
  `design/website/routes.json`, route-contract checks, or postbuild static HTML
  output; those remain the SEO/deploy source of truth. Organizer-directory
  search/filter URL state is router-owned through `useSearchParams`, not manual
  `window.history` or `popstate` listeners. Claim lookup URL state is parsed by
  `features/claims/claimRouting.ts` from React Router location/params and passed
  into `ClaimPage`/`useClaimFlowController` as `ClaimRouteState`; claim
  controllers must not default to global browser location.
- In `admin/`, React Router should replace `activeNav` as the primary section
  source of truth. Admin screens should be URL-addressable, refresh-safe, and
  compatible with lazy route modules and role guards.
- Prefer React Router before TanStack Router for the first migration because the
  current need is route ownership and URL correctness, not a fully typed router
  framework. Revisit TanStack Router only if search-param-heavy workflows become
  central enough that typed, validated search state is worth a larger routing
  stack decision.

### Server-State Direction

Use TanStack Query as the default async/server-state layer for both React apps.

- Providers are wired at both React roots. Query-key factories live under
  `shared/query/queryKeys.ts` in each app.
- `admin/src/features/data-quality/controllers/useDataQualityController.ts` is
  the reference migration: it uses `useQuery`, preserves the existing
  controller return shape, and keeps UI-local filters/selection in React state.
- In `admin/`, start with the repeated controller pattern: `useEffect`,
  `isLoading`, `error`, manual refresh, callable invocation, and post-mutation
  reloads. Convert one small controller first, then reuse the query-key and
  mutation conventions.
- In `website/`, keep generated/static data as plain imported data. Use TanStack
  Query only for real async boundaries such as claim lookup/submission, review
  submission, waitlist/host form mutations, and remote manifests or callable
  reads.
- Query keys should live with the feature or shared API client that owns the
  remote contract. Mutation invalidation should name the affected query keys
  explicitly.
- Claim request mutations use `websiteQueryKeys.claims.request`, then
  invalidate `websiteQueryKeys.claims.lookup` and
  `websiteQueryKeys.claims.requests` after successful submission.

### Store And Form Libraries

Do not add Redux, Zustand, Jotai, or another general client-state store in the
first pass. After React Router owns URL state and TanStack Query owns server
state, the remaining state in these apps is mostly view-local UI state that
React state, reducers, and narrow contexts can handle.

Do not add React Hook Form in the first pass. It is a plausible later tool for
the host application, claim proof, and admin intake forms, but the current
brittleness is routing and async server state. Pick a form library only during a
specific form refactor, with validation tied back to existing data contracts.

## Target Feature Structure

This is the target shape for new work and the migration map for existing files.
Do not move everything mechanically in one pass; move sections when the owning
page is being refactored and can be verified.

```text
website/src/
  app/
    App.tsx
    routeRegistry.ts
    pageMeta.ts
    usePageLifecycle.ts
  content/
    README.md
    legal.ts
    meta.json
    meta.schema.json
    site.ts
    types.ts
    markets/
      types.ts
      in.ts
      index.ts
  features/
    home/
      HomePage.tsx
      homeContent.ts
      sections/
    host/
      HostPage.tsx
      application/
        HostApplicationFlow.tsx
        applicationModel.ts
        useHostApplicationController.ts
      sections/
        HostPageSections.tsx
    organizers/
      OrganizerSearchPage.tsx
      HostListingPage.tsx
      useOrganizerDirectoryController.ts
      useHostListingPageController.ts
      components/
      data/
        generatedListings.ts
        publicDiscovery.ts
      sections/
        OrganizerSearchSections.tsx
        HostListingSections.tsx
        ListingHeroSection.tsx
        ListingFactsSection.tsx
        ListingEventsSections.tsx
        ListingClaimSections.tsx
        ListingReviewsSection.tsx
        ListingSourcesSection.tsx
      routing.ts
      selectors.ts
      types.ts
    claims/
      ClaimPage.tsx
      claimModel.ts
      useClaimFlowController.ts
      useListingClaimController.ts
      sections/
        ClaimPageSections.tsx
    reviews/
      reviewModel.ts
      useListingReviewsController.ts
      components/
    marketing/
      MarketingConsentBanner.tsx
      content.ts
      tracking.ts
  shared/
    analytics/
    firebase/
    forms/
    lib/
    site/
      SiteHeader.tsx
      SiteFooter.tsx
      SectionHeader.tsx
    ui/
      Button.tsx
      Field.tsx
      FormStatus.tsx
      primitives.ts
  generated/
    hostListings.json
  styles/
    base.css
    catch-language.css
    site-shell.css
    site-footer.css
    home.css
    host-foundation.css
    host.css
    organizers.css
    flows.css
    reveal.css
    responsive.css
```

### Import Boundaries

- `app/**` may import feature pages, validated content, route metadata,
  lifecycle hooks, analytics, and generated route contracts.
- `content/**` contains authored data and browser-safe pure contract helpers;
  it may import only other content modules and must not contain JSX or read
  `import.meta.env`. The import-boundary scanner enforces those source rules.
  Route features may read their page-specific content directly; do not add a
  global content barrel that pulls unrelated route copy into lazy chunks.
- `content/site.ts` owns site-wide authored labels such as app-store CTA copy.
  The feature hook owns `import.meta.env` reads and joins destinations to copy;
  environment access never belongs in the content layer.
- `content/legal.json` owns the published `/privacy/`, `/terms/`, and `/help/`
  content plus confirmed operator and grievance facts; `content/legal.ts`
  exposes its typed runtime contract. `content/site.ts` owns the public contact
  destination and site-wide legal footer links. A pretypecheck contract rejects
  placeholders, incomplete sections, or missing route registration.
  Native apps link to these routes from consumer Settings and the Catch Host
  account menu. Both stay fail-closed: an entry renders only when
  `CATCH_PRIVACY_POLICY_URL`, `CATCH_TERMS_URL`, or `CATCH_HELP_URL` holds a
  valid https destination. Every `tool/env/dart_defines/*.json` file sets the
  same canonical trailing-slash routes; `test/core/legal_links_test.dart` and
  `tool/validate_firebase_environment.sh` reject missing, non-https, or aliased
  values. Privacy and Terms are separate documents and must never alias the
  same route.
- `content/markets/index.ts` selects the active market pack. City lists,
  currency, geo-adaptive labels, India-specific comparison columns, and example
  event name/venue/city/currency belong in that pack rather than page or
  shared-UI modules. Host create-flow fixtures and application defaults read
  those values through `@content/markets`.
- Market cities are structured by stable id, slug, aliases, IANA timezone, and
  `live`/`waitlist` status. Country/store availability, locale, ISO currency,
  and featured city are pack-level contracts; event-live and form options are
  derived from the city records rather than parallel city lists.
  `check:market-pack` validates references and formatting; Home eligibility
  resolves generated listing labels/aliases back to city ids.
- Feature pages may import their own feature modules, `shared/**`, and explicitly
  named cross-feature controllers only when the product flow requires it.
- `features/claims/**` may depend on organizer listing models because the claim
  flow selects an organizer.
- `features/events/**` may depend on organizer listing policy and models,
  review presentation, and marketing app-download adapters because event
  details inherit organizer authority while keeping registration source-aware.
- `features/organizers/**` may depend on claim and review controllers for the
  listing page, and on the event projection for event-card deep links and the
  executable public-surface behavior harness, until those panels move behind
  local adapter components.
- `shared/**` must not import from `features/**` or route-specific `content/**`.
- `generated/**` should be read through a typed feature-owned adapter.

## Recommended Refactor Order

1. Keep the route shell stable.

   React Router now lives in `website/src/app/App.tsx`, route patterns live in
   `website/src/app/routeRegistry.ts`, and `website/src/App.tsx` is only a
   compatibility re-export. Preserve public output, canonical/noindex behavior,
   metadata, lazy route chunks, and postbuild HTML before moving deeper URL state
   or adding component-first review.

2. Keep `HostListingPage` decomposed.

   `HostListingPage` crosses generated listings, legacy metadata, claim CTA
   behavior, reviews, save/share, event cards, and public API state. Keep the
   route file as site chrome plus `HostListingSections`, with
   `useHostListingPageController` owning listing-derived nav, save/share state,
   local persistence, and analytics side effects.

   `HostListingSections` should remain the route-level table of contents for
   page-local sections:

   - `ListingHeroSection`
   - `ListingFactsSection`
   - `ListingCatchEventsSection`
   - `ListingExternalEventsSection`
   - `ListingEventEvidenceSection`
   - `ListingReviewsSection`
   - `ListingEventSuccessSection`
   - `ListingSourcesSection`
   - `ListingMissingEvidenceSection`
   - `RecommendedOrganizersSection`

   The page should continue to read as a table of contents, with business logic
   staying in selectors/controllers and visible sections retaining their
   component-registry and Storybook coverage.

3. Keep `HostPages` split.

   `/host/` and `/host/preview/` now live in route-specific files. Shared host
   sections live under `features/host/sections/`, the host application flow
   lives under `features/host/application/`, and `HostPages.tsx` remains only as
   a compatibility barrel.

4. Keep shared site primitives split.

   `SiteHeader`, `SiteFooter`, and `SectionHeader` now live in `shared/site`.
   Keep using direct `shared/site` imports for new page code. Do not turn
   one-off host/listing/product sections into shared primitives. Do not recreate
   the retired `website/src/components/site.tsx` barrel; import from the
   canonical shared or feature owner directly.

5. Keep CSS split by ownership.

   The former `shared-core.css` aggregate has been split into ordered files
   imported from `styles.css`. Keep class names stable so visual diffs point to
   ownership mistakes, not naming churn. Treat `responsive.css` as the next
   temporary aggregate to reduce.

6. Keep `ClaimPage` decomposed.

   `ClaimPage` owns only site chrome, `useClaimFlowController`, and the
   route-level branch between URL-state rendering and the interactive workspace.
   React Router owns the URL inputs in `App.tsx`, and `claimRouting.ts` owns the
   typed `ClaimRouteState` parser that the route shell passes into `ClaimPage`.
   It must wrap visible claim route content with `ClaimFlowMain`; do not render
   the raw `claim-flow` route shell or claim auth-row modifier in feature code.
   Keep visible rendering in `ClaimPageSections.tsx`:

   - `ClaimHeroSection`
   - `ClaimUrlStateSection`
   - `ClaimWorkspaceSection`

   Storybook section coverage should use a mock controller for
   `ClaimWorkspaceSection` so auth and Firebase side effects stay out of the
   section workbench. Keep mutation, auth, validation, and query invalidation in
   `useClaimFlowController`.

7. Keep the component-first workbench route-linked.

   Storybook is the React equivalent to Widgetbook for the marketing website.
   Stories should use `design/website/routes.json` route ids and
   `design/website/components.json` component ids. `MarketingRoutes.stories.tsx`
   covers `/`, `/host/`, `/host/preview/`, `/claim/`, `/organizers/`, `/404/`,
   and the generated organizer listing family. Its `parameters.catchRoute`
   blocks are route-contract evidence, so keep `reviewStates` and
   `stateCoverage` synchronized with `routes.json`. `HostSections.stories.tsx`
   covers the shared host sections plus the Host Preview route section layer.
   `ClaimSections.stories.tsx`, `OrganizerSearchSections.stories.tsx`, and
   `OrganizerListingSections.stories.tsx` cover the first claim/organizer
   section layers. Add
   route plus section stories before smaller reusable component atoms.

8. Keep server-state conventions explicit.

   TanStack Query providers and query-key factories now exist in both React
   apps. Continue with focused controller migrations: one query or mutation
   family at a time, with explicit invalidation after successful mutations.
   `Admin Data Quality`, `Organizer Publishing`, organizer intake mutations,
   public claims/reviews, website waitlist and host application submissions,
   `Access Review`, `Admin Role Management`, `User Analytics`, `Marketing Ops`,
   `Event Intake`, `Finance Ops`, `Growth KPI`, `Overview`, `Safety Triage`,
   and `Event Publishing` are the current reference adopters.
   `Access Review` keeps local
   form/filter/recent-decision state in the controller, but list/detail reads
   and the approve/deny mutation now use query keys, query state, and explicit
   invalidation. `Admin Role Management` keeps editable selected-role state in
   the controller while assignment reads, exact-uid role loads, exact-user
   pending state, and role-save invalidation go through TanStack Query. `User
   Analytics` keeps lookup/range
   form state local, but submitted report reads are cached by normalized payload
   so user id, preset/custom dates, and granularity do not collide. `Marketing
   Ops` keeps studio
   tab/composer/local-edit state local, while the bridge read and post-write
   bridge replacement use the shared query cache. `Event Intake` keeps
   tab/notes/local source and candidate edits in the controller, while the
   dashboard bridge read and review-decision cache updates use the shared query
   cache. `Finance Ops` keeps filter/selection state local, while finance
   signals are derived from the query-cached overview snapshot. `Growth KPI`
   keeps range, stage, search, and selection state local while overview and host
   analytics signals come from the range-scoped query snapshot. `Overview`
   keeps range, granularity, date, club, and event filters local while the
   overview snapshot and role-scoped host analytics payload use separate query
   keys. `Safety Triage` keeps queue/search filters, selection, decision notes,
   assignment notes, and recent session receipts local while the queue snapshot,
   selected detail, assignment mutation, and decision mutation use shared query
   keys and mutation pending state. `Event Publishing` keeps query inputs,
   filters, active view, selected external row, and edited event form state
   local while canonical list, external list, supply readiness, selected detail,
   save mutation, and external publish mutation use shared query keys and
   mutation pending state. Organizer Intake, Event Intake, and Marketing Ops
   row-level pending state is derived from TanStack mutation state through named
   mutation keys. `web:react-query-state` ratchets manual
   loading/saving/submitting/in-flight state in feature controllers and feature
   `use*` hooks against `tool/web/react_query_state_baseline.json`; new
   server-state work should keep that baseline empty.

9. Keep React query-state enforcement active.

   Website and admin code now share `node tool/run.mjs check
   web:react-query-state`. The scanner is a baseline-backed ratchet for manual
   async state in feature controllers and feature `use*` hooks. The baseline is
   empty for both React apps. The gate fails new unbaselined
   loading/saving/submitting/in-flight state. Refresh the baseline only when a
   deliberate exception has an owner, expiry, and removal plan.

10. Keep React primitive enforcement active.

   Website and admin code now share the first React UI primitive scanner:
   `node tool/run.mjs check web:react-ui-primitives`. Expand it before adding
   new local button/link/input/select/textarea variants in feature code.

11. Keep React component-family enforcement active.

   Website and admin code share `node tool/run.mjs check web:react-classname-boundaries` plus `node tool/run.mjs check web:react-component-governance`. The class-name scanner blocks feature/app/story `className` usage outside shared primitive owner files. The component scanner emits its current family view on demand with `node tool/web/check_react_component_governance.mjs --families-json`; no generated family snapshot is tracked. This is a known-family blocklist: passing it does not classify novel shells, so repeated new component drift must become a scanner family before handoff.

12. Keep cross-surface primitive decisions classified.

   Run `node tool/run.mjs check web:shared-ui-adoption`. The tracker
   distinguishes adopted package semantics from deliberate surface-specific
   families; package exports, exact-name cross-app overlap, and adopted
   adapters cannot drift outside that decision record.

13. Keep controller behavior-test targets explicit.

   `tool/web/react_controller_test_targets.json` classifies every marketing and
   admin feature controller/mutation hook. Run `node tool/run.mjs check
   web:react-controller-test-targets`; required targets need named importing
   behavior suites, while aggregate coverage remains an informational report.

## Next Implementation Batch

The next code refactor should be small:

1. Add generated listing section states when new generated fixtures expose
   external events or event-evidence sections.
2. Move claim lookup reads to TanStack Query only if/when the lookup becomes a
   real remote read instead of generated-data URL resolution.
3. Migrate one more admin read or mutation controller with repeated manual
   loading state, using Admin Data Quality, Access Review, Admin Role
   Management, User Analytics, Marketing Ops, Event Intake, Finance Ops, Growth
   KPI, Overview, Safety Triage, and Event Publishing as references. Run a small
   inventory before choosing another admin async candidate so the next migration
   is driven by remaining manual load or mutation state rather than stale
   candidate prose.
4. Keep generated/static website data as plain imports; use TanStack Query only
   for true remote reads and mutations.

Run:

   ```sh
   node tool/run.mjs check marketing:website-routes
   node tool/run.mjs check marketing:website-components
   node tool/run.mjs check web:react-ui-primitives
   node tool/run.mjs check web:react-component-governance
   node tool/run.mjs check web:react-query-state
   npm --workspace catch-marketing run typecheck
   npm --workspace catch-marketing run build:storybook
   npm --workspace catch-marketing run build
   node website/scripts/checkOrganizerBuildOutputs.mjs
   ```

The next useful proof is applying the same convention to one additional admin
read or mutation family without changing the surrounding UI contracts.

## Public sitemap and conversion ownership

The consumer `/` leads with **Find events**, city and format filtering, an
upcoming-event preview, optional participation tools, organiser profiles, FAQs
and a concise Catch Host invitation. `content/consumerHome.ts` owns its copy;
`useConsumerHomeController` derives cards from the existing public catalogue.
`/explore/?city=…&format=…#events` retains those choices and shows all matching
events. It also retains app availability and the member waitlist.

The empty-city state retains the editorial sections and identifies organiser
suggestions as across Catch. Loading and unavailable catalogue states do not
claim that a city has no events. Event cards use canonical detail URLs, public
publication policy and existing future-event eligibility. Illustrative fallback
photographs are labelled. Catch Experience explains active guest participation;
event badges and an Experience filter await an explicit eligibility field in
the public projection and must not be inferred from activity format.

The approved expanded host narrative remains a subsequent content increment;
this homepage change preserves the existing Host page and commercial terms.
Canonical organiser paths continue to come from `publicPage.canonicalPath`;
this consolidation does not rename organiser or event URLs.

`/host/` owns product detail: `#features`, `#how-it-works`, `#use-cases`,
`#existing-tools` and `#pricing`. `content/hostProduct.ts` holds the consolidated
capability, persona, tool-category and workflow explanations; existing supported
pilot copy remains in `content/host.ts`. Broader workflow and integration
examples retain availability boundaries. Adoption levels are not published
commercial tiers. `/host/apply/` is the sole five-stage pilot intake, reusing the
existing application controller and HTTP contracts. Applying does not book a
call or grant a workspace.

`/organizers/` owns real directory search; `/claim/` and `/claim/:listing`
own the existing claim flow and explanatory guidance in `content/claimGuidance.ts`.
Fictional listing rows and simulated console counters are removed, not mixed
into real discovery or offered as customer proof.

| Retired URL | Replacement |
|---|---|
| `/host/overview/` | `/` |
| `/host/platform/` | `/host/#features` |
| `/host/workflows/` | `/host/#how-it-works` |
| `/host/planners/`, `/host/mixers/`, `/host/clubs/` | `/host/#use-cases` |
| `/host/stack/` | `/host/#existing-tools` |
| `/host/directory/` | `/organizers/` |
| `/host/claim/` | `/claim/` |

These URLs have permanent Hosting redirects and client compatibility handling,
not duplicate pages. Query parameters survive; obsolete source anchors give
way to destination anchors. The Host compatibility handler repairs query strings
that Hosting appends after section fragments, before analytics or scrolling. `/host/#founding-hosts` still reaches the real
application through client compatibility. Postbuild clears stale retired HTML.
The old concept page, workflow-review page, prototype content/catalogs,
interactive simulators, parity fixture, forwarding shims and stories are deleted.
Git history preserves their provenance; no parallel runtime archive remains.

Booking, offers, invitations, public forms, household RSVP, event runtime,
assistance, rehearsal and private sales-demo credentials and authorities are
unchanged. Legal/help bodies and actual 404 policy remain authoritative.

### Shared platform boundaries

Marketing and admin already use React 19, TypeScript 6, Vite, TanStack Query,
Firebase, generated Catch tokens and `@catch/web-ui`. Their step rails now consume
the same `ButtonControl` non-submitting/disabled semantics, retaining surface
callbacks/classes and selected `aria-current="step"`. Existing package controls
own fields, toggles, tables, badges and empty states. Marketing `<dl>` facts,
admin operational summaries, pending-operation leases and domain validation
remain surface-owned because their contracts differ. No privileged admin imports
enter the public bundle, and no new Firebase/callable/repository tier is added.

Identity/claim/provider configuration inventory and public event dual-entry
boundaries are maintained in `docs/web_surface_architecture.md`. A shared Firebase
project is not proof of cross-origin sessions, linked providers, organiser
ownership or global roles. Public form entry remains low friction according to
its actual identity policy; existing required OTP boundaries remain unchanged.

### Remaining product and authority decisions

Content consolidation and retirement are authorised. Commercial availability,
provider integration support and production publication are distinct from this
source change. The site must not turn illustrative workflows into launch or
revenue promises. The next architecture pass can address shared platform
ownership without recreating duplicate marketing destinations.

## Open Decisions

- Preserve existing organiser canonical paths; city-scoped aliases do not
  authorise a new canonical URL convention.
- Static marketing-authored content uses typed TypeScript modules or validated
  JSON under `website/src/content/**`. Metadata is the first migrated owner;
  visible page-copy extraction remains incremental and must preserve route lazy
  loading through direct page-specific imports. A CMS remains deferred until a
  real non-engineering publishing workflow is approved.
- Decide which route review states are required for launch versus acceptable as
  manual review notes.
- Decide whether React Hook Form is worth adding during a specific long-form
  refactor after routing and server-state conventions are in place.

### Host landing content and format explorer

Home, Host and Explore render the shared `PublicSiteHeader` and
`PublicSiteFooter` (Find events, Organisers, For organisers).
Their typography and responsive chrome are owned by that shared consumer
wrapper, not the surrounding page. Host-specific section links and the pilot
action sit in a separately labelled navigation row below the global header.
The Host adoption section restores three selectable concentric circles:
Catch tools, Catch booking and Catch network. It uses native buttons with
pressed state and one announced detail region; selection is independent of
the five-format explorer. These describe optional adoption layers, not fixed
commercial tiers. Brief phone interactions, private introduction requests,
host overrides and aggregate private feedback are explained explicitly.
The illustrative CRM shows a follow-up opt-in rather than an individual
private feedback answer.


The public `/host/` entry balances event-business workflows with guest participation.
`src/content/hostLanding.ts` owns its authored copy and five illustrative before/during/after formats;
`features/host/sections/hostLandingSections.tsx` composes the page and owns the local accessible tab selection.
Named visual wrappers live in `shared/ui/primitives/hostLanding.tsx`, with styling in `styles/host-landing.css`.
Examples are fictional and do not execute booking, messaging, grouping, or payment actions.
Existing tool and persona detail remains behind disclosures; `#features`, `#how-it-works`, `#use-cases`,
`#existing-tools`, and `#pricing` retain their retired-route destinations. The only acquisition form is
`/host/apply/`; the selected free live-event pilot is distinct from broader capabilities and future terms.

### Explore discovery

`/explore/` is the consumer event catalogue, sharing consumer navigation with
Home and Host. City, format, search, upcoming date and Catch Experience choices
round-trip through bounded, allowlisted URL parameters. Results use public event
records, are ordered by start time, and distinguish empty cities, filtered-out
results and unavailable feeds. External booking sources remain labelled.

The optional public event field `catchExperienceActivities` declares
`introductions`, `sharedActivities` or `rotations` offered through Catch. It is
not inferred from a format, booking integration, attendance or logistics.
Malformed or absent declarations omit the badge. Cards and event details show
the declared activities. Host authoring of this declaration is a separate product
integration; this website change adds its public contract and rendering only.
Local emulator and Storybook examples are illustrative, never production supply.
The former Explore dating landing sequence is replaced; the Home/Host positioning,
participation/privacy explanations and Host adoption circles remain. Claim trust
links now lead to Help rather than the retired Explore trust anchor.

### Organiser directory presentation

`/organizers/` uses the same consumer chrome, typography, cream background and
muted green controls as Home, Host and Explore. The directory leads with clubs,
communities and independent hosts. Search, city, activity and upcoming-event
filters stay prominent; ownership, guest rating and sort controls use a secondary
disclosure. Public profile status, permission-gated reviews and event evidence
remain available. Catch Experience is described as an event-level participation
badge rather than an organiser endorsement. Claiming and Host acquisition sit
below discovery results. Unavailable feeds withhold stale cards; empty markets
remain selectable. Allowlisted filters survive a Next.js document reload.
