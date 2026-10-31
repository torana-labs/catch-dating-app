---
status: active
---

# Firebase Environments

This repo now has a three-environment Firebase workflow:

- `dev`
- `staging`
- `prod`

Two layers need to stay in sync for each environment:

1. Dart Firebase options in `lib/firebase_options_<env>.dart`
2. Native and web Firebase config files under `firebase/<env>/`

## Directory layout

Each environment needs these files:

```text
firebase/<env>/android/google-services.json
firebase/<env>/ios/GoogleService-Info.plist
firebase/<env>/macos/GoogleService-Info.plist
firebase/<env>/web/firebase-messaging-sw.js
```

Host app builds use separate Firebase app registrations so host and consumer
apps can be installed side by side. Add role-specific host configs at:

```text
firebase/<env>/host/android/google-services.json
firebase/<env>/host/ios/GoogleService-Info.plist
firebase/<env>/host/macos/GoogleService-Info.plist
firebase/<env>/host/web/firebase-messaging-sw.js
```

Native builds read these files directly, so no build copies them:

- Each Android flavor has `apps/<role>/android/app/src/<flavor>/google-services.json`,
  a committed link to its file above. The google-services Gradle plugin reads
  the selected flavor's file. Android app identity itself is owned by six explicit
  `consumerDev|consumerStaging|consumerProd|hostDev|hostStaging|hostProd`
  flavors.
- The iOS and macOS "Copy Firebase Environment Config" build phase, written by
  `tool/platform/configure_apple_flavors.rb`, copies the selected
  configuration's plist from `firebase/` into the built app.

Flutter web has no flavors, so `./tool/use_firebase_environment.sh <env>
<consumer|host> apps/<role>` copies the selected registration's
`firebase-messaging-sw.js` into `apps/<role>/web/`. `tool/flutter_with_env.sh`
runs it before every non-local run or build.

Current state:

- `dev` is configured from Firebase project `catchdates-dev`.
- `staging` is configured from Firebase project `catchdates-staging`.
- `prod` is configured from the existing Firebase project `catch-dating-app-64e51`.
- Android product flavors are wired as six first-class app targets across role
  and environment. `tool/flutter_with_env.sh` resolves the exact flavor and
  entrypoint from `tool/app_targets.json`.
- Android upload-key SHA-1/SHA-256 fingerprints are registered on the dev,
  staging, and production consumer and host Firebase Android apps. The
  Android apps' fingerprints and App Check Play Integrity configs are moving
  under Terraform in `infra/firebase`, which adds the Play app-signing
  fingerprints that Play-installed builds need. Change fingerprints there
  through a PR, not in the Firebase console; see
  [`docs/infrastructure_as_code.md`](../docs/infrastructure_as_code.md).
- iOS schemes and build configurations are wired for consumer `dev`,
  `staging`, and `prod` in `apps/consumer/ios`, and host `host-dev`,
  `host-staging`, and `host-prod` in `apps/host/ios`, through
  `tool/platform/configure_apple_flavors.rb`. Only `apps/consumer` has a
  macOS runner, with the consumer flavors; it hosts the native app-shell
  smoke suite.
- Apple builds copy the matching `firebase/<env>/<platform>/GoogleService-Info.plist`
  into the app bundle at build time.
- App Check is registered for Android, iOS/macOS, and web in all three Firebase
  projects. Firestore, Storage, Auth, and callable Functions enforce App Check.
- Storage rules read canonical Firestore match/ownership documents. Every
  environment's Firebase Storage service agent must therefore hold
  `roles/firebaserules.firestoreServiceAgent`; verify all three with
  `node tool/firebase/storage_rules_firestore_iam.mjs --all`. Storage deploys
  run this readiness check automatically, while IAM repair remains an explicit
  owner operation. Use `probe_chat_storage_rules.mjs` for the authenticated
  upload/delete proof after IAM or chat-image rule changes.
- Local web debug App Check follows Firebase's documented debug-provider flow:
  each app's `apps/<role>/web/index.html` sets `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` only on
  localhost/loopback origins, and the generated local browser token is
  registered on the dev web app. Do not commit raw debug tokens.
