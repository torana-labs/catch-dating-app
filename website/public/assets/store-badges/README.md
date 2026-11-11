# Official store badges

Apple's and Google's badge guidelines do not allow a drawn store button, so the
website shows the stores' own artwork through `CatchStoreButton`
(`@catch/web-ui`, proposal L8). Do not recolour, stretch, tilt, overlay or
redraw these files; keep both badges the same height with at least 12px of
clear space.

| File | Source | Changes |
|---|---|---|
| `app-store-download-on-the.svg` | Apple, "Download on the App Store", black, US-UK: `https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg` | None. |
| `google-play-get-it-on.png` | Google, "Get it on Google Play", en: `https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png` | Transparent padding cropped (646×250 to 564×168); pixels unchanged. |

Fetched 2026-11-11. Google Play and the Google Play logo are trademarks of
Google LLC. Apple and the Apple logo are trademarks of Apple Inc.
