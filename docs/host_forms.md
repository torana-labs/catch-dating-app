---
doc_id: host_forms_product_spec
version: 1.4.1
updated: 2026-10-30
owner: host_tooling
status: active
---

# Host Forms Product Specification

## Decision

Catch Forms is an Audience-owned Host capability for collecting structured
information before, during, and after an event. A Host can create, publish,
share, embed, pause, duplicate, and analyze a form without requiring the
respondent to install Catch or complete a Consumer profile.

Forms is a platform primitive. Applications are one form purpose with an
additional review workflow; registrations, waivers, feedback, surveys, and
general intake must not be forced into application-review state.

## Audience ownership and source status

Forms is an Audience-owned navigation and source capability. The canonical Host
destination is `/host/audience`, where Forms and Responses are peer modes; legacy
`/host/forms` links redirect into that destination. The generated [Audience
responsibility README](../lib/hosts/audience/README.md) owns route composition,
source roots, and handoffs. This document remains the sole Forms product and
implementation contract.

This specification extends
`docs/host_product.md`. Data authority
remains owned by `docs/data_contracts.md`, client architecture by
`docs/app_architecture.md`, and public route architecture by
`docs/web_surface_architecture.md` and
`docs/marketing_website_architecture.md`. Source implementation does not by
itself establish deployment, configured provider state, runtime availability, or
released-client availability.

## Outcome

A Host can complete this loop:

1. Start from a template or blank form.
2. Compose sections and questions, configure validation and conditional logic,
   and preview the exact phone and desktop experience.
3. Publish an immutable version and distribute its stable URL, QR code, or
   embed snippet.
4. Receive responses from app-free respondents under the selected identity and
   consent policy.
5. Inspect individual responses and aggregate results, export permitted data,
   and run explicit automations.
6. Convert a response into an application, CRM contact, event attendee, or
   follow-up workflow only through a reviewed, idempotent action.
7. Pause, revise, republish, duplicate, archive, or delete eligible drafts
   without corrupting historical responses.

## Response-to-event continuation

Response and application routes share one detail page for answers and review.
Contact actions remain visible for repeated triage; submission metadata is a
disclosure. Private notes use the shared explicit-save field: Save and Cancel
appear only while editing, and saving a note preserves the review status. A single review
status control contains In review, Waitlisted and Declined; acceptance remains
the primary action and explicitly links People. Application review no longer
exposes a competing Add to People action. Ordinary forms retain CRM linkage
without being forced into application review.

Offer an event is available before acceptance so organizers can choose or
create the event first. Acceptance stays a separate review action; choosing an
event never approves the application or creates an offer. After acceptance and
CRM linkage, Offer an event becomes the primary continuation; Open person is
secondary. Single-response and query-selection entry points use
`HostResponseOfferScreen` and the same offer controller. The chooser always
provides Create event, including when other events exist. Saving a private draft
returns it selected through Save & return to review; the helper copy makes clear
that full event setup can wait. Cancellation preserves the originating page and
selection.
The return rechecks manager, selection and event identity. Missing CRM or
unapproved applications return to the same response review and then continue the
preserved offer. Imported applications without a native response retain review
and CRM; this continuation does not synthesize response IDs for them.

Selection, offer review and existing-offer handling are successive states of
that continuation. The route owns one content gutter and the bottom action area:
Preview, Create and Record reference remain reachable below scrolling content.
A single existing offer opens directly. Payment evidence
controls apply only to paid external/manual collection; free and Catch checkout
offers do not expose bank-attestation fields. Offer issuance, personal sharing,
verified payment and admission remain separate commands. The former Propose
attendee UI and its direct roster-import picker are removed; old-client backend
conversion compatibility is not a new-product entry point. Private event and
offer activation gates remain closed until their existing release requirements
are met.

## Product Boundary

### In scope

- Host form library and complete lifecycle.
- Blank forms and event-type templates.
- Sectioned builder with all supported field types.
- Required rules, field validation, branching, and conditional visibility.
- Branding within the Catch design system.
- Public app-free response routes.
- Configurable anonymous, email, and phone identity policies.
- File uploads with scoped asset ownership.
- Draft recovery, review, consent, submit, confirmation, and respondent copy.
- Stable share links, QR assets, source attribution, and safe embeds.
- Response inbox, detail, search, filters, exports, and aggregate analytics.
- Explicit automations and idempotent downstream conversion.
- Application-review projection for application-purpose forms.
- Optional organizer-connected form fees, separate from event admission.
- Explicit participant-reviewed profile building blocks and organizer cards.
- Independent optional organizer and Catch WhatsApp permissions.
- Environment deployment and exact-route smoke verification.

### Not in scope

- A general website builder or arbitrary custom CSS/JavaScript.
- Payment collection inside arbitrary questions. A form fee is a governed
  checkout step; event checkout remains the separate owner of event purchases.
- Hidden enrichment from Consumer dating-profile fields.
- Selling or uploading respondent data to advertising platforms without a
  separate policy and consent gate.
- Guessing delivery permission from form submission, imported contact data, or
  authentication.
- A promise that embedded forms can bypass browser, platform, CAPTCHA, or
  third-party cookie restrictions.

## Product Model

### Form purposes

Every form declares one immutable-at-publish purpose:

| Purpose | Primary job | Optional downstream projection |
| --- | --- | --- |
| `application` | Collect and review applicants | Host application queue |
| `registration` | Request a place at an event | Reviewed event attendee or booking handoff |
| `intake` | Collect operational information | CRM contact or event attendee |
| `waiver` | Capture acknowledged terms and required signatures | Event-scoped waiver receipt |
| `feedback` | Collect post-event outcomes | Event feedback aggregate |
| `survey` | Collect structured research | No automatic operational projection |

