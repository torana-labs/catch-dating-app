---
doc_id: web_surface_architecture
version: 0.38.0
updated: 2026-10-24
owner: web_platform
status: active
---

# Web Surface Architecture

## Decision

Use one apex domain with separate subdomains for distinct web products:

| Domain | Surface | Repo source | Firebase Hosting target |
|---|---|---|---|
| `catchdates.com` | Public marketing site, public host pages, SEO pages, legal/support pages, app-link files, and public lead capture | `website/` | `marketing` |
| `www.catchdates.com` | Redirect to `catchdates.com` | Firebase custom domain redirect | `marketing` |
| `app.catchdates.com` | Consumer app on Flutter web | `apps/consumer/build/web` | `app` |
| `admin.catchdates.com` | Internal admin and analytics console | `admin/` | `admin` |

Keep the Flutter web app separate from the public website. The Flutter web app is
the consumer app surface and should continue sharing mobile app code. The
marketing and admin surfaces are web-native products and should use the same
React + TypeScript stack where practical.

**Web code unification (owner decision, 2026-10-22).** The website and Admin
stay separate deployables on separate origins. `catchdates.com` keeps
server-rendered public pages; `admin.catchdates.com` keeps its signed-in
single-page app with its own security headers, App Check settings and Firebase
Auth origin, so a script injected into a public page cannot reach an operator
session. Everything above the deployable is shared rather than duplicated:
styled components and layout primitives in `@catch/web-ui` (UI blueprint Phase
7e), tokens and one stylelint and ESLint preset in `@catch/web-config`, and a
planned `@catch/web-data` for the Firebase bootstrap, the contract-validated
callable client and query helpers. Each app owns only its routes, screens and
feature controllers. Raw values and component placement are enforced by
stylelint and ESLint rules with shrink-only debt lists; each hand-written web
scanner retires in the same change that lands the rule replacing it.

The no-download `/f/:publicFormId/` respondent route is also owned by the
public React website. It loads a callable-projected immutable form version,
supports policy-specific identity verification, revisioned autosave, review,
submission receipts, and withdrawal, and remains usable in a bounded iframe
presentation. It never reads Forms collections directly and does not bootstrap
the Consumer Flutter application.

## Next.js candidate and cutover boundary

The public website has a Next.js 16 App Router candidate alongside the current
Vite/Firebase Hosting deployment. `npm run build --workspace catch-marketing`
validates/builds both; deployment still consumes `website/dist`. This does not
switch main traffic or change the consumer Flutter/admin applications.

The candidate uses Node 24 and standalone output, including traced monorepo
packages plus public/static assets. `website/Dockerfile` and its adjacent
Dockerfile-specific ignore file define a non-root container with a minimal
source context. Public Firebase/App Check/store configuration is supplied at
build time through explicit arguments. Runtime ADC must be a dedicated
Firestore-read-only identity; never include a service-account key or private
environment file in an image. `CATCH_PUBLIC_FIRESTORE_PROJECT` selects the
runtime project. The default `CATCH_WEBSITE_STAGE=preview` denies indexing;
production indexing requires an explicit stage switch, the production project,
and no emulator configuration. In addition, the build must have passed the
existing marketing environment contract, including App Check and explicit
prelaunch/live store state. That eligibility is compiled into the artifact; a
runtime environment override cannot promote an unconfigured preview. Local acceptance is restricted to `demo-catch-nextjs` on the
loopback Firestore emulator. Docker execution itself requires separate evidence;
a passing local standalone build is not a container/deployment proof.

The proposed adapter is Firebase Hosting to Cloud Run.
`website/next-hosting.preview.json` proposes service `catch-website-next-preview`
in `asia-south1`, keeps the existing direct Function rewrites and redirects,
and is for a reviewed Hosting preview channel only. It is not wired into the
production deploy workflow and has not been deployed. Its service name is a
proposal, not evidence that the service or identity exists. Preserve
existing app-association files, Auth helpers, redirects, and the two direct
HTTP Function rewrites before any Next catch-all. The standalone HTTP gateway
is useful for isolated previews; production should retain direct Function
routing so existing ingress/IP enforcement is not collapsed onto one runtime.
Unknown-host handling must be verified through the actual Hosting/Cloud Run
request chain. Hosting rewrites replace `Host` with the tagged Cloud Run origin.
Only on the two named website runtime services, and only for their matching
`run.app` Host, the proxy accepts one strictly parsed `X-Forwarded-Host` matching
an existing Catch public domain. Forwarding never authorizes authentication,
tenant ownership or document publication; those gates remain independent.
Local, customer and unrelated runtime hosts ignore forwarding. Missing,
ambiguous or unknown forwarded origins retain the private shell/noindex policy.
Do not infer the visitor origin from Next's normalized URL.
An explicitly configured preview hostname only enables the public server surface;
private/custom-form acceptance still needs a recognized Hosting preview origin.

Before any traffic switch, obtain review of the concrete hosting configuration,
project/region/service identity, cost/scaling limits and rollback target. Prove
least-privilege reads, real Host forwarding, App Check/Auth consent, callable
forms/claim flows, Razorpay return behavior, native app links, cache withdrawal
and failure statuses on that exact deployed preview. No new paid service,
provider activation, DNS change, merge or production cutover is implied by the
source migration. Preserve the guarded worktree and draft PR until accepted
closeout. Source, CI, preview, provider acceptance and production are distinct
states.

### Accepted-source container preview

`Next Website Preview` is a main-only dispatched workflow for the Cloud Run
candidate; the release train below dispatches it. It refuses source that is not
on main, is older than the live release, or has not completed successful
same-source CI, Marketing validation and canonical captures. Its uncredentialed
build job imports only those verified captures, supplies the production public
browser configuration, builds the non-root image and exercises the actual
container without database credentials. A SHA-256-bound archive preserves that
image and the exact preview Hosting bytes; the separate deploy job verifies paths,
source/run/attempt identity, configuration and Docker image identity before OIDC.

The preview uses the existing `github-actions-web-reader` identity only after
checking that its sole project role is `roles/datastore.viewer` and that it has
no user-managed keys. It deploys `catch-website-next-preview` in `asia-south1`,
with one CPU, 512 MiB, concurrency 40, a 30-second timeout and zero-to-one
instances. The `catch-website` Artifact Registry repository holds the tested
image, deployed by digest. Only the `next-candidate` Firebase Hosting preview
channel is published, expiring after three days. Production traffic and the
current static release remain unchanged. Preview runtime/service/image/channel
identities are retained as workflow artifacts for browser and host-forwarding
acceptance. A successful preview deployment is not production cutover or proof
of authenticated/payment flows; the existing cutover gates above still apply.

### Bounded organiser-review index release

The public organiser review query needs the additive `reviews` collection index
`organizerId ASC / createdAt DESC`. `Website Review Index` releases only that
checked-in definition from current main after successful CI. It preserves the
existing `prod` human-review environment and both `backend-delivery` and
`firebase-prod` locks. A post-approval source check runs before OIDC, and another
check immediately precedes creation. It creates only when missing, waits for
`READY`, rejects failed or ambiguous index metadata and preserves unselected
index identities/definitions in before/after evidence. It does not deploy
Functions/rules, change data/IAM, advance a backend cursor or enable the general
Delivery workflow. A partial/unknown creation result stops; a new dispatch must
reinspect current metadata. Next production promotion reads this exact index and
refuses to proceed until it is ready.

### Exact-container production promotion

After deployed preview and browser acceptance, `Next Website Promotion` runs
with that successful preview run id; the release train dispatches it once a
reviewer approves. The release is the preview's own source, which main may have
moved past: it must still be on main, with successful CI, and not older than
the live release, so live only moves forward. The workflow verifies GitHub artifact provenance and
ZIP digest, bounded archive contents, source/run/attempt identity and the loaded
Docker image before OIDC. It then verifies the registry image configuration
against the tested image and checks that the preview still serves that digest
with the read-only identity. No image is rebuilt during promotion.

The production service is `catch-website-next` in `asia-south1`, with the same
read-only identity, one CPU, 512 MiB, concurrency 40, a 30-second timeout and
zero-to-three instances. The workflow records the current live Hosting version
as its rollback target. It retains the existing API rewrites, redirects, static
assets and association files while changing the catch-all to the production
service with `pinTag: true`. An expiring `next-release` channel exercises the
production configuration before the exact tested Hosting version is cloned to
live. The request proxy denies indexing on preview/default/custom hosts even
when they use the production image. `X-Catch-Release` identifies the serving
source for automated and manual acceptance.

The Next promotion and legacy Hosting promoter share `web-hosting-marketing`.
The legacy promoter reads the live Hosting configuration under that lock and
skips static mutation once `catch-website-next` owns it. Future Next releases
use the preview/promotion pair; a later automatic Vite build cannot overwrite
Next. A failed metadata read fails closed. No automatic rollback, retry,
provider activation, database mutation or IAM role grant is added. A failure
preserves source/image/service/Hosting identities and the prior version for
operator-reviewed recovery. Production and browser/provider acceptance remain
unproven until those steps actually run and are inspected.

Channel identity comes from the Hosting API after deployment, because the
pinned Firebase CLI can return an empty `version` despite a successful release.
The readback requires a finalized version on the exact expected channel, with
the expected runtime service, region and pinned tag. Preview runs must pass the
deployed public-route smoke check. Promotion records the production candidate
version before smoke checks and rechecks it immediately before cloning that
exact version; an absent, changed or unrelated release fails closed.

### Release train

`Website Release` (`.github/workflows/website-release.yml`) takes main to
catchdates.com without hand dispatches. It runs when main CI completes and
hourly as a fallback:

1. **Plan** (no credentials). It refuses to run unless the `prod` environment
   requires a reviewer. Then it releases main's head only if that head has
   successful same-source CI with Marketing validation and captures, and is
   newer than live. Otherwise it records why it skipped: CI failed, no
   website validation for the head, or already live. A head without website
   validation waits for the next website-relevant merge, which releases
   everything before it.
   Whichever commit's CI completed, the train considers main's head. Its
   same-source CI is the merge queue run that tested the exact commit main
   received (`gh-readonly-queue/main/pr-<n>-<base>`), or main's own push run
   for a commit that reached main without the queue. A later merge cancels
   main's push run of a commit (`ci.yml` concurrency) but never its queue run,
   so a busy merge day still releases; plan, preview and promotion all read
   the same completed run. The hourly schedule is only a fallback: GitHub may
   delay or drop scheduled runs.
2. **Preview.** It dispatches `Next Website Preview`, follows that exact run,
   and publishes the preview channel URL.
3. **Approve.** A job in the protected `prod` environment, whose required
   reviewer approves in GitHub with the preview URL shown on the deployment.
   The job holds no token and uses none of the environment's credentials.
4. **Promote.** It dispatches `Next Website Promotion` with the approved
   preview run and waits for it.

Trains queue (`cancel-in-progress: false`), so a newer merge never resets an
approval; the newest pending train waits behind it. After the live checks pass,
promotion moves the `deployed/prod-website` tag forward to the released commit
(never backwards), so "what is live" has the same answer as the backend's
`deployed/<environment>` tags. Before the first tagged release, the live
runtime's `X-Catch-Release` header is the live commit. Both workflows can still
be dispatched by hand for recovery, with the same checks.

### Public contact configuration

The Next server reads only `config/publicContact` for `/help/`, `/privacy/`, and
`/terms/`. The exact document shape is `{schemaVersion: 1, revision: positive
integer, supportEmail: lowercase email}` with no additional fields. The server
projects only `supportEmail` into rendered public pages, replacing the canonical
address in source-controlled legal prose and using the same value for both
mailto links. Legal wording, operator name, postal address and policy dates
remain in source control. Other public routes make no contact-config read. The
legacy Vite artifact uses the source-controlled Gmail fallback.

