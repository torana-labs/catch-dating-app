---
doc_id: mobile_release_fastlane_migration
version: 1.0.1
updated: 2026-10-29
owner: recursive_audit_loop
status: active
---

# Mobile Release Migration To fastlane

This plan replaces the custom mobile release pipeline with fastlane on GitHub
Actions. It records every behavior of the old pipeline, what replaces it, and
each regression the replacement accepts, so a lost check can be restored in a
cheaper form if it turns out to matter.

## What changes

| | Old pipeline | New pipeline |
| --- | --- | --- |
| When test builds run | After every successful `main` CI run that changed an app | Nightly (03:07 IST) when app sources changed since the last successful build, and on demand |
| Workflows | `mobile-internal-release.yml` (1,126 lines), `_mobile-platform-authority.yml` (667), `mobile-internal-promote.yml` (1,449) | `mobile-beta.yml` and `mobile-production.yml`, calling `fastlane/Fastfile` |
| Custom scripts | Packaging, promotion core, App Store and Play upload, distribution and receipt scripts (about 3,000 more lines) | None for releases; the build wrapper and the identity verifiers stay |
| iOS testers | A script grants each processed build to internal TestFlight groups | App Store Connect automatic distribution |
| Android testers | Manual Play uploads; the custom `qa` track | The Play `internal` track, uploaded nightly |
| Production | Not automated | `Mobile Production`: submits a tested TestFlight build for review, or promotes a tested Play version code, after a reviewer approves |
| iOS build number | `YYYYMMDD` + CI run number + attempt | Latest TestFlight build number + 1 |
| Android version code | `100000` + CI run number × 100 + attempt | Highest version code on any Play track + 1 |
| Provenance | Cross-workflow authority files, receipts and claims (90 days) | One job builds and uploads; a GitHub build attestation, the job summary and a 30-day artifact |

## The signed-file record, in plain terms

When the build server makes the app, it produces one file: an `.ipa` for the
App Store or an `.aab` for Google Play. Every file has a fingerprint, its
SHA-256 hash, which changes completely if even one byte changes.

The old pipeline built that file in one workflow and uploaded it in a second
workflow, sometimes hours later. Because the file travelled between two
workflows, the pipeline wrote down its fingerprint at build time, checked it
four more times before uploading, refused to upload anything that did not
match, and afterwards wrote a receipt: "the file with fingerprint X, built from
commit Y by run Z, became store build N." That is the "GitHub-side record
proving exactly which signed file went where."

What it protects against:

- the file being swapped between build and upload, by a person, a buggy
  script, a rebuild that silently picked up different code, or a file from
  another branch or an older attempt;
- a retry uploading a new file instead of reusing the one already in the store;
- being unable to prove to an auditor which code produced a shipped binary.

Nobody reads the receipts except the old pipeline itself. With fastlane the
file is built and uploaded in the same job, so it never leaves the machine that
built it, and the swap risk mostly disappears. What remains valuable is proving
which commit produced a binary, and the new pipeline keeps that in standard
form:

- `actions/attest-build-provenance` records a signed statement, "this
  fingerprint was built by this workflow at this commit in this run," that
  anyone can check later with `gh attestation verify <file>`. It does not
  expire after 90 days.
- Each job summary lists the app, version, build number, commit and
  fingerprint, and the binary is kept as a 30-day workflow artifact.
- App Store Connect and Play Console keep permanent build history. Play shows
  Google's own fingerprint of every uploaded bundle.
- Production never rebuilds. It promotes the exact build testers used, through
  the stores' own promotion, so the bytes that ship are the bytes that were
  tested.

If you want more, the next cheapest step is embedding the commit in the app
(a `GIT_SHA` dart-define shown in Settings and attached to crash reports).

## Regressions and their replacements

Each row names a behavior that is lost or changes, why it is acceptable, and
what replaces it. "Built" means this migration includes the replacement;
"Proposed" means it is cheap to add if the loss starts to matter. Ledger IDs
refer to the appendices.

| # | Behavior lost or changed | Ledger | Why acceptable | Replacement |
| --- | --- | --- | --- | --- |
| 1 | Test builds no longer follow every merge | A-01, B-39 | Owner decision: saves macOS time; on-demand covers urgent builds | Built: nightly path gate and `workflow_dispatch` |
| 2 | Builds the head of `main`, not "the commit CI just proved" | A-01, B-19 | Every `main` commit already passed the merge queue | Proposed: refuse a head whose `CI` run failed (one API call) |
| 3 | Only changed apps were built; now both apps build when any app source changed | A-10 | One extra build on some nights | Built: the nightly path gate skips quiet nights |
| 4 | CI-run-based iOS build numbers restart with a new workflow | A-19, A-24, B-47 | The store is the source of truth | Built: latest TestFlight build + 1 |
| 5 | CI-run-based Android version codes would restart near 100,101, below the live 457901, and be rejected | A-20, B-66 | Same | Built: highest code across `internal`, `alpha`, `beta`, `production`, `qa` + 1 |
| 6 | Cross-workflow authority, package digests, receipts, claims and their re-verification | A-08, A-43, A-55, A-62, B-16, B-23, B-31 | Build and upload now happen in one job, so there is no handoff to protect | Built: build attestation, job summary, 30-day artifact |
| 7 | Script grants each build to internal TestFlight groups and proves at least one group with testers exists | B-34, B-43, A-65 | Apple's automatic distribution does the grant | Owner setup: turn on automatic distribution. Proposed: an occasional check that each app has an internal group with testers |
| 8 | Waiting for Apple processing; a processing failure no longer turns the job red | B-25, A-65 | Saves 6–15 macOS minutes per build; Apple emails on invalid binaries | Proposed: drop `skip_waiting_for_build_processing` if a red job is preferred |
| 9 | "A newer build already exists" refusal | B-23, B-47 | Numbers come from the store maximum, and stores reject duplicates | Built by construction |
| 10 | Play `qa` closed-testing track replaced by `internal` | B-28, C (track policy) | `internal` is the standard track and already has Host testers | Owner setup: internal testers for both apps |
| 11 | Hard-coded "never production" refusal in the Play uploader | B-63 | A code check is weaker than account permissions | Production goes through a reviewer-gated environment; owner may also scope Play permissions |
| 12 | Comparing Google's reported SHA-256 with ours after upload | B-67 | Same job over TLS; Play Console shows Google's hash | Play bundle explorer |
| 13 | Android uploads become automatic (they were manual) | A-53, B-39 | Wanted; the old Play path never uploaded successfully | Built |
| 14 | Development certificate fingerprint and expiry metadata checks | A-29 to A-32 | A wrong certificate fails the archive visibly | Proposed: a 30-day expiry warning step |
| 15 | Archive-stage identity check (the export-stage check covers it) | A-37 | Export-stage verification checks everything plus entitlements | Built: export-stage check kept |
| 16 | Re-running a promotion was refused | B-06 | Re-runs are safe: numbers are recomputed and stores reject duplicates | Built |
| 17 | Release builds of a commit are tied to that commit's CI evidence | C (authority) | The merge queue validated it | The `main` CI delivery jobs are deleted with the old pipeline |
| 18 | `finalize-plan` re-ran doc-metadata and new-widget gates on the widened `main` window | C (§4) | The merge queue runs both on every commit | None needed |

Kept unchanged, because no store or fastlane action does the same job:

- `tool/flutter_with_env.sh`: prod Firebase files, prod dart-defines,
  `CATCH_APP_ROLE`, entrypoint and flavor (A-34, A-50).
- `verify_ios_release_identity.mjs` and `validate_google_maps_config.mjs`:
  bundle id, target marker, Flutter entrypoint, prod Firebase app, Maps key,
  and role-controlled entitlements (A-41, B-53, B-55).
- `verify_android_release_bundle.mjs`: target, role, Firebase and Maps (A-51,
  B-58).
- `check_mobile_package.mjs`: size budgets, test fixtures, Host without
  HealthKit or Razorpay (A-42).
- `check_client_callable_dependencies.mjs --verify-live`: Host never ships
  before its prod Cloud Functions exist (A-22).
- Reusable Apple Development identity plus automatic signing through the App
  Store Connect key (A-27, A-35).
- Crashlytics dSYM upload in the Xcode build phase (A-36).

Gained: a minimum-Xcode assertion, CocoaPods and Gradle caches, and fastlane
retries in place of hand-written loops (A-72 to A-74).

## Owner setup

1. App Store Connect, for both apps (6765646860 and 6778927317): TestFlight,
   each internal group, turn on automatic distribution.
2. Play Console, for both apps: confirm the internal testing track has a tester
   list. The Consumer app has no Play record yet (2026-10-29). Create it in
   Play Console, upload its first bundle there by hand (the API cannot create
   an app or make the first upload), then add `consumer` to `PLAY_ROLES` in
   `mobile-beta.yml`. Until then `Mobile Beta` skips Consumer Android.
3. GitHub: create the `prod-mobile-release` environment with required
   reviewers and deployment branches limited to `main`. Give it the same App
   Store Connect secrets and Play variables as `prod-mobile`. If the Google
   workload identity binding is scoped to the environment name, add this
   environment to it.
4. GitHub: confirm `prod-mobile` is limited to `main`.

## Cutover

1. Merge the fastlane path. The old pipeline keeps running until step 3; both
   can upload safely because the new numbers start above the store maximum.
2. Run `Mobile Beta` by hand for each app and platform and confirm testers
   receive the builds.
3. Delete the old pipeline and its coupling (below).

### Delete list for step 3

From the coupling audit (appendix C, §2):

- Workflows: `mobile-internal-release.yml`, `_mobile-platform-authority.yml`,
  `mobile-internal-promote.yml`.
- Scripts and their tests: `tool/ci/package_mobile_release.mjs`,
  `tool/ci/mobile_promotion_core.mjs`, `tool/platform/distribute_testflight_build.mjs`,
  `verify_app_store_build.mjs`, `verify_ios_processing_receipts.mjs`
  (already unused), `upload_google_play_bundle.mjs`, `probe_google_play_access.mjs`,
  `compute_mobile_build_number.mjs`, `set_xcode_cloud_workflow_state.mjs`,
  and the `tool/ci/mobile_*_workflow.test.mjs` suites.
- `main` CI delivery jobs with no other reader: `finalize-plan`,
  `package-firebase`, the delivery-authority steps of `Required CI`, and the
  `functions-lib` upload.
- Registries: `ci:mobile-*`, `ci:firebase-delivery-package`,
  `ci:finalize-ci-plan` and the receipt and Xcode Cloud entries in
  `tool/tools_manifest.json`; the matching `tool/remote_ops_manifest.json`,
  `tool/architecture/pattern_adoption.json` and `tool/policy/rules.json`
  entries; `releasePolicy` and release-mode targets in `tool/app_targets.json`
  and `tool/harness/component_graph.json`.
- Rewrite, not delete: `tool/platform/check_app_targets.mjs` release-ownership
  checks, and the tests that slice the deleted jobs.
- Keep: `delivery_core.mjs` (web hosting), `resolve_app_target.mjs`, the
  identity verifiers, `check_mobile_package.mjs`, and the `main` push `CI` run
  that the website release train and host preview read.

## Appendix A: build and package ledger

Source: `.github/workflows/mobile-internal-release.yml`,
`_mobile-platform-authority.yml` and the build helpers, audited at `dd775d752`.

### 1. Ledger