- Firestore rules are deployed and aligned across dev, staging, and prod. All
  client access is governed by the normal auth/ownership rules. A predeploy hook
  in `firebase.json` runs Functions tests plus the Firestore rules emulator
  suite before every `firebase deploy --only firestore:rules`, so broken rules
  cannot ship from the CLI. A GitHub Actions workflow
  (`.github/workflows/firestore-rules-ci.yml`) runs the contract checker and
  rules tests on every PR that touches rules or schema files.
- Production now has only the current app registrations active:
  `Catch Prod Android`, `Catch Prod iOS`, and `Catch Prod Web`. The old
  `com.example.*` Android/iOS registrations and the old Windows web
  registration were removed on 2026-04-30 and are pending Firebase's normal
  30-day permanent deletion window.
- Dev and staging Functions reuse the current prod Razorpay test-mode secrets.
  Replace this with environment-owned secrets before live Razorpay payments.
- **Firestore config document `config/cities` is required in every environment.**
  The `isValidCity()` rules function reads from it. Deploying Firestore rules
  without this document will reject all profile edits and club creations.
  Keep the exact document contents aligned with the release prerequisites in
  [`docs/release_operations.md`](../docs/release_operations.md).
- **TTL policy on `rateLimits.expiresAt` is required in every environment.**
  Create it in Firebase Console → Firestore → TTL Policies. Without it,
  rate-limit counter documents accumulate indefinitely.
- **Cloud Vision API must be enabled on every GCP project.**
  `gcloud services enable vision.googleapis.com --project=<project-id>`.
  The `moderatePhotoOnUpload` Storage trigger depends on it.
- Firebase Analytics is linked to Google Analytics account `365970973` for
  dev, staging, and prod. Dev and staging web configs include their GA4
  measurement IDs. Fresh iOS/Android SDK config downloads still omit Analytics
  metadata, so use Firebase project analytics details and DebugView evidence
  rather than the native config files alone to verify mobile Analytics.
- Production GA4 BigQuery export is linked for property
  `catch-dating-app-64e51` (`p526484083`) to BigQuery project
  `catch-dating-app-64e51` in `Mumbai (asia-south1)`. The expected dataset is
  `analytics_526484083`. Daily event export is enabled for all streams; streaming
  export, mobile advertising identifiers, and daily user-data export are off.
- Host analytics BigQuery setup is repo-owned. Deploy the `bq-host-*`
  Firestore export extensions, then apply the DDL and mart refresh schedule with
  `tool/analytics/deploy_host_analytics_bigquery.sh <env>`.
  `extensions/bq-host-*.env` intentionally sets `EXCLUDE_OLD_DATA=no` so the
  first install backfills historical host operational documents instead of
  producing a forward-only analytics cutover.
- As of the 2026-06-18 live prod inspection, host analytics infrastructure is
  checked in but not yet deployed: `catch_analytics` does not exist,
  `bq-host-*` extension instances are not installed, no matching scheduled query
  exists, and the three host analytics callables are not live.
- Host analytics IAM has three separate identities. The Functions runtime
  service account needs `roles/bigquery.jobUser` on the project and write/read
  access to `catch_analytics` because `recordOrganizerAnalyticsEvent` inserts
  raw events and `getHostAnalytics` / `adminGetHostAnalytics` query the mart.
  The deployer or scheduled-query identity needs `roles/bigquery.jobUser`,
  editor access to `catch_analytics`, and viewer access to
  `catch_marketplace_metrics` for Event Success scorecard joins. The
  Firestore-to-BigQuery extension service accounts must retain write access to
  the export tables they own.

## Current environment state

Last consolidated from live environment evidence on 2026-05-21.

| Environment | Firebase project | Project number |
|---|---|---|
| `dev` | `catchdates-dev` | `619661127800` |
| `staging` | `catchdates-staging` | `822303414140` |
| `prod` | `catch-dating-app-64e51` | `574779808785` |