The existing `github-actions-web-reader` runtime identity is checked by the
website preview workflow for its sole `roles/datastore.viewer` project role and
no user-managed keys. Client Firestore rules deny reads and writes for this
document through `match /config/{docId}`; only `config/cities` is client-readable.
The server uses application default credentials with that identity and never
ships them to the browser. Firestore operator writes require separate IAM write
authority. Do not grant the website identity a writer role or add a client rule.

The route is forced dynamic. Each request makes one bounded Firestore document
read, shared only within that React render; no process-wide last-good cache is
kept. A new valid revision appears on the next server request without a rebuild.
Missing, malformed, timed-out or unavailable config renders the source-controlled
`suvrat.garg@gmail.com` fallback on the same request. It does not expose raw
document fields or a private error. Updating this document does not release a
new policy text or a backend deployment.

Use `node --experimental-strip-types website/scripts/next/publicContactOperator.mjs
--env dev --email suvrat.garg@gmail.com --expect-revision absent` to inspect the
DEV plan, then rerun with `--apply` using an authorized Firestore writer after
DEV tests. The command reads and writes only that one document; it uses a
transaction and refuses a changed revision or malformed existing document.
Record the previous revision/email from the dry-run output. After exact source
CI, accepted website release and a separate production plan, use `--env prod`
with `--allow-prod` for the intended production write. To roll back a contact
change, dry-run and apply the previous address with `--expect-revision` set to
the current revision; rollback creates the next revision, preserving a monotonic
sequence. Keep the prior output with the release receipt and verify visible
text and both mailto links on all three routes after either operation. Never
edit another config document or rely on a stale revision.

## Form embeds and proposed custom-host activation

The public form share asset keeps `/f/:publicFormId/` as the canonical Catch URL.
Its iframe installer is an external script at `/form-embed-resize.js`; a parent
site must allow the Catch iframe in `frame-src` and that script in `script-src`.
The installer accepts only a dimension message with a matching Catch origin,
exact iframe `contentWindow`, frame identifier and bounded height. The child
sends only that message to the origin derived from its browser referrer. A
direct Catch link remains available if the site blocks scripts or if embedding
is unsupported. Site-specific CSP, keyboard, mobile scroll, checkout popups,
and browser storage need real browser validation before a client page goes live.

`organizerFormDomainRegistry.ts` is the server-side ownership and
routing policy for a future Catch-served customer subdomain. It stores one
exact hostname per record, binds it to a published organizer form, issues a
fresh TXT challenge for every reservation, requires a matching CNAME and
current DNS probe, and requires trusted certificate readiness before activation.
An unverified reservation expires after 48 hours; reclaim rotates both the
challenge and generation, while verified and active bindings do not expire
into another organizer's control. Reservations are limited per organizer and
per caller.
Resolution also rechecks form ownership and publication. Revocation stops
resolution; reassignment starts with a rotated challenge and generation.
The public `/api/form-domain` endpoint resolves only active, still-owned
bindings, and the React host gate shows only the bound form. Unknown or
revoked hosts cannot render other marketing or form routes. Manager callables
use Auth, App Check and per-user limits for reservation, verification and
revocation. `FORM_DOMAIN_CNAME_TARGET` is deployment-owned and defaults to an
unusable placeholder. Only the trusted hosting operator can mark certificate
readiness and activate a verified record. No custom hostname is enabled by
these source changes alone: DNS/TLS provisioning, the exact Firebase Hosting
custom-domain binding, Auth/App Check allowed-domain setup, upload CORS and
payment return origins require operator configuration and live validation.
The canonical Firebase Hosting bypass is limited to configured Catch project
site names and their preview channels. A client-owned `/apply` page can instead embed the Catch
iframe without changing the form origin. Serving `/apply` directly on an
existing client origin requires that site's supported proxy or native routing;
DNS alone cannot select a URL path.

## Cross-Surface Feature Identity

`design/features/feature_coverage.json` is the exhaustive migration boundary
across the Flutter screen registry, marketing route registry, and route-kind
entries in the admin component registry. It can assign one semantic feature id
to multiple runtime projections when the user outcome is genuinely shared—for
example organizer discovery or organizer detail. It does not make Flutter and
React share a UI runtime: each projection keeps its own screen/route authority,
components, action symbols, evidence, and implementation tests.

`feature.explore` is the first compiled cross-runtime contract: its consumer
projection binds `screen.explore.discovery`, while its marketing projection
binds the `organizer_search` route and the URL-owned
`useOrganizerDirectoryController`. The projections share feature identity and
product intent, not UI code or state vocabulary.

The marketing migration now compiles every stateful public route. Marketing
Home and Host Acquisition remain website-only identities because conversion
and acquisition are different user goals from consumer or Host app operation.
Organizer Claim owns both `/claim/` and the dynamic lookup projection because
they use the same controller and outcome but retain different exact route-state
inventories. The legacy organizer listing remains grouped under canonical
Organizer Detail because it adds static canonical/noindex behavior, not another
interactive workflow. Static legal/support and 404 routes remain explicit
exclusions rather than synthetic zero-action product features.

The Admin migration compiles all 15 registered route authorities across 13
feature identities. Access Review, Role Management, Cross Paths Showcase,
Data Quality, Event Publishing, Finance Operations, Growth KPI, Marketing
Operations, Organizer
Publishing, Safety Triage, and User Analytics each use one route projection.
Intake and Overview each use two because Organizer Intake and the live Overview
controller wrapper own independently reviewable states and actions. No Admin
authority remains planned or grouped.

Marketing Home and Host Acquisition now share the versioned
`contracts/http/join_waitlist_{request,response}.schema.json` boundary with the
Function. The schema generator emits website and Functions types plus runtime
schema projections; browser responses and Functions requests/responses are
validated, including the legacy `runner` role compatibility case. Pending
request snapshots remain a separate, closed concern for Marketing: waitlist,
Host application, and Claim use the frozen-snapshot policy from
`ARCH-PENDING-SNAPSHOT-001`, including request-defining controls, steps, auth,
sibling forms, shared route links, and browser exit.

Admin applies a whole-console frozen-snapshot policy to operator writes and
submitted analytics queries. `AdminPendingOperationProvider` grants one
synchronous exclusive lease across all controllers; while held, the complete
workspace, Admin navigation, shared links, and browser unload are blocked.
Controllers capture their request payload before dispatch and release the lease
in `finally`, so visible inputs cannot drift from the audited request and peer
operations cannot overlap. The compiled Admin action matrices disable every
surface action in those pending states. This deliberately trades small amounts
of operator throughput for deterministic receipts and unambiguous recovery.

Run `node tool/design/check_feature_coverage.mjs --check` after adding or
removing any registered product surface. A planned decision is migration debt,
not completed contract coverage; a grouped decision is a secondary route
projection, not a shortcut for combining unrelated workflows.

## Organizer Entity Boundary

Both React surfaces use organizer nomenclature and canonical organizer
callables. The marketing website claims, reviews, analytics, generated listing
records, and public routes use `organizerId` and `/organizers/...`. The admin
Organizers workspace invokes `adminGetOrganizerDetails`,
`adminListOrganizerDetails`, and `adminUpdateOrganizerDetails` and presents
`organizers/{id}` as the source collection.

Internal `AdminClub*` adapter types may remain during the released-client
window, but they are compatibility types only. React code must not add a new
`clubs/{id}` authority, club-named callable, or product-facing generic club
label. Retirement follows `docs/migrations/clubs_to_organizers.md`.

The organizer detail editor preserves the same boundary in operator input.
Closed-set organizer, visibility, publication, provenance, verification, and
launch-market values use governed selects with reader-facing labels. A launch
market is one selection; its market ID, city, region, country, and public-page
city slug are derived projections rather than independently editable text.
Publish validation exposes every blocking field with a focus target, counts the
four evidence-checklist tasks separately, and keeps the disabled publication
action paired with a direct route to the remaining work.

## Public Viewer And Listing Authority Matrix

`design/public_surface_behavior.json` is the executable decision table for
public discovery, organizer detail, event detail, and the related route/action
boundaries in the Flutter app and marketing website. Its schema is
`design/public_surface_behavior.schema.json`. The matrix records deliberate
configurations rather than generating a meaningless full Cartesian product;
every declared dimension value must either appear in a configuration or be
listed under that surface's `excludedDecisionValues` with a rationale.

The decision inputs are independent unless the matrix says otherwise:

| Variable group | Why it changes behavior |
|---|---|
| Viewer lifecycle | Auth may still be resolving, the viewer may be a guest, or a signed-in viewer may have an incomplete, booking-ready, or social-ready profile. Resolving auth never borrows guest actions. |
| Runtime and relationship | Consumer and host apps have different preview authority; visitor, member, and host relationships suppress or enable different actions. Relationship reads fail closed while loading or on error. |
| Organizer authority | App visibility, effective lifecycle availability, ownership, claim state, provenance verification, host identity, contact availability, and marketing publication are separate facts. Crawled, claimed, and owner-verified are not aliases; archived lifecycle state denies native public browsing even when visibility is stale. |
| Event capability | Catch-native versus external supply, lifecycle, viewer-specific availability, location precision, and payment support independently affect navigation and booking. |
| Website capability | Claim submission, canonical public-review target readiness, public-review reads, public-review writes, and their Firebase/App Check runtimes are separate capabilities. A review submission is moderated and never implies immediate publication. |

The app matrix also owns every consumer route exactly once. Explore, Explore
Map, public Organizer Detail, public Event Detail, and exact Event Location are
guest-readable. Own-profile, form-review, WhatsApp-permission and event-chat
routes require resolved authentication but remain accessible before profile setup;
their data and mutations retain account, claim and admission checks. Saved Events
and private booking/history routes require a booking-ready profile; social routes
and social actions require a social-ready profile; Event Success companion routes
keep their own protected class; and onboarding owns the incomplete-profile resume
path. The guest shell therefore
shows only Explore navigation, but private deep links are still classified and
guarded instead of relying on a hidden tab.

The marketing website never infers capability from a badge or from login
alone. Generated projections carry canonical authority plus independent claim,
review-target, review-read, and review-write capabilities. Unpublished and
claim-suppressed listings are absent from public outputs even if stale data says
`published`; missing target, capability, or runtime evidence renders a truthful
disabled/absent action. `WEB-ORGANIZER-CLAIM-TARGET-001` tracks the remaining
producer cutover needed before a generated listing can safely enable a
canonical claim target; legacy `clubs/{id}` receipts do not enable claims.
`WEB-ORGANIZER-REVIEW-TARGET-001` tracks verified `organizers/{id}` or
compatibility `clubs/{id}` target readiness before public review reads or
writes can be enabled. The checked-in sync preview is advisory only: even an
`in_sync` preview action cannot enable claim or review UI. Only a validated,
read-only Firestore receipt bound to the current target plan can do that. The
review callables evaluate both canonical and compatibility documents and accept
the first eligible public target, so an ineligible canonical shadow cannot mask
an eligible compatibility listing.

Run the full non-vacuous gate with:

```sh
node tool/run.mjs check design:public-surface-behavior
```

The gate validates source enums, route ownership, tuple uniqueness, explicit
exclusions, enabled-action witnesses, verified status, and exact proof-harness
coverage. `test/design/public_surface_behavior_test.dart` executes every app
row against production decision helpers, and
`website/src/features/organizers/publicSurfaceBehavior.test.ts` executes every
website row against the generated-listing policy and the same claim/review
presentation adapters consumed by the rendered sections. The current contract
contains 123 configurations across 16 surfaces, including source-aware
read-only website event detail. Adding a configuration without both
implementation and proof fails strict mode.

## Public Data Layer

The public website reads Firestore only on the server, through these layers:

| Layer | Owns | Location |
|---|---|---|
| Reader | The read-only Firestore surface, `PublicReader`. `firebase-admin`'s Firestore satisfies it; tests pass an in-memory reader. | `website/src/server/repositories/publicReader.ts` |
| Repositories | One module per entity: bounded queries, fail-closed bounds, projection to the public DTO | `website/src/server/repositories/*Repository.ts` |
| Assemblers | One function per route shape, composing repositories into a `PublicCatalog` | `website/src/server/publicCatalog.ts` |
| Route layer | Choosing the assembler for a path, metadata, status codes and redirects | `website/src/server/publicRoute.ts`, `website/proxy.ts` |
| Browser | Rendering the server's catalog; client controllers own interaction only | `website/src/app/next`, `website/src/features` |

