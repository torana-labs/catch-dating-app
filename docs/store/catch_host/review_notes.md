# Catch Host App Review Notes

This is the record of reviewer access for the `Catch Host` submissions and the
payment and review posture of the submitted build. That build is iOS `1.0.1`
(`202610200000357901`) and Android `1.0.1` (`457901`), both from source
`171c1cb07`.

## Reviewer access on file

| Item | Record |
| --- | --- |
| Sign-in method | Firebase phone authentication with a 6-digit one-time code. No password and no Google or Apple sign-in, so Guideline 4.8 does not apply. |
| Reviewer account | Prod fixture user `catch_host_store_reviewer` |
| Reviewer organizer | Prod fixture organizer `catch_host_store_review`, with a private sample event (no public registration). Web sign-in and private event creation were verified on 2026-10-20. |
| App Store Connect | Reviewer phone, code and review notes saved in App Review Information |
| Play Console | App access (reviewer access) saved |
| Credential storage | Only in the consoles and the private local file `build/store-upload/host-reviewer-private.json`. Never in this public repository. |
| Account deletion testing | Deletion acceptance used a separate disposable fixture. The shared reviewer account and any account that owns an organizer must not be deleted. |

The review-notes text submitted to Apple, including the additions saved on
2026-10-22, is in App Store Connect and is not reproduced here.

## Payments and in-app purchase posture

This section records the 2026-10-22 audit against Guidelines 3.1.1, 3.1.3(c),
3.1.3(e) and 3.1.3(f). The findings hold for both `171c1cb07` and `origin/main`.

**What was searched.** The Host native graph (`apps/host/ios/Podfile.lock`)
has no StoreKit or `in_app_purchase`. The Host routes in
`lib/routing/go_router.dart` and the Host-audience copy in
`lib/l10n/app_en.arb` contain no plan, subscription, trial, upgrade, price for
Catch Host, or "pay Catch" call to action. The only plan-like UI is the weekly
post quota ("{remainingQuota} of {weeklyQuota} posts left this week" and
"Weekly limit reached"), which has no paid path.

### Money flows reachable in the Host app

| Flow | Source | What happens | Guideline position |
| --- | --- | --- | --- |
| Payout account | `lib/hosts/presentation/payments/host_payment_account_card.dart` | Razorpay Route KYC form in the app. Stripe onboarding opens Stripe's hosted page. | The host receives funds for in-person events. Not a purchase. |
| Form-fee payment connection | `lib/hosts/presentation/forms/host_form_payment_section.dart` | OAuth to the organizer's own payment provider | The organizer collects fees from applicants. Not a purchase. |
| Event offers | `lib/hosts/presentation/forms/host_response_offer_screen.dart` | Shares a guest payment link for an in-person event | 3.1.3(e): physical services paid outside IAP |
| Paid event tickets | Guests on the web | Provider checkout on `catchdates.com` | 3.1.3(e) |

### Commercial model

Catch plans to bill organizers ₹5,000 per month for tooling, outside the app.
The posture this relies on is 3.1.3(f): the app is a free stand-alone
companion to a paid service. Where the customer is an organisation, 3.1.3(c)
also applies. Under 3.1.3(f), the app and its metadata may contain no
purchasing and no call to action for purchase outside the app. That covers
prices, "subscribe", "upgrade", "start trial", "contact sales to unlock" and
links to pricing or payment pages.

An organizer whose paid access has lapsed must see neutral status copy with no
price, link or purchase prompt. Nothing in the Host app gates features on paid
status today.

### External pages the Host app opens

| Destination | Opened from | State on 2026-10-22 |
| --- | --- | --- |
| `https://catchdates.com/privacy/`, `/terms/`, `/help/` | Organizer → Account menu on `main` since PR #738 (merged 2026-10-22). The submitted build has no such links. | HTTP 200. Every page carries the site header with "Pricing and access" (`/host/#pricing`) and "Apply for a pilot" (`website/src/content/site.ts`). `/host/#pricing` says the pilot is free and lists no purchasable tiers (`website/src/content/hostProduct.ts`). |
| `https://catchdates.com/host/organizer/<id>/messaging` | Organizer → messaging setup → "Connect WhatsApp Business" on iOS and Android (`lib/platform/device/external_links.dart`, `openHostMessagingSetup`). Present in `171c1cb07`. | HTTP 404. No website route is registered in `design/website/routes.json`. |
| Stripe hosted onboarding, provider OAuth pages, `wa.me` handoffs, map directions | Payout setup, form payments, guest messaging, events | Third-party destinations with no Catch pricing |

## Review-facing facts about the submitted build

- **In-app legal links.** The build has no in-app Privacy policy link
  (Guideline 5.1.1(i)); account deletion is the only Account menu item. PR #738
  adds Privacy policy, Terms and Help & support to that menu.
- **Purpose strings.** `apps/host/ios/Runner/Info.plist` uses consumer purpose
  strings:
  - Location: "find nearby events". Host uses location only for live route
    sharing.
  - Camera: "scan host QR codes". The QR scanner lives only in the consumer
    companion route, though `mobile_scanner` is linked.
  - Calendars: "booked events".
  - Health: two Health strings, although the Host build has no HealthKit
    entitlement.
  - Motion: "Explore … wrist lift".

  Guideline 5.1.1(ii) expects each prompt to describe the actual use. Linear
  CAT-207 tracks this.
- **Messaging setup.** When the provider is not configured, the WhatsApp
  messaging-setup section shows "An administrator must configure the Catch Meta
  app and Embedded Signup configuration…". When it is configured, "Connect
  WhatsApp Business" opens the 404 URL above.
- **User-generated content (Guideline 1.2).** Guest conversations have Report
  and Block. Organizer content can be public on the website.
- **Account deletion (Guideline 5.1.1(v)).** Deletion is reachable in the app
  and works against the production backend.