- GitHub Actions Firebase deploy and data-validation workflows use keyless
  Google Cloud auth through GitHub OIDC. Each `dev`, `staging`, and `prod`
  GitHub Environment points at a dedicated `github-actions-deploy` service
  account in the matching Google Cloud project.
- Cloud Billing API is enabled in all three projects. Firebase CLI deploys
  query billing status during Functions deploys, so disabling
  `cloudbilling.googleapis.com` breaks GitHub OIDC deploy jobs even when
  service-account authentication succeeds.
- Active Firebase app registrations are one consumer Android, one consumer iOS,
  one consumer web, one host Android, one host iOS, and one host web app per
  environment. Production active registrations include `Catch Prod Android`,
  `Catch Prod iOS`, `Catch Prod Web`, `Catch Host Prod Android`,
  `Catch Host Prod iOS`, and `Catch Host Prod Web`.
- Host Firebase SDK config files were downloaded on 2026-06-10 for dev,
  staging, and prod. Host Android SHA fingerprints were registered from the
  matching consumer apps on 2026-06-10 and the host Android SDK configs were
  refreshed afterward. Host App Check provider registrations were verified in
  Firebase Console on 2026-06-10 for dev, staging, and prod: Android uses Play
  Integrity, iOS uses App Attest, and web uses reCAPTCHA Enterprise. Firebase
  CLI `15.34.2` manages only App Check debug tokens, and `gcloud` `566.0.0`
  exposes no App Check app-management commands. Use
  `node tool/firebase/register_app_check_debug_token.mjs` for explicitly
  approved local debug-token registration; it reads the token from `.env.local`
  and does not print it.
- App Check service enforcement is `ENFORCED` for Firestore, Storage, and
  Firebase Authentication in all three projects. Callable Cloud Functions use
  `enforceAppCheck: true`; the public marketing waitlist endpoint remains
  public by design with an explicit origin allowlist.
- Functions, Firestore indexes, Firestore rules, and Storage rules were
  deployed to staging and prod from release candidate `d61fb162` on 2026-05-20.
  Later commits through `228060a4` were workflow/runtime updates only and did
  not require another staging/prod Firebase deploy.
- Storage bucket locations are not fully aligned: dev and staging default
  buckets are in `ASIA-SOUTH1`, while prod's default bucket is in
  `US-CENTRAL1`. Firebase Storage bucket location cannot be changed in place.

## Runtime source of truth

- App runtime environment comes from `APP_ENV`.
- Routine local web development uses `tool/env/dart_defines/local.json`:
  the dev app target with the isolated `demo-catch` Firebase project.
- Checked-in defaults live in `tool/env/dart_defines/dev.json`,
  `tool/env/dart_defines/staging.json`, and `tool/env/dart_defines/prod.json`.
- Android and Apple builds read their Firebase file for the selected flavor or
  configuration. The web service worker is the one working copy, refreshed by
  `./tool/use_firebase_environment.sh`.
- Validate the files each build reads with
  `./tool/validate_firebase_environment.sh <env> <consumer|host> apps/<role>`
  before debugging runtime Firebase issues.

## Common commands

Start the isolated local suite, then run either Flutter role in another terminal:

```bash
npm --prefix functions run serve
./tool/flutter_with_env.sh local --role host run -d chrome
./tool/flutter_with_env.sh local run -d chrome
```

This connects Auth, Firestore, Storage, and Functions to loopback emulators
before any service is used. It skips Remote Config fetches, push messaging,
App Check activation, and observability collection. It does not read local
credential define files or rewrite native Firebase configuration. Custom
Dart defines are rejected for this target so they cannot silently replace
the demo project or disable emulator routing.

