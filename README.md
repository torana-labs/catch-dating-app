---
status: active
---

# Catch

Catch is a Flutter dating and social-events product with Firebase backends, a React marketing site, and a separate React admin console.

## Start here

- [AGENTS.md](AGENTS.md): required agent workflow and source-of-truth routing.
- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md): concise product and repository map.
- [docs/README.md](docs/README.md): canonical documentation index.
- [lib/README.md](lib/README.md): Flutter feature ownership map.
- [firebase/README.md](firebase/README.md): Firebase environment setup.
- [functions/README.md](functions/README.md): Functions architecture and security.
- [TESTS.md](TESTS.md): maintained test strategy and common test commands.
- [docs/release_operations.md](docs/release_operations.md): build, signing, deploy, and release runbook.

## Local setup

Requirements are pinned in `tool/ci/toolchain.env`. Install Flutter, Node, Java, Firebase CLI, Xcode/CocoaPods for Apple builds, and Android Studio/SDK for Android builds.

```sh
flutter pub get
npm ci
npm --prefix functions ci
cp .env.example .env.local
```

For routine local web development, start `npm --prefix functions run serve`,
then use the `local` Flutter commands below in another terminal. This runs
against the isolated `demo-catch` emulator suite. Use `dev` explicitly for native
devices and live integrations. Every deployment or remote log command must name
an environment through `tool/firebase_with_env.sh`; see [firebase/README.md](firebase/README.md).

## Main surfaces

| Surface | Source | Typical local command |
|---|---|---|
| Flutter consumer app | `apps/consumer/` + shared `lib/` | `./tool/flutter_with_env.sh local --role consumer run -d chrome` |
| Flutter host app | `apps/host/` + `lib/hosts/` | `./tool/flutter_with_env.sh local --role host run -d chrome` |
| Marketing website | `website/` | `npm run web:marketing:dev` |
| Admin console | `admin/` | `npm run web:admin:dev` |
| Cloud Functions | `functions/` | `npm --prefix functions run serve` |
| Widgetbook | `widgetbook/` | `cd widgetbook && flutter run -d chrome` |

The folders separate runtime code from its contracts and tooling:

- `apps/consumer/` and `apps/host/` own installable app shells and native projects;
  `lib/` owns shared Flutter runtime code, features, and generated Dart bindings.
- `website/` and `admin/` are React applications. `packages/web-ui/` owns their
  shared UI primitives; `packages/web-config/` owns shared web configuration.
- `functions/` owns Firebase backend code. `operations/` owns durable operations
  workflows, rather than one-off scripts.
- `contracts/` owns business and data schemas. `design/` owns visual tokens,
  component/screen contracts, and reference assets. Their generated projections
  are checked against these authored sources.
- `widgetbook/` previews Flutter components. `packages/catch_ui_lints/` implements
  analyzer rules; it is tooling, not another UI application.
- `.github/workflows/` orchestrates CI and delivery. `tool/harness/` selects
  affected lanes; `tool/manifest/` registers checks, one file per tool; the other `tool/`
  folders contain their implementations and bounded operational utilities.
- `docs/` contains the owning architecture and operations documents linked above.

## Core checks

```sh
node tool/harness/verify_local.mjs --base origin/main --list
node tool/ci/check_flutter_workspace_analysis.mjs
flutter test
npm --prefix functions test
npm run web:typecheck
node tool/run.mjs check --manifest-only
```

Use `node tool/run.mjs list` to discover governed checks. Data-contract changes must also run `./tool/check_data_contract.sh`.
Use `node tool/harness.mjs plan --base origin/main --head HEAD --json` to plan
product lanes and `node tool/run.mjs affected-tools --base origin/main --check`
to select tool checks. Both fail closed when their own ownership contracts are
incomplete.

## Repository housekeeping

Inspect regenerable disk usage without deleting anything:

```sh
npm run repo:hygiene
```

Apply only an explicit scope, for example:

```sh
node tool/repository_hygiene.mjs --apply --scope logs
```

The cleaner is manifest-backed, refuses tracked/protected paths and symlinks, and never invokes `git clean`. See [artifacts/README.md](artifacts/README.md) for evidence retention.

## Secrets and releases

Never commit `.env`, `.env.local`, service-account JSON, signing keys, provisioning profiles, or App Store credentials. `.env.example` documents names only.

Do not deploy with bare `firebase deploy`. Use the guarded environment wrapper and the ordering in [docs/release_operations.md](docs/release_operations.md). Release readiness, signing identity, TestFlight, App Check, and smoke-test evidence live there rather than in this README.