- Repositories are the only code that names a collection or a field. Every
  query is bounded, and crossing a bound throws
  `PUBLIC_CATALOG_READ_BOUND_EXCEEDED` instead of truncating.
- Repositories return projected public DTOs (`projectPublicOrganizer`,
  `projectLivePublicCatchEvent`, `publicExternalEvent`, `projectPublicReview`).
  Raw documents never leave a repository.
- A new public query uses equality filters only, or an index already deployed
  to production. Equality-only filters need no composite index.
- A per-route assembler returns the same listing and event record the full
  catalog would. `website/src/server/publicCatalog.test.ts` enforces that, and
  that detail routes never read a whole events collection.

| Route | Assembler | Reads |
|---|---|---|
| `/`, `/explore/`, `/organizers/`, `/claim/`, sitemap | `assemblePublicCatalog` | Published organizers, Catch events and external events, at most 400 each |
| `/organizers/<slug>/` and legacy aliases | `assembleOrganizerDetailCatalog` | One to three path reads, that organizer's events (at most 200 per kind, Catch events also by legacy `clubId`), three trust reads for recommendations, bounded reviews |
| `/events/<id>/` | `assembleEventDetailCatalog` | Two document gets, the organizer plus a path-uniqueness read, bounded reviews |

`assembleRouteCatalog` chooses the assembler from the path, and
`resolvePublicRoute` is its only caller, so the proxy's status and redirect
decision, the rendered page and the `/api/public-catalog` refresh all use the
same reads. A detail path that names nothing published, or an event id that
is not a valid document id, reads nothing further and returns 404.

`proxy.ts` and the page each resolve the route once; React `cache` does not
deduplicate between them. An organizer page view therefore makes two sets of
bounded queries scoped to that organizer (eight each for the acceptance
fixture), and a discovery page view still makes two full catalog reads. Because detail routes no longer read whole
collections, a crossed catalog bound returns 503 only on `/`, `/explore/`,
`/organizers/`, `/claim/` and the sitemap; organizer and event pages keep
serving. `website/scripts/next/lifecycleAcceptance.mjs` and
`failureAcceptance.mjs` exercise both behaviors against the isolated emulator.

Freshness is unchanged by this layer: there is no cross-request or process
cache. Unpublishing takes effect on the next server request, and open tabs
refresh `/api/public-catalog` every 25 seconds and withhold content once a
read is 30 seconds old (`website/scripts/next/lifecycleAcceptance.mjs`).
Caching is a separate decision with two forms: accept a bounded staleness
window for withdrawals, or invalidate from the backend when a listing or event
is published or withdrawn. The second needs backend Functions delivery.
Neither is adopted.

Browser code reaches callables through `website/src/firebase.ts`, one module
of about 84 exports spanning forms, the event runtime, claims, reviews,
messaging preferences and checkout. Splitting it into one service module per
backend domain, with `firebase.ts` reduced to runtime bootstrap, needs a
change to `tool/web/check_website_import_boundaries.mjs`, which today allows
only `firebase.ts` to import the generated callable types.

## Current Stack

- Root `package.json` exposes npm workspace scripts for the web-native apps.
- `packages/web-config/` contains shared Vite, TypeScript, and token/base CSS
  plumbing for React web surfaces.
- `packages/web-ui/` is the pure presentational React workspace. It has no
  Firebase, router, query, or feature dependencies. Today both apps consume its
  structural `*Control` components through surface-owned adapters that keep
  class names and visual variants local.
- **Ratified target (2026-10-17, UI blueprint D9–D10).** `@catch/web-ui` ships
  styled `Catch*` components that implement the registry contracts in
  `design/components/catch.components.json`, under the same names and prop
  names as Flutter (`CatchButton`, `variant`, `onPressed`). Surface
  differences such as admin density become a prop or a scope, never a second
  component. Surface adapters such as `AdminButton`, `StatusChip`, and
  `AdminTextField` are deleted as each surface adopts the shared component, and
  `*Control` exports become package internals. Blueprint Phase 7 owns the
  migration; until it lands, the adapter split described below remains the
  running architecture. Naming is binding in the Cross-Framework Names
  subsection of `docs/app_architecture.md`, and parity tiers in
  `design/components/README.md`.
- The `web:shared-ui-adoption` gate is the generated React component
  inventory (UI blueprint Phase 7d). A TypeScript reference graph of
  `website/`, `admin/` and `packages/web-ui` follows barrels, dynamic imports
  and private helpers, and maps every exported component to a registry concept
  (`react` record or `componentId` adapter), a T4 owner, or deletion (no
  production consumer). Ownership passes through shared layers: a shared export
  that one feature renders is that feature's, and Phase 7e moves it. A
  shared-layer export that matches a registered contract by name or role noun,
  or renders a `@catch/web-ui` implementation, needs a recorded decision:
  `componentId`, or `comparedWith` with a `comparisonReason`. Exact-name
  exports on both surfaces must name one contract. `--write` saves the
  inventory to ignored `build/react_component_inventory.json`. The gate also
  holds the shared focus contract and package CI wiring.
- The adopted package layer now owns compatible native behavior for buttons,
  checkboxes, text/select/textarea controls, labelled toggle groups, badges,
  empty states, and named keyboard-scrollable data tables. Website/admin
  adapters still own density, visual classes, domain tones, option mapping, and
  feature composition. `ToggleGroupControl`/`ToggleButtonControl` remain the
  reference implementation for this split.
- Cross-stack labels deliberately separate hierarchy from status:
  `catch.typography` binds `CatchKickerText`, React `UiLabel`, website
  `UiLabel`, and admin `AdminEyebrow`; `catch.badge` binds `CatchBadge`, React
  `BadgeControl`, and the website `StatusBadge` and admin `StatusChip`
  adapters. The lexicon test rejects future semantic collapse.
- `website/` is a Vite + React + TypeScript marketing app.
- `website/src/app/App.tsx` uses React Router for the client route shell and
  `website/src/app/routeRegistry.ts` for runtime route patterns; the route
  contract and postbuild output remain the public SEO source of truth.
- `website/src/content/meta.json` is the validated static metadata source read
  by both `website/src/app/pageMeta.ts` and `website/scripts/postbuild.mjs`.
- `website/src/shared/ui/**`, `website/src/shared/site/**`, and
  `admin/src/shared/ui/**` are the React shared primitive owners. Feature,
  app, and story code must compose these primitives rather than hand-rolling
  native interactive controls.
- `design/components/catch.components.json` is the one file that assigns
  component identity. Each contract's `react` record names its `@catch/web-ui`
  symbol, file, `api` (`headless-control` until Phase 7e ships the styled
  component) and Storybook coverage, and its T1/T2 props carry `tsType` beside
  `dartType`. `design/website/components.json` and `design/admin/components.json`
  own routes, sections and surface-specific components; an adapter of a shared
  contract points at it with `componentId`. Admin components that one feature
  or only the app shell renders are `feature-component` entries owned by that
  feature. Imports use `@catch/web-ui`; deep package imports are blocked by
  both app boundary gates.
- `tool/web/check_react_ui_primitives.mjs` enforces the first React primitive
  guard for `website/`, `admin/`, and `webui`.
- `tool/web/check_storybook_visuals.mjs` resolves registry entries marked
  `ready` against built Storybook indexes and compares fixed desktop/mobile
  captures under `design/visual_baselines/<surface>/<platform>/`. Repeatable
  `--component <registry-id>` filters isolate task-owned checks and baseline
  updates while another surface refactor is dirty. Platform ownership is part
  of the contract because `system-ui` is intentionally stack-native: Darwin
  and Linux captures never compare against one another. React CI pins the
  blocking Linux capture to Ubuntu 24.04 and uploads actual plus diff images on
  failure; manual baseline-capture runs upload review artifacts before commit.
- `web:admin-bundle-budget` reads the built Vite manifest and ratchets both the
  admin entry chunk and largest async chunk. Query/API controllers belong
  behind lazy route wrappers; importing one into `admin/src/app/App.tsx` is a
  performance-boundary regression even when its view remains lazy.
- `tool/web/react_controller_test_targets.json` classifies every feature
  controller/mutation hook as `required`, `planned`, or an explained `exempt`.
  `web:react-controller-test-targets` rejects unclassified hooks and required
  targets whose named behavior suite is missing, while aggregate coverage stays
  informational rather than becoming a brittle percentage gate.
- Admin Storybook uses named feature chunks plus a separate generated-intake
  data chunk. `web:admin-storybook-bundle-budget` ratchets Catch-authored chunks
  independently of Storybook, axe, and other framework/vendor runtime; route
  coverage remains registry-complete rather than being removed to hit a budget.
- Admin feature route/workspace entries stay below 900 lines and feature-private
  panel modules below 1,200 lines through `web:admin-feature-ui-size`. Large
  workflows use lower-case module APIs so route/workspace exports remain the
  only public feature component boundary enforced by `web:admin-feature-exports`.
- `website/public/` contains Vite public assets, including `.well-known/`, fonts,
  app-sourced marketing screenshots, and the favicon.
- `website/dist/` is the deployable marketing build.
- `website/scripts/postbuild.mjs` writes route-specific static HTML after the
  Vite build for `/host/`, `/claim/`, `/organizers/`, canonical organizer
  listings, legacy organizer routes, `robots.txt`, and `sitemap.xml`.
- `admin/` remains the separate Vite + React + TypeScript admin app.
- `apps/consumer/build/web` is the Flutter web deploy artifact for `app.catchdates.com`; the `app` target's predeploy builds it with `./tool/flutter_with_env.sh prod --role consumer build web --release`.

Design-token CSS and web font copies are generated into
`packages/web-config/generated/` by `dart run tool/design_tokens.dart`, then
bundled by Vite through `packages/web-config/styles/catch-web.css`.

## React Dependency Topology

`tool/web/react_dependency_graph.mjs` is the deterministic import-topology
owner for `website/src`, `admin/src`, and `packages/web-ui/src`. It derives the
graph live from TypeScript ASTs; no generated graph view is committed. The graph
resolves relative imports, TypeScript aliases, workspace exports, index modules,
dynamic imports, re-exports, and type-only edges. Use deterministic `--json` or
`--summary` output as temporary local or CI evidence when review needs the
topology rather than only the blocking result.

The blocking health contract is deliberately narrow and non-vacuous:

- every repo-local import must resolve;
- website and admin must not import each other directly; shared behavior routes
  through a governed package;
- runtime dependencies must be acyclic, including self-imports and re-exports;
- every configured source root and TypeScript config must exist; and
- the seeded test suite must prove unresolved imports, direct cross-surface
  edges, runtime cycles, missing inputs, and the live CLI contract fail closed.

Type-only cycles and non-literal dynamic imports remain visible in the live
JSON and summary without blocking the check. Repair runtime cycles by removing
unused imports, importing existing leaf owners directly, or extracting a small
shared leaf while preserving public exports. Do not add a cycle allowlist.
The read-only `--json` and `--summary` modes still emit evidence for unhealthy
graphs; combine either with `--check` when a failing exit status is required. Run:

```sh
node tool/web/react_dependency_graph.mjs --check
node tool/web/react_dependency_graph.mjs --summary
node tool/web/react_dependency_graph.mjs --json
node --test tool/web/react_dependency_graph.test.mjs
```

## React Surface Governance

Treat the marketing website and admin console as sibling React products, not as
isolated one-off apps. Cross-surface React architecture work should route
through `docs/agent_skills/catch-react-surface-refactor.md`.

- Use React Router for URL routing and URL-owned state. Route shells should own
  routing, path/search-param extraction, guards, metadata, lifecycle, and
  providers; feature pages should own composition; controllers may consume
  explicit route-state objects, but should not parse `window.location` or call
  router hooks directly.