| ID | Location | What it does | Why it exists / failure prevented | Proposed fate | Regression if replaced/dropped | Cheaper alternate check | Conf. |
|---|---|---|---|---|---|---|---|
| A-01 | MIR:3-7 | Trigger: `workflow_run` of workflow "CI", `types: [completed]`, `branches: [main]`. No `workflow_dispatch` (CAT:529 forbids one). | Builds only after main CI; never from a PR/branch. | REPLACE: `on: schedule` (nightly cron) + `workflow_dispatch`, job-level `if: github.ref == 'refs/heads/main'`. | Builds no longer happen per merge (intended). Loses "exactly the commit CI just proved"; nightly builds HEAD of main. | Gate on the HEAD SHA being green: `gh api repos/$R/commits/$SHA/check-runs` (or combined status) for the required CI check. One API call. | high |
| A-02 | MIR:9-11, MPA:36-38, MIR:1013-1015 | Workflow perms `actions: read, contents: read`; only `dispatch-promotions` gets `actions: write`. | Least privilege; producer cannot mutate repo. | KEEP: `permissions: contents: read` (+ `id-token: write` only if Play OIDC/attestation used, `attestations: write` if A-40 adopted). | none | — | high |
| A-03 | MIR:13-15 | `concurrency` group per source CI run id, `cancel-in-progress: false`. | Prevents two producer runs for the same CI run; does NOT serialize different commits. | REPLACE: `concurrency: {group: mobile-release-${{ platform }}, cancel-in-progress: false}`. | none (new design can serialize more strictly). | — | high |
| A-04 | MIR:20, 63-70 | Job `if` + shell recheck: CI conclusion `success`, event `push`, head branch `main`, head repo id == this repo id, SHA is 40-hex; numeric guards on run ids (55-62). | Fork/PR/branch CI runs cannot trigger signing; defends against forged `workflow_run` context. | DROP (trigger changes); replace with `if: github.ref == 'refs/heads/main'` + `prod-mobile` environment deployment-branch policy = `main` (GitHub feature, already "main-only" per docs/release_operations.md:708). | none once trigger is schedule/dispatch. | Environment branch policy is the cheap check. | high |
| A-05 | MIR:72-79 | Resolves the current workflow id of `ci.yml` via API and asserts the event's workflow id matches. | A renamed/other workflow called "CI" cannot impersonate CI. | DROP. | none (no workflow_run). | — | high |
| A-06 | MIR:81-104 | Re-reads CI run: name/path/workflow_id/event/branch/repo/id/attempt/run_number/SHA/completed/success and that the triggering attempt is still the *latest* attempt. | A CI re-run (possibly failing) supersedes an older green attempt; don't ship obsolete evidence. | DROP. | none material. | A-01 check-runs gate. | high |
| A-07 | MIR:106-129 | Fetches the exact historical attempt; repeats same assertions; derives `source_ci_utc_date` (YYYYMMDD of attempt `created_at`, UTC). | Date input for iOS build number (A-19). | REPLACE: compute date from `date -u +%Y%m%d` in the lane. | Date source moves from CI start time to build time (harmless). | — | high |
| A-08 | MIR:131-164 | Lists CI artifacts (API version `2026-03-10`), requires exactly one unexpired `harness-success-v3-<wfid>-<runno>-<runid>-<sha>-<attempt>` and `harness-plan-<runno>-<runid>-<sha>-<attempt>`; downloads authority zip by id; verifies sha256 == API digest; rejects absolute/`..` zip paths; no symlinks; exactly one file `ci-delivery-authority.json`. | Immutable, tamper-evident handoff from CI; zip-slip/symlink hardening. | DROP. | Lose CI→producer cryptographic binding. Not needed when build+upload is one job from main. | — | high |
| A-09 | MIR:166-213 | Validates authority JSON: exact keys; `schema == catch.ci-delivery-authority/v3`; workflow id/run no/run id/attempt/SHA match; `deployRequired` boolean; `planArtifact` {id,name,digest} matches; `packageArtifact` = `firebase-delivery-<sha>-<attempt>` iff deployRequired; authority name recomputed. | Proves the plan belongs to that exact green CI attempt. | DROP. | none for mobile (Firebase package fields are irrelevant to mobile). | — | high |
| A-10 | MIR:215-243 | Downloads plan by id, digest check, zip-slip/symlink/single-file checks; validates `impact-plan.json`: `complete==true`, `mode=="main"`, SHA/run/attempt match, `operations.releaseTargets`/`releaseRoles` sorted-unique, targets match `^(consumer|host)-(android|ios)$`, roles == roles implied by targets. | Only build role/platform targets whose sources changed (impact planner, tool/harness/component_graph.json:428-602). | REPLACE: build all four targets nightly; optionally skip when nothing app-relevant changed since last successful build. | More builds/minutes; TestFlight/Play internal testers get a build even for no-op/one-role changes; host rebuilt when only consumer changed. Acceptable. | `git diff --quiet <last-built-tag> HEAD -- apps/ lib/ packages/ pubspec.lock tool/app_targets.json firebase/ tool/env/` and skip lane; tag `mobile-built/<target>` after upload. | high |
| A-11 | MIR:245-270 | Emits outputs: `release_targets`, `release_roles`, `ios_targets`, `android_targets`, `has_*`, `release_required`, `source_bundle_name = mobile-source-v1-<ciRun>-<ciAttempt>-<runId>-<runAttempt>`. | Drives matrices. | REPLACE: static matrix `role: [consumer, host]` per platform job. | none | — | high |
| A-12 | MIR:272-279 | Uploads `build/mobile/source-bundle` (authority + plan) with `retention-days: 1`. | Hands the verified source binding to build jobs. | DROP. | none | — | high |
| A-13 | MIR:281-291, 716-726 | Matrix `release_target` from `ios_targets`/`android_targets`, `fail-fast: false`; iOS `runs-on: macos-26`, Android `ubuntu-latest`; both `environment: prod-mobile`; timeouts 90 / 35 min. | Role builds independent; credentials scoped to protected env. | KEEP: two jobs (ios/android) × `role` matrix, `fail-fast: false`, `environment: prod-mobile`, `macos-26` (required by tool/ci/check_toolchain_consistency.sh:95-105), timeouts. | none | — | high |
| A-14 | MIR:294-301, 728-735 | Checkout `ref: source_sha`, assert `git rev-parse HEAD == SOURCE_SHA`. | Exact-source build. | REPLACE: `actions/checkout@v6` default (ref = triggering main SHA); record `GITHUB_SHA` in build notes/attestation. | none | — | high |
| A-15 | MIR:303-307, 737-741 | Download source bundle into `build/mobile/source`. | Needed later by PMR prepare. | DROP. | none | — | high |
| A-16 | MIR:309-314, 743-753 | `./.github/actions/load-toolchain` (reads `tool/ci/toolchain.env`), `actions/setup-node@v6` (node 24), Android `actions/setup-java@v5` temurin 21. | Pinned toolchain. | KEEP (still needed for node verifiers + Gradle). Add `ruby/setup-ruby` + `bundler-cache: true` with a checked-in `Gemfile.lock` for fastlane. | none | — | high |
| A-17 | MIR:316-317, 772-773 | `node tool/run.mjs check platform:app-targets platform:app-package-graphs platform:verify-{ios,android}-release-identity` → runs `check_app_targets.mjs --check` (incl. regex conformance of MIR/MPA text, CAT:335-540), `check_app_package_graph.mjs`, and `node --check/--test` of the verifier. | Release contract integrity at build time. | REPLACE: run these in PR CI only (they already are tool checks); remove from release lane. CAT's MIR/MPA regex block must be rewritten for the new workflow (see Coupling C-07). | Release can build on a commit whose app-target manifest is inconsistent only if it bypassed PR CI — negligible with merge queue. | none needed. | high |
| A-18 | MIR:319-345, 775-796 | Map `consumer-ios→consumer` etc.; `resolve_app_target.mjs --role R --environment prod --fields ...` to get target id, projectRoot, bundle id, `ios.configurations.release`, `ios.scheme`, `release.appStoreConnectAppId` (iOS) / `android.applicationId`, `android.flavor` (Android); fail if any empty. | Single source of truth `tool/app_targets.json`. | KEEP: call `resolve_app_target.mjs` from the Fastfile (`sh`) or read `tool/app_targets.json` with Ruby `JSON.parse`. | none | — | high |
| A-19 | MIR:347-353, tool/platform/compute_mobile_build_number.mjs:13-16 | iOS build number = `YYYYMMDD` + 8-digit zero-padded **CI run_number** + 2-digit attempt (18 chars; attempt ≤99; run ≤99,999,999). | Monotonic, collision-free across retries, above legacy date namespace (test:5-14), within Apple 18-char limit (verify_app_store_build.mjs:25). | REPLACE: `latest_testflight_build_number(app_identifier:)+1` or keep same formula with new workflow's `run_number`. | **Cutover hazard**: new workflow `run_number` restarts at 1 — same-UTC-day builds would be *lower* than an existing `YYYYMMDD<old run>NN` and ASC rejects. After the cutover day, date prefix dominates so formula stays monotonic. | Keep A-24 floor check (or `latest_testflight_build_number`) before archiving. | high |
| A-20 | MIR:800-804, compute_mobile_build_number.mjs:17-23 | Android versionCode = `100000 + CI_run_number*100 + attempt`, max 2,100,000,000. **Not date-based.** | Monotonic per CI run; 2 retry digits; Play max. | REPLACE: `google_play_track_version_codes` max across all tracks (internal/qa/alpha/beta/production) + 1, or keep formula with a fixed offset ≥ current max. | **High-impact regression if naively ported**: new workflow `run_number` starts at 1 → versionCode ≈100,101, far below existing codes (≥100,000+oldCI*100) → every Play upload rejected ("version code already used"). | Query Play for max versionCode (fastlane action above) in the lane; fail early if candidate ≤ max. | high |
| A-21 | MIR:347-348, 798-799 | `build_name` = pubspec `version:` with `+N` stripped (consumer `1.0.2`, host `1.0.1`); pubspec `+3` ignored. | Marketing version from source; build number from CI. | KEEP (same derivation in Fastfile). | none | — | high |
| A-22 | MIR:369-374, 817-822; tool/firebase/check_client_callable_dependencies.mjs:198-235, 338-363; manifest tool/firebase/client_callable_dependencies.json | `--role R --environment prod --verify-live`: for each manifest entry (today **host only**: `sendEventBroadcast`, `importWeddingPhoneContacts` in `asia-south1`) asserts it is exported from functions/src/index.ts and POSTs `https://asia-south1-catch-dating-app-64e51.cloudfunctions.net/<fn>` expecting a callable JSON error `UNAUTHENTICATED`/`FAILED_PRECONDITION`. Consumer: static only. | Prevents shipping a client that calls a backend Function not yet deployed to prod (client/backend skew). | KEEP as a pre-build `sh` step in the lane (no credentials, seconds). | If dropped: host build could reach testers/production before its prod callables exist → broken features. | It already is cheap. | high |
| A-23 | MIR:376-378, 768-770; .github/actions/setup-flutter/action.yml:12-19 | `subosito/flutter-action@v2` with `flutter-version` 3.47.8, `channel: stable`, `cache: true`; `flutter pub get` (repo root). | Pinned Flutter; cache. | KEEP. | none | — | high |
| A-24 | MIR:514-520; tool/platform/verify_app_store_build.mjs:23-47 | Before archiving, lists the app's last 200 ASC builds (`/v1/builds?filter[app]=…&sort=-uploadedDate&limit=200`) and fails if candidate build number ≤ any existing (numeric, dotted, BigInt). | Fail in seconds instead of after a 30-60 min archive; guards A-19 monotonicity. | REPLACE: fastlane `latest_testflight_build_number` / `app_store_build_number` compare, or keep the node script. | If dropped: ASC rejects at upload time (late failure, wasted macOS minutes). | Same, cheap. | high |
| A-25 | MIR:380-381 | `ARCHIVE_PATH=$RUNNER_TEMP/<target_id with _>.xcarchive`. | plumbing | REPLACE: gym `archive_path`. | none | — | high |
| A-26 | MIR:383-386; tool/write_ios_maps_key_xcconfig.sh:25-38, 94-96 | Writes `GOOGLE_MAPS_IOS_API_KEY_PROD=<secret>` (validated `^AIza[0-9A-Za-z_-]{20,}$`, umask 077, no xtrace) to `apps/<role>/ios/Flutter/GoogleMapsKeys.xcconfig`, which every flavored xcconfig `#include?`s (configure_apple_flavors.rb:192, 197). | Inject Maps key without committing it. | KEEP (call script from lane). | none | — | high |
| A-27 | MIR:388-438 | Decode `IOS_CI_DEVELOPMENT_CERTIFICATE_P12_BASE64`; create temp keychain with random password, `set-keychain-settings -lut 21600`, unlock, `security import -x -T codesign -T security`, `set-key-partition-list -S apple-tool:,apple:,codesign:`, set as user default/search list; delete p12. | Gives automatic signing a persistent **Apple Development** identity so `-allowProvisioningUpdates` on a clean runner does not mint a new development certificate every run (docs/release_operations.md:1203-1208). | REPLACE: fastlane `setup_ci` + `import_certificate(certificate_path:, certificate_password:, keychain_name:)`; **or** switch to `match(type: "appstore", readonly: true)` + manual signing (then no development identity is needed at all). | If automatic signing is kept but the dev identity import is dropped: Apple creates a new Development cert per run until the account limit is hit, then builds fail. | — | high |
| A-28 | MIR:440-445 | Requires exactly one valid `"Apple Development:` codesigning identity in that keychain. | Xcode cannot pick a wrong/ambiguous identity. | DROP (fastlane keychain contains only what you import). | none | — | med |
| A-29 | MIR:447-454 | Cert subject must contain `CN=Apple Development:` and `OU=<teamID from ExportOptions.prod.plist>` (`2HQBK4UMUT`). | Wrong-team / wrong-type cert caught before a long archive. | DROP. | Wrong cert fails at archive (late, self-evident). | — | med |
| A-30 | MIR:456-463 | SHA-256 fingerprint of cert must equal `vars.IOS_CI_DEVELOPMENT_CERTIFICATE_SHA256`. | Secret drift detection (someone swapped the p12). | DROP. | none material. | — | med |
| A-31 | MIR:465-479 | Cert `validTo` must equal `vars.IOS_CI_DEVELOPMENT_CERTIFICATE_EXPIRES_AT`. | Metadata drift. | DROP. | none | — | med |
| A-32 | MIR:481-484 | `openssl x509 -checkend 2592000` → fail if cert expires within 30 days. | Early warning before a hard signing outage. | REPLACE with a **non-blocking** warning (or monthly scheduled check); with `match`, expiry is managed by match/`nuke`. | Silent expiry → sudden signing failure. | `openssl x509 -checkend 2592000 || echo "::warning::..."`. | high |
| A-33 | MIR:486-494, 633-643, 1099-1103 | `$GITHUB_STEP_SUMMARY` lines (identity, export, dispatch URLs). | Operator visibility. | DROP (fastlane logs) or minimal summary. | none | — | high |
| A-34 | MIR:496-497; FWE:315-332, 512-535, 563-568, 624-665, 667-683 | `./tool/flutter_with_env.sh prod --role R build ios --release --config-only --build-name=… --build-number=…`. Wrapper: resolves projectRoot/packageEntrypoint/ios.scheme/android.flavor from app_targets.json; runs `tool/use_firebase_environment.sh prod R apps/R` (copies `firebase/prod/[host/]{android,ios,macos,web}` configs into the app project and runs `validate_firebase_environment.sh`); appends `-t lib/main_prod.dart --flavor <scheme>`; runs `validate_google_maps_config.mjs --env prod --platform ios`; appends `--dart-define-from-file=tool/env/dart_defines/prod.json --dart-define=CATCH_APP_ROLE=R`; `cd apps/R`; in CI retries up to 3× (15 s) only on CocoaPods git TLS "self signed certificate" errors. Rejects mismatching `--flavor`/`-t`. | One code path for local and CI; guarantees prod Firebase + prod defines + correct entrypoint/flavor; `--config-only` writes `Generated.xcconfig` (incl. base64 DART_DEFINES, FLUTTER_TARGET, build name/number) consumed by the subsequent raw `xcodebuild archive`. | KEEP: fastlane `sh("../../tool/flutter_with_env.sh prod --role #{role} build ios --release --config-only ...")` before `build_app`. Alternative: `flutter build ipa` via the wrapper with `--export-options-plist`. | If bypassed (calling `flutter build` directly): risk of dev Firebase config, missing `CATCH_APP_ROLE`, wrong entrypoint. | Keep A-37/A-46 verifiers (they catch these). | high |
| A-35 | MIR:499-532 | Decode ASC `.p8` to `$RUNNER_TEMP/AuthKey_<id>.p8` (0600, trap rm); `xcodebuild -workspace apps/R/ios/Runner.xcworkspace -scheme <prod|host-prod> -configuration <Release-prod|Release-host-prod> -destination generic/platform=iOS -archivePath … -allowProvisioningUpdates -authenticationKeyPath/ID/IssuerID -hideShellScriptEnvironment archive`. | Automatic signing with API-key auth (profiles created/repaired by Xcode); hides env (secrets) from build logs. | REPLACE: `app_store_connect_api_key(key_id:, issuer_id:, key_content:, is_key_content_base64: true)` + `build_app(workspace:, scheme:, configuration:, export_method: "app-store", export_options: "ExportOptions.prod.plist", xcargs: "-allowProvisioningUpdates -authenticationKeyPath … -authenticationKeyID … -authenticationKeyIssuerID …")` (or manual signing via match). | none if flags preserved; dropping `-hideShellScriptEnvironment` leaks env into logs (secrets masked by GitHub, but still). | — | high |
| A-36 | Xcode build phase in apps/{consumer,host}/ios/Runner.xcodeproj/project.pbxproj:532-556; tool/platform/upload_crashlytics_symbols.py | During archive (non-Debug configs) reads `GOOGLE_APP_ID` from built GoogleService-Info.plist and runs `Pods/FirebaseCrashlytics/upload-symbols --build-phase --validate` then upload for `App.framework.dSYM` and the app dSYM. **Consumer** wraps it in the Python script (30 s validate / 180 s upload deadlines, process-group kill, timeout = failure). **Host** calls `upload-symbols` directly with no timeout. Both under `set -euo pipefail` → a Crashlytics failure fails the archive. | Symbolicated Crashlytics reports for every release build. | KEEP (it is inside Xcode, fastlane-agnostic) or REPLACE with `upload_symbols_to_crashlytics(dsym_path:, gsp_path:)` after `build_app` (non-blocking). | If dropped: unsymbolicated iOS crashes. Note current coupling: a Crashlytics outage blocks releases; host can hang until the 90-min job timeout. | Make the build phase non-fatal for release lanes, or move to post-build fastlane action with `begin/rescue`. | high |
| A-37 | MIR:534-544; VIRI:52-161, 425-517 (archive stage) | `verify_ios_release_identity.mjs --archive`: exactly one `.app`; `codesign --verify --deep --strict`; Info.plist bundle id, display name, `CatchAppTargetID == <role>-prod`, `CatchFlutterTarget` ends with `lib/main_prod.dart`, URL scheme contains target `urlScheme`; embedded GoogleService-Info.plist `BUNDLE_ID`/`GOOGLE_APP_ID`/`PROJECT_ID` == prod target; version/build equal expected & Apple-numeric; archive `ApplicationProperties` agree; controlled entitlements (`aps-environment`, `appattest-environment`, `associated-domains`, `healthkit`) exactly per role file (host must NOT have healthkit/associated-domains); `application-identifier` = `<team>.<bundleId>`. | Wrong-role / wrong-env / wrong-Firebase builds never leave CI. | KEEP only at export stage (A-41); archive-stage run is redundant with export-stage run. DROP the archive-stage invocation. | none (export stage re-checks everything plus more). | — | high |
| A-38 | MIR:546-556; tool/firebase/validate_google_maps_config.mjs:28-29, ~107-160 | Find archived `.app`; `validate_google_maps_config.mjs --env prod --platform ios --ios-built-plist <app>/Info.plist`: built `GoogleMapsApiKey` is a valid key and equals `GOOGLE_MAPS_IOS_API_KEY_PROD` in xcconfig. | Maps works in prod (no empty/dev key). | DROP (A-41 export check re-verifies the compiled key against xcconfig, VIRI:111-118, 628-630). | none | — | high |
| A-39 | MIR:558-601; apps/*/ios/ExportOptions.prod.plist | `xcodebuild -exportArchive -exportOptionsPlist apps/R/ios/ExportOptions.prod.plist -allowProvisioningUpdates` + ASC key auth; up to 3 attempts, retry (20 s) only if log contains `correct format` (transient ASC response); on final failure copies export log + newest `$TMPDIR/*.xcdistributionlogs` into diagnostics dir. Export options: `destination=export`, `method=app-store-connect`, `signingStyle=automatic`, `teamID=2HQBK4UMUT`, `manageAppVersionAndBuildNumber=false`, `stripSwiftSymbols=true`, `uploadSymbols=true`, `testFlightInternalTestingOnly=false`. | Cloud-managed distribution signing at export (no distribution cert stored); bounded retry of a known flaky ASC response. | REPLACE: `build_app` export step (gym) with same plist; wrap in `retry`-style `begin/rescue` loop matching `correct format`. | Without the retry: occasional red nightly from transient ASC error (acceptable, re-run). Note cloud signing requires the ASC key to have cloud-managed-certificate access (Admin). | — | med |
| A-40 | MIR:603-610 | On failure upload `ios-export-diagnostics-v1-…` (14 days). | Debuggability of export failures. | KEEP: `actions/upload-artifact` of `~/Library/Logs/gym` + `*.xcdistributionlogs` `if: failure()`. | none | — | high |
| A-41 | MIR:612-631; VIRI:227-284, 384-423, 509-516, 596-673 | `verify_ios_release_identity.mjs --ipa`: lists IPA (no `\`, absolute, `..`, duplicates), extracts, rejects symlinks, exactly one `Payload/*.app`; strict deep codesign verify; all A-37 identity checks; **export-only**: prod `aps-environment` and `appattest-environment` must be `production`, `get-task-allow` must be `false`, compiled `GoogleMapsApiKey` == xcconfig value; artifact {name,size,sha256} stable before/after; writes receipt (`catch.ios-release-identity/v1`, Maps key only as SHA-256). Then `shasum -a 256` IPA. | The uploaded IPA is the right role/env/Firebase/entitlements/Maps key and distribution-signed. | KEEP as a lane `sh` step between `build_app` and `upload_to_testflight` (self-contained node script, macOS tools). | If dropped: role-swap or dev-Firebase/`aps-environment=development` builds can reach testers (ASC accepts many of these). | It is already the cheap check (~seconds). | high |
| A-42 | MIR:645-651, 894-900; CMP:95-127, 144-189, 230-277; tool/platform/mobile_package_policy.json | `check_mobile_package.mjs --artifact --role --platform`: validates policy (baselines present, budget ≤ baseline×1.2); inspects archive entries (`unzip -l`); hashes `App.framework/App` / `lib/*/libapp.so`; fails if compressed > `maxArtifactBytes` or uncompressed > `maxUncompressedBytes`; forbidden entries `flutter_assets/assets/fixtures/` (all) and role natives (host iOS: `Frameworks/health.framework/`, `Frameworks/razorpay_flutter.framework/`; host Android: `libhealth`, `razorpay`); artifact bytes must not change during inspection. | Size regressions; test fixtures shipped in prod; consumer-only native SDKs (HealthKit, Razorpay) leaking into Host. | KEEP as lane `sh` step after build (no change needed). | If dropped: silent size creep; fixtures/Host SDK leakage reach store (privacy/review risk for HealthKit). | Already cheap. | high |
| A-43 | MIR:653-668, 902-917; PMR:357-484 | `package_mobile_release.mjs prepare`: copies artifact + identity receipt + package-policy receipt + CI authority + impact plan into a fresh `build/mobile/packages/<target>` dir (no symlink traversal, COPYFILE_EXCL); validates CI authority/plan/targets authorize this target; validates identity & policy receipts bind to the artifact bytes; writes `delivery-provenance.json` (`createProvenanceManifest`, tool/ci/delivery_core.mjs:246-273) and `mobile-package-receipt.json`; re-verifies. | Producer→promoter handoff of exact bytes with provenance. | REPLACE: no handoff (build and upload in same job). Optionally `actions/attest-build-provenance@v2` on the `.ipa`/`.aab` and upload them with `actions/upload-artifact` (retention 90). | Lose repo-native provenance receipts. With attestation: none material. | `attest-build-provenance` (one step). | high |
| A-44 | MIR:670-677, 919-926 | Upload `mobile-package-v1-<target>-<ciRun>-<ciAttempt>-<run>-<attempt>` (90 days). | Promoter downloads by id/digest. | REPLACE: upload `.ipa`/`.aab` + dSYM/mapping as a plain artifact (30-90 days) for audit/rollback. | none | — | high |
| A-45 | MIR:679-699, 928-948; PMR:603-641 | `bind-upload`: re-verify package, require artifact name == expected, write `mobile-package-upload-receipt.json` {package receipt, artifact id/name/digest} + copy policy receipt; upload `mobile-package-receipt-v1-…` (90 days). | Lets later jobs verify package by API digest without downloading it. | DROP. | none | — | high |
| A-46 | MIR:701-714 | `if: always()` delete temp keychain, p12, PEM. | Don't leave signing material on runner. | REPLACE: fastlane `setup_ci` temp keychain; on GitHub-hosted runners VMs are destroyed. Keep a tiny `always()` cleanup only if self-hosted. | none on hosted runners. | — | high |
| A-47 | MIR:755-766 | Download bundletool `1.18.3` jar from GitHub releases, verify SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29`. | Pinned, verified tool for A-51. | KEEP (needed by VARB). | none | — | high |
| A-48 | MIR:824-851; apps/*/android/app/build.gradle.kts:15-79, 234-252 | Decode `ANDROID_UPLOAD_KEYSTORE_BASE64` to `apps/R/android/keystore/upload-keystore.jks` (0600); write `apps/R/android/key.properties` (`storeFile=../keystore/upload-keystore.jks`, storePassword, keyAlias, keyPassword; 0600). Gradle fails a release task if key.properties missing/placeholder or keystore missing. | Upload-key signing for Play. | KEEP (lane `sh` or workflow step); fastlane has no standard keystore action — same file writes. | none | — | high |
| A-49 | MIR:853-861 | Append `GOOGLE_MAPS_ANDROID_API_KEY_PROD=<secret>` to `apps/R/android/local.properties` (Gradle `googleMapsApiKeyFor("PROD")`, build.gradle.kts:27-34, 201-202). | Maps key injection. | KEEP. | none | — | high |
| A-50 | MIR:863-870; FWE:527-534, 677-681 | `./tool/flutter_with_env.sh prod --role R build appbundle --release --build-name --build-number` with `CATCH_GRADLE_WRAPPER_MAX_ATTEMPTS=5`, `…RETRY_DELAY_SECONDS=20` → adds `-t lib/main_prod.dart --flavor <consumerProd|hostProd>`, prod Firebase copy, Maps validation (android), prod dart-defines; retries only on Gradle wrapper download socket errors. Gradle wrapper pinned to 8.14 with `distributionSha256Sum=61ad310d…` (apps/*/android/gradle/wrapper/gradle-wrapper.properties:5-6). build.gradle.kts:127-133 enforces exactly one flavor; :139-160 checks google-services.json contains the flavor package. | Correct prod AAB; flaky download resilience. | KEEP via `sh` in the lane (do not use fastlane `gradle` action directly — it would bypass the wrapper's Firebase/defines). | none if wrapper kept. | — | high |
| A-51 | MIR:872-892; VARB:107-216 | Exactly one `.aab` under `apps/R/build/app/outputs/bundle`; `verify_android_release_bundle.mjs`: `jarsigner -verify -strict` (status 0 or 4 accepted); signer cert SHA-256 == `releasePolicy.android.uploadCertificateSha256` (`3088F763A60FD9F7CA99204D6A68EF93A30263A697E563EF883B29DBBC7AE23E`); via bundletool `dump manifest`: package == applicationId, versionName/Code == expected, meta-data `com.catchdates.app.APP_TARGET_ID`/`APP_ROLE`/`FIREBASE_APP_ID`/`FIREBASE_PROJECT_ID` == target, `com.google.android.geo.API_KEY` == secret, not `debuggable`; versionCode in (0, 2.1e9]; bytes unchanged; receipt. | Wrong role/env/Firebase/Maps/debuggable AAB never uploads. | KEEP identity/Firebase/Maps/debuggable checks as lane `sh` step. Upload-cert pin is REPLACEable by **Play's built-in upload-key enforcement** (Play rejects an AAB not signed by the registered upload key). | Dropping entirely: dev Firebase / wrong role / missing Maps key reach testers. Dropping only the cert pin: none (Play enforces). | Already cheap (~30 s). | high |
| A-52 | MIR:950-961 | `always()`: remove key.properties, keystore, strip Maps line from local.properties. | Hygiene. | DROP on hosted runners (or keep 3-line cleanup). | none | — | high |
| A-53 | MIR:963-1001 | `ios-authority` / `android-authority` call MPA per platform only if that platform's build job succeeded; independent of the sibling platform. | One platform's failure doesn't block the other. | KEEP the property: separate `ios` and `android` jobs, each uploading on its own success. | none | — | high |
| A-54 | MPA:57-67 | Platform must be ios/android; targets non-empty, sorted-unique, only `consumer-<p>`/`host-<p>`. | Input sanity. | DROP. | none | — | high |
| A-55 | MPA:69-101, 349-363 | Producer run must be "Mobile Internal Release"/path/`workflow_run`/same repo/current attempt/status `in_progress|queued`/conclusion null; else "Use Re-run all jobs". | Partial job re-runs cannot mix evidence across attempts. | DROP (single-job build+upload has no cross-attempt evidence). | none | — | high |
| A-56 | MPA:103-117, 365-379 | Via jobs API for this exact attempt: each target has exactly one job named `Build signed package (<target>)`, completed+success. | Completeness of this attempt. | DROP. | none | — | high |
| A-57 | MPA:119-175 | Exactly one source bundle and, per target, exactly one package + receipt artifact (unexpired), ids/digests well-formed; write attempt entries. | Completeness/uniqueness of handoff artifacts. | DROP. | none | — | high |
| A-58 | MPA:177-222; tool/ci/mobile_platform_authority_workflow.test.mjs:10 | Download receipts by pattern; count == targets; handle download-artifact@v7 flattening for single match; `verify-upload` each (PMR:643-692). | Receipt integrity. | DROP. | none | — | high |
| A-59 | MPA:224-249, 566-574; CMP:191-228 | If both roles of a platform are selected: `check_mobile_package.mjs --compare consumer,host`: same platform; both have compiled app binaries, same count (iOS exactly 1); **compiled Dart binary hashes must differ**; archive entry sets must differ. Run twice (receipts, then re-downloaded packages). | Catches Host and Consumer being the same compiled product (e.g., wrong entrypoint for one role). | DROP (requires cross-job artifact exchange). | Low: A-41/A-51 already prove distinct bundle id, `CatchAppTargetID`/`APP_TARGET_ID`, Flutter target, Firebase app; A-42 proves Host lacks consumer natives. Residual: a build-setting-correct but Dart-identical binary would not be caught. | If wanted: in each job, print `sha256(App.framework/App or libapp.so)` into the artifact/job summary; nightly a 10-line step compares the two. | med |
| A-60 | MPA:251-308; PMR:694-782 | Build `catch.mobile-attempt-completeness-authority/v1` (targets, crossRoleComparisons passed/not-required, artifacts), `verify-attempt`, upload (90 d). | Completeness proof for publish step. | DROP. | none | — | high |
| A-61 | MPA:310-317, 381-564 | `publish-authority`: re-check producer/jobs; download attempt authority (digest, zip-slip, symlink, one file), `verify-attempt`; require exactly 2×targets package/receipt artifacts; each id/name/digest equals attempt entry; download package zip (digest, zip-slip, symlink) → `PMR verify` (all descriptors, provenance digest, `verifyDeliveryArtifact`); receipt zip (exactly 2 files) → `verify-upload`; package receipt == upload receipt's embedded receipt (`cmp` of `jq -S`). | Re-verification of exact bytes before an authority is minted. | DROP. | none (no handoff). | — | high |
| A-62 | MPA:576-622, 659-666; PMR:784-878 | Write `catch.mobile-build-authority/v2` (platform, CI ids, producer ids, targets, comparisons, packages with artifactSha256 + provenanceManifestSha256 + artifact refs), `verify-authority`, upload `mobile-build-authority-v2-<platform>-<wfid>-<runno>-<runid>-<attempt>-<sha>-<run>-<attempt>` (90 d); outputs `authority_artifact_id`, `authority_artifact_sha256`. | Input for the promoter (C-03). | REPLACE: `actions/attest-build-provenance` (subject = ipa/aab) if provenance is desired; else DROP. | Promoter's exact-bytes guarantee disappears together with the promoter. | — | high |
| A-63 | MPA:624-657 | Before uploading authority, re-check source CI run is still current & green ("Source CI was re-run while mobile packages were building; obsolete"). | Don't publish evidence for a superseded CI attempt. | DROP. | none | A-01 check. | high |
| A-64 | MIR:1003-1064 | `dispatch-promotions` (iOS only): validate ids; producer run identity/current attempt/active; authority artifact metadata (id, unexpired, digest, from this run, `main`). | Guarded handoff. | DROP. | none | — | high |
| A-65 | MIR:1065-1103 | For each `*-ios` target POST `workflow_dispatch` to `mobile-internal-promote.yml` on `ref: main` with inputs {release_target, producer_run_id, producer_run_attempt, authority_artifact_id, authority_artifact_sha256, reason, confirm:"true"}; require response `workflow_run_id`, `html_url`. **Android is never auto-dispatched** (line 1069). | Automatic TestFlight; Android promotion is manual. | REPLACE: `upload_to_testflight(skip_waiting_for_build_processing: true)` in the iOS lane + ASC automatic distribution to internal groups; `upload_to_play_store(track: "internal")` in the Android lane (now automatic too — behavior change). | Promoter-side checks (C-03) disappear: explicit grant to "all existing internal groups with testers", processing wait to `VALID`, exact-bytes recheck, Play live readiness probe. ASC automatic distribution only reaches internal groups with "automatic distribution" enabled — must be configured per app (Catch 6765646860, Catch Host 6778927317). | Optional `wait_for_build_processing` nightly job / ASC email on "Invalid Binary". | high |
| A-66 | MIR:1105-1126 | `verify-promotion-dispatches`: if iOS targets exist, dispatch job must be `success`, else `skipped`. | Run is red if handoff silently skipped. | DROP. | none | — | high |
| A-67 | apps/*/ios/Podfile (from tool/platform/ios/Podfile.template:1-125) | iOS 15.0 floor; COCOAPODS stats off; config→debug/release map for all 21 flavored configs; `use_frameworks!`; `inhibit_all_warnings!`; prebuilt `FirebaseFirestore` from `invertase/firestore-ios-sdk-frameworks` tag `12.19.3`; post_install: deployment target floor 15.0, `SWIFT_ENABLE_EXPLICIT_MODULES=NO`, geolocator `BYPASS_PERMISSION_LOCATION_ALWAYS=1` (avoid App Store static-analysis warnings), normalize versioned SDK framework paths. | Buildability on Xcode 26 + App Store review hygiene. | KEEP unchanged (build config, fastlane-agnostic). | none | — | high |
| A-68 | tool/platform/ios/CatchBuildSettings.xcconfig.template | `SWIFT_ENABLE_EXPLICIT_MODULES=NO` for app targets (included by every flavored xcconfig). | Firebase 12 SPM-only imports vs Xcode 26 explicit modules. | KEEP. | none | — | high |
| A-69 | tool/platform/sync_ios_pod_policy.mjs | `--check`/`--write` that `apps/{consumer,host}/ios/Podfile` and `…/Flutter/CatchBuildSettings.xcconfig` are byte-identical to templates (atomic write). Not called by the producer. | Two Podfiles never drift. | KEEP in PR CI (tool check `platform:ios-pod-policy`). | none | — | high |
| A-70 | tool/platform/configure_apple_flavors.rb | Dev-time generator (xcodeproj gem) from tool/app_targets.json: per role, per flavor × {Debug,Profile,Release}, writes `Flutter/<Mode>-<flavor>.xcconfig` (includes Pods, Generated, CatchBuildSettings, GoogleMapsKeys; sets `APS_ENVIRONMENT` = production only for Release+prod, `APP_ATTEST_ENVIRONMENT` = production for non-Debug, URL scheme, `GOOGLE_MAPS_IOS_API_KEY=$(GOOGLE_MAPS_IOS_API_KEY_<ENV>)`); sets Runner build settings (bundle id, product/display name, icon, entitlements, `CATCH_APP_TARGET_ID`, `FLUTTER_TARGET`, `FLAVOR`, `FIREBASE_*`), removes `CODE_SIGN_IDENTITY[sdk=iphoneos*]`; adds "Copy Firebase Environment Config" phase (copies `firebase/<env>/[host/]ios/GoogleService-Info.plist` into the bundle, patches `REVERSED_CLIENT_ID` URL scheme); prunes other-role flavors; writes shared schemes. Not called by the producer. | Native flavor wiring from one manifest. | KEEP (fastlane consumes the generated schemes/configs). | none | — | high |
| A-71 | apps/*/ios/scripts/sign_flutter_native_assets.sh (build phase pbxproj:510) | Re-signs `objective_c.framework` native asset with `EXPANDED_CODE_SIGN_IDENTITY` on device builds. | Flutter native-assets signing gap. | KEEP. | none | — | high |
| A-72 | .github/actions/cache-cocoapods/action.yml | Composite: requires Podfile.lock, caches `~/Library/Caches/CocoaPods` + `~/.cocoapods/repos` keyed by CocoaPods version + lock hash, `pod repo update` on miss. **Not used by the producer** (used by app-build-matrix.yml:221, visual-integration-ci.yml:275). | Faster pod install. | KEEP/ADOPT in new iOS lane job. | none | — | high |
| A-73 | (absence) MIR iOS job | No Xcode selection (`xcode-select`/setup-xcode) and no CocoaPods install: uses macos-26 image defaults although `tool/ci/toolchain.env` declares `COCOAPODS_VERSION=1.16.2`, `XCODE_MIN_VERSION=26.2.0`. | — (gap) | ADD in new design: `sudo xcode-select -s /Applications/Xcode_26.x.app` (or `maxim-lobanov/setup-xcode`) and `gem 'cocoapods', '1.16.2'` in Gemfile. | Current behavior: image updates can change Xcode/pods silently. | `xcodebuild -version` assertion ≥ 26.2. | high |
| A-74 | (absence) MIR Android job | No Gradle/pub caching beyond subosito; no Play versionCode floor check (iOS has A-24). | — (gap) | ADD `gradle/actions/setup-gradle` cache; ADD Play floor check (A-20). | — | — | high |

---

### 2. Facts needed to build the fastlane lanes

### Targets (tool/app_targets.json)
| | consumer (prod) | host (prod) |
|---|---|---|
| target id | `consumer-prod` | `host-prod` |
| project root | `apps/consumer` | `apps/host` |
| Flutter entrypoint (`-t`, relative to project) | `lib/main_prod.dart` | `lib/main_prod.dart` |
| display name | `Catch` | `Catch Host` |
| iOS scheme | `prod` | `host-prod` |
| iOS configuration (release) | `Release-prod` | `Release-host-prod` |
| iOS bundle id | `com.catchdates.app` | `com.catchdates.host` |
| iOS icon set | `AppIcon` | `AppIcon-host-prod` |
| iOS URL scheme | `app-1-574779808785-ios-49b1ce51418604b78ea5b0` | `app-1-574779808785-ios-dafe636b607e071f8ea5b0` |
| iOS entitlements | `ios/Runner/RunnerConsumer.entitlements` (aps-environment, appattest, associated-domains `applinks:catchdates.com`, healthkit) | `ios/Runner/RunnerHost.entitlements` (aps-environment, appattest only) |
| App Store Connect app id | `6765646860` | `6778927317` |
| Android flavor | `consumerProd` | `hostProd` |
| Android applicationId / Play package | `com.catchdates.app` | `com.catchdates.host` |
| Firebase project | `catch-dating-app-64e51` (number 574779808785) | same |
| Firebase iOS app id | `1:574779808785:ios:49b1ce51418604b78ea5b0` | `1:574779808785:ios:dafe636b607e071f8ea5b0` |
| Firebase Android app id | `1:574779808785:android:81edbfa0d4aba7c48ea5b0` | `1:574779808785:android:0093178ee6681c828ea5b0` |
| Firebase config sources | `firebase/prod/{ios/GoogleService-Info.plist, android/google-services.json}` | `firebase/prod/host/{ios,android}/…` |
| marketing version (pubspec) | `1.0.2` (`version: 1.0.2+3`) | `1.0.1` (`version: 1.0.1+3`) |

Apple team id: `2HQBK4UMUT` (ExportOptions.prod.plist). `apps/{consumer,host}/firebase` are symlinks to `../../firebase`.
Current Play track in policy is **`qa`** (tool/app_targets.json `releasePolicy.android.track`), not `internal`; CAT asserts `qa`.
Play publisher SA: `github-actions-play-publisher@catch-dating-app-64e51.iam.gserviceaccount.com` via GitHub OIDC (no JSON key; docs/release_operations.md:1226-1235 says "Do not add a long-lived Google Play JSON key"). Upload cert SHA-256 `3088F763A60FD9F7CA99204D6A68EF93A30263A697E563EF883B29DBBC7AE23E`.

### Build commands (exact, from MIR, run from repo root)
iOS (per role R ∈ consumer|host):
1. `./tool/write_ios_maps_key_xcconfig.sh prod "apps/R/ios/Flutter/GoogleMapsKeys.xcconfig"` (env `GOOGLE_MAPS_IOS_API_KEY_PROD`).
2. `./tool/flutter_with_env.sh prod --role R build ios --release --config-only --build-name=<pubspec version w/o +N> --build-number=<BN>`
   → effective: `cd apps/R && flutter build ios --release --config-only --build-name=… --build-number=… -t lib/main_prod.dart --flavor <prod|host-prod> --dart-define-from-file=<repo>/tool/env/dart_defines/prod.json --dart-define=CATCH_APP_ROLE=R` (after copying prod Firebase files and validating Maps config).
3. `xcodebuild -workspace apps/R/ios/Runner.xcworkspace -scheme <prod|host-prod> -configuration <Release-prod|Release-host-prod> -destination generic/platform=iOS -archivePath $RUNNER_TEMP/<consumer_prod|host_prod>.xcarchive -allowProvisioningUpdates -authenticationKeyPath <p8> -authenticationKeyID <id> -authenticationKeyIssuerID <issuer> -hideShellScriptEnvironment archive`
4. `xcodebuild -exportArchive -archivePath … -exportPath build/ios/export/<target_id> -exportOptionsPlist apps/R/ios/ExportOptions.prod.plist -allowProvisioningUpdates -authentication…` (3 attempts on `correct format`).

Android (per role R):
1. key.properties + keystore at `apps/R/android/{key.properties,keystore/upload-keystore.jks}` (A-48).
2. `GOOGLE_MAPS_ANDROID_API_KEY_PROD=…` appended to `apps/R/android/local.properties`.
3. `CATCH_GRADLE_WRAPPER_MAX_ATTEMPTS=5 CATCH_GRADLE_WRAPPER_RETRY_DELAY_SECONDS=20 ./tool/flutter_with_env.sh prod --role R build appbundle --release --build-name=… --build-number=…`
   → effective: `cd apps/R && flutter build appbundle --release … -t lib/main_prod.dart --flavor <consumerProd|hostProd> --dart-define-from-file=…/prod.json --dart-define=CATCH_APP_ROLE=R`.
4. Output: the single `*.aab` under `apps/R/build/app/outputs/bundle/`.

Dart defines (`tool/env/dart_defines/prod.json`): `APP_ENV=prod`, `USE_FIREBASE_EMULATORS=false`, `USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER=false`, `ENABLE_PUSH_MESSAGING=true`, `ENABLE_OBSERVABILITY_COLLECTION=false`, `EMIT_OBSERVABILITY_SMOKE_EVENT=false`, `FIREBASE_WEB_VAPID_KEY`, `FIREBASE_APP_CHECK_WEB_RECAPTCHA_ENTERPRISE_SITE_KEY`, `CATCH_PRIVACY_POLICY_URL`, `CATCH_TERMS_URL`, `CATCH_HELP_URL` (public values, committed). Selected purely by the first wrapper arg `prod`. Wrapper also forwards, if set in env/.env files: `FIREBASE_APP_CHECK_DEBUG_TOKEN`, `VERBOSE_AUTH_DEBUG_LOGS`, `DISABLE_AUTH_APP_VERIFICATION_FOR_TESTING`, `USE_FIREBASE_APP_CHECK_DEBUG_PROVIDER`, `ENABLE_OBSERVABILITY_COLLECTION`, `EMIT_OBSERVABILITY_SMOKE_EVENT` — none set in CI (keep it that way; a stray env var would override prod defines). No `--obfuscate` / `--split-debug-info`.

### Signing
- iOS: automatic signing (`signingStyle=automatic`, `CODE_SIGN_IDENTITY` not set — CAT forbids setting it). Archive signed with a reusable **Apple Development** identity imported from p12 into a temp keychain; distribution signing happens at export with `method=app-store-connect` using cloud-managed certificates via the ASC API key and `-allowProvisioningUpdates` (Xcode creates/repairs profiles). No provisioning profiles or distribution cert stored in secrets. Export options: see A-39.
- Android: upload keystore from secrets; Play App Signing holds the app signing key.

### Secrets / vars (names only; environment `prod-mobile`)
Secrets: `APP_STORE_CONNECT_API_KEY_BASE64`, `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, `IOS_CI_DEVELOPMENT_CERTIFICATE_P12_BASE64`, `IOS_CI_DEVELOPMENT_CERTIFICATE_PASSWORD`, `GOOGLE_MAPS_IOS_API_KEY_PROD`, `ANDROID_UPLOAD_KEYSTORE_BASE64`, `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`, `GOOGLE_MAPS_ANDROID_API_KEY_PROD`; plus `github.token`.
Vars: `IOS_CI_DEVELOPMENT_CERTIFICATE_ID`, `IOS_CI_DEVELOPMENT_CERTIFICATE_SHA256`, `IOS_CI_DEVELOPMENT_CERTIFICATE_EXPIRES_AT`.
Promoter (not producer) additionally uses vars `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` (OIDC, `google-github-actions/auth@v3`).
fastlane `supply` natively wants a service-account JSON key (`json_key`/`json_key_data`); using OIDC/external-account credentials needs verification (low confidence it works out of the box) — conflicts with the documented no-JSON-key policy.

### Build numbers / versions
- iOS `CFBundleVersion` = `YYYYMMDD` (UTC date of CI attempt) + `%08d` CI run_number + `%02d` attempt, 18 chars (e.g. `202607110000002601`). Floor-checked against last 200 ASC builds (A-24). `manageAppVersionAndBuildNumber=false`.
- Android `versionCode` = `100000 + ci_run_number*100 + attempt` (e.g. run 26 attempt 1 → `102601`), ≤ 2,100,000,000. No Play floor check in producer.
- Monotonicity relies on the **CI workflow's** run_number; a new workflow restarts at 1 (see A-19/A-20).
- `CFBundleShortVersionString`/`versionName` = pubspec version without `+N`.

### Crashlytics / symbols
- iOS: dSYMs uploaded during archive by the Xcode build phase "[firebase_crashlytics] Crashlytics Upload Symbols" (Release/Profile only), consumer via `tool/platform/upload_crashlytics_symbols.py` (validate 30 s, upload 180 s), host directly; failure fails the archive. Export also `uploadSymbols=true` to Apple.
- Android: `com.google.firebase.crashlytics` Gradle plugin `3.0.6` applied in both apps; no explicit `mappingFileUploadEnabled`/`nativeSymbolUploadEnabled` config, no explicit minify (Flutter's Gradle plugin defaults apply) — mapping upload behavior is plugin default (med confidence).

### Toolchain / runners / caching
- `tool/ci/toolchain.env`: Flutter `3.47.8` (stable), Node `24`, Java `21` (temurin), firebase-tools `15.20.0`, CocoaPods `1.16.2` (declared, not installed by producer), `APPLE_CI_RUNNER=macos-26`, `XCODE_MIN_VERSION=26.2.0` (not enforced at runtime by producer).
- Runners: iOS build `macos-26`; Android build + authority/dispatch jobs `ubuntu-latest`.
- bundletool `1.18.3` (sha256 above). Gradle wrapper 8.14 (sha256 `61ad310d3c7d3e5da131b76bbf22b5a4c0786e9d892dae8c1658d4b484de3caa`). Java source/target 17. minSdk ≥ 26.
- Caching in producer: only `subosito/flutter-action@v2 cache: true`. No CocoaPods, Gradle, or pub cache steps. `.github/actions/cache-cocoapods` exists but unused here.
- Podfile pulls `FirebaseFirestore` via git from GitHub (source of the TLS-retry in FWE:186-191).
- `ITSAppUsesNonExemptEncryption=false` present in both Info.plists (TestFlight won't stall on export compliance).

---

### 3. Coupling

| ID | Direction | Coupled thing | Location |
|---|---|---|---|
| C-01 | consumes | CI `push` on main uploads `harness-plan-<runno>-<runid>-<sha>-<attempt>` and `harness-success-v3-<wfid>-<runno>-<runid>-<sha>-<attempt>` (`catch.ci-delivery-authority/v3`, retention 90) | .github/workflows/ci.yml:660, 753, 914, 992-1040 |
| C-02 | consumes | Impact plan `operations.releaseTargets/releaseRoles` from the harness planner | tool/harness.mjs:64-65; tool/harness/lib/component_graph.mjs:430-545; tool/harness/component_graph.json:428-602 |
| C-03 | produces → | `mobile-build-authority-v2-*`, `mobile-package-v1-*`, `mobile-package-receipt-v1-*` artifacts and `workflow_dispatch` to the promoter (iOS only); promoter re-verifies producer identity by name "Mobile Internal Release" / path / event `workflow_run` | .github/workflows/mobile-internal-promote.yml:15-39, 87-192, 226-417, 503-510, 604-621, 881-946; tool/ci/mobile_promotion_core.mjs:81-92 |
| C-04 | coupled | Text/regex conformance of MIR+MPA (≈45 required markers, forbidden `workflow_dispatch`, altool, Play upload, `--apply`; exactly one `-exportArchive`; no `CODE_SIGN_IDENTITY=`) and policy fields in app_targets.json (`trigger`, `approvalMode`, `track: qa`, `uploadTool: altool`, …) | tool/platform/check_app_targets.mjs:335-540, 744-756; tool/app_targets.json `releasePolicy` and each prod target `release` |
| C-05 | coupled | Workflow source tests | tool/ci/mobile_release_workflow.test.mjs (tests :25-354), tool/ci/mobile_platform_authority_workflow.test.mjs:10, tool/ci/mobile_promotion_workflow.test.mjs, tool/ci/mobile_promotion_core.test.mjs, tool/platform/mobile_release_target_contract.test.mjs |
| C-06 | coupled | Apple runner pin check requires `runs-on: …macos-26` in MIR | tool/ci/check_toolchain_consistency.sh:95-105 |
| C-07 | coupled | tools-ci sparse checkout includes MIR/promote paths | .github/workflows/tools-ci.yml:75-85 |
| C-08 | coupled | Tool manifest entries (`ci:mobile-release-workflow`, `ci:mobile-promotion-core`, `platform:*`) and harness component graph ownership of these files | tool/tools_manifest.json:~981-997, 3785, 4215, 4279, 4305, 4453-4485; tool/harness/component_graph.json (41 refs) |
| C-09 | consumes | `tool/app_targets.json`, `tool/env/dart_defines/prod.json`, `firebase/prod/**`, `tool/firebase/client_callable_dependencies.json`, `tool/platform/mobile_package_policy.json`, `tool/ci/toolchain.env`, `apps/*/ios/ExportOptions.prod.plist`, gradle wrapper props | as cited |
| C-10 | consumes (live) | ASC API `/v1/builds` (floor check); prod Cloud Functions endpoints (callable probe); GitHub Actions API (runs, attempts, jobs, artifacts, workflows, dispatches) | MIR:72-133, 514-520, 1032-1093; MPA:87-124, 349-388, 634 |
| C-11 | doc | Release runbook describes this flow, secrets, cert rotation, `prod-mobile` env | docs/release_operations.md:693-744, 1170-1240 |
| C-12 | env | GitHub environment `prod-mobile` (approval-free, main-only branch policy) holds all signing secrets | MIR:290, 725; docs/release_operations.md:708 |
| C-13 | note | HEAD commit `dd775d752` "main re-runs no validation once the merge queue proved its commit" — the producer still requires a successful main `push` CI run that uploads C-01 artifacts | git log |

Retiring MIR/MPA requires, in the same change: rewriting CAT `validateReleaseOwnership` (C-04) and `releasePolicy` in app_targets.json, deleting/rewriting C-05 tests, updating C-06/C-07/C-08 path lists, and retiring or rewriting the promoter (C-03) and runbook (C-11).

---

### 4. Safety properties worth preserving (ranked)

1. **Build-number monotonicity across the cutover** (A-19, A-20, A-24). The Android formula keys off the *CI workflow's* run_number; a new workflow restarts at 1 and Play will reject every upload. Seed from `google_play_track_version_codes` max+1 (all tracks) and `latest_testflight_build_number`+1, and keep a pre-build floor check on both stores.
2. **Signed-artifact identity verification before upload** (A-41, A-51): correct bundle id/applicationId, role marker, Flutter entrypoint, *prod* Firebase app/project, compiled Maps key, prod `aps-environment`/`appattest` = production, `get-task-allow=false`, non-debuggable, role-exact entitlements (Host has no HealthKit/associated-domains). Keep the two node scripts as `sh` steps between build and upload; they're cheap and the stores don't catch most of this.
3. **Prod config selection through `flutter_with_env.sh`** (A-34, A-50): prod Firebase files, prod dart-defines, `CATCH_APP_ROLE`, `lib/main_prod.dart`, flavor. Calling `flutter build`/`gradle`/`gym` without the wrapper can silently ship dev Firebase or the wrong role.
4. **Client/backend skew probe** (A-22): Host must not ship before its prod callables exist. It's a seconds-long, credential-free step.
5. **Package policy** (A-42): size budgets, no test fixtures, no consumer-only native SDKs (HealthKit, Razorpay) in Host.
6. **Persistent iOS signing identity, or match** (A-27): automatic signing on clean runners without the imported dev cert mints a new certificate per run until Apple's limit is hit. Keep it non-blocking with a 30-day expiry warning (A-32).
7. **Main-only, protected-environment signing** (A-04, A-13): `prod-mobile` branch policy = main and job `if: github.ref == 'refs/heads/main'`, plus an optional green-CI-on-SHA gate (A-01).
8. **Crashlytics symbol upload** (A-36), but make it non-fatal or bounded. Right now a Crashlytics outage fails the archive, and Host has no timeout.
9. Platform independence (A-53) and export-failure diagnostics (A-40). Nice to have.

Everything else in the authority/receipt/attempt/dispatch chain (A-05–A-12, A-43–A-45, A-54–A-66) exists only to hand exact bytes safely across workflows and attempts. It can go once one job builds, verifies, and uploads. If a provenance record is still wanted, `actions/attest-build-provenance` on the .ipa/.aab replaces it.

## Appendix B: store promotion ledger

Source: `.github/workflows/mobile-internal-promote.yml` and the
`tool/platform` store scripts, audited at `dd775d752`.

### 1. Ledger

### 1a. Workflow `mobile-internal-promote.yml`

| ID | Location | What it does | Why it exists / failure prevented | Proposed fate | Regression if replaced/dropped | Cheaper alternate check | Conf. |
|---|---|---|---|---|---|---|---|
| B-01 | PROMOTE:3-39 | Takes `workflow_dispatch` inputs: `release_target` (one of consumer/host × android/ios), `producer_run_id`, `producer_run_attempt`, `authority_artifact_id`, `authority_artifact_sha256`, `reason`, `confirm` (bool). | Lets a person or the producer name *one exact, already-built* package to push to a store. | REPLACE: a fastlane lane started by `schedule` (nightly) or `workflow_dispatch` with small inputs (`platform`, `app`, optional `ref`). The production lane becomes its own dispatch-only workflow. | You can no longer say "ship *that exact* file from run N". Instead you rebuild from a commit. Acceptable for test builds. For production, promote an *existing store build* (TestFlight build → App Store, Play internal → production) instead of re-uploading. That is how both stores intend promotion to work. | none | high |
| B-02 | PROMOTE:41-44 | Workflow permissions: `actions: read`, `contents: read`, `id-token: write`. | Least privilege. `id-token` is needed for Google OIDC. | KEEP (same block; add nothing). | none | – | high |
| B-03 | PROMOTE:48-50 | Chooses the runner: `macos-26` for `*-ios`, `ubuntu-24.04` for Android. 90-minute timeout. | iOS upload tooling needs macOS. | KEEP (separate iOS/Android jobs). | none | – | high |
| B-04 | PROMOTE:51 | `environment: prod-mobile`. | Holds the ASC secrets. The Google WIF principal is bound to `repository_environment/1170579691:prod-mobile` (docs/release_operations.md:1241), so Play auth only works inside this environment. Per `remote_ops_manifest.json:798` it is approval-free. | KEEP: GitHub Environments. Restrict "Deployment branches" to `main`. Add a separate environment with *required reviewers* for the future production lane. | none if kept. If the environment name changes, the WIF principal binding must change too, or Play auth breaks. | – | high |
| B-05 | PROMOTE:52-55 | Concurrency group `mobile-internal-promotion-<target>`, `cancel-in-progress: false`, `queue: max`. | Stops two promotions of the same target from racing (double upload, double track edit). | KEEP: `concurrency: {group: mobile-<platform>-<app>, cancel-in-progress: false}`. | If `queue: max` is dropped, GitHub keeps only one *pending* run per group and cancels older pending ones. That is fine for nightly runs. | – | med (`queue:` is a newer GitHub key; also used in `_web-hosting-promote.yml:52`) |
| B-06 | PROMOTE:69-84 | Hard guards: event must be dispatch, ref must be `refs/heads/main`, **run attempt must be 1** (no "Re-run"), producer id ≠ own id, numeric/regex shapes, `confirm == true`, reason non-blank and ≤500 chars. | Stops a branch from promoting, and stops a "re-run" from reusing a stale context. | REPLACE: Environment deployment-branch policy (`main` only) covers the ref. Drop the rest. | Re-runs become allowed. Harmless: Apple rejects a duplicate build number, and Play rejects a re-used version code. | – | high |
| B-07 | PROMOTE:86-104 | Looks up the canonical `mobile-internal-release.yml` workflow id. Fetches the authority artifact metadata (not expired, digest = input). Classifies its name as `mobile-build-authority-v2-<platform>-*` (per-platform) or legacy `v1-*`. | Stops someone pointing the promoter at an authority for the wrong platform or from a look-alike workflow. | DROP (no separate producer). | none (the threat disappears when build and upload happen in one job) | – | high |
| B-08 | PROMOTE:105-133 | Polls the producer run up to 60×10 s (10 min). Each time it re-checks that `run_attempt` is unchanged. For v2 it waits for job `"Verify <platform> packages / Publish verified mobile build authority"` to succeed. For v1 it waits for the whole run to complete. Unknown status → exit 64. | Lets iOS promote while Android is still building, but never before the iOS authority exists. Kills the dispatch if the producer is re-run. | DROP. | none. (Note the hidden coupling to a **job display name string**, also at PROMOTE:521 and 893.) | – | high |
| B-09 | PROMOTE:134-193 | Binds the producer run *and* the exact attempt: same id/attempt/workflow id, name "Mobile Internal Release", path, `event == workflow_run`, `head_branch == main`, same repo, 40-hex head SHA. Status is success, or (v2 only) in-progress / queued / failed (the sibling platform may fail). Outputs `producer_head_sha`, `run_number`. | Stops artifacts from a fork, a branch, another workflow, or a superseded attempt being promoted. | DROP. | none for same-job build+upload | – | high |
| B-10 | PROMOTE:195-216 (repeated 528-539, 856-867) | Checks out `github.sha`, then requires that this SHA is an ancestor of current `origin/main` and that nine release-logic files (`mobile-internal-promote.yml`, `app_targets.json`, `mobile_promotion_core.mjs`, `package_mobile_release.mjs`, `distribute_testflight_build.mjs`, `probe_google_play_access.mjs`, `resolve_app_target.mjs`, `upload_google_play_bundle.mjs`, `verify_app_store_build.mjs`) are unchanged since then. | If release code changed on main after dispatch, the old run must not act with stale rules. | DROP. | A queued run may run the previous lane code. Trivial for test builds. | – | high |
| B-11 | PROMOTE:218-223 | Loads the pinned toolchain (`.github/actions/load-toolchain`) and sets up Node. | Pinned Node for the `.mjs` tools. | REPLACE: `ruby/setup-ruby` + `bundler-cache: true` (Gemfile.lock pins fastlane), plus Flutter setup if building in the same job. Keep Node only if B-53/B-58 survive as scripts. | none | – | high |
| B-12 | PROMOTE:237-261 (copies at 342-366, 470-494, 830-854) | `verify_zip_paths`: rejects empty archives, absolute paths, backslashes, `..` segments, duplicate entries, and any non-regular entry (symlink/device), via `unzip -Z1` + `zipinfo -s`. Also `find -type l` = 0 after extraction (290, 396, 634, 748, 960). | Zip-slip and symlink tricks in a downloaded artifact. | DROP. | none: nothing is downloaded from another run when build and upload share a job. If artifacts still cross jobs, `actions/download-artifact@v4+` verifies the digest. | – | high |
| B-13 | PROMOTE:263-293 | Fetches authority artifact metadata (API version 2026-03-10). Requires id, not expired, `digest == sha256:<input>`, `workflow_run.id`, same `repository_id` / `head_repository_id`, `head_branch == main`, `head_sha == producer_head_sha`. Downloads the zip, checks the SHA-256 equals the input, requires exactly one regular file `mobile-build-authority.json`. | Binds the dispatch to *one* immutable authority file from the right run. | DROP (or REPLACE with `actions/attest-build-provenance` + `gh attestation verify` if a cross-run handoff is ever kept). | none for same-job | – | high |
| B-14 | PROMOTE:295-316 | `mobile_promotion_core.mjs select`: validates the authority schema (v1/v2), producer binding, and that the target is authorized with exactly one package entry. Emits source SHA, source CI workflow id / run number / run id / attempt, package artifact {id, name, digest}, signed-artifact SHA-256, provenance-manifest SHA-256. Re-checks that the artifact name matches the computed name (302-303). | The authority, not the operator, decides which package is promoted. The operator cannot swap in a different package id. | DROP. | none for same-job | – | high |
| B-15 | PROMOTE:318-326 (repeated 540, 868) | Requires the authority's `source_sha` to be a real commit that is an ancestor of `origin/main`. | Prevents shipping code from rewritten or force-pushed history, or from a branch. | REPLACE: build only from `main` (schedule runs on default branch; dispatch restricted by the Environment branch policy). | none | – | high |
| B-16 | PROMOTE:328-414 | Downloads the package artifact by id (metadata checks as in B-13, plus name). Checks the zip digest, then runs `mobile_promotion_core.mjs verify-package`. That requires exactly 6 sidecar files plus the binary (`delivery-provenance.json`, `identity-receipt.json`, `mobile-package-receipt.json`, `package-policy-receipt.json`, `source-ci-delivery-authority.json`, `source-impact-plan.json`; package_mobile_release.mjs:33-40). Each file's size+SHA-256 must match its descriptor. CI authority v3, impact plan complete / `main` mode / includes the target, identity receipt `export` stage + `signatureVerified`, package-policy findings empty, provenance digest + stage `mobile-<target>`, artifact SHA = authority SHA, safe file name. Outputs bundle id / app id, version, build. | End-to-end chain: this binary is the one CI approved for this commit, and its identity and size checks passed. | DROP the chain. KEEP the substance by running the identity checks (B-53, B-55, B-58) and the size gate (`check_mobile_package.mjs`, producer) *in the same lane, before upload*. | Loses the machine-checked link "binary ↔ CI-approved commit ↔ impact plan". Replace it with a lighter record: B-36 summary + attestation (section 4). | `actions/attest-build-provenance` on the IPA/AAB (records the commit + workflow run, signed by GitHub). | high |
| B-17 | PROMOTE:416-444 | Resolves the canonical store target from `tool/app_targets.json` via `resolve_app_target.mjs`. iOS: target id `<role>-prod`, package bundle id == `ios.bundleId`, ASC app id numeric. Android: application id == `release.googlePlayPackageName`. | Stops a Host binary going to the Consumer store record, or vice versa. | KEEP (cheap): fastlane `app_identifier` / `package_name` per lane, taken from `Appfile` or `app_targets.json`. The stores also enforce it: ASC rejects an IPA whose bundle id doesn't match the app record, and Play rejects an AAB whose package ≠ the app. | none: the store rejects a mismatch | one-line `UI.user_error!` if the built bundle id ≠ the lane's app id | high |
| B-18 | PROMOTE:446-686 | "Final" re-verification, a second full pass. Re-checks the producer run and platform job, promoter drift (B-10), source ancestry, the canonical `ci.yml` id, source CI run *current* and *exact attempt*, authority + package metadata again, and both zip hashes again. Deletes and re-extracts, re-runs `select` + `verify-package`, re-hashes the binary, re-asserts identity equality. Outputs `artifact_path`, `artifact_sha256`, version, build. | Time-of-check vs time-of-use: makes sure nothing changed between the first check and the store calls. | DROP. | none (GitHub artifacts are immutable and the runner is ephemeral) | – | high |
| B-19 | PROMOTE:542-591 (again 900-922) | Requires the source CI run to be `name == "CI"`, path `ci.yml`, `event == push`, branch `main`, same repo, `head_sha == source_sha`, completed/success, *current attempt == recorded attempt*. | "Never ship a commit whose CI did not pass, or whose CI was re-run after the build." | REPLACE: building from `main` is already gated by the merge queue / branch protection (note HEAD commit dd775d752: "main re-runs no validation once the merge queue proved its commit"). | Small: a nightly could build a `main` commit whose post-merge checks failed. Name it. | One step: `gh api repos/$R/commits/$SHA/check-runs` (or `gh run list --commit $SHA --workflow ci.yml --json conclusion`) and fail unless green. Optional. | med |
| B-20 | PROMOTE:688-801 | Prior-claim lookup. Name `mobile-promotion-claim-v1-<target>-<packageArtifactId>-<signedSha256>`. Lists non-expired artifacts by that name. 0 → `prior_receipt=false`. Exactly 1 → download, digest check, sole entry `mobile-promotion-receipt.json`, `verify-receipt` (canonical JSON, every binding equal, `evidenceLevel == exact-artifact`, iOS `store.result == uploaded`). The prior run id must equal the artifact's run, and that run must be this workflow on main, completed success/failure/cancelled. Outputs `prior_remote_id`. | Idempotency for iOS: lets a retry skip a second upload and go straight to group assignment, *only* if this exact byte-set was proven uploaded before. | DROP. | Small. With ASC automatic distribution there is no separate group-assignment step to retry. Re-uploading the same build number is rejected by Apple, so a failed nightly is just retried with a new build number. | – | high |
| B-21 | PROMOTE:803-992 | Third full re-verification "immediately before credentials" (same content as B-18, plus an equality check against the B-18 outputs). | Same as B-18. | DROP. | none | – | high |
| B-22 | PROMOTE:994-1011 | Only after verification, decodes the ASC `.p8` key to `~/.appstoreconnect/private_keys/AuthKey_<id>.p8` with mode 600. | Credentials exist only after all checks pass, so a tampered artifact never runs next to a live key. | REPLACE: fastlane `app_store_connect_api_key(key_id:, issuer_id:, key_content:, is_key_content_base64: true)` (in memory). | none material (ephemeral runner) | – | high |
| B-23 | PROMOTE:1013-1051 + verify_app_store_build.mjs:49-107 | iOS preflight. Lists the app's builds (one page, ≤200, newest first). >1 build with this number → error. Exactly 1 VALID/PROCESSING → allowed only if a prior claim exists with the same ASC build id ("ambiguous upload fails closed", exit 64). Any other state → error. Any *newer* build number exists → error. Else `upload-required`, which requires no prior claim. | (a) Never claim "we uploaded these bytes" when ASC only shows a matching *number*. (b) Never upload an older build after a newer one. | REPLACE: `upload_to_testflight` fails on a duplicate build number, and the build-number scheme is monotonic by construction (B-47, §2). | (a) Lost on purpose: no claim of byte-exactness. (b) The "newer exists" guard goes; an older build could be pushed after a newer one if someone dispatches an old ref. Small. | `latest_testflight_build_number(app_identifier:)` and `UI.user_error!` if it's ≥ ours: 3 lines in the lane | med |
| B-24 | PROMOTE:1053-1075 | Re-hashes the IPA, then `xcrun altool --upload-package` with `--apple-id <ASC app id>`, `--bundle-id`, `--bundle-version`, `--bundle-short-version-string`, `--api-key`, `--api-issuer`. | The actual TestFlight upload of already-signed bytes. | REPLACE: fastlane `upload_to_testflight(ipa:, api_key:, app_identifier:)` (pilot). | none | – | high |
| B-25 | PROMOTE:1077-1114 + verify_app_store_build.mjs:109-152 | Waits for processing: polls `builds?filter[app]&filter[version]` every 30 s for up to 45 min with a fresh JWT each poll, tolerating "not visible yet". Requires `VALID`. Any state other than PROCESSING → fail. If preflight was `existing-processing`, the final id must match. Result `uploaded` or `already-promoted`. | The job only goes green when Apple has accepted the binary, so a processing failure such as an invalid binary isn't hidden. | REPLACE: `upload_to_testflight` waits by default (`wait_processing_interval`, `wait_processing_timeout_duration`). For nightly, optionally `skip_waiting_for_build_processing: true` to save macOS minutes. | If waiting is skipped, a processing failure only shows up as Apple's email and as "Invalid" in ASC, not as a red job. | Keep the default wait, or accept the Apple email. | high |
| B-26 | PROMOTE:1116-1133 | `always()`: deletes the `.p8` key, guarding the path to `~/.appstoreconnect/private_keys/AuthKey_*.p8`. | No key on disk during later steps. | DROP (fastlane in-memory key; hosted runner is destroyed). | none | – | high |
| B-27 | PROMOTE:1135-1145 | `google-github-actions/auth@v3`: WIF via `vars.GCP_WORKLOAD_IDENTITY_PROVIDER`, `vars.GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`, scope `androidpublisher`, `token_format: access_token`, credentials file + env exported. | Keyless Play auth (docs/release_operations.md:1227-1235 forbid long-lived JSON keys). | KEEP: same action, then `upload_to_play_store(json_key: ENV['GOOGLE_APPLICATION_CREDENTIALS'])`. | **Risk:** fastlane `supply` historically expected a *service-account* JSON key. Check that the installed fastlane accepts the WIF *external_account* credentials file before you delete the Node uploader. If it doesn't, the choices are a JSON key (which breaks a written policy) or keeping a small API call. | Dry run: `upload_to_play_store(validate_only: true)` with WIF creds. | low-med |
| B-28 | PROMOTE:1147-1176 + probe_google_play_access.mjs | Before *any* Android upload, probes **both** `com.catchdates.app` and `com.catchdates.host`: create an edit, read track `qa`, read `testers/qa`, require ≥1 valid Google Group email, delete the edit, never commit. Asserts `ready`, the package order, every `*Verified` flag, `committed == false`. Writes a step summary. | Fails early if the Play app record, permissions, track, or testers are missing. Otherwise an upload "succeeds" to a track nobody can install from. | DROP (Play Console setup is a one-time human checklist). | (1) An upload to a track with no testers succeeds silently. (2) A Consumer upload is currently **blocked by Host record problems** (it probes both); dropping this removes that coupling, which is a gain. | One-time manual check in Play Console, or `upload_to_play_store(validate_only: true)` on the first run. | high |
| B-29 | PROMOTE:1178-1224 | Re-hashes the AAB, runs `upload_google_play_bundle.mjs --track qa --release-name "GitHub exact <target> <versionName> (<code>)" --apply --allow-prod`. Asserts package / track `qa` / versionCode / sha256 echo and an operation of `uploaded|resumed|already-promoted`, mapped to `uploaded|reconciled|already-promoted`. | Exact AAB to the Play test track, idempotently. | REPLACE: `upload_to_play_store(track: 'internal', aab:, release_status: 'completed', skip_upload_metadata/images/screenshots: true)`. | See B-64…B-71 (idempotency, rollback guard). **Track changes from `qa` (custom closed-testing track) to `internal`**, and tester lists must be set up on `internal`. | – | high |
| B-30 | PROMOTE:1226-1247 | `always()`: deletes the `gha-creds-*.json` file (path-guarded) and blanks `CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_GHA_CREDS_PATH`. | No credential during the "receipt" steps. | DROP: `google-github-actions/auth` has `cleanup_credentials: true` by default (post step). | none | – | high |
| B-31 | PROMOTE:1249-1304 | Only when there was no prior claim: hashes `reason` (SHA-256) and writes `mobile-promotion-receipt.json` via `mobile_promotion_core.mjs receipt` (fields in §2). Asserts that `claimArtifactName` equals the B-20 name. | Durable, machine-checkable record that *these bytes* went to *this store build*. | REPLACE: job summary (B-36) + `actions/attest-build-provenance` on the binary + store build history. | You lose a single JSON that ties CI run ↔ artifact ids ↔ SHA ↔ store build id. Section 4 explains how rarely anyone would read it. | Section 4 | high |
| B-32 | PROMOTE:1306-1313 | Uploads the claim artifact (name from B-20, `if-no-files-found: error`, 90-day retention) *before* distribution. | Lets an iOS retry after a group-assignment failure re-use the proof instead of uploading again. | DROP. | none (no assignment step with auto-distribution) | – | high |
| B-33 | PROMOTE:1315-1333 | iOS: re-creates the `.p8` (requires that it doesn't already exist) only for distribution. | Smallest credential window. | DROP. | none | – | high |
| B-34 | PROMOTE:1335-1389 | iOS: `distribute_testflight_build.mjs --apply --allow-prod`, writing `testflight-distribution-receipt.json`. Asserts `applied`, policy `all-existing-internal-groups-with-testers`, all ids equal, `selectedGroupCount > 0`, every group `testerCount > 0 && hasBuildAccess`. Outputs group count / names / operation. | Gives each new build to the existing internal tester groups; refuses to "succeed" if no group has testers. | REPLACE: turn on **automatic distribution** for the internal TestFlight group(s) in ASC (`hasAccessToAllBuilds = true`). The script already treats such groups as having access (distribute_testflight_build.mjs:172-178, 205-206). | You lose the guard "at least one internal group with ≥1 tester exists". If someone empties the group, builds upload green but reach nobody. | Monthly or ad-hoc: `fastlane pilot list` (or an ASC API GET of `apps/{id}/betaGroups`) and check for an internal group with testers. Or just notice that nobody got the build. | high |
| B-35 | PROMOTE:1391-1408 | `always()`: deletes the re-created key. | – | DROP. | none | – | high |
| B-36 | PROMOTE:1410-1440 | Re-hashes the artifact. Asserts the key file / creds file are gone and `GOOGLE_APPLICATION_CREDENTIALS` is empty. Writes a job summary: target, producer run/attempt, authority + package artifact ids, **signed-byte SHA-256**, claim name, claim reused, TestFlight group names / operation, "reason recorded in dispatch inputs". | Human-readable record of what shipped. | KEEP (simplified): `$GITHUB_STEP_SUMMARY` lines with app, platform, version, build number / version code, commit SHA, SHA-256 of the IPA/AAB, ASC build id or Play track. | none | – | high |
| B-37 | PROMOTE:1442-1449 | Uploads `testflight-distribution-v1-<target>-<pkgId>-<ascBuildId>-<runId>-<attempt>` (90 days). | Audit record of group assignment. | DROP. | none (ASC shows which groups have a build) | – | high |
| B-38 | PROMOTE:81-84, 1261, 1275, 1439 | `reason` input: non-blank, ≤500 chars. Stored only as a SHA-256 in the receipt. The summary says "recorded in protected dispatch inputs". | Records why a person touched a store. | REPLACE: for the production lane, GitHub Environment **required reviewers** (records approver + comment in the deployment log). Not needed for nightly. | Nightly runs have no "reason" (fine). | – | high |
| B-39 | mobile-internal-release.yml:1003-1104 (coupled behavior) | The producer **automatically** dispatches PROMOTE once per authorized **iOS** target (`continue` for non-iOS at :1069). `verify-promotion-dispatches` (:1105-1125) fails the producer if handoff failed. **Android is never auto-dispatched** and needs a manual dispatch. | Automatic iOS internal delivery after every role-impacted main build. | REPLACE: nightly `schedule` + on-demand `workflow_dispatch` running one lane per platform/app. | Builds no longer follow every merge (the owner wants this). | – | high |

### 1b. `tool/platform/distribute_testflight_build.mjs` (called only at PROMOTE:1351)

| ID | Location | What it does | Why / failure prevented | Fate | Regression | Alternate | Conf. |
|---|---|---|---|---|---|---|---|
| B-40 | :9-36, :107-134 | Strict input validation (decimal ids, resource ids, 64-hex SHA, build number `^\d+(\.\d+){0,2}$` ≤18 chars, target `(consumer|host)-ios`, token shape). | Injection / garbage guards. | DROP | none | – | high |
| B-41 | :38-78 | ASC JSON client with error detail. Paginates up to 20 pages and rejects pagination loops and off-origin `next` links. | Robust paging. | REPLACE (fastlane Spaceship) | none | – | high |
| B-42 | :136-154 | GET `builds/{id}`: the id must match, `version == buildNumber`, `processingState == VALID`, and the build must belong to the app id. | Never distribute the wrong or unprocessed build. | REPLACE: ASC auto-distribution only distributes processed builds of that app. | none | – | high |
| B-43 | :156-186 | Lists the app's beta groups and keeps only `isInternalGroup`. For each, counts testers and lists linked builds. Selects groups with testers >0, sorted, and **fails if there are none**. Never creates groups or changes membership. | Refuses a "success" that reaches nobody. Never adds people automatically. | REPLACE (auto-distribution) | The "≥1 internal group with testers" guard is lost (see B-34). The "never edits membership" property is kept automatically. | B-34 alternate | high |
| B-44 | :188-215 | POST `builds/{id}/relationships/betaGroups` for groups lacking the build, then re-reads every group's build list to confirm (skipped for `hasAccessToAllBuilds` groups). | Idempotent assignment with readback. | REPLACE (auto-distribution) | none | – | high |
| B-45 | :217-236, :323-332 | Returns and optionally writes the receipt `catch.testflight-internal-distribution/v1` (policy, `operation`: already-associated / associated / would-associate, ids, SHA, run/attempt, groups[]). Write-once (`flag: "wx"`, mode 0600). | Audit. | DROP | none | – | high |
| B-46 | :285-304 | CLI: `--apply` requires `--allow-prod`; without `--apply` it's a dry run. Required-flag checks. | Prevents accidental live mutation. | DROP (lane naming covers it) | none | – | high |

### 1c. `tool/platform/verify_app_store_build.mjs` (PROMOTE:1026, 1094; producer mobile-internal-release.yml:514)

| ID | Location | What it does | Why | Fate | Regression | Alternate | Conf. |
|---|---|---|---|---|---|---|---|
| B-47 | :10-36, :165-171 | Compares dotted Apple build numbers with BigInt. `assertCandidateAboveBuilds`: the candidate must be numeric, ≤18 chars, and strictly greater than every existing build. Used by the producer `--check-candidate` *before* the ~20-min archive (mobile-internal-release.yml:514-520). | Fail fast instead of after a long macOS build when the build number is not higher. | REPLACE: the scheme is monotonic by construction (B-49 / §2). Apple rejects a duplicate build. | A clash is found at upload, after the build minutes were spent. Rare. | `latest_testflight_build_number` + compare before `build_app` | med |
| B-48 | :38-47 | `listAppBuilds`: a **single page** (`limit=200`, `sort=-uploadedDate`), no pagination. | – | (limitation) | Note: after >200 builds, the duplicate/newer checks in B-23/B-47 only see the newest 200. | – | high |
| B-23 | :49-107 | Preflight (see the workflow row). | | | | | |
| B-25 | :109-152 | Wait-for-VALID (see the workflow row). | | | | | |
| B-50 | :182-231 | CLI with exactly one mode. The `--wait-processed` result gets `githubRunId`. The optional `--receipt` writes `catch.app-store-build-processing/v1`; PROMOTE does **not** pass `--receipt`. | – | DROP | none | – | high |

### 1d. `tool/platform/verify_ios_processing_receipts.mjs`

| ID | Location | What it does | Why | Fate | Regression | Alternate | Conf. |
|---|---|---|---|---|---|---|---|
| B-51 | whole file (:8-40) | Verifies `consumer-testflight.json` and `host-testflight.json` (schema `catch.app-store-build-processing/v1`, ASC app id from the manifest, 18-digit build, `VALID`, GitHub run id). | Legacy Xcode Cloud → GitHub cutover evidence (see the remote_ops notes about run 29168074271). | **DROP**. It is **orphaned**: no workflow calls it. Only `tool/tools_manifest.json:4382`, `tool/architecture/pattern_adoption.json:1237` and its own test reference it. | none | – | high |

### 1e. `tool/platform/verify_ios_release_identity.mjs` (producer only: mobile-internal-release.yml:538 `--archive`, :622 `--ipa`; its receipt is checked by package_mobile_release.mjs:246-272)

| ID | Location | What it does | Why | Fate | Regression | Alternate | Conf. |
|---|---|---|---|---|---|---|---|
| B-52 | :23-38, :554-600 | Resolves exactly one `app_targets.json` target by id/role/env/scheme. Requires a `release` block for prod. Reads expected version/build from flags or the Flutter xcconfig. | Single source of truth for per-app identity. | KEEP (input to B-53) | – | – | high |
| B-53 | :52-126 | Checks the compiled Info.plist against the manifest: **bundle id, display name, `CatchAppTargetID` marker, `CatchFlutterTarget` entrypoint, URL scheme**. Checks `GoogleService-Info.plist` **BUNDLE_ID / GOOGLE_APP_ID / PROJECT_ID**. Checks marketing version/build equal the expected values and are Apple-numeric. For the IPA, the **compiled `GoogleMapsApiKey` must equal the protected prod key** (:286-304, `ios/Flutter/GoogleMapsKeys.xcconfig`, `GOOGLE_MAPS_IOS_API_KEY_PROD`, `AIza…`). | **Catches Consumer/Host flavor mix-ups that no store checks**: Host built from the Consumer entrypoint, Host using the Consumer Firebase project (wrong backend/push/analytics), a dev Firebase config in prod, a wrong or missing Maps key. | **KEEP**: call it from the fastlane lane after `build_app` (`sh "node tool/platform/verify_ios_release_identity.mjs --ipa #{ipa} --role … --environment prod --expected-version … --expected-build …"`). No fastlane equivalent. | If dropped, a wrong-backend build reaches testers and is found by hand, or not at all. | Minimum to keep if slimmed: bundle id + Firebase PROJECT_ID / GOOGLE_APP_ID + `CatchAppTargetID` + Maps key | high |
| B-54 | :127-151, :334-359 | Archive `Info.plist` ApplicationProperties must equal the app's bundle id/version/build. | Archive/export consistency. | DROP (the export check B-53 is enough) | none | – | high |
| B-55 | :442-517 | Entitlements policy over `aps-environment`, `appattest-environment`, `associated-domains`, `healthkit`. Each must exactly match the role entitlements file: forbidden on Host if Consumer-only; `$(…)` must be resolved; prod export must be `production`. `application-identifier` must end with the bundle id and use the signed team prefix. Prod export needs `get-task-allow == false`. | Host must not ship HealthKit / Consumer links. Push and App Attest must use production environments. | KEEP **only the role part** (forbidden/missing controlled entitlements per role). REPLACE the rest: App Store distribution signing forces `get-task-allow=false`, a production `aps-environment` and a matching application identifier, and ASC upload validation rejects mismatches. | Dropping everything risks Host gaining Consumer capabilities unnoticed. Internal TestFlight has no App Review to catch it. | Keep the 4-key role comparison (part of the same script call) | med |
| B-56 | :411-423, :384-409, :616-621 | `codesign --verify --deep --strict` on the exported app. Reads signed entitlements via `codesign -d --entitlements`. | Bad signature found before upload. | REPLACE: ASC upload validation rejects invalid signatures. | Found at upload instead of before. none material | – | high |
| B-57 | :203-284, :654-657 | Byte binding: hashes the IPA before and after extraction (path/size/SHA must not change). Zip-path safety, no symlinks, exactly one `Payload/*.app`. | Time-of-check/time-of-use on the IPA. | DROP | none | – | high |
| B-57b | :163-201, :668-673 | Receipt `catch.ios-release-identity/v1` (identity, firebase, version/build, artifactBinding, `googleMapsApiKeySha256`, signedCapabilities, releaseOwner). | Input to the package chain (B-16). | DROP the file; print to the job log/summary | none | – | high |

### 1f. `tool/platform/verify_android_release_bundle.mjs` (producer only: mobile-internal-release.yml:885)

| ID | Location | What it does | Why | Fate | Regression | Alternate | Conf. |
|---|---|---|---|---|---|---|---|
| B-58 | :14-54, :138-170 | Uses the pinned `bundletool dump manifest` (:240-250; jar from `BUNDLETOOL_JAR`, :126-130) to read the **applicationId, versionName, versionCode**, the `com.catchdates.app.APP_TARGET_ID` / `APP_ROLE` / `FIREBASE_APP_ID` / `FIREBASE_PROJECT_ID` meta-data, the **Maps key** (must equal secret `GOOGLE_MAPS_ANDROID_API_KEY_PROD` or `local.properties`, :270-278), `debuggable` ≠ true, and versionCode in 1..2.1e9. | Same flavor/backend mix-up protection as B-53, for Android. | **KEEP the role/Firebase/Maps part**: call it from the Android lane after the `gradle bundle…Release` step. The Play checks it duplicates are REPLACED (Play rejects debuggable bundles, wrong package, out-of-range or reused versionCode). | If dropped, a wrong-backend Android build reaches testers. | Minimum: APP_TARGET_ID + FIREBASE_PROJECT_ID + Maps key (3 xpaths) | high |
| B-59 | :218-238 | `jarsigner -verify -strict`; status 4 (self-signed chain) tolerated, every other bit fatal. | Unsigned or partly signed AAB. | REPLACE: Play rejects unsigned / invalid AABs. | none | – | high |
| B-60 | :252-264, :171, :42-47 | The upload-certificate SHA-256 must equal `releasePolicy.android.uploadCertificateSha256` = `3088F763A60FD9F7CA99204D6A68EF93A30263A697E563EF883B29DBBC7AE23E` (app_targets.json:59). | Wrong keystore found before upload. | REPLACE: with Play App Signing, Play rejects an AAB signed by an unregistered upload key. | Found at upload instead of before. Note that Play App Signing enrollment is still an open owner prerequisite (docs/release_operations.md:1232-1234). | – | high |
| B-61 | :94-105, :124, :193-196 | Byte binding before/after verification. | Time-of-check/time-of-use. | DROP | none | – | high |
| B-62 | :56-92, :210-214 | Receipt `catch.android-release-identity/v1`. | Package chain input. | DROP | none | – | high |

### 1g. `tool/platform/upload_google_play_bundle.mjs` (PROMOTE:1193)

| ID | Location | What it does | Why | Fate | Regression | Alternate | Conf. |
|---|---|---|---|---|---|---|---|
| B-63 | :17-29 | Validates inputs. **Track must be `qa`; anything else, production included, throws** ("internal delivery is restricted to the qa track"). | A code-level guarantee that this path can never touch production. | REPLACE: separate lanes (`internal` nightly vs a reviewer-gated `production` lane) **plus Play Console permissions**. Give the nightly service account only "Release to testing tracks", not "Release to production". | The hard-coded production refusal goes away. Keep the equivalent with Play Console permission scoping (stronger than code). | Play Console user permissions per service account | high |
| B-64 | :31-58 | `readExactBundle`: regular non-symlink file, `O_NOFOLLOW`, fstat dev/ino/size/mtime unchanged during the read, SHA-256 equals expected. | Time-of-check/time-of-use and symlink tricks. | DROP | none | – | high |
| B-65 | :79-108, :326-338 | Creates an edit. Deletes uncommitted / verification edits in `finally` (404 OK). | No dangling edits. | REPLACE (fastlane supply manages edits) | none | – | high |
| B-66 | :110-172 | `classifyState`: ≤1 bundle with this versionCode, and its **remote sha256 must equal the local one** ("same version code, different bytes" → fail). ≤1 `completed` release containing the code, with no conflicting statuses. **Any newer versionCode on the track → fail (rollback guard)**. Outcome is `already-promoted` / `resume-required` / `upload-required`. | Idempotent retries after an ambiguous result. Never roll testers back to an older build. Never let different bytes hide behind the same version code. | REPLACE: Play itself rejects re-uploading a used versionCode, and versionCodes are monotonic by construction (§2). | (1) **A re-run after a partial failure** (bundle uploaded, track not committed) fails with "version code already used" in fastlane. Recover with `upload_to_play_store(version_code: N, skip_upload_aab: true, track: 'internal')` or by bumping the build. (2) The rollback guard goes away. An old ref dispatched by hand could replace the internal release with a lower versionCode. Small. | Lane step: `google_play_track_version_codes(track: 'internal').max` and fail if ≥ ours (3 lines) | med |
| B-67 | :254-275 | Media upload (`uploadType=media`). Asserts the **server-returned versionCode and sha256** equal the expected values before any track change. | Proof Google received exactly these bytes. | REPLACE (fastlane supply) | fastlane does not compare Google's reported SHA. Practically none (same job, TLS). | – | high |
| B-68 | :277-299 | PUT `tracks/qa` with a *single* release `{name, versionCodes:[code], status: completed}`. Asserts the echo has one completed exact release and no newer code kept. | Full rollout to testers, deterministic release name. | REPLACE: `upload_to_play_store(track:'internal', release_status:'completed', version_name: …)` | none | – | high |
| B-69 | :300-307 | Commit with `changesInReviewBehavior=ERROR_IF_IN_REVIEW`. | Doesn't silently pull other changes that are in review into the commit. | REPLACE: supply's commit. Check fastlane's `changes_not_sent_for_review` / `rescue_changes_not_sent_for_review` options for the production lane. | Low: internal track releases don't go through review. | – | low-med |
| B-70 | :309-318 | Post-commit readback in a *new* edit must classify as `already-promoted` (exact SHA, completed). | Positive confirmation of the end state. | DROP (Play Console shows it; supply fails on commit errors) | Low | – | high |
| B-71 | :341-415 | CLI: `--allow-prod` always required; exactly one of `--preflight` / `--apply`; token from `GOOGLE_PLAY_ACCESS_TOKEN`. `--preflight` mode is not used by PROMOTE. | Prevents accidental mutation. | DROP | none | – | high |

### 1h. `tool/platform/probe_google_play_access.mjs` (PROMOTE:1153)

| ID | Location | What it does | Why | Fate | Regression | Alternate | Conf. |
|---|---|---|---|---|---|---|---|
| B-72 | :8-78 | Per package: create an edit, read track `qa` (name must echo), read `testers/qa`, `googleGroups` must be valid emails, require ≥1 when asked. Deletes the edit in `finally` and throws if cleanup fails. Never commits. | Live readiness proof without mutating anything. | DROP (see B-28) | see B-28 | see B-28 | high |
| B-73 | :80-105 | Fleet: requires unique package names, probes sequentially, `{ready:true, track, packages}`. | Both apps must be ready. | DROP | It also removes the coupling where a Host problem blocks Consumer. | – | high |
| B-74 | :140-165 | CLI requires `--apply --allow-prod --require-google-group-testers`. | – | DROP | none | – | high |

### 1i. Called helpers outside the scoped list (for completeness)

| ID | Location | Note | Fate |
|---|---|---|---|
| B-75 | tool/ci/mobile_promotion_core.mjs:68-440 | `select`, `verify-package`, `receipt` (write-once, `wx`, 0600), `verify-receipt` (the receipt must round-trip canonically, :277-325). iOS receipts must have `store.result == uploaded` (:228-231). The Android channel is `play-qa`. | DROP with the promoter. |
| B-76 | set_xcode_cloud_workflow_state.mjs (`createAppStoreConnectToken`) | Imported by distribute_testflight_build.mjs:6 and verify_app_store_build.mjs:6 for ES256 JWTs. The file name reflects legacy Xcode Cloud. | REPLACE (fastlane `app_store_connect_api_key`). Check whether anything else imports it before deleting. |

### 2. Store facts (exact values from code)

**Apple / App Store Connect**

- ASC app ids: Consumer **`6765646860`**, Host **`6778927317`** (tool/app_targets.json:84, 107, 391, 452).
- Prod bundle ids: **`com.catchdates.app`** (app_targets.json:377) and **`com.catchdates.host`** (:438). Dev/staging use `.dev` and `.staging` suffixes (:169, :221, :273, :325); PROMOTE only ever resolves `--environment prod` (PROMOTE:426-429).
- Upload tool: `xcrun altool --upload-package` (PROMOTE:1067-1075). The manifest declares `"uploadTool": "altool"` (app_targets.json:50), and `check_app_targets.mjs` enforces the manifest strings.
- Auth: an ASC **API key (.p8, team key with issuer id)**, used by both altool (`--api-key`/`--api-issuer`, key file in `~/.appstoreconnect/private_keys/AuthKey_<id>.p8`) and the REST JWTs. Secret names: **`APP_STORE_CONNECT_API_KEY_ID`**, **`APP_STORE_CONNECT_API_ISSUER_ID`**, **`APP_STORE_CONNECT_API_KEY_BASE64`** (PROMOTE:998-1000, 1018-1019, 1319-1321). They live in Environment `prod-mobile`. The producer uses the same three for `xcodebuild -allowProvisioningUpdates` (mobile-internal-release.yml:503-536).
- Distribution policy: `all-existing-internal-groups-with-testers` (app_targets.json:45; PROMOTE:1374). Only internal groups (`isInternalGroup`) with >0 testers are used. It never creates groups or touches membership, and it does not use external groups or Beta App Review.
- Export compliance: `ITSAppUsesNonExemptEncryption` is present in both Info.plists (apps/consumer/ios/Runner/Info.plist:66, apps/host/ios/Runner/Info.plist:77). That is a prerequisite for ASC automatic internal distribution to proceed without a "Missing Compliance" stop.

**Google Play**

- Package names: **`com.catchdates.app`** (app_targets.json:383, 392) and **`com.catchdates.host`** (:444, :453). Both are also hard-coded in the probe call (PROMOTE:1154-1155).
- Track: **only `qa`**. That is a custom closed-testing track, *not* the Play `internal` track (upload_google_play_bundle.mjs:27; probe_google_play_access.mjs:19; PROMOTE:1156, 1198; app_targets.json:53-54 `"channel": "play-internal", "track": "qa"`). The receipt channel label is `play-qa` (PROMOTE:706, 1268). Production is refused in code (upload_google_play_bundle.mjs:27, help text :378).
- Release written: `{name: "GitHub exact <target> <versionName> (<versionCode>)", versionCodes:[code], status:"completed"}`, the *only* release on the track (upload_google_play_bundle.mjs:284-291; PROMOTE:1199). The commit uses `changesInReviewBehavior=ERROR_IF_IN_REVIEW` (:303).
- Auth: **GitHub OIDC → GCP Workload Identity Federation**, with no JSON key (policy at docs/release_operations.md:1227-1235). Values come from **variables** (not secrets) **`GCP_WORKLOAD_IDENTITY_PROVIDER`** and **`GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL`** (PROMOTE:1143-1144). The service account is `github-actions-play-publisher@catch-dating-app-64e51.iam.gserviceaccount.com` (app_targets.json:58). The WIF principal is restricted to `attribute.repository_environment/1170579691:prod-mobile` (docs/release_operations.md:1241). Scope is `androidpublisher`. The access token is passed as env `GOOGLE_PLAY_ACCESS_TOKEN`.
- Testers: ≥1 Google Group must be configured on `qa` for *both* apps (probe, PROMOTE:1157, 1169).
- **Live status:** per `tool/remote_ops_manifest.json:803`, the final Android promotion runs 31423759477 and 31423765422 "failed closed before upload because Play developer account … is unverified and has zero app records". **The Android store path has never completed a real upload.** Play App Signing enrollment is still an owner prerequisite (docs/release_operations.md:1232-1234). The new fastlane Android lane is therefore first-time setup, not a migration of a proven path. The first AAB for a new Play app usually has to be uploaded manually in Play Console.

**Build numbers / version codes** (computed in the producer, checked in PROMOTE)

- iOS `CFBundleVersion` is **18 digits**: `YYYYMMDD` (source CI UTC date) + source CI **run number** padded to 8 digits + source CI **run attempt** padded to 2 digits (tool/platform/compute_mobile_build_number.mjs:13-16; mobile-internal-release.yml:349-353). Example from the evidence: `202608100000030201`. It increases monotonically by construction.
- Android `versionCode` = `100000 + runNumber*100 + attempt`, with attempt ≤99 and the result ≤2,100,000,000 (compute_mobile_build_number.mjs:18-23). It increases monotonically.
- Checks: the producer runs `--check-candidate` (the build must be strictly above every existing ASC build) before archiving (mobile-internal-release.yml:514-520). In PROMOTE, the iOS preflight rejects duplicates, unexpected states and newer builds (verify_app_store_build.mjs:62-97). Android `classifyState` rejects "same code, different SHA", newer codes on `qa`, and duplicate or conflicting releases (upload_google_play_bundle.mjs:152-172). Uploads assert the returned versionCode and sha256 (:267-273).
- Limitation: the ASC build listing is one page of ≤200 (verify_app_store_build.mjs:38-47).

**Receipts / claims written by PROMOTE**

1. **Claim artifact** `mobile-promotion-claim-v1-<release_target>-<package_artifact_id>-<signed_sha256>` (PROMOTE:711, 1306-1313; mobile_promotion_core.mjs:236-238). It contains exactly one file, `mobile-promotion-receipt.json` (schema `catch.mobile-promotion-receipt/v1`), and is kept for **90 days**. It is written only when no prior claim exists, *after* store verification and credential removal, and (for iOS) *before* group distribution. It binds: `releaseTarget`, role, platform, **`sourceSha`**, `sourceCiRunId` / `Attempt`, `producerRunId` / `Attempt`, `authorityArtifact {id, name, digest}`, `packageArtifact {id, name, digest}` (GitHub artifact ZIP digests `sha256:…`), **`signedArtifactSha256`** (the IPA/AAB bytes), `promotionRunId` / `Attempt`, `reasonSha256`, `evidenceLevel: "exact-artifact"`, and `store {channel: testflight|play-qa, target: ASC app id | package name, version, build, result: uploaded|already-promoted|reconciled, remoteId: ASC build id | versionCode}` (mobile_promotion_core.mjs:244-271). iOS claims require `result == uploaded` (:228-231).
2. **TestFlight distribution artifact** `testflight-distribution-v1-<target>-<package_artifact_id>-<asc_build_id>-<run_id>-<run_attempt>` containing `testflight-distribution-receipt.json` (schema `catch.testflight-internal-distribution/v1`), kept 90 days (PROMOTE:1442-1449). It binds the ASC app id and build id, build number, package artifact id, signed SHA, promotion run/attempt, policy, operation, and per-group id / name / testerCount / hasAccessToAllBuilds / hadBuildAccess / hasBuildAccess (distribute_testflight_build.mjs:217-236).
3. **Job summaries** (PROMOTE:1172-1176, 1425-1440), including the signed-byte SHA-256.
4. Producer-side receipts that PROMOTE verifies indirectly through the package: `catch.ios-release-identity/v1`, `catch.android-release-identity/v1`, package-policy, provenance, CI authority, impact plan (package_mobile_release.mjs:33-40).

**Retry / idempotency / concurrency / re-dispatch**

- Concurrency: one queue per release target, never cancelled (PROMOTE:52-55). Different targets run in parallel.
- **"Re-run" of a PROMOTE run is refused** (`GITHUB_RUN_ATTEMPT` must be 1, PROMOTE:73). Recovery means a *new dispatch* with the same inputs.
- **A new producer attempt invalidates** all outstanding dispatches (PROMOTE:110, 498-516, 870-888). A re-run of source CI also invalidates them (B-19).
- **Release-code drift on main** after dispatch → fail (B-10). You must re-dispatch from the new main.
- Re-dispatch, **iOS**:
  - (a) no claim and no ASC build → upload.
  - (b) claim present and ASC build VALID/PROCESSING with the **same build id** → skip upload and receipt, wait for VALID if needed, then re-run the idempotent group assignment and write a new distribution receipt.
  - (c) **ASC build exists but no claim** (for example altool succeeded and the job died before the claim saved) → **fail closed, exit 64** (PROMOTE:1039-1044). The only way out is a fresh producer build with a new build number.
  - (d) claim present but no ASC build → fail (PROMOTE:1037).
  - The ASC processing wait polls every 30 s with a 45-min cap (verify_app_store_build.mjs:116-117), inside the 90-min job timeout.
- Re-dispatch, **Android**: the uploader classifies live Play state. `already-promoted` makes no change. `resume-required` means the bundle is present but the track is not completed, so it updates the track and commits without re-uploading (`reconciled`). `upload-required` does the full upload. The claim is not needed for Android safety; it is written only on the first success.
- Producer wait: up to 60×10 s for the platform authority job (PROMOTE:106-133).
- Edits: uncommitted Play edits are deleted on failure (upload_google_play_bundle.mjs:326-338; probe :67-77).

### 3. Coupling

**Inputs PROMOTE requires**

| Input | Provided by | Where consumed |
|---|---|---|
| Dispatch (`ref: main`, all 7 inputs, `confirm: "true"`, auto `reason`) | `mobile-internal-release.yml` job `dispatch-promotions` (:1003-1104; `actions: write` :1013-1015; iOS only, :1069; POST `.../mobile-internal-promote.yml/dispatches` :1092). Guard job `verify-promotion-dispatches` :1105-1125. Android: manual dispatch only. | PROMOTE:3-39 |
| Producer run/attempt identity (`name == "Mobile Internal Release"`, `event == workflow_run`, path) | `mobile-internal-release.yml:1-6` (`on: workflow_run` of `CI` on `main`) | PROMOTE:86-193, 496-526, 870-898 |
| Producer **job display name** `"Verify <platform> packages / Publish verified mobile build authority"` | caller job `ios-authority` / `android-authority` (mobile-internal-release.yml:965, :984) + reusable job name `_mobile-platform-authority.yml:311` | PROMOTE:115, 521, 893 (string coupling: renaming either job breaks promotion) |
| Authority artifact `mobile-build-authority-v2-<platform>-<ciWorkflowId>-<ciRunNumber>-<ciRunId>-<ciAttempt>-<sourceSha>-<producerRunId>-<producerAttempt>` (legacy `v1-…`) | `_mobile-platform-authority.yml:660-667` (90 days), content built at :590-622 | PROMOTE:94-104, 263-316, 593-607, 924-948 |
| Package artifacts `mobile-package-v1-<target>-…` (+ receipt artifacts) | the producer (`package_mobile_release.mjs` prepare / bind-upload; names asserted at package_mobile_release.mjs:884-886) | PROMOTE:328-414, 608-622 |
| Source CI run (`ci.yml`, `name == "CI"`, `event == push`, `main`, success, same attempt) | `.github/workflows/ci.yml` | PROMOTE:542-591, 900-922. **Watch:** HEAD commit dd775d752 changes what main CI re-runs. |
| Store targets | `tool/app_targets.json` via `tool/platform/resolve_app_target.mjs` | PROMOTE:426-443 |
| Verifier code | `tool/ci/mobile_promotion_core.mjs`, `tool/ci/package_mobile_release.mjs` | PROMOTE:295, 397, 639, 654, 749, 963, 1277 |
| JWT helper | `tool/platform/set_xcode_cloud_workflow_state.mjs` (`createAppStoreConnectToken`) | distribute_testflight_build.mjs:6, verify_app_store_build.mjs:6 |
| Toolchain | `.github/actions/load-toolchain` | PROMOTE:218-223 |
| Secrets / vars | Environment `prod-mobile`: secrets `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_BASE64`; vars `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL` | PROMOTE:998-1000, 1143-1144 |
| Prior claims | PROMOTE itself (earlier runs) | PROMOTE:688-801 |

**Who reads PROMOTE's outputs**

- Runtime: **only PROMOTE itself** reads `mobile-promotion-claim-v1-*` (PROMOTE:713-748). **Nothing** reads `testflight-distribution-v1-*`; a repo-wide grep finds no other workflow consuming either artifact.
- Static checks and manifests that read or require the workflow file or these scripts, and would need edits or removal when replacing:
  - `tool/ci/mobile_promotion_workflow.test.mjs` (345 lines of regex assertions on the workflow text, e.g. :185, :276)
  - `tool/ci/mobile_release_workflow.test.mjs:157` (expects the dispatch URL)
  - `tool/platform/check_app_targets.mjs:344-360`. Enforces `releasePolicy` strings: `promotionWorkflow`, `automatic-ios-exact-artifact-internal-promotion`, `successful-main-ci-exact-artifact-authority`, `prod-mobile`, `main-only`.
  - `tool/platform/check_app_targets.mjs:480-530`. Forbids altool / Play upload / probe / `--apply` in the *producer*, and requires `--check-candidate` and identity verifiers there.
  - `tool/platform/check_app_targets.mjs:757-763` (the file must exist).
  - `tool/app_targets.json:26-60` (`releasePolicy`)
  - `tool/harness/workflow_wiring.test.mjs:191`
  - `tool/ci/check_toolchain_consistency.sh:98` / `.test.mjs:17`
  - `.github/workflows/tools-ci.yml:82` (sparse checkout)
  - `tool/tools_manifest.json:976-977, 1020-1022, 1058-1064, 4281-4433`
  - `tool/remote_ops_manifest.json:766-803`
  - `tool/architecture/pattern_adoption.json:1170-1251`
  - `tool/harness/component_graph.json:845`
  - Docs: `docs/release_operations.md:562, 1227-1250, 1645-1680, 2595-2650`; `tool/README.md:580-615`.
- Producer gating: a failed dispatch fails `verify-promotion-dispatches` (mobile-internal-release.yml:1105-1125). The producer does *not* wait for the promoter's outcome.

### 4. What the "exact-artifact" guarantee means, in plain English

**What it is.** When the app is built, the build server produces one file: an `.ipa` for iPhone or an `.aab` for Android. Every file has a "fingerprint" called a SHA-256 hash, a 64-character code that changes completely if even one byte of the file changes. This pipeline records that fingerprint when the file is built. It then refuses to send anything to Apple or Google unless the file in hand has *exactly* that fingerprint. Afterwards it writes a small "receipt" saying: "the file with fingerprint X, built from code commit Y by CI run Z, was uploaded to Apple/Google and became store build #N."

**Where it is recorded.**

- At build time, the fingerprint goes in the producer's "build authority" file (a GitHub artifact).
- PROMOTE checks it three times (PROMOTE:285, 623-626, 950-953 and 989-992) and once more just before upload (PROMOTE:1065, 1191).
- The receipt is a GitHub artifact named `mobile-promotion-claim-v1-<app>-<id>-<fingerprint>`. GitHub deletes it after 90 days.
- The fingerprint is also printed in the run summary (PROMOTE:1432).
- For Android, Google reports its own fingerprint of what it received, and the script compares the two (upload_google_play_bundle.mjs:268-273, 159-161).
- For Apple there is no such fingerprint from Apple. So the pipeline treats "Apple has a build #N" as *not* proof, and it fails rather than guess (PROMOTE:1039-1044).

**What attack or mistake it prevents.**

1. Someone, or a buggy script, swaps the file between "tested" and "uploaded". Examples: a re-build that silently picks up different code, a file from another branch or fork, or a file from an older attempt.
2. Someone with permission to start the workflow points it at a different file than the one CI approved.
3. A retry uploads something new when it should have reused what is already in the store.

These matter most where an attacker could get a malicious file into the pipeline, or where a company must prove to an auditor exactly which code went to customers.

**How a real person would use the record.** Rarely. Three realistic cases:

- **(a) An incident.** "Testers on build 202608100000030201 see a crash. Which commit was that?" Today you'd look up the claim. But App Store Connect and Play Console already show the build number, and the build number encodes the CI run number. Printing the commit in the summary or embedding it in the app answers this faster.
- **(b) A security review.** You need to show the shipped binary came from reviewed code. This is the real value, and GitHub artifact attestations provide it in a standard form.
- **(c) A retry.** The machine uses the claim to avoid uploading again. With fastlane and ASC automatic distribution this need goes away, because the store refuses duplicate build numbers.

Nobody reads the claim today except the promoter itself (§3). For internal TestFlight and Play-internal test builds, which the uploader builds itself in the same job, the swap-the-file risk is almost gone, because the file never leaves the job between building and uploading.

**Lighter ways to keep the valuable part**

1. **Build and upload in the same job.** This removes most of what the guarantee protected against, at zero cost.
2. **`actions/attest-build-provenance@v2`** (or a current major) on the IPA/AAB right after the build: `subject-path: build/**/*.ipa`, with `permissions: id-token: write, attestations: write`. GitHub stores a signed statement "this SHA-256 was built by workflow W at commit C, run R". Anyone can check a file later with `gh attestation verify app.ipa -R suvratgarg/catch-dating-app`. It never expires the way a 90-day artifact does.
3. **Job summary and/or a GitHub Release (or tag) per store build.** Print app, platform, version, build number / version code, commit SHA, SHA-256 of the binary, and the ASC build id or Play track. Optionally attach the binary for production releases.
4. **Embed the commit SHA in the app.** Add a Dart `--dart-define=GIT_SHA=$GITHUB_SHA` or an Info.plist / manifest meta-data key, and show it on an "About" screen or attach it to crash reports. Testers and crash reports then name the exact commit.
5. **Rely on the stores' build history.** ASC (TestFlight → Builds) and Play Console (App bundle explorer, which shows the version code and *Google's SHA-256* of each uploaded bundle) keep permanent history. Because build numbers come from the CI run number (§2), the build number alone points back to the CI run.
6. **For the production lane, promote, don't re-upload.** Submit the *already-tested* TestFlight build for review (`deliver(build_number: N, submit_for_review: true, phased_release: true)` or `upload_to_app_store(build_number:)`). Promote the *already-tested* internal release on Play (`upload_to_play_store(track: 'internal', track_promote_to: 'production', rollout: '0.1', version_code: N)`). Production then ships the exact bytes testers used, through store features rather than custom code. Gate it with a GitHub Environment that has required reviewers.

## Appendix C: coupling ledger

Source: `main` CI delivery jobs, release registries, policy and docs, audited
at `dd775d752`.

### 1. Ledger

Fate: KEEP / REPLACE (standard tool) / DROP (deliberate removal of a still-live
behaviour) / BECOMES-DEAD (existed only for the old mobile release; nothing
else consumes it). Confidence H/M/L.

### 1a. ci.yml delivery machinery

| ID | Location | What it does | Why it exists | Fate | Regression if removed | Cheaper alternate check | Conf. |
|---|---|---|---|---|---|---|---|
| C-01 | `.github/workflows/ci.yml:230-254` (`queue` step), output `:79` | On push, finds a successful `merge_group` CI run of the same SHA whose `Required CI` passed; every validation lane then skips (`:311,361,375,381,397,408,421,427,435,444,451,461,566`) | Avoid re-running validation on main | KEEP (not mobile-only; it is the local commit's mechanism). Edit its comment `:238-240` ("only plans, finalizes and packages delivery") | Main would re-run every lane on each merge | n/a | H |
| C-02 | `ci.yml:576-663` `finalize-plan` | Waits for lower-numbered main runs (`main_ci_baseline --wait`), recomputes the committed window, proves coverage (`finalize_ci_plan.mjs validate/finalize`), re-runs doc-metadata and new-widget gates on the widened base (`:651-656`), uploads `harness-plan-<run#>-<run>-<sha>-<attempt>` (`:657-663`) | Ordered, gap-free delivery plan for package-firebase and mobile | BECOMES-DEAD | Lost: ordered predecessor wait and the widened-window doc/widget re-check. Neither matters without main-driven delivery; the merge queue runs both gates per commit against its base | none needed | H |
| C-03 | `ci.yml:665-817` `package-firebase` | Requires deploy-group lanes, downloads/rebuilds Functions, runs `package_firebase_delivery.mjs prepare`, tars, writes `delivery_core.mjs manifest`, uploads `firebase-delivery-<sha>-<attempt>` (90 days) | Fed the Delivery workflow (retired in #799); now only named inside the v3 authority | BECOMES-DEAD | None (no reader since #799) | n/a | H |
| C-04 | `ci.yml:756-772` (download `functions-lib-*` / rebuild Functions) and `.github/workflows/functions-ci.yml:48-54` (upload `functions-lib-<sha>-<attempt>`, 14 days) | Hands the tested Functions build to C-03 | C-03 only | BECOMES-DEAD (remove the upload step from functions-ci too) | None; it saves an artifact upload on every Functions PR | n/a | H |
| C-05 | `ci.yml:900-902` | On main push requires `finalize-plan=success` | C-02 | BECOMES-DEAD | n/a | n/a | H |
| C-06 | `ci.yml:903-909` | If `DEPLOY_REQUIRED`, requires `package-firebase=success` | C-03 | BECOMES-DEAD | n/a | n/a | H |
| C-07 | `ci.yml:910-950` | On main push lists this run's artifacts, requires exactly one `harness-plan-*` and (if deploy) one `firebase-delivery-*`, exports ids/digests | Inputs for C-08 | BECOMES-DEAD | n/a | n/a | H |
| C-08 | `ci.yml:953-1038` (`authority` step + upload `harness-success-v3-<wf>-<run#>-<run>-<sha>-<attempt>`) | Writes `catch.ci-delivery-authority/v3` binding workflow id, run number/id/attempt, SHA, plan and package artifact id/name/digest | The trust root that `mobile-internal-release.yml:131-253` downloads | BECOMES-DEAD | n/a | n/a | H |
| C-09 | `ci.yml:843-853` (planner-attempt guard), `:854-899` (lane guard incl. queue reuse) | Required CI: same-attempt planner, every selected lane succeeded or was proven by the queue | Merge-queue required check | KEEP | Merge queue would lose its required context | n/a | H |
| C-10 | `ci.yml:823-839` `required.needs` | Lists `finalize-plan` (`:826`) and `package-firebase` (`:839`) | C-02/C-03 | EDIT (drop the two needs) | n/a | n/a | H |
| C-11 | `ci.yml:71-72` plan outputs `deploy_groups`/`deploy_required`; `ci.yml:857,957` `DEPLOY_REQUIRED` | Firebase deploy selection from the graph | C-03 | BECOMES-DEAD | n/a | n/a | H |
| C-12 | `ci.yml:194-206` | Binds `baseSha`, `sourceSha`, `sourceCiRunId`, `sourceCiRunAttempt` into `impact-plan.json` | `finalize_ci_plan.mjs:75-77`, `package_mobile_release.mjs:193-223`. `compare_selectors.mjs:87` reads only `baseSha` | KEEP `baseSha`/`sourceSha`; `sourceCiRun*` BECOMES-DEAD (optional cleanup) | None | n/a | M |
| C-13 | `ci.yml:292-298` | Names the push-mode plan `harness-validation-plan-*` so `finalize-plan` can own `harness-plan-*` | C-02 | BECOMES-DEAD (one name for every event) | n/a | n/a | H |
| C-14 | `ci.yml:139-147` (+ sparse path `:92`) | Push base = last successful main CI run (`main_ci_baseline.mjs`), with commit-window planning | So cancelled main runs' commits stay inside a delivery window (comment `:31-37`) | REPLACE with `github.event.before` (or keep as is) | Only matters when the queue lookup fails and main re-validates; the merge queue already validated each commit | `base_sha=$BEFORE_SHA` | M |
| C-15 | `ci.yml:27-39` concurrency comment | Explains delivery windows across cancelled main runs | C-02/C-14 | EDIT text | n/a | n/a | H |
| C-16 | `ci.yml:2-3` run-name `CI` for push | Stable REST `run.name` | Web consumers: `wait_main_marketing_validation.mjs:29`, `website-release.yml:14`, plus `main_ci_baseline.mjs:59` | KEEP | Website release/marketing would stop finding CI | n/a | H |
| C-17 | `ci.yml:8-9` push trigger | Main push CI run | See finding 2 | KEEP | Host measurement preview and website release break | Optional: make `host_measurement_preview.mjs:38-47` accept merge-queue runs (as `previewRelease.mjs:44-53` already does), then main push could be dropped entirely | H |

### 1b. tool/ci scripts

| ID | Location | What it does | Why it exists | Fate | Regression if removed | Cheaper alternate check | Conf. |
|---|---|---|---|---|---|---|---|
| C-18 | `tool/ci/package_mobile_release.mjs:146-182` `validateCiAuthority` | Exact-key check of the v3 authority; package name must be `firebase-delivery-<sha>-<attempt>` | Bind mobile package to a successful main CI attempt | BECOMES-DEAD | n/a (no CI-authority input in the new model) | Build from the dispatched/nightly ref; `actions/checkout` of `github.sha` | H |
| C-19 | `package_mobile_release.mjs:193-223` `validateImpactPlan` | Plan must be complete, `mode=main`, bound to the authority, with sorted unique `releaseTargets`/`releaseRoles` | Change-driven target selection | BECOMES-DEAD | Nightly builds all four targets instead of only affected ones | Lane inputs `role`/`platform` on dispatch | H |
| C-20 | `package_mobile_release.mjs:246-285` | Identity receipt (iOS export + strict signature, Maps key digest; Android bundle + signature) and package-policy receipt (no findings) bound to artifact bytes | Prevent wrong-role or unsigned bytes | REPLACE: keep calling `verify_ios_release_identity.mjs` / `verify_android_release_bundle.mjs` / `check_mobile_package.mjs` directly as fastlane lane steps; drop the receipt-binding layer | Role/identity mix-ups would reach TestFlight | Run the verifiers on the gym/gradle output before `pilot`/`supply` | H |
| C-21 | `package_mobile_release.mjs:399-497,499-586` prepare/verify | Fresh dir, copy, provenance via `delivery_core.createProvenanceManifest`, receipt, self-verify | Byte-exact package for a separate promoter | BECOMES-DEAD (build and upload in the same job) | None for same-job upload | `actions/attest-build-provenance` if provenance is wanted | H |
| C-22 | `package_mobile_release.mjs:588-692` bind-upload/verify-upload | Binds uploaded GitHub artifact id/name/digest | Cross-workflow handoff | BECOMES-DEAD | n/a | n/a | H |
| C-23 | `package_mobile_release.mjs:694-898` attempt completeness + build authority v1/v2 | Aggregate/per-platform authority with cross-role comparison status | Producer to promoter trust | BECOMES-DEAD. The cross-role comparison itself (`check_mobile_package.mjs --compare`) can stay as a nightly step | Consumer/Host binary-separation regressions caught later | `check_mobile_package.mjs --compare` in the nightly lane | H |
| C-24 | `tool/ci/mobile_promotion_core.mjs:68-113` select | Picks one target package from authority | Promoter | BECOMES-DEAD | n/a | n/a | H |
| C-25 | `mobile_promotion_core.mjs:115-185` verify-package | Re-verifies bytes; validates bundle id, iOS version/build regexes, Android `versionCode ≤ 2,100,000,000` | Promoter safety | REPLACE (fastlane/stores validate); keep the versionCode ceiling as a one-line lane assert if the build-number scheme stays near it | A too-large versionCode is rejected by Play anyway | Play rejects it at upload | M |
| C-26 | `mobile_promotion_core.mjs:187-317` receipt | 90-day exact-claim receipt (`testflight`/`play-qa` channels) | Idempotent re-promotion | BECOMES-DEAD | n/a | `pilot` and `supply` are idempotent on an existing build/versionCode error | H |
| C-27 | `tool/ci/finalize_ci_plan.mjs` (1-147) + `finalize_ci_plan.test.mjs` | Validation-window proof + final plan | C-02 | BECOMES-DEAD | n/a | n/a | H |
| C-28 | `tool/ci/main_ci_baseline.mjs` (1-149) + test | Previous-successful-main base, ordered wait | C-02, C-14 | BECOMES-DEAD if C-14 is replaced, else KEEP | see C-14 | see C-14 | M |
| C-29 | `tool/ci/package_firebase_delivery.mjs` (1-702) + test | Builds the Firebase package | C-03 | BECOMES-DEAD (its imports of `tool/firebase/*` helpers stay; those serve `_backend-deploy.yml`) | n/a | n/a | H |
| C-30 | `tool/ci/delivery_core.mjs` | Provenance manifest/verify/checkpoints | Web hosting: `_web-hosting-build.yml:404,411`, `_web-hosting-promote.yml:194,251`, `react-surface-validation.yml:189,192`, `package_web_hosting.mjs:6` | KEEP | Web promotion breaks | n/a | H |

### 1c. App-target contract and platform tools

| ID | Location | What it does | Why it exists | Fate | Regression if removed | Cheaper alternate check | Conf. |
|---|---|---|---|---|---|---|---|
| C-31 | `tool/app_targets.json:25-61` `releasePolicy` | owner, workflow/promotionWorkflow paths, trigger `successful-main-ci-exact-artifact-authority`, env `prod-mobile`, approvalMode, iOS channel/signing/`altool`, Android channel/track `qa`/OIDC SA/upload cert | Asserted by `check_app_targets.mjs:345-397` | REPLACE with a small fastlane policy (workflow path, `nightly+dispatch`, env, iOS TestFlight internal auto-distribution, Android track, production manual). Keep `android.publisherServiceAccount` (`:58`) and `uploadCertificateSha256` (`:59`, read by `verify_android_release_bundle.mjs:171`) | n/a | n/a | H |
| C-32 | `app_targets.json:82-86,105-109` `storeProduct` | Display name, ASC app id, `testFlightDistributionPolicy` | ASC id agreement (`check_app_targets.mjs:931-933`), policy (`:129-134`) | KEEP `appStoreConnectAppId`; `testFlightDistributionPolicy` DROP (it becomes ASC group configuration) | n/a | n/a | M |
| C-33 | `app_targets.json:386-394,447-455` per-target `release` | owner, `githubMode`, `githubWorkflow`, `automaticTestFlightOnMain`, ASC id, Play package, `legacyXcodeCloudWorkflow` | `check_app_targets.mjs:399-419`; `resolve_app_target --fields release.*` in the old workflows | KEEP `appStoreConnectAppId`, `googlePlayPackageName` (fastlane can read them via `resolve_app_target.mjs`); DROP the others | n/a | n/a | H |
| C-34 | `app_targets.json:6-24` `appleNativeDependencies` | Firebase pod/plugin lockstep | `check_toolchain_consistency.sh:72-88`, `check_app_targets.mjs:47-100,573-607` | KEEP | Xcode-floor and pod drift | n/a | H |
| C-35 | `app_targets.json:62-458` roles, environments, targets (ids, schemes, flavors, Firebase) | Single identity contract | Builds, `flutter_with_env.sh`, Apple/Android generators | KEEP (fastlane lanes should resolve scheme/flavor/bundle id from it) | Everything native | n/a | H |
| C-36 | `tool/platform/check_app_targets.mjs:13-28,196-250,329-333,537-549` + `tool/app_target_external_gates.json` | Requires exactly two gates (#218 GitHub iOS cutover, #199 Play) with fixed scopes | Track the old cutover | REPLACE or DROP. #218 is about the GitHub-producer cutover, which no longer applies. #199 is stale against `docs/store/catch_host/README.md:13-14` | Only a warning today | Linear/issue tracking | M |
| C-37 | `check_app_targets.mjs:129-134` | TestFlight distribution policy must be the all-existing-internal-groups value | Old distribution tool | DROP (configured in ASC) | n/a | n/a | M |
| C-38 | `check_app_targets.mjs:173-184` | Rejects operational evidence keys (`legacyXcodeCloudState`, `testFlightEvidence`, ...) in `release` | Xcode Cloud cutover hygiene | DROP or keep as generic hygiene | n/a | n/a | L |
| C-39 | `check_app_targets.mjs:310-327,999-1006` | Every iOS config uses Automatic signing with no identity override | Ephemeral-runner automatic signing | KEEP if fastlane uses automatic signing + ASC key; REPLACE (expect Manual + profile specifier) if `match` is adopted | Signing drift | n/a | H |
| C-40 | `check_app_targets.mjs:335-551` `validateReleaseOwnership` | 18 policy equalities, prod release fields, ~40 regex markers over the two old workflows (workflow_run trigger, v3 authority, artifact downloads, p12 import, export, bundletool, package adapter, 90-day retention, cross-role compare, v2 authority), forbids store mutation/`workflow_dispatch` in the producer | Pin the old producer/promoter split | REPLACE with a short check of the fastlane workflow (Fastfile exists; nightly `schedule` + `workflow_dispatch`; production lane manual-only; environment `prod-mobile`; no production track in automatic lanes) | Unchecked drift of the new workflow | `actionlint` plus 3-5 regexes | H |
| C-41 | `check_app_targets.mjs:744-764` | Reads `mobile-internal-release.yml` + `_mobile-platform-authority.yml`; a missing file is a finding; requires `mobile-internal-promote.yml` | Same | EDIT (point at the new workflow/Fastfile) or `platform:app-targets` fails everywhere | `release-readiness.yml:56` and Tools CI fail | n/a | H |
| C-42 | `check_app_targets.mjs` remainder (`:102-172,186-308,553-743,769-1210`) | Identity, Firebase, schemes, icons, capabilities, deep links, Remote Config, Host release visibility | Product identity | KEEP | Wrong-role apps | n/a | H |
| C-43 | `tool/platform/resolve_app_target.mjs` | Resolves target fields | `flutter_with_env.sh`, `use_firebase_environment.sh`, `validate_firebase_environment.sh`, `host-website.yml`, `verify_*` tools, docs exhibit | KEEP (fastlane should call it) | Local/CI builds | n/a | H |
| C-44 | `tool/platform/set_xcode_cloud_workflow_state.mjs:36-155` | Enable/disable Xcode Cloud workflow | Legacy cutover | DROP | None (workflows already disabled) | n/a | H |
| C-45 | `set_xcode_cloud_workflow_state.mjs:10-26` `createAppStoreConnectToken` | ES256 ASC JWT | Imported by `distribute_testflight_build.mjs:6` and `verify_app_store_build.mjs:6` | REPLACE with fastlane `app_store_connect_api_key`; delete the file only together with both importers | Those two tools break if deleted first | n/a | H |
| C-46 | `tool/platform/mobile_release_target_contract.test.mjs:1-112` | Every main/release `releaseTargets` set is backed by a platform build; role-platform intersections; no Cartesian widening; web cannot sign | Change-driven mobile release | BECOMES-DEAD | n/a | n/a | H |

### 1d. Harness component graph

| ID | Location | What it does | Why it exists | Fate | Regression if removed | Cheaper alternate check | Conf. |
|---|---|---|---|---|---|---|---|
| C-47 | `tool/harness/component_graph.json` main-mode `releaseTargets`/`releaseRoles` at lines 428, 438, 448, 458, 472, 531, 541, 560, 570, 600, 610, 630, 676, 696, 706, 716, 726, 745, 765 | Authorize signed mobile targets from main | Mobile producer reads `.operations.releaseTargets` | BECOMES-DEAD | Main-mode fallback `app_roles` widen to both roles (`component_graph.mjs:426-447`) | n/a | H |
| C-48 | `component_graph.json:5` mode `release` and every `"release": {...}` entry (lines 287, 315, 339, 354, 369, 430, 440, 450, 460, 474, 533, 543, 562, 572, 582, 592, 602, 612, 622, 632, 678, 688, 698, 708, 718, 728, 747, 757, 767) | Release-mode planning | No workflow passes `--mode release` (grep of `.github/workflows`, `tool/harness*`); only CLI `explain/plan --mode` | BECOMES-DEAD | Local `harness explain --mode release` stops working | n/a | M-H |
| C-49 | main-mode extra `flutter_build_android/ios` in profiles such as `app-host` (`:458` vs merge_group `:457`), `app-consumer` (`:472`), `app-shared` (`:428`) | Main builds both native platforms where PR/queue only web-smoke | Satisfies `component_graph.mjs:497-501` ("release target requires flutter_build_<platform>") | DROP: align main with merge_group (already skipped when the queue proved the commit) | Fewer native builds on the rare main fallback; nightly still builds everything (`:459,473`) | nightly CI | M |
| C-50 | `component_graph.json:24-29` `deployGroupRequirements`; `deployGroups` at `:313,315,337,339,352,354,367,369,755,757` | Which Firebase deploy groups a change authorizes | C-03 only (backend-deploy plans itself via `tool/firebase/affected_function_targets.mjs`) | BECOMES-DEAD | n/a | n/a | H |
| C-51 | `component_graph.json:182-189` `backend-delivery-control` checkIds `ci:delivery-core`, `ci:firebase-delivery-package`; classification `:816-825` lists `package_firebase_delivery.*` | Backend delivery controls | Partly C-29 | EDIT (drop `ci:firebase-delivery-package` and the package paths; keep backend-deploy paths) | n/a | n/a | H |
| C-52 | `component_graph.json:843-849` `harness-scoped-control` | Includes the three mobile workflows and `tool/ci/mobile_promotion_core.mjs`; excludes `package_firebase_delivery.test.mjs` | Classification | EDIT (swap in the new workflow) | Unowned-path failure if a deleted path remains? No; a missing path is harmless, but the new workflow must be owned | n/a | H |
| C-53 | `component_graph.json:40` and `ci.yml:92` planner sparse path `/tool/ci/main_ci_baseline.mjs`; asserted by `component_graph.test.mjs:592` | Planner checkout closure | C-14 | EDIT if C-28 is deleted (all three together) | n/a | n/a | H |
| C-54 | `tool/harness/lib/component_graph.mjs:8,10,13-18,484-520,542-547`; `component_graph.schema.json:196-220`; `tool/harness.mjs:64-69,242-243` | Validates and projects release/deploy operations (`release_targets`, `has_release_*`, `deploy_*` outputs) | Mobile + Firebase package | BECOMES-DEAD (simplify after C-47/C-48/C-50) | n/a | n/a | M |
| C-55 | `component_graph.json:1093` `app.build-control` (owns `tool/app_targets.json`, `mobile_package_policy.json`, wrappers) | Ownership | CI validation routing | KEEP (profile `mobile-build-control` `:672-680` loses only its release keys) | n/a | n/a | H |

### 1e. Registries and CI wiring

| ID | Location | What it does | Why it exists | Fate | Regression if removed | Cheaper alternate check | Conf. |
|---|---|---|---|---|---|---|---|
| C-56 | `tool/tools_manifest.json:959-1001` `ci:mobile-release-package` | Registers C-18..C-23 | Old pipeline | BECOMES-DEAD | n/a | n/a | H |
| C-57 | `tools_manifest.json:1003-1042` `ci:mobile-promotion-core` | Registers C-24..C-26 | Old pipeline | BECOMES-DEAD | n/a | n/a | H |
| C-58 | `tools_manifest.json:1044-1087` `ci:mobile-promotion-workflow` | Promoter workflow tests | Old pipeline | BECOMES-DEAD | n/a | n/a | H |
| C-59 | `tools_manifest.json:1089-1136` `ci:mobile-release-workflow` | Producer workflow tests; also runs `check_app_targets.mjs --check` | Old pipeline | BECOMES-DEAD (`platform:app-targets` already runs that check) | n/a | n/a | H |
| C-60 | `tools_manifest.json:678-713` `ci:firebase-delivery-package` (+ refs `:451`, `:3627`) | Registers C-29 | C-03 | BECOMES-DEAD | n/a | n/a | H |
| C-61 | `tools_manifest.json:743-769` `ci:finalize-ci-plan`; `:715-741` `ci:main-ci-baseline` | Register C-27/C-28 | C-02 | BECOMES-DEAD (baseline: if C-14 replaced) | n/a | n/a | H/M |
| C-62 | `tools_manifest.json:434-469` `ci:delivery-core` alsoCheckIds `:451-453` | Lists firebase/web/mobile packages | Fan-out | KEEP entry, EDIT alsoCheckIds (keep `ci:web-hosting-delivery-package`) | n/a | n/a | H |
| C-63 | `tools_manifest.json:4264-4276` `platform:mobile-build-number` | Monotonic `<date><run><attempt>` iOS / `100000+run*100+attempt` Android | Unique per CI attempt | REPLACE: fastlane `latest_testflight_build_number`/`google_play_track_version_codes` + 1, or `github.run_number` | Duplicate build numbers rejected by stores | Store rejects duplicates | M |
| C-64 | `tools_manifest.json:4330-4350` `platform:verify-app-store-build` | Build-floor check + wait for `VALID` | Pre-archive floor, post-upload processing | REPLACE: `pilot` waits for processing; floor comes from `latest_testflight_build_number` | n/a | `pilot` | H |
| C-65 | `tools_manifest.json:4352-4377` `platform:distribute-testflight-build` | Assign build to every internal group with testers | Distribution | REPLACE: ASC internal-group automatic distribution (or `pilot groups:`) | Testers not notified | ASC setting | H |
| C-66 | `tools_manifest.json:4379-4398` `platform:verify-ios-processing-receipts` | Cross-run receipts before Xcode Cloud retirement | Legacy cutover | DROP | None | n/a | H |
| C-67 | `tools_manifest.json:4400-4422` `platform:probe-google-play-access` | Ephemeral Play edit probe of both apps/tracks/testers | Fail before upload | DROP or REPLACE (`supply validate_only: true`, or `validate_play_store_json_key` with a key file from OIDC) | First upload failure surfaces in the lane instead | supply errors | M |
| C-68 | `tools_manifest.json:4424-4436` `platform:upload-google-play-bundle` | Publisher API upload to `qa`, production forbidden | Upload | REPLACE: `supply track: internal`; production lane separate and manual | n/a | supply | H |
| C-69 | `tools_manifest.json:4438-4450` `platform:xcode-cloud-workflow-state` | Registers C-44 | Legacy | DROP | None | n/a | H |
| C-70 | `tools_manifest.json:4278-4302` `platform:verify-ios-release-identity`, `:4304-4328` `platform:verify-android-release-identity` | Post-build identity verifiers | Wrong-role/identity guard; used by `release-readiness.yml:56` and `rules.json:2777,2782` | KEEP; call from the fastlane lane | Wrong-role uploads | n/a | H |
| C-71 | `tools_manifest.json:3759-3782` `platform:mobile-package-policy` | Size budget, forbidden assets/plugins, cross-role compare | `rules.json:2772` | KEEP; run nightly | Size/plugin regressions | n/a | H |
| C-72 | `tools_manifest.json:4214-4262` `platform:app-targets` | Runs `check_app_targets.test.mjs`, `mobile_release_target_contract.test.mjs`, `check_app_targets.mjs --check` | Contract | KEEP; EDIT impactPaths `:4221` and checks to drop the contract test | n/a | n/a | H |
| C-73 | `tool/ci/check_toolchain_consistency.sh:96-107` | Every Apple-native workflow uses `APPLE_CI_RUNNER` | Xcode floor | KEEP; EDIT list (drop the two mobile workflows, add the fastlane workflow if it runs on macOS). Mirror in `check_toolchain_consistency.test.mjs:10-20` and `tools-ci.yml:82-83` sparse checkout | Xcode/runner drift | n/a | H |
| C-74 | `tool/policy/rules.json:2717-2793` `APP-TARGET-IDENTITY-001` | Target contract rule; enforcement includes package policy and identity verifiers; doc anchor `#mobile-internal-release-ownership` (`:2789`) | Governance | KEEP; EDIT anchor if the heading changes; `sunset_when` "three consecutive complete release receipts" (`:2742`) and note `:2753` refer to old receipts | Enforcement-integrity failure if anchor breaks | n/a | H |
| C-75 | `tool/remote_ops_manifest.json:683-812` `mobile-internal-stores` | Inventory of the mobile remote surface: tool ids, workflows, manual gates #218/#199, required checks, run-id history | Remote-ops governance | REPLACE (fastlane workflow, ASC/Play secrets, production-lane guardrail); keep a short history line | n/a | n/a | H |
| C-76 | `remote_ops_manifest.json:160-162` (Firebase backend entry notes) | Describes "Delivery" queue, v4 cursor, v3 authority | Stale since `0c14b06cf` (#799) | DROP | None | n/a | H |
| C-77 | `tool/architecture/pattern_adoption.json:1158-1262` `ARCH-APP-TARGET-001` | prototypeFiles (`:1169-1178` incl. build-number, app-store, testflight, package, promotion tools), adopters (`:1206-1241` incl. both mobile workflows), exceptions (`:1243-1254`), requiredChecks (`:1259`) | Architecture exhibit | EDIT (keep app-target core; replace release adopters with the fastlane workflow) | `check_app_architecture_exhibits` / freshness drift | n/a | M |
| C-78 | `.github/workflows/release-readiness.yml:55-56,118-120` | Manual gate runs `platform:app-targets platform:verify-ios-release-identity`; lists TestFlight/Play evidence as outside | Pre-submission gate | KEEP (works once C-41 is edited) | n/a | n/a | H |
| C-79 | `.github/workflows/tools-ci.yml:356-357` `platform-env` bucket | Runs `env`/`platform` category checks | Tools CI | KEEP | n/a | n/a | H |

### 1f. Docs

| ID | Location | What it does | Fate | Conf. |
|---|---|---|---|---|
| C-80 | `docs/release_operations.md:2594-2741` "Mobile Internal Release Ownership" | Producer/promoter contract, retries, build numbers | REPLACE with a fastlane section. Keep the `flutter_with_env.sh` retry paragraphs (`:2653-2672`): the wrapper also serves `app-build-matrix.yml` | H |
| C-81 | `release_operations.md:2769-2896` "TestFlight Status" | Run-id evidence for old pipeline | DROP or reduce to a history line | H |
| C-82 | `release_operations.md:2897-2944` "Legacy Xcode Cloud State"; `:2945-2951` scripts paragraph | Xcode Cloud history | DROP. KEEP `:2939-2943` (Maps key helper, also used by `app-build-matrix.yml:238,244`), `:2953-2961` (toolchain.env, gitignored Maps xcconfig) by moving them | H |
| C-83 | `release_operations.md:2963-3001` "GitHub-Only Migration Status" | Cutover checklist | DROP | H |
| C-84 | `release_operations.md:3002-3027` "Human Release Evidence" | Run-id evidence | EDIT | M |
| C-85 | `release_operations.md:1636-1692` CD policy mobile paragraphs | Producer/promoter + package-size receipt | REPLACE (keep the package-size paragraph `:1682-1692` if C-71 stays) | H |
| C-86 | `release_operations.md:1176-1252` Required Secrets (prod-mobile iOS/Android/Play OIDC) | Secret inventory | REPLACE text for fastlane; KEEP the secrets, Play OIDC identity and WIF binding (fastlane `supply` can use the credentials file from `google-github-actions/auth`) | H |
| C-87 | `release_operations.md:693-744` environments | `prod-mobile` description, cutover duplicate-secret note `:741-744` | EDIT | M |
| C-88 | `release_operations.md:1821-1880` "Exact-Artifact Promotion And Resume" | Delivery contract; v3 authority paragraph `:1836-1843`; mobile sentence `:1876-1879` | EDIT (keep the web-hosting contract) | H |
| C-89 | `release_operations.md:268-279`, `:304-305`, `:317-338` | `:268-276` says a queue-proven main push "only plans, finalizes, packages Firebase delivery and writes the delivery authority" and that app builds run "in nightly validation and in Mobile Internal Release". Release-mode signed builds will then happen only nightly or on dispatch. `:304-305` "may authorize Firebase deployment or a mobile release"; `:317-338` main-push window + `finalize-plan` | EDIT | H |
| C-90 | `release_operations.md:561-562,588` workflow table rows and release sentence | Old workflows | EDIT | H |
| C-91 | `release_operations.md:1882-1941` "Release Setup Evidence Snapshot" | Signing incident history | EDIT/trim | L |
| C-92 | `docs/store/catch_host/README.md:16-17,55` | "Both store builds come from the same mobile producer run"; Producer = `mobile-internal-release.yml` | EDIT row `:55` to the new workflow; keep `:16-17` as history of the live submission | H |
| C-93 | `tool/README.md:576-630`; `docs/app_architecture.md:3526-3545` | Old producer/promoter prose and check list | EDIT | H |

---

### 2. Delete list

### 2a. Files to delete

| File | Note |
|---|---|
| `tool/ci/package_mobile_release.mjs`, `tool/ci/package_mobile_release.test.mjs` | C-18..C-23 |
| `tool/ci/mobile_promotion_core.mjs`, `tool/ci/mobile_promotion_core.test.mjs` | C-24..C-26 |
| `tool/ci/mobile_release_workflow.test.mjs`, `tool/ci/mobile_platform_authority_workflow.test.mjs`, `tool/ci/mobile_promotion_workflow.test.mjs` | Workflow tests (with the three workflows) |
| `tool/ci/finalize_ci_plan.mjs`, `tool/ci/finalize_ci_plan.test.mjs` | C-27 |
| `tool/ci/package_firebase_delivery.mjs`, `tool/ci/package_firebase_delivery.test.mjs` | C-29 |
| `tool/ci/main_ci_baseline.mjs`, `tool/ci/main_ci_baseline.test.mjs` | Only if C-14 switches to `github.event.before`. Note `main_ci_baseline.test.mjs:185-188` slices `finalize-plan`..`package-firebase`, so it must at least be edited even if the script is kept |
| `tool/platform/mobile_release_target_contract.test.mjs` | C-46 |
| `tool/platform/set_xcode_cloud_workflow_state.mjs` (+ its test) | Only together with `distribute_testflight_build.mjs` and `verify_app_store_build.mjs` (C-45) |
| `tool/platform/verify_ios_processing_receipts.mjs` (+ test) | C-66 (audited by the scripts agent; listed for registry consistency) |

### 2b. ci.yml edits

- Delete jobs `finalize-plan` `:576-663` and `package-firebase` `:665-817`.
- `required`: drop needs `:826` (`finalize-plan`) and `:839` (`package-firebase`); delete `:900-902`, `:903-909`, `:910-950`, the `authority` step `:953-1029` and the upload `:1031-1038`; drop `DEPLOY_REQUIRED` `:857`.
- `plan`: drop outputs `deploy_groups`/`deploy_required` `:71-72`; make the planner artifact name event-independent `:295`; optionally drop `sourceCiRunId/Attempt` binding `:197-203`; if C-14 is replaced, change `:139-147` to `base_sha="$BEFORE_SHA"` and remove sparse path `:92` (also `component_graph.json:40`, `component_graph.test.mjs:592`).
- Comments: `:27-39`, `:238-240`.
- `.github/workflows/functions-ci.yml:48-54`: delete the `functions-lib-*` upload.

### 2c. Registry edits

- `tool/tools_manifest.json`: delete entries `:678-713` (`ci:firebase-delivery-package`), `:743-769` (`ci:finalize-ci-plan`), `:715-741` (`ci:main-ci-baseline`, conditional), `:959-1001`, `:1003-1042`, `:1044-1087`, `:1089-1136` (four `ci:mobile-*`), `:4379-4398` (`verify-ios-processing-receipts`), `:4438-4450` (`xcode-cloud-workflow-state`); replace or delete `:4264-4276`, `:4330-4350`, `:4352-4377`, `:4400-4422`, `:4424-4436` according to the scripts audit. Edit `:451-453` (delivery-core alsoCheckIds), `:3627` (firebase:function-targets alsoCheckIds), `:4214-4262` (drop `mobile_release_target_contract.test.mjs` from impactPaths `:4221` and checks).
- `tool/harness/component_graph.json`: remove `releaseTargets`/`releaseRoles` from the 19 main entries and all `release` entries (C-47/C-48), mode `"release"` at `:5`, `deployGroupRequirements` `:24-29` and `deployGroups` (C-50); edit `:182-189`, `:816-825`, `:843-849`; optionally align main `ciTargets` with merge_group (C-49).
- `tool/harness/component_graph.schema.json:196-220`, `tool/harness/lib/component_graph.mjs:8,10,13-18,484-520,542-547`, `tool/harness.mjs:64-69,242-243`: drop release/deploy operations once the graph no longer uses them.
- `tool/remote_ops_manifest.json`: replace `:683-812`; delete notes `:160-162`.
- `tool/architecture/pattern_adoption.json:1158-1262`: edit prototypeFiles, adopters, exceptions, requiredChecks.
- `tool/policy/rules.json:2742,2753,2789`: update sunset wording and anchor.
- `tool/app_targets.json`: rewrite `:25-61`; trim `:386-394`, `:447-455`; drop `testFlightDistributionPolicy` `:85,108` (with `check_app_targets.mjs:129-134`).
- `tool/app_target_external_gates.json`: retire or re-scope both gates (with `check_app_targets.mjs:13-28`).
- `tool/ci/check_toolchain_consistency.sh:96-101`, `tool/ci/check_toolchain_consistency.test.mjs:16-19`, `.github/workflows/tools-ci.yml:82-83`: replace the two mobile workflows with the new one (if macOS) or remove them.

### 2d. Tests to edit (not delete) so other checks stay green

| Test | Lines | Why |
|---|---|---|
| `tool/ci/required_ci_policy.test.mjs` (imported by `workflow_wiring.test.mjs:10`, runs under `agent:harness-v2`) | `:46` dependency list includes `finalize-plan`, `package-firebase`; `:92-200` `mainGuard` artifact-authority tests | Delete `mainGuard` tests and the main artifact cases; update `:46` |
| `tool/harness/workflow_wiring.test.mjs` | `:1168-1176` (mobile release consumes v3 authority); `:1525-1575` loop `:1548` over `finalize-plan`, `package-firebase`; `:1610-1626` loop `:1621`; `:1662-1677` loop `:1674` asserts `finalize-plan`/`package-firebase` always run; `:1306-1326` comment "Main delivery consumers" (keep the assertion; web needs it) | Remove job ids that no longer exist |
| `tool/harness/component_graph.test.mjs` | `:145-165` (main release targets), `:186`, `:220`, `:297-305` (schema enum), `:333-352` (asserts `package_firebase_delivery.*` exist and `ci:firebase-delivery-package` check), `:400-439`, `:462-470` (lists `finalize_ci_plan.mjs`, `main_ci_baseline.mjs`), `:507-556`, `:592`, `:726-763` | Drop release/deploy expectations and deleted paths |
| `tool/harness/harness_cli.test.mjs` | `:79-126,163-191` (`release_targets`, `has_release_*` outputs) | Only if `harness.mjs:64-67` drops them |
| `tool/run.test.mjs` | `:194-210` expects `ci:mobile-release-package`, `ci:mobile-release-workflow` to be selected by mobile verifier changes | Re-point to `platform:*` ids |
| `tool/platform/check_app_targets.test.mjs` | `:187-222` (external gates), `:297-367` fixtures, `:368-535` (release ownership: 8 tests) | Rewrite with C-40 |
| `tool/ci/check_toolchain_consistency.test.mjs` | `:10-20` inputs list | Mirror C-73 |
| `tool/lib/tool_impact.test.mjs` | `:1034-1037` lists `tool/ci/delivery_core.mjs` (fine), check for `finalize`/firebase-package fixtures | Verify after deletions |

### 2e. Doc edits

`docs/release_operations.md` `:268-279`, `:304-305`, `:317-338`, `:561-562`, `:588`, `:693-744`, `:1176-1252`, `:1636-1692`, `:1719-1720`, `:1821-1880`, `:1882-1941`, `:2594-2741`, `:2769-2896`, `:2897-2962`, `:2963-3001`, `:3002-3027`, `:3131-3139`; `docs/store/catch_host/README.md:55` (and context `:16-17`); `tool/README.md:576-630`; `docs/app_architecture.md:3526-3545`. Keep a heading that `rules.json:2789` can anchor to, or update the anchor.

---

### 3. Must NOT be deleted (other consumers)

| Item | Consumer evidence |
|---|---|
| Main push CI run (`ci.yml:8-9`), `plan`, `queue`, `required` lane guard | `tool/ci/host_measurement_preview.mjs:119-123` (requires `event=push` success); `website-release.yml:13-16` (workflow_run on CI); `tool/ci/wait_main_marketing_validation.mjs:170-198` (push fallback); merge queue requires `Required CI` (`ci.yml:249` reads it on the queue run) |
| Run name `CI` (`ci.yml:2-3`) | `wait_main_marketing_validation.mjs:29`; `website-release.yml:14`; `workflow_wiring.test.mjs:1306-1326` |
| `tool/ci/delivery_core.mjs` + test | `_web-hosting-build.yml:404,411`; `_web-hosting-promote.yml:194,251`; `react-surface-validation.yml:189,192`; `package_web_hosting.mjs:6`; push filters `host-website.yml:21`, `marketing-website.yml:46`, `admin-website.yml:27` |
| `tool/firebase/affected_function_targets.mjs`, `plan_firebase_deploy_targets.mjs`, `list_firebase_function_targets.mjs` (imported by C-29) | `_backend-deploy.yml`, `tool/deploy_firebase_targets.sh`, `functions-ci.yml`, `check_deploy_parity.mjs`, `report_environment_parity.mjs` |
| `tool/platform/resolve_app_target.mjs` | `tool/flutter_with_env.sh`, `tool/use_firebase_environment.sh`, `tool/validate_firebase_environment.sh`, `host-website.yml`, `verify_ios_release_identity.mjs`, `verify_android_release_bundle.mjs`, `docs/app_architecture.md` exhibit |
| `tool/app_targets.json` identity/targets/`appleNativeDependencies`, Play SA, upload-cert SHA | Generators, wrappers, `check_toolchain_consistency.sh:72-88`, `verify_android_release_bundle.mjs:171` |
| `tool/platform/check_app_targets.mjs` (core) | `release-readiness.yml:56`; Tools `platform-env` bucket; `rules.json:2747,2757` |
| `platform:verify-ios-release-identity`, `platform:verify-android-release-identity`, `platform:mobile-package-policy` | `release-readiness.yml:56`; `rules.json:2772,2777,2782` |
| `tool/flutter_with_env.sh` CI retries; `tool/write_ios_maps_key_xcconfig.sh` | `app-build-matrix.yml:238,244`; all CI builds |
| `.github/workflows/app-build-matrix.yml`, `plan.outputs.app_roles` / `deriveAppRoles` | CI app builds (`ci.yml:558-574`) |
| `tool/ci/check_toolchain_consistency.sh` | `tools-ci.yml` "Check CI toolchain pins"; `env:ci-toolchain` |
| `prod-mobile` environment, ASC API key secrets, Android upload keystore secrets, Play OIDC SA + WIF binding | Needed by the fastlane lanes; only the reusable-p12 secrets are optional, depending on the signing choice |
| `queue_verified_run` plumbing and `compare_selectors.mjs` baseSha binding | All validation lanes; `compare_selectors.mjs:87` |

---

### 4. Do package-firebase, the Firebase package, finalize-plan and the authority have another consumer?

No. Evidence:

- Grep of `.github`, `tool`, `website/scripts` for `harness-success`, `ci-delivery-authority`, `firebase-delivery-`, `harness-plan-`, `package_firebase_delivery`, `finalize_ci_plan`: outside ci.yml self-references and tests, the only readers are `mobile-internal-release.yml:131-253,663,912` and `package_mobile_release.mjs:146-223`.
- Backend: `backend-deploy.yml:1-71` / `_backend-deploy.yml:1-60` plan from the `deployed/<env>` tag and build from the checked-out commit; the file has no `artifact`/`ci.yml` reference. The Delivery workflow that consumed the package and the v3 authority was retired in `0c14b06cf` (#799). `release_operations.md:1875-1876` already says "The Firebase backend no longer uses this contract".
- Web: `website-release.yml` → `website/scripts/next/releaseTrain.mjs:34-48,74-80` → `wait_main_marketing_validation.mjs` reads only marketing/capture job records and the `canonical-marketing-*` artifact of the queue or push run. `_web-hosting-build.yml:270-305` verifies artifacts of its own run. `_web-hosting-promote.yml:320-345` reads run summaries only. `previewRelease.mjs:44-53` and `host_measurement_preview.mjs:38-47` check run conclusion only.
- `functions-lib-*` (functions-ci.yml:48-54) is read only by `package-firebase` (`ci.yml:756-761`).
- `deploy_groups`/`deploy_required` plan outputs are read only by `finalize-plan`, `package-firebase` and `required` (`ci.yml:857,957`).

Side effects to handle when deleting: drop `finalize-plan`/`package-firebase` from `required.needs`; remove the main-only artifact/authority steps; fix the tests in 2d; `main_ci_baseline.test.mjs:185-188` slices the deleted jobs. What is lost: `finalize-plan:651-656` re-runs the doc-metadata and new-widget gates against the widened main window. The merge queue already runs both per commit, so this is redundant once main-driven delivery is gone.
