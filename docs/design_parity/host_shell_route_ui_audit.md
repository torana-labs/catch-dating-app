---
doc_id: host_shell_route_ui_audit
version: 1.2.0
updated: 2026-08-31
owner: design_parity_review
status: active
---

# Host shell route UI audit

This is the extensible, source-backed UI-composition matrix for the primary
Host shell routes. Checklist items are rows; audited pages are columns. To add
a route, add one page column, its evidence block, and any new findings. Do not
fork the checklist for a new page.

The current matrix follows the corrective Host information architecture on
`codex/host-visual-quality-rollout-20260831`. It is source and local-runtime
evidence, not a merge, deployment, or distribution receipt.

## Verdicts

| Mark | Meaning |
|---|---|
| ✅ | Conforms in inspected source and captured states |
| ◐ | Partially conforms, or a decision/risk remains |
| ❌ | Confirmed inconsistency or defect |
| ⏺ | Not applicable to this page |
| ◌ | Not exercised in this audit; do not infer a pass |

Issue references such as `HSA-001` point to the findings below. A terse cell is
intentional: the matrix should remain scannable as page columns are appended.

## Matrix

| Checklist | Today | Events | Audience | Inbox | Organizer |
|---|---|---|---|---|---|
| **SHELL-01 · One production route body inside the shared Host shell** | ✅ `/host/today` | ✅ `/host/events` | ✅ `/host/audience` | ✅ `/host/inbox` | ✅ `/host/organizer` |
| **SHELL-02 · Correct destination order, selection, and organizer identity** | ✅ shared five-destination contract | ✅ shared five-destination contract | ✅ shared five-destination contract | ✅ shared five-destination contract | ✅ identity remains route-owned |
| **HEADER-01 · Page owns one title/top-bar hierarchy** | ✅ operational title | ✅ inventory title + Create | ✅ one Audience title + shared mode rail | ✅ explicit Host browse presentation | ✅ tabbed scaffold |
| **SCROLL-01 · Exactly one page scroll owner with terminal shell clearance** | ✅ sliver root + terminal padding | ✅ sliver root + terminal padding | ✅ one controller per local mode | ✅ sliver root + terminal padding | ✅ one controller per tab |
| **RESP-01 · Compact, medium, and expanded composition is intentional** | ✅ bounded operational workspace | ✅ coherent inventory workspace | ✅ customer index/detail and bounded Forms lane | ✅ expanded inbox/detail; Sends stays single-lane | ✅ bounded editor workspace |
| **GUTTER-01 · Page gutters and content-width constraints have one owner** | ✅ page/sliver owns lanes | ✅ page/sliver owns lanes | ✅ mode page owns its lane | ✅ page/sliver owns lanes | ✅ tabbed page constrains width |
| **SECTION-01 · Contained/divided/plain treatment follows semantic role** | ✅ operational modules earn surfaces | ✅ lifecycle rows stay flat | ✅ CRM and form directories stay flat | ✅ flat context rails + thread rows | ✅ field sections use canonical variants |
| **SECTION-02 · Containment depth stays at one visible border** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SECTION-03 · Headers, kickers, counts, and dividers share one geometry** | ✅ | ✅ | ✅ | ✅ | ✅ populated headers reflow their trailing action |
| **FIELD-01 · Rows/fields own capability geometry; parent owns list frame** | ✅ attention rows | ✅ lifecycle rows | ✅ customer/form divided rows | ✅ thread rows | ✅ canonical `CatchField` lanes |
| **RHYTHM-01 · Vertical spacing distinguishes hierarchy without card soup** | ✅ | ✅ | ✅ borders have distinct jobs | ✅ | ✅ |
| **ACTION-01 · One clear primary action per hierarchy level** | ✅ immediate event action | ✅ Create plus row-local lifecycle action | ◐ People header, sort, filter, and campaign actions compete | ✅ | ✅ |
| **SEARCH-01 · Search/filter/menu placement matches its scope** | ⏺ | ⏺ | ✅ mode-aware top-bar search + body filters | ✅ top-bar search + workspace rails | ⏺ |
| **STATE-01 · Loading, empty, error, offline, and retry preserve the same shell** | ✅ source-backed | ✅ source-backed | ✅ source-backed | ✅ source-backed | ✅ source-backed |
| **MOTION-01 · Focus, selection, tab, and route transitions are coherent** | ◌ | ◌ | ◐ local tab and retained-draft tests exist | ◐ workspace transitions source-only | ◐ tabs/editor reveal source-only |
| **A11Y-01 · 200% text scale reflows without clipping or overflow** | ✅ spotlight stacks and wraps | ✅ inventory rows wrap | ✅ full title; scrollable four-mode rail | ✅ full title; semantic icon-only dock | ✅ title and populated headers reflow |
| **A11Y-02 · Labels, targets, and light/dark contrast remain legible** | ◐ shared primitives; visual check only | ◐ shared primitives; visual check only | ◐ shared primitives; visual check only | ◐ shared primitives; visual check only | ◐ shared primitives; visual check only |
| **ARCH-01 · Component boundaries expose ownership instead of a screen monolith** | ✅ shared operations state + focused section | ✅ shared operations state + inventory section | ✅ shared rail + focused CRM/Form route bodies | ✅ explicit browse role + page-owned workspace | ✅ route/scaffold/edit modules split |
| **GOV-01 · Widgetbook/capture/catalog use production widgets and current routes** | ✅ executable shell coverage | ✅ executable shell coverage | ✅ executable shell coverage | ✅ executable shell coverage | ✅ executable shell coverage |