- Use TanStack Query for true remote reads and mutations. Generated/static data
  stays as typed imports until there is a real remote boundary.
- The library draws; features arrange and bind (D18,
  `docs/plans/ui_system_blueprint_and_conformance_audit.md`). Anything that
  decides how something looks belongs in `@catch/web-ui`, even when one
  feature uses it. Feature and app-shell code arranges library components
  with `CatchGap`, `CatchInset`, `CatchPageBody` and `CatchSectionList`, and
  passes data and callbacks to their props. A one-off is a T4 component under
  `packages/web-ui/src/components/`, registered in the registry of the one
  surface that renders it. It never stays private inside a feature.
- Keep shared UI primitives centralized. Feature, app, and Storybook code must
  not render raw `<button>`, `<a>`, `<input>`, `<select>`, or `<textarea>`
  controls. Add missing neutral controls to the owning shared primitive module
  instead of styling them per screen.
- Shared keyboard focus behavior starts in
  `packages/web-config/styles/catch-web.css`. Surface CSS may style a composite
  wrapper with `:focus-within`, but it must not remove a native outline without
  an equally visible token-backed replacement.
- Keep governed component families centralized. Feature, app, and Storybook code
  must not pass `className` directly outside shared primitive owner files. Run
  `node tool/run.mjs check web:react-classname-boundaries` before handoff. The
  scanner-owned family registry is `tool/web/check_react_component_governance.mjs`;
  its current family view is printed on demand with `--families-json`. Run
  `node tool/run.mjs check web:react-component-governance` before handoff. This
  scanner is a known-family blocklist, so reviewers must add new repeated shell
  families to the scanner when drift repeats instead of relying on prose.
  Marketing website feature components exported from `website/src/features/**/*.tsx`
  must also be declared in `design/website/components.json` or made private; run
  `node tool/run.mjs check marketing:website-components` when touching website
  route, section, flow, or supporting-component exports.
  Admin feature UI may export route/workspace entry components, but panels,
  cards, lists, badges, and sections that draw must live in
  `packages/web-ui/src/components/` (D18; entries still under
  `admin/src/shared/ui` await that move), and a private feature component may
  only arrange and bind. Run `node tool/run.mjs check web:admin-feature-exports`
  when touching admin feature UI exports. Admin route/workspace entries, shared
  admin primitives, and admin feedback providers must also be declared in
  `design/admin/components.json`; run
  `node tool/run.mjs check web:admin-components` when touching those exports.
  Admin form primitives adopted into the shared Flutter/React interaction
  vocabulary declare an `interactionContract` mode in that registry. Adopted
  form families are listed in `interactionContractAdoptions`; the React
  component-governance gate verifies that every listed component implements a
  valid `field_row` mode and is actually used by the declared family source.
  Organizer Publishing is the reference adoption. React keeps native controls
  and styling; only the interaction semantics are shared.
  Admin registry entries marked `preview.status: "ready"` must point at
  Storybook exports under `admin/src/stories`; run
  `node tool/run.mjs check web:admin-storybook` whenever admin preview coverage
  changes.
  Cross-surface extractions and explicit keep decisions are checked separately
  by `node tool/run.mjs check web:shared-ui-adoption`; adding a new shared
  package export or same-named website/admin primitive without a tracker entry
  fails that gate. Marking a candidate adopted also requires both surface
  adapters to import and use a classified package symbol.

  The same adoption check enforces `tool/web/react_consolidation_baseline.json`:
  missing styled T1/priority T2 contracts, headless controls, catalog-parity
  gaps, adapters and single-owner shared components cannot gain debt identities.
  Page CSS outside the two website foundation layers has a separate newline
  ceiling for each file, so another file or surface cannot spend its allowance.
  Fixed identities and shorter files must leave the baseline in the same slice.
  Regenerate with `node tool/web/check_shared_web_ui_adoption.mjs
  --update-consolidation-baseline`; the generator rejects growth against both
  the local baseline and fetched-main merge base. `--write` still writes only
  the ignored inventory. Bare `--json` is the scorecard's read-only inventory
  feed; `--check --json` also enforces the ratchet.

## Admin Console Route and Information Architecture

The admin shell has one product identity, `Catch Admin`, and one plain route
title in the global top bar. Prototype labels such as `sample console`, route
kickers, and decorative subtitles are not production chrome. The production
environment badge is omitted; Development, Local, or Staging is shown only when
the non-production context changes operator risk. Account identity, roles,
local-data context, and sign-out live in the account disclosure.

Operational directories and record review use URL-owned master-detail routes.
Canonical list/workspace roots are `/overview`, `/safety`, `/access`, `/growth`,
`/organizers`, `/organizers/claims`, `/events`, `/events/readiness`,
`/events/external`, `/users`, `/finance`, `/quality`, `/operations`, and
`/admin-roles`.

Intake owns `/intake/organizers`, `/intake/events`, and `/intake/operations`.
Marketing owns `/marketing` (default Posts), `/marketing/posts`,
`/marketing/new`, `/marketing/events`, `/marketing/media`,
`/marketing/activity`, and `/marketing/diagnostics`; draft composition uses
`/marketing/drafts/{draftId}/{source|copy|compliance|export}`.

URL-owned detail families are `/safety/{targetPath}`, `/access/{uid}`,
`/organizers/{clubId}`, `/organizers/claims/{requestId}`, `/events/{eventId}`,
`/events/readiness/{actionId}`, `/events/external/{candidateId}`,
`/growth/signals/{signalId}`, `/finance/issues/{issueId}`,
`/quality/signals/{signalId}`, and `/admin-roles/{uid}`. A missing direct record
stays unavailable; controllers must never auto-select another row to make a
deep link appear valid.

Route shells own path and search-param parsing. Feature controllers accept
explicit selected ids and navigation callbacks, while repositories keep remote
sources independent where partial results are useful. Overview, Growth,
Finance, and Data quality therefore retain successful source data when another
query fails and expose retry at the smallest truthful source boundary.

Loaded lists must disclose their scope. A returned preview, local search result,
or 50-row assignment register is not a complete directory. Dates and ranges
apply only to endpoints that accept them. Evidence labels distinguish sourced,
inferred, unknown, generated-at, loaded-at, and session-only state. Diagnostics,
command material, unsupported actions, and source paths use secondary disclosure
instead of occupying the primary task flow.

Operator task surfaces describe outcomes, editable scope, blockers, and the
next available action. They do not render Firestore paths, callable names,
projection implementation, route-guard mechanics, or generic "publishing
contract" panels. When a derived or read-only value needs explanation, use a
short reader-facing disclosure beside that value; exact implementation
contracts stay in this document, `docs/data_contracts.md`, and
`docs/backend_operation_catalog.md`. Explicit Diagnostics workspaces may expose
technical evidence only when that evidence is necessary to troubleshoot the
workflow.

Mutation interfaces may reuse the shared sticky decision footer only when the
owning callable has validation, authorization, pending, success, and receipt
behavior. The UI must not imply direct social publishing, money movement,
canonical intake promotion, rollback, scheduler execution history, or broad
member/Auth search without dedicated contracts.

## Admin Intake Batch Workbench

All three Intake routes use one full-height batch-review primitive. The queue is
the primary scroll region; its compact table, stable snapshot order,
multi-selection, partial-safe bulk actions, keyboard shortcuts, and
resolution-first inspector are shared. The inspector is closed by default and
uses consumer-supplied ordered sections, so a workflow does not render empty
policy or diagnostics filler. Loading, retryable error, filter-empty,
stage-empty, and unavailable projection states remain distinct. The route shell,
workspace frame, and pending-operation fieldset form one `min-height: 0` flex
chain, so the table consumes available viewport height without a component-owned
height cap or viewport arithmetic.

The first command row contains the workbench title, count-free segmented stage
control, four operator metrics, and inspector toggle. The fixed-height second
row swaps domain filters for explicit bulk actions when selection begins,
keeping the table stationary. Every partially eligible action states the
eligible fraction; every disabled action renders its gate as adjacent text.
Keyboard and mouse controls are equivalent and named, while the ten-second undo
receipt remains visible without changing table order.

Organizer Intake uses the standard Name, kind, market, source, top-blocker,
age, and status columns. Event Intake supplies stage-specific columns:
Incoming shows source provenance and risk, while candidate stages show the
Operations expiry, attributed organizer, venue, source, top blocker, and
status. Candidate stages are mutually exclusive. Passed events are retained in
a separate filter, fail `event_has_not_passed`, and never compete with active
upcoming review work. Upcoming candidates sort by their projected event start
time; the distinct Operations-projected expiry remains visible provenance and
is never replaced by a client-invented TTL.

Event editing occurs inside the inspector. Review payloads contain changed
fields only as `{before, after}` pairs; the server overlays only each `after`
value while preserving the immutable target id and continues to read older
flat decisions for compatibility. An attributed organizer's Firestore
`appVisibility` is projected as a fail-closed event ceiling. Orphan events link
to the organizer discovery lead that Supply Intake created from the same
evidence. Duplicate resolution keeps the selected candidate and records one
rejection decision per duplicate, reporting partial failures.

## Admin Intake Operations Projection

`/intake/operations` is the third Intake workspace, labelled Automation. It is
a read-only projection of canonical `operationRuns` and `operationWorkItems`;
it does not derive execution state from the older Event or Organizer Intake tab
filters. The UI displays the same exclusive Incoming, Verify, Resolve, and
Ready stage values persisted by the operations worker, with task flags and
blockers rendered as overlapping review concerns.

The feature follows the standard repository/controller/workspace split under
`admin/src/features/intake/operations/`. Live data crosses only
`adminListIntakeOperations`; sample mode uses a contract-shaped fixture. The
browser offers refresh, search, stage/entity filters, and hash-bound evidence
inspection, but intentionally exposes no Run, model, deploy-rule, or Publish
action. Those capabilities require separate trusted-worker and policy
boundaries rather than a browser toggle.

The callable orders runs by persisted `updatedAt` plus document id and reads
whole-run stage, work-item, and human-review aggregates from the imported run
metadata and fails closed when they are absent or inconsistent. The controller
pins that run, loads one ordinary page, and drains only the server-filtered
human-exception cursor before rendering. Every counted active exception can be
opened immediately; ordinary items advance through **Load 200 more**, preserve
already-loaded exceptions, and cannot overwrite a newer refresh. Published and
terminal history is excluded from the active stage rail. Run pagination is
separate: `loadedRunCount`, `nextRunCursor`, `nextWorkItemCursor`, and the
workspace copy describe loaded pages rather than a false persisted total. The
query disables automatic retry so the 10,000-item/200-page/120-per-minute
capacity contract remains bounded. The separate apply-guarded importer is a
trusted operator, not a browser route or callable.

An exception is resolved in the owning Event or Organizer Intake surface. The
Automation workspace does not write an `OperationDecision` or resume the same
run. The owning review decision stays durable in its audited Firestore
collection; no repository artifact regeneration is part of the live workflow.
Any later Supply Intake reconciliation must read that persisted decision
explicitly and create a separate immutable child run for expiry and
stale-evidence changes rather than editing an already imported run.

## Admin Live Data Source Contract

`contracts/admin/admin_live_data_sources.json` inventories every Admin route,
including the three Intake workspaces, and names its authenticated live reads
and mutations. `web:admin-live-data-sources` reconciles that inventory with the
navigation, Admin API boundary, and Functions exports. It also rejects
generated operational JSON imports from production feature code; such imports
are allowed only in explicitly named sample or Storybook modules. Its
`--verify-live` mode probes every declared callable in the selected Firebase
environment and fails when a Hosting build would depend on an absent or
unreachable backend. The live Admin bundle gate also rejects generated Event
Intake, Organizer Intake, Marketing Ops, and external-event plan fixtures, so
those artifacts cannot ship as dormant production assets.

