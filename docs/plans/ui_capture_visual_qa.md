---
doc_id: ui_capture_visual_qa
owner: ui_capture_pipeline
status: remaining_work
---

# UI Capture Visual QA - Remaining Queue

Coverage answers "does a routed surface render." This file tracks only captures
whose visual usefulness still needs work or reclassification.

## Status Labels

- `ready`: useful as a review artifact now.
- `marketing-candidate`: strong enough to feed the framed marketing pipeline.
- `fixture-needs-data`: route renders, but the fixture is too empty or generic.
- `screen-needs-fix`: capture exposed a UI/state issue in the real screen.
- `review-only`: keep for coverage and regression review, not marketing.
- `needs-classification`: capture exists but has not been visually reviewed yet.

## Implemented / No Longer Listed

The following were previously marked ready or marketing-candidate and have no open
action here: `profile_self`, `start_welcome`, `onboarding_welcome`,
`event_detail_member`, `dashboard_home`, `club_detail_member`,
`calendar_planned_events`, `saved_events_list`, `event_location_map`,
`member_event_discovery`, `host_event_setup`, `edit_hosted_event`,
`host_live_console`, `post_run_catch_window`, `swipe_hub_active`,
`notifications_activity`, `event_success_companion`, `match_chat_context`,
`matches_list_context`, `reviews_history_list`, `event_detail_member_ticket`,
`event_detail_member_spotlight`.

Notes:

- `event_detail_member_ticket` is classified as `ready`; it is the ticket-mode
  event-detail variant and supplements the baseline member detail capture.
- `event_detail_member_spotlight` is classified as `ready`; it is the dark/wow
  event-detail reference variant.
- A full local refresh of all 31 captures passed on 2026-06-01:
  `node tool/ui_capture/run_captures.mjs --all --output-dir /private/tmp/catch-ui-capture-refresh --device iphone-17-pro --pixel-ratio 2.0 --output-layout theme-first`.
- Text-scale `2.0` proof passed on 2026-06-01 for `profile_self`,
  `onboarding_welcome`, `event_detail_member`, `host_live_console`,
  `settings_account`, `payment_history_empty`, and `event_success_companion`.
- The checked sales-demo projection is still `planned`, not `uploaded`; capture fixtures
  therefore do not load planned remote photo URLs into `NetworkImage` until uploaded
  assets are available.

## Current Queue

| Capture | Status | Consumer | Remaining action |
|---|---|---|---|
| `auth_phone_entry` | review-only | Review | Add an OTP-state variant only if auth-flow review needs it. |
| `filters_preferences` | review-only | Review | Keep sparse unless filters get a broader preference surface. |
| `create_club_basics` | fixture-needs-data | Review | Seed draft/initial form data once form fixture hooks exist. |
| `edit_club_basics` | fixture-needs-data | Review | Add deterministic club image/photo state. |
| `host_post_event_report` | marketing-candidate | Review + marketing | Light mode is useful; tune/check dark-mode contrast before using dark output externally. |
| `event_recap_attendees` | fixture-needs-data | Review | Use synthetic persona photos when image fixture support lands. |
| `public_profile_member` | ready | Review | Add photo-backed synthetic profile later; current placeholder is acceptable for review. |
| `settings_account` | review-only | Review | Consider a production-mode settings fixture if this ever becomes marketing. |
| `payment_history_empty` | review-only | Review | Add populated receipt variant only if payment QA needs it. |

## Cross-Cutting Remaining Work

1. **Add image-backed synthetic personas where they matter.**
   - Highest-value surfaces: recap, matches, public profile, and edited club detail.
   - Requires uploaded persona assets; planned remote URLs are intentionally not loaded by
     local capture fixtures.

2. **Keep marketing-candidate status tied to active marketing slots.**
   - The active manifest currently has six marketing slots. Do not promote additional
   captures to marketing without updating `tool/marketing/capture_manifest.json` and
   verifying export/sync.

## Verification Commands

```bash
node tool/ui_capture/check_route_inventory.mjs --check
node tool/ui_capture/check_capture_coverage.mjs --check
node tool/ui_capture/run_captures.mjs --ids event_detail_member_ticket,event_detail_member_spotlight --output-dir /private/tmp/catch-ui-capture-qa
node tool/ui_capture/run_captures.mjs --ids profile_self,onboarding_welcome,event_detail_member,host_live_console,settings_account,payment_history_empty,event_success_companion --text-scale 2.0 --output-dir /private/tmp/catch-ui-capture-text-scale
node tool/marketing/export_app_screenshots.mjs --check
```
