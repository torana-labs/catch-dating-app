---
doc_id: ads_conversion_spec
owner: marketing_website
status: active
---

# Ads Conversion Spec

Catch acquisition uses one typed contract in
`website/src/analytics/catchMeasurement.ts`, integrated through the existing
`website/src/analytics.ts` consent and lifecycle owner. The fixed Google and Meta
adapters in `website/src/shared/analytics/catchProviders.ts` accept synthetic destinations only. The production
controller has no transport injected, so no browser tag loads; no provider,
credential, customer list, spend or policy change is enabled by default.
This document is the contract each change to that state must follow; the
`Status` column of the event map records what is wired today.

## Programmes and approved decisions

Paid acquisition runs two programmes on Meta and Google. The guest programme
optimises for a paid booking (`purchase`); the host programme optimises for a
qualified host (`organizer_activated`, first published event). The owner
approved these rules on 2026-11-17:

| Decision | Rule |
| --- | --- |
| Browser transport | First-party Google tag (`gtag.js`) and Meta Pixel (`fbevents.js`) loaded on the Catch web origin after marketing consent. The October 2026 preview iframe transport was superseded and removed on 18 November 2026. GTM stays out. |
| Consent | Browser tags need the website marketing choice. Server-side conversions and customer lists rely on the notice shown at checkout, account creation and Host setup, and on the privacy policy, with an ad-matching opt-out that stops both. |
| Purchase value | The ticket amount the guest paid, in INR, from the admitted payment record. |
| Ad policy | The post-event matching feature makes Catch a dating service under Meta's and Google's ad policies. Ads never mention matching until Meta's written permission and Google's dating certification are granted. |
| Spend | Test budget and launch cities are set in the ad accounts, not in code. |

Two rules from the host-only version stay in force for both programmes: no
matching, dating-interest, gender, age, photo, message or Cross Paths data
enters any advertising payload, and organiser-owned pixels stay disabled.

### Retired October 2026 pilot pieces

The owner approved removing the October 2026 pilot pipeline on 18 November
2026, because the decisions above supersede it. None of it ran in production:

- the preview iframe Google transport (`catchLiveTransport.ts`, the
  `catch-host-measurement` Hosting site and its runtime files), which ran only
  on one preview origin;
- the Host server permission handshake (`hostAcquisitionConsent` at
  `/api/host-acquisition-consent`, its `expireHostAcquisitionConsent` worker
  and the browser `hostMeasurement` packet), whose gate was off;
- the website `Lead` Meta dispatcher (`metaDispatcher.ts`), which was never
  exported, and the consent-bound `acquisitionAttribution` snapshot on Host
  intake.