Organizer Intake live mode reads the latest completed organizer-only Supply
Intake run for each launch market through `adminListIntakeOperations`. Its
search candidates and bounded publication-review packets therefore come from
`operationRuns` and `operationWorkItems`. The packet shape is validated at the
workflow, operations-schema, and Admin loader boundaries. Live counters are
derived only when packet records exist; otherwise Verify, Resolve, and Ready
show the run-bound unavailable state rather than a fabricated zero. Sample and
Storybook views use typed synthetic operation records; no operational JSON
snapshot is retained or packaged. The browser does not upload a generated file
or reconstruct a queue from repository state.

The Admin loader has one bounded rolling-data compatibility rule for immutable
publication packets written before publish and index controls were separated.
It accepts only the complete prior packet shape, derives publish and index from
the prior reviewed decision mapping, preserves the packet's app visibility,
and verifies that the derived controls agree with the persisted public-state
summary. Partially upgraded, contradictory, or unknown shapes fail closed.
This reader boundary does not relax the current operations schema or permit an
old packet to be mutated in place; producers must create a new run for a
changed projection.

For a reviewed candidate with no existing-entity match, the detail pane exposes
a bounded organizer name, independent public slug, type, and review-note form.
The source-evidence section reports how many candidate fields have artifact
lineage. `adminCreateOrganizerDraftFromCandidate` allocates the opaque document
id and creates only the fail-closed canonical draft; unverified member-facing
description, locality, and listing descriptor remain blank. The Admin route
then opens `/organizers/{organizerId}` for the separately governed publishing
workflow, while the website URL comes from `publicPage.canonicalPath`. Intake
reloads the callable-projected curation receipt and keeps that candidate in
Ready. The candidate queue and detail pane scroll independently inside a
viewport-bounded workbench so a 25-candidate market does not stretch the entire
Admin page.

## Admin Agent Activity Monitor

`/operations` is the read-only employee monitor for catalogued CLI/agent
actions. `admin/src/features/operations/` uses the standard
repository/controller/workspace split and reads only the bounded
`adminListActionExecutions` callable. It filters the loaded page by action,
status, actor, target, or error text and exposes explicit pagination. The table
shows hash-bound metadata, including transport-ambiguous actions that need
reconciliation, never request or response bodies. Manual actions
remain in their owning routes; this route does not reproduce their mutation
forms or authority decisions.

`contracts/admin/admin_action_catalog.json` binds every admin API callable to a
stable CLI action id, request schema, roles, workflow, GUI path, and
confirmation policy. `tool/admin/generate_admin_action_catalog.mjs` produces
the typed browser and Functions views; the operations parity checker rejects
drift among the catalog, admin API, strict request validators, Functions
exports, and workflow membership.

## Admin Callable Validation Boundary

`admin/src/shared/api/adminApi.ts` owns the single live Firebase callable
boundary for the admin React surface. Its local `httpsCallable` wrapper always
validates request payloads before network invocation and validates response
payloads in development or when `VITE_ADMIN_VALIDATE_RESPONSES=true`.
The wrapper loads the generated validator module on the first live callable
invocation. Sample views and Storybook feature imports do not eagerly initialize
the schema registry. Module loading is awaited before request validation and
Firebase invocation; a loading failure rejects the call without sending it.
The module cache shares subsequent loads without bypassing per-request checks.

`admin/scripts/generateCallableValidators.mjs` discovers every callable name in
that API module, compiles the applicable `contracts/callables/**` and
`contracts/callable_responses/**` schemas plus their references, and writes the
committed typed registry under `admin/src/generated/validators/`. Callables
without a dedicated JSON contract receive an explicit top-level object
validator and remain listed separately from strict schema coverage; they must
not disappear from the registry or be described as strictly validated.

Each Admin feature surface binds its callable dependencies through
`bindings.runtimeContracts`. Request and response directions are declared
independently as `strict_schema` or `structural_object`, and the feature
compiler compares those declarations with the generated registry. This rejects
both overclaiming a structural validator as field-level proof and retaining a
stale structural declaration after a strict schema lands.
The highest-risk access decision, role mutation, safety assignment/decision,
marketing draft/decision, and shared overview request/response directions now
use dedicated strict schemas. Other callables remain explicitly structural
where no field-level contract exists, so the registry still reports their
weaker boundary honestly.

Run `node tool/run.mjs check web:admin-callable-validators`. Admin
`pretypecheck` runs the same drift check, so a callable or schema change cannot
ship with stale validators. Validation failures use
`AdminCallableValidationError` and include callable name, direction, and the
first failing JSON instance path.

## Marketing Route Contract

Public website route ownership starts in `design/website/routes.json`. The
contract records each route family, page key, source component, metadata key or
factory, static-output behavior, robots/indexing intent, sitemap inclusion, and
the review states that need visual coverage.

Run the route gate before component-first or visual-review work:

```sh
node tool/run.mjs check marketing:website-routes
```

The checker compares the route contract with `website/src/app/App.tsx`,
`website/src/app/routeRegistry.ts`, `website/src/content/meta.json`,
`website/src/app/pageMeta.ts`, `website/scripts/postbuild.mjs`, generated
organizer listings, and source component paths. It also validates the metadata
content contract and is wired into
`npm --workspace catch-marketing run typecheck` and the marketing GitHub
workflow so public-route changes cannot ship as prose-only decisions.

Component-first review is the next layer, not a replacement for route review.
When the website gets a Storybook/Widgetbook-equivalent workbench, its stories
should attach state coverage to the route ids in `design/website/routes.json`
instead of creating a separate website inventory.

## Firebase Hosting Setup

`firebase.json` declares three Hosting targets:

- `marketing`: builds `website/` and deploys `website/dist`.
- `app`: deploys `apps/consumer/build/web` for the Flutter web app.
- `admin`: builds `admin/` and deploys `admin/dist` with `X-Robots-Tag:
  noindex, nofollow`.

The production `.firebaserc` binds each target to a distinct checked Hosting
site:

- `marketing` -> `catch-dating-app-64e51`
- `app` -> `catchdates-app`
- `admin` -> `catchdates-admin`

The admin build is deployed at `https://catchdates-admin.web.app`. On
2026-07-12, Cloudflare began serving the Firebase-required DNS-only CNAME for
`admin.catchdates.com` plus its ACME TXT proof. Firebase Hosting detected the
records and began ownership/certificate reconciliation. Do not call the custom
domain live until Firebase reports active ownership and certificate state and a
normal HTTPS request succeeds.

Custom-domain ownership remains:

- `catchdates.com` and `www.catchdates.com` to the marketing site.
- `app.catchdates.com` to the app site.
- `admin.catchdates.com` to the admin site.

## Marketing CI/CD

`.github/workflows/marketing-website.yml` is the marketing site's scoped
pipeline:

- pull requests validate generated web tokens, app-derived screenshot assets,
  marketing screenshot design context, the Vite production build, and all
  Storybook stories through a Playwright Chromium axe gate;
- pushes to `main` that touch marketing-site inputs deploy only
  `hosting:marketing` to the production Firebase project;
- the deploy job reads canonical `organizers/{id}` documents from production
  Firestore and materializes the production-only organizer projection in the
  ephemeral runner checkout before Firebase invokes the normal predeploy
  build; pull requests validate the committed build projection without
  treating it as mutable operational state;
- generated public routes are served as static files; only explicit host,
  claim, and API rewrites remain, so unknown paths use `dist/404.html` with an
  actual HTTP 404 instead of the root SPA shell;
- the deploy job probes a unique unknown `catchdates.com` URL and fails unless
  the response status is 404;
- the deploy job also probes every launch-critical route for HTTP 200,
  route-specific canonical metadata, and required public content markers;
- `.github/workflows/website-production-observability.yml` repeats those
  launch-critical probes every 15 minutes and can be dispatched manually;
- deployment uses the checked `prod` Firebase alias plus the repo's existing
  Google Cloud Workload Identity environment variables.

The workflow intentionally does not deploy Cloud Functions. Backend production
changes, including `/api/join-waitlist`, still go through the guarded Firebase
deploy workflow so hosting and backend release risk stay independently
controlled.

## Marketing Website Audit And Remediation

The 2026-06-23 audit covered the React marketing app, public organizer pages,
generated listing pipeline, public callables used by the website, shared web
tooling, and the marketing deploy path. It used three read-only subagent slices:
UI/component architecture, data/contracts/API boundaries, and
delivery/SEO/performance.

Original verification run during the audit. The first command is historical
and its audit writer has been retired; current changes use the focused checks
that follow:

- Historical only: audit-registry refresh (command retired)
- `npm --workspace catch-marketing run build`
- `node --test website/scripts/checkOrganizerBuildOutputs.test.mjs website/scripts/generateOrganizerListings.test.mjs website/scripts/postbuild.test.mjs`
- `node website/scripts/checkOrganizerBuildOutputs.mjs`
- `git diff --check -- website package.json packages/web-config firebase.json .github/workflows/marketing-website.yml contracts/callables/request_club_claim_payload.schema.json contracts/callables/create_public_club_review_payload.schema.json contracts/callables/list_public_club_reviews_payload.schema.json contracts/callables/record_organizer_analytics_event_payload.schema.json contracts/firestore/clubs.schema.json functions/src/clubs/clubClaims.ts functions/src/reviews/mutateReview.ts functions/src/analytics/organizerAnalyticsEvents.ts`

The original marketing build passed. It reported a single JS bundle of 484.71 KB
raw, 139.82 KB gzip, a 92.02 KB CSS bundle, and a 2.1 MB public source map. The
generated organizer output check reported 3 listing routes, 2 legacy routes, and
2 sitemap listing routes.

### Remediation Status 2026-06-25

Current verification:

- `npm --workspace catch-marketing run typecheck`
- `node --test website/scripts/checkOrganizerBuildOutputs.test.mjs website/scripts/postbuild.test.mjs website/scripts/generateOrganizerListings.test.mjs`
- `npm --workspace catch-marketing run build`
- `node website/scripts/checkOrganizerBuildOutputs.mjs`
- `find website/dist/assets -maxdepth 1 -type f -name '*.map' -print`
- `node tool/contracts/generate_schema_contracts.mjs --check`
- `npm --prefix functions run build`
- `node --test functions/lib/clubs/clubClaims.test.js functions/lib/reviews/mutateReview.test.js functions/lib/analytics/organizerAnalyticsEvents.test.js`

Current build output reports `index-BKnP8e8u.js` at 487.92 KB raw / 143.12 KB
gzip and `index-C-RDtpwQ.css` at 92.02 KB raw / 14.41 KB gzip. No public
`.map` artifact is emitted by default. The generated organizer output check
reports 3 listing routes, 2 legacy routes, and 2 sitemap listing routes.