The local target supports web runs/builds and tests. Native device testing
and external integrations use `dev` explicitly. Firebase demo projects have
no live resources; unsupported services cannot fall through to a billed
project. Local data starts empty and is discarded on exit. See
[`functions/README.md`](../functions/README.md#commands) for dependencies,
placeholder integrations, ports, and restart behavior.

Switch the web service worker to another environment:

```bash
./tool/use_firebase_environment.sh dev consumer apps/consumer
./tool/use_firebase_environment.sh dev host apps/host
```

Run Flutter with the matching `APP_ENV` define file:

```bash
./tool/flutter_with_env.sh dev --platform ios run -d <ios-device-id>
./tool/flutter_with_env.sh dev --role host --platform android run -d <android-device-id>
./tool/run_host_dev_simulator.sh "iPhone 17 Pro"
./tool/flutter_with_env.sh staging --platform web run -d chrome
./tool/flutter_with_env.sh prod build apk
```

Android, iOS, and macOS use native flavors. For `build apk`,
`build appbundle`, `build ipa`, `build ios`, and `build macos`,
`tool/flutter_with_env.sh` automatically supplies the matching app-target
flavor or scheme when one is not already present. Web builds do not get a
flavor argument. `flutter run` must name one device; pass `--platform` before
`run` for physical Android ids or any id that does not make its platform
unambiguous.

Explicit Apple examples:

```bash
flutter build ios --simulator --no-codesign --flavor dev --dart-define=APP_ENV=dev
flutter build ios --simulator --no-codesign --flavor staging --dart-define=APP_ENV=staging
flutter build ios --simulator --no-codesign --flavor prod --dart-define=APP_ENV=prod
./tool/flutter_with_env.sh dev --role host build ios --simulator --no-codesign

flutter build macos --debug --flavor dev --dart-define=APP_ENV=dev
flutter build macos --debug --flavor staging --dart-define=APP_ENV=staging
flutter build macos --debug --flavor prod --dart-define=APP_ENV=prod
./tool/flutter_with_env.sh dev --role host build macos --debug
```

Regenerate Apple flavor project files after changing app IDs, labels, or
Firebase environment mappings:

```bash
ruby tool/platform/configure_apple_flavors.rb
```

Run Firebase CLI commands against a configured alias:

```bash
./tool/firebase_with_env.sh dev deploy --only functions,firestore,storage
./tool/firebase_with_env.sh staging deploy --only functions
```

Validate Firestore data before tightening rules or writing migrations:

```bash
node tool/data/validate_firestore_data.mjs --env dev
node tool/data/validate_firestore_data.mjs --env staging --json
node tool/data/validate_firestore_data.mjs --env dev --emulator
```

The validator is read-only. It checks document shape, approximate document
size, high-growth array lengths, and cross-document references for users, run
clubs, runs, reviews, profile decisions, matches, chat messages, and onboarding drafts.
Live validation uses the Firebase Admin SDK, so the shell must have Application
Default Credentials configured, for example through
`GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json` or
`gcloud auth application-default login`. Emulator validation does not need live
credentials.

Delete all review documents and reset derived review aggregates:

```bash
node tool/data/delete_firestore_reviews.mjs --env dev
node tool/data/delete_firestore_reviews.mjs --env dev --apply --confirm-delete-all-reviews
```

The review deletion tool also defaults to dry-run. It maps affected review
documents, run clubs, runs, reviewer users, and any detected review-reference
fields before applying destructive writes.
Use it against dev/staging before production and before running any migration.

## How to refresh an environment

1. Create the Firebase project and app registrations for Android, iOS, macOS,
   and web.
2. Download the native config files into the matching `firebase/<env>/...`
   paths listed above.
3. Generate the Dart options file for that environment:

```bash
flutterfire configure --project=<firebase-project-id> --out=lib/firebase_options_staging.dart
flutterfire configure --project=<firebase-project-id> --out=lib/firebase_options_prod.dart
```

4. Update `firebase/<env>/web/firebase-messaging-sw.js` with the web app config
   from the same Firebase project.
5. Add the Firebase CLI alias with `firebase use --add` and map it to
   `staging` or `prod` in `.firebaserc`.
6. For a new Android flavor, link `apps/<role>/android/app/src/<flavor>/google-services.json`
   to its file under `firebase/`.

Do not copy one environment's config into another environment. If a Firebase app
is recreated, refresh both the Dart options file and the native/web config file
from the same Firebase project.
