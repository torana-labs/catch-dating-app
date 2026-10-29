# Catch Host Privacy Inventory

This is the record of the App Privacy declaration that is live for `Catch Host`
(`com.catchdates.host`, app id `6778927317`). It is reconciled against what the
submitted build collects.

The declaration was published in App Store Connect on 2026-10-20 with 18 data
types. On 2026-10-23 at about 09:35 UTC it was updated with Performance Data and
Other Data Types, so it now lists 20 types. It covers iOS `1.0.1` build
`202610200000357901`, produced from source `171c1cb07`.

Evidence comes from:

- the ignored local evidence in `build/store-upload/`:
  `apple-privacy-published.png`, `apple-privacy-publish-confirmation.png` and
  `host-store-progress-20261020.json`
- a source read of `171c1cb07` and `origin/main` `3c930f24b` on 2026-10-22
- the 2026-10-23 update, published in App Store Connect with the owner's
  approval and reported by the launch-readiness session

## Published App Privacy declaration

**Privacy policy URL:** `https://catchdates.com/privacy/`. No Privacy Choices
URL is set.

**Tracking:** No. The product page has no "Data Used to Track You" section.

**Linkage:** 19 of the 20 published types are linked to the user. Performance
Data is the only type not linked.

| Apple category | Published data types |
| --- | --- |
| Contact Info | Name, Email Address, Phone Number |
| Financial Info | Payment Info, Other Financial Info |
| Location | Precise Location, Coarse Location |
| Contacts | Contacts |
| User Content | Emails or Text Messages, Photos or Videos, Customer Support, Other User Content |
| Identifiers | User ID, Device ID |
| Purchases | Purchase History |
| Usage Data | Product Interaction |
| Diagnostics | Crash Data, Other Diagnostic Data, Performance Data (added 2026-10-23, not linked) |
| Other Data | Other Data Types (added 2026-10-23, linked) |

Known purposes:

- Crash Data, Other Diagnostic Data and Purchase History are each declared as
  "Used for App Functionality".
- Performance Data and Other Data Types are each declared for Analytics, with
  no tracking.
- The purposes for the other 15 types are not captured in the local evidence.
  The live App Privacy page is their record.

## What the submitted build collects

Source `171c1cb07` is the code in build `202610200000357901` and Android
`457901`. It differs from today's `main` in one way that matters for privacy:
it has **no Host analytics hold**.

