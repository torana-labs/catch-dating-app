<!-- GENERATED FROM design/features/host_feature_responsibilities.json. DO NOT EDIT. -->

# Host Organizer

Own the organizer as an operating entity: profile and media, publication readiness, defaults, Live Guide, team and host identity, payouts, insights, preview, and account-level controls.

## Ownership

- Primary route: `hostOrganizerScreen` (`/host/organizer`)
- Target root: `lib/hosts/organizer`
- Migration status: target boundary defined; implementation still lives in listed legacy Host roots
- Responsibility contract updated: 2026-09-22

Current implementation roots:

- `lib/hosts/organizer`
- `lib/hosts/presentation/payments`
- `lib/hosts/insights`

## This feature owns

- Own the /host/organizer destination, organizer selection, Edit, Insights, Preview, and settings spokes.
- Own organizer identity, type, contact data, media, publication coaching, and event defaults.
- Own team membership, ownership transfer, professional host profile, and hosted-organizer navigation.
- Own payout-account setup/status surfaces and organizer analytics query controls.
- Own account exit and organizer-level settings that do not belong to an event, audience, or communication workflow.

## This feature does not own

- Event inventory, Event Create internals, Event Manage mutations, or Today attention policy.
- Customer/audience membership, form authoring, message delivery, or shared public organizer-detail behavior.
- Provider-hosted onboarding internals, analytics computation, or backend authorization rules.

## Routes

Owned routes:

- `hostOrganizerScreen` — `/host/organizer`
- `hostOrganizersScreen` — `/host/organizers`
- `hostOrganizerEventDefaultsScreen` — `/host/organizers/event-defaults`
- `hostOrganizerLiveGuideScreen` — `/host/organizers/live-guide`
- `hostOrganizerTeamScreen` — `/host/organizers/team`
- `hostOrganizerPaymentsScreen` — `/host/organizers/payments`

Typed handoffs:

- `hostCreateOrganizerScreen` — `/host/organizers/create-organizer`
- `hostEventsScreen` — `/host/events`
- `hostAppEventManageScreen` — `/host/organizers/:organizerId/events/:eventId/manage`
- `hostOrganizerDetailScreen` — `/host/organizers/:organizerId`

## Key code owners

| Owner | Source | Responsibility |
|---|---|---|
| `OrganizerScreen` | `lib/hosts/organizer/organizer_screen.dart` | Actions: sign_in, retry_organizer_workspace, switch_organizer, open_organizer_setting. |
| `OrganizerPageEditScreen` | `lib/hosts/organizer/page_edit_screen.dart` | Actions: update_organizer, update_organizer_media. |
| `OrganizerSettingsScreen` | `lib/hosts/organizer/settings_screen.dart` | Actions: save_host_profile, open_legal_link, request_account_deletion, sign_out. |
| `HostOrganizerEditController` | `lib/hosts/organizer/edit/host_organizer_edit_controller.dart` | Actions: update_organizer, update_organizer_media. |
| `watchHostOrganizerScope` | `lib/hosts/organizer/organizer_controller.dart` | Actions: retry_organizer_setting. |
| `HostOrganizerDefaultsSaver` | `lib/hosts/organizer/edit/host_organizer_defaults_saver.dart` | Actions: save_event_defaults. |
| `HostInsightsScreen` | `lib/hosts/insights/host_insights_screen.dart` | Actions: retry_insights, select_insights_range, open_insights_event_report. |
| `HostEventReportScreen` | `lib/hosts/insights/host_event_report_screen.dart` | Actions: share_event_report, open_event_reviews, invite_event_guests, choose_event_guests, download_event_csv. |
| `OrganizerTeamScreen` | `lib/hosts/organizer/team_screen.dart` | Actions: add_host, remove_host, transfer_organizer_ownership. |
| `OrganizerPaymentsScreen` | `lib/hosts/organizer/payments_screen.dart` | Actions: connect_razorpay, refresh_razorpay, disconnect_razorpay, pay_bill. |
| `HostEventDefaultsScreen` | `lib/hosts/events/event_defaults_screen.dart` | Actions: save_event_defaults, retry_event_defaults_save. |
| `HostEventDefaultsDetailsScreen` | `lib/hosts/events/event_defaults_details_screen.dart` | Structural owner. |
| `OrganizerEventPolicyScreen` | `lib/hosts/organizer/event_policy_screen.dart` | Actions: save_event_defaults. |
| `OrganizerLiveGuideScreen` | `lib/hosts/organizer/live_guide_screen.dart` | Actions: save_event_defaults. |
| `HostTeamManagementController` | `lib/hosts/organizer/team/host_team_management_controller.dart` | Actions: add_host, remove_host, transfer_organizer_ownership. |
| `HostProfileController` | `lib/hosts/organizer/host_profile_controller.dart` | Actions: create_host_profile, save_host_profile. |
| `AuthSessionController` | `lib/pages/account/auth_session_controller.dart` | Actions: sign_out. |
| `HostShellScreen` | `lib/routing/shell/host_shell_screen.dart` | Actions: switch_organizer. |

