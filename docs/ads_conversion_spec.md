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
controller has a disabled configured transport; no provider, credentials, tag,
customer list, spend, policy change, or backend deployment is enabled by default.
This document is the contract each change to that state must follow; the
`Status` column of the event map records what is wired today.

## Programmes and approved decisions

Paid acquisition runs two programmes on Meta and Google. The guest programme
optimises for a paid booking (`purchase`); the host programme optimises for a
qualified host (`organizer_activated`, first published event). The owner
approved these rules on 2026-11-17:

| Decision | Rule |
| --- | --- |
| Browser transport | First-party Google tag (`gtag.js`) and Meta Pixel (`fbevents.js`) loaded on the Catch web origin after marketing consent. The preview iframe transport in `catchLiveTransport.ts` is superseded and is removed when the first-party transport ships. GTM stays out. |
| Consent | Browser tags need the website marketing choice. Server-side conversions and customer lists rely on the notice shown at checkout, account creation and Host setup, and on the privacy policy, with an ad-matching opt-out that stops both. |
| Purchase value | The ticket amount the guest paid, in INR, from the admitted payment record. |
| Ad policy | The post-event matching feature makes Catch a dating service under Meta's and Google's ad policies. Ads never mention matching until Meta's written permission and Google's dating certification are granted. |
| Spend | Test budget and launch cities are set in the ad accounts, not in code. |

Two rules from the host-only version stay in force for both programmes: no
matching, dating-interest, gender, age, photo, message or Cross Paths data
enters any advertising payload, and organiser-owned pixels stay disabled.

### Host server permission preparation

`functions/src/acquisition/consentHttp.ts` owns the separate
`/api/host-acquisition-consent` grant/withdrawal handshake. Its activation gate
is off. A new versioned purpose, a 32-byte random capability and a recent choice
are required; old intake analytics fields do not authorize server advertising.
Only a domain-separated capability hash is stored. Consent expires 30 days
after the original choice, and an exact retry cannot extend that expiry.
Withdrawal creates an irreversible tombstone for that capability, including
when it arrives before a delayed grant. Fresh permission uses a new capability.
The expiry worker transactionally rechecks at most 500 records every 15 minutes;
withdrawal tombstones outlive the grant and delivery windows.

The Meta policy prepares only a website `Lead` with the accepted Host receipt,
a canonical application URL, a hashed random browser identifier, browser user
agent and an optional real consented click. Contact details, answers, account
identifiers and guest information are excluded. Dispatch requires current
permission, at most five attempts and an age below 24 hours. Uncertain provider
outcomes are held for reconciliation. An HTTP 200 alone does not confirm receipt.
The accepting intake transaction can prepare a private delivery only for a new
Host receipt and current server advertising permission; the source gate remains
off. The worker reserves one attempt, rechecks the original Sales intent and
current permission immediately before dispatch, and clears browser context on
terminal outcomes. Withdrawal or deletion cannot retract a request already
sent to the provider. Explicit throttling may retry with backoff, up to five
attempts within 24 hours; timeouts and interrupted sends remain uncertain.
The expiry worker removes at most 500 expired delivery records per run.

The browser permission owner immediately stops local use on a changed choice,
persists pending withdrawal across reload, and will not grant fresh permission
until that withdrawal is acknowledged. It never queues conversion events.
The owner is connected to the browser consent and submission lifecycle. Its
separate activation mode invalidates prior Google-only choices. Only an
acknowledged current advertising grant can add the closed measurement packet to
a Host submission. Attribution retains the actual first observation time of a
Meta click; revisiting a URL does not refresh that click's timestamp.
Withdrawal clears queued browser context in bounded transactions.

`metaSender.ts` prepares a fixed Graph v26.0 Catch pixel endpoint, a ten-second
timeout, no redirects, no automatic network retry, and a bounded response body.
The disabled scheduled dispatcher examines at most 20 due entries per minute,
with current authority rechecked for each row. Its due-work index, exported
deployment binding, approved server credential and real destination receipt
remain unfinished; this is not a deployed delivery service. The future credential is declared
under the explicit `host-acquisition-meta` readiness capability while the
dispatcher is unexported. A later export must add its exact Function consumer
to the readiness requirement and pass source-bound credential checks before
release; ordinary current Function deployments do not request this credential.

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

### Catch Host pilot destination configuration

This section describes the preview transport that the first-party transport
(next section) replaces. It stays accurate until that change removes the files
it names.

`analytics/catchLiveTransport.ts` owns the prepared, default-disabled Google
transport. Its fixed destinations are GA4 `G-HZFG0DL2DK` (property
`559735544`) and Ads `AW-18526407471/dUL7CNKBn6MdEK-WioJF` (customer
`1016806229`, conversion action `7858536658`, accepted organiser lead).
The Ads action is secondary, counts one conversion per click, and has no
assigned monetary lead value. Account configuration is not proof of event receipt.