| Area | Submitted build (`171c1cb07`) | `origin/main` (`3c930f24b`) |
| --- | --- | --- |
| Firebase Analytics | Collecting in prod release builds. Screen views of route names through `AnalyticsRouteObserver`, product events, and `setUserId(<Firebase UID>)` from `host_app_shell.dart`. Google Analytics derives general location from masked IP addresses. | Off. The native `FIREBASE_ANALYTICS_COLLECTION_DEACTIVATED` key is set and `AppAnalytics.hostProductMeasurementEnabled = false` (PR #726). |
| Crashlytics | Collecting, with a `user_id` custom key | Same |
| Firebase Messaging | FCM token and installation id stored under `users/{uid}/pushInstallations` | Same |
| Google Maps 9.4.0 | Linked. Its SDK privacy manifest declares Crash Data, Performance Data, Product Interaction, Device ID and Other Data Types. | Same |
| In-app Privacy/Terms/Help links | Absent. The Account menu has only Delete account. | Present in the Account menu since PR #738, merged 2026-10-22 |

Both builds share these features and the same Host native graph
(`apps/host/ios/Podfile.lock`):

- the Razorpay Route payout form (bank, IFSC, PAN)
- opt-in live route location sharing
- roster file import
- the selected-contact picker, held by Remote Config
  `host_wedding_phone_import_enabled = false`
- inbox chat
- photo uploads
- phone OTP sign-in

## Reconciliation: published types against the submitted build

| Apple data type | Published | Collected by the submitted build | Source | Result |
| --- | --- | --- | --- | --- |
| Name | Yes | Yes | Host profile; payout contact, beneficiary and stakeholder | Matches |
| Email Address | Yes | Yes | Payout business and stakeholder email | Matches |
| Phone Number | Yes | Yes | Phone OTP sign-in; business and stakeholder phone | Matches |
| Physical Address | No | No | — | Matches |
| Payment Info | Yes | No direct card or bank payment entry by the Host user | — | Over-declared; acceptable |
| Other Financial Info | Yes | Yes | Razorpay Route bank, IFSC and PAN | Matches |
| Precise Location | Yes | Yes | Opt-in live route sharing | Matches |
| Coarse Location | Yes | Yes | Firebase Analytics IP-derived general location | Matches |
| Contacts | Yes | Yes | Roster import and customer records. The selected-contact import is held off by Remote Config. | Matches |
| Emails or Text Messages | Yes | Yes | Inbox chats and broadcasts | Matches |
| Photos or Videos | Yes | Yes | Organizer and event images | Matches |
| Customer Support | Yes | No in-app support form | — | Over-declared; acceptable |
| Other User Content | Yes | Yes | Organizer pages, events, forms, posts, reports | Matches |
| User ID | Yes | Yes | Firebase UID; Crashlytics key; Analytics user ID | Matches |
| Device ID | Yes | Yes | FCM installation; Analytics app instance ID; Google Maps SDK | Matches |
| Purchase History | Yes | No in-app purchases | — | Over-declared; acceptable |
| Product Interaction | Yes | Yes | Firebase Analytics screens and events; Google Maps SDK | Matches |
| Crash Data | Yes | Yes | Crashlytics; Google Maps SDK | Matches |
| Other Diagnostic Data | Yes | Yes | Crashlytics keys and logs; Firebase SDK telemetry | Matches |
| Performance Data | Yes, since 2026-10-23 (Analytics, not linked) | Yes, per SDK manifest | The Google Maps 9.4.0 manifest declares `NSPrivacyCollectedDataTypePerformanceData` (not linked, Analytics). Firebase Sessions also ships with Crashlytics. | Matches |
| Other Data Types | Yes, since 2026-10-23 (Analytics, linked) | Yes, per SDK manifest | The Google Maps manifest declares `OtherDataTypes` (linked, Analytics), and so does the Firebase Messaging manifest (not linked, Analytics). | Matches |
| Health, Fitness, Credit Info, Sensitive Info, Audio, Gameplay, Browsing History, Search History, Advertising Data, Other Usage Data, Surroundings, Body | No | No | — | Matches |

Possible purpose gaps. These are not visible in the local evidence:

- **Crash Data.** The Google Maps SDK declares Crash Data for Analytics, but
  the published Crash Data purpose is App Functionality only.
- **Device ID, Product Interaction and Coarse Location.** Because the submitted
  build runs Firebase Analytics, each of these needs the Analytics purpose. The
  local evidence does not show their published purposes.

The SDK-manifest rows come from the `PrivacyInfo.xcprivacy` files in the
locally installed Host pods, which match `Podfile.lock` for Google Maps 9.4.0.
Xcode Organizer → Generate Privacy Report on the archive gives the aggregate for
the exact binary.

## Why tracking is "No"

These facts hold for the submitted build:

- No App Tracking Transparency prompt and no `NSUserTrackingUsageDescription`.
  Without ATT authorization, the IDFA is zeroed even though
  `GoogleAppMeasurement/IdentitySupport` is linked.
- A live read of Google Analytics property `526484083` (account `365970973`)
  on 2026-10-20 found:
  - Google Signals off
  - zero links to Google Ads, AdMob, Display & Video 360 or Search Ads 360
  - "Google products and services" sharing off
- No advertising SDK or ad placements.
- The server-side Host acquisition Meta delivery
  (`functions/src/acquisition/metaPayload.ts`) sends only website `Lead`
  events. The pilot activation receipt has no vendor delivery.

## Collection changes after the submitted build

Builds produced from `origin/main` after PR #726 stop the Firebase Analytics
collection. That collection is the source of the Analytics user ID, screen
views and IP-derived Coarse Location. The published Coarse Location row then
becomes an acceptable over-declaration. Product Interaction and Device ID stay
collected through the Google Maps SDK and FCM.

If the Host analytics hold is lifted, collection becomes consent-gated: the
seven allowlisted events in `lib/platform/analytics/host_analytics_policy.dart`,
with no analytics user ID, no screen views, and advertising consent denied. The
declaration already covers that.

The wedding selected-contact import is covered by the Contacts row whenever
Remote Config enables it.

## Google Play declarations (same source)

These declarations were saved and submitted with the closed-test changes on
2026-10-21:

- **Advertising ID:** Yes, purpose Analytics. Firebase Analytics merges the
  `AD_ID` permission.
- **Data safety:** "No data shared with third parties". The collected-data
  section is not captured in the local evidence; Play Console is its record.
- **Target audience:** 18 and over.
- **Other declarations:**
  - Ads: No
  - Government app: No
  - Health features: No
  - Financial features: No

## Privacy policy coverage

The live policy at `https://catchdates.com/privacy/` (effective 10 August 2026)
names Torana as operator. It covers account and profile data, messages, host
actions, crash and diagnostic information, approximate location, and precise
location where a feature needs it.

It does not mention these Host-specific categories:

- payout KYC data (bank account, PAN)
- organizer-uploaded guest and contact lists
- named processors (Google/Firebase, Google Maps, Razorpay, Stripe)

## Safety and account controls in the submitted build

| Control | Location | Status |
| --- | --- | --- |
| Delete account | Organizer tab → Account menu → Delete account (PR #713) | Present. The production deletion release and index repair passed a live deletion test on a disposable fixture. |
| Report / block | Inbox → guest conversation → actions menu | Present |
| Privacy policy, Terms, Help & support | Organizer tab → Account menu | Absent from build `202610200000357901`. Added on `main` by PR #738, merged 2026-10-22. |
| Public deletion instructions | `https://catchdates.com/help/` | Live (PRs #717 and #722) |
