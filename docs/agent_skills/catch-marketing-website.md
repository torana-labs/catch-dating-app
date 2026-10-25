# catch-marketing-website

Use when changing the public marketing website, organizer directory/listing
routes, public SEO metadata, marketing media, shared React web config, or
marketing website CI.

Read: `docs/marketing_website_architecture.md`,
`docs/web_surface_architecture.md`,
`docs/marketing_landing_page_research.md`,
`docs/marketing_app_media_pipeline.md`, `website/README.md`,
`packages/web-config/README.md`, `design/website/routes.json`, and
`design/website/components.json`.

Loop:

1. Optionally print scoped orientation before editing:
   `node tool/agent/context_pack.mjs --task marketing-website --paths website,packages/web-config,tool/marketing,design/website,.github/workflows/marketing-website.yml`.
2. Use `docs/marketing_website_architecture.md` for source layout,
   page/controller/component boundaries, and refactor order.
3. Update `design/website/routes.json` before changing public route, metadata,
   static-output, sitemap, robots, generated listing, or review-state behavior.
4. Update `design/website/components.json` before changing component ownership,
   CSS ownership, or Storybook route/section coverage.
5. Run the route and component contract checks before visual/component review:
   `node tool/run.mjs check marketing:website-routes`.
   `node tool/run.mjs check marketing:website-components`.
6. Run the shared React architecture-boundary gate before handoff:
   `node tool/run.mjs check web:react-architecture-boundaries`.
7. Run the shared React primitive gate before handoff:
   `node tool/run.mjs check web:react-ui-lint`.
8. Run the shared React component-family gate before handoff:
   `node tool/run.mjs check web:react-component-governance`.
9. Run the marketing typecheck/build loop for behavior changes:
   `npm --workspace catch-marketing run typecheck` and
   `npm --workspace catch-marketing run build`.
9. Run `npm --workspace catch-marketing run build:storybook` when Storybook
   stories, component registry entries, or route/section composition changed.
10. Keep website source-of-truth docs, tool manifest entries, CI path filters,
   and executable regression guards current when enforcement changes. Preserve
   execution proof in Git and CI rather than a tracked execution history.

Current route-first contract: public route ownership lives in
`design/website/routes.json`, is validated by
`tool/marketing/check_website_routes.mjs`, and is enforced in the marketing
workflow before the production build.

Current component-first contract: component ownership lives in
`design/website/components.json`, is validated by
`tool/marketing/check_website_components.mjs`, and attaches route and section
Storybook coverage to the same route ids rather than creating a second
independent website inventory. The first coverage layer is route plus sections,
not small reusable component atoms. Generated organizer listing coverage starts
with the route family and major sections; add smaller atoms only after the route
and section states have checked coverage.

Current React primitive contract: production drawing belongs in `@catch/web-ui`.
The shared ESLint UI preset ratchets existing raw markup and JSX drawing props
with exact app suppressions that may only shrink. Table/image families wait
for styled components under D17. Story/test controls retain their shared-owner
boundary. Inline allow markers do not bypass the preset.

