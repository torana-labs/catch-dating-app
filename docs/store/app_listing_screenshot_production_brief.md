---
doc_id: app_listing_screenshot_production_brief
version: 0.1.1
updated: 2026-07-23
owner: release_operations
status: active
---

# App Listing Screenshot Production Brief

This document is the approved production handoff for the Catch consumer and
Catch Host store-listing screenshot sets. It owns the ordered story, capture
states, fixture requirements, composition rules, export matrix, and review
criteria. The app UI and deterministic capture catalog remain the source of
truth for what the product actually does.

This brief does not approve an App Store or Play submission. Release-build
parity, legal metadata, privacy answers, account state, and final upload remain
owned by [`../release_operations.md`](../release_operations.md).

The first Apple iPhone visual-review checkpoint for C01-C03 and H01-H03 lives
in [`app_listing_prototypes/`](app_listing_prototypes/). Those images remain
prototypes until the review and release gates below are complete.

Store-format references verified on 2026-07-23:

- Apple screenshot upload and count requirements:
  https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/
- Apple device screenshot dimensions:
  https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- Google Play preview assets, screenshot rules, and feature-graphic dimensions:
  https://support.google.com/googleplay/android-developer/answer/9866151?hl=en

Recheck these sources immediately before export because store specifications
and supported device classes can change independently of this repository.

## Approved Direction

- Produce eight unique screenshot concepts for Catch and eight for Catch Host.
- Make the first three images in each set tell the whole conversion story.
- Use static screenshots for the first release. Do not produce an App Preview
  or Play preview video until the screenshot baseline is live and measured.
- Lead Catch with real events and disclose the attendance-gated matching layer.
- Lead Catch Host with event operations and the live host console, not profile
  or account setup.
- Use only real production UI rendered with coherent synthetic demo data.
- Keep both apps visibly related through one editorial design system, while
  giving Catch a social/editorial emphasis and Catch Host an operational one.

## Output Contract

| Surface | Per app | Required output | Notes |
| --- | ---: | --- | --- |
| Apple iPhone | 8 | 1320x2868 portrait PNG or JPEG, no alpha | Use a supported 6.9-inch size. App Store Connect may scale this set for smaller iPhones. |
| Apple iPad | 8 | 2064x2752 or 2048x2732 portrait PNG or JPEG, no alpha | Both iOS targets currently include iPad in `TARGETED_DEVICE_FAMILY`; capture native adaptive layouts rather than enlarging the phone composition. |
| Google Play phone | 8 | 1080x1920 portrait 24-bit PNG or JPEG, no alpha | This fills the phone limit and satisfies the four-image, 1080px recommendation threshold. |
| Google Play feature graphic | 1 | 1024x500 24-bit PNG or JPEG, no alpha | One graphic per app. Keep the focal point centered and do not use a device silhouette. |
| Google Play tablets | Deferred gate | At least 4 per enabled tablet size class | Confirm Android tablet distribution and adaptive QA before adding tablet listing media. |

The creative system therefore contains 16 unique stories and, for the initial
Apple and phone-Play launch, 48 screenshot exports plus two Play feature
graphics. Localization creates additional exports and is a follow-up workstream
after the English (U.S.) baseline is approved.

## Copy And Composition Rules

### Copy

- Use one headline and, only when needed, one supporting sentence.
- Keep headlines to about seven words. A line break may clarify rhythm but must
  not split a phrase awkwardly.
- Use sentence case. Do not use all-caps marketing copy, superlatives, rankings,
  testimonials, prices, time-limited offers, or download/install calls to action.
- Use **Catch** as the consumer action noun and **Playbook** as the public Host
  label. Do not expose the internal **Event Success** name in listing copy.
- Do not claim identity verification. Attendance-gated matching may be described
  as involving people who checked in or attended the same event.
- Claims about reviews must say **verified guest reviews** only when the fixture
  visibly represents reviews tied to completed attendance.

### Layout

- Every image must make sense on its own; do not rely on a panorama spanning
  adjacent screenshots.
- Keep the app UI as the dominant visual. Added copy should occupy no more than
  roughly the top 20 percent of Google Play images.
- Use a single clear UI focal point. Crop or scroll to the state that proves the
  headline instead of showing a generic top-of-page state.
- Apple compositions may use the established dark editorial header, warm paper
  canvas, activity accent, and one restrained device frame.
- Google Play compositions should remove the heavy device silhouette and give
  more area to the UI. Preserve the headline, palette, and focal state.
- iPad compositions must use native tablet captures and a tablet-aware crop.
  Do not place a phone screenshot inside an iPad-shaped frame.