The preview runtime is hosted separately at `https://catch-host-measurement.web.app`
with `allow-scripts allow-same-origin` and `no-referrer`. Its actual origin and
exact preview parent are checked before initialization. Cross-origin browser
isolation prevents parent DOM, storage and diagnostic-bus access; this runtime
must never be served from the Catch application origin. The old opaque sandbox
blocked Google's own cookie-access check, aborting collection despite a successful
script load and correctly queued events.

`website/measurement-hosting.json` publishes only the two static files in
`website/measurement-runtime/` to the dedicated site. Its CSP permits the fixed
Google script and Analytics collection endpoints, and only the reviewed preview
parent may embed it. There are no rewrites, application APIs, credentials or
production parent permission. No arbitrary preview host, localhost or query flag
can activate the transport. The approved empty site was created and read back on
2026-10-21. Exact-source content deployment and provider receipt remain pending;
configuration in Git is not a deployed Hosting release.

The runtime loads Google's SDK only after a validated analytics event and supplies
canonical page context, a closed parameter projection, a random consented client
ID and session ID. Automatic views, Google signals, ad personalization and URL
passthrough are disabled. All advertising consent purposes stay denied, including
when a caller supplies marketing permission. Preview sends no Ads conversion or
click identifiers. GA4 events carry `debug_mode: true` and `traffic_type: internal`.
Only the four currently wired events are accepted; accepted leads are deduplicated
by their opaque server receipt. Account-side derived events require separate audit.

Google's own `catch_host`-prefixed cookies use host-only scope, Secure and
SameSite=None. Their maximum lifetime is the remaining portion of the original
random client ID's 30-day lifetime, with cookie refresh disabled. They cannot read
or write Catch-site cookies. A fresh `google-preview-v2` consent choice is required;
v1 or disabled-mode choices cannot silently authorize this repair. Browser privacy
settings may suppress third-party cookies or requests; do not bypass that choice.

On withdrawal, downgrade or lifecycle shutdown, the parent stops accepting events
and discards its bounded startup queue. A channel- and origin-checked stop message
disables the destination, tightens the frame CSP to block further networking and
clears owned cookies before acknowledging frame removal. A one-second fallback
removes an unresponsive frame; in that exceptional case cookie deletion is not
confirmed and the fixed expiry remains the backstop. Already sent requests cannot
be retracted. Initialization also clears previous SDK cookies, and pagehide performs
cleanup. Sibling frames share this dedicated cookie origin; their event identities
remain supplied by the separate consent owner, never inferred from SDK cookies.

The first-party browser context is Host-scoped for at most 30 days and is created
only when the transport is enabled and a fresh version-4 choice permits analytics.
The random session ID rotates after 30 minutes of inactivity; client and campaign
context have a fixed 30-day lifetime. The prepared context can retain validated
click identifiers with marketing permission, but this preview runtime never sends
them. Closed GA4 campaign labels map to campaign_source/medium/name/content.
Production Google and Meta transports remain disabled.

Real Chromium testing of the replacement source with collection intercepted
verified page views, one accepted-lead event, parent isolation, private canary
exclusion, bounded Secure cookies and acknowledged withdrawal with zero remaining
cookies or subsequent requests. This proves browser behavior, not Google receipt.
A browser privacy-toggle experiment did not actually suppress cookies and is not
blocked-cookie compatibility proof. Safari/native/browser privacy acceptance,
real deployed preview receipt and live ad-click attribution remain open. On
2026-10-21, the Google tag's Allow user-provided data capabilities setting was
disabled and its saved off state independently reopened; enhanced measurement
was also observed off. Do not enable automated bidding or claim
campaign attribution from a form response or intercepted request. Production
activation requires separate permission, refreshed copy and consent, exact-source
deployment and live acceptance. Ad launch remains a separate approval.

### First-party browser transport

One module under `website/src/analytics/` owns both browser tags on the Catch
web origin. It loads `gtag.js` (GA4 `G-HZFG0DL2DK`, Ads customer `1016806229`)
and `fbevents.js` (dataset `1844810253539672`) only after a current marketing
choice, and loads GA4 alone for an analytics-only choice. Consent Mode defaults
are set before either script loads: all four purposes denied, then updated from
the receipt. Google's user-provided data setting and Meta advanced matching are
on, fed only with the hashed phone and email of a booker or signed-in user on the
confirmation page.

The module maps the closed event allowlist below to each tag; it never reads or
replays the diagnostic `dataLayer` bus. Withdrawal or downgrade stops both tags
immediately, revokes Consent Mode purposes and clears the Catch-owned `_fbp`,
`_fbc` and Google cookies it set. Requests already sent cannot be retracted.

## Boundary and current delivery

