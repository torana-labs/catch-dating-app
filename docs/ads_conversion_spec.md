---
doc_id: ads_conversion_spec
owner: marketing_website
status: active
---

# Ads Conversion Spec

Catch acquisition in the browser runs through `website/src/analytics.ts`, the
consent and lifecycle owner, and `website/src/analytics/adTags.ts`, the only
code that loads or calls the first-party Google tag and Meta Pixel (see
[First-party browser transport](#first-party-browser-transport)). Public page
classes, consent versions and click-identifier capture live in
`website/src/analytics/catchMeasurement.ts`. The older host-only contract in the
same file (`createCatchMeasurementController`, with the synthetic adapters in
`website/src/shared/analytics/catchProviders.ts`) still has no transport and
sends nothing. Server delivery, customer lists, spend and policy changes are
off by default. This document is the contract each change to that state must
follow; the `Status` column of the event map records what is wired today.

## Programmes and approved decisions

Paid acquisition runs two programmes on Meta and Google. The guest programme
optimises for a paid booking (`purchase`); the host programme optimises for a
qualified host (`organizer_activated`, first published event). The owner
approved these rules on 2026-11-17:

| Decision | Rule |
| --- | --- |
| Browser transport | First-party Google tag (`gtag.js`) and Meta Pixel (`fbevents.js`) loaded on the Catch web origin after marketing consent. The October 2026 preview iframe transport was superseded and removed on 18 November 2026. GTM stays out. |
| Consent | Browser ad tags need the website marketing choice; the analytics choice loads Google Analytics alone, with ad signals denied. Server-side conversions and customer lists rely on the privacy policy's advertising section, linked from the one terms and privacy line where people give their details (no per-form notice), with an ad-matching opt-out that stops both. |
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

GA4 `G-HZFG0DL2DK` (property `559735544`), Google Ads customer `1016806229`
through the Google tag `AW-18526407471`, and Meta dataset `1844810253539672` are
the Catch destinations. The host website-lead conversion
`AW-18526407471/WgIECMue97odEK-WioJF` (conversion action `7908216651`, created
18 November 2026) is secondary. The website sends it once per accepted host
enquiry, with the lead receipt as transaction id. It replaces the earlier
organiser lead action, which was removed from the account.
Account configuration is not proof of event receipt. On 2026-10-21 the Google
tag's user-provided data setting was off and enhanced measurement was off. The
transport sends the typed number (and email, when a form asks for one) with the
host lead conversion as `user_data`, so Google's enhanced conversions for leads
can match the later server-uploaded qualified-host conversion to the ad click.
Google uses that data only after the owner turns on user-provided data
collection, set to code rather than automatic form detection, for the tag in
Google Ads. Keep enhanced measurement off: its automatic page-change, scroll
and form events would bypass the transport's page rules.

### First-party browser transport

Built on 18 November 2026 in `website/src/analytics/adTags.ts`, which holds the
four destination IDs above. `analytics.ts` calls it on every page lifecycle
update and consent change; it is not injected into the host-only controller.

- **What loads when.** Tags load once, only on a public page (see
  [Payload and attribution](#payload-and-attribution)) of the production site
  (`brand.web.domain` and its `www` host), under a current version-7 choice.
  The analytics choice loads `gtag.js` (on its own data layer `catchTagLayer`)
  with GA4 only, plus Microsoft Clarity once its project id is set in
  `catchAdDestinations` (analytics storage granted, ad storage denied, every
  site form masked with `data-clarity-mask`, paused while a private surface
  is open). The marketing choice adds the Ads tag to it and loads
  `fbevents.js`. Essential loads nothing, and nothing loads on dev or
  preview hosts. There is no GTM.
- **Consent.** Before any script runs, Consent Mode defaults deny all four
  purposes. The analytics choice grants `analytics_storage` only; the
  marketing choice also grants `ad_storage` and `ad_user_data`.
  `ad_personalization` stays denied, as do Google signals and ad
  personalisation signals. Meta gets `fbq('consent', 'grant')` before `init`.
  A downgrade to analytics denies the ad signals again, revokes the Pixel and
  removes the ad cookies; withdrawing everything also removes the GA4 cookies.
  Google cookies last 30 days and are `Secure`. Under analytics only, GA4
  receives the page and booking-step events and `generate_lead` without any
  contact data; the Ads conversion, `user_data` and every Pixel event need the
  marketing choice.
- **No automatic sends.** Both Google configs set `send_page_view: false`; the
  Pixel has `autoConfig` off and `disablePushState` set, so neither tag reports
  history changes, clicks or form fields by itself (the GA4 stream's own
  enhanced measurement also has history, scroll, form and outbound events
  off, read from the served `gtag.js` on 21 Nov 2026). Every send is an
  explicit call below, and each call first sets the page location to the
  fixed Catch origin, the public path, the page's reviewed filter values
  (the city on the homepage; Explore's city, format, when and show on Explore
  and city pages, never the search words) and only reviewed campaign labels
  and Google click ids. The title is the page's own, except event pages and
  organiser profiles, which report a fixed title for their kind.
- **Withdrawal.** Withdrawing or downgrading the choice, in this tab or
  another, updates Consent Mode to denied for all four purposes, calls
  `fbq('consent', 'revoke')`, stops every later send, clears the stored click
  context and removes the tags' first-party cookies (`_fbp`, `_fbc`, `_ga*`,
  `_gcl_*`, Clarity's `_clck` and `_clsk`), and Clarity gets `consentv2`
  denied and `consent(false)`. Requests already sent cannot be recalled. Entering a private page
  leaves loaded tags idle; nothing is sent from it.
- **Events.** The module sends only the events and parameters in
  [the event map](#version-2-outbound-event-map), each with an `event_id`
  (Meta `eventID`) the server delivery can share:
  - `page_view` / `PageView` on each public page view, and for the current page
    when marketing is first chosen (never earlier pages).
  - GA4 only, under analytics: the site events `analytics.ts` projects to a
    closed parameter set (`cta_click`, `store_cta_click`,
    `store_cta_pending`, `lead_form_*`, `city_alerts_submitted`,
    `weddings_apply_step`, `explore_filters_applied`, `scroll_depth`,
    `section_read`), through `adTags.analyticsEvent`.
  - Member and referral leads (`adTags.siteLead`): GA4 `generate_lead` with
    `content_category` member or referral; under marketing a custom Meta
    `MemberLead` or `ReferralLead`, never the standard `Lead` the host
    campaigns optimise for. No contact data and no Ads conversion.
  - `view_item` / `ViewContent` on a public event page: the event ID, its
    activity kind, the organiser's city and the Catch ticket price in INR when
    the page shows one.
  - `begin_checkout` / `InitiateCheckout` when a live paid checkout opens: the
    order amount (price times places) in INR and the place count. The event ID
    is `checkout_` plus the payment record ID.
  - `purchase` / `Purchase` when a checkout this browser opened is confirmed
    on the event page: the amount paid in INR, with the payment record ID
    (`publicEventPayments`) as event and transaction ID. Test-mode payments
    are never sent.
  - Host lead: when a website lead form of a host kind (`guide`,
    `walkthrough`, `demo`, `venue`, `story`, `org_contact`, `app_link`; not
    city alerts or referrals) is accepted, Meta `Lead` and the Google Ads host website-lead
    conversion, plus GA4 `generate_lead` with `audience: organizer`. The event
    ID is the accepted lead receipt (`lead.leadId`), or a generated ID when the
    response has none. The marketing choice must be the one the submission
    started with. The number the person just typed (E.164) and an email, when
    a form asks for one, go to Meta advanced matching and Google `user_data`;
    both tags hash them in the browser.
- **Never sent.** Application or booking-question answers, names, gender, age
  band, orientation, matching or dating data, who someone met, guest lists,
  organiser or request IDs. A page whose address carries any query key other
  than the ad platforms' own (`utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`,
  `gad_source`, `gad_campaignid`) or a fragment other than a plain anchor
  sends nothing, because Meta reports the full page address itself.

## Boundary and current delivery

The local `dataLayer` is a compatibility diagnostic bus, not an advertising export.
Do not attach GTM to it or forward/replay it: it contains local search, city,
raw CTA, claim and review diagnostics that are outside the outbound contract.
The build takes no tag manager container id. Only the first-party transport
module (`adTags.ts`) loads or calls `gtag` or `fbq`, on its own data layer.

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
| `page_view` | `page_view` | `PageView` | No | Browser | Public page visit (`publicAdPage`); one per lifecycle visit; the first marketing choice starts the current page without replaying earlier pages. | Built (browser: GA4 under analytics, ad tags under marketing) |
| `cta_click` | `cta_click` | `CatchCtaClick` | No | Browser | Existing shared CTA helper; only a same-origin, allowlisted destination. Label and raw URL stay local. | Contract only (no transport) |
| `acquisition_start` | `acquisition_start` | `CatchAcquisitionStart` | No | Browser | First form interaction in member waitlist, host lead or host operating application; first explicit claim lookup or selection, or the first code, review or review-request action in the claim panel (once per claim page). | Contract only (no transport) |
| `lead_accepted` | `generate_lead` | `Lead` | Secondary, organizer only (host website-lead action 7908216651) | Browser | A website lead form of a host kind accepted by `/api/join-waitlist` (`ok: true`), with the lead receipt `lead.leadId` as event ID (or a generated ID), and unchanged submission-time permission. City alerts and referrals are excluded. | Built (browser: GA4 under analytics, ad tags under marketing) |
| `event_viewed` | `view_item` | `ViewContent` | No | Browser | Public event page rendered for a published, public event; parameters are the event ID, activity kind, the organiser's city and the Catch ticket price. | Built (browser: GA4 under analytics, ad tags under marketing) |
| `checkout_started` | `begin_checkout` | `InitiateCheckout` | Interim primary while purchase volume is low | Browser | Live checkout opened for a paid public event after the server created the order; value is ticket price times seats. | Built (browser, marketing choice); no Ads action yet |
| `purchase` | `purchase` | `Purchase` | Primary, guest | Server, with browser twin | `finalizePublicPayment` admits a paid seat: positive INR amount, the `publicEventPayments` ID as event and transaction ID. Pending, failed, refunded and free outcomes are rejected. | Browser twin built (marketing choice, checkout opened in that browser); server unwired |
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
city and country `in`. Google takes the phone digest of the E.164 number with
its plus sign; Meta takes the digest of the same number as digits only, country
code first and no plus (`hashedPhone` and `hashedPhoneForMeta` in
`hostConversions.ts`). Raw contact details never leave the server.

The only email a host conversion or customer list sends is the account's
Firebase Auth email when Auth has verified it (an email-link check, or a
Google or Apple sign-in): `verifiedAuthEmail` in
`functions/src/acquisition/adMatching/verifiedEmail.ts`. `users.email` and
`organizers.email` are typed and never checked, so they could name someone
else; they are never uploaded and never used to attach a Meta lead, but they
still count for opt-outs.

A delivery is sent only when the person has not opted out of ad matching (see
[Ad-matching notice and opt-out](#ad-matching-notice-and-opt-out)) and the
account is not deleted. The queue checks the opt-out record at enqueue, where an
opted-out owner's records are written already `cancelled` with outcome
`opted_out` and no contact digests or lead, and again immediately before each
send, for the record's phone and email, the host's current phone, account
email and organizer email, and the identifiers on an attached Meta lead. An opted-out record is dropped whole: it is never sent with the
opted-out key stripped. Recording an opt-out in Admin also cancels matching
pending records at once, and account deletion deletes the owner's records.
Requests already accepted by a provider cannot be retracted.
Credentials are dedicated Catch identities held in Secret Manager; shared
business identities are unsuitable.

The queue lives in `functions/src/acquisition/adConversions/`: the
`onAdConversionGrowthFactsWritten` trigger enqueues host conversions into
`adConversionDeliveries`, and the `sendAdConversions` worker sends them every
five minutes. `AD_CONVERSIONS_MODE` controls both: `off` (the default, and the
setting in dev) enqueues and sends nothing; `validate` sends Meta
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

Hashed contact lists may be shared with Meta (custom audiences) and Google
(Customer Match) as lookalike seeds and exclusions. Every list drops deleted,
restricted, under-18, staff, test and opted-out accounts, and each upload
replaces the whole list, so anyone who opted out or deleted since the previous
upload leaves it, within seven days at most. One list is built.

### Active hosts on Meta

`syncMetaHostAudience` (`functions/src/acquisition/adAudiences/`) runs daily at
04:20 India time and maintains one customer-file custom audience, "Catch |
Active hosts", in Catch's Meta ad account `3245368689001899` (subtype `CUSTOM`,
`customer_file_source` `USER_PROVIDED_ONLY`). The job finds it by name and
creates it when missing.

- **Members.** The owners of organizers whose growth facts show a first booked
  event (`organizerGrowthFacts.milestones.firstEventAt`), where the organizer
  is a real owned business (`userCreated`, `claimed` or `transferred`; synthetic
  and demo organizers excluded, as for the conversion queue).
- **Exclusions.** An owner is dropped whole, never uploaded without the key that
  disqualified them: a deleted account (tombstoned user or no Auth account),
  staff (an Admin role claim, current or retired, or an active
  `adminRoleAssignments` record), a test or demo account (`synthetic`,
  `demoOps`, `demoOpsId`, `seedPrefix` or `scenario`), sign-in disabled or a
  restricted, suspended or banned safety standing, under 18 by date of birth,
  an opted-out phone, verified email, account email or organizer email, or no
  contact key (no E.164 phone and no verified email).
- **Upload.** Rows are `[EMAIL, PHONE]`: the SHA-256 of the trimmed, lowercased
  verified Firebase Auth email (never the typed account or organizer email)
  and of the E.164 phone as digits
  only, an empty string for a missing key. Each run replaces the whole list
  through `/{audience_id}/usersreplace` in one session of 10,000-row batches,
  so removals and opt-outs leave Meta within a day. When no one qualifies, the
  job deletes the audience, since a replace needs at least one row.
- **Use.** The host lead campaign excludes the audience, so existing hosts
  stop seeing host ads: `tool/ads/meta_campaigns.json` names it under
  `targeting.excludeAudiences`, and `apply_meta_campaigns.mjs` adds it to the ad
  set's `excluded_custom_audiences` once the audience exists, keeping any
  exclusion added in Ads Manager.
- **Never uploaded.** Gender, age, orientation, matching, dating or
  attendance-pairing data; date of birth is read only to exclude under-18s.
- **Receipt.** `adAudienceRuns/meta_active_hosts` keeps the latest run's
  status, outcome code, timing, the platform audience ID and counts (candidates,
  members, rows received and invalid, exclusions by reason). It never holds an
  identifier or digest.
- **Gate.** `AD_AUDIENCES_MODE` is `off` (the default, and the setting in every
  environment but prod, which the owner set to `live` on 2026-11-19) or `live`. Off, the job only
  deletes an audience an earlier live run left (the receipt names it), so a
  list that would miss later opt-outs never lingers; otherwise it reads the
  receipt and sends nothing. Live needs `AD_CONVERSIONS_META_TOKEN_VERSION`,
  the CatchAds system-user token with `ads_management`, whose custom audience
  terms are accepted. The deploy params tool rejects any other value and a live
  mode without the token. A failed delete keeps the audience ID on the
  receipt, and the next daily run tries again.

### Google Customer Match (deferred)

Google lists are not built: the Ads account is not yet eligible for Customer
Match, which needs about 90 days of account history and spend. The host
membership above is the seam: a Google uploader would reuse
`loadHostAudienceMembers` with Google's E.164 phone digest (`hashedPhone`) and
its own replace semantics, behind its own gate.

## Consent and lifecycle

The persistent `catch_marketing_consent_v7` receipt records version 7, choice,
analytics/marketing booleans, update time and the measurement mode
(`first_party_tags`). A mode change requires a fresh choice. The banner offers
essential only, analytics, and explicit analytics plus marketing, with a
persistent Privacy choices control for withdrawal. Only a version-7 marketing
choice loads the tags. Version 5 shipped with the first-party transport;
version 6 (owner decision relayed 19 Nov 2026, #2063) shipped when the banner
began naming organisers' own Meta and Google tags, and version 7 when it began
naming Microsoft Clarity with site analytics, so every earlier choice,
version 6 included, loads nothing and asks again.
Legacy version-1 to version-4 choices, including `accepted`, can retain local
analytics permission but never authorize the tags or marketing; the banner
requires a fresh choice, and their stored campaign and click context is cleared.
Malformed or unknown versioned receipts fail closed.

### Ad-matching notice and opt-out

Server events and customer lists do not depend on the browser banner. The
notice is the privacy policy's advertising section, at `/privacy/#ads` (a fixed
`anchor` on that section in `website/src/content/legal.json`). It names Google
and Meta, what is shared, the hashing, and how to opt out.

People reach it from the one line where they give their details, at sign-up and
phone steps: "By continuing you agree to Catch's terms and privacy policy.",
with Terms and Privacy policy links. No form carries a separate ad-matching
notice (owner decision, 21 Nov 2026; #2273 removed the per-form notice). The
Host analytics setting says it does not cover ad matching.

The opt-out is one record per identifier in `adMatchingOptOuts`, server-only
like the queue. Its ID is the SHA-256 of
`catch-ad-matching-opt-out-v1:{kind}:{digest}`, where the digest is the one the
platforms receive for that phone (E.164) or email (trimmed, lowercased), so a
request by phone or email covers past and future bookings and accounts, signed
in or not. The record keeps the kind, the source (`support` or `admin`), who
recorded it and when, an optional short note, and, once removed, who removed it
and when; never the raw phone or email. It is permanent until staff remove it.

Support, safety, ops and the owner record it from the support conversation in
Admin (`adminManageAdMatchingOptOut`): they check, record or remove an opt-out
for the phone and/or email a request names. The server hashes both and answers
only with the kinds named, changed and now opted out. The conversion queue
checks the record at enqueue and before every send (see
[Server delivery](#server-delivery)), and the customer-list job drops opted-out
people from the next daily replace. That meets the privacy policy's promise to
stop new records and remove the person from shared lists within seven days.
Account deletion counts as an opt-out: the deleted account's queued conversions
are deleted with it, and it leaves every list at the next replace.

Unset/essential permission starts no measurement session. Analytics alone keeps
first-party analytics and campaign labels, and loads no Google or Meta tag.
Explicit marketing loads both tags. Revocation/downgrade revokes them
immediately. Sibling-tab receipt changes refresh the banner and the tags.
Every SPA lifecycle update reapplies the choice, including entry into private
routes, where nothing sends; returns to a public page create a new visit
without replaying old views. The first marketing choice starts a current-page
view, not historical replay. Events before consent and failed delivery are
dropped, not queued.

An accepted lead uses the permission captured when that request began. Accepting
mid-request cannot convert earlier activity; revoke/reaccept invalidates the old
receipt even within the same millisecond. The historical HTTP consent remains analytics-only. Its
historical `marketingAnalytics.consent` is not a versioned server advertising
permission, and a Host submission carries no advertising packet.

The `consent` records `analytics.ts` pushes onto the diagnostic `dataLayer` stay
local compatibility records; gtag.js never reads that layer. The transport sets
Consent Mode on its own layer as described under
[First-party browser transport](#first-party-browser-transport): defaults
before measurement and updates when choices change, as Google's
[consent implementation guide](https://developers.google.com/tag-platform/security/guides/consent)
requires. Existing organizer GA4's denied storage/signals behavior does not
establish remarketing readiness.

## Payload and attribution

The first-party tags and click capture use the public page class
`publicAdPage`: static marketing, discovery, campaign and city pages
(lowercase slug paths), `/claim/`, and public event pages
(`/events/:eventId/`). Private routes (`privateRoutes.ts`, which include the
`/booking/` receipt links, `/offer`, `/account` and `/demo/`), organiser pages
(`/organizers`), organiser forms (`/f/`), dynamic `/claim/:id`, and token links
(`/join/`, `/rehearse/`, `/invite/`, `/rsvp/`) fail closed. The public booking
flow and its confirmation run inside the event page, so they are covered there.
The host-only contract (`acquisitionRoute`) keeps its exact host acquisition
routes. Page location uses the fixed Catch origin and title is fixed to Catch.
The tags send the browser's referrer as they do by default; the Pixel also
reports the page address itself, which is why a page with any other query key
sends nothing. Arbitrary hosts, CTA text, proof URLs, names, raw email or phone,
private answers, reviews, guest lists, organizer/request IDs and sensitive dating
attributes are never outbound parameters; hashed matching keys travel only in the
dedicated matching fields described under server delivery. Receipt IDs must be opaque generated
measurement IDs, not business identifiers. Purchase amount/currency are accepted
only from the admitted payment record.

Click identifiers (`gclid`, `gbraid`, `wbraid`, `fbclid`, each with when it
was first seen) are captured under a marketing choice, and approved campaign
labels under an analytics choice, on every public page. They travel with the
checkout request (`adContext.ts`, with the Pixel's `_fbp` and `_fbc` cookies)
so the admitted payment record holds them. Server delivery reads them from that
record, never from the browser after the fact.

Campaign retention uses first-party local storage and lasts 30 days, from the
latest ad click for click identifiers. Navigation never clears it: private,
organiser and token pages neither read the address nor touch stored context.
Only withdrawal (click identifiers on any loss of the marketing choice,
everything on loss of analytics) or expiry removes it. Only the closed,
reviewed source/medium/campaign/content vocabularies in `approvedCampaignLabels`
persist in the existing HTTP attribution payload; unknown labels and search
terms are discarded. `catchMeasurement.ts` owns the browser-only identifier
context under a current version-7 choice. Click identifiers are excluded for
analytics-only choices and never enter the diagnostic bus or existing lead HTTP
payload. Storage failures drop the context.
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
2026-11-17. Each destination is switched on only after a synthetic dev run
shows provider receipt (Meta Test Events, Google conversion diagnostics),
consent changes, URL/title/referrer isolation, SPA shutdown, dedupe and the exact
network payloads. GTM stays out; nothing may consume the existing bus
wholesale. Organizer pixels require their own publication and policy approval
and stay disabled: the versioned publication policy record
(`organizerTrackingPublicationPolicy.ts`, version 1) cites the owner's
18 Nov 2026 decision on #2063 and keeps publication off until the owner's
policy sign-off.

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

## Organiser-owned tags

An organiser who owns a page can save its own Meta Pixel ID and GA4
measurement ID (`organizerTrackingSettings`, see the backend operation catalog
entry "Organizer advertising settings"). **Publication is off.** The
versioned publication policy record
(`functions/src/analytics/organizerTrackingPublicationPolicy.ts`) decides it.
Version 1 cites the owner's 18 Nov 2026 decision on #2063 and admits only
`publicationAllowed: false`. Every `enabled` field and the public projection
read the record, and the public projection never returns IDs. Only a reviewed
new version can widen it, and that version must cite the owner's policy
sign-off and change the public response contract in the same change.

The technical checklist on #2063 governs switching on. Each item needs a test or
a recorded receipt.

| Item | State | Where |
| --- | --- | --- |
| Separation | Built: one transport, two isolated sets; iframe retired | `adTags.ts` (#2138, #2193); `adTagsIsolation.test.ts`, `adTagsOrganizer.test.ts` |
| Consent gate | Built; the banner names organiser tags (#2194) | One v7 marketing receipt (`catch_marketing_consent_v7`), via `adTags.sync` |
| Eligible routes | Built | `organizerAdPage` (#2102, ad-click keys #2139) plus the set's own scope in `adTags.ts` (#2193) |
| Event map | Built | `organizerTagEvents.ts` (#2102), sent only by the organiser set (#2193) |
| Publication policy | Built, disabled | `organizerTrackingPublicationPolicy.ts` (#2097); profile classification (#2192) |
| Owner settings | Built | Website owner view live state (#2105); Catch Host policy-blocked line |
| Test receipts | Plan below; not run | [Dev test plan](#organiser-tag-dev-test-plan) |
| Owner policy sign-off | Signed off 19 Nov 2026 | #2063 |

### Rules the adapter must keep

- **Separation.** Organiser destinations are a separate, frozen destination set
  inside the existing first-party transport. They are not a new loader, a GTM
  container or an organiser-supplied script. They never read Catch's
  diagnostic `dataLayer`, `catchTagLayer`, campaign labels, click identifiers or
  acquisition context. Catch events never reach an organiser destination, and
  organiser events never reach Catch's destinations.
  - The owner chose Option A on #2063 (19 Nov 2026): one transport, two
    isolated destination sets, the iframe retired, and organiser tags must
    never reduce Catch's own tracking. `createAdTags` takes a frozen Catch
    destination set and sends every Catch Meta event with
    `fbq("trackSingle", catchPixel, …)`, never the broadcasting `track`.
    `adTagsIsolation.test.ts` pins that Catch's Google and Meta commands are
    identical with and without another pixel and Google layer on the page.
    The organiser set (`adTags.setOrganizer`) uses `trackSingle` with its own
    pixel and its own Google layer (`catchOrganizerTagLayer`) with the
    `catch_org` cookie prefix, so Catch's `gtag("set", …)` never reaches it.
    `observeOrganizerProviders` feeds it only a set the public projection
    published.
  - `_fbp` is shared on the Catch domain between Catch's and an organiser's
    pixel; the owner accepted this in the policy sign-off (19 Nov 2026).
  - The sandboxed iframe runtime that predated Option A
    (`organizer-tracking-runtime.*`, `trackingProviders.ts`) was removed;
    the first-party transport is the only loader.
- **Consent.** The only basis is a current version-7 *marketing* choice. An
  analytics-only choice loads nothing for organiser destinations. Legacy,
  downgraded and unknown receipts fail closed. Withdrawal revokes and stops
  organiser tags in the same page view, as it does for Catch's. Before
  publication, the banner must name the organiser's own tags.
- **Routes.** Only the organiser's published public page
  (`/organizers/:slug/`, `/organizers/:citySlug/:slug/`) and its published,
  active, non-dating-classified events (`/events/:eventId/`), as decided by the
  server's public projection.
  - Never claim, `/f/` forms, offers, OTP, booking receipts, account, demo or
    token links. Never while the owner view is open on the organiser page.
  - A query may carry only the ad-click keys `fbclid`, `gclid` and
    `utm_source`/`medium`/`campaign`/`content`/`term`/`id` (owner decision,
    19 Nov 2026), so visits from the organiser's own ads are measured. Any
    other key, a repeated key or a non-anchor hash fails closed, because the
    Pixel reports the page address itself. Organiser events still report the
    path only.
  - Single-page navigation to any other page stops sending.
- **Catch's own tags on organiser profiles.** Organiser tags must never
  reduce Catch's own tracking (owner condition, 19 Nov 2026), so Catch's tags
  cover organiser profiles too, through `catchOrganizerProfilePage` (the same
  profile routes and flow exclusions as `organizerAdPage`). They skip
  dating-classified and unclassified organisers, failing closed: the server's
  `profileTagsEligible` (#2192) answers whether a profile qualifies, and the
  excluded classes come from the publication policy version.
  `observeOrganizerProviders` reads it under any current analytics choice and
  admits that one profile to Catch's tags (`adTags.admitOrganizerProfile`);
  without a yes, `publicAdPage` keeps every organiser page closed. Campaign
  labels and click identifiers are still captured only on `publicAdPage`.
  - **Owner view.** While the owner view is shown on a profile, every tag,
    Catch's and the organiser set's, stays silent
    (`adTags.holdForPrivateSurface`).
- **Event map.** The table shows the event pairs. Every page field is the fixed
  Catch origin plus path, with a fixed title and an empty referrer. Catch
  payment, request and organiser ids, guest data, answers, dating words, campaign
  labels and click ids are never parameters. Each organiser event has its own
  opaque `org_…` id, never shared with a Catch event.

| Builder | GA4 | Meta | Parameters | Authority |
| --- | --- | --- | --- | --- |
| `organizerPageView` | `page_view` | `PageView` | page fields | Eligible page view |
| `organizerViewContent` | `view_item` | `ViewContent` | event id, activity kind, city, price (INR) | The event's own public page |
| `organizerBeginCheckout` | `begin_checkout` | `InitiateCheckout` | event id, places, value (INR) | A live checkout the server admitted |
| `organizerPurchase` | `purchase` | `Purchase` | event id, places, value (INR) | That admitted booking, confirmed |

- **Publication policy.** The organiser must be first-party or have a verified
  claim (`trackingConfigurationEligible`). Its public page must be published and
  indexable (`assertPublicOrganizerPageEligible`). Canonical social,
  singles/mixer and unknown event classifications stay excluded (the record's
  exclusion lists). External listings have no canonical classification and stay
  excluded.

### Organiser tag dev test plan

This is a plan, not a receipt. Nothing here has run. Run it only on dev,
after the transport choice and with a dev-only policy version. **Never run
it against production, a live organiser or real IDs.**

1. **Synthetic organiser.**
   - Seed a first-party dev organiser `synthetic-organiser-2063` with a
     published, indexable page.
   - Give it two published, active events: `synthetic-run-2063` (`running` /
     `pacePods`) and `synthetic-mixer-2063` (`singlesMixer`).
   - Save fictional IDs: a Meta test dataset created for this run and a GA4
     test property's `G-` ID. Record them only in the run notes, never in
     the repository.
2. **Meta Test Events.** Open the dataset's Test Events tab with its test code
   on the dev build. Expect:
   - `PageView` on the organiser page.
   - `PageView` and `ViewContent` on `synthetic-run-2063`.
   - `InitiateCheckout` and `Purchase` for a dev live-mode booking.
   - Every payload matches the event map snapshot exactly.
   - No Catch event reaches the organiser dataset, and the organiser dataset
     receives nothing on `synthetic-mixer-2063`.
3. **GA4 DebugView.** Use `debug_mode` on the dev build only. Expect the
   matching GA4 events, with:
   - `page_location` set to the Catch origin plus path,
   - `page_referrer` empty,
   - the fixed title,
   - no `user_data`,
   - no Catch campaign labels.
4. **Consent.** Check each case:
   - Deny: nothing loads.
   - Analytics only: nothing loads.
   - Accept: the tags load.
   - Revoke in the same page view: Consent Mode is denied, `fbq('consent', 'revoke')`
     runs, and nothing more is sent.
   - A legacy v4 receipt: nothing loads.
5. **Route shutdown.**
   - Navigate in-app from the organiser page to `/claim/`, an `/f/` form,
     `/offer/`, `/account/`, `/demo/…`, a `/booking/` receipt, a token link and
     the open owner view. Each must send nothing.
   - The same page with `?fbclid=…`, `?gclid=…` or `?utm_source=…` sends;
     with any other key (for example `?ref=…` or `?gbraid=…`) it sends nothing.
6. **Dedupe and separation.** On the same page view, Catch's own events reach
   only Catch's destinations with their own ids. Organiser events use `org_…`
   ids. A reload does not repeat `Purchase`.
7. **Network capture.** Save the HAR and provider receipts to the run's expiring
   CI artifact, then tick **Test receipts** on #2063 with the link.