- Do not include notification content, carrier names, debug banners, fixture
  labels inside the app UI, or any store badge.

### Demo data

- Use deterministic synthetic people, organizers, events, messages, payments,
  reviews, and metrics. Never use a production account or real conversation.
- Keep city, currency, venue, date, event type, host, and attendee identities
  coherent across all eight images in a set.
- Use one primary consumer story and one primary Host story so the screenshots
  feel like a connected journey rather than unrelated fixtures.
- Dates must be stable relative to the injected capture clock. Avoid copy such
  as `today` or `this weekend` unless it is correct in the rendered fixture.
- Counts must remain mathematically possible: attended cannot exceed booked;
  matches cannot exceed the mutual-interest population; chat starts cannot
  exceed matches; and review counts cannot exceed eligible attendees.
- Currency must be consistent within a listing set. The English launch set uses
  the India sales-demo story and INR.

## Catch Consumer Shot Matrix

The conversion sequence is: understand the proposition, see a real event,
understand the attendance-gated difference, establish trust, see the live
experience, receive the reward, see the conversation quality, and close on
control.

### C01 - Events before matches

| Field | Production decision |
| --- | --- |
| Headline | **Meet at real events. Match after.** |
| Support | Browse hosted singles events near you. |
| Route | `exploreScreen` / `/organizers` |
| Source capture | `member_event_discovery` |
| Source status | Active marketing capture; refresh rather than redesign. |
| Required state | Populated Explore feed with at least four visually distinct event types, clear dates, prices, organizer names, and availability. |
| Fixture requirements | One city; coherent future dates; one free and two paid events; no empty, loading, or unclaimed-organizer emphasis. |
| Composition | Keep `Explore`, the time filters, and at least three event rows legible. The first event must begin above the fold. |
| Proof | A viewer can identify Catch as an events-first singles product without reading any other frame. |

### C02 - Event confidence

| Field | Production decision |
| --- | --- |
| Headline | **Pick a night worth showing up for** |
| Support | See the plan, host, price, and who it is for. |
| Route | `eventDetailScreen` / `/organizers/:clubId/events/:eventId` |
| Source capture | Promote `event_detail_member_ticket` or `event_detail_member_spotlight` after visual review. |
| Source status | Deterministic route captures exist; choose and register one marketing fixture. |
| Required state | Bookable event detail with a strong hero, event plan, named organizer, price, spots remaining, and primary booking action. |
| Fixture requirements | Same organizer and one of the events shown in C01; complete location summary, cancellation policy, itinerary, and attendee eligibility. |
| Composition | Favor the hero plus the first decision-making section. The Book action must be visible but must not be covered by the store composition. |
| Proof | The image answers what the event is, who runs it, and what the member should do next. |

### C03 - Attendance-gated Catch window

| Field | Production decision |
| --- | --- |
| Headline | **Catch people you actually met** |
| Support | Your private Catch window opens after check-in. |
| Route | `swipeEventScreen` / `/catches/:eventId` |
| Source capture | `post_run_catch_window` |
| Source status | Active marketing capture; refresh and preserve the populated state. |
| Required state | One polished profile card with the shared event and compatibility reasons visible; remaining-Catches count must be nonzero. |
| Fixture requirements | Viewer and candidate both attended the same event; candidate has a complete public profile; no real photos or sensitive data. |
| Composition | Preserve the shared-event line, candidate identity, compatibility reasons, and Catch/pass controls. |
| Proof | A viewer understands that matching follows a shared attended event, not an anonymous swipe feed. |

### C04 - Organizer trust

| Field | Production decision |
| --- | --- |
| Headline | **Book with confidence** |
| Support | Know the host, policies, and verified guest reviews. |
| Route | `organizerDetailScreen` / `/organizers/:clubId` |
| Source capture | Promote `club_detail_member` after scrolling to the trust-rich state. |
| Source status | Deterministic route capture exists; a store-specific scroll position is needed. |
| Required state | Claimed organizer profile with a complete identity, upcoming event, rating, review count, and at least one verified review excerpt. |
| Fixture requirements | Same organizer as C01/C02; review totals must agree with visible reviews and the public organizer projection. |
| Composition | Show organizer identity and review evidence together. Do not lead with a Join button or empty schedule. |
| Proof | The frame communicates accountability before booking. |

### C05 - Live guest experience

