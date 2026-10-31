<!-- GENERATED FROM design/features/host_feature_responsibilities.json. DO NOT EDIT. -->

# Host Organizer

Own the organizer as an operating entity: profile and media, publication readiness, defaults, Live Guide, team and host identity, payouts, insights, preview, and account-level controls.

## Ownership

- Primary route: `hostOrganizerScreen` (`/host/organizer`)
- Target root: `lib/hosts/organizer`
- Migration status: target boundary defined; implementation still lives in listed legacy Host roots
- Responsibility contract updated: 2026-09-22

Current implementation roots:

- `lib/hosts/presentation/host_operations`
- `lib/hosts/presentation/organizer_management`
- `lib/hosts/presentation/payments`

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
| `HostOrganizersScreen` | `lib/hosts/presentation/host_operations/host_organizers_screen.dart` | Feature-contract actions: sign_in, retry_organizer_workspace. |
| `HostOrganizersScaffold` | `lib/hosts/presentation/host_operations/host_organizers_scaffold.dart` | Feature-contract actions: create_organizer, select_workspace_tab. |
| `HostOrganizerEditBody` | `lib/hosts/presentation/host_operations/host_organizer_edit_body.dart` | Feature-contract actions: open_organizer_setting. |
| `HostOrganizerEditController` | `lib/hosts/presentation/organizer_management/host_organizer_edit_controller.dart` | Feature-contract actions: update_organizer, update_organizer_media. |
| `HostOrganizerSpokeAsyncBoundary` | `lib/hosts/presentation/host_operations/host_organizer_spoke_scaffold.dart` | Feature-contract actions: retry_organizer_setting. |
| `HostOrganizerDefaultsSaver` | `lib/hosts/presentation/organizer_management/host_organizer_defaults_saver.dart` | Feature-contract actions: save_event_defaults. |
| `HostOrganizerInsightsSection` | `lib/hosts/presentation/host_operations/host_organizer_insights_section.dart` | Feature-contract actions: retry_insights, refresh_insights, select_insights_range, open_insights_event_report, open_all_host_events. |
| `HostPaymentAccountControllerCard` | `lib/hosts/presentation/payments/host_payment_account_controller_card.dart` | Feature-contract actions: retry_payout_account. |
| `HostPaymentAccountController` | `lib/hosts/presentation/payments/host_payment_account_controller.dart` | Feature-contract actions: start_payout_onboarding, refresh_payout_status. |
| `HostOrganizerTeamScreen` | `lib/hosts/presentation/host_operations/host_organizer_team_screen.dart` | Feature-contract actions: retry_host_profile, retry_hosted_organizers, open_hosted_organizer, select_team_tab, leave_team_workspace. |
| `HostTeamManagementSection` | `lib/hosts/presentation/widgets/host_team_management_section.dart` | Structural owner from feature.host_organizers. |
| `HostTeamManagementController` | `lib/hosts/presentation/organizer_management/host_team_management_controller.dart` | Feature-contract actions: add_host, remove_host, transfer_organizer_ownership. |
| `HostProfileController` | `lib/hosts/presentation/host_profile_controller.dart` | Feature-contract actions: create_host_profile, save_host_profile. |
| `AuthSessionController` | `lib/auth/presentation/auth_session_controller.dart` | Feature-contract actions: sign_out. |
| `HostAppShell` | `lib/routing/shell/host_app_shell.dart` | Feature-contract actions: switch_organizer. |

## Shared dependencies

- `lib/contexts/organizers/data/organizers_repository.dart` — Transitional Organizer repository alias remains the canonical Flutter read/write seam during the domain cutover.
- `lib/contexts/payments/data/host_payment_account_repository.dart` — Provider-neutral payout account persistence and callable orchestration.
- `lib/routing/shell/host_app_shell.dart` — The shell owns global destination navigation and organizer scope.

## Data contracts

- `contracts/callable_responses/get_organizer_crm_summary_response.schema.json`
- `contracts/callables/add_organizer_manager_payload.schema.json`
- `contracts/callables/create_razorpay_host_payment_account_payload.schema.json`
- `contracts/callables/create_stripe_host_onboarding_link_payload.schema.json`
- `contracts/callables/get_organizer_crm_summary_payload.schema.json`
- `contracts/callables/host_analytics_query_payload.schema.json`
- `contracts/callables/refresh_razorpay_host_payment_account_payload.schema.json`
- `contracts/callables/refresh_stripe_host_payment_account_payload.schema.json`
- `contracts/callables/remove_organizer_manager_payload.schema.json`
- `contracts/callables/transfer_organizer_ownership_payload.schema.json`
- `contracts/callables/update_organizer_payload.schema.json`
- `contracts/firestore/organizers.schema.json`
- `contracts/firestore/event_attendees.schema.json`
- `contracts/firestore/host_analytics_snapshots.schema.json`
- `contracts/firestore/host_payment_accounts.schema.json`
- `contracts/firestore/host_profiles.schema.json`
- `contracts/firestore/organizer_communication_preferences.schema.json`
- `contracts/firestore/organizer_team_memberships.schema.json`
- `contracts/firestore/organizers.schema.json`
- `contracts/storage/organizer_logo_images.schema.json`
- `contracts/storage/organizer_photos.schema.json`

## Focused tests

- `test/hosts/host_organizer_defaults_saver_test.dart`
- `test/hosts/host_organizer_identity_switcher_test.dart`
- `test/hosts/host_team_management_controller_test.dart`
- `test/hosts/host_team_management_section_test.dart`
- `test/payments/host_payment_account_test.dart`
- `test/hosts/host_operations_screen_test.dart`

## Maintenance

Do not edit this file directly. Update `design/features/host_feature_responsibilities.json`, then run:

```sh
node tool/design/build_host_feature_responsibilities.mjs
node tool/design/build_host_feature_responsibilities.mjs --check
```

The generator cross-checks the Host shell order, typed route contract, feature-contract action owners, Dart symbols, data-contract paths, and focused tests.
