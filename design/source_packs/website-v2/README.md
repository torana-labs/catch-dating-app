# Website v2 prototype boards

Approved by the owner on 2026-10-25 as the target design for catchdates.com. They were drawn on the Catch directions design canvas, on its "Website v2" page: https://claude.ai/artifact/S6RC4qZwMpNhyUrtxQ2xKf. The build plan is https://claude.ai/artifact/CBpW6KApEA3dVrTqpwFgor, and the work is tracked in the Linear project "Website v2" (CAT-245 to CAT-265).

## What is here

- `boards/`: the board sources, as Claude Design canvas components (`.dc.html`).
  - `WebHomeV2` is the homepage.
  - `WebHostV2` is the host landing page.
  - `WebOrgV2` is the organiser page.
  - `WebEventV2` is the event page.
  - `GuestLive` and `GuestAfter` are the guest app screens the homepage shows.
- `assets/screens/`: app screen renders placed inside the boards as images.
- `assets/photos/`: two placeholder photos the boards use. #875 retired them from the live site on 2026-10-25, so the builds must use approved photography or activity covers instead.
- `blob-map.json`: maps each `/_blob/<id>` image in a board to a file in this repo.

The boards run on the design canvas, which supplies `support.js` and the template runtime. Here they are reference sources, not runnable pages.

## Reference screenshots

Full-page captures of each state are under `design/reference_screens/screen.website.*`, at 390 and 1280 CSS pixels wide, and are registered in `design/reference_screens/manifest.json`. Each capture is the board rendered by its own component logic in headless Chromium at 1x, then re-encoded as an RGB PNG.

| Screen | States |
| --- | --- |
| `screen.website.home` | `mumbai_live`; `launching_soon` (Pune chosen in the city picker) |
| `screen.website.host_landing` | `default` |
| `screen.website.organizer` | `guest` (claimed page on the club's own domain); `generated` (built from public pages, before claim); `owner` (the organiser viewing their own page) |
| `screen.website.event` | `catch_full` (all ten optional fields); `catch_bare` (every optional field off); `luma_import` (title, time, place, price and description only) |

Each board's dashed prototype bar is a review control, not part of the page.

## How to use them

- Build every visual part from these boards as `@catch/web-ui` components, then compose the pages from them (blueprint D18).
- Snap to the decided library defaults. Headlines max out at 72px under D19 (the boards use 88px). Buttons have 4px corners under D20 (the boards use 10px). Colours come from the v2 tokens (CAT-245), not from hex values in the boards.
- Keep dating wording out of public pages. The host board's games journey still says "Saturday Singles Mixer", and its live-screen images show partner and match words. Those parts are not a target for copy.
- Pixel comparison against these references is advisory.