| Field | Production decision |
| --- | --- |
| Headline | **A better night, built in** |
| Support | Live prompts and introductions help the room connect. |
| Route | `eventSuccessCompanionScreen` / `/organizers/:clubId/events/:eventId/companion` |
| Source capture | Promote `event_success_companion_conversation_cues`; compare with `event_success_companion_wingman_request`. |
| Source status | Deterministic stage captures exist; select the least phone-heavy and most legible state. |
| Required state | Checked-in attendee during a live step, with one actionable social prompt or private introduction request and clear event context. |
| Fixture requirements | Live event with a saved Playbook; viewer is booked and checked in; no loading, pending, or opt-out state. |
| Composition | Show one stage card and its action. Avoid a dense stack of module cards. |
| Proof | The frame demonstrates that Catch actively improves the in-person experience. |

### C06 - Mutual match

| Field | Production decision |
| --- | --- |
| Headline | **A mutual Catch becomes a match** |
| Support | Only mutual interest unlocks a conversation. |
| Route | `matchesListScreen` / `/chats` |
| Source capture | Compare `matches_list_match_celebration` with `matches_list_context`; use the clearer store composition. |
| Source status | Deterministic captures exist; marketing fixture registration is needed. |
| Required state | Positive populated match state with shared-event context and no duplicate or stale threads. |
| Fixture requirements | Match must be derivable from two eligible mutual Catches after the same event. |
| Composition | Prefer one emotionally clear match moment over a long utility list. Keep the shared event visible. |
| Proof | The private-to-mutual transition is understandable without explanatory fine print. |

### C07 - Contextual conversation

| Field | Production decision |
| --- | --- |
| Headline | **Start with something real** |
| Support | Every chat remembers the event you shared. |
| Route | `chatScreen` / `/chats/:matchId` |
| Source capture | `match_chat_context` |
| Source status | Active marketing capture; refresh rather than redesign. |
| Required state | Warm, believable conversation with the shared-event context banner visible and no composer error state. |
| Fixture requirements | Same event family as C01-C06; concise messages; no phone numbers, social handles, or production user text. |
| Composition | Preserve the other member's name, shared-event banner, a readable exchange, and composer. |
| Proof | The conversation feels easier because the pair already has a shared memory. |

### C08 - Member control

| Field | Production decision |
| --- | --- |
| Headline | **You stay in control** |
| Support | Manage preferences, blocking, reporting, and your account. |
| Route | `settingsScreen` / `/settings` |
| Source capture | Promote `settings_account`; use `settings_blocked_list` only as supporting evidence during review. |
| Source status | Deterministic captures exist; store crop and fixture cleanup are needed. |
| Required state | Populated settings screen with safety, preferences, privacy, and account rows visible; no destructive confirmation or error. |
| Fixture requirements | Complete viewer profile; stable preference values; no real blocked-user identity. |
| Composition | Crop around the safety/control section rather than generic profile settings. |
| Proof | The final frame closes the story on agency without using fear-based copy. |

## Catch Host Shot Matrix

The conversion sequence is: run the night, publish the event, control demand,
track money, move the door, improve the room, communicate with guests, and
measure the result.

### H01 - Live operating console

| Field | Production decision |
| --- | --- |
| Headline | **Run the whole night from one screen** |
| Support | Check in guests, move the waitlist, and stay on the run of show. |
| Route | `hostAppEventManageScreen` / `/host/organizers/:clubId/events/:eventId/manage` |
| Source capture | `host_live_console` |
| Source status | Active marketing capture; promote from third to first and refresh. |
| Required state | Live tab with current Playbook step, booked/due/in/waitlist counts, one waitlist action, and roster rows. |
| Fixture requirements | Twenty booked, seven checked in, three waitlisted; counts must agree with roster and event capacity. |
| Composition | Keep the event name, Live tab, current step, count strip, and one actionable roster row. |
| Proof | A host can see that Catch replaces several live-event tools with one console. |

### H02 - Guided publishing

| Field | Production decision |
| --- | --- |
| Headline | **Publish in one guided flow** |
| Support | Build the event, save a draft, and go live when ready. |
| Route | `hostCreateEventScreen` / `/host/organizers/:clubId/create-event` |
| Source capture | Promote `host_create_success_manage`; retain `host_event_setup` as supporting evidence. |
| Source status | Deterministic success capture exists; marketing fixture registration is needed. |
| Required state | Completed event creation success with event identity and Manage event action, or a final review step with every section complete. |
| Fixture requirements | Same event used throughout H01-H08; completed basics, media, venue, schedule, policy, and Playbook. |
| Composition | Do not show an empty form. Show completion and the resulting event. |
| Proof | The image communicates progress from setup to a publishable event. |

### H03 - Admission and demand controls

