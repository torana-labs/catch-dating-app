---
status: active
---

# Catch Marketing Website

React marketing surface for `catchdates.com`, with a Next.js migration candidate
and the existing Vite/Firebase Hosting production artifact.

## Next.js candidate

`npm run build --workspace catch-marketing` runs existing checks, produces the
Vite deployment artifact, then builds the Next standalone candidate. To build
only the candidate, use `npm run build:next --workspace catch-marketing`.
`npm run start:next --workspace catch-marketing` copies public/static assets into
the standalone tree (including the private shell from `.next-legacy`) and starts it on `127.0.0.1:3107` (override `PORT` as needed).
Set the explicit public build variables and runtime project in `env.example`.
Production eligibility is compiled from the existing marketing environment gate
(Firebase project/config, App Check and explicit store-link state). A runtime
stage change cannot promote an unconfigured preview; it returns uncached 503.
Runtime credentials are ADC with read-only Firestore authority; they are never
browser variables. The current deploy workflow still publishes Vite `dist`. Generated private-shell
assets never enter the checked-in public source directory or the Vite artifact.
Packaging replaces old runtime chunks rather than accumulating earlier builds.

For isolated runtime acceptance, start the Firestore emulator on loopback port
8765 with project `demo-catch-nextjs`. Start the packaged server with
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8765` and
`CATCH_PUBLIC_FIRESTORE_PROJECT=demo-catch-nextjs`, then run:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8765 npm run test:next-runtime --workspace catch-marketing
```

For two independent standalone instances copied outside the checkout, run
`test:next-lifecycle` with the same emulator variable. Build this fixture candidate without production browser inputs; ports 3118–3121 must be
free. It checks HTML/RSC/data/sitemap publication changes, private-field exclusion,
malformed/synthetic records, 401-row refusal, unavailable readers, private assets
browser expiry/focus recovery and refusal to promote an unconfigured build. It restores the organizer fixture and removes its own bound
fixtures on completion. Do not run emulator-mutating acceptance suites concurrently.
`test:next-failure` uses port 3122 and a read-only loopback gRPC proxy to permit
the preflight reads, then fail subsequent reads. It verifies the documented
uncached 500 response contains no stale organizer content. Run it with the same
emulator variable after seeding the runtime fixture.

`audit:next-browser` checks actual rendered pages with axe and records cold-load
LCP/CLS/JavaScript bytes at mobile/desktop sizes under documented CPU/network
throttling. Its JSON report defaults to `/tmp/catch704-browser-audit.json`; these
are laboratory observations, not field INP or deployed acceptance.

The test writer is hard-bound to that emulator/project. It covers public initial
HTML, metadata, 301/404 behavior, private-shell credential exclusion, custom-host
isolation, no-JavaScript rendering, desktop/mobile, sharing, search, publication
withdrawal, noindex and sitemap removal. Screenshots go to `/tmp`. Separately run
the server without runtime project configuration to verify catalog/sitemap 503
responses and authored Host/legal availability. Full callable/provider acceptance
requires a controlled configured preview; these local fixtures do not prove it.

Build the container from repository root with
`docker build -f website/Dockerfile .`, supplying the public `VITE_*` build args.
The adjacent `Dockerfile.dockerignore` excludes unrelated source and local state.
`website/next-hosting.preview.json` is the separate, undeployed preview proposal
for `catch-website-next-preview` in `asia-south1`; do not pass it to a production
deploy. Container execution, cloud IAM, original-host forwarding, preview traffic and
live provider acceptance remain explicit release gates in
`docs/web_surface_architecture.md`. Do not deploy or switch traffic as part of a
local build.

After this source is accepted on current main and its full CI run passes,
dispatch `.github/workflows/website-next-preview.yml` to build/test the actual
container and publish an isolated three-day Hosting preview. It requires the
existing `prod-hosting` OIDC/public-config variables and read-only web identity.
The workflow refuses non-main, stale or unvalidated source, verifies the exact
tested artifact before authentication and never deploys the live Hosting channel.
Use its serving-identity artifact to perform the remaining cloud/browser gates
in `docs/web_surface_architecture.md` before implementing the production switch.

## CI/CD

`.github/workflows/marketing-website.yml` validates marketing-site changes on
pull requests and deploys the production Firebase Hosting `marketing` target
after matching changes land on `main`.

The validation job checks generated design-token CSS, app-derived marketing
media, screenshot design-context drift, route-contract drift, unit/a11y tests,
registry-backed Storybook visual baselines, and the Vite production build.

The marketing target serves generated static routes and keeps only explicit
dynamic-family rewrites (`/host/**`, `/join/**`, `/rehearse/**`, `/invite/**`, `/f/**`, and
`/claim/**`) plus API rewrites. It deliberately has no catch-all rewrite,
allowing the generated `dist/404.html` to retain Firebase's HTTP 404 status.
The route checker requires every `spa-rewrite` contract to have both a
generated entrypoint and its exact Hosting rewrite. The deploy workflow probes
the public Forms family and a unique unknown production URL after deployment.
The local Hosting emulator uses port 5050 because macOS commonly reserves port
5000.
The retired `/host/preview{,/**}` family is a contract-backed permanent Hosting
redirect to `/host/`; there is no client route or duplicate page owner.

