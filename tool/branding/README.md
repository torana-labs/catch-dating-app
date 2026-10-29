# Native Branding Assets

`generate_native_brand_assets.dart` keeps native launcher and splash branding
aligned with the cached design tokens in
`design_context_pack/design_system/tokens.json`.

Run it after token or base icon changes:

```bash
dart run tool/branding/generate_native_brand_assets.dart
```

`generate_catch_icon.swift` renders the consumer single-line `Catch_` launcher
and splash mark from the bundled Archivo variable face at explicit `wght: 600`
and `wdth: 78` axes. The orange `_` is a glyph in the same baseline lockup, not
a separately stacked bar. The generator renders the singular `Catch Host`
launcher, logo, and light/dark splash marks from those same explicit Archivo
axes; it must never fall back to a platform system font:

```bash
swift tool/branding/generate_catch_icon.swift
```

It regenerates:

- `assets/branding/catch_icon.png`
- `assets/branding/catch_icon_square.png`
- `assets/branding/catch_icon_round.png`
- `assets/branding/catch_splash_mark_light.png`
- `assets/branding/catch_splash_mark_dark.png`
- `assets/branding/catch_host_splash_mark_light.png`
- `assets/branding/catch_host_splash_mark_dark.png`
- `assets/branding/catch_hosts_logo.png`
- `assets/branding/catch_hosts_icon.png`
- Android production round launcher icon resources

`generate_native_brand_assets.dart` regenerates:

- the Consumer native splash colors in `apps/consumer/pubspec.yaml`
- `assets/branding/generated/catch_icon_dev.png`
- `assets/branding/generated/catch_icon_staging.png`
- `assets/branding/generated/catch_icon_host_dev.png`
- `assets/branding/generated/catch_icon_host_staging.png`
- `assets/branding/generated/catch_icon_host_prod.png`
- Android `dev`/`staging` launcher icon resource overlays
- Android `hostDev`/`hostStaging`/`hostProd` launcher icon resource overlays
- iOS `AppIcon-dev` and `AppIcon-staging` asset catalogs
- iOS `AppIcon-host-dev`, `AppIcon-host-staging`, and
  `AppIcon-host-prod` asset catalogs
- macOS `AppIcon-dev` and `AppIcon-staging` asset catalogs
- macOS `AppIcon-host-dev`, `AppIcon-host-staging`, and
  `AppIcon-host-prod` asset catalogs
- the independent `apps/consumer` production, dev, and staging Android/iOS
  launcher resources
- the Consumer-only iOS launch-screen constraints that place the generated
  `Catch_` alpha bounds at the Welcome reel's responsive `Catch` anchor
- the Host iOS/Android centered launch assets and Host iOS launch-screen
  storyboard
- `tool/branding/native_branding.generated.json`

Consumer production uses `assets/branding/catch_icon.png`; the native-brand
generator projects it into the default Android/iOS catalogs in
`apps/consumer` and projects its ribboned variants into the dev/staging
catalogs.
Host production uses the two-line `Catch Host` icon as its base, through the
generated `AppIcon-host-prod` catalogs and Android `hostProd` launcher
resources. Host native and Flutter startup frames use the separate centered
`Catch Host` light/dark splash marks and never mount the Consumer Welcome reel.
Dev and staging flavors use diagonal corner ribbons, so internal builds stay
visually distinct without covering the consumer or host wordmarks.

`flutter_native_splash:create`, run from `apps/consumer`, owns the Consumer
base launch-screen assets (Android drawables, iOS launch images, web splash)
and may replace the storyboard. Run `generate_native_brand_assets.dart` after it so the
Consumer responsive launch geometry and the Host-specific centered
storyboard/assets are reapplied from source.

Launcher icons have no third-party generator: this generator owns every native
launcher catalog. Do not reintroduce `flutter_launcher_icons`; it rewrites the
Consumer Xcode project's per-flavor `ASSETCATALOG_COMPILER_APPICON_NAME`, so
dev and staging builds would show the production icon. The Consumer web icons
under `apps/consumer/web/icons` are static copies of `catch_icon.png`.