| Field | Production decision |
| --- | --- |
| Headline | **Fill the room on your terms** |
| Support | Set capacity, approvals, pricing, cohorts, and waitlists. |
| Route | `hostCreateEventScreen` / `/host/organizers/:clubId/create-event` |
| Source capture | `host_create_policy` |
| Source status | Active marketing capture; refresh and retain. |
| Required state | Completed policy step with capacity, INR price, balanced admission, demand pricing, age range, and waitlist behavior. |
| Fixture requirements | No validation errors; policy must be compatible with the event type and capacity used in H01. |
| Composition | Favor the admission format and one differentiated control. Avoid cropping field labels or sticky actions. |
| Proof | The host can see meaningful controls rather than a generic ticket form. |

### H04 - Payment readiness

| Field | Production decision |
| --- | --- |
| Headline | **Know where every payment stands** |
| Support | Keep payout readiness and guest payment status together. |
| Route | `hostOrganizersScreen` / `/host/organizers/payments` |
| Source capture | Promote `host_clubs_payout_ready`; compare with the payment column in `host_post_event_report`. |
| Source status | Deterministic capture exists; select a state that proves both readiness and money movement without exposing account data. |
| Required state | Payout account ready plus a compact paid/pending/refunded summary or linked event payment status. |
| Fixture requirements | INR values; no bank details, account numbers, test-mode banners, or impossible payout totals. |
| Composition | Keep the payout status, next action, and one useful payment summary together. |
| Proof | The frame communicates operational visibility, not financial performance claims. |

### H05 - Door and waitlist

| Field | Production decision |
| --- | --- |
| Headline | **Keep the door moving** |
| Support | Check guests in and offer open spots without losing the room. |
| Route | `hostAppEventManageScreen` / `/host/organizers/:clubId/events/:eventId/manage` |
| Source capture | Promote `host_manage_attendance_roster`; compare with `host_manage_full_waitlist_apron`. |
| Source status | Deterministic captures exist; store-specific crop is needed. |
| Required state | Populated attendance roster with due and checked-in guests plus one visible waitlist movement action. |
| Fixture requirements | Same counts as H01; no mutation pending or error state. |
| Composition | Focus lower than H01 so the guest rows and check-in actions are the hero. |
| Proof | H05 must feel distinct from H01: H01 sells command, H05 sells door execution. |

### H06 - The Playbook

| Field | Production decision |
| --- | --- |
| Headline | **Let the Playbook work the room** |
| Support | Run prompts, pods, rotations, and private introductions. |
| Route | `hostAppEventManageScreen` / `/host/organizers/:clubId/events/:eventId/manage` |
| Source capture | Compare `host_manage_live_guided_rotations_assigned`, `host_manage_live_micro_pods_assigned`, and `host_manage_live_wingman_requests`. |
| Source status | Deterministic captures exist; choose one primary module and register it for marketing. |
| Required state | Live event with a single legible Playbook module, clear host action, and assigned guests or request count. |
| Fixture requirements | Assignments must use checked-in guests; opt-outs and group counts must remain coherent. |
| Composition | Show the module outcome and one host action. Avoid a configuration or loading state. |
| Proof | The differentiated facilitation system is visible without using internal terminology. |

### H07 - Host inbox

| Field | Production decision |
| --- | --- |
| Headline | **Keep every guest conversation together** |
| Support | Manage booked, prospective, and general inquiries. |
| Route | `hostInboxScreen` / `/host/inbox` |
| Source capture | Promote `host_inbox_queries`; compare with `host_inbox_prospective`. |
| Source status | Deterministic captures exist; marketing fixture registration is needed. |
| Required state | Event-scoped populated inbox with distinct status labels, recent previews, timestamps, and no unread-count inconsistency. |
| Fixture requirements | Conversations belong to the H01 event; message text is synthetic and contains no contact details. |
| Composition | Keep the event selector/context and at least three useful rows. Do not use an empty thread. |
| Proof | The Host app visibly owns pre-event and booked-guest communication. |

### H08 - Organizer outcomes

| Field | Production decision |
| --- | --- |
| Headline | **See what your events created** |
| Support | Review attendance, catches, matches, chats, reviews, and payouts. |
| Route | `hostOrganizersScreen` / `/host/organizers` Insights tab |
| Source capture | Promote `host_clubs_insights_report`; retain `host_post_event_report` for event-level reporting evidence. |
| Source status | Deterministic captures exist; choose a scroll position that shows outcome metrics rather than only the roster. |
| Required state | Populated organizer analytics with attendance, connection funnel, guest reviews, and a multi-event or event-level outcome summary. |
| Fixture requirements | Metrics must agree with the H01 roster and remain mathematically possible; no invented growth claims or percentages outside fixture data. |
| Composition | Show the connection funnel and review proof. Do not make a revenue total the primary visual. |
| Proof | The final frame shows why a host should run the next event on Catch. |

