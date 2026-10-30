/// Hosts feature barrel.
///
/// Aggregates the main public API of the hosts feature so consumers can import
/// a single file instead of deep paths into the feature. Not every file in
/// `lib/hosts/` is exported — only the entry points intended for cross-feature
/// consumption.
///
/// Feature-internal widgets used only inside `lib/hosts/presentation/` are not
/// exported here; import them by their direct path.
library;

export 'package:catch_dating_app/contexts/bookings/domain/host_attendance_window.dart';
export 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
export 'package:catch_dating_app/contexts/insights/domain/host_report_export.dart';
export 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
export 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';

export 'events/presentation/host_events_screen.dart'; // public-api: route entry point exposed to app routing
export 'events/presentation/host_events_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/edit_hosted_event_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/event_management/create/create_event_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/event_management/create/create_event_draft_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/event_management/create/create_event_draft_snapshot.dart'; // public-api: presentation value/helper API used across feature boundaries
export 'presentation/event_management/create/create_event_form_keys.dart'; // public-api: presentation value/helper API used across feature boundaries
export 'presentation/event_management/create/create_event_location_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/event_management/create/create_event_photo_draft_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/event_management/create/create_event_policy_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/event_management/create/create_event_schedule_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/event_management/create/create_event_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/event_management/create/create_event_success_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/event_management/create/create_event_wizard_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/event_management/host_create_event_route_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/event_management/host_create_event_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/event_management/widgets/event_policy_step.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/host_event_booking_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/host_event_manage_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/host_event_manage_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/host_event_manage_screen_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/host_invite_link_state.dart'; // public-api: provider-free Host display state reused by tests and catalog
export 'presentation/host_operations_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/host_organizer_selection_controller.dart'; // public-api: Host-shell organizer identity state seam
export 'presentation/host_profile_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/host_roster_display_state.dart'; // public-api: provider-free Host display state reused by tests and catalog
export 'presentation/host_roster_row_state.dart'; // public-api: provider-free Host display state reused by tests and catalog
export 'presentation/host_team_workspace_state.dart'; // public-api: provider-free display state reused by tests and routes
export 'presentation/organizer_management/create/create_organizer_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/organizer_management/create/create_organizer_draft_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/organizer_management/create/create_organizer_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/organizer_management/host_create_organizer_screen.dart'; // public-api: route entry point exposed to app routing
export 'presentation/organizer_management/host_organizer_edit_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/organizer_management/host_team_management_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/payments/host_payment_account_card.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/payments/host_payment_account_controller.dart'; // public-api: command seam for route-owned actions
export 'presentation/validators.dart'; // public-api: presentation value/helper API used across feature boundaries
export 'presentation/widgets/host_event_participants_section.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/host_event_tools_rail.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/host_loading_skeleton.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/host_organizer_switcher_sheet.dart'; // public-api: shared Host-shell identity component
export 'presentation/widgets/host_stepper_dock.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/host_team_management_section.dart'; // public-api: shared presentation component used outside this feature
export 'presentation/widgets/participant_table.dart'; // public-api: shared presentation component used outside this feature
export 'today/presentation/host_today_screen.dart'; // public-api: route entry point exposed to app routing