The server queue under [Server delivery](#server-delivery) and the Meta lead
forms replace them. The consent banner, the closed campaign vocabulary and the
click-identifier capture in `catchMeasurement.ts` stay for the first-party
transport.

### Host app permission preparation

The Host app denies collection by default, disables automatic screen reporting
and advertising storage/signals, and drops generic/private events and user IDs.
A device-local, versioned choice expires after 30 days and is separate from
website consent. Settings provides equally available allow and off actions.
Storage failure, old consent, expiry and withdrawal cannot grant permission;
withdrawal immediately closes the local event boundary and resets SDK data.
Environment and source release gates still override a granted choice. Native
collection is deactivated in this prepared release, which also overrides prior
persisted SDK grants before Dart starts. Activation requires a reviewed new
binary removing that native hold and opening the Dart gate; native upgrade
and withdrawal network acceptance must pass first. iOS vendor-ID and Android
advertising-ID collection are disabled.

Only coarse sign-in, onboarding and Host setup events are allowed. Event
creation is not organiser activation. Creation and publication diagnostics follow successful server responses;
replayed publications and operations spanning a consent change are excluded.
The private first-real-check-in milestone is prepared in `pilotActivation.ts`.
Admin or Admin Owner confirms a real event through the audited event editor,
with revision checks rejecting stale saves. The canonical roster trigger checks
current review, published event, organiser and check-in together before creating
one private organiser receipt. Check-ins before review, cancelled/private events,
replayed roster updates and undone check-ins are excluded. This operational
receipt does not grant advertising permission or export guest data. Its deployed
trigger, live acceptance, native upgrade/network checks and app-store privacy
declarations still require completion before measurement activation.
The two private pilot collections participate in the existing Sales privacy
inventory. A permanent organiser restriction blocks both new reviews and
activation receipts after cleanup. Direct browser reads and writes stay denied.

### Google destinations

GA4 `G-HZFG0DL2DK` (property `559735544`) and Google Ads customer `1016806229`
are the Catch destinations. The accepted organiser lead action
`AW-18526407471/dUL7CNKBn6MdEK-WioJF` (conversion action `7858536658`) is
secondary, counts one conversion per click and has no assigned monetary value.
Account configuration is not proof of event receipt. On 2026-10-21 the Google
tag's user-provided data setting was off and enhanced measurement was off; the
first-party transport changes the first setting only when it ships.

### First-party browser transport

Not built yet. This is the approved design. One module under
`website/src/analytics/` will own both browser tags on the Catch web origin. It
will load `gtag.js` (GA4 `G-HZFG0DL2DK`, Ads customer `1016806229`) and
`fbevents.js` (dataset `1844810253539672`) only after a current marketing
choice, and GA4 alone for an analytics-only choice. Consent Mode defaults are
set before either script loads: all four purposes denied, then updated from the
receipt. Google's user-provided data setting and Meta advanced matching will be
on, fed only with the hashed phone and email of a booker or signed-in user on
the confirmation page.

The module will map the closed event allowlist below to each tag; it never
reads or replays the diagnostic `dataLayer` bus. Withdrawal or downgrade stops
both tags immediately, revokes Consent Mode purposes and clears the Catch-owned
`_fbp`, `_fbc` and Google cookies it set. Requests already sent cannot be
retracted. It is injected into the measurement controller in `analytics.ts` and
adds its own measurement mode in `catchMeasurement.ts`.

## Boundary and current delivery

The local `dataLayer` is a compatibility diagnostic bus, not an advertising export.
Do not attach GTM to it or forward/replay it: it contains local search, city,
raw CTA, claim and review diagnostics that are outside the outbound contract.
The build takes no tag manager container id. No code path loads or calls a tag
today; once it ships, only the first-party transport module calls `gtag` or
`fbq`.

Catch-owned acquisition and organizer-owned public-page tracking are separate.
Organizer publication remains hard-disabled with false/null public settings;
its existing controlled adapters, authority checks and server contracts are
unchanged. First-party organizer reporting still requires analytics consent.
Public event pages, the public booking flow and the booking confirmation page
are acquisition routes for the guest programme. Private forms, offers, OTP,
profiles, matching, Cross Paths, messaging and Host workspace routes never
authorize Catch advertising. App observability and warehouse reporting are
separate sources, not inputs to the browser adapters.

## Version 2 outbound event map

Each event has a fixed name and a rebuilt parameter allowlist. Browser events
need the matching consent purpose; server events follow the server delivery
rules below. A server event and its browser twin share one opaque event ID so
each platform counts it once. Diagnostic and start signals are not optimisation
outcomes.

| Contract event | GA4 name | Meta name | Google Ads outcome | Sent from | Authoritative source | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `page_view` | `page_view` | `PageView` | No | Browser | Allowlisted acquisition SPA visit; one per lifecycle visit; first consent starts the current visit without replaying earlier pages. | Contract only (no transport) |
| `cta_click` | `cta_click` | `CatchCtaClick` | No | Browser | Existing shared CTA helper; only a same-origin, allowlisted destination. Label and raw URL stay local. | Contract only (no transport) |
| `acquisition_start` | `acquisition_start` | `CatchAcquisitionStart` | No | Browser | First form interaction in member waitlist, host lead or host operating application; first explicit claim lookup or selection, or the first code, review or review-request action in the claim panel (once per claim page). | Contract only (no transport) |
| `lead_accepted` | `generate_lead` | `Lead` | Secondary, organizer only | Browser | Validated successful `/api/join-waitlist` response with `ok: true`, authoritative `hostLead.isNew: true` with a stable server event ID, and unchanged submission-time permission. Member waitlist compatibility still uses `alreadyJoined: false`. | Contract only (no transport) |
| `event_viewed` | `view_item` | `ViewContent` | No | Browser | Public event page rendered for a published, public event; parameters are the opaque event ID, category, market and ticket price. | Unwired |
| `checkout_started` | `begin_checkout` | `InitiateCheckout` | Interim primary while purchase volume is low | Browser | Checkout opened for a paid public event after the server created the order; value is ticket price times seats. | Unwired |
| `purchase` | `purchase` | `Purchase` | Primary, guest | Server, with browser twin | `finalizePublicPayment` admits a paid seat: positive INR amount, the `publicEventPayments` ID as event and transaction ID. Pending, failed, refunded and free outcomes are rejected. | Unwired |
| `free_registration` | `sign_up` (`method: event_rsvp`) | `CompleteRegistration` | No | Server, with browser twin | A free public registration is admitted. | Unwired |
| `organizer_signup` | `sign_up` | `CompleteRegistration` | Secondary, organizer (action 7906745506) | Server | `organizerGrowthFacts.milestones.claimedAt` is first set for an owned organizer (`userCreated`, `claimed` or `transferred`), dated within the last seven days; programmatic, synthetic and demo organizers are rejected. | Wired (delivery off by default) |
| `claim_approved` | `claim_approved` | `CatchClaimApproved` | No | Server | Canonical claim decision with `status: approved`; pending submission is rejected. | Unwired |
| `organizer_qualified` | `organizer_qualified` | `QualifiedHost` | Primary, organizer (action 7906748544) | Server | `organizerGrowthFacts.milestones.firstEventAt` (the organizer's first event to take a booking) is first set for an owned organizer whose start is no more than 30 days past. A draft or event-created click is rejected. | Wired (delivery off by default) |
| `organizer_activated` | `organizer_activated` | `CatchOrganizerActivated` | No | Server | First published non-test event with a successful real check-in (`hostOrganizerActivations`); a quality signal for reporting and audiences. | Unwired |
| `organizer_first_paid_booking` | `organizer_first_paid_booking` | `FirstPaidBooking` | No | Server | `organizerGrowthFacts.milestones.firstPaidBookingAt` is first set. | Unwired |

`purchase` was previously reserved for a settled organizer payment to Catch.
Organiser billing is not an acquisition outcome and is no longer in this map.

`host_lead`, `host_application` and `claim` belong to organizer acquisition;
event, booking and confirmation routes belong to guest acquisition. Every event
carries `content_category` (`guest` or `host`) so audiences and reports stay
separate inside one dataset. No app profile, matching, singles/dating interest,
gender or age data enters this contract. Attendance may select people for a
customer list (for example repeat attendees) but is never an event parameter.
App-side conversion inventories from older versions of this document were
planning proposals and are not an approved advertising export.

## Server delivery

One server queue sends every server event in the map to Meta's Conversions API
and to Google through the Data Manager API (the Google Ads API no longer accepts
new offline-conversion integrations). It replaced the retired website `Lead`
dispatcher: a trigger on the authoritative record writes one pending delivery per destination, keyed by the event ID, and a
scheduled worker sends it with bounded retries and an age limit, recording the
provider response. An HTTP 200 alone does not confirm receipt.

Each delivery carries the event name, event time, event ID, value and currency
where the map gives one, the canonical page URL, and the click context saved
with the authoritative record: `gclid`, `gbraid`, `wbraid`, `fbc`, `fbp`, client
IP address and user agent. Matching keys are normalised and SHA-256 hashed on the
server before they leave it: phone in E.164, email when present, first name,
city and country `in`. Raw contact details never leave the server.

A delivery is created only when the person has not opted out of ad matching and
the account is not deleted or restricted. Opt-out or deletion cancels pending
deliveries; requests already accepted by a provider cannot be retracted.
Credentials are dedicated Catch identities held in Secret Manager; shared
business identities are unsuitable.

The queue lives in `functions/src/acquisition/adConversions/`: the
`onAdConversionGrowthFactsWritten` trigger enqueues host conversions into
`adConversionDeliveries`, and the `sendAdConversions` worker sends them every
five minutes. `AD_CONVERSIONS_MODE` controls both: `off` (the default, and the
setting in dev and staging) enqueues and sends nothing; `validate` sends Meta
test events, only when `AD_CONVERSIONS_META_TEST_EVENT_CODE` is set, and
Google validate-only requests, and leaves records pending; `live` records real
conversions. The Meta token is read at send time from the pinned version in
`AD_CONVERSIONS_META_TOKEN_VERSION` (the CatchAds system user); Google uploads
act as the service account in `AD_CONVERSIONS_GOOGLE_SERVICE_ACCOUNT`, so no
credential is bound to a deployed Function. Host milestones happen in the Host
app and on the server, so Meta receives them as `system_generated` events
matched on hashed phone, email and a namespaced organizer ID; Google receives
them as enhanced conversions for leads on `UPLOAD_CLICKS` actions. Records are
cancelled when the owner's account is deleted or the event is older than seven
days, and retried with backoff up to five attempts, since both platforms
deduplicate on the event ID.

## Meta host lead forms

Host campaigns on Meta use instant lead forms. `metaLeadgenWebhook` answers
Meta's verify handshake and checks `X-Hub-Signature-256` with the app secret,
then files each `leadgen` change as a `metaLeadgenEvents/{leadgenId}` receipt,
so redeliveries are no-ops. `onMetaLeadgenEventCreated` fetches the lead with
the CatchAds token (it needs `leads_retrieval` and the page's lead access) and
files it as a `salesInboundIntents` record with `source: meta_lead_ad`,
`status: needs_identity_review` and a `metaLead` block naming the lead, form,
ad and campaign. The webhook stays closed (503) until
`META_LEADGEN_CREDENTIAL_VERSION` pins `CATCH_META_LEADGEN_WEBHOOK`, a JSON
secret holding the Meta app secret and the verify token, and only pages in
`META_LEADGEN_PAGE_IDS` are taken. Receipts
keep only hashed phone and email, for 180 days; the lead's answers live on the
sales intent under existing Sales privacy rules. An organizer created from such
an intent counts as the `ads` channel (`meta_lead_ads`).

When a host who came from a lead form signs up or qualifies, the queued Meta
event carries the matched lead (hashed phone, then email) as `user_data.lead_id`
with `custom_data.event_source: crm` and `lead_event_source: Catch`, which makes
it a conversion-leads CRM stage Meta can optimise lead campaigns on. Meta's
conversion-leads setup also asks for the initial lead stage; sending that stage
is not built yet.

The forms and campaigns themselves are code: `tool/ads/meta_campaigns.json`,
applied by `node tool/ads/apply_meta_campaigns.mjs` (plan) and `--apply`
(create). The tool creates every campaign, ad set and ad PAUSED, and the owner
enables them in Ads Manager. A form may only ask the standard questions and the
custom keys `onMetaLeadgenEventCreated` reads (`club_name`, `instagram_handle`,
`event_cadence`), so no answer is dropped on the way to Sales; choice answers
reach the intent as their option keys (`every_week`). Meta forms cannot be
edited and archived names stay taken, so a copy change is a new form version.
Images are the Host store-listing screenshots, cropped to 4:5.

## Customer lists

A scheduled uploader may share hashed contact lists with Meta (custom audiences)
and Google (Customer Match): paid bookers with their booking value, repeat
attendees, active hosts and unqualified host leads, used as lookalike seeds and
exclusions. Every upload drops deleted, restricted, under-18, staff, test and
opted-out accounts, and a later upload removes anyone who opted out or deleted
since the previous one, within seven days at most.

## Consent and lifecycle

The persistent `catch_marketing_consent_v4` receipt records version 4, choice,
analytics/marketing booleans, update time and the measurement mode (`disabled`
until a transport ships). A mode change requires a fresh choice; permission
chosen while integrations were disabled cannot silently activate providers. The banner offers essential only,
analytics, and explicit analytics plus marketing, with a persistent Privacy choices
control for withdrawal. Advertising remains disabled regardless of the choice
until the first-party transport ships with its own measurement mode; under the
mode-change rule every earlier choice then needs a fresh one, so no choice made
while advertising was disabled can switch the tags on.
Legacy version-1, version-2 and version-3 choices, including `accepted`, can retain local
analytics permission but never authorize the live transport or marketing;
the banner requires a fresh choice.
Malformed or unknown versioned receipts fail closed.

### Ad-matching notice and opt-out

Server events and customer lists do not depend on the browser banner. They rely
on a short notice, linked to the privacy policy, shown where the person gives the
data: the public checkout, app account creation and Host setup. The privacy
policy names Google and Meta, what is shared, the hashing, and how to opt out.

The opt-out is one record per person. Signed-in users store it on their account;
guests who booked without an account are keyed by the SHA-256 hash of their E.164
phone, so a request by email or phone covers past and future bookings. The
server delivery queue and the customer-list uploader read this record before
every send. Account deletion counts as an opt-out.

Unset/essential permission starts no measurement session. Analytics alone allows
synthetic Google analysis with advertising denied. Explicit marketing permits
synthetic organizer Google Ads and Meta events. Revocation/downgrade destroys
sessions immediately. Sibling-tab receipt changes refresh the banner and controller.
Every SPA lifecycle update runs the shutdown check, including entry into private
routes; returns to an acquisition route create a new visit without replaying old
views. First analytics consent starts a current-page view, not historical replay. Events before consent and failed delivery are dropped, not queued.

An accepted lead uses the permission captured when that request began. Accepting
mid-request cannot convert earlier activity; revoke/reaccept invalidates the old
receipt even within the same millisecond. The historical HTTP consent remains analytics-only. Its
historical `marketingAnalytics.consent` is not a versioned server advertising
permission, and a Host submission carries no advertising packet.

Consent Mode compatibility records stay local. Before any real Google transport,
review and apply default/update semantics for `analytics_storage`, `ad_storage`,
`ad_user_data`, and `ad_personalization` on that controlled destination, including
deny/revoke and signals/personalization behavior. Existing organizer GA4's denied
storage/signals behavior does not establish remarketing readiness. Google's
[consent implementation guide](https://developers.google.com/tag-platform/security/guides/consent)
requires consent defaults before measurement and updates when choices change.

## Payload and attribution

Only exact acquisition routes in `acquisitionRoute` qualify, including `/claim`
and `/claim/`; dynamic `/claim/:id`, organizer detail, form, offer, private Host
work and demo routes fail closed. The guest programme adds public event detail,
the public booking flow and its confirmation page to the allowlist. Page location uses the fixed Catch
origin, route name is a closed enum, and title is fixed to Catch. Referrer is
omitted. Search/hash, arbitrary hosts, CTA text, proof URLs, names, raw email or phone,
private answers, reviews, guest lists, organizer/request IDs and sensitive dating
attributes are never outbound parameters; hashed matching keys travel only in the
dedicated matching fields described under server delivery. Receipt IDs must be opaque generated
measurement IDs, not business identifiers. Purchase amount/currency are accepted
only from the admitted payment record.

Click identifiers and approved campaign labels are captured on every
acquisition route, not only Host routes, and travel with the checkout request so
the admitted payment record holds them. Server delivery reads them from that
record, never from the browser after the fact.

Campaign retention uses first-party local storage, expires after 30 days and clears on denial or
entry into an unapproved route. Only the closed, reviewed source/medium/campaign/
content vocabularies in `approvedCampaignLabels` persist in the existing HTTP
attribution payload; unknown labels and search terms are discarded. Separately,
`catchMeasurement.ts` owns the browser-only identifier context under a fresh
version-4 choice. Click identifiers are excluded for analytics-only choices,
clear on a changed consent revision/private route, and never enter the diagnostic
bus or existing lead HTTP payload. Storage failures drop the context. Host-to-`/claim` retains the approved touch.
New campaigns require a reviewed vocabulary change. There is no URL-passthrough
or cross-device implementation. Deterministic tests are acceptance steps, not
proof of a paid click being attributed.

### Host intake attribution

Host intake no longer writes `salesInboundIntents.acquisitionAttribution`: the
consent-bound snapshot was retired with the server permission handshake, whose
gate was off. Reports that read the field (`organizerGrowthFacts`) treat a
missing snapshot as unassigned; do not backfill it from the waitlist row or a
consumer conversion record. The legacy mutable waitlist attribution field is
null for Host submissions; consumer handling is unchanged.

### Host response calendar

The approved response calendar is Monday-Saturday, 09:00-18:00 Asia/Kolkata,
excluding Sundays only. One business day means nine working hours from the
accepted application receipt; outside-hours time is paused. For example, a
Saturday 17:00 application is due Monday 17:00, and a Sunday application is due
Monday 18:00. Public holidays are not silently excluded. The deterministic
`hostResponseDueAt` helper calculates this deadline without using the server's
local timezone. An automatic operator email, delivery receipt or stage change
does not establish a human response. Authoritative response capture and report
integration remain pending; this helper alone enables no SLA reporting or sends.

## Outcome deduplication

Waitlist and host application controllers call `trackAcceptedMarketingLead` only
after a parsed HTTP success. Local form-specific successes and `generate_lead`
remain compatible but cannot enter the outbound adapters. The outbound contract
maps one `lead_accepted` to one `generate_lead` per destination. Host acquisition uses the backend `hostLead` receipt independently of the email-level
`alreadyJoined` flag: a prior attendee may make their first Host enquiry. The receipt
is written atomically with the private Sales intent and retained on the waitlist
record; exact request retries return the same receipt, while later submissions
retain the ID with `isNew: false`. Existing Host roles and legacy Host intents are
not reclassified as new acquisition. A legacy response without a receipt cannot
authorise a Host conversion. Host application retries
retain their request event ID and submission permission.
The waitlist controller also suppresses success measurements when its submitted
honeypot is populated: the server deliberately returns an opaque success without
storing those submissions. The Host operating application always submits an empty
honeypot.

A receipt ID is consumed once across business event names; purchase also consumes
its transaction ID. The tab-local bounded dedupe set is never cleared to replay
old conversions. It drops additional identified events if full. It is not a
server idempotency store. Cross-device and browser/server dedupe come from the
server delivery queue: one event ID per authoritative record, shared with the
browser twin, and one delivery per destination keyed by that ID.

## Verification and separate activation approvals

The focused suites exercise consent accept/deny/revoke, legacy isolation,
submission-time permission, private-route shutdown, SPA returns, `/claim`
continuity, closed labels and payloads, one outcome across aliases, new-account
versus sign-in, approval versus pending, attendee separation, provider failures
and settled purchase semantics. Consent UI also needs rendered mobile/desktop,
theme and large-text checks, plus the applicable registered website checks and
final-tree generators.

The owner approved the destinations (GA4 property 559735544, Ads customer
1016806229, Meta dataset 1844810253539672), the first-party transport, the
consent and opt-out model, the eligible routes and the event map above on
2026-11-17. Each destination is switched on only after a synthetic staging run
shows provider receipt (Meta Test Events, Google conversion diagnostics),
consent changes, URL/title/referrer isolation, SPA shutdown, dedupe and the exact
network payloads. GTM stays out; nothing may consume the existing bus
wholesale. Organizer pixels require their own publication and policy approval
and stay disabled.

Authorities each server event needs: admitted payment (`finalizePublicPayment`),
admitted free registration, organizer creation receipt, approved claim receipt,
the growth-fact milestones and the first real check-in receipt. Wire only those
authorities; do not infer them from login, pending claims, form success or a
payment page.

## GA4 organiser key event

Property 559735544 defines `host_lead_accepted` from `generate_lead` with
`audience = organizer`, copying the source parameters. It counts once per event,
without a default monetary value. The source suppresses repeated Host acquisitions using server receipts. This Analytics key event is not imported as a second Ads
conversion: the prepared direct Ads action remains the sole candidate to avoid
double-counting. Sales qualification and pilot activation are later outcomes.