| Original finding | Status | Evidence |
|---|---|---|
| Legacy organizer routes can hydrate from `noindex` to `index`. | Resolved | Route metadata now preserves legacy `noindex`; postbuild and output tests cover listing, legacy, and sitemap outputs. |
| `/claim/` has client-side metadata but no generated static route. | Resolved | `website/dist/claim/index.html` is emitted during postbuild and covered by build-output checks. |
| Public source maps are deployed with full source content. | Resolved | Public sourcemaps are opt-in through `CATCH_WEB_PUBLIC_SOURCEMAPS`; the current build emits no `.map` files. |
| The marketing app is not feature-first yet. | Resolved | `website/src/App.tsx` is a 66-line shell; pages, controllers, selectors, models, and styles live under feature folders. |
| Website types duplicate contract-owned backend schemas. | Resolved | Organizer listings and callable DTOs import generated contract types from `functions/src/shared/generated`. |
| Static website data can drift from Firestore API state. | Resolved | Generated listings include `publicApi`; claim/review/analytics clients disable public APIs when claim-target sync is not verified. |
| Public review and organizer analytics scope checks are too broad. | Resolved | `assertPublicOrganizerPageEligible` gates public reviews and organizer analytics by publish state, robots/index status, canonical path, and club state. |
| Approved cleaned event data is not yet an app event feed. | Closed as boundary | Public event evidence remains separate from app-bookable Catch events. An app feed import remains a separate product/data migration decision, not a marketing-site side effect. |
| The website has repeated hand-rolled primitives. | Resolved | Shared primitives now cover buttons, links, fields, checkbox fields, form status, rails, chips, choice cards, metric cards, and auth rows; feature/site screens have no native form/action controls outside primitives. |
| Controller seams are missing for complex flows. | Resolved | Feature-owned controllers now cover organizer directory, claim flow, listing claims, listing reviews, host application, and waitlist submission. |
| Search and listing selectors need scalable selectors before inventory grows. | Resolved | Organizer filtering, URL state, cached search text, future-event lookup, profile strength, and summary counts live in selectors/controllers. |
| Marketing workflow path filters miss helper scripts used by deploy. | Resolved | `.github/workflows/marketing-website.yml` watches `tool/env/check_web_hosting_env.mjs`, `tool/firebase_with_env.sh`, and `tool/marketing/**`. |
| Generated listing drift is masked by build-time regeneration. | Resolved | CI runs `npm --workspace catch-marketing run check:organizer-listings` before the marketing build. |
| Hosting validation and deployment rebuild different bytes. | Resolved | Main source validation skips the redundant deployable bundle; `_web-hosting-build.yml` builds once and packages one lifecycle-hook-free target, while `_web-hosting-promote.yml` verifies its immutable artifact id, GitHub digest, and exact file inventory before deploying without installing source dependencies or rebuilding Vite. |
| Above-fold media is heavy. | Resolved | The homepage/host hero use responsive JPEG variants under `website/public/assets/marketing/` instead of the original PNG. |
| Direct organizer analytics is not consent-gated. | Resolved | Organizer analytics suppresses session id creation, callable writes, and dataLayer mirrors until analytics consent is accepted; `docs/ads_conversion_spec.md` records the rule. |

The original findings are retained below for traceability. They describe the
June 23 audit baseline, not the current implementation unless reflected in the
remediation table above.

### Original Strengths

- The repo keeps marketing, admin, and Flutter web as separate deployable
  products. This remains the correct boundary.
- `packages/web-config/` already centralizes shared Vite, TypeScript, generated
  token CSS, font assets, and browser baseline styles for React web surfaces.
- `website/scripts/postbuild.mjs` writes route-specific HTML, canonical tags,
  robots metadata, `robots.txt`, and `sitemap.xml`.
- `website/scripts/checkOrganizerBuildOutputs.mjs` validates generated listing
  routes, legacy routes, robots metadata, and sitemap inclusion.
- The backend claim, public review, and organizer analytics callables validate
  generated contract schemas and enforce App Check through
  `functions/src/shared/callableOptions.ts`.
- The host application flow is already progressive-disclosure in UI behavior:
  one active step renders at a time, and submission waits until required steps
  are complete.

### Original P0 Findings

1. Legacy organizer routes can hydrate from `noindex` to `index`.

   `postbuild.mjs` writes legacy listing routes with `noindex, follow`, but the
   client resolves a legacy path back to the listing and reapplies
   `listing.indexing`. Current intake listings have canonical `index, follow`
   and legacy paths, so a crawler or previewer that runs JavaScript can observe
   the legacy page as indexable after hydration.

   Evidence:

   - `website/scripts/postbuild.mjs` writes legacy route metadata.
   - `website/src/App.tsx` resolves `listing.legacyPaths` in
     `getHostListingForPath`.
   - `website/src/App.tsx` builds hydrated listing metadata from
     `pageMetaForListing`.
   - `website/dist/organizers/indore/afterfly-run-club/index.html` is static
     `noindex, follow`, while `website/src/generated/hostListings.json` marks
     the canonical listing `index, follow`.

2. `/claim/` has client-side metadata but no generated static route.

   `pageMeta.claim` defines `noindex, follow`, but `postbuild.mjs` only writes
   `/`, `/host/`, `/organizers/`, listing routes, and legacy routes. Firebase
   falls unknown marketing paths through to root `index.html`, so `/claim/` can
   expose homepage metadata to crawlers, link unfurlers, or no-JS clients.

   Evidence:

   - `website/src/App.tsx` defines claim metadata.
   - `website/scripts/postbuild.mjs` omits `/claim/`.
   - `firebase.json` rewrites `**` to `/index.html`.
   - Fresh build output had no `website/dist/claim/index.html`.

3. Public source maps are deployed with full source content.

   Shared Vite config sets `sourcemap: true`, Firebase deploys `website/dist`,
   and the generated public JS references a `.js.map` file. The map contains
   source content for app code and dependencies. This is useful for debugging
   but should not be the default public production posture.

   Evidence:

   - `packages/web-config/vite-react.ts` enables sourcemaps.
   - `website/dist/assets/index-*.js` contains `sourceMappingURL`.
   - `website/dist/assets/index-*.js.map` is about 2.0 MB and includes
     `sourcesContent`.

### Original P1 Findings

4. The marketing app is not feature-first yet.

   `website/src/App.tsx` is 6,235 lines and owns routing, page composition,
   organizer/listing types, static content, filtering, form orchestration,
   metadata hooks, local storage helpers, analytics helpers, and URL helpers.
   `website/src/styles.css` is 5,155 lines and mixes global primitives,
   homepage, host page, organizer directory, claim, listing review, and host
   application styles.

   Target structure:

   ```text
   website/src/app/
   website/src/features/home/
   website/src/features/host/
   website/src/features/organizers/
   website/src/features/claims/
   website/src/features/reviews/
   website/src/features/waitlist/
   website/src/shared/ui/
   website/src/shared/lib/
   website/src/shared/firebase/
   website/src/shared/analytics/
   ```

5. Website types duplicate contract-owned backend schemas.

   `website/src/App.tsx` hand-defines `HostListing` and casts
   `hostListingsJson as HostListing[]`. `website/src/firebase.ts` hand-defines
   callable payload and response types that Functions already validate through
   generated contract validators. This creates a real drift risk between
   website, admin intake, Functions, and app consumers.

   Target: generate or expose shared TypeScript DTOs for website/admin clients,
   including public listing projections and callable request/response types.
   The website should consume generated types, not local copies.

6. Static generated website data can drift from Firestore API state.

   The website renders from `website/src/generated/hostListings.json`, but
   claim, review, and organizer analytics callables require backing Firestore
   club docs. Current organizer-intake sync preview shows 2 claim targets and
   2 writes needed. That means pages can be generated before the public APIs
   they call are backed by remote documents.

   Target: the generator or CI should fail public API-enabled listing output
   unless the corresponding Firestore claim target sync has been verified for
   the target environment, or the page renders an intentionally disabled API
   state.

7. Public review and organizer analytics scope checks are too broad.

   Public review writes are App Check/IP limited, but the server-side guard only
   checks that the club exists and is not archived. Organizer analytics validates
   club/event existence and event ownership, but does not verify canonical page
   path, publish status, or whether the page is public/indexable. This allows
   review or metric pollution against any non-archived club id if the caller has
   a valid App Check token.

   Target: public website callables should enforce public-page eligibility:
   publish status, claim/listing state, canonical path, and public review or
   analytics enablement.

8. Approved cleaned event data is not yet an app event feed.

   `external_events` are reviewed external evidence, not Catch-bookable events.
   Admin event-intake approval is still blocked from import by policy, and the
   website organizer-intake projection currently emits empty `eventEvidence`.
   Approved organizer records can feed the website today; app discoverability
   requires the Firestore claim-target sync and a separate app visibility gate.

   Target: keep "public event evidence" and "bookable Catch event" separate.
   If event intake should become consumable by the app, define an explicit
   import path into canonical `events`, with booking/payment/waitlist policy,
   host ownership, and provenance preserved.

### Original P2 Findings

9. The website has repeated hand-rolled primitives.

   This finding is being closed through the React component-governance loop. The
   legacy `website/src/components/site.tsx` barrel has been retired: neutral site
   chrome belongs in `website/src/shared/site/**`, governed visual primitives
   belong in `website/src/shared/ui/primitives/`, and organizer/claim/host
   domain adapters belong in their feature folders. The component-governance
   scanner now blocks recreating or importing the retired barrel.

   Shared primitive families now include:

   - `Button`
   - `Field`
   - `SelectField`
   - `TextAreaField`
   - `FormStatus`
   - `StepRail`
   - `ChoiceChip`
   - `ChoiceCard`
   - `MetricCard`
   - `StatusBadge`
   - `SectionHeader`
   - `PageShell`
   - `WebsitePageMain`
   - `AuthStatusRow`

10. Controller seams are missing for complex flows.

    No external state manager is needed at this point. The right next step is
    feature-owned hooks/controllers, matching the admin direction:

    - `useOrganizerDirectoryController`
    - `useClaimFlowController`
    - `useListingClaimController`
    - `useListingReviewsController`
    - `useHostApplicationController`
    - `useWaitlistFormController`
    - `organizerAnalyticsService`
    - `savedOrganizerStorage`

    These should own URL parsing, validation decisions, mutation orchestration,
    analytics side effects, and local persistence. UI components should render
    controller state and dispatch explicit actions.

11. Search and listing selectors are fine at 3 listings but need scalable
    selectors before the directory grows.

    Organizer search recomputes search text per listing during filtering,
    counts iterate `hostListings` multiple times, review sections repeatedly
    filter/reduce/map reviews during render, and `nextFutureCatchEvent` sorts
    to find one earliest event. These are not current performance incidents, but
    they will become visible as approved organizer inventory grows.

12. Marketing workflow path filters miss helper scripts used by deploy.

    `.github/workflows/marketing-website.yml` executes
    `tool/env/check_web_hosting_env.mjs` and `tool/firebase_with_env.sh`, but
    those paths are not listed as workflow triggers. Changes to deploy helpers
    may not run the marketing workflow.

13. Generated listing drift is masked by build-time regeneration.

    `pretypecheck` runs `generate:organizer-listings`, so stale checked-in
    `hostListings.json` can be silently corrected during build. CI should also
    run `node website/scripts/generateOrganizerListings.mjs --check` before any
    mutating generation step, or move the generated listing file out of
    checked-in source.

14. Above-fold media is heavy.

    The home hero uses `website/public/assets/marketing/catch-hero-event.png`,
    currently about 1.7 MB in source and about 2.1 MB in the built output. The
    page should use responsive image variants, modern formats, explicit
    dimensions, and a deliberate preload/fetch priority strategy.

15. Direct organizer analytics is not consent-gated.

    The GTM layer waits for consent, but host-visible organizer analytics calls
    can create a local session id and call the Firebase analytics callable
    independent of the consent banner. Decide whether this is essential
    first-party operational telemetry or marketing analytics; then encode that
    rule in `docs/ads_conversion_spec.md`, client code, and server retention.

### Original Refactor Order

1. Fix production delivery hardening first:
   legacy route hydration metadata, `/claim/` static HTML, source-map posture,
   marketing workflow path filters, and generated listing drift checks.

2. Add contract-backed website DTOs:
   public listing projection type, callable payload/response types, and a
   generator check that validates `hostListings.json` against the DTO/schema.

3. Extract feature-first folders without changing behavior:
   app routing/meta shell, organizer data/routing/search, listing page,
   claims, reviews, host application, waitlist, and shared UI primitives.

4. Add controllers/hooks:
   move URL parsing, validation, mutation orchestration, analytics, and local
   persistence out of page components.

5. Harden public callables:
   enforce public-page publish/canonical eligibility for reviews and analytics,
   and decide the exact app visibility boundary for approved intake records.

6. Optimize public performance:
   responsive hero assets, conditional Firebase loading, precomputed search
   index, selector memoization, and source-map/dependency splitting decisions.

### Consolidation Decision

Do not merge `website/` and `admin/` into one React runtime. Keep them as
separate deployable apps because the website is public, SEO-sensitive,
anonymous/lead-oriented, and cacheable, while admin is private, role-gated,
dense, and privileged.

Do consolidate shared layers:

- generated contracts and DTOs;
- design tokens and web config;
- neutral React primitives in a future `packages/web-ui`;
- safe callable client helpers;
- media/token/build validators.

## Website Component And Organizer Functionality