Purpose selects safe defaults and available completion actions. It never grants
authority by itself.

### Lifecycle

Forms use these states:

```text
draft -> published <-> paused -> archived
  |          |
  +----------+-> new immutable published version
```

- `draft`: editable and unavailable to respondents.
- `published`: active version accepts responses.
- `paused`: stable public route remains valid but rejects new starts/submits
  with Host-authored availability copy.
- `archived`: excluded from the default library and permanently closed to new
  responses. Historical versions and responses remain readable under policy.

Only drafts with no dependent published history may be hard-deleted. Published
forms are archived, not deleted. Duplicating creates a new draft with new form,
section, question, option, link, and automation identities.

### Versioning

- Builder edits write an optimistic-revision draft document.
- Publishing creates one immutable version snapshot and atomically selects it
  as the active version.
- In-flight respondents stay bound to the version they started.
- A later publish never mutates earlier questions, labels, logic, consent, or
  completion behavior.
- Response answers store question identity plus an immutable label/type
  snapshot so historical review does not depend on the current draft.

## Actors And Authority

| Actor | Capability |
| --- | --- |
| Organizer owner/manager | Create, edit, publish, pause, duplicate, archive, inspect responses, export permitted fields, and configure allowed automations |
| Event-scoped staff | Read or review only forms/responses explicitly attached to the granted event; no organizer-wide form administration |
| Respondent | Read one published version, save an eligible draft, submit, receive confirmation, and withdraw where policy permits |
| Support/Trust & Safety | Purpose-scoped audited access only through existing operations policy |
| Public guest | Resolve only bounded public-form presentation; never list organizer forms or responses |

Authentication proves the respondent controls an authentication factor. It does
not grant the Host access to unrelated account or profile fields.

## Host Experience

### Form library

The Forms root belongs in the Host workspace as a first-class destination, not
inside a Customers overflow menu. It provides:

- purpose, lifecycle, target, response count, completion rate, and last-response
  columns/rows;
- search and filters for purpose, state, target, and template;
- create, open, preview, share, pause/resume, duplicate, archive, and eligible
  draft-delete actions;
- bounded cursor pagination;
- useful empty, loading, failure, and permission states; and
- separate `Forms` and `Responses` views without inventing another customer
  identity model.

### Builder

The form workspace has Overview, Questions, and Responses peers. Published
forms open Overview; drafts open Questions. Settings is a dedicated view of
the same autosaved controller, reached from Overview or the action menu.
Overview leads with form identity, response/question totals, Share and Preview,
then the latest response and Results, Settings, and Automations destinations.

Questions uses three panes on large screens and progressive editing on phones:

1. **Outline:** sections and questions, reorder, duplicate, delete.
2. **Canvas:** editable content using canonical Catch field and section
   primitives.
3. **Inspector:** question type, required state, mapping, validation, logic,
   presentation, and privacy settings.

The builder supports:

- title, description, purpose, target, availability, and response limit;
- sections with title, description, page-break behavior, and stable ids;
- short text, long text, single choice, multiple choice, date, phone, email,
  URL, number, boolean, file, acknowledgement, and signature fields;
- options with stable ids, reorder, and safe deletion warnings;
- required state and type-appropriate validation;
- canonical person-field mapping only where the catalog permits it;
- respondent-visible help and privacy copy;
- conditional visibility and section routing;
- completion message and optional reviewed next action;
- Catch-owned appearance presets, organizer logo, cover image, and activity
  pigment without arbitrary CSS; and
- undo/redo for local edits plus server revision-conflict recovery.

Builder state must remain serializable and deterministic. Widgets do not own
publishing, validation, persistence, or identity generation.

The question inspector exposes **Use this answer as**. Compatible mappings come
from the generated person-field catalog, with Instagram accepting a handle or
URL. A person field can be assigned to only one question in the form. Selecting
a mapping applies its catalog data classification and starts with detail-only
presentation. Changing to an incompatible answer type removes the mapping.
Unmapped answers remain response content; contact actions do not guess identity
from question labels. Application review may fall back to the response identity
only after the same response-access checks used to disclose its answers.

### Preview

Preview renders the same response components and validation engine used by the
public route. It supports phone/desktop widths, light/dark policy where allowed,
logic-path simulation, required/error states, upload states, confirmation, and
paused/closed states. Preview never writes a real response or analytics event.

## Template Gallery

Templates are versioned source data, not hard-coded widget branches. Initial
templates are:

| Template | Purpose | Format-aware content |
| --- | --- | --- |
| Event application | `application` | Identity, motivation, availability, consent |
| Event registration | `registration` | Contact, ticket/context questions, organizer updates opt-ins |
| Dinner guest intake | `intake` | Dietary requirements, seating notes, accessibility |
| Run/walk participation | `intake` | Pace, distance, route/accessibility, emergency contact policy |
| Racket-sport session | `intake` | Level, preferred side, pairing/rotation inputs |
| Quiz/team night | `registration` | Team/table preference, team name, accessibility |
| Event waiver | `waiver` | Terms version, acknowledgements, signature |
| Post-event feedback | `feedback` | Rating, structured outcomes, private note, safety escalation |
| Blank form | Host-selected | No questions until the Host adds them |

Creating from a template copies it into an organizer-owned draft. Future
template changes never mutate that draft.

## Logic And Validation

### Conditions

Conditions use stable ids and a closed expression language:

- operands: prior answer, respondent identity state, target metadata, or a
  literal;
- operators: equals, not-equals, contains, not-contains, greater/less than,
  answered, and not-answered;
