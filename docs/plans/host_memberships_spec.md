---
doc_id: host_memberships_spec
version: 0.3.0
updated: 2026-10-30
owner: host_tooling
status: proposed
---

# Host Memberships — Product And Engineering Spec

Hosts (organizers) sell paid monthly or annual memberships to their regulars.
Catch applies the enforced membership entitlements at checkout, and the host
delivers the described perks in person.

This document owns the membership product contract, data model, payment flow,
state machine and delivery split. Shared runtime contracts stay with their
existing owners and are linked rather than restated:

- [`docs/data_contracts.md`](../data_contracts.md) for Firestore ownership, the
  schema workflow and rules tests.
- [`docs/host_product.md`](../host_product.md#feature-complete-crm) for the CRM
  value dimensions and segment-definition rules.
- [`lib/event_policies/README.md`](../../lib/event_policies/README.md) for
  admission and pricing policy.
- [`docs/backend_operation_catalog.md`](../backend_operation_catalog.md) for
  write ownership.
- [`docs/data_contracts.md`](../data_contracts.md#commercial-terms) for
  commercial terms: what Catch charges, the money-flow switch and the terms
  snapshot every payment freezes.

Every decision made while writing or building this is recorded in
[Decisions](#decisions) or [Open questions](#open-questions).

## 1. Goals

1. A host can define one or more plans. Each plan has a monthly price, an
   annual price or both, an optional member cap, structured benefits and
   free-text perks.
2. A member can join with a Razorpay subscription: UPI Autopay, card e-mandate
   or eNACH, India only. By default (`hostCollected`) the subscription lives on
   the host's own Razorpay account, so every renewal is paid to the host, who
   is merchant of record and invoices its members. Catch takes nothing at
   source and bills its commission to the host afterwards
   ([D-19](#decisions)). A `platformSplit` mode keeps the original Route split
   behind a configuration switch.
3. Checkout applies membership automatically for active members:
   - a member price, where 100% off means the event is included;
   - an early-access window;
   - a members-only gate.

   The server decides all three; the client only displays the result.
4. Membership status is driven only by verified provider evidence: signed
   webhooks, plus authenticated provider reads during reconciliation. The
   statuses are `trialing`, `active`, `past_due`, `paused`, `canceling` and
   `expired`.
5. Members can pause and cancel at period end themselves. A host can pause
   billing for every member at once, for example a seasonal club.
6. A member badge appears in three places:
   - the member's own profile;
   - host attendee lists;
   - host check-in.
7. The CRM shows each customer's membership tier, member-since date and status.
   It adds four segments:
   - active members;
   - lapsed members;
   - members with no attendance in 30 days;
   - non-members with 4 or more events in 60 days.
8. A consumer "My memberships" screen shows the price members would otherwise
   have paid, as savings.
9. Checkout shows an upsell when a membership would make the event cheaper or
   free.
10. Payments sit behind a provider abstraction:
    - the provider and provider account id are stored on the host's membership
      program;
    - the provider subscription id is stored on the membership;
    - per-provider price ids are stored on the plan.

    Stripe Connect can then be added later without reshaping the feature.

## 2. Non-goals (MVP)

These are deferred to phase 2 or later:

- Credits and quotas ("N events a month"), guest passes, reserved capacity
  allocation, tenure badges, and CRM automations (welcome, failed payment,
  win-back).
- Stripe or any non-INR membership. The abstraction is ready, but no Stripe code
  ships.
- Proration, mid-cycle plan switching, refunds of membership charges, coupons
  and member-initiated upgrade or downgrade. In the MVP, switching plans means
  cancelling and joining again.
- Showing membership on the public dating profile (`publicProfiles/{uid}`). See
  [D-11](#decisions).
- Member pricing on non-INR (Stripe) events and on paid waitlist offers. Those
  paths keep list price; see [D-9](#decisions).
- Native in-app Razorpay subscription checkout. The MVP uses the Razorpay-hosted
  subscription authorization link; see [D-4](#decisions).
- Website upsell. The upsell ships in the Consumer app's event dock first.

## 3. Current code this fits into

| Concern | Current source | What it means for memberships |
| --- | --- | --- |
| Commercial terms | `functions/src/commercialTerms/` | What Catch charges: platform defaults plus organizer overrides, resolved and frozen per charge. Memberships use the `hostMembership` purpose. |
| Money flow | `functions/src/payments/paymentRouting.ts`, `paymentRoutingPolicies` | The `hostMembership` route selects the mode: `razorpayOAuth` is `hostCollected`, `razorpayRoute` is `platformSplit`. |
| Organizer OAuth connection | `functions/src/payments/formPayments/organizerRazorpayConnection.ts`, `formPaymentCredentials.ts`, `organizerPaymentConnections` | `hostCollected` reuses the organizer's ready connection, its credential vault and refresh lease, exactly as ticketing does. |
| Route platform config | `functions/src/payments/razorpayPlatformPaymentConfig.ts` | `platformSplit` only. The pinned Secret Manager JSON holds credentials (`keyId`, `keySecret`, `webhookSecret`, `platformAccountId`); fees are commercial terms. |
| Linked accounts | `functions/src/payments/hostPaymentAccounts.ts`, `functions/src/payments/razorpayHostAccounts.ts`, `contracts/firestore/host_payment_accounts.schema.json` | `platformSplit` only. `hostPaymentAccounts/{ownerUid}_razorpay` is the Route linked account. Readiness is `readReadyRouteAccount` in `functions/src/payments/formPayments/razorpayRouteFormAuthority.ts`, keyed through `organizerOwnerUserId` (`functions/src/shared/organizerHosts.ts`). |
| Razorpay REST client | `functions/src/payments/formPayments/razorpayPaymentProvider.ts`, `functions/src/payments/formPayments/razorpayRouteProvider.ts` | It uses `fetch` with strict parsers, but has no plan, subscription or payment-transfer endpoints and supports only `order_id` checkout signatures. Memberships add a separate subscription client in the same style, with an injected `fetchImpl` for tests. |
| Transfers | `razorpayRouteProvider.ts` `orderFields` (order-level `transfers[]`), `eventCheckout/eventPaymentSettlement.ts` | `platformSplit` only. Subscriptions cannot carry order transfers, so each `subscription.charged` payment is split with `POST /v1/payments/{id}/transfers`. `hostCollected` makes no transfer. |
| Existing Route webhook | `functions/src/payments/formPayments/formPaymentTriggers.ts` (`organizerFormPaymentWebhook`), `razorpayFormProvider.ts` (`formWebhookEvents`) | It accepts only `payment.*` and `refund.*` and dispatches by receipt prefix. Memberships get their own endpoint, so the form and event inbox stays unchanged. |
| Legacy Razorpay | `functions/src/payments/razorpayWebhook.ts`, `createRazorpayOrder.ts` (retired) | Not used. |
| Event pricing and admission | `functions/src/events/eventPolicy.ts`: `quotePriceInPaise`, `signupPolicyDecision`, `requiresCommunityMembership` | The list price stays the policy quote. Membership evaluation runs **after** the policy quote and does not change the policy hash (`seatAuthority/firestoreAdapter.ts` `deriveEventSeatPolicy`), so policy locks are unaffected. |
| Viewer quote and route | `functions/src/events/eventViewerStateSource.ts` (`getEventViewerState`), `lib/contexts/events/domain/event_viewer_state.dart` | The single read the app uses for price and route. A 0 quote routes to `catchFreeBooking`; anything else routes to `catchCheckout`. Membership adds `memberPricing` and `membershipOffer` facts and two restrictions. |
| Free booking | `functions/src/events/signUpForFreeEvent.ts`, `functions/src/events/signUpUserForEvent.ts` | Rejects any non-zero quote. An included member's quote becomes 0, so this path must evaluate membership too. |
| Paid INR checkout | `functions/src/events/publicRegistration/` (`managePublicEventCheckout`): `policy.ts` `publicCheckoutQuote`, `reservation.ts`, `admission.ts` | Today the price is the flat `event.priceInPaise`, and the quote is frozen and compared as canonical JSON. The app's native INR order flow is retired, so discounted members pay through this path on the website. |
| Community membership | `functions/src/memberships/communityMembershipAuthority.ts`, `organizerCommunityMemberships` | A host-approved, unpaid admission entitlement behind `admission.format: "membersOnly"`. It is **not** the paid membership; see [D-1](#decisions). |
| Organizer entitlements | `functions/src/entitlements/*`, `organizerEntitlements` | SKUs that Catch sells to hosts. Unrelated. |
| CRM projection | `functions/src/organizers/organizerAudienceModel.ts` (`organizerContactTraits`), `organizerAudienceProjection.ts`, `organizerContactFilters.ts`, `functions/src/hostReadModels/*` | Traits and segment ids are rebuilt on server triggers. `projectOrganizerCommunicationPreference` is the uid-to-contact projection pattern that memberships copy. |
| CRM client | `lib/contexts/audience/domain/crm/host_audience_query.dart` (`HostAudienceSegment`), `lib/hosts/presentation/customers/*`, `lib/contexts/audience/data/read_models/host_contact_summary_reads.dart` | Segment chips and the exhaustive enum switches gain the four membership segments. |
| Attendee and check-in rows | `lib/hosts/presentation/widgets/host_operational_roster_section.dart`, `host_operational_roster_support.dart`, `functions/src/organizers/eventRosterInsights.ts`, `lib/contexts/audience/domain/crm/host_event_roster_insights.dart` | The roster insight signals gain `member`, which renders as a badge on the operator (check-in) and manage rosters. |
| Event dock | `lib/events/presentation/widgets/event_detail_dock.dart`, `event_detail_screen_state.dart`, `event_booking_controller.dart` | The upsell and the member-price note render here, from viewer state. |
| Host event editor | `lib/hosts/presentation/edit_hosted_event_screen.dart`, `hosted_event_policy_section.dart` | Gains a membership-rules section, saved by its own callable (not `mutateEvent`). |
| Badge primitive | `packages/catch_ui/lib/src/components/catch_badge.dart` (`CatchBadge`), `catch_field_layout.dart` (`CatchRowBadge`) | Reused. No new primitive. |
| Profiles | `lib/user_profile/presentation/profile_screen.dart`, `lib/contexts/profiles/domain/public_profile.dart` | The own-profile screen gets a memberships entry and badges. The public profile is unchanged. |

## 4. Data model

All membership documents are server-owned: their contracts use
`x-catch-ownership: server-only` or `callable-owned`, and client writes are
denied. Ids are deterministic where a natural key exists. Money is integer paise
in INR.

### 4.1 `hostMembershipPrograms/{organizerId}`

This is the per-host program and payment binding. It is written by
`manageHostMembershipProgram`.

| Field | Notes |
| --- | --- |
| `organizerId` | |
| `state` | `enabled` or `disabled`. |
| `payment` | `{provider: "razorpay", moneyFlow, providerAccountId: "acc_…", bindingId, mode: "test" \| "live", webhookId?}`. This is the snapshot taken when the program was enabled. For `hostCollected`, `providerAccountId` is the host's own merchant account, `bindingId` its `organizerPaymentConnections` id and `webhookId` the membership webhook Catch registered there. For `platformSplit`, `providerAccountId` is the Route linked account and `bindingId` is `{ownerUid}_razorpay`. A program without `moneyFlow` predates modes and is `platformSplit`. It is re-verified at every checkout and every transfer. |
| `billingPause` | `{state: "active" \| "pausing" \| "paused" \| "resuming", requestedAtMillis, requestedBy, reason, processedCount, cursor}`. |
| `memberCount` | Count of non-expired memberships across all plans. A projection. |
| `revision`, `createdAtMillis`, `updatedAtMillis` | |

### 4.2 `hostMembershipPlans/{planId}`

This is one tier. `planId` is `hmp_<random>`. It is written by
`manageHostMembershipPlans`.

| Field | Notes |
| --- | --- |
| `organizerId`, `name` (≤ 60), `description` (≤ 500) | |
| `status` | `draft`, `published` or `archived`. Only published plans can be bought. Archiving stops new joins and leaves existing members untouched. |
| `prices` | `{monthly?: Price, annual?: Price}`. At least one is required. A `Price` is `{amountPaise, providerPriceIds: {razorpay?: "plan_…"}, providerAccountId?, revision}`, where `providerAccountId` is the account the provider plan lives on (absent means Catch's platform account). Amounts run from ₹10 to ₹15,000 (1,000–1,500,000 paise). The RBI auto-debit ceiling is ₹15,000 per charge without re-authentication; see [D-6](#decisions). |
| `memberCap` | `null` or 1–100,000. |
| `trialDays` | 0–30. Default 0. |
| `benefits[]` | Typed and enforced, each type at most once (see below). |
| `perks[]` | Up to 8 strings of ≤ 120 characters. Free text; the host fulfils them. |
| `limits.maxUpcomingMemberPricedBookings` | `null` or 1–20. The no-show guard; see [§5.4](#54-booking-cap). |
| `activeMemberCount` | A projection: memberships on this plan that are not `expired`. |
| `sortOrder`, `revision`, `createdAtMillis`, `updatedAtMillis`, `publishedAtMillis` | |

Benefit types:

- `{type: "eventDiscount", percentOff: 1..100}`: the default member price on
  every Catch-booked event of this host. 100 means included.
- `{type: "earlyAccess"}`: plan members may book during an event's early-access
  window.
- `{type: "membersOnlyAccess"}`: plan members may book members-only events.

Razorpay plans are immutable. Changing a price creates a new Razorpay plan and
bumps `Price.revision`. Existing memberships keep the price and provider plan
they bought ([D-5](#decisions)).

### 4.3 `hostMemberships/{membershipId}`

There is one document per member per host. `membershipId` is
`hm_<sha256([organizerId, uid])>`, so a lapsed member who rejoins reuses the
document and keeps their tenure. The document is written only by the membership
state machine ([§7](#7-membership-state-machine)).

| Field | Notes |
| --- | --- |
| `schemaVersion: 1`, `organizerId`, `uid`, `planId`, `planName` (snapshot), `interval` (`monthly` or `annual`) | |
| `status` | `trialing`, `active`, `past_due`, `paused`, `canceling` or `expired`. |
| `statusReason` | `null` or one of `memberPaused`, `hostPaused`, `paymentFailed`, `memberCanceled`, `planCompleted` or `providerCanceled`. |
| `priceInPaise`, `currency: "INR"` | |
| `currentPeriodStartMillis`, `currentPeriodEndMillis`, `trialEndsAtMillis` | |
| `cancelAtPeriodEnd` | Boolean. |
| `pause` | `null` or `{initiator: "member" \| "host", pausedAtMillis}`. |
| `pastDueSinceMillis` | `null` or the time it became past due. |
| `memberSinceMillis` | The first time the member ever became entitled. Never reset. |
| `tenure` | `{accumulatedMillis, stretchStartedAtMillis \| null}`. Cumulative entitled time across stretches. |
| `provider` (`"razorpay"`), `providerSubscriptionId`, `providerPlanId` | |
| `payment` | The program binding the subscription was bought on, copied from its checkout. Every later provider call (pause, resume, cancel, refresh) uses it, so a mode switch never moves an existing subscription. Absent on memberships from before modes. |
| `providerEventAtMillis` | Monotonic ordering guard. |
| `lastCheckoutId`, `revision`, `createdAtMillis`, `updatedAtMillis` | |

### 4.4 Other documents

`hostMembershipCheckouts/{checkoutId}` is one subscription purchase attempt.
`checkoutId` is `hmc_<random>`. It is created by `manageHostMembershipCheckout`
`prepare`. It holds:

- `organizerId`, `planId`, `uid`, `interval`, `priceInPaise`;
- `state`: `open`, `authorized`, `expired` or `failed`;
- `payment`: the program binding the subscription is created on;
- `providerSubscriptionId`, `authorizationUrl` (the Razorpay `short_url`);
- `expiresAtMillis` (now + 30 minutes), `createdAtMillis`, `updatedAtMillis`.

The member can read their own checkout to watch its progress.

`hostMembershipCharges/{providerPaymentId}` is the charge ledger, and the
commission statement's membership source ([#1126](https://github.com/torana-labs/catch-dating-app/issues/1126)).
It holds:

- `membershipId`, `organizerId`, `uid`, `amountPaise`, `feePaise`,
  `transferAmountPaise`;
- `periodStartMillis`, `periodEndMillis`;
- `moneyFlow` and `commercialTerms`, the effective terms frozen when the charge
  was recorded;
- `transfer`: `{state: "pending" | "requesting" | "created" | "failed" |
  "notRequired", transferId | null, attempts, lastError | null}`;
- `providerAccountId`, `mode`, `createdAtMillis`, `updatedAtMillis`.

A `hostCollected` charge has `feePaise` and `transferAmountPaise` 0 and
`transfer.state` `notRequired`. `listHostMembershipChargesForStatement` reads
one organizer's charges by `createdAtMillis` window, oldest first.

`hostMembershipWebhookReceipts/{hmwh_<sha256(eventId or body)>}` records each
webhook event received. It holds:

- `providerEventId`, `eventType`, `subscriptionId`, `paymentId`;
- `outcome`: `applied`, `duplicate`, `ignored` or `rejected`;
- `receivedAtMillis`.

Only digests and ids are stored, never raw payloads.

`hostMembershipBenefitUses/{eventId}_{uid}` is written when a member books at a
member price. It holds:

- `membershipId`, `organizerId`, `uid`, `eventId`, `planId`;
- `listPriceInPaise`, `paidPriceInPaise`, `savingsInPaise`;
- `eventStartMillis`, `state` (`booked` or `released`), `createdAtMillis`.

It is the source of the savings figure on "My memberships" and of the booking
cap.

`eventMembershipRules/{eventId}` holds an event's membership rules. It is
written by `manageEventMembershipRules`. It holds:

- `organizerId`, `eventId`;
- `memberPriceOverrides[]`: `{planId, percentOff}` or `{planId, priceInPaise}`,
  where 0 means included;
- `earlyAccess`: `{hours: 1..168, anchorMillis, generalSaleOpensAtMillis}` or
  `null`;
- `membersOnly`: boolean;
- `revision`, `updatedAtMillis`, `updatedBy`.

These rules are separate from `eventPolicy`, so they never change the seat
policy hash or trip the policy lock ([D-3](#decisions)).

### 4.5 CRM fields

`organizerContactTraits/{contactId}` and the `hostContactSummaries` row both
gain:

- `membership`: `{planId, planName, status, memberSinceMillis, entitled} | null`,
  projected from `hostMemberships` through the contact's `linkedUid`;
- `attended60DayCount`;
- `attended30DayCount`.

## 5. Entitlement evaluation at checkout

Evaluation is one pure function, `evaluateHostMembershipEntitlement`, in
`functions/src/hostMemberships/entitlement.ts`. Every server path uses it.
Clients never compute it.

```ts
evaluateHostMembershipEntitlement({
  listPriceInPaise,            // quotePriceInPaise(...) for this viewer
  rules,                       // eventMembershipRules or null
  membership, plan,            // the viewer's membership for this host and its plan, or null
  publishedPlans,              // the host's published plans, for the upsell
  upcomingMemberPricedBookings,
  nowMillis,
}) => {
  member: {planId, entitled} | null,
  priceInPaise, listPriceInPaise, savingsInPaise,
  memberPriceApplied, memberPriceBlockedReason: null | "bookingCapReached",
  admission: {allowed: true} |
    {allowed: false, reason: "paidMembershipRequired"} |
    {allowed: false, reason: "memberEarlyAccess", generalSaleOpensAtMillis},
  offer: {planId, planName, interval, planPriceInPaise,
    memberPriceInPaise, savingsInPaise} | null,
}
```

### 5.1 Entitled

A membership is entitled when `now` is before
`currentPeriodEndMillis + 3 days grace` **and** its status is one of:

- `trialing`, `active` or `canceling`;
- `past_due`, while within that same grace window;
- `paused` with `pause.initiator == "host"` ([D-7](#decisions)).

A member's own pause suspends entitlement. The period-end guard means a lost
webhook cannot grant access forever.

### 5.2 Member price

For an entitled member:

1. If the event has a `memberPriceOverrides` entry for the member's plan, use
   it.
2. Otherwise apply the plan's `eventDiscount`.
3. Otherwise charge the list price.

The percentage is applied to the viewer's list quote, which already includes
cohort and demand adjustments, and rounded down to whole paise. A result between
0 and 99 paise is raised to 100, the minimum Razorpay charge. The price never
exceeds the list price.

### 5.3 Admission

The admission check runs after the existing `signupPolicyDecision` and is
additive:

1. **Members-only.** If `rules.membersOnly`, only entitled members whose plan
   has `membersOnlyAccess` may book. Otherwise the restriction is
   `paidMembershipRequired`.
2. **Early access.** If `rules.earlyAccess` is set and `now` is before
   `generalSaleOpensAtMillis`, only entitled members whose plan has
   `earlyAccess` may book. Otherwise the restriction is `memberEarlyAccess`.

### 5.4 Booking cap

When `plan.limits.maxUpcomingMemberPricedBookings` is set, the evaluator counts
the member's `booked` benefit uses with this host whose `eventStartMillis` is
after `now`. Each counted use must have a participation that is still
`signedUp`; released or cancelled uses do not count. At the cap, the member pays
list price, and the response says why. This is the no-show guard for "unlimited"
plans.

### 5.5 Upsell

The upsell offer is computed only for viewers with no current membership of the
organizer; a current member is never upsold a second plan from the same host
([D-16](#decisions)). It is the cheapest published plan, with spare capacity,
whose resulting member price is lower than the current price. If two plans tie,
the one with the lower monthly-equivalent price wins. Plans that grant
`membersOnlyAccess` or `earlyAccess` are offered when they would lift the
current restriction.

### 5.6 Call sites

These call the evaluator inside their existing transaction or read:

| Path | Change |
| --- | --- |
| `eventViewerStateSource.ts` | Adds `memberPricing` and `membershipOffer` to the source and response. `quotedPriceInPaise` becomes the member price, so an included member routes to `catchFreeBooking`. The two restrictions join `futureBooking.reason`. |
| `signUpForFreeEvent.ts` | Uses the member price before the "requires payment" check. Writes `hostMembershipBenefitUses` after a successful booking whose `memberPriceApplied`. Also enforces the members-only and early-access restrictions. |
| `publicRegistration/policy.ts` `publicCheckoutQuote` and `reservation.ts` | The quote takes an optional member pricing. `amountPaise` becomes the member price, and a `listAmountPaise` is added when it differs. A member price of 0 is refused here, and the member books in the app instead ([D-8](#decisions)). The frozen-quote comparison continues to guard the price. |
| Stripe and waitlist-offer acceptance | List price only; the restrictions still apply ([D-9](#decisions)). |

## 6. Money flows, Razorpay Subscriptions and webhooks

### 6.0 Modes

The organizer's membership money flow is the `hostMembership` payment route in
`paymentRoutingPolicies` (app default plus organizer override, written by the
audited `managePaymentRoutingPolicy`), the same switch tickets and form fees
use. Catch's commercial terms are separate data
([`data_contracts.md`](../data_contracts.md#commercial-terms)).

| Route | Mode | Where the subscription lives | Money | Catch's fee |
| --- | --- | --- | --- | --- |
| `razorpayOAuth` | `hostCollected` (the owner's default) | The host's own Razorpay account, through the existing OAuth connection | Paid to the host, who is merchant of record and invoices members | None at source. Each charge counts toward the commission statement at its frozen terms. |
| `razorpayRoute` | `platformSplit` (off unless selected) | Catch's platform account | Split to the host's Route linked account | The terms' `hostMembership.atSourceFeeBasisPoints`, deducted before the transfer |
| none, `disabled`, Stripe | unavailable | | | |

A Catch-as-merchant flow later is a new route plus its adapter, not a change to
plans, memberships or the state machine.

### 6.0.1 Subscriptions on a connected account

`hostCollected` calls Razorpay's Plans and Subscriptions APIs on the host's
account with the merchant OAuth access token (`Authorization: Bearer`), the
token ticketing and form fees already use. The evidence, checked on 30 Oct:

- Catch's OAuth authorization requests the `read_write` scope
  (`razorpayFormProvider.ts`). Razorpay documents `read_write` as read and
  write access to all resources on the API.
- Razorpay's official Node SDK applies an OAuth token as a Bearer header to
  every resource, Subscriptions and Plans included, with no product
  allow-list.
- Partner webhooks on a merchant account (`/v2/accounts/{id}/webhooks`) take
  any active event, so `subscription.*` events can be registered there.

No Razorpay page states Subscriptions-over-OAuth in so many words, and the
session could not open razorpay.com. So the runtime does not assume it: enabling
a `hostCollected` program probes `GET /v1/subscriptions?count=1` on the host's
account and fails closed with `subscriptionsNotEnabled` when Razorpay refuses
the product. The first test-mode run in §13 confirms it end to end.

What the host must have: a Razorpay account connected to Catch through Payments
(the same OAuth connection ticketing uses), with Subscriptions turned on.
Razorpay enables Subscriptions per account; live mode needs Razorpay's
activation and recurring payment methods (UPI Autopay, card e-mandate, eNACH)
on the account.

All provider calls go through `HostMembershipBillingProvider`, defined in
`functions/src/hostMemberships/billingProvider.ts`. One instance acts on one
account:

```ts
interface HostMembershipBillingProvider {
  readonly provider: "razorpay";
  createPrice(input): Promise<{providerPriceId}>;            // Razorpay plan
  createSubscription(input): Promise<{providerSubscriptionId, authorizationUrl}>;
  fetchSubscription(id): Promise<ProviderSubscriptionSnapshot>;
  pause(id) / resume(id) / cancelAtPeriodEnd(id): Promise<ProviderSubscriptionSnapshot>;
  splitCharge(input): Promise<{transferId}>;                 // platformSplit only
  findChargeTransfer(paymentId, account): Promise<{transferId} | null>;
  probeSubscriptions(): Promise<"enabled" | "notEnabled">;
  ensureMerchantWebhook({url}): Promise<{webhookId}>;        // hostCollected only
  verifyWebhook(rawBody, signature): boolean;
  parseWebhook(rawBody): ProviderSubscriptionEvent | null;
}
```

The Razorpay implementation is `razorpaySubscriptionProvider.ts`. It authenticates
with the merchant OAuth token (`hostCollected`) or the pinned platform key
(`platformSplit`) and uses `fetch` with a 15-second timeout, a 64 KB response
cap, strict parsers, and injected `fetchImpl` for tests. Each membership,
checkout and program records the binding it was created on, and every later
call uses that binding (`runtime.ts` `providerFor`).
`ProviderSubscriptionSnapshot` is provider-neutral:

```ts
{id, status, planId, currentStartMillis, currentEndMillis, startAtMillis,
 endedAtMillis, paidCount, notes}
```

A Stripe adapter would implement the same interface.

### 6.1 Flow

1. **Enable the program.** A host manager calls `manageHostMembershipProgram`
   `enable`. The server resolves the mode (§6.0), then fails closed with the
   first host-facing reason: `notOffered`, `razorpayNotConnected`,
   `razorpayNeedsAttention`, `payoutAccountNotReady`, `termsNotConfigured`,
   `subscriptionsNotEnabled` or `providerUnavailable`.
   - `hostCollected` takes the organizer's one ready OAuth connection in that
     mode, probes Subscriptions on its account, and registers (or reuses) a
     membership webhook there at
     `hostMembershipRazorpayWebhook?connectionId=<id>`, signed with the
     connection's webhook secret.
   - `platformSplit` runs `readReadyRouteAccount(organizerId)` and loads the
     platform config.

   It then snapshots the binding on the program. A program with members cannot
   change binding. When the binding changes, published plans get provider
   prices on the new account.
2. **Publish a plan.** `manageHostMembershipPlans` `publish` creates one
   Razorpay plan per enabled interval, on the bound account, with
   `POST /v1/plans`:

   ```
   {period: monthly | yearly, interval: 1,
    item: {name, amount, currency: INR},
    notes: {catchProject, catchPlanId, organizerId, interval}}
   ```

   The returned `plan_…` ids are stored under `providerPriceIds.razorpay`,
   with the account under `providerAccountId`.
   Plan creation is idempotent: the `catchPlanId`, interval and revision are
   kept in notes, and a retry reuses a stored id on the same account.
3. **Join.** The member calls `manageHostMembershipCheckout` `prepare` with
   `{planId, interval}`. Inside a transaction the server checks:
   - the plan is published, and its price lives on the program's account;
   - the program is enabled, not billing-paused, and its binding is still the
     organizer's effective mode;
   - for `hostCollected`, the bound connection is still ready;
   - Catch's commercial terms resolve;
   - the member has no entitled or paused membership with this host;
   - the cap: `activeMemberCount` plus open unexpired checkouts must be below
     `memberCap`.

   It then writes the checkout with the binding and calls
   `POST /v1/subscriptions` on that account:

   ```
   {plan_id, total_count: 120 (monthly) | 10 (annual), quantity: 1,
    customer_notify: 1, start_at?: (trial),
    notes: {catchProject, catchCheckoutId, organizerId, planId, uid}}
   ```

   The response returns `authorizationUrl` (`short_url`). The app opens it, and
   the member authorizes UPI Autopay, an e-mandate or eNACH on the Razorpay page.
4. **Activate.** Razorpay sends `subscription.authenticated`,
   `subscription.activated` and `subscription.charged`. These reach the
   membership state machine through the webhook ([§6.2](#62-webhooks)) or a pull
   refresh (`manageHostMembershipCheckout` `refresh`, which calls
   `fetchSubscription` on the checkout's account). Both apply the same provider
   snapshot, so either path gives the same result.
5. **Record each charge.** For every `subscription.charged` payment (the first
   and every renewal), upsert `hostMembershipCharges/{pay_…}` with the
   effective commercial terms resolved at that moment.
   - `hostCollected`: the money is already the host's. No fee is deducted and
     no transfer is made (`transfer.state: notRequired`).
   - `platformSplit`:
     1. Compute `fee = floor(amount × atSourceFeeBasisPoints / 10000)` from the
        frozen terms, and `transfer = amount − fee`, which must be at least
        100 paise.
     2. Re-verify the destination account.
     3. Mark the charge `requesting`, then call
        `POST /v1/payments/{pay_…}/transfers`:

        ```
        {transfers: [{account, amount, currency: INR, on_hold: 0,
          notes: {catchMembershipChargeId}}]}
        ```

     If the outcome is unknown, the server recovers with
     `GET /v1/payments/{pay_…}/transfers` before retrying. There is no
     settlement hold, because membership revenue is not tied to an event.
     `reconcileHostMembershipCharges` runs every 15 minutes and retries
     `pending`, `requesting` and `failed` transfers, with at most 5 attempts.
6. **Pause, resume or cancel.** Each calls the provider on the membership's
   account first (`POST /v1/subscriptions/{id}/pause {pause_at: "now"}`,
   `/resume`, or `/cancel {cancel_at_cycle_end: 1}`), then applies the
   returned snapshot plus the local intent (`pause.initiator`,
   `cancelAtPeriodEnd`).

### 6.2 Webhooks

The endpoint is `hostMembershipRazorpayWebhook`, an `onRequest` function. For
`hostCollected` Catch registers it on each host's merchant account with
`?connectionId=<organizerPaymentConnections id>`; for `platformSplit` it is
registered once on the platform account without a query. It subscribes to the
`subscription.authenticated`, `.activated`, `.charged`, `.pending`,
`.halted`, `.paused`, `.resumed`, `.cancelled`, `.completed` and `.updated`
events.

Processing steps:

1. Resolve the delivering account from the URL: the connection's account and
   its vault webhook secret, or the platform account and the pinned config's
   `webhookSecret`. An unknown connection gets 400 and no write. A
   disconnected connection still reports renewals of existing members.
2. Verify `x-razorpay-signature` as HMAC-SHA256 of the raw body with that
   secret, compared in constant time. An invalid signature gets 400 and no
   write.
3. Parse the payload strictly. Require `account_id` to equal the delivering
   account and `notes.catchProject` to equal this project. A foreign or
   unknown payload gets 200 and **zero writes**, matching the existing
   ownership-marker rule in `docs/data_contracts.md`.
4. Dedupe with a create-only receipt keyed by the connection and
   `x-razorpay-event-id`, falling back to a body digest. A duplicate gets 200
   and no processing.
5. Apply the snapshot from the payload's `subscription` entity, only to a
   checkout created on the delivering account. A host's merchant account can
   therefore never write a membership bound elsewhere. Ordering is guarded by
   `providerEventAtMillis`: an older event never overwrites a newer state. The
   single exception is that `charged` always records its charge.
6. Return 200 after commit. Return 503 on transient errors so Razorpay retries;
   dedupe makes the retry safe.

## 7. Membership state machine

The pure transition is `nextMembershipState(current, input)`, defined in
`functions/src/hostMemberships/stateMachine.ts`. Its inputs are a provider
snapshot or a local intent (`memberPause`, `memberResume`, `memberCancel`,
`hostPause`, `hostResume`), plus `nowMillis`.

```
            (checkout authorized; start_at in future)
   ┌──────────────► trialing ──────────────┐
   │                    │ charged/activated │
 created ──activated/charged──► active ◄────┘
                         │  ▲      │ ▲
          memberCancel   │  │      │ │ resumed / hostResume / memberResume
              ▼          │  │      ▼ │
          canceling      │  │    paused
              │ period   │  │ charged (recovered)
              │ end /    ▼  │
              │ cancelled past_due ──halted / grace over──┐
              ▼                                            ▼
           expired ◄──────── cancelled / completed ──── expired
```

| Provider subscription status | Membership status |
| --- | --- |
| `authenticated` with `start_at` in the future | `trialing` |
| `active` | `active`, or `canceling` when `cancelAtPeriodEnd` |
| `pending` (a charge failed and is being retried) | `past_due`, setting `pastDueSinceMillis` |
| `halted` (retries exhausted) | `expired` with reason `paymentFailed`. A later `active` snapshot of the same subscription revives it ([D-10](#decisions)). |
| `paused` | `paused`, with `pause.initiator` from the local intent; an unknown initiator is treated as `member` |
| `cancelled` | `expired` with reason `memberCanceled` or `providerCanceled` |
| `completed` or `expired` | `expired` with reason `planCompleted` |
| `created` | No membership; the checkout stays `open` |

Each transition also maintains three things:

- **Tenure.** `stretchStartedAtMillis` starts when the membership becomes
  entitled. The stretch is folded into `accumulatedMillis` when it stops being
  entitled.
- **Member since.** `memberSinceMillis` is set once.
- **Counters.** `activeMemberCount` on the plan and `memberCount` on the program
  move in the same transaction when a membership enters or leaves `expired`.

A transition to the same status with the same period is a no-op. It does not
bump `revision`.

Host billing pause is done by `processHostMembershipBillingPause`, which runs
every 10 minutes. It takes programs in `pausing` or `resuming` and works through
up to 50 memberships per program per run with a cursor:

- **Pausing** applies to `active`, `trialing` and `past_due` memberships. It
  calls provider `pause` and sets `pause.initiator = host`.
- **Resuming** applies only to memberships paused by the host.

When the cursor is exhausted, the program state becomes `paused` or `active`.
New joins are refused while the program is not `active`.

## 8. CRM fields and segments

The CRM projection works as follows:

- A trigger on `hostMemberships/{id}` (`onHostMembershipAudienceProjected`) finds contacts
  where `organizerId == m.organizerId` and `linkedUid == m.uid`, writes the
  `membership` summary, and rebuilds traits. This follows
  `projectOrganizerCommunicationPreference`.
- `refreshHostMembershipSegments` runs daily at 03:10 IST. It rebuilds traits for
  contacts whose time-window segments may have changed: contacts with a
  membership, and contacts with `attended60DayCount > 0`. Each run is bounded to
  2,000 documents of each kind, pages of 200 and an 8-minute budget; projection
  receipts keyed by the run make retries idempotent. Beyond that bound a
  contact is refreshed on the next run or by its next organic rebuild.
- Traits written before version 4 have no `attended60DayCount`, so the second
  query cannot find them. Such a contact enters `frequent_non_member` at its
  next organic rebuild (any booking, check-in or CRM write), not on the first
  nightly run.
- `organizerAudienceDefinitionVersion` is bumped from 3 to 4, which invalidates
  the stored definitions.

The four segments, version 4:

| Segment id | Rule | Qualification |
| --- | --- | --- |
| `active_member` | Membership is entitled (§5.1), or paused by the host | |
| `lapsed_member` | Membership is `expired` and the member was ever a member | Never applied to people who were never members |
| `member_no_recent_attendance` | `active_member`, and no check-in in the trailing 30 days | Uses check-ins, not bookings |
| `frequent_non_member` | Not `active_member`, and at least 4 checked-in events in the trailing 60 days | Includes lapsed members. A prime upsell audience. |

The Customers list gets a "Membership" filter group containing these four
segments. The customer detail screen gets a Membership row showing tier, status
and member-since. The list row badge priority puts `active_member` first.

Segments never use dating-private data. They follow the guardrails in
`docs/host_product.md`.

## 9. Surfaces

### 9.1 Consumer (`apps/consumer`, shared `lib/host_memberships/**`)

- **Organizer page memberships section.** Published plans, with price, benefits,
  perks and a Join button. Join runs `prepare`, opens the Razorpay
  authorization URL, then watches the checkout and membership.
- **My memberships** (`/memberships`), reached from the profile:
  - each membership's status chip, plan, price and interval, next renewal or end
    date, and member-since;
  - **Saved so far**, the sum of `savingsInPaise` over unreleased benefit uses;
  - actions, with a confirmation dialog for Pause and Cancel. They are offered
    only where the server accepts them:

    | Status | Actions |
    | --- | --- |
    | `active`, `trialing` | Pause, Cancel at period end |
    | `paused` by the member | Resume |
    | `past_due` | Cancel at period end |
    | `paused` by the host, `canceling`, `expired` | None |
- **Event dock:**
  - an entitled member sees "Member price" with the list price struck through,
    or "Included with membership";
  - a non-member sees an upsell banner, for example "Members pay ₹0 · Join
    Sunday Runners for ₹499/mo". It opens the plan sheet.
  - The restriction copy reads "Members-only event" or "Member early access ·
    general sale opens Tue 6 pm".
- **Settings.** A "Memberships" row in the account section of Settings, after
  Payment history, shows one badge per current membership ("Member · Sunday
  Runners") and opens My memberships ([D-17](#decisions)).

### 9.2 Host (`apps/host`, `lib/hosts/presentation/memberships/**`)

- **Memberships** (Organizer settings, then Memberships):
  - program status, payment account readiness (the host's Razorpay connection
    for `hostCollected`, the Route account for `platformSplit`), the
    host-facing reason memberships are unavailable, and billing pause;
  - the plan list with member counts;
  - a plan editor covering name, description, monthly and annual prices, cap,
    trial, benefits, perks and the booking cap.
  - The editor shows a pricing hint: a plan that includes events should be priced
    at least at the host's typical monthly ticket spend per regular ([D-12](#decisions)).
- **Event editor membership-rules section.** Per-plan member price (percent off
  or fixed; 100% means included), early-access hours, and a members-only toggle.
  It shows the computed general-sale time. It saves through
  `manageEventMembershipRules`.
- **Badges.** A `member` roster insight signal shows a "Member" badge on
  operator/check-in rows and manage-roster rows. Like viewer state, the signal
  is returned only when the request sets `includeHostMembership: true`, so older
  Host builds keep parsing the strict response ([Q-6](#open-questions)). The
  member badge sorts first and shows even before the roster is check-in ready.
- **CRM.** The filter group, row badge and detail row from [§8](#8-crm-fields-and-segments).

## 10. Security rules

| Path | Read | Write |
| --- | --- | --- |
| `hostMembershipPrograms/{organizerId}` | Denied to clients; served by the callable | `false` |
| `hostMembershipPlans/{planId}` | Any signed-in user when `resource.data.status == "published"` | `false` |
| `hostMemberships/{id}` | Signed-in user when `resource.data.uid == request.auth.uid` | `false` |
| `hostMembershipCheckouts/{id}` | Owner (`uid`) only | `false` |
| `hostMembershipBenefitUses/{id}` | Owner (`uid`) only | `false` |
| `hostMembershipCharges/{id}` | Denied | `false` |
| `hostMembershipWebhookReceipts/{id}` | Denied | `false` |
| `eventMembershipRules/{eventId}` | Denied; served through viewer state and the host callable | `false` |

Host managers read members only through the CRM and roster callables, which
already enforce `requireOrganizerManager`
(`functions/src/shared/organizerManagerAuthority.ts`). Callables use
`appCheckCallableOptionsWithLimits` and per-uid `checkRateLimit`, and validate
input against Ajv contracts.

The webhook has no auth beyond the HMAC signature and the account, project and
notes checks. Secrets live only in the pinned Secret Manager version.

## 11. Test plan

Functions unit tests use `node:test` beside the source:

- `entitlement.test.ts`:
  - entitled statuses, the grace window, and host pause compared with member
    pause;
  - override, then plan discount, then list price;
  - percent rounding and the 100-paise floor;
  - members-only and early-access restrictions;
  - the booking cap;
  - upsell selection, tie-breaking and the capacity filter.
- `stateMachine.test.ts`:
  - every row of the mapping table;
  - out-of-order events;
  - duplicate no-ops;
  - tenure accumulation across pause and rejoin;
  - counter deltas;
  - revival after `halted`.
- `razorpaySubscriptionProvider.test.ts`:
  - request shapes with a fake `fetchImpl`, for the platform key and the
    merchant OAuth token;
  - strict parsing;
  - webhook HMAC verification, including a tampered body and a wrong secret;
  - the Subscriptions probe (enabled, not enabled, expired token, outage);
  - merchant webhook reuse and creation;
  - transfer recovery.
- `webhook.test.ts`:
  - with an in-memory Firestore fake: signature rejection and unknown
    connections;
  - a foreign account or project gives zero writes;
  - dedupe;
  - activation creates the membership with its binding;
  - a `hostCollected` charge records frozen terms with no fee or transfer,
    and the statement read returns it;
  - a merchant account cannot apply a checkout bound elsewhere;
  - a `platformSplit` charge creates the transfer minus the at-source fee;
  - `pending` makes it `past_due`;
  - `cancelled` makes it `expired`.
- `callables.test.ts`: program, plan, checkout, self-serve and event-rules
  callables, covering authority, validation, cap and pause gates, every
  unavailable reason, and checkout failing closed when the bound mode can no
  longer run.
- `functions/src/commercialTerms/*.test.ts`: merge and override precedence,
  snapshots, the resolver and the audited admin callable.
- `organizerAudienceModel.test.ts` additions: the four segments and window
  boundaries.
- `publicRegistration/policy` additions: the member-price quote and the refusal
  of a 0 price.

Rules tests in `functions/test/firestore.rules.test.cjs`, each named in
`tool/contracts/firestore_contract.json`:

- an owner reads their membership, checkout and benefit uses, and other users
  cannot;
- anyone signed in reads published plans but not drafts;
- programs, charges, receipts and event rules are server-only;
- every client write is denied.

Flutter tests:

- Unit tests:
  - model parsing for plans, memberships, status and entitlement chips;
  - savings totals;
  - the pricing hint;
  - viewer-state parsing of the new fields and restrictions.
- Widget tests:
  - My memberships, for list, savings and actions;
  - plan draft validation and the Host Memberships section (payout gate,
    billing pause, plan list);
  - the event dock upsell, member price, restrictions and booking-cap note;
  - CRM filter mapping exhaustiveness;
  - the roster member badge.
- Widgetbook previews for every new public widget, with an offline render test
  in `widgetbook/test/host_membership_previews_test.dart`.
- Goldens are required only for new public `Catch*` primitives under
  `lib/core/widgets`. This feature adds none.
- New public feature widgets get Widgetbook use cases (`design:new-widget-inventory`).

Manual QA, in Razorpay **test mode** only:

1. Create a plan in each interval.
2. Subscribe with the test UPI or card mandate.
3. Trigger `subscription.charged` through the test dashboard. For
   `hostCollected`, check the charge on the host's test account and its
   `hostMembershipCharges` row with terms and no transfer. For
   `platformSplit`, check the transfer on the test linked account.
4. Pause, resume and cancel.
5. Run a host billing pause.
6. Simulate a failed payment using Razorpay's test-mode failure card.

## 12. MVP compared with phase 2

| Area | MVP (this PR) | Phase 2 |
| --- | --- | --- |
| Plans | Tiers, monthly and annual, cap, trial, typed benefits (`eventDiscount`, `earlyAccess`, `membersOnlyAccess`), free-text perks, booking cap | Credits and quotas ("N events a month"), guest passes, plan switching with proration |
| Event rules | Member price override (percent or fixed; 100% means included), early-access hours, members-only | Reserved member capacity, plus a cap on member share of capacity (crowd-out) |
| Payments | Razorpay Subscriptions on the host's own account (`hostCollected`) or Catch's account with a Route split (`platformSplit`), hosted authorization link, charges recorded with frozen commercial terms, webhook and pull reconciliation | Native in-app subscription checkout, refunds of membership charges, a Catch-as-merchant mode, Stripe Connect Express with Stripe Billing on connected accounts |
| Lifecycle | All six statuses, member pause, resume and cancel at period end, host-wide billing pause | Undo of a scheduled cancel, host-initiated removal with refund, dunning messaging |
| Badges | Own profile, attendee and check-in rows | Tenure badges, opt-in public-profile badge |
| CRM | Membership fields, four segments, filter, detail row | Welcome, failed-payment and win-back automations through Inbox |
| Checkout | Viewer-state member price and restrictions, free path, website paid path, app upsell | Website upsell, member pricing on waitlist offers and non-INR |

## 13. Rollout, migration and deploy

1. **No backfill.** Every collection is new. CRM traits gain optional fields,
   and `definitionVersion` 4 is reached by the daily refresh plus organic
   rebuilds. Hosts with no members are unaffected. To refresh at once,
   `refreshHostMembershipSegments` can be invoked manually for one organizer.
2. **Configuration (test first).** Nothing is hard-coded; an operator sets:
   1. Commercial terms: `manageCommercialTerms` `replace` with
      `organizerId: null` and the owner's terms (5% commission, ₹10,000 cap
      per 30-day cycle before GST, net of refunds, 30-day trial, ₹5,000
      tools-only fee, host bears gateway fees, `hostMembership` counting
      toward commission with no at-source fee).
   2. The membership route: `managePaymentRoutingPolicy` `replace` on the app
      policy with `hostMembership: {route: "razorpayOAuth", mode: "test",
      currency: "INR", merchantCountry: "IN"}`, keeping `formFee` and
      `eventAdmission` as they are.
   3. The partner OAuth configuration ticketing already uses
      (`FORM_RAZORPAY_PARTNER_CONFIG_VERSION`).
3. **Razorpay, per host (test first).** The host connects their Razorpay test
   account in Payments and turns on Subscriptions there. Turning memberships on
   then registers the membership webhook on that account automatically.
   `platformSplit` instead needs Subscriptions and Route on the platform
   account, a platform webhook at `hostMembershipRazorpayWebhook` without a
   query using the pinned config's `webhookSecret`, and the
   `hostMembership.atSourceFeeBasisPoints` term.
4. **Firebase deploy order.** This follows `docs/release_operations.md`:
   1. `firestore.indexes.json`;
   2. `firestore.rules`;
   3. Functions: the new callables, webhook and schedules, plus the changed
      `getEventViewerState`, `signUpForFreeEvent`, `managePublicEventCheckout`
      and audience projection;
   4. the Host and Consumer apps.
3. **Firebase deploy order.** This follows `docs/release_operations.md`:
   1. `firestore.indexes.json`;
   2. `firestore.rules`;
   3. Functions: the new callables, webhook and schedules, plus the changed
      `getEventViewerState`, `signUpForFreeEvent`, `managePublicEventCheckout`
      and audience projection;
   4. the Host and Consumer apps.

   Older app builds keep working: the new viewer-state and roster fields are
   returned only to clients that send `includeHostMembership: true`
   ([Q-6](#open-questions)).
5. Hosts enable memberships per organizer. No global flag is needed, because
   nothing changes until a program is enabled and a plan is published.
6. **Records from the platform-account model.** Programs, checkouts,
   memberships, prices and charges without `moneyFlow`/`payment` read as
   `platformSplit` on Catch's platform account, so any existing subscription
   keeps working there. Memberships never launched under that model, so none
   are expected.

## Decisions

These decisions were made while writing the spec. Each can be revisited in
review.

- **D-1 Naming.** The existing `organizerCommunityMemberships` ("community
  membership") is an unpaid, host-approved admission grant. `clubMemberships`
  are follows, and `organizerEntitlements` are SKUs Catch sells to hosts. The
  paid feature therefore uses the distinct prefix `hostMembership*` and the code
  roots `functions/src/hostMemberships/`, `lib/host_memberships/` and
  `lib/hosts/presentation/memberships/`. The existing `admission.format:
  "membersOnly"` keeps meaning community membership. The paid members-only flag
  lives in `eventMembershipRules.membersOnly`.
- **D-2 Branch.** This cloud session is pinned to the branch
  `claude/eloquent-davinci-j2h144`, created from `main` at `ac60fb78`. The
  brief's suggested name `claude/host-memberships` was not used.
- **D-3 Separate event rules document.** Rules live in `eventMembershipRules`,
  not in `eventPolicy`. Policy is hashed into the seat ledger and locks after the
  first booking (`eventPolicyMutation.ts`). Member pricing must stay editable,
  and must not need changes in the 2,000-line `mutateEvent.ts`.
- **D-4 Hosted authorization link.** The existing native coordinator
  (`apps/consumer/lib/razorpay_checkout_adapter.dart`) is order-only, and the
  app's native INR order flow is retired. The MVP therefore opens Razorpay's
  `short_url` for mandate authorization and relies on webhooks plus pull refresh.
  This works on iOS, Android and web without plugin changes.
- **D-5 Price changes grandfather existing members.** Razorpay plans are
  immutable. A new price creates a new provider plan, and existing subscriptions
  keep theirs.
- **D-6 ₹15,000 ceiling.** Plan prices are capped at ₹15,000 per charge, so
  every renewal stays inside the RBI e-mandate no-re-authentication limit.
  Annual plans above that are refused.
- **D-7 Entitlement while paused.** When the host pauses billing (a seasonal
  break), members keep their entitlements and badge. The host chose the pause,
  and members should not lose access to any one-off event. When a member pauses
  themselves, entitlements stop and the badge shows "Paused".
- **D-8 Website checkout and included members.** Public paid checkout requires
  at least ₹1. A member whose price is 0 books through the app's free path, and
  the website tells them so. Discounted members (₹1 or more) pay the member
  price on the website.
- **D-9 Non-INR and waitlist offers stay at list price.** Memberships are INR
  only. The waitlist-offer accept path (`waitlistOffers.ts`) keeps list price in
  the MVP, to avoid changing offer pricing semantics. Members-only and
  early-access restrictions still apply on the paths that call
  `signupPolicyDecision`.
- **D-10 Halted means expired.** After Razorpay exhausts retries (`halted`),
  access ends with `expired` and reason `paymentFailed`. If the same
  subscription later reports `active`, it is revived and tenure resumes.
- **D-11 No public-profile badge.** Membership of a specific club would reveal a
  member's routine on a dating profile. The MVP shows badges to the member
  themselves and to that host's operators only. An opt-in public badge is
  phase 2.
- **D-12 Pricing hint is advisory.** The hint compares the monthly price with
  the host's typical event price times an assumed 4 events a month. It never
  blocks saving.
- **D-13 Early-access anchor.** Events have no sale-start field. The window is
  anchored when the host first enables early access on the event: general sale
  opens at `anchor + hours`, which must be before event start. Changing the hours
  recomputes from the same anchor.
- **D-14 Past-due grace.** Members keep entitlements for 3 days after
  `currentPeriodEnd` while Razorpay retries.
- **D-15 Own webhook endpoint.** Membership events use their own Razorpay
  webhook and function, so the form and event inbox (`organizerFormPaymentWebhook`)
  and its receipt-prefix dispatch stay unchanged.
- **D-16 No second-plan upsell.** A current member of the organizer, including
  one whose plan gives no discount on the event, is not shown an upsell. This
  avoids offering a second concurrent subscription to the same host; plan
  switching is phase 2.
- **D-17 Badge in Settings.** The consumer app's own-profile surface is the
  dating profile editor, so the member badges and the My memberships entry sit
  in Settings next to Payment history instead. This keeps [D-11](#decisions).
- **D-18 Account deletion ends memberships.** Account deletion cancels each
  live subscription immediately through the provider and expires the
  membership. A provider failure is logged for operator recovery and never
  blocks deletion.

- **D-19 Host-collected money flow (owner, 30 Oct).** Membership money goes
  to the host's own Razorpay account through the existing OAuth connection,
  as ticketing does. Catch is not merchant of record, holds no GSTIN, takes no
  fee at source and bills its commission afterwards from the charge ledger.
  The Route split stays available as `platformSplit`, off unless selected,
  because the owner may switch to it or to Catch-as-merchant later
  ([decision](https://github.com/torana-labs/catch-knowledge/blob/main/decisions/2026-10-30-membership-money-flow-and-commercial-terms.md)).
- **D-20 One money-flow switch.** The membership mode is the routing policy's
  `hostMembership` route, the same audited switch with organizer overrides
  that tickets and form fees use. Commercial terms hold only the economics, so
  the money flow is never configured in two places.
- **D-21 Bindings are snapshots.** Programs, checkouts, memberships, prices and
  charges record the account they were created on. Every provider call for an
  existing subscription uses its own binding, so switching mode or
  reconnecting changes only new members. A program with members cannot
  change binding.
- **D-22 Verify Subscriptions, do not assume it.** Enabling probes
  Subscriptions on the host's account and fails closed with a host-facing
  reason (§6.0.1).
- **D-23 Per-connection membership webhook.** Catch registers its membership
  webhook on each host's account with the connection's existing webhook
  secret and routes it by `connectionId`, keeping D-15's separate endpoint.
- **D-24 Terms frozen per charge.** Each charge freezes the terms in force when
  it is captured, so a renewal months later follows the terms of its cycle and
  a later edit never rewrites a recorded charge.

## Open questions

- **Q-1 Platform fee.** *Resolved by the owner, 30 Oct* ([decision](https://github.com/torana-labs/catch-knowledge/blob/main/decisions/2026-10-30-membership-money-flow-and-commercial-terms.md)).
  Memberships count toward the ticketing commission (5% of net sales, capped
  at ₹10,000 per rolling 30-day cycle per host, before GST); nothing is
  deducted at source. See [D-19](#decisions) and
  [#1126](https://github.com/torana-labs/catch-dating-app/issues/1126).
- **Q-2 GST and invoicing.** *Resolved by the owner, 30 Oct* ([decision](https://github.com/torana-labs/catch-knowledge/blob/main/decisions/2026-10-30-membership-money-flow-and-commercial-terms.md)).
  The host is merchant of record and invoices its members; Catch holds no
  GSTIN and bills its commission to the host afterwards. Hosts bear gateway
  charges.
- **Q-3 Undo cancel.** Should a scheduled cancellation be reversible? Razorpay
  has no direct API for it; it may need a new subscription at period end.
- **Q-4 Host removal.** Should hosts be able to remove a member, with or without
  a refund? This is excluded from the MVP.
- **Q-5 Trial authorization.** Razorpay may charge a refundable authorization
  amount for trials. Should the copy say so? This needs to be confirmed in test
  mode.
- **Q-6 Old app builds.** *Resolved in the build.* `EventViewerState.fromResponse`
  and the roster-insights parser validate keys strictly, so the new fields are
  returned only behind the request flag `includeHostMembership: true`. Older
  builds instead receive the generic `membershipRequired` or `eventUnavailable`
  restriction for a members-only or early-access event.
- **Q-7 Crowd-out.** Should members-only or included events reserve a minimum
  number of non-member seats by default? This is proposed as a phase-2 capacity
  share.
