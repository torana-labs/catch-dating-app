---
doc_id: project_context
version: 3.1.3
updated: 2026-10-29
owner: agent_operating_model
status: active
---

# Catch Project Context

This is an orientation map, not a detailed contract. Follow [AGENTS.md](AGENTS.md), then use [docs/README.md](docs/README.md) to find the owning document before changing behavior.

## Product

Catch combines social events and dating. Consumers discover clubs and events, book or join a waitlist, attend, review event experiences, browse eligible profiles, match, and chat. Hosts create and operate clubs/events. Internal operators use a separate admin console for intake, moderation, finance, and operational workflows.

The product is India-first. Canonical market identity and fallback labels are
owned in `lib/kernel/city_catalog.dart`, while Firestore-backed launch metadata is
exposed through `CityRepository`; do not add free-form city identity logic in
features.

## Repository surfaces

| Surface | Primary source | Owner document |
|---|---|---|
| Consumer and host Flutter apps | `apps/consumer/`, `apps/host/`, shared `lib/` | [docs/app_architecture.md](docs/app_architecture.md) |
| Firestore/data contracts | `contracts/`, `firestore.rules`, `storage.rules` | [docs/data_contracts.md](docs/data_contracts.md) |
| Cloud Functions | `functions/src/` | [docs/backend_operation_catalog.md](docs/backend_operation_catalog.md) |
| Marketing website | `website/` | [docs/marketing_website_architecture.md](docs/marketing_website_architecture.md) |
| Admin console | `admin/` | [docs/web_surface_architecture.md](docs/web_surface_architecture.md) |
| Design system and Widgetbook | `lib/platform/theme/`, `lib/core/widgets/`, `widgetbook/` | [docs/design_language.md](docs/design_language.md), [docs/widget_catalog.md](docs/widget_catalog.md) |
| Firebase environments | `firebase/`, `.firebaserc`, `firebase.json` | [firebase/README.md](firebase/README.md) |
| CI and release operations | `.github/`, `tool/ci/`, `tool/platform/` | [docs/release_operations.md](docs/release_operations.md) |
| Governed automation | `tool/` | [tool/README.md](tool/README.md) |

## Runtime architecture

