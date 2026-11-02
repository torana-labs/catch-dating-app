---
doc_id: agent_skills
version: 1.5.0
updated: 2026-08-07
owner: agent_operating_model
status: active
---

# Agent Skills

These are project-local workflow routers for Catch. They are intentionally
shorter than global Codex or Claude skills. Their job is to route agents to the
right owner docs and existing checks for repeated Catch work.

`skills_manifest.json` is the machine-readable source. The markdown files are
human-readable copies for quick review.

Each router names mandatory owner documents and checks. It may also show an
optional `context_pack.mjs --paths ...` command for stdout-only orientation;
running that command is never a prerequisite for work.

Validate this folder with:

```sh
node tool/run.mjs check agent:context-pack
```

Do not add broad doctrine here. Add durable architecture decisions to the owner
docs and reference them from the manifest.

Document workflow routers use `AGENTS.md`, source frontmatter, and explicit
owner-doc mappings. There is no document-summary or version registry.

Repository tooling and automation under `tool/` route through
`catch-tooling-automation.md`. That router keeps script ownership, exact impact
routing, checkout/setup requirements, focused tests, manifest validation, and
CI proof in one workflow instead of falling back to documentation hygiene.

Marketing website work routes through `catch-marketing-website.md` so public
routes, generated organizer listings, static metadata, CI, and route-review
states stay aligned before component-first review begins.

Cross-React work for `website/`, `admin/`, and shared web tooling routes
through `catch-react-surface-refactor.md`. Use it when the change affects
React routing, feature structure, TanStack Query/controller conventions, shared
UI primitives, Storybook/component coverage, admin boundaries, or React
scanners. That skill owns both React UI primitive enforcement and governed
component-family enforcement, currently including data tables, admin workbench tables, form shells,
admin editor section/form shells, admin layout span classes, admin eyebrow labels, admin card/stat layout shells, admin marketing studio shell/tabs, admin marketing post-board shells, admin marketing composer flow shells, admin marketing picker list/row shells, admin marketing feature-shot grid/card shells, admin marketing brand-contract shells, admin marketing help/compliance text/list shells, admin marketing event-library grid/card/link shells, admin marketing media-library grid/card shells, admin marketing new-post grid/card shells, admin marketing guide shells, admin marketing stacked-section shells, admin marketing app-media shells, admin marketing field shells, admin marketing layout shells, admin diff list shells, admin publishing utility primitives, admin event supply shells, admin selected table rows, admin marketing tag rows, admin marketing query lists, admin marketing slide editor/list shells, admin marketing recommendation list/item shells, admin marketing audit list/row shells, admin feature-drop feature editor/list shells, admin feature-drop controls/preview shells, admin marketing preview/export shells, admin marketing carousel preview shells, admin marketing image editor shells, admin guardrail lists, admin intake source lists, admin intake gate lists, admin intake decision shells, admin intake workspace shells, admin organizer intake curation shells, admin overview queue shells, admin overview analytics shells, field-layout grids, admin summary metrics, admin workbench toolbars, admin directory/detail screen shells, admin workbench layouts, admin utility shells, admin command lists, admin intake tag lists, admin intake section/search-candidate shells, admin intake state grids, admin row/tag cell shells, admin roadmap lists, admin status displays, admin filter bars, admin empty states including marketing
empty states, admin app-shell status displays, admin app/auth shells, admin intake/status chips,
admin quality rows, admin quality lists, website organizer filter rails, website stat strips, website chip rails, website
capture grids/cards, website card grids, website empty-state variants, website status
displays, website badge/status rows, website identity display shells, website process status panels, website UI label spans, website section headings, website action
groups, website control rows, website waitlist/application sections, website waitlist form shells, and
website configured success grids, website claim shells, website claim-flow route/root/auth-row shells, website content grids, and
website panel shells, website product shells including product-module grids, website row/list shells, website page shells,
Host Preview route shells, Host Page route shells, Host Application flow shells,
Host feature section shells, marketing section shells, marketing info-card shells, marketing loop-list shells, marketing consent banner shells, featured organizer card shells, raw app-download CTA and store-button shells (retired in CAT-218),
organizer listing shells, organizer listing hero shells, organizer listing review shells,
organizer listing claim shells, organizer listing intro shells, organizer listing card-grid shells,
organizer listing event section shells including event-action cards, organizer listing source ledger shells,
organizer search section shells,
organizer search result shells, and search-form shells, the retired public-search and public event-card
shells, and
the retired website legacy site barrel/import boundary.
Admin feature UI exports are part of this same boundary: route/workspace entry
components may be exported from `admin/src/features/**`, while reusable panels,
cards, lists, badges, and sections must live under `admin/src/shared/ui` or stay
private in their feature file. Admin route/workspace entries, shared admin
primitives, and admin feedback providers are registered in
`design/admin/components/` and checked by `web:admin-components`. Admin
preview-ready entries are backed by Storybook exports under `admin/src/stories`
and verified by `web:admin-storybook`.
