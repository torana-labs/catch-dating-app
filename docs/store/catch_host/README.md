# Catch Host Store Pack

This is the store record for the `Catch Host` app on the App Store and Google
Play. It is not the record for the consumer Catch app. Open work for the next
submission is tracked in Linear (`CAT-39` "Prepare Catch Host release", and
`CAT-207` for purpose strings), not in this folder.

## Live submissions

| Store | Release | Source | Status |
| --- | --- | --- | --- |
| App Store | `1.0.1` build `202610200000357901` | `171c1cb07` (PR #713 merge) | Submitted 2026-10-21; still Waiting for Review on 2026-10-23. The description correction and App Review notes additions were saved on 2026-10-22. The EU DSA trader declaration is In Review. |
| Google Play, closed test | `1.0.1 (457901)`, Alpha track, India | `171c1cb07` | Submitted 2026-10-21 with 14 publishing changes. Production access needs at least 12 opted-in testers for 14 continuous days. |
| Google Play, internal | `1.0.1 (452901)` | earlier 2026-10-20 upload | Available to internal testers since 2026-10-20; not reviewed |

Both store builds come from the same run (`39453202046`, attempt 2) of the
retired Mobile Internal Release producer. The iOS build was promoted by run
`39458936493`.

## Records in this folder

| Document | Contents |
| --- | --- |
| `metadata.md` | Live App Store and Play listing values, age rating, content rating, declarations, seller and copyright |
| `privacy_inventory.md` | The published App Privacy declaration (20 types since 2026-10-23), reconciled against the submitted build, plus the Play data declarations |
| `review_notes.md` | Reviewer access on file, the payment and in-app purchase posture, and review-facing facts about the submitted build |
| `asset_manifest.json` | Machine-readable summary of the live submission and the asset locations |
| `icon/app-icon-1024.png` | App icon from the Host prod icon set |
| `screenshots/iphone_6_9/` | Earlier 6.9-inch source drafts, **not** the uploaded screenshots |

The uploaded screenshots and the Play feature graphic are in the ignored local
folder `build/store-upload/listing-assets/`:

- iPhone, 6.3-inch, 1206×2622: Today, Rehearsal, Room
- iPad, 13-inch landscape, 2752×2064: Rehearsal, Room
- Play: 512 icon and 1024×500 feature graphic

The console evidence for these records is the rest of `build/store-upload/`.
The reviewer and deletion credential files there are private; this repository
is public.

The cross-app screenshot direction remains in
[`../app_listing_screenshot_production_brief.md`](../app_listing_screenshot_production_brief.md).

## Release build source

`node tool/platform/resolve_app_target.mjs --role host --environment prod`
resolves the Host target to this build:

| Field | Value |
| --- | --- |
| Project root | `apps/host` |
| Entrypoint | `apps/host/lib/main_prod.dart` |
| Xcode scheme / configuration | `host-prod` / `Release-host-prod` |
| Marketing version | `1.0.1` (`apps/host/pubspec.yaml`) |
| Builds and uploads | `.github/workflows/mobile-beta.yml` (`fastlane/Fastfile`); production through `.github/workflows/mobile-production.yml` |

The legacy root `ios/` project is not the Host release source.

## How `main` differs from the submitted source

These changes on `main` after `171c1cb07` affect store declarations:

| Change | Effect on the next submission |
| --- | --- |
| PR #726: Host analytics hold (native deactivation plus Dart gate) | The next build collects less. The published Coarse Location row becomes an acceptable over-declaration. |
| PR #738 (merged 2026-10-22): Privacy policy, Terms and Help & support in the Host Account menu, with the URLs in every dart-define file | Adds the in-app privacy link that the submitted build lacks |

## Apple requirements referenced

- App record fields:
  https://developer.apple.com/help/app-store-connect/reference/app-information/app-information
- Platform version fields:
  https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information
- Screenshot specifications:
  https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications
- App privacy:
  https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy
- Firebase data collection guidance for App Store labels:
  https://firebase.google.com/docs/ios/app-store-data-collection

The App Review Guidelines applied in this pack are 1.2, 2.1, 3.1.1, 3.1.3,
4.8 and 5.1.1.