Organizer listing pages include a Firebase-backed claim form. Production builds
must set the Firebase web config and `VITE_WEBSITE_APPCHECK_SITE_KEY` from
`env.example`; local development falls back to the checked-in dev Firebase web
app config. Claim submission, public reviews, and host-visible organizer
analytics still need an App Check site key because the callable endpoints
enforce App Check.

Production organizer projection deliberately excludes `catchDemo` records.
`src/generated/hostListings.demo.json` is the separate demo-inclusive
Storybook/sales fixture and is checked independently. Home discovery further
filters production data to future Catch-bookable events in configured live
market cities; external events remain visible only on organizer listings.
The production read-only snapshot job regenerates
`src/generated/hostListings.json` from canonical `organizers/{id}` documents in
Firestore and passes only the two validated listing JSON files to the
uncredentialed exact build. The checked-in file is a build projection for
deterministic pull-request validation, not an operational editing surface. The
generator has no legacy scraped-seed input; database materialization is the
only production content path.

Firebase Hosting deploys run
`node tool/env/check_web_hosting_env.mjs marketing` before building. Production
deploys should also validate
`--expected-project-id catch-dating-app-64e51` in CI or an equivalent manual
preflight, so the marketing site cannot ship with missing App Check or Firebase
config. Production marketing deploys also require an explicit store-link state:
`VITE_STORE_LINKS_MODE=prelaunch` requires both store URLs to remain empty and
serves the existing coming-soon/waitlist CTA, while `live` requires official
HTTPS `VITE_APP_STORE_URL` and `VITE_PLAY_STORE_URL` product links. The deploy
workflow defaults an unset GitHub Environment mode to `prelaunch`; set
`VITE_STORE_LINKS_MODE=live` in `prod-hosting` only when both listings exist.

The production snapshot job reads the canonical organizer collection directly.
Content publication does not itself enable claim or public-review mutations;
those capabilities remain fail-closed until a separate Firestore-owned
capability decision is implemented. Fixture-generated sync previews cannot
enable production capabilities.

The snapshot job uses a dedicated Firestore-read-only identity in the
`prod-hosting` GitHub Environment:

- `GCP_WEB_HOSTING_READONLY_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_WEB_HOSTING_READONLY_SERVICE_ACCOUNT_EMAIL`

The separate exact promoter uses the production Firebase deploy identity:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

The package is hard-bound to Firebase project `catch-dating-app-64e51` and site
`catch-dating-app-64e51`; promotion deploys only `hosting:marketing`. If a
marketing change also modifies the
waitlist Cloud Function, deploy Functions separately through the existing
Firebase deploy workflow.

## Route Contracts

Route-first website review is owned by `design/website/routes.json`. Update that
contract before changing public routes, page metadata, static postbuild output,
organizer listing route families, sitemap inclusion, robots tags, or planned
review states.

```sh
npm run check:routes
```

`npm run typecheck` runs the generated organizer listing check and the route
contract check before TypeScript.

## Content Contracts

Static marketing-authored content lives under `src/content/`. The copy scanner
has an empty migration baseline and blocks new authored strings outside this
directory. `src/content/generated.ts` is the mechanically centralized legacy
projection from the completed migration; new edits belong in page-owned files
such as `host.ts`, `site.ts`, and `marketing.ts`, not new generated keys.
`src/content/meta.json` is validated against
`src/content/meta.schema.json` through the shared browser-safe
`src/content/metaContract.ts`; both the client metadata adapter and static
postbuild execute that validator, and tests assert parity with the JSON Schema
over valid and invalid fixtures. `src/content/markets/in.ts` owns India-specific
cities, currency, geo labels, and comparison columns; features read it through
`src/content/markets/index.ts`. Keep route-specific page copy in direct
page-specific modules; do not add a new global content barrel that would pull
unrelated copy into lazy route chunks.
`src/content/interpolate.ts` is the sole template formatter and rejects both
missing and extra values at runtime while literal templates infer exact keys at
compile time. The copy ratchet scans production TypeScript and TSX, including
visible single-word, accessibility, and interpolated template strings.
Its baseline/allowlist registries are exact and fail on malformed, duplicate,
overlapping, or stale entries, forcing the debt count to shrink with migration.
The market pack uses stable structured city records with `live`/`waitlist`
status and one explicit featured-city id. Event-live and form options derive
from those records instead of parallel city lists. `npm run check:market-pack`
validates semantic references, timezones, ISO currency, and current India
option order before TypeScript runs. Site-wide app-store labels live in
`src/content/site.ts`; `useAppDownloadCtas.ts` remains the adapter that reads
environment URLs and combines them with that plain content data.

`src/content/legal.json` owns the published `/privacy/`, `/terms/`, `/help/`,
and `/delete-account/` documents and confirmed operator/contact facts.
`/delete-account/` is the canonical store-listing account deletion resource;
Help, Privacy, and Terms link to it instead of repeating its steps.
`src/content/legal.ts` exposes that data to the route, while
`src/content/site.ts` owns the public mailto and site-wide footer links.
`npm run check:published-legal-content` rejects missing routes, empty sections,
placeholder text, section links to unpublished paths, or a deletion page that
omits the in-app or no-app routes, before TypeScript runs.