## Google Play Feature Graphics

The feature graphics are separate compositions, not collages of all eight
screenshots.

### Catch

- Message: **The event before the match.**
- Visual: one editorial event ticket or event-feed crop transitioning into one
  restrained mutual-match cue.
- Avoid profile-card grids that make the product look like a conventional
  swipe-first dating app.

### Catch Host

- Message: **Run the night. See what it created.**
- Visual: the live console as the central product surface, with restrained
  roster and report fragments as supporting layers.
- Avoid device silhouettes, account-setup UI, and performance numbers.

## Production Workflow

1. **Fixture lock**
   - Choose the shared India consumer and Host stories.
   - Add or extend fixture keys for the 10 concepts that are not already active
     marketing captures.
   - Validate all counts, dates, currencies, review eligibility, and relational
     identities.

2. **Raw capture lock**
   - Capture every selected route state without store chrome.
   - Add store-specific scroll positions only when the existing route capture
     does not place the proving UI above the fold.
   - Review phone and iPad layouts before composition begins.

3. **Composition prototype**
   - Produce C01-C03 and H01-H03 first.
   - Review the two first-three sequences at store-thumbnail size.
   - Lock headline scale, top copy region, UI crop, background, accent policy,
     and Google no-heavy-device-shell variant before composing the remaining 10.

4. **Full export**
   - Compose all 16 English concepts.
   - Export iPhone, iPad, and Play phone variants plus both feature graphics.
   - Strip alpha and validate dimensions, file type, orientation, and naming.

5. **Release-build parity**
   - Compare the raw capture source with the submitted TestFlight/internal-test
     build for every route.
   - Re-capture any state whose copy, component structure, navigation chrome, or
     visible capability differs.

6. **Upload and baseline**
   - Upload in the order defined here.
   - Record the exact asset hashes and store ordering in the role-specific asset
     manifests.
   - Establish the initial listing-conversion baseline before testing changes to
     the first three images.

## Naming Contract

Use stable, role-first names:

```text
catch-consumer-01-events-before-matches-iphone-6_9.png
catch-consumer-01-events-before-matches-ipad-13.png
catch-consumer-01-events-before-matches-play-phone.png
catch-host-01-live-console-iphone-6_9.png
catch-host-01-live-console-ipad-13.png
catch-host-01-live-console-play-phone.png
catch-consumer-play-feature-graphic.png
catch-host-play-feature-graphic.png
```

The sequence number is the upload order. A content revision retains the stable
concept id and updates the asset hash rather than inventing a new slot name.

## Acceptance Checklist

### Narrative

- [ ] C01-C03 independently explain events first, attendance-gated Catching, and
      the path to a match.
- [ ] H01-H03 independently explain live operations, guided publishing, and
      admission control.
- [ ] Every later frame adds a new reason to install; no two adjacent images
      repeat the same claim or crop.

### Product truth

- [ ] Every headline is visibly supported by the selected in-app state.
- [ ] Every person, event, organizer, review, message, payment, and metric is
      synthetic and internally coherent.
- [ ] No internal Event Success label, development banner, placeholder, loading
      state, failure state, or unsupported product claim appears.
- [ ] Screens match the release candidate for the relevant app role.

### Visual quality

- [ ] Headlines remain legible at store-thumbnail size.
- [ ] UI, sticky actions, status bars, device frames, and corner radii are not
      clipped or stretched.
- [ ] Apple, Play, and iPad variants preserve the same message while using the
      correct native layout and crop.
- [ ] C01-C08 and H01-H08 feel like two related but audience-specific campaigns.

### Technical delivery

- [ ] Eight ordered images exist for each app and required device surface.
- [ ] Apple and Play images contain no alpha channel.
- [ ] All pixel dimensions, aspect ratios, formats, and file sizes pass the
      current store checks.
- [ ] Play screenshots and feature graphics have concise alt text.
- [ ] Role-specific asset manifests contain final paths, hashes, dimensions,
      source capture ids, fixture keys, and upload order.
- [ ] The marketing capture and store-export checks pass before handoff.

## Current Asset Disposition

The three existing consumer marketing captures remain approved source seeds:
`member_event_discovery`, `post_run_catch_window`, and `match_chat_context`.

The existing five-image Catch Host App Store pack is a draft input, not a final
upload set:

- retain and refresh the admission, live-console, and reporting sources;
- replace the profile-setup opener and guest-directions image in the ordered
  listing;
- promote the live console to H01;
- extend the set from five to eight;
- revise the report crop to show outcomes rather than only roster rows; and
- remove the alpha channel from every final Apple export.
