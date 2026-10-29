---
status: active
---

# Lib Code Map

Read `PROJECT_CONTEXT.md` first for the whole-app architecture and product
flow. Use `docs/app_architecture.md` as the canonical spec for feature, layer,
screen, controller, repository, async-state, error-surface, and widget
ownership. Use this file to route feature-specific code work without opening
broad audit history.

## Structure

`lib/` is moving to bounded contexts under `lib/contexts/`, with screens in
`apps/<app>/lib/`. `tool/architecture/context_map.json` places every current
folder in a context or layer, and `audit:context-map` fails on code that
imports against the order; read the Bounded Context Contract in
`docs/app_architecture.md` before adding a folder or moving code.

Until each folder moves, most app features follow the same shape:

- `domain`: Freezed models, enums, value objects, and pure domain helpers.
- `data`: repositories, Firebase adapters, and Riverpod providers.
- `presentation`: screens, controllers, widgets, and feature UI state.

Current ownership clarifications:

- Cross-cutting analytics code lives in `core/analytics`, not a top-level
  feature folder.
- Explore-owned search lives in `explore/data`.
- The calendar agenda route lives in `events/presentation/calendar`.
- Chat and host-inbox list UI lives in `chats/presentation/inbox`; `matches`
  owns match lifecycle models/repositories and match-specific presentation.
- Event display helpers and platform seams that are not widgets live in
  `events/domain` or `events/data`; shared event/activity visual primitives
  used by core widgets live in `core/widgets`.

Generated `*.g.dart`, `*.freezed.dart`, and Riverpod outputs live next to their
source files and should not be hand-edited.

## Reusable UI library surface

Import `package:catch_ui/catch_ui.dart` for extracted shared UI and
`package:catch_tokens/catch_tokens.dart` for semantic tokens. During Phase 3,
schema-coupled fields, sections, root-header composition, and form descriptors
still use their focused app imports. The unused app compatibility barrel has
been retired. Renderer scopes, gutter ownership, interaction-plane plumbing, and
contained focus surfaces remain implementation details even when Dart library
boundaries require a public symbol in their defining file. The Catch UI analyzer
plugin rejects feature-level construction of those internals and rejects
field-owned sibling dividers or explicit lane-gutter overrides.

## Feature READMEs

These feature-level docs carry local source-of-truth notes that used to live in
generic audit trackers:

| Area | Read before |
|---|---|
| `lib/event_policies/README.md` | Changing the live event policy bundle, admission, pricing, waitlist, cancellation, settlement, or legacy-document compatibility. |
| `lib/safety/README.md` | Changing blocking, reporting, account deletion, safety rules, or deletion/anonymization behavior. |
| `lib/user_profile/README.md` | Changing private profile identity fields, profile edit UI, public projection inputs, or profile schema migration. |
| `lib/hosts/{today,events,audience,inbox,organizer}/README.md` | Changing a top-level Host destination, its route ownership, code-owner seams, cross-feature handoffs, or migration boundary. These five files are generated from `design/features/host_feature_responsibilities.json`; never edit them directly. |

## Audience documentation pilot

Read [Host Audience](hosts/audience/README.md#product-guide) to answer product
questions about People, saved audiences, Forms, Responses, access, and Inbox
handoffs before expanding into implementation files. Its short answers and
source dependencies are authored in the existing Host responsibility contract;
the reference constraints are selected directly from JSON schemas.

```sh
node tool/design/build_host_feature_responsibilities.mjs --explain audience
node tool/design/build_host_feature_responsibilities.mjs --explain audience --question membership --json
node tool/design/build_host_feature_responsibilities.mjs --affected audience --base origin/main --json
```

The first two commands retrieve the guide without an LLM or a generated search
index. The third reports advisory section impact from both versions of the
explicit dependencies, including working changes. Existing registered generator
checks enforce reference validity and generated-output freshness. They do not
certify the prose, execute linked behavioral examples, or prove deployment.

## Cross-Cutting Docs

- `docs/app_architecture.md`: **canonical Flutter app architecture spec** —
  feature folder shape, dependency direction, screen/controller/repository
  ownership, async state boundaries, error surfaces, UI layout/scroll/sizing
  rules, widget ownership, controller patterns, and enforcement policy.
- `docs/design_language.md`: **visual identity source of truth** — palette, typography,
  activity-color system, photo grading, metaphors, and the UI elevation roadmap.
- `docs/data_contracts.md`: Firestore documents, schema generation,
  relationship documents, migration policy, and rules-test workflow.
- `docs/backend_operation_catalog.md`: which writes are client-owned,
  callable-owned, trigger-owned, or server-only.
- `docs/widget_catalog.md`: widget inventory and reusable component ownership.
- `docs/event_success.md`: live event-success architecture, contracts, QA, and
  product guardrails.

## Edit Policy

Keep business logic out of widgets when a feature controller, repository, or
domain helper already owns it. When changing a feature's persisted shape, update
the JSON schema/contracts first, regenerate outputs, and run the contract gate
documented in `docs/data_contracts.md`.