Website analytics events inherit `content_version: "website_copy_v2"` from
the central adapter. `npm run check:analytics-contract` verifies the immutable
payload field and the unset, essential-only, and accepted consent-banner
states; it runs automatically before typecheck.

```sh
node --test ../tool/marketing/website_meta_contract.test.mjs
npm run check:routes
```

## Component Workbench

Storybook is the marketing website's Widgetbook-equivalent workbench. Stories
should attach route contract metadata from `design/website/routes.json` through
`parameters.catchRoute`, including the route id, path, and review states.
Component ownership and Storybook coverage are tracked in
`design/website/components.json`; update that registry when route or section
stories move.

Storybook accessibility is a real Chromium/axe CI gate, not just the addon
panel. The project default is `a11y.test = "error"`; 26 pre-existing findings
are explicitly classified as `todo` under stable debt id `WEB-A11Y-001` in
`design/website/a11y.todo.json`. `npm run check:a11y-debt` rejects any new,
missing, duplicate, or stale todo annotation, so new stories remain blocking
and the legacy set can only shrink deliberately. All stories share the runtime
`WebsiteQueryProvider` through the global preview decorator.

```sh
npm run check:components
npm run storybook
npm run build:storybook
npm run test:storybook:a11y
```

The checked-in starter stories live in `src/stories/MarketingRoutes.stories.tsx`
and cover `/`, `/host/`, `/host/preview/`, and `/organizers/` with mocked
app-capture assets where relevant. Host route section stories live in
`src/stories/HostSections.stories.tsx`; organizer search section stories live in
`src/stories/OrganizerSearchSections.stories.tsx`.
Storybook writes its static build to `storybook-static/`, which is ignored.

## Analytics Setup

The site has a first-party analytics layer in `src/analytics.ts` and records
host-visible organizer metrics through `recordOrganizerAnalyticsEvent` in
`src/firebase.ts`.

- Production deploys use `GTM-K7KLNQXP` unless the `prod-hosting`
  `VITE_GTM_ID` variable explicitly overrides it. The environment gate requires
  a valid container id, and the browser loads GTM only after analytics consent.
- `.github/workflows/website-production-observability.yml` probes the public
  launch routes every 15 minutes without a paid monitoring service. The same
  status, canonical-metadata, and content checks run immediately after a
  marketing deployment.
- Browser errors and unhandled promise rejections emit only a coarse
  `client_error` event after analytics consent. Error messages, stacks, query
  strings, and user identifiers are deliberately excluded.
- Configure GA4, Google Ads, Meta Pixel, LinkedIn Insight Tag, and other pixels in
  GTM against the pushed `dataLayer` events.
- Set `VITE_WEBSITE_APPCHECK_SITE_KEY` and the Firebase web config in
  production so organizer listing views, saves, contact clicks, claim clicks,
  outbound clicks, and event views can be accepted by the App Check-protected
  callable and written to BigQuery.
- The waitlist form sends attribution and an event ID to `/api/join-waitlist`.
- The Cloud Function stores attribution on `launchWaitlist` and writes a
  `marketingConversionEvents/{eventId}` record for later server-side conversion
  review or CAPI wiring.

Primary web events:

- `page_view`
- `client_error`
- `cta_click`
- `city_selected`
- `role_selected`
- `waitlist_started`
- `waitlist_submit_attempt`
- `waitlist_submitted`
- `host_lead_started`
- `host_lead_submit_attempt`
- `host_lead_submitted`
- `listing_claim_sign_in_started`
- `listing_claim_signed_in`
- `listing_claim_submit_attempt`
- `listing_claim_submitted`
- `generate_lead`
- `organizer_listingView`
- `organizer_searchAppearance`
- `organizer_eventView`
- `organizer_organizerSave`
- `organizer_eventSave`
- `organizer_contactClick`
- `organizer_claimClick`
- `organizer_outboundClick`

Claim conversion events use the ads contract keys `club_id` and `claim_role`.
Consent-based marketing events are still recorded for public organizer pages
whose App Check-protected host analytics callable is disabled; only the
callable dispatch is suppressed in that state.

After browser/provider acceptance of the deployed preview, dispatch
`.github/workflows/website-next-promote.yml` with its `preview_run_id`. Both runs
must use the same current-main commit and successful CI. Promotion verifies and
reuses the exact tested image; it does not rebuild. It preserves the prior
Hosting version, deploys the bounded `catch-website-next` service, validates an
expiring production channel, then clones its exact version to live. Release and
rollback identities are saved as workflow artifacts. The legacy static promoter
shares its lock and retires once it observes Next in the live Hosting config.
Subsequent Next updates use this same preview/promotion pair. Source workflow
availability alone is not deployment or live acceptance.

The organiser-review index (`reviews: organizerId ASC / createdAt DESC`) is part
of `firestore.indexes.json`, so `Deploy backend` creates it with the rest of the
backend indexes. Production website promotion refuses a missing or unfinished
index.