The completed website mockup functionality tracker is folded into this
architecture doc. The production website should use Catch tokens, canonical
React website components, generated public projections, and existing Firebase
callable boundaries. Prototype-only globals, fabricated organizer data, hash
routing, and image-slot editing utilities must not be imported.

Current canonical component layer under `website/src/components/` includes:

- site shell: `SiteHeader`, `SiteFooter`;
- shared display primitives: `StatusBadge`, `SectionHeader`;
- shared identity display primitives: `ActivityMark` and `ProfileStrength`
  under `website/src/shared/ui/primitives/`;
- shared process status panel primitive: `ProcessStatusPanel` under
  `website/src/shared/ui/primitives/`;
- shared app-capture primitive: `CaptureCard` under
  `website/src/shared/ui/primitives/`;
- public discovery primitives: `PublicSearchBar`, `PublicEventCard`;
- host/product blocks including `ProductModuleGrid`, listing event blocks
  including `EventActionCard`, and listing/claim/review
  primitives owned by the website
  feature folders.

Implemented website behavior:

- `/explore/` owns consumer discovery with generated organiser projections and
  the live published-event feed. `/` is the short organiser-first introduction.
- Directory filters are URL-backed for query, city, format, status, upcoming,
  rating, and sort.
- Organizer listing pages support event-aware search results, claim pressure,
  verified/public review grouping, owner response pressure, Catch-created event
  CTAs/deep links, and share behavior.
- Claim surfaces show pending, already-claimed, not-found, and "while you wait"
  states.
- `/host/` presents Catch as additive live-event tooling for hosts who keep
  their existing booking or RSVP platform. It explains companion-event setup,
  CSV-based roster import, verified attendance, the no-download guest runtime,
  First Hello, wingman, pairing/grouping/rotations, feedback, Audience/CRM,
  consent-gated WhatsApp invitations, share attribution limits, optional live
  modules, and selective free beta access. Catch-native booking, full profiles,
  persistent matching/chat, universal provider sync and exact external revenue
  are not prerequisites and must not be presented as current dependencies.

The public sitemap, content destinations and retired URL redirects are owned by
`docs/marketing_website_architecture.md#public-sitemap-and-conversion-ownership`.
The real pilot form lives at `/host/apply/`; `/host/` owns product detail.

Catch event discovery is live. `PublicEventListingsProvider` subscribes through
`firebase.ts` to explicitly published events; `usePublicEventListingsController` owns the
TanStack Query cache used by discovery, directory, organiser, and event-detail routes.
Cache-only snapshots, pending writes, subscription failures, and oversized feeds
withhold Catch rows. The current bounded feed supports at most 400 published
records; overflow fails closed and requires a paginated discovery service before
that scale. No cached Catch rows are used as an offline fallback. Restricted
admission terms render without an open registration CTA; the server remains the
booking authority. A missing static organizer profile still excludes its events.

Production organizer generation reads organizer documents and external evidence
only. Catch event details are absent from generated JSON, prerendered event HTML,
Event JSON-LD, and sitemaps. Postbuild removes old generated event pages before
writing external event pages and a generic noindex event shell; `/events/**`
rewrites to that shell with `no-store`. Explicit synthetic Storybook data remains
separate. Rollout requires replacing previously deployed static exports; this
cannot retract historical browser caches or copies made while an event was public.

Deferred website decisions:

- Fabricated prototype organisers remain excluded from real listings. The old
  marketing concept pages and their simulated sample rows are retired.
- Add an Instagram DM code-verification backend path before promising that as
  an automated claim option.
- Add new marketing capture slots only through
  `tool/marketing/capture_manifest.json` and the existing sync/export pipeline.
- Replace proxy host-create step captures with exact create-event step
  screenshots once the UI capture catalog has those fixtures.

## Host Web Product

The authenticated Host web product is the browser delivery of the existing
Host Flutter app, not a future parallel dashboard. Prefer:

| Domain | Surface | Stack | Permission model |
|---|---|---|---|
| `hosts.catchdates.com` | Authenticated standalone Host product for private workspaces, imported/manual rosters, Event Success, reviews, scoped analytics, public-event readiness, payouts, and event operations | Flutter web using the Host app root/router | Server-side Functions authorize organizer ownership or management per organizer/event |

Do not put host tools under `admin.catchdates.com`. Hosts are external operators,
not internal admins. Keep `/host/` on `catchdates.com` as the public host
marketing/acquisition page, and use `hosts.catchdates.com` only for authenticated
host workflows. The Host web target deploys independently from the Consumer web
target and the React marketing/admin surfaces through the dedicated `host`
Firebase Hosting target and `.github/workflows/host-website.yml` exact-byte
delivery path.

Host web APIs follow the same server-owned pattern as mobile Host APIs:

- the browser client never receives service-account credentials;
- Functions validate Firebase Auth and host ownership;
- mutations write audit or activity records where operationally useful;
- analytics responses are scoped to organizers/events the signed-in host can manage.

Public event discovery and event-scoped phone-OTP registration remain on the
React marketing website because they are crawlable acquisition surfaces. The
website calls a narrow public-registration backend, never reads a private Host
roster, and hands authenticated runtime work to Host web, an event-scoped
attendee web route, or the Consumer app according to capability. A web RSVP
creates/links the same operational attendee record consumed by Host mobile and
web; it does not require or silently create a dating profile.

Verified event-service SMS preferences are owned by `features/eventMessaging`
and composed by successful public registration and the guest runtime. The import
scanner permits these consumers plus message-link withdrawal composition;
messaging does not depend on its consumer pages.
The optional control appears after a confirmed roster place and on the guest's
venue/live page using only their own bootstrap `eventAttendeeId`. It never grants
organizer marketing permission. Auth changes and event/attendee changes discard
pending presentation state; unknown submissions retry the same request ID.
Server revision and time keep stale reads from replacing a confirmed choice.
Sender provisioning, Consumer app preferences, inbound opt-out and activation
remain separate work. Rehearsal never mounts this live preference controller.

Verified RCS and WhatsApp preferences use the same public registration and guest
runtime entry points with independent consent. Their shared sender preference
controller handles discovery, auth epochs, navigation, query lifecycle and exact
retry; typed channel ports own callable parsing and consent evidence. RCS binds
its reviewed hash and revision. WhatsApp displays the organizer name and business
number and binds both the sender hash and current STOP-record hash, including
changes that do not advance the permission revision. Query identities include the
channel so concurrent cards cannot share private state or pending requests.
Earlier senders are disclosed one at a time for withdrawal only. Discovery stays
stable during the page session; full preference reads refresh while visible and
pause during unresolved writes. Sender navigation is disabled until the exact
request is confirmed or definitively rejected. Closed response validation and
auth/event/sender scope fences prevent stale or foreign responses from entering
private query state. The shared presentation card accepts channel-owned copy and
availability explanations. These controls do not activate a sender, grant another
channel permission or mount in rehearsal.

### No-Download Event Runtime And Invite Landing

The React marketing runtime owns the following non-SEO transactional routes:

- `/offer/` owns private, phone-verified invitation checkout. The token is
  consumed from the URL fragment before rendering and remains in page memory;
  this route excludes marketing analytics, consent banners and attribution.
  Only non-secret grant/payment IDs are saved in the current history entry for
  reload recovery, and every API operation checks the authenticated payer. The existing
  Catch OTP and shared provider window lead to server-verified payment and
  admission; the provider callback cannot confirm a seat. Retry preserves the
  attempt identity, account changes discard stale results, and expired or
  refunded attempts remain readable. The route uses shared event runtime
  primitives, owned content and Storybook states. Hosting activation and real
  provider evidence are separate from this source implementation.

- `/join/:publicRuntimeId` resolves only a bounded event projection before
  Firebase phone OTP. After authentication it claims or requests one roster
  identity, collects display name plus exactly one required pre-event payload
  selected by the effective interaction model (pace, skill, dietary/seating,
  questionnaire, or team/arrival group), plus only the optional fields required
  by configured preference-aware behavior. The server recomputes readiness;
  the browser cannot choose the required payload. A static route can never check an
  attendee in. The Host's live QR adds a short-lived signed venue session in
  the URL fragment; the route shell consumes and clears it before the controller
  redeems attendance. Without that fragment, a ready attendee sees the venue
  scan gate. After attendance, the route exposes First
  Hello, wingman, questionnaire, private assignment/rotation/group state,
  attendee-private end-of-event conversation confirmation, and feedback without
  creating a Consumer profile or booking edge. The conversation roster is
  fetched through an attendee-authorized callable; Hosts receive only numeric
  scorecard counts and exclusion, never who named whom.

- `/event-update/:linkId` is a scoped event-service update, with its bearer secret
  only in the URL fragment. It shows the current instruction and approved reply
  choices through App-Check-protected callables. The route does not unlock the
  full attendee runtime or check-in. Marketing initialization, attribution and
  events are excluded. The secret never enters query keys or mutation variables;
  private cache state is discarded when the page instance unmounts. A separate
  shared message-withdrawal controller uses the same bearer link with narrower
  authority and independent SMS/WhatsApp ports. It can stop only the original
  channel permission through its consent window, even if instructions are
  closed. An unissued channel hides its control. No guest identity or enable
  action is exposed. A changed secret or channel remounts the controller using
  an opaque key; secrets never enter query/mutation state.
  Withdrawal retries reuse the request id and confirmed changes reject stale
  reads. Reads poll
  only while visible, refresh on reconnect/focus, and use conservative server
  expiry. Stale reads cannot overwrite a confirmed response. The controller
  locks repeat taps and reuses an uncertain submission identity. Responses are
  recorded server-side before the page confirms them. It is noindex, excluded
  from the sitemap and emitted through `/event-update/**`; sender activation,
  worker-issued links and Host case handling remain separate delivery steps.

- `/rehearse/:publicRehearsalId` is the synthetic-only guest phone for a Host
  dress rehearsal. It never enters the OTP, attendee-claim, booking, payment,
  messaging, or matching paths. A high-entropy link plus a stable browser
  instance redeems one deterministic synthetic actor; the returned slot token
  can submit only bounded guest practice actions. The route follows the Host's
  virtual clock, renders the shared Event Runtime shell and modules, keeps a
  persistent Practice mode banner, and exposes fault-specific recovery copy.
  It is `noindex,follow`, excluded from the sitemap, emitted through the exact
  `/rehearse/**` Firebase rewrite, and registered in
  `feature.event_rehearsal` with the Flutter Host console.

The same route renders `social_missions` from the generated Event Success
prompt catalog. Prompt ids carry `light`, `personal`, or `reflective`
disclosure and advance monotonically with `activeStepIndex`; web copy adapts
the shared semantic id, while the sequence remains identical to Flutter.
- `/invite/:inviteToken` resolves an opaque bearer token server-side, records a
  short-lived bot-classified touch, preserves the token through registration or
  runtime claim, and redirects to Catch RSVP/runtime or an allowlisted external
  booking URL. The page never exposes internal link, contact, UID or attendee
  identifiers.

The web runtime prepares one stable attendee-referrer token after a verified
guest reaches event mode. Its share control opens the browser/system share
surface when available and otherwise copies the opaque `/invite/:inviteToken`
URL. The backend resolves external-companion links to the event's verified
external booking URL and Catch events to Catch registration. Consumer Flutter
event detail and payment confirmation expose the same personal-link contract.
Both surfaces can observe only use of the Catch share/copy control and later
token use; neither can inspect an ordinary WhatsApp send or forward.

The no-download runtime consumes the generated Event Success moment
presentation catalog from `functions/src/shared/generated/` through its pure
feature model. Its Firestore plan projection retains `revealStartedAt` in
milliseconds plus the saved reveal-countdown value, and the generated resolver
computes the same anticipation, climax, settle, completion, and deterministic
seed as Flutter. Missing legacy countdown configuration uses the catalog
fallback. This foundation adds no route or visual fork, and web intentionally
does not play the catalog's ambient-bed audio.