The local `dataLayer` is a compatibility diagnostic bus, not an advertising export.
Do not attach GTM to it or forward/replay it: it contains local search, city,
raw CTA, claim and review diagnostics that are outside the outbound contract.
`VITE_GTM_ID`, including the historical GTM-K7KLNQXP fallback, cannot load a tag.
Only the first-party transport module calls `gtag` or `fbq`; no other code path
loads or calls a tag.

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
| `page_view` | `page_view` | `PageView` | No | Browser | Allowlisted acquisition SPA visit; one per lifecycle visit; first consent starts the current visit without replaying earlier pages. | Wired (preview transport) |
| `cta_click` | `cta_click` | `CatchCtaClick` | No | Browser | Existing shared CTA helper; only a same-origin, allowlisted destination. Label and raw URL stay local. | Wired (preview transport) |
| `acquisition_start` | `acquisition_start` | `CatchAcquisitionStart` | No | Browser | First form interaction in member waitlist, host lead or host operating application; first explicit claim lookup or selection, or the first code, review or review-request action in the claim panel (once per claim page). | Wired (preview transport) |
| `lead_accepted` | `generate_lead` | `Lead` | Secondary, organizer only | Browser and server | Validated successful `/api/join-waitlist` response with `ok: true`, authoritative `hostLead.isNew: true` with a stable server event ID, and unchanged submission-time permission. Member waitlist compatibility still uses `alreadyJoined: false`. | Wired (browser preview; server gated off) |
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
new offline-conversion integrations). It generalises the existing
`functions/src/acquisition/metaDispatcher.ts`: a trigger on the authoritative
record writes one pending delivery per destination, keyed by the event ID, and a
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

## Customer lists

A scheduled uploader may share hashed contact lists with Meta (custom audiences)
and Google (Customer Match): paid bookers with their booking value, repeat
attendees, active hosts and unqualified host leads, used as lookalike seeds and
exclusions. Every upload drops deleted, restricted, under-18, staff, test and
opted-out accounts, and a later upload removes anyone who opted out or deleted
since the previous one, within seven days at most.

## Consent and lifecycle

The persistent `catch_marketing_consent_v4` receipt records version 4, choice,
analytics/marketing booleans, update time and the measurement mode (disabled,
Google preview, Google live or Host server live). A mode change requires a fresh choice; permission
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
permission. The prepared, disabled `hostMeasurement` packet uses the separate versioned
server permission handshake described above.

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
New campaigns require a reviewed vocabulary change. There is no URL-passthrough, customer-matching, cross-device implementation or
deployed Meta delivery. The versioned server handoff is prepared and disabled. The preview and deterministic tests are acceptance
steps, not proof of a paid click being attributed.

The prepared dispatcher reads at most 20 pending/sending records through the
`hostAcquisitionDeliveries` status/nextAttemptAt composite index. Deploy and
verify this index before exporting the scheduled dispatcher. Its runtime secret,
`CATCH_HOST_META_CONVERSIONS_TOKEN`, must belong to a dedicated Catch identity;
shared business conversion identities are unsuitable. The dispatcher remains
unexported and both server measurement and Meta delivery gates remain false
until credential access, synthetic provider acceptance and activation receive
their separate reviews. Index source alone does not establish readiness.

### Receipt-bound first-party reporting

Host intake prepares `salesInboundIntents.acquisitionAttribution` only for a
new authoritative Host receipt when the disabled server-measurement gate is
explicitly enabled and the same transaction reads current analytics permission.
It keeps allowlisted campaign labels, exact acquisition paths and touch times;
URLs, referrers, search terms, click identifiers and contact data are discarded.
Touches must follow that consent choice, precede acceptance and fall inside
30 days. Expiry remains the original consent expiry and cannot be renewed by a
submission or replay. Advertising permission is not required for this private
analytics snapshot and is never inferred from it.

The legacy mutable waitlist attribution field is null for Host submissions;
consumer handling is unchanged. Exact replay returns before a write and later
Host submissions cannot replace the original new-receipt snapshot. Historical
records without a valid snapshot stay unassigned; do not backfill from the
current waitlist row or an earlier consumer conversion record.

Withdrawal and scheduled expiry clear only this optional attribution field in
bounded, transactionally rechecked batches. Operational application history is
preserved. The withdrawal request clears one batch of at most 500 snapshots;
its tombstone records `attributionCleanupPending` until the 15-minute expiry
worker drains the remainder, one bounded batch per run, well before snapshot
expiry. A revoked capability cannot create new snapshots, so a short final
page lets the worker clear that flag under a transactional recheck. Existing Sales privacy deletion removes the containing intent.
Any report reader must check current consent, snapshot expiry and current Sales
privacy restrictions before using a snapshot; cleanup completion is not an
authorization signal. Cohort joins and qualification/response history remain
separate implementation work. This capture preparation enables no collection,
provider delivery, reporting endpoint or production measurement.

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
network payloads. GTM is optional only if a controlled integration needs it; it
must never consume the existing bus wholesale. Organizer pixels require their
own publication and policy approval and stay disabled.

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