## Findings

All eight confirmed findings are resolved. The matrix retains `◐` and `◌` for
questions that were not defects in this pass, such as automated contrast and
end-to-end motion; they are not silently promoted to passes.

### HSA-001 · Events spotlight overflows at 200% text — resolved

`HostEventOperationalSpotlight` now stacks event metadata and wraps its
metrics/action group at large text. The 200% production-widget capture
completes without overflow.

### HSA-002 · Organizer media header does not reflow at 200% text — resolved

The populated `CatchSection` header contract now moves trailing actions below
the title/count lane at large text. The Organizer title also supports its
reviewed two-line form, so neither the page nor section identity is destroyed.

### HSA-003 · The five-destination shell needs a large-label policy — resolved

Medium navigation widens and uses horizontal labelled destinations. Compact
bottom navigation uses equal 48 px icon-only destinations at large text while
preserving each full semantic label; labels return in rail/sidebar layouts.

### HSA-004 · Customers uses a different whole-view search grammar — resolved

Directory-wide search now uses the typed `CatchTopBarSearch` contract. Sort and
filters remain body-owned because their scope is the current result set.

### HSA-005 · Wide Customers and Messages have no pane-composition rule — resolved

The shared `CatchMasterDetailLayout` gives Customers and the Messaging inbox a
URL-backed expanded index/detail workspace. Compact and medium widths retain
single-task navigation. Messaging campaigns remain intentionally single-lane.

### HSA-006 · Messaging header behavior depends on global app role — resolved

`ChatsBrowsePresentation` is now required. Host and consumer callers state the
presentation explicitly, and a regression test proves global role mutation
cannot alter an explicitly consumer header.

### HSA-007 · Customers mixes too many composition layers in one file — resolved

Route orchestration, directory composition, editor sheets, and detail cards
now live in focused part files. The page remains the owner of selection and
responsive pane composition without changing its public route API.

### HSA-008 · Host coverage metadata and capture routing drifted — resolved

The manifest is now the compact `catch.host-shell-coverage/v2` contract. The
registered `design:host-shell-coverage` check derives the five ordered shell
destinations from production source, cross-checks routes and canonical
captures, validates production source paths, and rejects the legacy Host home
route as a primary destination. Its tests include a vacuity guard.

## Finding closure and enforcement

| Finding | Status | Regression evidence |
|---|---|---|
| `HSA-001` | ✅ Resolved | Events production-widget test + 200% capture |
| `HSA-002` | ✅ Resolved | populated section-header reflow test + Organizer 200% capture |
| `HSA-003` | ✅ Resolved | shell breakpoint tests + large-text tab-bar semantics test |
| `HSA-004` | ✅ Resolved | Customers top-bar search behavior test |
| `HSA-005` | ✅ Resolved | expanded Customers/Messaging tests + tablet captures |
| `HSA-006` | ✅ Resolved | explicit browse-presentation tests |
| `HSA-007` | ✅ Resolved | focused source boundaries + analyzer |
| `HSA-008` | ✅ Resolved | registered coverage check + three checker tests |

## Page evidence