Current React component-family contract: governed component shells must be
routed through shared website primitives. The first enforced families are the
retired website legacy site barrel/import boundary, data
tables, form shells, admin editor section/form shells, admin layout span classes, admin eyebrow labels, admin card/stat layout shells, admin marketing studio shell/tabs, admin marketing post-board shells, admin marketing composer flow shells, admin marketing picker list/row shells, admin marketing feature-shot grid/card shells, admin marketing brand-contract shells, admin marketing help/compliance text/list shells, admin marketing event-library grid/card/link shells, admin marketing media-library grid/card shells, admin marketing new-post grid/card shells, admin marketing guide shells, admin marketing stacked-section shells, admin marketing app-media shells, admin marketing field shells, admin marketing layout shells, admin diff list shells, admin publishing utility primitives, admin event supply shells, admin selected table rows, admin marketing tag rows, admin marketing query lists, admin marketing slide editor/list shells, admin marketing recommendation list/item shells, admin marketing audit list/row shells, admin feature-drop feature editor/list shells, admin feature-drop controls/preview shells, admin marketing preview/export shells, admin marketing carousel preview shells, admin marketing image editor shells, admin guardrail lists, admin intake source lists, admin intake gate lists, admin intake decision shells, admin intake workspace shells, admin organizer intake curation shells, admin overview queue shells, admin overview analytics shells, field-layout grids, website organizer filter rails, and
admin empty-state variants including marketing empty states, admin app-shell status
displays, admin app/auth shells, admin intake/status chips, admin quality rows, admin quality lists, admin roadmap lists, and website stat/chip/capture-grid/capture-card/card-grid rails plus empty-state variants,
status displays, badge/status rows, identity display shells, process status panels, UI label spans, section headings, action groups, control rows, waitlist/application sections, waitlist form shells, configured success grids, claim shells, claim-flow route/root/auth-row shells, content grids, panel shells, product shells, row/list shells, page shells, Host Preview route shells, Host Page route shells, Host Application flow shells, Host feature section shells, marketing section shells, marketing info-card shells, marketing loop-list shells, marketing consent banner shells, featured organizer card shells, app-download CTA group/shells, organizer listing shells, organizer listing hero shells, organizer listing review shells, organizer listing claim shells, organizer listing card-grid shells, organizer listing event section shells including event-action cards, organizer listing source ledger shells, organizer search section shells, organizer search result shells, and search-form shells, and the retired public-search and public event-card shells; feature, app, and Storybook code must not
render raw table, admin workbench table class, form, admin editor section/form shell, admin span-2 layout class, admin intake-eyebrow label class, admin marketing-card/stat layout class, admin marketing composer/step layout class, admin marketing picker list/row class, admin marketing feature-shot grid/card class, admin marketing brand-contract class, admin marketing help/compliance class, admin marketing event-library class, admin marketing media-library class, admin marketing new-post class, admin marketing guide shell class, admin marketing stacked-sections class, admin marketing app media class, admin marketing field class, admin marketing-grid/panel/section/title-input/edit-grid layout class, admin diff-list/diff-row layout class, admin publishing-loadbar/surface-preview/muted-cell class strings, admin event-supply/admin-panel action shell class strings, admin selected-row table class strings, admin directory/detail screen class, field-grid, organizer filter rail, stat/metric strip,
chip/label rail, capture-grid, capture-card, card-grid, website empty-state variant, website live-status,
website route-loading, website status-badge, review-signal-badge,
listing-badge-row, website activity-mark/profile-strength shell, website process-status-panel shell, website ui-label span, website section-heading shell, website action-group shell, website control-row shell, website waitlist-section shell, website waitlist form shell, website configured Event Success grid shell, website claim shell, website claim-flow route/root/auth-row shell, website content-grid shell, website panel shell, website event-ticket slot, website product shell, website product-module-grid/card shell, website host-create mock shell, website row/list shell, website search-form shell, public-search slot, direct public-search slot composition, public-event-card shell,
website Host Preview route shell including main, hero, offer, section, and apply wrappers,
website Host Page route shell,
website Host Application flow shell,
website Host feature section shell,
website marketing section shell,
website marketing reveal article/info-card shell,
website marketing loop-list shell,
website marketing consent banner shell,
website featured organizer card shell,
raw website app-download CTA and store-button shells (retired in CAT-218),
website organizer listing shell,
website organizer listing hero shell,
website organizer listing review shell including review-signal and owner-response shells,
website organizer listing claim shell,
website organizer listing card-grid shell,
website organizer listing event section shell including event-action-card shells,
website organizer listing source ledger shell,
website organizer search section shell,
website organizer search result shell,
website legacy `components/site` import or recreated barrel,
admin empty-state variants, marketing-empty-state class pass-through, admin app-shell status/loading shell,
admin app/auth shell class,
admin intake workspace shell class, admin organizer intake curation shell class, admin overview queue shell class, admin overview analytics shell class,
admin intake-badge shell, admin quality-row shell, admin quality-list shell, or admin roadmap-list shell unless a temporary
`react-component-governance-allow: <debt-id>` override is present and tracked.

Storybook stories that render query-backed website sections must wrap them in
`WebsiteQueryProvider`, matching the production React root in
`website/src/main.tsx`. Do this in the story when the global preview does not
provide the runtime wrapper.

Failure modes to avoid: route metadata drifting from postbuild output, generated
organizer URLs changing without contract review, `noindex`/canonical behavior
hydrating differently from static HTML, CI building after silently mutating
generated listings, component review beginning before public routes have an
owned contract, Storybook stories drifting from `design/website/components.json`,
query-backed route or section stories rendering outside the website Query
provider, feature code hand-rolling native interactive controls instead of
using shared primitives, or raw governed component shells such as featured
organizer card shells instead of shared component-family primitives, or
passing governed route-shell class names through generic primitives instead of
adding a named shared wrapper, or recreating/importing
`website/src/components/site.tsx` instead of importing from `shared/site`,
`shared/ui/primitives`, or a feature-owned adapter.