## Shared dependencies

- `lib/contexts/organizers/data/organizers_repository.dart` — Transitional Organizer repository alias remains the canonical Flutter read/write seam during the domain cutover.
- `lib/contexts/payments/data/host_payment_account_repository.dart` — Provider-neutral payout account persistence and callable orchestration.
- `lib/routing/shell/host_shell_screen.dart` — The shell owns global destination navigation and organizer scope.

## Data contracts

- `contracts/callable_responses/get_organizer_crm_summary_response.schema.json`
- `contracts/callables/add_organizer_manager_payload.schema.json`
- `contracts/callables/create_razorpay_host_payment_account_payload.schema.json`
- `contracts/callables/create_stripe_host_onboarding_link_payload.schema.json`
- `contracts/callables/host_analytics_query_payload.schema.json`
- `contracts/callables/refresh_razorpay_host_payment_account_payload.schema.json`
- `contracts/callables/refresh_stripe_host_payment_account_payload.schema.json`
- `contracts/callables/remove_organizer_manager_payload.schema.json`
- `contracts/callables/transfer_organizer_ownership_payload.schema.json`
- `contracts/callables/update_organizer_payload.schema.json`
- `contracts/firestore/contact_permissions.schema.json`
- `contracts/firestore/event_attendees.schema.json`
- `contracts/firestore/host_analytics_snapshots.schema.json`
- `contracts/firestore/host_payment_accounts.schema.json`
- `contracts/firestore/host_profiles.schema.json`
- `contracts/firestore/organizer_team_memberships.schema.json`
- `contracts/firestore/organizers.schema.json`
- `contracts/storage/organizer_logo_images.schema.json`
- `contracts/storage/organizer_photos.schema.json`

## Focused tests

- `test/hosts/host_organizer_defaults_saver_test.dart`
- `test/hosts/host_organizer_identity_switcher_test.dart`
- `test/hosts/host_team_management_controller_test.dart`
- `test/hosts/organizer/team_screen_test.dart`
- `test/payments/host_payment_account_test.dart`
- `test/hosts/insights/host_insights_body_test.dart`
- `test/hosts/insights/host_event_report_body_test.dart`
- `test/hosts/insights/host_insights_controller_test.dart`
- `test/hosts/organizer/organizer_screen_test.dart`
- `test/hosts/organizer/page_edit_test.dart`
- `test/hosts/organizer/settings_screen_test.dart`
- `test/hosts/organizer/team_settings_memberships_test.dart`
- `test/hosts/organizer/payments_body_test.dart`
- `test/hosts/events/event_defaults_details_test.dart`
- `test/hosts/events/event_defaults_retry_test.dart`

## Maintenance

Do not edit this file directly. Update `design/features/host_feature_responsibilities.json`, then run:

```sh
node tool/design/build_host_feature_responsibilities.mjs
node tool/design/build_host_feature_responsibilities.mjs --check
```

The generator cross-checks the Host shell order, typed route contract, Dart symbols, data-contract paths, and focused tests.