- combinators: all or any;
- actions: show/hide question, show/hide section, route to section, or finish;
  and
- no arbitrary code, remote lookup, or profile-derived condition.

The validator rejects forward-reference cycles, unreachable required questions,
invalid option references, and routes without a terminating completion path.
The server re-evaluates visibility and requiredness on submission; the client is
not authoritative.

### Validation

Validation derives from schema contracts and includes min/max length, numeric
range, date range, option bounds, file count/size/type, regex from a reviewed
preset catalog, and exact phone/email/URL normalization. Host-authored error
copy is optional and bounded; safe system copy is the fallback.

## Respondent Experience

### Payment and profile extension acceptance

Payment routing is selected separately for form fees and event admission.
Finance/Admin Owner uses `managePaymentRoutingPolicy` with `organizerId: null`
for app defaults, or the exact organizer ID for an override. Read with
`action: "read"` and null `expectedRevision`, `formFee` and `eventAdmission`.
Replace with the returned revision and both purpose choices. Each choice is
null, `{ "route": "disabled" }`, or an object such as
`{ "route": "razorpayRoute", "mode": "test", "currency": "INR", "merchantCountry": "IN" }`.
Null inherits at organizer scope and disables at app scope. The other Razorpay
choice is `razorpayOAuth`. `stripeConnectDirect` and
`stripeConnectDestination` reserve explicit adapter choices for future supported
account/country integrations; no Stripe execution adapter is installed by this
configuration foundation. Configuration does not fall back from an unavailable
provider to a different merchant. New payments must freeze their chosen binding;
old payments retain that binding for reconciliation and refunds.

This configuration surface is source support, not activation of Route payments.
Before activation, verify each selected adapter's credentials, account binding,
webhook, capture/refund/transfer recovery and applicable provider eligibility.
Keep existing OAuth credentials available for outstanding OAuth payments when
changing defaults. Platform Route setup does not require an OAuth partner
application; merchant OAuth setup below remains a separate route.