The guest runtime now renders the same three checked-in Lottie vector assets as
Flutter for stage motifs, the anonymous checked-in ring, and the reveal
cinematic. `@catch/web-ui` lazy-loads `lottie-web/build/player/lottie_light`
only when one of those surfaces mounts. The feature adapter derives phase,
progress, deterministic particles, and asset selection from the generated
presentation contract and samples the server timeline every
100ms; CSS owns only those driven transforms. The bounded bootstrap projection
includes the aggregate `checkedInCount` required by the co-presence ring and no
attendee identities. Web audio remains intentionally absent.

## Why Subdomains Instead Of Paths

Subdomains keep each surface independently deployable and reduce routing
conflicts:

- Flutter web can own `app.catchdates.com/**` without sharing a catch-all with
  the marketing site.
- Marketing can own SEO pages, `/host/`, `.well-known/`, and public Functions
  rewrites.
- Admin can use separate security headers, App Check settings, auth behavior,
  and release cadence.
- A future host portal can be added without overloading either the consumer app
  or the internal admin console.

## Private Sales acquisition surfaces

The Admin Sales feature composes the existing primitives for host research,
contacts, tasks, opportunities, evidence review, imports, pilot terms and private
demos. Feature-owned callable adapters are included in the shared Admin
validator and Operations catalog inventory; they must not bypass server-side
current-role, revision or receipt checks. Sample mode is clearly identified and
cannot approve commercial terms or issue real invitations.

The marketing `/demo/:invitationId` route is a lazy transactional surface. Its
fragment grant is removed after capture and retained only in page memory.
Route keys, hash scrolling, marketing analytics and the consent banner exclude
this route. The generated static HTML contains generic noindex metadata, and
Hosting applies no-referrer and private/no-store headers. No grant, prospect
research or strategy appears in static content. Verified identity and explicit
start remain separate from anonymous preview and organizer claim approval.


## Identity and public event-entry consolidation boundary

Source inventory on 2026-09-30 verified that website claims, forms, booking,
offers and runtime already share the lazy Firebase Auth runtime in
`website/src/firebase.ts`: `watchClaimAuthState` has public form/runtime aliases,
and `beginPublicEventPhoneVerification` is the existing reCAPTCHA/OTP transport.
Claims currently expose Google popup; forms also support email links and
policy-specific anonymous drafts. Admin retains its Firebase app adapter,
phone sign-in cleanup and privileged custom-claim policy. Do not import admin
APIs into public entry points. `@catch/web-ui` remains Firebase-free.

Both source defaults reference the dev project; prod builds inject the expected
project through existing workflow variables. Read-only Firebase registration
inventory verified Consumer Web and Host Web registrations in prod/dev, with
no separately named admin/marketing registration. This does not verify current
deployed variable values. No source Auth tenantId assignment was found. Live
provider/domain/tenant reads returned HTTP403: settings remain unverified, not
proven absent. No settings, grants or credentials were changed.

Keep identity → claim proof/review → organiser management → event/operator
permissions → privileged admin claims separate. Approval transactions create
scoped organiser membership; authentication alone does not grant ownership.
No provider linking or explicit persistence was found; shared project configuration
does not imply one UID across Google/phone or a cross-subdomain session.

Current gaps: explicit phone entry on claim, a public profile-completion bridge
required by claim approval (`users/{uid}.profileComplete`), general public account
history/profile and provider linking. These are product/recovery decisions, not
delivered by sharing infrastructure. Local answers may precede verification when
the existing form policy allows; current booking quote/history still require OTP.

### Public event guest entry

The public event page keeps informational listing data separate from the
account-scoped `getEventViewerState` read. Its optional `surface: guest` adapter
projects current linked attendees, native participation, application review,
claimed offer recovery, public payment recovery and runtime entry. It requires a
current verified Auth phone but no consumer profile. The generated response is
shared with the website; the native adapter and its booking-readiness rules
remain distinct. Guests never receive CRM notes, answers or invitation secrets.

The page routes to existing `/f/`, `/offer/`, `/booking/` and `/join/` owners.
One current published event-targeted application form with a verified identity
policy produces an application link. Ambiguous/unavailable linkage does not
invent a destination. Review waitlists and seat waitlists are separate states;
approval does not reserve seats. Existing account-owned payment recovery remains
available after registration closes. Free registration and public paid checkout
share publication, timing, price and restriction guards.

Shared phone verification links or reauthenticates an existing account instead
of silently switching its UID. Explicit account switching signs out first.
Guest queries are account-keyed, expire quickly and discard stale identity
results. Free registration mutations live in a controller, separate from the
form widgets. Public payment/offer controllers retain their own transaction and
retry protocols while sharing authentication transport.

Cohort and pair-inventory guest admission remains explicitly host-managed.
The event policy's optional `approvedMembersSkipReview` defaults to false.
Host create/edit offers an explicit member-exempt request-to-join preset and
preserves it through drafts and repeats. Native and public booking re-read the
current community entitlement; free registration, paid quote/reservation and
paid fulfillment share that check. Membership skips only review, never current
capacity, invitation, pricing, or unsupported inventory requirements. Public
registration configuration validates supported policy shape separately from
recipient eligibility. Issued links retain their existing manual handoff; claimed
offers can be recovered by authenticated non-secret reference. Free invitations
use an explicit recipient-authorized call to the existing admission transaction,
including current offer, response, identity, ledger and retry checks. The
existing Host message preparation includes that free acceptance link. A free
acceptance never creates a payment order; its owned receipt survives invitation
expiry. Paid receipt recovery opts into its event access destination while
older strict clients retain their receipt shape. Runtime account transitions
clear private assignments, profile answers and account-scoped graph queries;
late bootstrap responses cannot restore the prior account. Feature gates and
provider/deployment readiness remain independent of
source implementation. The invitation layout uses this same guest projection
for its inline and mobile action, and the existing transaction owners in its
registration dialog. See `marketing_website_architecture.md` for the shared
presentation and optional-content contract.

### Approval notification transport boundary

The selected transactional email transport is Resend, behind the server-only
`TransactionalEmailProvider` port in `functions/src/email/emailProvider.ts`.
Application code must depend on that port; provider-specific HTTP, credentials,
response parsing and error classification remain in `ResendEmailProvider`.
The adapter has no automatic retries, SDK client, subscription provisioning or
billing upgrades. Each immutable message carries its own idempotency key and
an authorization deadline. Acceptance is distinct from delivery; ambiguous
submissions stay unknown. Quota exhaustion returns a bounded deferral.

As verified on 2026-10-16, Resend's free plan allows 3,000 emails per month and
100 per day without a monthly subscription. Recheck
[provider pricing](https://resend.com/pricing) before activation; a free email
plan does not make WhatsApp, SMS or infrastructure usage free.

`events/approvalNotifications` now adapts approved applications to shared
Operations work items and `FirestoreDeliveryOutbox`. A stable approval occurrence
creates independent phone and email obligations. Review-note edits do not create
another occurrence. Every reservation and claim rechecks the current application,
response access, event publication/timing, deletion guard, Auth identity, verified
contact, immutable opt-in receipt, sender configuration and atomic budget. No
attendee authority or marketing permission is invented for an applicant.

The guest page exposes two optional, initially unchecked choices and can verify
an email on the current phone account through Firebase's verification action.
The preferences callable fences the expected UID against current authentication;
private contact evidence is removed during account deletion. Event-specific
permission can be withdrawn without changing admission. A newer organizer
event-operations withdrawal or WhatsApp STOP also suppresses the phone lane
until fresh explicit opt-in; a newer SMS withdrawal blocks fallback.
Marketing-only withdrawal does not change this service permission.

Phone delivery attempts WhatsApp first and permits SMS only after confirmed
technical failure. Accepted/unknown outcomes cannot start fallback. The shared
signature-verified WhatsApp ingress is correlated to an immutable dispatch proof.
Email and SMS API acceptance completes the submission obligation, not proof of
inbox/handset delivery. WhatsApp pending outcomes remain unresolved and become
Operations review work after the receipt deadline; signed late receipts can wake
reconciliation. Quotas, unavailable senders and exhausted attempts hold work for
review; they never upgrade billing or authorize duplicate sends. Recovery is
bounded to ten due jobs per scheduled invocation and 100 evaluations per job.
All messages return guests to the authenticated event page without bearer offer
secrets, and explicitly separate approval from booking where the channel permits.

Activation requires trusted, server-only
`eventApprovalNotificationSettings/{organizerId}` (absent/disabled by default),
current managed WhatsApp connection and approved UTILITY template with an
`eventUrl` variable, Gupshup/DLT sender credentials and exact approved SMS copy,
and a verified Resend sender domain. Credentials use pinned Secret Manager
versions. The email credential envelope is
`catch.transactional-email-credential/v1` with `provider`, stable `accountId`
and `apiKey`; replacing `TransactionalEmailProvider` is the transport seam.
Daily/monthly email caps are shared by provider account (100/3,000); phone count
and cost caps are explicit. Unknown or rejected attempts conservatively retain
budget debits. Deploy Functions, rules/indexes and website together, then verify
real opt-in, approval, WhatsApp status/fallback and email acceptance. No provider
account, domain, credentials, activation, live sends or deployment is implied by
source completion. Email bounce/delivery webhooks and SMS delivery reports are
not currently consumed by this application adapter; status remains API acceptance.

### Partner workspace in the React console

`/partners/` uses the existing React console, Firebase session epoch and Query
provider with a dedicated route shell. It does not enter the Admin navigation or
require an employee claim. Current server-owned referral membership and canonical
organizer assignment determine every read or mutation. Query caches and controller
state rotate on token/identity change; the existing pending-operation lease freezes
request controls and sign-out. Nomination and offer review use stable request IDs
for exact retries. Research, private preview, outreach and Host continuation are
subsequent slices of this workflow; this initial surface exposes no send control.


### Partner workflow implementation sequence and shared ownership

The partner route is a scoped projection of existing Intake and Sales services.
Phase one owns bounded membership, private nominations, canonical assignment
reservation and acceptance. It does not grant employee roles or mutate organizer
claim/publication state. Existing Intake review links nominations to one canonical
organizer, rather than creating another organizer store.

The next phase extends existing Sales evidence, tasks, opportunities and reviewed
outreach through durable Operations work items. Research and writing have separate
frozen configuration, execution mode and budgets; provider billing remains inactive
until separately authorized. Deterministic execution remains available and paid
fallback is explicit. Facts retain observed/inferred/unknown labels and source
versions. Writing proposals must be edited and reviewed against current sources
before a partner records a manual send and next action.

The onboarding phase owns Sales Demo and authenticated claim continuation. It
reuses the existing private Forms materializer and current manager authority;
partner assignment does not confer organizer control. A completed synthetic demo
must remain recoverable through reviewed claim delay without storing bearer grants.
Google/phone linking must preserve the authenticated UID and fail into supported
collision recovery. Forms response identity seams remain separately owned.

The Operations Sales adapter suite omitted by current top-level test discovery
(CAT-132) is a direct integration obligation of the Operations phase. Readiness
producer defaults (CAT-127) concern event publication dependencies, and organizer
contract retirement (CAT-131) concerns existing canonical DTO/adapters. Their
current-source census is required before touched consumers change; this partner
flow does not claim blanket retirement or migrate unrelated event publishing.


The Sales Demo auth adapter observes ID-token changes so linking a phone or Google
credential to the same UID refreshes current contact and private preview queries.
OTP confirmation fences the original account; credential collisions provide
explicit recovery without account merging. Public Forms and guest phone auth
adapters keep their existing semantics. Private preview keys contain actor/contact
state but never grants; retained private data is hidden during authority rechecks.
`/claim/?continuation=…` reads an authenticated private continuation, not the public
listing index. It uses the existing claim request mutation and current server
Forms materializer. The URL identifier is not authority. Expired/revoked proofs
hide the private target; each preparation reconciles uncertain outcomes before
another action. This is source implementation pending its separate exact
contract, backend, React, rules and release verification; it does not complete the
research/writing worker or partner outreach workspace phases.