Flutter code is organized into bounded contexts placed by `tool/architecture/context_map.json` (see the Bounded Context Contract in [docs/app_architecture.md](docs/app_architecture.md#bounded-context-contract)). Screens compose feature-owned controllers/providers, repositories own remote access, and shared UI belongs in canonical `Catch*` primitives when the concept repeats. `apps/<role>/lib/main*.dart` entrypoints build each application shell through `lib/app_bootstrap.dart`; route, authentication, onboarding, force-update, and role gates determine the visible feature graph.

Firebase Auth is phone-first. Profile creation is an onboarding responsibility, not an incidental auth side effect. Firestore is the operational store; callable Functions own privileged mutations and cross-document invariants. Generated schemas/types keep app, Functions, rules, admin, and website boundaries aligned.

The React marketing and admin apps are separate deployable products. They share web configuration and governance but not a runtime. Marketing owns anonymous, SEO-sensitive pages. Admin owns authenticated internal operations. A future external host portal should remain separate from the internal admin domain.

## Major user journeys

1. Phone authentication and onboarding establish the canonical user profile.
2. Discovery surfaces clubs, events, and eligibility-aware recommendations.
3. Booking handles inventory, payment, waitlist, and attendance state through server-owned operations.
4. Event operations cover host setup, participant cohorts, check-in, safety, and Event Success workflows.
5. Eligible attendees can enter dating discovery, express interest, match, and chat.
6. Reviews and feedback remain event-scoped and preserve identity/privacy policy.
7. Profile and photo flows use the shared media pipeline, moderation, and thumbnail contracts.

Feature routes and implementation details change frequently; inspect the feature folder and [docs/app_architecture.md](docs/app_architecture.md) rather than copying a static route list from this file.

## Data and backend boundaries

- Treat [docs/data_contracts.md](docs/data_contracts.md) as the source of truth for collection shape, denormalized fields, indexes, and rules alignment.
- Treat [docs/backend_operation_catalog.md](docs/backend_operation_catalog.md) as the source of truth for callable ownership, authentication, authorization, App Check, rate limiting, idempotency, and side effects.
- Run `./tool/check_data_contract.sh` whenever contracts, rules, indexes, or Functions write behavior changes.
- Never create a second client-side write path for a server-owned invariant.
- Review identity is event-scoped; attendance is explicit operational state, not inferred merely from booking.
- Keep external event evidence separate from canonical Catch-bookable events until an explicit import contract exists.

## UI and state boundaries

- Shared tokens live under `lib/platform/theme/`; avoid feature-local color, type, spacing, and radius systems.
- Repeated Flutter concepts converge on shared `Catch*` primitives and Widgetbook coverage.
- Screens render controller state and dispatch explicit actions; repositories translate infrastructure failures into the shared error model.
- React website/admin features compose their owning shared primitives and obey the boundary scanners documented in [docs/web_surface_architecture.md](docs/web_surface_architecture.md).
- Accessibility, loading, empty, error, disabled, and success states are part of a component contract, not optional polish.

## Environments and releases

Firebase aliases are `dev`, `staging`, and `prod`; the local default is `dev` as a guardrail, but all remote commands must still name an environment through `tool/firebase_with_env.sh`. Flutter environment definitions live under `tool/env/` and checked Firebase app files live under `firebase/<environment>/`.

Public web surfaces deploy independently:

- `catchdates.com` from `website/dist` (`marketing` target)
- `app.catchdates.com` from `apps/consumer/build/web` (`app` target)
- `admin.catchdates.com` from `admin/dist` (`admin` target)

Use [docs/release_operations.md](docs/release_operations.md) for exact CI, signing, deployment, TestFlight, Xcode Cloud, rollback, observability, and smoke-test procedures. Do not infer production verification from code wiring alone.

## Generated and local-only content

Generated artifacts must have a named source and drift check. The tool manifest at `tool/tools_manifest.json` owns runnable automation. The root manifest at `tool/repository_root_manifest.json` classifies every allowed root entry.

Common local-only state includes build outputs, package caches, IDE metadata, emulator exports, debug logs, `.env*`, and `.claude/worktrees/`. Inspect or clean regenerable state with `node tool/repository_hygiene.mjs`; never use a broad `git clean` command. Curated visual evidence follows [artifacts/README.md](artifacts/README.md).

## Verification map

| Change | Minimum focused gate |
|---|---|
| Flutter feature/controller/UI | focused `flutter test`, focused `dart analyze`, relevant scanner |
| Contract/rules/Functions write | `./tool/check_data_contract.sh` plus focused Functions/rules tests |
| React website/admin | owning typecheck/build and React boundary gates |
| Design-system primitive | Widgetbook/contract coverage and design checks |
| Tooling | manifest entry, self-test or seeded failure, `node tool/run.mjs check --manifest-only` |
| Cleanup/refactor | read-only change plan, focused checks, `git diff --check`, CI proof |

The generated inventory and canonical commands are in [TESTS.md](TESTS.md). Do not maintain competing test lists in feature docs.

## Sharp edges

- Each app project's platform Firebase files are mutable outputs of environment switching. Use the checked environment wrapper and verify app targets before release. The repository root has no native platform projects; `tool/repository_root_manifest.json` rejects new ones.
- Firestore indexes are repository-managed; missing-index errors should result in an index change and contract check, not an ad hoc console-only fix.
- Cross-surface DTOs should come from generated contracts, not parallel handwritten types.
- Public organizer evidence does not automatically create app-bookable inventory.
- Host, consumer, admin, and marketing roles have different authorization and deployment boundaries even when they share concepts.
- Historic audit snapshots describe their date, not current truth. Prefer
  current owner docs, source contracts, and live checks.

## Working loop

1. Check `git status --short` and preserve unrelated work.
2. Read the owning source-of-truth document. For broad work, inspect
   `node tool/harness.mjs plan --base <base> --head HEAD --json`; optionally ask
   `node tool/agent/context_pack.mjs --task <label> --paths <paths>` for
   owner-doc and check guidance on stdout.
3. Make the smallest coherent change at the owning boundary.
4. Add or update enforceable coverage when the rule can recur.
5. Run focused checks and `git diff --check`; let Git and CI preserve the
   result.
6. Do not recreate the removed audit inventory, pass history, documentation
   catalog, or regression snapshots.

When this map disagrees with a narrower owner document, the narrower active owner document wins and this map should be corrected.