The capture IDs below instantiate the canonical production shell and route
widgets with deterministic provider fixtures. Generated PNGs are local,
ignored artifacts; rerun the commands rather than treating the PNG directory
as source authority.

| Page | Route | Production widget | Capture ID | Primary source |
|---|---|---|---|---|
| Today | `/host/today` | `HostTodayScreen` | `host_home_dashboard` | `lib/hosts/today/presentation/host_today_screen.dart` |
| Events | `/host/events` | `HostEventsScreen` | `host_home_events_list` | `lib/hosts/events/presentation/host_events_screen.dart` |
| Audience | `/host/audience` | `HostCustomersScreen` / `HostFormsScreen` | `host_customers_populated`, `host_forms_populated` | `lib/hosts/presentation/host_audience_view.dart` |
| Inbox | `/host/inbox` | `HostInboxScreen` | `host_inbox_queries` | `lib/hosts/presentation/inbox/host_inbox_screen.dart` |
| Organizer | `/host/organizer` | `HostOrganizersScreen` | `host_clubs_management` | `lib/hosts/presentation/host_operations/host_organizers_scaffold.dart` |

Reproducible capture contexts:

```sh
node tool/ui_capture/run_captures.mjs \
  --ids host_home_dashboard,host_home_events_list,host_customers_populated,host_forms_populated,host_inbox_queries,host_clubs_management \
  --device claude-phone-390x812 \
  --output-dir artifacts/ui-captures/host-shell-audit/phone

node tool/ui_capture/run_captures.mjs \
  --ids host_home_dashboard,host_home_events_list,host_customers_populated,host_forms_populated,host_inbox_queries,host_clubs_management \
  --device audit-medium-700x1000 \
  --output-dir artifacts/ui-captures/host-shell-audit/medium

node tool/ui_capture/run_captures.mjs \
  --ids host_home_dashboard,host_home_events_list,host_customers_populated,host_forms_populated,host_inbox_queries,host_clubs_management \
  --device audit-tablet-1024x1366 \
  --output-dir artifacts/ui-captures/host-shell-audit/tablet

node tool/ui_capture/run_captures.mjs \
  --ids host_home_dashboard,host_home_events_list,host_customers_populated,host_forms_populated,host_inbox_queries,host_clubs_management \
  --device claude-phone-390x812 \
  --text-scale 2.0 \
  --output-dir artifacts/ui-captures/host-shell-audit/text-scale-2
```

All four runs pass. The 200% run is also visually reviewed because a successful
Flutter render alone does not detect destructive ellipsis or weak reflow.

## Visual baseline

### Compact, light

| Today | Events | Audience | Inbox | Organizer |
|---|---|---|---|---|
| ![Today compact](../../artifacts/ui-captures/host-shell-audit/phone/host_home_dashboard/light.png) | ![Events compact](../../artifacts/ui-captures/host-shell-audit/phone/host_home_events_list/light.png) | ![Audience compact](../../artifacts/ui-captures/host-shell-audit/phone/host_customers_populated/light.png) | ![Inbox compact](../../artifacts/ui-captures/host-shell-audit/phone/host_inbox_queries/light.png) | ![Organizer compact](../../artifacts/ui-captures/host-shell-audit/phone/host_clubs_management/light.png) |

### Expanded, light

| Today | Events | Audience | Inbox | Organizer |
|---|---|---|---|---|
| ![Today expanded](../../artifacts/ui-captures/host-shell-audit/tablet/host_home_dashboard/light.png) | ![Events expanded](../../artifacts/ui-captures/host-shell-audit/tablet/host_home_events_list/light.png) | ![Audience expanded](../../artifacts/ui-captures/host-shell-audit/tablet/host_customers_populated/light.png) | ![Inbox expanded](../../artifacts/ui-captures/host-shell-audit/tablet/host_inbox_queries/light.png) | ![Organizer expanded](../../artifacts/ui-captures/host-shell-audit/tablet/host_clubs_management/light.png) |

## Evidence limits

- Default, dark, medium, expanded, and 200% text layouts were rendered.
- Loading/empty/error/offline shell preservation was inspected in source, not
  exhaustively screenshot in this pass.
- Tab, focus, pressed, menu, keyboard, route, and animation sequences were not
  interacted through end to end; `MOTION-01` stays unverified or source-only.
- Contrast was judged visually in both themes; no automated WCAG contrast
  measurement was run.
- The audit is an architecture/design assessment, not a production deployment
  or merge receipt.