The platform adapter uses the separate
`RAZORPAY_PLATFORM_PAYMENT_CONFIG_VERSION` deployment variable. Its value must
pin a numeric Secret Manager version in the deployment project, never `latest`.
The secret is an object with `schema: "catch.razorpay-platform-payments/v1"`,
`mode`, `platformAccountId`, `keyId`, `keySecret` and `webhookSecret`. It holds
credentials only. The Route fee is the purpose's at-source fee in Catch's
commercial terms ([data contracts](data_contracts.md#commercial-terms)), frozen
on each attempt; without platform terms a Route attempt fails closed. Older
versions that still carry `feeBasisPoints` load, and the key is ignored. Keys
must match the configured test/live mode. Keep this variable
empty until the profile and selected linked accounts are ready. Configure the
reference in the matching GitHub deployment environment; the promotion workflow
materializes it without copying secret values into dotenv output. Retain pinned
versions needed by outstanding payments.

Form-fee Route checkout uses Catch's platform profile and the canonical
organizer owner's activated `hostPaymentAccounts/{uid}_razorpay` record. It
checks the linked account/product with Razorpay before reservation, then
rechecks the policy revision and owner/account binding in the transaction.
The fee definition may have a null OAuth `connectionId`; it never needs a fake
OAuth connection. Existing attempts resume their saved profile and allocation,
including after a policy or owner change. New orders still require a ready
organizer account. Publication checks the selected route and server account;
checkout additionally verifies the provider and pinned runtime configuration.

Configure the existing `organizerFormPaymentWebhook` endpoint with
`?platformVersion=N`, where N is the numeric version in the current platform
profile reference. Use that profile's `webhookSecret` and enable
`payment.authorized`, `payment.captured`, `payment.failed`, `refund.processed`
and `refund.failed`. Only the current configured version is accepted from the
public URL. Coordinate webhook URL/secret changes with profile promotion;
the background sweep recovers missed callbacks, and already persisted receipts
retain their pinned profile. Do not delete old profiles needed by receipts or
payments. Route receipt processing and the sweep do not require OAuth setup.

The Route adapter creates the quoted organizer transfer with its order, verifies
the expanded beneficiary/amount, and requires the requested initial settlement
hold. Full failed-fulfillment refunds request `reverse_all`; partial refunds need
a separate allocation plan. A customer refund is not marked complete until
provider reads also prove the exact organizer transfer reversal. Form fees
currently transfer without a settlement hold; event payments retain their
separate settlement policy; event settlement release remains unfinished.
These operations follow Razorpay's
[order transfer API](https://razorpay.com/docs/api/payments/route/create-transfers-orders/),
[transfer lookup](https://razorpay.com/docs/api/payments/route/fetch-transfer-order)
and [refund/reversal API](https://razorpay.com/docs/api/payments/route/refund-payments-and-reverse-transfer).
Provider transport tests use fixtures; they are not Razorpay test-mode receipts.

The payment/profile/chat extension is in implementation. Merchant connections,
payment recovery, submission finalization and webhook receipt processing live
under `functions/src/payments/formPayments/`. Their presence alone does not
enable paid forms. The full release requires the following end-to-end behavior
and checks:

- The selected collection route uses either Catch's Route account and the
  organizer owner's linked payout account, or an organizer merchant connected
  through Catch's Technology Partner OAuth application. Test and live
  credentials are isolated. Server
  credentials stay in Secret Manager, with pinned versions bound to organizer,
  connection, account, and mode. No merchant secret is collected in a form or
  shown to respondents.
- Payment is optional per published form, in INR integer paise. The Host must
  state the fee purpose and refund policy before publishing a paid form.
  Checkout freezes the version, answers, verified identity, fee and disclosures.
  Neither a browser redirect nor an authorization-only payment submits a
  response. A verified capture against the stored order and amount finalizes
  once. Webhooks and browser verification converge on that same finalization.
- An uncertain provider request is reconciled before creating another order.
  Duplicated, delayed, reordered, forged and foreign-account callbacks cannot
  duplicate submission or change another organizer's records. Pending fees do
  not enter the review inbox. Expired/closed form and refund recovery must be
  explicit, including a captured fee whose application could not be finalized.
- Ordinary custom questions remain organizer-only answers, including questions
  named like a core profile field. A canonical mapping alone is not permission
  to publish. Explicit Catch profile building blocks can prepare private data
  for the verified respondent; OTP does not claim or publish their profile.
- Only applicant-submitted answers can enter an organizer card. CRM notes,
  internal tags and review deliberations never enter these cards. The person
  can see their own cards; organizers cannot see another organizer's card.
  Sharing selected core/card fields with an event room requires a claimed
  profile and explicit participant sharing permission.
- Organizer WhatsApp permission and Catch WhatsApp permission are separate,
  optional, initially unchecked choices with versioned copy and identity-bound
  receipts. Neither is inferred from OTP, payment, submission or acceptance.
- Required/optional controls round-trip through builder, publication and both
  client/server validation. Field-level and final disclosure identify the
  recipient and visibility of answers, including the private pre-claim stage.
- Event room access follows current admitted attendee membership, independently
  of application approval, payment and CRM conversion. Replies, reactions and
  expiring typing indicators require current conversation access. Unclaimed
  profiles, unrelated organizers and revoked attendees cannot read room cards.

Acceptance includes contract generation/fixtures, provider adapter and replay
tests, authorization/rules tests, required/optional and consent round-trips,
profile claim and cross-organizer denial tests, chat interaction tests, and
rendered phone/desktop, light/dark and large-text review states. Existing free
forms and legacy organizer-only mappings must retain their behavior. This work
does not authorize sharing private CRM data or implicitly buying event admission.

The Host builder places form payment setup under Settings, after Access, on
phone and desktop. It shows Catch collection readiness independently of OAuth
availability, and otherwise distinguishes unavailable partner setup, an
unfinished connection, a ready test/live merchant, reconnect-required state,
and a disconnected account. Fee editing requires a ready account and verified-phone
identity; the amount is entered as decimal INR and converted exactly to integer
paise. Description and refund policy are mandatory. Removing a fee changes only
the draft until publishing. Disconnecting requires confirmation because it stops
new checkouts across all forms using that connection, while settlement recovery
continues. Returning from OAuth only refreshes server status; it never marks a
merchant ready locally.

The manager-only fee ledger reads one owned form at a time. Its rows include
unfinished checkout, captured/submitted, refund, and manual-review states with
provider references and amounts. Response links appear only after finalization.
The projection omits respondent identity, draft tokens, unsubmitted answers,
credential bindings, and internal error details. Status-filtered cursors are
bound to the organizer, form and filters, with document-id ordering to disambiguate
payments created at the same instant. Payment history is separate from the
application review inbox. The form workspace exposes it through a Payments tab,
including forms whose current draft no longer charges a fee. Pending, submitted,
refund and attention filters query the server. Refresh and retry preserve the
selected form/filter; stale pagination responses cannot overwrite a refreshed
list. Detail sheets identify test money, separate capture from submission,
show selectable provider references, and only offer a response link when one
exists. They do not imply that declining an application issues a refund.
The unified response screen also shows its submission fee, current ledger
status and test-mode label. Its row opens the same details sheet, without
routing back to the response or introducing a second application screen.

Returning respondents can recover their latest payment with the same verified
phone account when browser storage is missing or unavailable. Closed and full
forms expose **Check an existing payment**, including when the current version
no longer charges a fee. Discovery is read-only; it does not open checkout or
create a draft. An uncertain lookup blocks a fresh draft and offers retry without
requiring another OTP when already signed in. Recovery uses the frozen version's
receipt and preserves the distinction between refunds and application review.

The question editor separates the CRM Person field classification from Profile
use. Classification alone preserves organizer-only behavior. A Host explicitly
chooses a supported Catch profile building block or an organizer-card field;
acknowledgements/signatures cannot use either profile destination, and derived
age cannot replace a date-of-birth source. Clearing a mapping or changing to an
incompatible question type falls back to organizer-only use. A profile image
starts with one JPEG, PNG or WebP up to 10 MB. Requiredness stays independently
editable and round-trips without changing the destination. Publish validation
requires verified-phone access for profile/card fields; submission only prepares
private review pointers and does not claim, publish or share a profile.

The Settings workspace offers independently unchecked organizer application and
event updates, organizer future-event marketing, and Catch future-experience
marketing choices on new `form-whatsapp-v2` forms. Legacy v1 organizer/Catch
choices remain verified-phone-first and retain only their established scope;
their broader copy never becomes a v2 operational grant. The public review step
uses versioned server-owned copy and explains that v2 choices need a valid
mobile number from a canonical form answer or verified Auth phone. Without one,
the choices are disabled and the response can still be submitted unchecked.
An unchecked choice neither grants nor withdraws permission. Draft choices
resume under the same respondent authority; account switching clears local
answers and choices.

Free submission and paid finalization atomically record selected decisions.
An unverified v2 response creates only a private pending intent bound to its
form, version, response, source copy and phone endpoint; it does not activate a
sender. The respondent can later verify that same number and claim the exact
submitted response to promote the selected purposes. Organizer and Catch
receipts/preferences stay separate server-only ledgers. Each purpose retains
its own decision time: delayed payment or late promotion cannot override a
newer STOP or settings withdrawal, and changing one choice cannot renew another.
Checkout freezes the choices with the answers. Replays return current canonical
permission without recreating receipts; deletion prevents late grants.
Participants can withdraw each purpose or the whole sender. Collecting a new
form-originated WhatsApp permission does not enable managed delivery until the
provider use case is reviewed; existing independent event-service sends keep
their own eligibility rules.

Live Razorpay setup remains external: create Catch's Technology Partner
application, register the HTTPS callback, provision its client credentials and
vault permissions, connect the organizer account, and create and verify the
account-bound webhook. Verify capture and webhook replay with test payments
before enabling live checkout. OAuth uses the merchant public token for Checkout
and the partner client secret for Checkout signature verification; the merchant
access token authorizes server APIs. See Razorpay's
[OAuth integration](https://razorpay.com/docs/partners/technology-partners/onboard-businesses/integrate-oauth/integration-steps/)
and [merchant webhook API](https://razorpay.com/docs/api/partners/webhooks/create/).
Refund recovery uses the same saved amount and `X-Refund-Idempotency` key on
every retry, following the
[idempotent refund API](https://razorpay.com/docs/api/refunds/normal-refunds-idempotent).

The deployment remains unconfigured unless its GitHub environment variable
`FORM_RAZORPAY_PARTNER_CONFIG_VERSION` names a numeric Secret Manager version
in that same Firebase project. The deploy materializer writes only this
reference, never the credentials, and rejects cross-project references or
`latest` aliases. The referenced secret contains exactly `schema`
(`catch.form-razorpay-partner/v1`), `clientId`, `clientSecret`, `mode` (`test` or
`live`), and `credentialSecretId` (the pre-created merchant credential vault).
Grant the Functions runtime access to the partner secret and add/access/disable
version permissions on that vault. `infra/firebase/form_payments.tf` creates
both secrets (`FORM_RAZORPAY_PARTNER_CONFIG` and
`FORM_RAZORPAY_MERCHANT_CREDENTIALS`) and these grants in dev and prod, and
`infra/scripts/store_razorpay_partner_secret.sh <dev|prod>` stores the partner
config and pins the version; see
[`infrastructure_as_code.md`](infrastructure_as_code.md#forms-payment-secrets).
The runtime derives the callback and webhook URLs from
`https://asia-south1-<project>.cloudfunctions.net`, using
`organizerFormPaymentOauthCallback` and `organizerFormPaymentWebhook` respectively.
Register that exact callback in the partner application. The config loader
limits credential caching to one minute and sanitizes load failures.

### Public route

The canonical route is `/f/:publicFormId/`. `publicFormId` is opaque and stable
across published versions. The route is `noindex,follow` by default; a future
explicit discoverable-form policy must not be inferred from publication.

The route resolves only:

- bounded organizer presentation;
- the active immutable form version;
- identity requirement and consent/retention copy;
- current availability/response-limit state; and
- safe completion behavior.

### Identity policies

Each published version selects one policy:

| Policy | Use |
| --- | --- |
| `anonymous` | Low-risk surveys/feedback with abuse controls; no CRM/application conversion without later verified identity |
| `emailVerified` | Email-link/OTP verification |
| `phoneVerified` | Phone OTP verification |
| `emailOrPhoneVerified` | Respondent chooses either supported factor |
| `catchAccount` | Explicitly account-required experiences only; never the default for standalone Forms |

Anonymous policy never derives respondent UID, name, email, phone, or identity
origin from ambient sign-in. Only deliberately submitted, reachable canonical
contact answers may appear as organizer-acquired identity in Host views and
exports. The public client does not prefill an anonymous phone answer or offer
an account phone as its messaging endpoint. Explicit contact answers remain
visible at review and submission; providing them does not change the anonymous
policy or grant account linkage. Identified policies retain their permitted
account snapshot and existing verification and consent requirements. Draft and
receipt retries stay bound to the immutable version and original identity mode;
anonymous forms cannot reuse private account responses. Existing stored
responses are not rewritten by this change.

Sensitive questions, signatures, participant-private suggestions, and specified
completion actions raise the minimum permitted identity policy. A Host cannot
configure an unsafe lower policy.

### Draft and submit

- Anonymous drafts use a short-lived bearer draft token stored only on that
  device.
- Verified drafts bind to the verified UID and form version.
- Autosave is debounced, revisioned, expires under the form policy, and excludes
  unsaved file bytes.
- The respondent reviews every answer and consent before submit.
- Submission is idempotent and returns a stable receipt.
- Confirmation may show Host-authored copy, a receipt summary, withdrawal link,
  and one reviewed next action.
- Refresh, back navigation, duplicate submit, version replacement, pause, quota,
  upload failure, and expired verification have explicit recovery states.

### Files

Uploads use pre-authorized form/version/question-scoped asset intents. Storage
rules enforce owner/draft token, content type, size, count, readiness, and short
or policy-bound retention. A response may reference only ready assets scoped to
its exact draft or verified respondent. Hosts receive time-bounded download
access only when response authority permits it.

## Distribution

Every published form has:

- stable canonical URL;
- copy-link and native-share actions;
- downloadable SVG and PNG QR code;
- print-safe QR sheet;
- safe responsive embed snippet with allowlisted origins and a hosted fallback;
- optional source links with labels and UTM-compatible attribution; and
- a share preview using bounded organizer/form presentation.

Share-link creation and resolution use opaque tokens. Analytics may count
Catch-controlled share intents, human-filtered opens, starts, verified starts,
submissions, and completions. It must not claim to observe private forwards.

## Responses And Analytics

### Response inbox

Responses is the single intake and review directory. Its lifecycle rail is All,
Submitted, In review, Approved, Waitlisted, Declined, and Withdrawn. All includes
ordinary submissions without assigning them an application review status.
Native application projections and their source responses occupy one row;
imported and legacy applications appear alongside them. Status badges carry
review outcomes; selected lifecycle controls use the standard selection style.

Import starts in the Responses app bar with file selection and confirmation.
Successful import refreshes the list and clears its scope so the new rows are
visible. Old Applications directory links redirect to Responses while preserving
organizer, form, and person scope. Application detail remains the decision surface.

The list endpoint opts into the unified stream with `includeApplications` and
optional `reviewStatus` and `contactId`. Filtering and chronological ordering
happen before server pagination. Response scans are bounded per request, not
by total history size. The existing application queue limit still rejects an
oversized queue explicitly. Cursors bind organizer, filters, and application
revisions/access state; changed review data requires a refresh.

Hosts can search/filter/sort bounded response pages by form, version, target,
submission time, completion/review state, source, and permitted mapped fields.
Answer detail renders from the immutable snapshot and clearly distinguishes
anonymous, respondent-granted, organizer-acquired, and revoked data.

The response inbox exposes published categorical questions explicitly promoted
as filterable and excludes sensitive, detail-only and sort-only questions.
Selection uses stable question IDs and option values,
AND across questions and OR within a question, with each response checked
against its immutable version. Detail-only and withdrawn answers never satisfy
an answer filter. Changing answer filters or chronological order starts a new
query; cursors are bound to those selections. Bounded scans can yield an empty
page with a continuation, so the UI must retain Load more and active controls.
When an older client sends answer filters without a version ID, the server
matches only the form's active published version and binds that resolved version
to the cursor. An explicit version ID matches only that immutable version; equal
labels or option values on another version do not widen the result.
For a native form the Host response inbox first resolves the server's active
published version, then shows that version as the selected scope. Hosts can
select a historical version or all versions; selecting a different scope clears
answer choices because question and option identities belong to one version.
The server supplies the active version and publication count, and the client
derives historical IDs from the published `formId_vN` identity. Imported forms
without a native version scope keep their own response behavior.

Application detail places authorized phone/social contact actions and review
status controls before the answer list. Acceptance creates or reuses a CRM
person; event admission remains a separate, explicit conversion. Required
question validation follows the reachable conditional path, so hidden questions
do not prevent submission.


### Aggregate analytics

Analytics include:

- opens, starts, submissions, completion rate, and median completion time;
- abandonment by section/question without storing unsent answer content;
- choice distributions and numeric/date summaries where privacy thresholds
  permit;
- source-link funnel;
- application review outcomes;
- export and automation activity; and
- version comparison without combining incompatible question identities.

Small cohorts and sensitive/free-text fields are not aggregated into misleading
charts. Analytics read precomputed counters/aggregates rather than scanning all
responses on every screen load.

### Export

CSV/XLSX export is asynchronous for large sets, version-aware, and produces an
expiring download. It includes provenance and consent fields, never internal
grant data or private participant suggestions, and records an auditable export
receipt. Advertising-platform customer-list formats remain policy-gated and
separate from ordinary response export.

## Unified response detail

Native submissions and imported applications use one response-detail renderer.
Legacy application URLs are compatibility entries into that renderer, not a
second review page. Native application details join the authorized response
projection so attachments, provenance, submission metadata and reviewed
conversions remain available with review status, outreach and notes. Imports
without a native response retain their authorized application answers and review
controls. Failed linked loads fail closed and expose retry rather than silently
losing actions; revoked grants never restore data through the other projection.

The app bar identifies the respondent. Form context and status are flat content;
contact actions have equally sized bounded targets and stack at large text.
Answers remain directly visible; submission metadata and recorded review dates
use a disclosure. A common answer provenance appears once, with per-answer
provenance retained when it differs. Review notes have an explicit save action
that retains the current review status. Acceptance, People conversion and event
admission keep their distinct reviewed commands and conflict handling.

The primary action uses the borderless shared page-action recipe. Decline is a
neutral outlined secondary danger action at rest. The review status badge
represents the existing decision. Withdrawn or revoked entries expose no review
or conversion mutations.
Opening a row from the response inbox carries its form, version, search, status,
answer choices and order into the unified detail route. Previous and Next walk
that same bounded queue. If a review removes the current row from the filter,
Next takes the row now at its former position and Previous takes the preceding
row; additional pages load under the same request. Returning to the inbox keeps
its selected filters and loaded position. A direct detail link has no queue
controls because it has no originating filter context.

## Automations And Conversion

### Triggers

- response submitted;
- application review state changed;
- response withdrawn;
- response matches an explicit answer condition; and
- scheduled reminder before a configured close time.

### Actions

- notify organizer team;
- send a respondent confirmation through an authorized service channel;
- add/remove an organizer tag;
- create or link a CRM contact through the identity-resolution boundary;
- create a reviewed event-attendee proposal;
- add to an application review queue;
- invoke an allowlisted signed webhook; and
- enqueue an authorized WhatsApp/email follow-up through the existing campaign
  permission boundary.

Automation runs are idempotent, revision-bound, retryable, observable, and
disableable. A response never silently creates a Consumer profile, booking,
marketing consent, payment, or public identity.

Conversions show a preview, conflicts, exact fields, permissions, and resulting
record before confirmation. The receipt supports safe replay and a bounded undo
where the downstream aggregate permits it.

Event admissions use a separate receipt for each response and selected event.
Admitting the same response again to that event replays its result; admitting it
to another event creates a separate roster entry. Before roster import, the
conversion resolves the CRM contact and writes its form-response origin. The
roster audience projection follows that reviewed origin and validates the
organizer, event, response, and attendee identity. It preserves existing manual
tags. Conflicting phone/email matches and an existing roster edge belonging to
a different contact require duplicate review before conversion.

Approval, roster admission, CRM tagging, and messaging permission are separate
states. Organizer-authored external payment links can be included in individual
message handoffs or campaign drafts; they do not create Catch payment records or
prove that the organizer received payment. Managed audience dispatch still
requires the existing sender, template, recipient-permission, and delivery gates.

## Canonical Data Architecture

The generic core uses:

| Path | Role |
| --- | --- |
| `organizerForms/{formId}` | Organizer-owned mutable metadata, lifecycle, public id, active/draft version refs |
| `organizerFormVersions/{versionId}` | Immutable published definition snapshot |
| `organizerFormDrafts/{formId}` | Optimistic-revision builder document |
| `organizerFormResponseDrafts/{draftId}` | Expiring respondent autosave state |
| `organizerFormResponses/{responseId}` | Immutable submitted envelope and answer snapshot |
| `organizerFormAssets/{assetId}` | Scoped upload metadata |
| `organizerFormShareLinks/{linkId}` | Source-specific opaque link and counters |
| `organizerFormAggregates/{aggregateId}` | Version/question/source analytics projections |
| `organizerFormAutomationRules/{ruleId}` | Organizer-owned versioned automation definition |
| `organizerFormAutomationRuns/{runId}` | Idempotent execution status and sanitized error |
| `organizerFormConversionReceipts/{receiptId}` | Reviewed downstream conversion receipt |

The existing `organizerApplicationForms`, versions, responses, imports, and
grants remain compatibility sources during migration. Application-purpose form
submission projects one application review row that references the canonical
form response. Application review must not become the generic response store.

No client writes these collections directly. All writes are contract-validated
callables or idempotent triggers. Public reads are callable projections rather
than Firestore collection reads.

## Callable Surface

### Host management

- `createOrganizerFormDraft`
- `updateOrganizerFormDraft`
- `getOrganizerFormEditor`
- `listOrganizerForms`
- `validateOrganizerFormDraft`
- `publishOrganizerForm`
- `setOrganizerFormLifecycle`
- `duplicateOrganizerForm`
- `deleteOrganizerFormDraft`
- `createOrganizerFormShareLink`
- `getOrganizerFormShareAssets`

### Respondent

- `getPublicOrganizerForm`
- `beginOrganizerFormResponse`
- `saveOrganizerFormResponseDraft`
- `createOrganizerFormAssetIntent`
- `finalizeOrganizerFormAsset`
- `submitOrganizerFormResponse`
- `withdrawOrganizerFormResponse`

### Responses, analytics, and operations

- `listOrganizerFormResponses`
- `getOrganizerFormResponseDetail`
- `getOrganizerFormAnalytics`
- `requestOrganizerFormExport`
- `createOrganizerFormAutomation`
- `setOrganizerFormAutomationState`
- `listOrganizerFormAutomationRuns`
- `previewOrganizerFormConversion`
- `convertOrganizerFormResponse`

All manager callables require organizer authority, App Check, rate limits,
schema validation, optimistic revisions, and bounded reads. Public callables
require App Check or a reviewed public abuse-control substitute, strict public
id validation, rate limits, and response-shape redaction.

## UX And Design Contract

- Results identify the published version and the submitted-from-started completion
  denominator. Exports use that exact version. Tracked-link totals are labeled
  as including all versions because their counters are form-wide.
- Forms use the light editorial register, hairlines, whitespace, and canonical
  Catch field/section primitives.
- A form is information, not a stack of decorative cards.
- Builder selection and drag affordances may use quiet functional surfaces;
  respondent output remains section-led and content-first.
- Top bars, async states, mutation feedback, skeletons, sheets, buttons,
  fields, chips, and notices use existing governed primitives.
- Public React fields adapt `@catch/web-ui` through website shared primitives.
- Phone width, keyboard, text-scale 2.0, screen reader, reduced motion, high
  contrast, and light/dark policy are acceptance states, not deferred polish.

## Source implementation and remaining gates

The old delivery tranches are reduced to status because the repository now has
source seams for the complete Forms lifecycle. This is not a claim of deployment
or user availability.

| Capability | Source evidence | Current status |
| --- | --- | --- |
| Audience navigation and Host Forms UI | [Audience README](../lib/hosts/audience/README.md), [router](../lib/routing/go_router.dart), `lib/hosts/presentation/forms/` | Audience-owned source implementation; route/state capture and release proof remain separate. |
| Management, lifecycle, builder, validation, publication | [Functions inventory](../functions/README.md) management entries and `lib/hosts/presentation/forms/` | Source seams are present for draft/editor/lifecycle operations; exact released-client coverage remains a gate. |
| Public respondent and distribution | Functions respondent/distribution entries, website `/f/` route metadata, and the `/f/:publicFormId/` contract above | Source route and callable seams are present; mobile/desktop runtime, environment, abuse, and deployment proof remain open. |
| Responses, analytics, exports, automations, and conversion | [Functions inventory](../functions/README.md) operations entries and `functions/src/organizers/organizerForm*.ts` | Source seams are present; aggregate/export/automation replay and downstream receipt proof remain open. |

The product contract above remains authoritative for lifecycle, safety, consent,
public respondent privacy, identity policy, uploads, analytics, automations, and
conversion behavior. No delivery status may weaken those requirements.

## Remaining release, runtime, and commercial gates

- Prove contract generation, valid/invalid fixtures, migration compatibility,
  authorization, App Check, rate limits, idempotency, revision conflicts,
  redaction, emulator integration, Firestore/Storage rules, index parity,
  scoped asset access, retention, and deletion behavior.
- Prove Flutter controller/domain/widget/analyzer/route/design checks and
  deterministic captures for library, builder, preview, share, analytics,
  automations, response detail, loading, empty, error, pagination, text scale,
  keyboard, reduced motion, high contrast, and light/dark states. The current
  screen registry contracts these Audience-owned routes under
  `screen.host.customers`; automation visual capture is still pending.
- Prove the public React respondent loop on mobile and desktop, including
  bootstrap, configured identity modes, autosave, review/submit/withdraw,
  refresh, duplicate submit, pause/version replacement, auth expiry, upload
  failure, completion, QR/link/embed resolution, and no private-data leakage.
- Verify dev/staging/production contract versions, exact deployed callable
  revisions, Hosting probes, released-client behavior, public availability,
  submission/automation/export failures, load/abuse thresholds, and support
  runbooks. Source or test presence is not deployment evidence.
- Keep first-100-Host onboarding manual and instrumented until a pilot can publish
  a useful template and share a working app-free link in one guided session.
  Measure time to publish, share-to-start, completion, failed-question rate,
  review turnaround, downstream conversion, and repeat use. Feature count is not
  distribution evidence.

## Upload runtime identity

The public upload-intent callable runs under the dedicated `catch-form-upload`
service account. Host response detail uses the separate `catch-form-review`
identity for private photo links, with read-only Storage permissions. Their IAM setup and deploy-time readiness check are owned by
`docs/release_operations.md#dedicated-form-upload-identity`. Signed uploads remain
bound to the validated draft, form question, fixed object path, file type, size,
and expiry; finalization still verifies uploaded metadata before attachment.
The shared runtime account does not receive a new signing permission.

### Atomic form admission endpoint

Native application admission uses the current approved application and its
submitted response in the same seat transaction. It does not require or create
a separate CRM conversion receipt. The immutable version, application target,
respondent identity, response access, customer origin and current survivor must
agree. The offer workspace preserves the application source when drafting and
resolves its actual submitted response for admission. Revoked approval blocks a
new admission; a completed command can still replay its historical receipt.
Admission receipts preserve the approval ID, revision, customer and review time.
Legacy participant-grant/import applications remain outside this form endpoint.

`commitOrganizerFormAdmission` is the authenticated, App Check-protected
command boundary for a reviewed registration/intake response or an approved
native application from a generic form. It validates the
exact input, applies the actor rate limit, and delegates to the existing single
Firestore transaction. The transaction rechecks current manager/account, CRM
origin/contact, immutable submitted version, current issued offer, exact payment
evidence and canonical seat ledger revisions before writing the attendee and
immutable ownership/receipt together. Replaying the same request returns its
receipt only after current manager authority is checked.

This endpoint does not initialize seat ledgers, infer payment from a form fee,
create an approved application, or bypass the event-offer activation boundary.
Unreconciled capacity, ambiguous identity, stale offer/ledger revisions and
missing payment proof return a typed precondition error requiring fresh review.

The response inbox remains the default Host view, including review status queues
and version filters. For a selected published form without external search or
contact scope, **Filter by answers** opens the typed query workspace for that
published version across all review statuses. Returning to **Review inbox**
clears query selection and preserves inbox filters. This read-only query surface
is available independently of the private-event and offer rollout gates.

`previewOrganizerFormAdmission` executes the same transaction preparation as
commit without applying identity, capacity, roster or receipt writes. It returns
current offer and ledger revisions only when all checks pass. A preview does
not reserve capacity; the commit rechecks the complete chain. Missing migration
readiness is a blocker, never inferred from `bookedCount`.

The current form-response admission adapter preserves active waitlist offers
when checking remaining capacity. It refuses Cross Paths pair inventory, cohort
caps/ratios and membership policies until their verified eligibility and shared
reservation paths are integrated. The Host preview reports this limitation; it
does not reinterpret CRM answers as verified membership or cohort evidence.


Event-offer checkout reserves a seat for 15 minutes from checkout start,
then confirms admission only after verified payment. Issuing an offer alone does
not reserve capacity. The shared seat core now tracks checkout-held capacity
separately from confirmed attendance and blocks competing admission/import or
identity-replacement operations. Retrying checkout cannot extend its deadline;
late capture requires payment reconciliation and refund rather than admission.
The server payment ledger freezes the verified recipient, issued terms and
collection route. Order creation records uncertainty before the provider call;
retries recover by receipt. Verified capture confirms the held seat, roster,
ownership and immutable admission receipt in one transaction. Withdrawal,
revocation or expiry releases the hold and enters full-refund recovery. The
signed webhook inbox routes form fees and offer payments to their own ledgers;
a bounded offer sweep releases expiry independently of provider availability.
Recipient callables now prepare manager-only fragment links, claim by phone
OTP, discover owned attempts and resume checkout or financial history. Returning
payers can recover payment state through the original link after offer expiry
or source withdrawal. The `/offer/` website uses existing phone OTP and Catch
runtime primitives. It keeps the token out of storage and analytics, saves only
UID-authorized grant/payment references in the current history entry for reload,
and reports admission only from the server. Host message preparation issues the
same private link after source and communication checks; it does not send or
record delivery. Provider test-mode and deployed acceptance remain required
before activation. Route transfer release remains unfinished and must follow
event settlement policy separately from admission.
