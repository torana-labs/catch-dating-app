import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_form_keys.dart';
import 'package:catch_dating_app/auth/presentation/auth_screen.dart';
import 'package:catch_dating_app/auth/presentation/auth_session_controller.dart';
import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/chats/presentation/inbox/widgets/chats_sliver_header.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_input.dart';
import 'package:catch_dating_app/chats/presentation/widgets/chat_share_card.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_screen_state.dart';
import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_body.dart';
import 'package:catch_dating_app/clubs/presentation/detail/widgets/club_detail_dock.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/launch_access_repository.dart';
import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_campaign_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_communication_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_whatsapp_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_contact_detail.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_audience_query.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_communication_plan.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_crm_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_memory.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_revenue.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_send.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_customer_timeline.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_manual_send_task.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_send_summary.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/bookings/data/booked_events_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/swipe_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/saved_event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_callable_responses.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_runtime_claim_repository.dart';
import 'package:catch_dating_app/contexts/events/data/organizer_event_venue_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_defaults.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/modules.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/data/host_forms_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_analytics.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_share.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_companion_clock.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_runtime.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_membership_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/club_name_lookup.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_membership.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment.dart';
import 'package:catch_dating_app/contexts/profiles/data/image_upload_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/onboarding_draft_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/public_profiles_lookup.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/image_upload_job.dart';
import 'package:catch_dating_app/contexts/profiles/domain/onboarding_draft.dart';
import 'package:catch_dating_app/contexts/profiles/domain/photo_upload_state.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_prompts.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/data/city_repository.dart';
import 'package:catch_dating_app/core/device_location.dart';
import 'package:catch_dating_app/core/domain/city_data.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/external_share.dart';
import 'package:catch_dating_app/core/fcm_service.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/persistence/command_journal_provider.dart';
import 'package:catch_dating_app/core/persistence/memory_command_journal_storage.dart';
import 'package:catch_dating_app/core/presentation/host_app_shell.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/schema_contracts/generated/callable_request_dtos.g.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/core/widgets/block_user_dialog.dart';
import 'package:catch_dating_app/core/widgets/ordered_photo_picker.dart';
import 'package:catch_dating_app/core/widgets/splash_screen.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_explore_card.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_controller.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/design_fixtures/catches_surface_fixtures.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/design_fixtures/host_inbox_surface_fixtures.dart';
import 'package:catch_dating_app/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_dating_app/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_dating_app/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_dating_app/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_controller.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_defaults_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_help_section.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen.dart';
import 'package:catch_dating_app/events/presentation/event_booking_controller.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen.dart';
import 'package:catch_dating_app/events/presentation/event_detail_view_model.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/location_picker_screen.dart';
import 'package:catch_dating_app/events/presentation/saved_events_screen.dart';
import 'package:catch_dating_app/events/presentation/widgets/who_is_going_section.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/explore/presentation/explore_cross_paths_provider.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_map_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/featured_event_poster.dart';
import 'package:catch_dating_app/host_memberships/data/host_membership_repository.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_sheet.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_applications_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/create_club_screen.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/host_club_edit_controller.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/host_team_management_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_saved_audience_members_controller.dart';
import 'package:catch_dating_app/hosts/presentation/edit_hosted_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_success_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/draft_picker_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/widgets/where_step.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_analytics_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_automations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_builder_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_preview_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_share_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_templates_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_profile_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_broadcast_composer_sheet.dart'
    as host_inbox;
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_broadcast_controller.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller_card.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_draft_exit_dialog.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_team_management_section.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_screen.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_preference_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_screen.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_application_screen.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_controller.dart';
import 'package:catch_dating_app/locations/domain/location_coordinate.dart';
import 'package:catch_dating_app/matches/shared/match_celebration_dialog.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_step.dart';
import 'package:catch_dating_app/onboarding/presentation/pages/onboarding_welcome_body.dart';
import 'package:catch_dating_app/onboarding/shared/onboarding_step_layout.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_controller.dart';
import 'package:catch_dating_app/programs/presentation/program_create_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_state.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_controller.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_screen.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_state.dart';
import 'package:catch_dating_app/safety/presentation/settings_controller.dart';
import 'package:catch_dating_app/safety/presentation/settings_keys.dart';
import 'package:catch_dating_app/safety/presentation/settings_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:catch_dating_app/swipes/presentation/filters_controller.dart';
import 'package:catch_dating_app/swipes/presentation/filters_screen.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_queue_controller.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_screen.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_reaction_action.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_sliver_header.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/experimental/mutation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'
    show
        AsyncData,
        AsyncError,
        AsyncLoading,
        AsyncValue,
        ConsumerState,
        ConsumerStatefulWidget,
        ProviderContainer,
        ProviderScope;
import 'package:flutter_test/flutter_test.dart'
    show Fake, Finder, WidgetTester, expect, find, findsNothing, findsOneWidget;
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../clubs/clubs_test_helpers.dart' as club_test;
import '../../events/events_test_helpers.dart';
import '../../test_pump_helpers.dart';
import '../fixtures/host_audience_journey_fixture.dart';
import '../fixtures/sales_demo_synthetic_fixtures.dart';
import '../support/capture_device.dart';

part 'host_audience_capture_fixtures.dart';

class ScreenCaptureEntry {
  const ScreenCaptureEntry({
    required this.id,
    required this.routeIds,
    required this.device,
    required this.builder,
    this.precache = const <ImageProvider<Object>>[],
    this.marketingFixtureKeys = const <String>[],
    this.providerOverrides = const [],
    this.textScale = 1.0,
    this.disableAnimations = false,
    this.includeOverlays = false,
    this.drive,
    this.cleanup,
  });

  final String id;
  final List<String> routeIds;
  final CaptureDevice device;
  final WidgetBuilder builder;
  final List<ImageProvider<Object>> precache;
  final List<String> marketingFixtureKeys;
  final Iterable providerOverrides;
  final double textScale;
  final bool disableAnimations;
  final bool includeOverlays;
  final Future<void> Function(WidgetTester tester)? drive;
  final Future<void> Function(WidgetTester tester)? cleanup;
}

final _profileHeroImage = FileImage(File('test/goldens/fixtures/portrait.jpg'));
const _clubHeroPortraitAssetPath = 'assets/fixtures/club_hero_portrait.jpg';
const _clubHeroPortraitAssetImage = AssetImage(_clubHeroPortraitAssetPath);
const _profilePortraitAssetPath = 'assets/fixtures/profile_portrait.jpg';
const _profilePortraitAssetImage = AssetImage(_profilePortraitAssetPath);
final _clubHeroPortraitBytes = File(
  _clubHeroPortraitAssetPath,
).readAsBytesSync();
final _profilePortraitBytes = File(_profilePortraitAssetPath).readAsBytesSync();
final _hostMediaCaptureImages = <ImageProvider<Object>>[
  MemoryImage(_clubHeroPortraitBytes),
  MemoryImage(_profilePortraitBytes),
];
final _captureFixtures = salesDemoSyntheticFixtures;
final _captureAnalyticsOverride = appAnalyticsProvider.overrideWithValue(
  AppAnalytics(reporter: _NoOpAnalyticsReporter(), shouldCollect: false),
);
final _eventDetailClub = club_test.buildClub(
  id: 'club-event-detail-capture',
  name: 'Bandra Dawn Club',
  description: 'Warm coastal starts, easy pacing, and coffee after.',
  hostUserId: 'host-mira',
  hostName: 'Mira Shah',
  tags: const ['social run', 'coffee', 'beginner'],
  memberCount: 128,
  rating: 4.8,
  reviewCount: 42,
);
final _eventDetailEvent = buildEvent(
  id: 'event-detail-member',
  clubId: _eventDetailClub.id,
  startTime: DateTime(2030, 6, 12, 7),
  endTime: DateTime(2030, 6, 12, 8, 15),
  meetingPoint: 'Carter Road Amphitheatre',
  startingPointLat: 19.0706,
  startingPointLng: 72.8223,
  locationDetails: 'Meet by the sea-facing steps',
  distanceKm: 6,
  bookedCount: 12,
  checkedInCount: 0,
  capacityLimit: 24,
  description:
      'A conversational coastal loop with regroup points, coffee after, and a host who keeps the pace social.',
);
final _eventDetailNoCoordinateEvent = _eventDetailEvent.copyWith(
  id: 'event-detail-no-coordinate',
  meetingLocation: null,
  startingPointLat: null,
  startingPointLng: null,
);
final _eventDetailUser = buildUser(
  name: 'Aanya Shah',
  email: 'aanya@example.com',
  phoneNumber: '+919870000001',
);
final _eventDetailHostUser = buildUser(
  uid: 'host-mira',
  name: 'Mira Shah',
  email: 'mira@example.com',
  phoneNumber: '+919870000002',
);
final _eventDetailClubsRepository = club_test.FakeClubsRepository()
  ..clubsById[_eventDetailClub.id] = _eventDetailClub;
final _eventDetailFullEvent = _eventDetailEvent.copyWith(
  id: 'event-detail-full',
  bookedCount: _eventDetailEvent.capacityLimit,
  waitlistedCount: 4,
);
final _eventDetailWaitlistEvent = _eventDetailFullEvent.copyWith(
  id: 'event-detail-waitlist',
);
final _eventDetailWaitlistOfferEvent = _eventDetailFullEvent.copyWith(
  id: 'event-detail-waitlist-offer',
);
final _eventDetailPastEvent = _eventDetailEvent.copyWith(
  id: 'event-detail-past',
  startTime: DateTime(2026, 6, 1, 7),
  endTime: DateTime(2026, 6, 1, 8, 15),
);
final _eventDetailAttendedEvent = _eventDetailPastEvent.copyWith(
  id: 'event-detail-attended',
);
final _eventDetailCancelledEvent = _eventDetailEvent.copyWith(
  id: 'event-detail-cancelled',
  status: EventLifecycleStatus.cancelled,
  cancelledAt: DateTime(2030, 6, 1, 10),
  cancellationReason: 'Host cancelled this event.',
);
List<EventParticipation> _eventDetailParticipationsFor(
  Event event, {
  EventParticipation? viewerParticipation,
}) {
  return [
    ?viewerParticipation,
    for (var index = 2; index <= 13; index += 1)
      buildEventParticipation(
        event: event,
        uid: 'runner-$index',
        createdAt: DateTime(2026, 5, index.clamp(1, 28), 7),
      ),
  ];
}

FakeEventParticipationRepository _eventDetailParticipationRepositoryFor(
  Event event, {
  EventParticipation? viewerParticipation,
}) {
  return FakeEventParticipationRepository()
    ..eventParticipations[event.id] = _eventDetailParticipationsFor(
      event,
      viewerParticipation: viewerParticipation,
    );
}

final _eventDetailPublicProfileRepository = FakePublicProfileRepository()
  ..profiles = [
    buildPublicProfile(
      uid: _eventDetailUser.uid,
      name: _eventDetailUser.name,
      gender: _eventDetailUser.gender!,
    ),
    buildPublicProfile(
      uid: _eventDetailHostUser.uid,
      name: _eventDetailHostUser.name,
      gender: _eventDetailHostUser.gender!,
    ),
    for (var index = 2; index <= 13; index += 1)
      buildPublicProfile(uid: 'runner-$index', name: 'Runner $index'),
  ];

EventDetailViewModel _eventDetailCaptureViewModel({
  Event? event,
  UserProfile? userProfile,
  bool isAuthenticated = true,
  bool isHost = false,
  bool isSaved = true,
  EventParticipation? participation,
  List<Review>? reviews,
}) {
  final resolvedEvent = event ?? _eventDetailEvent;
  return EventDetailViewModel(
    event: resolvedEvent,
    userProfile: userProfile ?? (isAuthenticated ? _eventDetailUser : null),
    reviews:
        reviews ??
        [
          buildReview(
            eventId: resolvedEvent.id,
            reviewerUserId: 'runner-2',
            reviewerName: 'Neha',
            comment: 'Warm hosting, clear route, and easy conversation.',
            createdAt: DateTime(2026, 5, 20),
          ),
        ],
    isAuthenticated: isAuthenticated,
    isHost: isHost,
    isSaved: isSaved,
    participation: participation,
  );
}

Iterable _eventDetailCaptureProviderOverrides({
  Event? event,
  AsyncValue<EventDetailViewModel?>? viewModel,
  EventParticipation? viewerParticipation,
  bool includeCompanionPlan = false,
}) {
  final resolvedEvent = event ?? _eventDetailEvent;
  final resolvedViewModel =
      viewModel ??
      AsyncData(
        _eventDetailCaptureViewModel(
          event: resolvedEvent,
          participation: viewerParticipation,
        ),
      );
  return [
    eventDetailViewModelProvider(
      resolvedEvent.id,
    ).overrideWith((ref) => resolvedViewModel),
    paymentRepositoryProvider.overrideWithValue(FakePaymentRepository()),
    eventParticipationRepositoryProvider.overrideWithValue(
      _eventDetailParticipationRepositoryFor(
        resolvedEvent,
        viewerParticipation: viewerParticipation,
      ),
    ),
    publicProfileRepositoryProvider.overrideWithValue(
      _eventDetailPublicProfileRepository,
    ),
    clubsRepositoryProvider.overrideWithValue(_eventDetailClubsRepository),
    watchEventSuccessPlanProvider(resolvedEvent.id).overrideWith(
      (ref) => Stream.value(
        includeCompanionPlan
            ? EventSuccessPlan.defaultForEvent(
                resolvedEvent,
                now: DateTime(2030, 6),
              )
            : null,
      ),
    ),
  ];
}

class _EventDetailBookingMutationCapture extends ConsumerStatefulWidget {
  const _EventDetailBookingMutationCapture({required this.mode});

  final _EventDetailBookingMutationCaptureMode mode;

  @override
  ConsumerState<_EventDetailBookingMutationCapture> createState() =>
      _EventDetailBookingMutationCaptureState();
}

class _EventDetailBookingMutationCaptureState
    extends ConsumerState<_EventDetailBookingMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      _eventDetailBookingMutationResetContainer = ProviderScope.containerOf(
        context,
        listen: false,
      );
      _resetEventDetailBookingMutations();
      switch (widget.mode) {
        case _EventDetailBookingMutationCaptureMode.bookPending:
          _runPending(EventBookingController.bookMutation);
          break;
        case _EventDetailBookingMutationCaptureMode.bookSuccess:
          _runSuccess(EventBookingController.bookMutation);
          break;
        case _EventDetailBookingMutationCaptureMode.bookError:
          _runError(EventBookingController.bookMutation, 'booking failed');
          break;
        case _EventDetailBookingMutationCaptureMode.cancelPending:
          _runPending(EventBookingController.cancelMutation);
          break;
        case _EventDetailBookingMutationCaptureMode.cancelSuccess:
          _runSuccess(EventBookingController.cancelMutation);
          break;
        case _EventDetailBookingMutationCaptureMode.cancelError:
          _runError(EventBookingController.cancelMutation, 'cancel failed');
          break;
      }
    });
  }

  void _resetEventDetailBookingMutations() {
    EventBookingController.bookMutation.reset(ref);
    EventBookingController.cancelMutation.reset(ref);
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    _eventDetailBookingMutationPendingCompleter = completer;
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runSuccess(Mutation<void> mutation) {
    unawaited(
      mutation.run(ref, (_) async {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }),
    );
  }

  void _runError(Mutation<void> mutation, String message) {
    unawaited(
      mutation
          .run(ref, (_) async {
            await Future<void>.delayed(const Duration(milliseconds: 50));
            throw StateError(message);
          })
          .catchError((_) {}),
    );
  }

  @override
  Widget build(BuildContext context) {
    return EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    );
  }
}

enum _EventDetailBookingMutationCaptureMode {
  bookPending,
  bookSuccess,
  bookError,
  cancelPending,
  cancelSuccess,
  cancelError,
}

Completer<void>? _eventDetailBookingMutationPendingCompleter;
ProviderContainer? _eventDetailBookingMutationResetContainer;

Future<void> _cleanupEventDetailBookingMutationPending(
  WidgetTester tester,
) async {
  final completer = _eventDetailBookingMutationPendingCompleter;
  _eventDetailBookingMutationPendingCompleter = null;
  if (completer != null && !completer.isCompleted) {
    completer.complete();
    await tester.pump();
  }
  await _cleanupEventDetailBookingMutationState(tester);
}

Future<void> _cleanupEventDetailBookingMutationState(
  WidgetTester tester,
) async {
  final container = _eventDetailBookingMutationResetContainer;
  _eventDetailBookingMutationResetContainer = null;
  if (container == null) return;
  EventBookingController.bookMutation.reset(container);
  EventBookingController.cancelMutation.reset(container);
}

EventParticipation _buildEventDetailSignedUpParticipation(Event event) =>
    buildEventParticipation(
      event: event,
      uid: _eventDetailUser.uid,
      createdAt: DateTime(2026, 5, 8, 7),
    );

EventParticipation _buildEventDetailWaitlistedParticipation(
  Event event, {
  bool activeOffer = false,
}) => buildEventParticipation(
  event: event,
  uid: _eventDetailUser.uid,
  status: EventParticipationStatus.waitlisted,
  createdAt: DateTime(2026, 5, 8, 7),
  waitlistOfferStatus: activeOffer ? EventWaitlistOfferStatus.active : null,
  waitlistOfferedAt: activeOffer ? DateTime(2030, 6, 11, 16) : null,
  waitlistOfferExpiresAt: activeOffer ? DateTime(2030, 6, 11, 21) : null,
  waitlistOfferId: activeOffer ? 'capture-waitlist-offer' : null,
);

EventParticipation _buildEventDetailAttendedParticipation(Event event) =>
    buildEventParticipation(
      event: event,
      uid: _eventDetailUser.uid,
      status: EventParticipationStatus.attended,
      createdAt: DateTime(2026, 5, 8, 7),
    );

final _eventDetailSignedUpParticipation =
    _buildEventDetailSignedUpParticipation(_eventDetailEvent);
final _eventDetailWaitlistedParticipation =
    _buildEventDetailWaitlistedParticipation(_eventDetailWaitlistEvent);
final _eventDetailWaitlistOfferParticipation =
    _buildEventDetailWaitlistedParticipation(
      _eventDetailWaitlistOfferEvent,
      activeOffer: true,
    );
final _eventDetailAttendedParticipation =
    _buildEventDetailAttendedParticipation(_eventDetailAttendedEvent);

const _memberDiscoveryCities = [
  CityData(
    name: 'mumbai',
    label: 'Bandra',
    latitude: 19.076,
    longitude: 72.8777,
  ),
  CityData(
    name: 'delhi',
    label: 'Delhi',
    latitude: 28.7041,
    longitude: 77.1025,
  ),
];
final _memberDiscoveryClubs = [
  _captureFixtures.captureClub(
    id: 'club-discovery-quizzicals',
    name: 'The Quizzicals',
    description: 'Pub quiz nights with teams drawn at the door.',
    area: 'Khar',
    hostName: 'Aarav',
    tags: const ['pub quiz', 'teams', 'tonight'],
    memberCount: 74,
    reviewCount: 19,
    nextEventAt: DateTime(2026, 6, 11, 19, 30),
    nextEventLabel: 'Thu 7:30 PM',
  ),
  _captureFixtures.captureClub(
    id: 'club-discovery-table',
    name: 'Table for Strangers',
    description: 'Hosted dinners for people who want better first hellos.',
    area: 'Pali Hill',
    hostName: 'Kabir',
    tags: const ['dinner', 'conversation', 'new'],
    memberCount: 86,
    rating: 4.7,
    reviewCount: 31,
    nextEventAt: DateTime(2026, 6, 12, 20),
    nextEventLabel: 'Fri 8:00 PM',
  ),
  _captureFixtures.captureClub(
    id: 'club-discovery-pickle',
    name: 'Pickleball Social',
    description: 'Friendly doubles, rotating partners, and no pressure.',
    area: 'Juhu',
    hostName: 'Tara',
    tags: const ['pickleball', 'mixed doubles', 'weekend'],
    memberCount: 64,
    rating: 4.6,
    reviewCount: 18,
    nextEventAt: DateTime(2026, 6, 13, 18),
    nextEventLabel: 'Sat 6:00 PM',
  ),
];
final _memberDiscoveryEvents = [
  _captureFixtures.captureEvent(
    id: 'event-discovery-trivia',
    club: _memberDiscoveryClubs[0],
    startTime: DateTime(2026, 6, 11, 19, 30),
    meetingPoint: 'Khar Social',
    startingPointLat: 19.0698,
    startingPointLng: 72.8381,
    activityKind: ActivityKind.pubQuiz,
    distanceKm: 0,
    bookedCount: 24,
    capacityLimit: 30,
    description: 'Teams drawn at the door for a no-phones trivia night.',
  ),
  _captureFixtures.captureEvent(
    id: 'event-discovery-long-table',
    club: _memberDiscoveryClubs[1],
    startTime: DateTime(2026, 6, 12, 20),
    meetingPoint: 'Pali Village Cafe',
    startingPointLat: 19.0634,
    startingPointLng: 72.8296,
    activityKind: ActivityKind.dinner,
    distanceKm: 0,
    bookedCount: 10,
    capacityLimit: 14,
    priceInPaise: 120000,
    description: 'A long-table dinner built around hosted prompts.',
  ),
  _captureFixtures.captureEvent(
    id: 'event-discovery-pickle-open',
    club: _memberDiscoveryClubs[2],
    startTime: DateTime(2026, 6, 13, 18),
    meetingPoint: 'Juhu court 2',
    startingPointLat: 19.1075,
    startingPointLng: 72.8263,
    activityKind: ActivityKind.pickleball,
    distanceKm: 0,
    bookedCount: 11,
    capacityLimit: 16,
    priceInPaise: 60000,
    description: 'Rotating mixed doubles with a host who balances teams.',
  ),
  _captureFixtures.captureEvent(
    id: 'event-discovery-cocktail-round',
    club: _memberDiscoveryClubs[0],
    startTime: DateTime(2026, 6, 15, 20),
    meetingPoint: 'Khar Social',
    startingPointLat: 19.0698,
    startingPointLng: 72.8381,
    activityKind: ActivityKind.barCrawl,
    distanceKm: 0,
    bookedCount: 18,
    capacityLimit: 24,
    priceInPaise: 90000,
    description:
        'Small groups rotate through low-pressure conversation rounds.',
  ),
  _captureFixtures.captureEvent(
    id: 'event-discovery-open-format',
    club: _memberDiscoveryClubs[1],
    startTime: DateTime(2026, 6, 17, 19),
    meetingPoint: 'Pali Village Cafe',
    startingPointLat: 19.0634,
    startingPointLng: 72.8296,
    activityKind: ActivityKind.singlesMixer,
    distanceKm: 0,
    bookedCount: 16,
    capacityLimit: 22,
    priceInPaise: 80000,
    description: 'A hosted mixer with prompts, table moves, and easy exits.',
  ),
];
final _memberDiscoveryItems = [
  for (final event in _memberDiscoveryEvents)
    ExploreEventItem(
      event: event,
      club: _memberDiscoveryClubs.firstWhere((club) => club.id == event.clubId),
      distanceFromUserKm: switch (event.id) {
        'event-discovery-long-table' => 2.4,
        'event-discovery-pickle-open' => 4.8,
        'event-discovery-weekend-walk' => 1.3,
        _ => 0.8,
      },
    ),
];
final _exploreCrossPathsSuggestion = CrossPathsSuggestion(
  profile:
      buildPublicProfile(
        uid: 'capture-cross-paths-rhea',
        name: 'Rhea Kapoor',
        age: 29,
        gender: Gender.woman,
        bio: 'Sunset walks, small tables, and conversations worth staying for.',
      ).copyWith(
        relationshipGoal: RelationshipGoal.relationship,
        activityPreferences: const ActivityPreferences(),
      ),
  event: CrossPathsSuggestionEvent(
    eventId: _memberDiscoveryEvents[2].id,
    organizerId: _memberDiscoveryEvents[2].clubId,
    startTime: _memberDiscoveryEvents[2].startTime,
    endTime: _memberDiscoveryEvents[2].endTime,
    meetingPoint: _memberDiscoveryEvents[2].meetingPoint,
    activityKind: _memberDiscoveryEvents[2].activityKind,
    photoUrl: null,
    viewerBookingStatus: CrossPathsViewerBookingStatus.canBookNow,
  ),
  reasonCodes: const [
    CrossPathsSuggestionReason.attendingEvent,
    CrossPathsSuggestionReason.bookingAvailable,
    CrossPathsSuggestionReason.mutualPreferences,
    CrossPathsSuggestionReason.showcaseReady,
  ],
  suggestionToken: 'capture-cross-paths-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  tokenExpiresAt: DateTime(2031),
);
final _unclaimedDiscoveryClub = _captureFixtures
    .captureClub(
      id: 'club-discovery-unclaimed',
      name: 'Open Table Collective',
      description:
          'Community-hosted suppers with a rotating organizer profile.',
      area: 'Bandra West',
      tags: const ['dinner', 'community', 'unclaimed'],
      memberCount: 42,
      rating: 4.5,
      reviewCount: 11,
      nextEventAt: DateTime(2026, 6, 14, 20),
      nextEventLabel: 'Sun 8:00 PM',
    )
    .copyWith(
      hostUserId: null,
      hostName: null,
      hostUserIds: const <String>[],
      hostProfiles: const <ClubHostProfile>[],
    );
final _unclaimedDiscoveryEvent = _captureFixtures.captureEvent(
  id: 'event-discovery-unclaimed-supper',
  club: _unclaimedDiscoveryClub,
  startTime: DateTime(2026, 6, 14, 20),
  meetingPoint: 'Bandra community table',
  startingPointLat: 19.0608,
  startingPointLng: 72.8365,
  activityKind: ActivityKind.dinner,
  distanceKm: 1.7,
  bookedCount: 10,
  capacityLimit: 18,
  priceInPaise: 95000,
  description:
      'A rotating host keeps the table moving without a claimed organizer account.',
);
final _unclaimedDiscoveryItems = [
  ExploreEventItem(
    event: _unclaimedDiscoveryEvent,
    club: _unclaimedDiscoveryClub,
    distanceFromUserKm: 1.7,
  ),
];

List<Object> _exploreProviderOverrides({
  AsyncValue<List<Club>>? sourceClubs,
  AsyncValue<ExploreViewModel>? viewModel,
  AsyncValue<ExploreFeedViewModel>? feed,
  String? uid = _captureViewerUid,
  Set<String> joinedClubIds = const <String>{},
  List<CrossPathsSuggestion>? crossPathsSuggestions,
  DeviceLocation Function()? deviceLocationBuilder,
}) {
  final effectiveSourceClubs =
      sourceClubs ?? AsyncData<List<Club>>(_memberDiscoveryClubs);
  final effectiveViewModel =
      viewModel ??
      AsyncData(
        ExploreViewModel.partition(
          clubs: _memberDiscoveryClubs,
          joinedClubIds: joinedClubIds,
        ),
      );
  final effectiveFeed =
      feed ??
      AsyncData(
        ExploreFeedViewModel(
          items: _memberDiscoveryItems,
          featuredEventId: _memberDiscoveryItems.first.event.id,
        ),
      );

  return [
    cityListProvider.overrideWith((ref) async => _memberDiscoveryCities),
    deviceLocationProvider.overrideWith(
      deviceLocationBuilder ?? _CaptureDeviceLocation.new,
    ),
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(uid == null ? null : _captureViewer),
    ),
    exploreSourceClubsProvider.overrideWithValue(effectiveSourceClubs),
    exploreClubsViewModelProvider.overrideWithValue(effectiveViewModel),
    exploreFeedViewModelProvider.overrideWithValue(effectiveFeed),
    exploreCrossPathsSuggestionsProvider.overrideWithValue(
      AsyncData(crossPathsSuggestions ?? const <CrossPathsSuggestion>[]),
    ),
  ];
}

NetworkException _exploreOfflineException({required String action}) {
  return obviousOfflineException(
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: 'explore',
    ),
  );
}

Future<void> _driveExploreToCrossPaths(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.byKey(const ValueKey('cross-paths-card-capture-cross-paths-rhea')),
    420,
    scrollable: findVerticalScrollable(
      within: find.byKey(ExploreScreenKeys.scrollView),
    ),
  );
  await pumpFeatureUi(tester);
}

Widget _exploreCapture({
  String? searchQuery,
  _ExploreCaptureFilterSeed seedFilters = const _ExploreCaptureFilterSeed(),
  Widget child = const ExploreScreen(),
}) {
  return _ExploreCaptureStateSeed(
    searchQuery: searchQuery,
    seedFilters: seedFilters,
    child: child,
  );
}

class _CaptureDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async => null;
}

class _CaptureBandraDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async =>
      const LocationCoordinate(19.064, 72.835);
}

class _CaptureMatchRepository extends Fake implements MatchRepository {
  _CaptureMatchRepository({required this.matches});

  final List<Match> matches;

  @override
  Stream<Match?> watchMatch({required String matchId}) =>
      Stream.value(_matchFor(matchId));

  @override
  Stream<List<Match>> watchMatchesForUser({required String uid}) =>
      Stream.value([
        for (final match in matches)
          if (!match.isBlocked &&
              (match.user1Id == uid || match.user2Id == uid))
            match,
      ]);

  @override
  Future<void> resetUnread({
    required String matchId,
    required String uid,
  }) async {}

  Match? _matchFor(String id) {
    for (final match in matches) {
      if (match.id == id) return match;
    }
    return null;
  }
}

class _CaptureConversationRepository implements ConversationRepository {
  const _CaptureConversationRepository({required this.messagesByConversation});

  final Map<String, List<ChatMessage>> messagesByConversation;

  @override
  Stream<List<ChatMessage>> watchMessages({required String conversationId}) =>
      Stream.value(messagesByConversation[conversationId] ?? const []);

  @override
  Future<String> createMessageId({required String conversationId}) async =>
      '$conversationId-new-message';

  @override
  Future<ConversationMessagePage> fetchMessagesPage({
    required String conversationId,
    ConversationMessageCursor? cursor,
  }) async => const ConversationMessagePage(messages: []);

  @override
  Future<void> sendTextMessage({
    required String conversationId,
    required String senderId,
    required String text,
    String? messageId,
  }) async {}

  @override
  Future<void> sendImageMessage({
    required String conversationId,
    required String senderId,
    required String messageId,
    required String imageUrl,
  }) async {}

  @override
  Future<void> markRead({
    required String conversationId,
    required String uid,
  }) async {}
}

class _NoopEventSuccessLiveEffectsController
    extends EventSuccessLiveEffectsController {
  @override
  Future<void> play(EventSuccessLiveEffectKind kind) async {}

  @override
  Future<void> playAmbientBed(EventSuccessAmbientBed bed) async {}

  @override
  Future<void> stopAmbientBed() async {}

  @override
  Future<void> dispose() async {}
}

class _NoopCelebrationEffectsController extends CelebrationEffectsController {
  @override
  Future<void> play(CelebrationMomentKind kind) async {}

  @override
  Future<void> dispose() async {}
}

final _postRunEvent = buildEvent(
  id: 'event-post-run-catches',
  clubId: 'club-post-run',
  startTime: DateTime(2026, 5, 30, 7),
  endTime: DateTime(2026, 5, 30, 8, 10),
  meetingPoint: 'Carter Road Amphitheatre',
  startingPointLat: 19.0706,
  startingPointLng: 72.8223,
  bookedCount: 22,
  checkedInCount: 19,
  capacityLimit: 24,
  description: 'A post-run social loop with structured conversation prompts.',
);
final _postRunViewer =
    buildUser(
      uid: 'runner-viewer',
      name: 'Rohan Mehta',
      email: 'rohan@example.com',
    ).copyWith(
      city: 'Mumbai',
      relationshipGoal: RelationshipGoal.relationship,
      activityPreferences: const ActivityPreferences(
        running: RunningPreferences(
          paceMinSecsPerKm: 315,
          paceMaxSecsPerKm: 390,
          preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
          runningReasons: [RunReason.community, RunReason.social],
          preferredRunTimes: [PreferredRunTime.earlyMorning],
          version: currentRunPreferencesVersion,
        ),
      ),
    );
final _postRunViewerParticipation = buildEventParticipation(
  event: _postRunEvent,
  uid: _postRunViewer.uid,
  status: EventParticipationStatus.attended,
  createdAt: DateTime(2026, 5, 28, 9),
);
final _postRunProfiles = [
  buildPublicProfile(
    uid: 'runner-meera',
    name: 'Meera',
    age: 28,
    gender: Gender.woman,
    bio:
        'Ask me about the bookshop detour I take after long runs and the breakfast order I defend every Sunday.',
  ).copyWith(
    city: 'Bandra',
    height: 168,
    occupation: 'Brand strategist',
    company: 'Studio Coast',
    education: EducationLevel.masters,
    languages: const [Language.english, Language.hindi],
    relationshipGoal: RelationshipGoal.relationship,
    drinking: DrinkingHabit.socially,
    workout: WorkoutFrequency.often,
    activityPreferences: const ActivityPreferences(
      running: RunningPreferences(
        paceMinSecsPerKm: 320,
        paceMaxSecsPerKm: 400,
        preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
        runningReasons: [RunReason.mindfulness, RunReason.social],
        preferredRunTimes: [PreferredRunTime.earlyMorning],
        version: currentRunPreferencesVersion,
      ),
    ),
  ),
  buildPublicProfile(
    uid: 'runner-isha',
    name: 'Isha',
    age: 27,
    gender: Gender.woman,
    bio: 'Easy miles, strong coffee, and one excellent playlist per week.',
  ).copyWith(
    city: 'Juhu',
    occupation: 'Architect',
    relationshipGoal: RelationshipGoal.casual,
    workout: WorkoutFrequency.often,
  ),
];

final _catchesOpenEvent = CatchesSurfaceFixtures.openWindowEvent(
  id: 'capture-catches-open',
);
final _catchesClosedEvent = CatchesSurfaceFixtures.closedWindowEvent();
final _catchesUpcomingEvent = CatchesSurfaceFixtures.upcomingEvent();

NetworkException _catchesOfflineException({required String action}) {
  return obviousOfflineException(
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: 'catches',
    ),
  );
}

List<Object> _swipeDeckProviderOverrides({
  required Event event,
  String? uid = CatchesSurfaceFixtures.viewerUid,
  Stream<Event?>? eventStream,
  Stream<UserProfile?>? profileStream,
  EventParticipation? participation,
  Future<List<PublicProfile>> Function()? queue,
  Set<String> vibeIds = const <String>{},
  SwipeRepository swipeRepository = const _CaptureNoopSwipeRepository(),
}) {
  final viewerParticipation =
      participation ??
      CatchesSurfaceFixtures.attendedParticipation(event: event);

  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) =>
          profileStream ??
          Stream<UserProfile?>.value(
            uid == null ? null : CatchesSurfaceFixtures.viewer,
          ),
    ),
    watchEventProvider(
      event.id,
    ).overrideWith((ref) => eventStream ?? Stream<Event?>.value(event)),
    watchEventParticipationProvider(
      event.id,
      CatchesSurfaceFixtures.viewerUid,
    ).overrideWith(
      (ref) => Stream<EventParticipation?>.value(viewerParticipation),
    ),
    swipeQueueProvider(event.id, vibeIds: vibeIds).overrideWithBuild((
      ref,
      notifier,
    ) async {
      if (queue != null) return queue();
      final candidates = CatchesSurfaceFixtures.candidates;
      if (vibeIds.isEmpty) return candidates;
      return [
        ...candidates.where((profile) => vibeIds.contains(profile.uid)),
        ...candidates.where((profile) => !vibeIds.contains(profile.uid)),
      ];
    }),
    swipeRepositoryProvider.overrideWithValue(swipeRepository),
  ];
}

class _CatchesReactionCommentSheetCapture extends StatelessWidget {
  const _CatchesReactionCommentSheetCapture({this.initialComment});

  final String? initialComment;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Align(
        alignment: Alignment.bottomCenter,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 390),
          child: ProfileReactionCommentSheet(
            target: _catchesReactionTarget,
            initialComment: initialComment,
          ),
        ),
      ),
    );
  }
}

class _SwipeWriteFailureNoticeCapture extends ConsumerStatefulWidget {
  const _SwipeWriteFailureNoticeCapture();

  @override
  ConsumerState<_SwipeWriteFailureNoticeCapture> createState() =>
      _SwipeWriteFailureNoticeCaptureState();
}

class _SwipeWriteFailureNoticeCaptureState
    extends ConsumerState<_SwipeWriteFailureNoticeCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      unawaited(_runFailingSwipe());
    });
  }

  Future<void> _runFailingSwipe() async {
    try {
      await ref
          .read(swipeQueueProvider(_catchesOpenEvent.id).notifier)
          .swipe(SwipeDirection.pass);
    } catch (error) {
      if (!mounted) return;
      showCatchNoticeError(
        context,
        error,
        errorContext: AppErrorContext.swipes,
      );
    }
  }

  @override
  Widget build(BuildContext context) => SwipeScreen(
    eventId: _catchesOpenEvent.id,
    now: CatchesSurfaceFixtures.now,
  );
}

Widget _swipeEventPendingActionCapture(
  CatchesProfileReviewActionState actionState,
) {
  return CatchesProfileBody(
    profile: CatchesSurfaceFixtures.candidates.first,
    remainingCount: CatchesSurfaceFixtures.candidates.length,
    viewerProfile: CatchesSurfaceFixtures.viewer,
    sharedRunTitle: _catchesOpenEvent.title,
    actionState: actionState,
    onBack: () {},
    onFilters: () {},
    onPass: () {},
    onReact: (target, comment) {},
  );
}

const _catchesReactionTarget = ProfileReactionTarget(
  id: 'prompt-sunday-loop',
  type: SwipeReactionTargetType.profilePrompt,
  label: 'Sunday loop',
  preview: 'My ideal Sunday starts with a sea-facing loop and ends with dosa.',
);

class _CaptureNoopSwipeRepository implements SwipeRepository {
  const _CaptureNoopSwipeRepository();

  @override
  Future<Set<String>> fetchSwipedUserIds({required String uid}) async =>
      const <String>{};

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {}
}

class _CaptureThrowingSwipeRepository implements SwipeRepository {
  const _CaptureThrowingSwipeRepository();

  @override
  Future<Set<String>> fetchSwipedUserIds({required String uid}) async =>
      const <String>{};

  @override
  Future<void> recordSwipe({required Swipe swipe}) async {
    throw const BackendOperationException(
      code: 'capture-swipe-write-failed',
      message: 'Unable to save that catch. Please try again.',
      context: BackendErrorContext(
        service: BackendService.firestore,
        action: 'record swipe',
        resource: 'profile_decisions',
      ),
      retryable: true,
    );
  }
}

const _matchChatViewerUid = 'nyc_jordan_ellis_002';
const _matchChatOtherProfile = PublicProfile(
  uid: 'nyc_aanya_reference_001',
  name: 'Aanya',
  age: 29,
  gender: Gender.woman,
  city: 'Mumbai',
  occupation: 'Product designer',
  company: 'Studio Sunday',
);
final _matchChatEvent = buildEvent(
  id: 'event-match-chat-context',
  clubId: 'club-match-chat-padel',
  startTime: DateTime(2026, 6, 22, 18),
  endTime: DateTime(2026, 6, 22, 20),
  meetingPoint: 'Pali Hill Padel Club',
  startingPointLat: 19.0644,
  startingPointLng: 72.8295,
  locationDetails: 'Meet beside court 2',
  eventFormat: const EventFormatSnapshot(
    activityKind: ActivityKind.padel,
    interactionModel: EventInteractionModel.pairedRotations,
    customActivityLabel: 'Doubles ladder + drinks',
  ),
  bookedCount: 18,
  checkedInCount: 16,
  capacityLimit: 22,
  description: 'A low-pressure padel ladder with drinks after the final set.',
);
final _matchChatMatch = Match(
  id: 'match-chat-context',
  user1Id: _matchChatViewerUid,
  user2Id: _matchChatOtherProfile.uid,
  eventIds: [_matchChatEvent.id],
  createdAt: DateTime(2026, 6, 22, 9, 38),
  lastMessageAt: DateTime(2026, 6, 22, 9, 42),
  lastMessagePreview: 'Deal. 9am, court 2.',
  lastMessageSenderId: _matchChatOtherProfile.uid,
  unreadCounts: const {_matchChatViewerUid: 1},
);
final _matchChatMessages = [
  ChatMessage(
    id: 'match-chat-message-1',
    senderId: _matchChatOtherProfile.uid,
    text: 'Loved the pace today — that last point was unreal.',
    sentAt: DateTime(2026, 6, 22, 9, 38),
  ),
  ChatMessage(
    id: 'match-chat-message-2',
    senderId: _matchChatOtherProfile.uid,
    text: 'Same court next Sunday?',
    sentAt: DateTime(2026, 6, 22, 9, 38),
  ),
  ChatMessage(
    id: 'match-chat-message-3',
    senderId: _matchChatViewerUid,
    text: 'Ha, you set that one up. In for Sunday.',
    sentAt: DateTime(2026, 6, 22, 9, 41),
  ),
  ChatMessage(
    id: 'match-chat-message-4',
    senderId: _matchChatViewerUid,
    text: 'Bringing the good racket this time.',
    sentAt: DateTime(2026, 6, 22, 9, 41),
  ),
  ChatMessage(
    id: 'match-chat-message-5',
    senderId: _matchChatOtherProfile.uid,
    text: 'Deal. 9am, court 2.',
    sentAt: DateTime(2026, 6, 22, 9, 42),
  ),
];
final _matchChatMatchRepository = _CaptureMatchRepository(
  matches: [_matchChatMatch],
);
final _matchChatConversationRepository = _CaptureConversationRepository(
  messagesByConversation: {_matchChatMatch.id: _matchChatMessages},
);
const _matchChatEmptyOtherProfile = PublicProfile(
  uid: 'nyc_tara_reference_001',
  name: 'Tara',
  age: 28,
  gender: Gender.woman,
  city: 'Mumbai',
  occupation: 'Producer',
  company: 'Sunday Table',
);
final _matchChatEmptyEvent = buildEvent(
  id: 'event-match-chat-empty',
  clubId: 'club-match-chat-empty',
  startTime: DateTime(2026, 6, 14, 17),
  endTime: DateTime(2026, 6, 14, 18),
  meetingPoint: 'Bandra Fort Amphitheatre',
  startingPointLat: 19.0429,
  startingPointLng: 72.8181,
  locationDetails: 'Meet at the amphitheatre steps',
  eventFormat: const EventFormatSnapshot(
    activityKind: ActivityKind.socialRun,
    interactionModel: EventInteractionModel.pacePods,
    customActivityLabel: 'Sundowner 5K, Bandra',
  ),
  bookedCount: 16,
  checkedInCount: 14,
  capacityLimit: 24,
  description: 'A relaxed evening 5K around Bandra with an easy social finish.',
);
final _matchChatEmptyMatch = Match(
  id: 'match-chat-empty-reference',
  user1Id: _matchChatViewerUid,
  user2Id: _matchChatEmptyOtherProfile.uid,
  eventIds: [_matchChatEmptyEvent.id],
  createdAt: DateTime(2026, 6, 14, 18, 45),
);

final _captureNow = DateTime(2026, 5, 31, 9);
const _captureViewerUid = 'runner-viewer';
final _captureViewer =
    buildUser(
      uid: _captureViewerUid,
      name: 'Rohan Mehta',
      email: 'rohan@example.com',
      phoneNumber: '+919870000001',
    ).copyWith(
      city: 'in-mh-mumbai',
      relationshipGoal: RelationshipGoal.relationship,
      activityPreferences: const ActivityPreferences(
        running: RunningPreferences(
          paceMinSecsPerKm: 320,
          paceMaxSecsPerKm: 395,
          preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
          runningReasons: [RunReason.community, RunReason.social],
          preferredRunTimes: [PreferredRunTime.earlyMorning],
          version: currentRunPreferencesVersion,
        ),
      ),
    );
final _filtersCaptureProfile = _captureViewer.copyWith(
  interestedInGenders: const [Gender.man],
  minAgePreference: 24,
  maxAgePreference: 36,
);

List<Object> _filtersProviderOverrides({Stream<UserProfile?>? profileStream}) {
  return <Object>[
    watchUserProfileProvider.overrideWith(
      (ref) =>
          profileStream ?? Stream<UserProfile?>.value(_filtersCaptureProfile),
    ),
  ];
}

class _FiltersSaveErrorCapture extends ConsumerStatefulWidget {
  const _FiltersSaveErrorCapture({required this.child});

  final Widget child;

  @override
  ConsumerState<_FiltersSaveErrorCapture> createState() =>
      _FiltersSaveErrorCaptureState();
}

class _FiltersSaveErrorCaptureState
    extends ConsumerState<_FiltersSaveErrorCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      unawaited(
        Future<void>.delayed(Duration.zero, () async {
          await FiltersController.saveFiltersMutation
              .run(ref, (_) async => throw StateError('Filter save failed'))
              .catchError((_) {});
        }),
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _FiltersBodyCapture extends StatelessWidget {
  const _FiltersBodyCapture({
    required this.ageRange,
    required this.interestedIn,
    this.saving = false,
  });

  final RangeValues ageRange;
  final Set<Gender> interestedIn;
  final bool saving;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Scaffold(
      backgroundColor: t.bg,
      appBar: CatchTopBar.route(
        title: 'Filters',
        leading: CatchIconAction.toolbar(
          icon: CatchIcons.close,
          tooltip: 'Close filters',
          onPressed: _noopFiltersTap,
        ),
        actions: [
          CatchButton.text(
            key: SwipeKeys.resetFiltersButton,
            label: 'Reset',
            onPressed: saving ? null : _noopFiltersTap,
          ),
        ],
      ),
      body: FiltersBody(
        ageRange: ageRange,
        interestedIn: interestedIn,
        saving: saving,
        onAgeRangeChanged: _ignoreFiltersRange,
        onGenderToggled: _ignoreFiltersGender,
        onApply: saving ? null : _noopFiltersTap,
      ),
    );
  }
}

void _noopFiltersTap() {}

void _ignoreFiltersRange(RangeValues _) {}

void _ignoreFiltersGender(Gender _) {}

ClubMembership _captureMembership({
  required String clubId,
  required String uid,
  ClubMembershipRole role = ClubMembershipRole.member,
}) => ClubMembership(
  id: clubMembershipId(clubId: clubId, uid: uid),
  clubId: clubId,
  uid: uid,
  role: role,
  status: ClubMembershipStatus.active,
  pushNotificationsEnabled: true,
  joinedAt: DateTime(2026, 1, 12),
);

final _dashboardJoinedClub = _captureFixtures.captureClub(
  id: 'club-dashboard-dawn',
  name: 'Bandra Dawn Club',
  description: 'Coastal loops for people who want an easy first hello.',
  area: 'Bandra',
  hostName: 'Mira',
  tags: const ['social run', 'coffee', 'beginner'],
  memberCount: 142,
  reviewCount: 48,
  nextEventAt: DateTime(2026, 6, 4, 6, 30),
  nextEventLabel: 'Thu 6:30 AM',
);
final _dashboardHostClub = _captureFixtures.hostDemoClub();
final _dashboardSignedUpEvent = _captureFixtures.captureEvent(
  id: 'event-dashboard-next',
  club: _dashboardJoinedClub,
  startTime: DateTime(2026, 6, 4, 6, 30),
  endTime: DateTime(2026, 6, 4, 7, 40),
  meetingPoint: 'Bandra Fort gate',
  bookedCount: 18,
  capacityLimit: 24,
  description: 'A conversational dawn loop with coffee after.',
);
final _dashboardCheckInEvent = _captureFixtures.captureEvent(
  id: 'event-dashboard-check-in',
  club: _dashboardJoinedClub,
  startTime: _captureNow.add(const Duration(minutes: 5)),
  endTime: _captureNow.add(const Duration(hours: 1, minutes: 10)),
  meetingPoint: 'Bandra Fort gate',
  bookedCount: 18,
  capacityLimit: 24,
  description: 'A conversational dawn loop with coffee after.',
);
final _dashboardHostEvent = _captureFixtures.hostDemoEvent(
  role: 'hostEventSetup',
  club: _dashboardHostClub,
);
final _dashboardEditableHostEvent = _dashboardHostEvent.copyWith(
  id: 'event-host-editable',
  startTime: DateTime(2030, 7, 2, 18, 30),
  endTime: DateTime(2030, 7, 2, 20),
  bookedCount: 0,
  waitlistedCount: 0,
  checkedInCount: 0,
);
final _dashboardScheduleLockedHostEvent = _dashboardHostEvent.copyWith(
  id: 'event-host-schedule-locked',
  bookedCount: 1,
);
final _dashboardPrivateAccessHostEvent = _dashboardEditableHostEvent.copyWith(
  id: 'event-host-private-access',
  capacityLimit: 12,
  priceInPaise: 0,
  eventPolicy: EventPolicyBundle.inviteOnlyEvent(
    capacityLimit: 12,
    basePriceInPaise: 0,
    inviteCodeHint: 'SEAFACE',
  ),
);
final _dashboardValidationHostEvent = _dashboardEditableHostEvent.copyWith(
  id: 'event-host-validation',
  meetingPoint: '',
  meetingLocation: const EventMeetingLocation(
    name: '',
    address: 'Carter Road, Bandra West',
    placeId: 'capture-carter-road-empty-label',
    latitude: 19.0706,
    longitude: 72.8223,
    notes: 'Meet by the sea-facing steps',
  ),
  startingPointLat: 19.0706,
  startingPointLng: 72.8223,
  distanceKm: 0,
);
final _dashboardPinnedLocationHostEvent = _dashboardEditableHostEvent.copyWith(
  id: 'event-host-pinned-location',
  meetingPoint: 'Carter Road Amphitheatre',
  meetingLocation: const EventMeetingLocation(
    name: 'Carter Road Amphitheatre',
    address: 'Carter Road, Bandra West',
    placeId: 'capture-carter-road',
    latitude: 19.0706,
    longitude: 72.8223,
    notes: 'Meet by the sea-facing steps',
  ),
  startingPointLat: 19.0706,
  startingPointLng: 72.8223,
  locationDetails: 'Meet by the sea-facing steps',
);
final _dashboardCancelledHostEvent = _dashboardEditableHostEvent.copyWith(
  id: 'event-host-cancelled',
  status: EventLifecycleStatus.cancelled,
  cancelledAt: _captureNow.subtract(const Duration(hours: 2)),
  cancellationReason: 'Capture cancellation.',
);
final _dashboardRecommendedEvent = _captureFixtures.captureEvent(
  id: 'event-dashboard-recommended',
  club: _memberDiscoveryClubs[2],
  startTime: DateTime(2026, 6, 6, 18),
  meetingPoint: 'Juhu court 2',
  activityKind: ActivityKind.pickleball,
  distanceKm: 0,
  bookedCount: 10,
  capacityLimit: 16,
  priceInPaise: 60000,
  description: 'Rotating doubles with a host who balances teams.',
);
final _dashboardSignedUpEvents = [_dashboardSignedUpEvent];
final _dashboardSavedEvents = [
  _dashboardRecommendedEvent,
  _memberDiscoveryEvents[1],
  _memberDiscoveryEvents[2],
];
final _savedEventsPastOnlyEvents = [
  _dashboardRecommendedEvent.copyWith(
    id: 'event-saved-past-pickleball',
    startTime: DateTime(2026, 5, 24, 18),
    endTime: DateTime(2026, 5, 24, 19, 30),
  ),
  _memberDiscoveryEvents[1].copyWith(
    id: 'event-saved-past-dinner',
    startTime: DateTime(2026, 5, 25, 20),
    endTime: DateTime(2026, 5, 25, 22),
  ),
];
final _dashboardAttendedEvents = [
  _captureFixtures.captureEvent(
    id: 'event-dashboard-attended',
    club: _dashboardJoinedClub,
    startTime: DateTime(2026, 5, 30, 7),
    endTime: DateTime(2026, 5, 30, 8, 5),
    meetingPoint: 'Carter Road Amphitheatre',
    bookedCount: 20,
    checkedInCount: 18,
    capacityLimit: 24,
    description: 'Easy miles and a coffee line that did not feel awkward.',
  ),
];
final _dashboardAfterEventFocusEvent = _captureFixtures.captureEvent(
  id: 'event-dashboard-after-focus',
  club: _dashboardJoinedClub,
  startTime: _captureNow.subtract(const Duration(hours: 3)),
  endTime: _captureNow.subtract(const Duration(hours: 2)),
  meetingPoint: 'Carter Road Amphitheatre',
  bookedCount: 20,
  checkedInCount: 18,
  capacityLimit: 24,
  description: 'Easy miles and a coffee line that did not feel awkward.',
);
final _dashboardNotifications = [
  ActivityNotification(
    id: 'notification-dashboard-match',
    uid: _captureViewerUid,
    type: ActivityNotificationType.match,
    title: 'New match',
    body: 'Maya matched after Sunday Table Club.',
    createdAt: DateTime(2026, 5, 31, 8, 40),
  ),
];
Stream<T> _captureLoadingStream<T>() => Stream<T>.empty();

Stream<T> _captureErrorStream<T>(String message) =>
    Stream<T>.error(StateError(message), StackTrace.empty);

final _profileCaptureTargetNoNetwork = ProfileSurfaceFixtures
    .targetPublicProfile
    .copyWith(profilePhotos: const []);
final _profileCaptureOwnNoNetwork = ProfileSurfaceFixtures.ownPublicProfile
    .copyWith(profilePhotos: const []);
final _profileSelfReferenceProfile = ProfileSurfaceFixtures.viewer.copyWith(
  name: 'Aanya',
  firstName: 'Aanya',
  lastName: '',
  displayName: 'Aanya',
  dateOfBirth: DateTime(1998, 12, 31),
  email: 'aanya@catch.test',
  instagramHandle: 'aanyaruns',
  profilePrompts: ProfileSurfaceFixtures.profilePrompts(
    perfectEvent:
        'Long run, longer brunch, and a bookshop I have no business being in.',
    weekend:
        'Gallery mornings, unhurried coffee, and a playlist that keeps the walk going.',
  ),
  profilePhotos: [
    for (final photo in ProfileSurfaceFixtures.viewer.profilePhotos)
      photo.copyWith(url: _profilePortraitAssetPath),
  ],
  city: 'Bandra',
  occupation: 'Designer',
  company: '',
  education: EducationLevel.bachelors,
  religion: Religion.jain,
  languages: const [Language.english, Language.hindi, Language.gujarati],
  activityPreferences: const ActivityPreferences(
    running: RunningPreferences(
      paceMinSecsPerKm: 320,
      paceMaxSecsPerKm: 360,
      preferredDistances: [PreferredDistance.fiveK, PreferredDistance.tenK],
      runningReasons: [RunReason.mindfulness, RunReason.social],
      preferredRunTimes: [PreferredRunTime.earlyMorning],
      version: currentRunPreferencesVersion,
    ),
  ),
);
final _publicProfileReferenceProfile = ProfileSurfaceFixtures
    .targetPublicProfile
    .copyWith(
      name: 'Aanya',
      age: 27,
      city: 'Bandra',
      occupation: 'Designer',
      profilePhotos: [
        for (final photo
            in ProfileSurfaceFixtures.targetPublicProfile.profilePhotos)
          photo.copyWith(url: _profilePortraitAssetPath),
      ],
    );
final _profileInlineSavePendingRepository = _CaptureEditableProfileRepository(
  profile: ProfileSurfaceFixtures.viewer,
);
final _profileInlineSaveErrorRepository = _CaptureEditableProfileRepository(
  profile: ProfileSurfaceFixtures.viewer,
  updateError: StateError('Save failed'),
);
final _profilePerfectRunPromptTitle = profilePromptDefinition(
  profilePromptPerfectEventId,
).title;

List<Object> _selfProfileProviderOverrides({
  Stream<UserProfile?>? profileStream,
  UserProfile? profile,
  Set<int> uploadLoadingIndices = const <int>{},
  bool useRealPhotoUploadController = false,
}) {
  final effectiveProfile = profile ?? ProfileSurfaceFixtures.viewer;
  return [
    uidProvider.overrideWithValue(
      const AsyncData<String?>(ProfileSurfaceFixtures.viewerUid),
    ),
    watchUserProfileProvider.overrideWith(
      (ref) => profileStream ?? Stream<UserProfile?>.value(effectiveProfile),
    ),
    userProfileRepositoryProvider.overrideWithValue(
      ProfileFixtureUserProfileRepository(profile: effectiveProfile),
    ),
    if (!useRealPhotoUploadController)
      photoUploadControllerProvider.overrideWithValue(
        PhotoUploadState.fromLegacy(loadingIndices: uploadLoadingIndices),
      ),
    userAnalyticsRepositoryProvider.overrideWithValue(
      ProfileFixtureUserAnalyticsRepository(
        report: ProfileSurfaceFixtures.analyticsReport,
      ),
    ),
  ];
}

List<Object> _selfProfileUploadFailureProviderOverrides() {
  return [
    ..._selfProfileProviderOverrides(useRealPhotoUploadController: true),
    imageUploadRepositoryProvider.overrideWithValue(
      _CaptureFailingImageUploadRepository(),
    ),
    errorLoggerProvider.overrideWithValue(_CaptureSilentErrorLogger()),
  ];
}

List<Object> _editableSelfProfileProviderOverrides(
  _CaptureEditableProfileRepository repository,
) {
  return [
    uidProvider.overrideWithValue(
      const AsyncData<String?>(ProfileSurfaceFixtures.viewerUid),
    ),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(repository.profile),
    ),
    userProfileRepositoryProvider.overrideWithValue(repository),
    photoUploadControllerProvider.overrideWithValue(const PhotoUploadState()),
    userAnalyticsRepositoryProvider.overrideWithValue(
      ProfileFixtureUserAnalyticsRepository(
        report: ProfileSurfaceFixtures.analyticsReport,
      ),
    ),
    errorLoggerProvider.overrideWithValue(_CaptureSilentErrorLogger()),
  ];
}

class _CaptureEditableProfileRepository extends Fake
    implements UserProfileRepository {
  _CaptureEditableProfileRepository({required this.profile, this.updateError});

  final UserProfile profile;
  Object? updateError;
  Completer<void>? _updateCompleter;

  void holdNextUpdate() {
    _updateCompleter = Completer<void>();
  }

  void releaseHeldUpdate() {
    final completer = _updateCompleter;
    _updateCompleter = null;
    if (completer != null && !completer.isCompleted) {
      completer.complete();
    }
  }

  @override
  Stream<UserProfile?> watchUserProfile({required String? uid}) =>
      Stream<UserProfile?>.value(uid == null ? null : profile);

  @override
  Future<UserProfile?> fetchUserProfile({required String? uid}) async =>
      uid == null ? null : profile;

  @override
  Future<void> updateUserProfile({
    required String uid,
    required UpdateUserProfilePatch patch,
    String action = 'update profile',
  }) async {
    final error = updateError;
    if (error != null) throw error;
    final completer = _updateCompleter;
    if (completer != null) {
      await completer.future;
    }
  }
}

Future<void> _driveProfileInlineSavePending(WidgetTester tester) async {
  _profileInlineSavePendingRepository.holdNextUpdate();
  await _openProfileCaptureField(tester, 'Education');
  await tester.tap(_profileCaptureChip(EducationLevel.values.first.label));
  await tester.pump();
  _tapProfileCaptureDone(tester);
}

Future<void> _cleanupProfileInlineSavePending(WidgetTester tester) async {
  _profileInlineSavePendingRepository.releaseHeldUpdate();
  await tester.pump();
}

Future<void> _driveProfileInlineSaveError(WidgetTester tester) async {
  await _openProfileCaptureField(tester, _profilePerfectRunPromptTitle);
  await tester.enterText(
    find.descendant(
      of: _profileCaptureInfoTile(_profilePerfectRunPromptTitle),
      matching: find.byType(EditableText),
    ),
    'Updated bio',
  );
  _tapProfileCaptureDone(tester);
}

Future<void> _openProfileCaptureField(WidgetTester tester, String label) async {
  final field = _profileCaptureInfoTile(label);
  await tester.dragUntilVisible(
    field,
    find.byKey(const ValueKey('profile-tab-scroll-view')),
    const Offset(0, -300),
  );
  await tester.ensureVisible(field);
  await tester.pump();
  await tester.tap(field);
  await tester.pump();
}

Finder _profileCaptureInfoTile(String label) => find.byWidgetPredicate(
  (widget) =>
      widget is CatchField &&
      widget.title == label &&
      widget.variant == CatchFieldVariant.row,
);

Finder _profileCaptureChip(String label) =>
    find.widgetWithText(CatchChip, label);

void _tapProfileCaptureDone(WidgetTester tester) {
  final doneButton = find.widgetWithText(CatchButton, 'Done');
  tester.widget<CatchButton>(doneButton).onPressed?.call();
}

class _CaptureFailingImageUploadRepository extends Fake
    implements ImageUploadRepository {
  @override
  Future<XFile?> pickImage({
    ImageUploadPurpose purpose = ImageUploadPurpose.profilePhoto,
    int? imageQuality,
  }) async {
    return XFile.fromData(
      _createClubPngBytes(),
      name: 'profile-upload-failure.png',
      mimeType: 'image/png',
    );
  }

  @override
  Future<UploadedImage> uploadUserProfilePhoto({
    required String uid,
    required int index,
    required XFile image,
    ValueChanged<ImageUploadProgress>? onProgress,
    ImageUploadCancellationToken? cancellationToken,
  }) async {
    throw obviousOfflineException(
      context: const BackendErrorContext(
        service: BackendService.storage,
        action: 'upload profile photo',
        resource: 'profile_photos',
      ),
    );
  }
}

class _CaptureSilentErrorLogger extends ErrorLogger {
  _CaptureSilentErrorLogger()
    : super(crashReporter: null, shouldReportErrors: false);

  @override
  void log({
    required LogLevel level,
    required String message,
    Object? error,
    StackTrace? stackTrace,
    Map<String, String>? context,
  }) {}
}

class _CaptureUnsupportedFcmService extends FcmService {
  _CaptureUnsupportedFcmService()
    : super(FakeFirebaseFirestore(), _CaptureSilentErrorLogger());

  @override
  bool get isSupportedPlatform => false;
}

List<Object> _publicProfileProviderOverrides({
  String uid = ProfileSurfaceFixtures.targetUid,
  PublicProfile? profile,
  Stream<PublicProfile?>? profileStream,
}) {
  final effectiveProfile =
      profile ??
      (uid == ProfileSurfaceFixtures.ownUid
          ? _profileCaptureOwnNoNetwork
          : _profileCaptureTargetNoNetwork);
  return [
    uidProvider.overrideWithValue(
      const AsyncData<String?>(ProfileSurfaceFixtures.viewerUid),
    ),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(ProfileSurfaceFixtures.viewer),
    ),
    watchPublicProfileProvider(uid).overrideWith(
      (ref) => profileStream ?? Stream<PublicProfile?>.value(effectiveProfile),
    ),
    publicProfileRepositoryProvider.overrideWithValue(
      ProfileFixturePublicProfileRepository({
        uid: effectiveProfile,
        ProfileSurfaceFixtures.targetUid: _profileCaptureTargetNoNetwork,
        ProfileSurfaceFixtures.ownUid: _profileCaptureOwnNoNetwork,
      }),
    ),
    safetyRepositoryProvider.overrideWithValue(
      const ProfileFixtureSafetyRepository(),
    ),
  ];
}

Widget _selfProfileCapture({SelfProfileTab initialTab = SelfProfileTab.edit}) =>
    ProfileScreen(initialTab: initialTab);

Widget _editableSelfProfileCapture() => ProfileTabBody(
  user: ProfileSurfaceFixtures.viewer,
  uploadState: const PhotoUploadState(),
  builder: (context, children) => ListView(
    key: const ValueKey('profile-tab-scroll-view'),
    padding: CatchInsets.pageBody.copyWith(left: 0, right: 0),
    children: children,
  ),
);

class _SelfProfileUploadFailureCapture extends ConsumerStatefulWidget {
  const _SelfProfileUploadFailureCapture();

  @override
  ConsumerState<_SelfProfileUploadFailureCapture> createState() =>
      _SelfProfileUploadFailureCaptureState();
}

class _SelfProfileUploadFailureCaptureState
    extends ConsumerState<_SelfProfileUploadFailureCapture> {
  var _seeded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _seedFailure());
  }

  void _seedFailure() {
    if (!mounted || _seeded) return;
    _seeded = true;
    PhotoUploadController.uploadPhotoMutation.reset(ref);
    unawaited(
      PhotoUploadController.uploadPhotoMutation
          .run(ref, (tx) async {
            await tx
                .get(photoUploadControllerProvider.notifier)
                .pickAndUpload(1);
          })
          .catchError((_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => _selfProfileCapture();
}

Widget _publicProfileCapture({
  String uid = ProfileSurfaceFixtures.targetUid,
  PublicProfile? initialProfile,
}) => _poppableRouteCapture(
  PublicProfileScreen(uid: uid, initialProfile: initialProfile),
);

Widget _poppableRouteCapture(Widget child) {
  PageRoute<void> routeFor(Widget routeChild) {
    return PageRouteBuilder<void>(
      pageBuilder: (context, animation, secondaryAnimation) => routeChild,
      transitionDuration: Duration.zero,
      reverseTransitionDuration: Duration.zero,
    );
  }

  return Navigator(
    onGenerateInitialRoutes: (navigator, initialRoute) => [
      routeFor(const SizedBox.shrink()),
      routeFor(child),
    ],
  );
}

class _PublicProfileReportMutationCapture extends ConsumerStatefulWidget {
  const _PublicProfileReportMutationCapture({required this.mode});

  final _PublicProfileReportMutationMode mode;

  @override
  ConsumerState<_PublicProfileReportMutationCapture> createState() =>
      _PublicProfileReportMutationCaptureState();
}

class _PublicProfileReportMutationCaptureState
    extends ConsumerState<_PublicProfileReportMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      PublicProfileController.reportUserMutation.reset(ref);
      switch (widget.mode) {
        case _PublicProfileReportMutationMode.pending:
          _runPending(PublicProfileController.reportUserMutation);
          break;
        case _PublicProfileReportMutationMode.success:
          _runSuccess(PublicProfileController.reportUserMutation);
          break;
        case _PublicProfileReportMutationMode.error:
          _runError(PublicProfileController.reportUserMutation);
          break;
      }
    });
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    _publicProfileReportPendingCompleter = completer;
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runSuccess(Mutation<void> mutation) {
    unawaited(
      mutation.run(ref, (_) async {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      }),
    );
  }

  void _runError(Mutation<void> mutation) {
    unawaited(
      mutation
          .run(ref, (_) async {
            await Future<void>.delayed(const Duration(milliseconds: 50));
            throw StateError('report failed');
          })
          .catchError((_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => _publicProfileCapture();
}

enum _PublicProfileReportMutationMode { pending, success, error }

Completer<void>? _publicProfileReportPendingCompleter;

Future<void> _cleanupPublicProfileReportPending(WidgetTester tester) async {
  final completer = _publicProfileReportPendingCompleter;
  _publicProfileReportPendingCompleter = null;
  if (completer != null && !completer.isCompleted) {
    completer.complete();
  }
}

class _PublicProfilePendingOverlayCapture extends StatelessWidget {
  const _PublicProfilePendingOverlayCapture();

  @override
  Widget build(BuildContext context) {
    return PublicProfileBody(
      profile: _profileCaptureTargetNoNetwork,
      submitting: true,
      viewerProfile: ProfileSurfaceFixtures.viewer,
    );
  }
}

class _PublicProfileReportSheetCapture extends StatelessWidget {
  const _PublicProfileReportSheetCapture();

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: Alignment.bottomCenter,
      child: PublicProfileReportSheet(
        profileName: ProfileSurfaceFixtures.targetPublicProfile.name,
        onReasonSelected: (_) {},
      ),
    );
  }
}

class _PublicProfileBlockDialogCapture extends StatefulWidget {
  const _PublicProfileBlockDialogCapture();

  @override
  State<_PublicProfileBlockDialogCapture> createState() =>
      _PublicProfileBlockDialogCaptureState();
}

class _PublicProfileBlockDialogCaptureState
    extends State<_PublicProfileBlockDialogCapture> {
  bool _shown = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_shown) return;
    _shown = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      unawaited(
        showBlockUserDialog(
          context: context,
          name: ProfileSurfaceFixtures.targetPublicProfile.name,
        ),
      );
    });
  }

  @override
  Widget build(BuildContext context) => const SizedBox.expand();
}

NetworkException _dashboardOfflineException({required String action}) {
  return obviousOfflineException(
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: 'dashboard',
    ),
  );
}

List<Object> _dashboardProviderOverrides({
  Stream<UserProfile?>? profileStream,
  Stream<List<ClubMembership>>? membershipsStream,
  Stream<List<Event>>? signedUpEventsStream,
  List<ClubMembership>? memberships,
  List<Event>? signedUpEvents,
  AsyncValue<List<Event>>? attendedEvents,
  AsyncValue<List<ActivityNotification>>? notifications,
  AsyncValue<WeeklyActivitySnapshot>? weeklyActivity,
  AsyncValue<List<Review>>? reviews,
  AsyncValue<List<ExploreEventRecommendationCandidate>>? recommendations,
}) {
  final effectiveMemberships =
      memberships ??
      [
        _captureMembership(
          clubId: _dashboardJoinedClub.id,
          uid: _captureViewerUid,
        ),
      ];
  final effectiveSignedUpEvents = signedUpEvents ?? _dashboardSignedUpEvents;
  final followedClubIds = effectiveMemberships
      .map((membership) => membership.clubId)
      .toList(growable: false);
  final recommendationsQuery = ExploreRecommendationsQuery(
    userId: _captureViewerUid,
    followedClubIds: followedClubIds,
  );

  return [
    dashboardNowProvider.overrideWithValue(_captureNow),
    uidProvider.overrideWith((ref) => Stream.value(_captureViewerUid)),
    watchUserProfileProvider.overrideWith(
      (ref) => profileStream ?? Stream.value(_captureViewer),
    ),
    watchActiveClubMembershipsForUserProvider(_captureViewerUid).overrideWith(
      (ref) =>
          membershipsStream ??
          Stream<List<ClubMembership>>.value(effectiveMemberships),
    ),
    watchSignedUpEventsProvider(_captureViewerUid).overrideWith(
      (ref) =>
          signedUpEventsStream ??
          Stream<List<Event>>.value(effectiveSignedUpEvents),
    ),
    watchAttendedEventsProvider(
      _captureViewerUid,
    ).overrideWithValue(attendedEvents ?? AsyncData(_dashboardAttendedEvents)),
    watchActivityNotificationsProvider(
      _captureViewerUid,
    ).overrideWithValue(notifications ?? AsyncData(_dashboardNotifications)),
    clubsRepositoryProvider.overrideWith((ref) => _captureClubsRepository),
    watchClubsHostedByProvider(
      _captureViewerUid,
    ).overrideWithValue(AsyncData([_dashboardHostClub])),
    watchClubsOwnedByProvider(
      _captureViewerUid,
    ).overrideWithValue(const AsyncData([])),
    watchEventsForClubProvider(
      _dashboardHostClub.id,
    ).overrideWithValue(AsyncData([_dashboardHostEvent])),
    weeklyActivityProvider.overrideWithValue(
      weeklyActivity ??
          AsyncData(
            WeeklyActivitySnapshot.permissionRequired(
              referenceDate: _captureNow,
              platformLabel: 'Apple Health',
            ),
          ),
    ),
    watchReviewsByUserProvider(
      _captureViewerUid,
    ).overrideWithValue(reviews ?? const AsyncData<List<Review>>([])),
    exploreRecommendedEventsProvider(recommendationsQuery).overrideWithValue(
      recommendations ??
          AsyncData([
            ExploreEventRecommendationCandidate(
              event: _dashboardRecommendedEvent,
              clubName: _memberDiscoveryClubs[2].name,
              clubLocation: _memberDiscoveryClubs[2].location,
            ),
          ]),
    ),
  ];
}

enum _DashboardCheckInMutationMode { pending, error }

class _DashboardCheckInMutationCapture extends ConsumerStatefulWidget {
  const _DashboardCheckInMutationCapture({required this.mode});

  final _DashboardCheckInMutationMode mode;

  @override
  ConsumerState<_DashboardCheckInMutationCapture> createState() =>
      _DashboardCheckInMutationCaptureState();
}

class _DashboardCheckInMutationCaptureState
    extends ConsumerState<_DashboardCheckInMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      EventBookingController.selfCheckInMutation.reset(ref);
      switch (widget.mode) {
        case _DashboardCheckInMutationMode.pending:
          _runPending(EventBookingController.selfCheckInMutation);
          break;
        case _DashboardCheckInMutationMode.error:
          _runError(EventBookingController.selfCheckInMutation);
          break;
      }
    });
  }

  @override
  void dispose() {
    super.dispose();
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation) {
    unawaited(
      mutation
          .run(ref, (_) async => throw StateError('Capture check-in failed'))
          .catchError((_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => const DashboardScreen();
}

final _captureClubsRepository = club_test.FakeClubsRepository()
  ..clubsById[_dashboardJoinedClub.id] = _dashboardJoinedClub
  ..clubsById[_dashboardHostClub.id] = _dashboardHostClub
  ..clubsById[_memberDiscoveryClubs[0].id] = _memberDiscoveryClubs[0]
  ..clubsById[_memberDiscoveryClubs[1].id] = _memberDiscoveryClubs[1]
  ..clubsById[_memberDiscoveryClubs[2].id] = _memberDiscoveryClubs[2];

List<Object> _calendarProviderOverrides({
  AsyncValue<String?> uid = const AsyncData<String?>(_captureViewerUid),
  AsyncValue<List<Event>>? signedUpEvents,
  AsyncValue<List<Event>>? savedEvents,
  AsyncValue<Map<String, String>>? clubNames,
}) {
  final effectiveSignedUpEvents =
      signedUpEvents ?? AsyncData<List<Event>>(_dashboardSignedUpEvents);
  final effectiveSavedEvents =
      savedEvents ?? AsyncData<List<Event>>(_dashboardSavedEvents);
  final clubNameQuery = ClubNameLookupQuery([
    for (final event in _asyncDataList(effectiveSignedUpEvents)) event.clubId,
    for (final event in _asyncDataList(effectiveSavedEvents)) event.clubId,
  ]);

  return <Object>[
    uidProvider.overrideWithValue(uid),
    watchSignedUpEventsProvider(
      _captureViewerUid,
    ).overrideWithValue(effectiveSignedUpEvents),
    watchSavedEventDetailsForUserProvider(
      _captureViewerUid,
    ).overrideWithValue(effectiveSavedEvents),
    clubsRepositoryProvider.overrideWith((ref) => _captureClubsRepository),
    if (clubNames != null)
      clubNameLookupProvider(clubNameQuery).overrideWithValue(clubNames),
  ];
}

List<T> _asyncDataList<T>(AsyncValue<List<T>> value) {
  return switch (value) {
    AsyncData<List<T>>(:final value) => value,
    _ => <T>[],
  };
}

List<Object> _savedEventsProviderOverrides({
  AsyncValue<String?> uid = const AsyncData<String?>(_captureViewerUid),
  AsyncValue<List<Event>>? savedEvents,
  AsyncValue<Map<String, String>>? clubNames,
}) {
  final effectiveSavedEvents =
      savedEvents ?? AsyncData<List<Event>>(_dashboardSavedEvents);
  final events = _asyncDataList(effectiveSavedEvents);
  final clubNameQuery = ClubNameLookupQuery(
    events.map((event) => event.clubId),
  );

  return <Object>[
    uidProvider.overrideWithValue(uid),
    watchSavedEventDetailsForUserProvider(
      _captureViewerUid,
    ).overrideWithValue(effectiveSavedEvents),
    clubsRepositoryProvider.overrideWith((ref) => _captureClubsRepository),
    if (events.isNotEmpty)
      clubNameLookupProvider(clubNameQuery).overrideWithValue(
        clubNames ??
            AsyncData<Map<String, String>>(_clubNamesForEvents(events)),
      ),
  ];
}

Map<String, String> _clubNamesForEvents(List<Event> events) {
  return <String, String>{
    for (final event in events)
      event.clubId:
          _captureClubsRepository.clubsById[event.clubId]?.name ?? event.clubId,
  };
}

final _clubDetailClub = _captureFixtures.captureClub(
  id: 'club-detail-member',
  name: 'Sea Face Social',
  description:
      'A member-led running club for low-pressure miles, good coffee, and people who remember your name.',
  area: 'Bandra',
  hostName: 'Mira',
  tags: const ['running', 'coffee', 'members only'],
  memberCount: 214,
  rating: 4.9,
  reviewCount: 58,
  nextEventAt: DateTime(2026, 6, 2, 6, 45),
  nextEventLabel: 'Tue 6:45 AM',
);
final _clubDetailEvents = [
  _captureFixtures.captureEvent(
    id: 'event-club-detail-sunrise',
    club: _clubDetailClub,
    startTime: DateTime(2026, 6, 2, 6, 45),
    meetingPoint: 'Bandstand promenade',
    distanceKm: 6,
    bookedCount: 16,
    capacityLimit: 22,
    description: 'Morning miles with regroup points and a cafe finish.',
  ),
  _captureFixtures.captureEvent(
    id: 'event-club-detail-weekend',
    club: _clubDetailClub,
    startTime: DateTime(2026, 6, 7, 8),
    meetingPoint: 'Bandra Fort gate',
    activityKind: ActivityKind.walking,
    distanceKm: 3,
    bookedCount: 19,
    capacityLimit: 28,
    description: 'A social weekend walk for new members.',
  ),
];
final _clubDetailReviews = [
  buildReview(
    id: 'review-club-detail-1',
    clubId: _clubDetailClub.id,
    reviewerUserId: 'runner-neha',
    reviewerName: 'Neha',
    comment: 'Friendly hosts, clear routes, and zero awkward hovering.',
    createdAt: DateTime(2026, 5, 24),
  ),
];

ClubDetailViewModel _clubDetailViewModel({
  Club? club,
  String? uid = _captureViewerUid,
  bool isHost = false,
  bool isMember = true,
  bool isAuthenticated = true,
  List<Event>? upcomingEvents,
  List<Review>? reviews,
  UserProfile? userProfile,
  bool includeUserProfile = true,
}) {
  return ClubDetailViewModel(
    club: club ?? _clubDetailClub,
    isHost: isHost,
    isMember: isMember,
    upcomingEvents: upcomingEvents ?? _clubDetailEvents,
    reviews: reviews ?? _clubDetailReviews,
    userProfile: includeUserProfile ? userProfile ?? _captureViewer : null,
    uid: uid,
    isAuthenticated: isAuthenticated,
  );
}

List<Object> _clubDetailProviderOverrides({
  String? uid = _captureViewerUid,
  ClubMembership? membership,
  required AsyncValue<ClubDetailViewModel?> viewModel,
}) {
  final effectiveUid = uid;
  return [
    uidProvider.overrideWith((ref) => Stream.value(effectiveUid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(effectiveUid == null ? null : _captureViewer),
    ),
    if (effectiveUid != null)
      watchClubMembershipProvider(
        _clubDetailClub.id,
        effectiveUid,
      ).overrideWith((ref) => Stream.value(membership)),
    clubDetailViewModelProvider(
      _clubDetailClub.id,
    ).overrideWith((ref) => viewModel),
  ];
}

Widget _clubDetailScreenCapture({bool includeInitialClub = true}) {
  return ClubDetailScreen(
    clubId: _clubDetailClub.id,
    initialClub: includeInitialClub ? _clubDetailClub : null,
  );
}

Widget _clubDetailMutationCapture({
  required bool isMember,
  required bool isAuthenticated,
  bool isMutating = false,
  Object? mutationError,
}) {
  final dockState = !isAuthenticated
      ? ClubDetailDockRole.guest
      : isMember
      ? ClubDetailDockRole.member
      : ClubDetailDockRole.visitor;
  final footnote = switch (dockState) {
    ClubDetailDockRole.visitor => 'FREE TO JOIN · LEAVE ANYTIME',
    ClubDetailDockRole.member => 'MEMBER · MANAGE ANYTIME',
    _ => null,
  };

  return Scaffold(
    body: Column(
      children: [
        if (mutationError != null)
          CatchLocalizedErrorBanner(
            mutationError,
            context: AppErrorContext.club,
            onRetry: () {},
          ),
        Expanded(
          child: ClubDetailBody(
            state: ClubDetailBodyState.fromDomain(
              club: _clubDetailClub,
              upcomingEvents: _clubDetailEvents,
              reviews: _clubDetailReviews,
              userProfile: isAuthenticated ? _captureViewer : null,
              uid: isAuthenticated ? _captureViewerUid : null,
              isMember: isMember,
              isMutating: isMutating,
              clubPushNotificationsEnabled: isMember,
              isAuthenticated: isAuthenticated,
            ),
          ),
        ),
      ],
    ),
    bottomNavigationBar: ClubDetailDock(
      state: dockState,
      activityKind: _clubDetailClub.hostDefaults.primaryActivityKind,
      members: _clubDetailClub.memberCount,
      footnote: footnote,
      isJoinLoading: isMutating,
      onSignIn: () {},
      onJoin: () {},
      onManage: () {},
      onBell: () {},
    ),
  );
}

class _AppRoleCapture extends StatefulWidget {
  const _AppRoleCapture({required this.role, required this.child});

  final AppRole role;
  final Widget child;

  @override
  State<_AppRoleCapture> createState() => _AppRoleCaptureState();
}

class _AppRoleCaptureState extends State<_AppRoleCapture> {
  @override
  void initState() {
    super.initState();
    AppConfig.configureEntrypointRole(widget.role);
  }

  @override
  void didUpdateWidget(_AppRoleCapture oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.role != widget.role) {
      AppConfig.configureEntrypointRole(widget.role);
    }
  }

  @override
  void dispose() {
    AppConfig.resetEntrypointRoleOverrideForTesting();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    AppConfig.configureEntrypointRole(widget.role);
    return widget.child;
  }
}

class _HostRoutedShellCapture extends StatefulWidget {
  const _HostRoutedShellCapture({
    required this.initialLocation,
    required this.activeIndex,
    required this.child,
  });

  final String initialLocation;
  final int activeIndex;
  final Widget child;

  @override
  State<_HostRoutedShellCapture> createState() =>
      _HostRoutedShellCaptureState();
}

class _HostRoutedShellCaptureState extends State<_HostRoutedShellCapture> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    AppConfig.configureEntrypointRole(AppRole.host);
    _router = GoRouter(
      initialLocation: widget.initialLocation,
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) =>
              HostAppShell(navigationShell: navigationShell),
          branches: [
            _branch('/host/today', 0),
            _branch('/host/events', 1),
            _audienceBranch(2),
            _branch('/host/inbox', 3),
            _branch('/host/organizer', 4),
          ],
        ),
      ],
    );
  }

  StatefulShellBranch _branch(String path, int index) {
    return StatefulShellBranch(
      routes: [
        GoRoute(
          path: path,
          builder: (context, state) => index == widget.activeIndex
              ? widget.child
              : const SizedBox.shrink(),
        ),
      ],
    );
  }

  StatefulShellBranch _audienceBranch(int index) {
    Widget builder(BuildContext context, GoRouterState state) =>
        index == widget.activeIndex ? widget.child : const SizedBox.shrink();
    return StatefulShellBranch(
      routes: [GoRoute(path: '/host/audience', builder: builder)],
    );
  }

  @override
  void dispose() {
    _router.dispose();
    AppConfig.resetEntrypointRoleOverrideForTesting();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    AppConfig.configureEntrypointRole(AppRole.host);
    return MaterialApp.router(
      debugShowCheckedModeBanner: false,
      theme: Theme.of(context),
      routerConfig: _router,
      builder: (context, child) =>
          CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
    );
  }
}

List<Object> _hostShellCaptureOverrides(String uid, {int unreadCount = 0}) {
  return [
    _captureAnalyticsOverride,
    errorLoggerProvider.overrideWithValue(_CaptureSilentErrorLogger()),
    fcmServiceProvider.overrideWithValue(_CaptureUnsupportedFcmService()),
    appConnectivityProvider.overrideWith(
      (ref) =>
          Stream.value(const <ConnectivityResult>[ConnectivityResult.wifi]),
    ),
    totalUnreadCountProvider(uid).overrideWithValue(unreadCount),
  ];
}

class _ReferenceChromeSafeArea extends StatelessWidget {
  const _ReferenceChromeSafeArea({required this.child});

  static const _fallbackInsets = EdgeInsets.only(top: 44, bottom: 44);

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final padding = media.padding;
    final resolvedPadding = EdgeInsets.only(
      top: padding.top == 0 ? _fallbackInsets.top : padding.top,
      bottom: padding.bottom == 0 ? _fallbackInsets.bottom : padding.bottom,
      left: padding.left,
      right: padding.right,
    );

    return MediaQuery(
      data: media.copyWith(
        padding: resolvedPadding,
        viewPadding: resolvedPadding,
      ),
      child: child,
    );
  }
}

List<Object> _hostOperationsProviderOverrides({
  List<OrganizerProgramListRow> programRows = const [],
  List<Club>? hostedClubs,
  List<Club>? ownedClubs,
  AsyncValue<HostProfile?>? hostProfile,
  AsyncValue<List<Club>>? hostedClubsAsync,
  AsyncValue<List<Club>>? ownedClubsAsync,
  Map<String, AsyncValue<List<Event>>> clubEvents = const {},
  AsyncValue<HostPaymentAccount?>? paymentAccountValue,
  HostAnalyticsRepository analyticsRepository =
      const HostFixtureAnalyticsRepository(),
}) {
  final uid = HostOperationsFixtures.hostUid;
  final hosted = hostedClubs ?? HostOperationsFixtures.clubs;
  final owned =
      ownedClubs ??
      [HostOperationsFixtures.primaryClub, HostOperationsFixtures.dinnerClub];
  final eventClubIds = <String>{
    for (final club in HostOperationsFixtures.clubs) club.id,
    for (final club in hosted) club.id,
    for (final club in owned) club.id,
    ...clubEvents.keys,
  };
  final clubsById = <String, Club>{
    for (final club in HostOperationsFixtures.clubs) club.id: club,
    for (final club in hosted) club.id: club,
    for (final club in owned) club.id: club,
  };
  final timelineEventsByOrganizer = <String, List<Event>>{
    for (final clubId in eventClubIds)
      clubId: switch (clubEvents[clubId]) {
        AsyncData<List<Event>>(:final value) => value,
        _ => HostOperationsFixtures.eventsByClub[clubId] ?? const <Event>[],
      },
  };

  return [
    programEventsControllerProvider.overrideWith((ref, request) {
      final controller = ProgramEventsController(
        isActorCurrent: () => true,
        fetchPage: ({cursor, programId}) async =>
            OrganizerProgramInventoryPage(programs: programRows),
        mutate: (_, _) async =>
            throw StateError('Preview inventory is read only'),
        onMutation: (_) {},
      );
      ref.onDispose(controller.dispose);
      unawaited(controller.refresh());
      return controller;
    }),
    hostTodayFeedControllerProvider.overrideWith2(
      (_) => _CaptureHostTodayFeedController(timelineEventsByOrganizer),
    ),
    hostEventsTimelineControllerProvider.overrideWith2(
      (_) => _CaptureHostEventsTimelineController(timelineEventsByOrganizer),
    ),
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(HostOperationsFixtures.owner),
    ),
    if (hostProfile == null)
      watchHostProfileProvider(
        uid,
      ).overrideWith((ref) => Stream.value(HostOperationsFixtures.hostProfile))
    else
      watchHostProfileProvider(uid).overrideWithValue(hostProfile),
    if (hostedClubsAsync == null)
      watchClubsHostedByProvider(
        uid,
      ).overrideWith((ref) => Stream.value(hosted))
    else
      watchClubsHostedByProvider(uid).overrideWithValue(hostedClubsAsync),
    if (ownedClubsAsync == null)
      watchClubsOwnedByProvider(uid).overrideWith((ref) => Stream.value(owned))
    else
      watchClubsOwnedByProvider(uid).overrideWithValue(ownedClubsAsync),
    watchHostPaymentAccountsProvider(
      uid,
    ).overrideWithValue(switch (paymentAccountValue) {
      AsyncData(:final value) => AsyncData(value == null ? const [] : [value]),
      AsyncError(:final error, :final stackTrace) =>
        AsyncError<List<HostPaymentAccount>>(error, stackTrace),
      _ => const AsyncLoading<List<HostPaymentAccount>>(),
    }),
    hostClubEditControllerProvider.overrideWithValue(
      const _CaptureNoopHostClubEditActions(),
    ),
    hostPaymentAccountControllerProvider.overrideWithValue(
      const _CaptureNoopHostPaymentAccountActions(),
    ),
    hostAnalyticsRepositoryProvider.overrideWithValue(analyticsRepository),
    for (final clubId in eventClubIds)
      clubEventDraftsProvider(
        clubId: clubId,
      ).overrideWithValue(const AsyncData<List<EventDraft>>([])),
    for (final club in clubsById.values)
      clubDetailViewModelProvider(club.id).overrideWithValue(
        AsyncData<ClubDetailViewModel?>(
          ClubDetailViewModel(
            club: club,
            isHost: true,
            isMember: false,
            upcomingEvents: switch (clubEvents[club.id]) {
              AsyncData<List<Event>>(:final value) => value,
              _ =>
                HostOperationsFixtures.eventsByClub[club.id] ?? const <Event>[],
            },
            reviews: const [],
            userProfile: HostOperationsFixtures.owner,
            uid: uid,
            isAuthenticated: true,
          ),
        ),
      ),
    for (final clubId in eventClubIds)
      if (clubEvents.containsKey(clubId))
        watchEventsForClubProvider(
          clubId,
        ).overrideWithValue(clubEvents[clubId]!)
      else
        watchEventsForClubProvider(clubId).overrideWith(
          (ref) => Stream.value(
            HostOperationsFixtures.eventsByClub[clubId] ?? const <Event>[],
          ),
        ),
  ];
}

class _CaptureHostTodayFeedController extends HostTodayFeedController {
  _CaptureHostTodayFeedController(this.eventsByOrganizer);

  final Map<String, List<Event>> eventsByOrganizer;

  @override
  Future<HostTodayFeedData> build(HostTodayFeedRequest request) async {
    final events = eventsByOrganizer[request.organizerId] ?? const <Event>[];
    final activeEvents = events
        .where((event) => event.endTime.isAfter(request.sessionBoundary))
        .toList(growable: false);
    return HostTodayFeedData(
      activeEvents: activeEvents,
      pastEvents: events
          .where((event) => !event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      attentionItems: _captureTodayAttentionItems(
        activeEvents,
        request.sessionBoundary,
      ),
      localAttendanceMerged: true,
    );
  }
}

List<HostAttentionItem> _captureTodayAttentionItems(
  Iterable<Event> events,
  DateTime now,
) => [
  for (final event in events)
    if (event.waitlistCount > 0 &&
        !event.effectiveEventPolicy.admissionPolicy.manualApprovalRequired)
      HostAttentionItem(
        id: 'capture-attention-${event.id}',
        kind: HostAttentionKind.eventWaitlistReview,
        scope: HostAttentionScope.event,
        sourceOwner: HostAttentionSourceOwner.events,
        sourceId: event.id,
        sourceRevision: 'capture-${event.waitlistCount}',
        eventId: event.id,
        status: HostAttentionStatus.open,
        consequence: HostAttentionConsequence.risksGuestExperience,
        blocking: false,
        urgency: event.startTime.difference(now) <= const Duration(hours: 24)
            ? HostAttentionUrgency.immediate
            : event.startTime.difference(now) <= const Duration(hours: 72)
            ? HostAttentionUrgency.soon
            : HostAttentionUrgency.upcoming,
        destination: HostAttentionDestination(
          route: HostAttentionDestinationRoute.hostEventManage,
          section: 'guests',
          eventId: event.id,
        ),
        context: HostAttentionContext(
          eventName: event.title,
          count: event.waitlistCount,
        ),
        dedupeKey: 'eventWaitlistReview:${event.id}',
        policyVersion: 1,
        resolutionVersion: 1,
        assignedHostUid: null,
        openedAt: now,
        dueAt: event.startTime.subtract(const Duration(hours: 24)),
        expiresAt: event.endTime,
      ),
];

class _CaptureHostEventsTimelineController
    extends HostEventsTimelineController {
  _CaptureHostEventsTimelineController(this.eventsByOrganizer);

  final Map<String, List<Event>> eventsByOrganizer;

  @override
  Future<HostEventsTimelineData> build(
    HostEventsTimelineRequest request,
  ) async {
    final events = eventsByOrganizer[request.organizerId] ?? const <Event>[];
    return HostEventsTimelineData(
      activeEvents: events
          .where((event) => event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      pastEvents: events
          .where((event) => !event.endTime.isAfter(request.sessionBoundary))
          .toList(growable: false),
      activeCursor: null,
      pastCursor: null,
      hasMoreActive: false,
      hasMorePast: false,
    );
  }
}

Widget _hostPayoutCardCapture() {
  return _AppRoleCapture(
    role: AppRole.host,
    child: Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: HostPaymentAccountControllerCard(
            club: HostOperationsFixtures.primaryClub,
          ),
        ),
      ),
    ),
  );
}

class _HostTeamSectionCapture extends StatelessWidget {
  const _HostTeamSectionCapture();

  @override
  Widget build(BuildContext context) {
    return _AppRoleCapture(
      role: AppRole.host,
      child: Scaffold(
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: HostTeamManagementSection(
              club: HostOperationsFixtures.primaryClub,
              currentUid: HostOperationsFixtures.hostUid,
              canManage: true,
            ),
          ),
        ),
      ),
    );
  }
}

enum _HostClubsMutationCaptureMode {
  inlinePending,
  inlineError,
  inlineOffline,
  payoutSetupPending,
  payoutSetupError,
  payoutSetupOffline,
  payoutRefreshPending,
  payoutRefreshError,
  payoutRefreshOffline,
  teamPending,
  teamError,
  teamOffline,
}

class _HostClubsMutationCapture extends ConsumerStatefulWidget {
  const _HostClubsMutationCapture({required this.mode, required this.child});

  final _HostClubsMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostClubsMutationCapture> createState() =>
      _HostClubsMutationCaptureState();
}

class _HostClubsMutationCaptureState
    extends ConsumerState<_HostClubsMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      _resetMutations();
      _seed();
    });
  }

  void _resetMutations() {
    HostClubEditController.updateClubMutation.reset(ref);
    HostPaymentAccountController.startOnboardingMutation.reset(ref);
    HostPaymentAccountController.refreshStatusMutation.reset(ref);
    HostTeamManagementController.addHostMutation.reset(ref);
    HostTeamManagementController.removeHostMutation.reset(ref);
    HostTeamManagementController.transferOwnershipMutation.reset(ref);
  }

  void _seed() {
    switch (widget.mode) {
      case _HostClubsMutationCaptureMode.inlinePending:
        _runPending(HostClubEditController.updateClubMutation);
        break;
      case _HostClubsMutationCaptureMode.inlineError:
        _runError(
          HostClubEditController.updateClubMutation,
          StateError('Capture club update failed'),
        );
        break;
      case _HostClubsMutationCaptureMode.inlineOffline:
        _runError(
          HostClubEditController.updateClubMutation,
          obviousOfflineException(),
        );
        break;
      case _HostClubsMutationCaptureMode.payoutSetupPending:
        _runPending(HostPaymentAccountController.startOnboardingMutation);
        break;
      case _HostClubsMutationCaptureMode.payoutSetupError:
        _runError(
          HostPaymentAccountController.startOnboardingMutation,
          StateError('Capture payout setup failed'),
        );
        break;
      case _HostClubsMutationCaptureMode.payoutSetupOffline:
        _runError(
          HostPaymentAccountController.startOnboardingMutation,
          obviousOfflineException(),
        );
        break;
      case _HostClubsMutationCaptureMode.payoutRefreshPending:
        _runPending(HostPaymentAccountController.refreshStatusMutation);
        break;
      case _HostClubsMutationCaptureMode.payoutRefreshError:
        _runError(
          HostPaymentAccountController.refreshStatusMutation,
          StateError('Capture payout refresh failed'),
        );
        break;
      case _HostClubsMutationCaptureMode.payoutRefreshOffline:
        _runError(
          HostPaymentAccountController.refreshStatusMutation,
          obviousOfflineException(),
        );
        break;
      case _HostClubsMutationCaptureMode.teamPending:
        _runPending(HostTeamManagementController.removeHostMutation);
        break;
      case _HostClubsMutationCaptureMode.teamError:
        _runError(
          HostTeamManagementController.removeHostMutation,
          StateError('Capture host team update failed'),
        );
        break;
      case _HostClubsMutationCaptureMode.teamOffline:
        _runError(
          HostTeamManagementController.removeHostMutation,
          obviousOfflineException(),
        );
        break;
    }
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

final class _CaptureNoopHostClubEditActions implements HostClubEditActions {
  const _CaptureNoopHostClubEditActions();

  @override
  Future<void> updateClub({
    required String clubId,
    required UpdateClubPatch patch,
  }) async {}

  @override
  Future<List<HostPickedClubPhoto>> pickClubPhotos({int? limit}) async =>
      const [];

  @override
  Future<HostPickedClubLogo?> pickClubLogo() async => null;

  @override
  Future<HostClubMediaSaveResult> updateClubMedia({
    required Club club,
    List<HostClubMediaInput>? photoInputs,
    HostPickedClubLogo? logo,
    bool removeLogo = false,
    ValueChanged<HostClubMediaProgress>? onProgress,
  }) async => HostClubMediaSaveResult(
    photoInputs: photoInputs,
    logo: logo,
    failures: const {},
    attached: true,
  );

  @override
  Future<void> discardClubMedia({
    required List<HostClubMediaInput> photoInputs,
    HostPickedClubLogo? logo,
  }) async {}
}

final class _CaptureNoopHostPaymentAccountActions
    implements HostPaymentAccountActions {
  const _CaptureNoopHostPaymentAccountActions();

  @override
  Future<void> refreshStatus(HostPaymentProvider provider) async {}

  @override
  Future<void> startOnboarding({
    required HostPaymentProvider provider,
    required String country,
    required String defaultCurrency,
    RazorpayHostOnboardingDetails? razorpayDetails,
  }) async {}
}

List<Object> _hostCreateClubProviderOverrides() {
  return [
    uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(_captureViewer),
    ),
  ];
}

Widget _createClubCapture({
  int initialStep = 0,
  bool useDraft = false,
  bool showValidation = false,
  bool usePickedMedia = false,
}) {
  return CreateClubScreen(
    initialDraft: useDraft ? HostOperationsFixtures.clubDraft : null,
    initialStep: initialStep,
    restoreSavedDraft: false,
    formAutovalidateMode: showValidation
        ? AutovalidateMode.always
        : AutovalidateMode.disabled,
    initialPickedClubPhotos: usePickedMedia
        ? _createClubPickedPhotos()
        : const <PickedClubPhoto>[],
    initialProfileImage: usePickedMedia ? _createClubProfileImage() : null,
  );
}

Future<void> _driveCreateDisclosure(WidgetTester tester, String key) async {
  final target = find.byKey(ValueKey(key));
  await tester.ensureVisible(target);
  await tester.tap(target);
  await pumpFeatureUi(tester);
  if (key == 'host.create_event.customize_guide') {
    await tester.ensureVisible(find.byType(EventSuccessDefaultsSection));
    await pumpFeatureUi(tester);
  }
}

Widget _createEventCapture({
  int initialStep = 0,
  bool useDraft = true,
  bool showValidation = false,
  bool usePickedMedia = false,
  EventDraft? draft,
}) {
  return CreateEventScreen(
    club: _dashboardHostClub,
    initialDraft: draft ?? (useDraft ? _hostEventSetupDraft : null),
    initialStep: initialStep,
    formAutovalidateMode: showValidation
        ? AutovalidateMode.always
        : AutovalidateMode.disabled,
    initialPickedEventPhotos: usePickedMedia
        ? _createEventPickedPhotos()
        : const <PickedEventPhoto>[],
    loadMapTiles: false,
    now: () => _captureNow,
  );
}

List<PickedClubPhoto> _createClubPickedPhotos() {
  return [
    _createClubPickedPhoto('club-cover-1'),
    _createClubPickedPhoto('club-cover-2'),
  ];
}

PickedClubPhoto _createClubPickedPhoto(String name) {
  final bytes = name.endsWith('2')
      ? _profilePortraitBytes
      : _clubHeroPortraitBytes;
  return PickedClubPhoto(
    image: XFile.fromData(bytes, name: '$name.jpg', mimeType: 'image/jpeg'),
    bytes: bytes,
  );
}

PickedClubProfileImage _createClubProfileImage() {
  final bytes = _profilePortraitBytes;
  return PickedClubProfileImage(
    image: XFile.fromData(
      bytes,
      name: 'club-profile.jpg',
      mimeType: 'image/jpeg',
    ),
    bytes: bytes,
  );
}

List<PickedEventPhoto> _createEventPickedPhotos() {
  return [
    _createEventPickedPhoto('event-cover-1'),
    _createEventPickedPhoto('event-cover-2'),
  ];
}

List<OrderedPhotoPreview> _createHostMediaManagerPhotos() {
  return [
    for (var index = 0; index < 24; index++)
      OrderedPhotoPreview(
        id: 'host-media-manager-$index',
        bytes: index.isEven ? _clubHeroPortraitBytes : _profilePortraitBytes,
        status: index == 3
            ? OrderedPhotoStatus.failed
            : OrderedPhotoStatus.ready,
      ),
  ];
}

PickedEventPhoto _createEventPickedPhoto(String name) {
  final bytes = name.endsWith('2')
      ? _profilePortraitBytes
      : _clubHeroPortraitBytes;
  return PickedEventPhoto(
    image: XFile.fromData(bytes, name: '$name.jpg', mimeType: 'image/jpeg'),
    bytes: bytes,
  );
}

Uint8List _createClubPngBytes() {
  return base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAFkl'
    'EQVR42mO4Y+DwnxTMMKphVAN2DAApmUpA0AfJaAAAAABJRU5ErkJggg==',
  );
}

enum _HostCreateClubMutationCaptureMode {
  saveDraftPending,
  saveDraftError,
  submitPending,
  submitError,
  submitOffline,
}

class _HostCreateClubMutationCapture extends ConsumerStatefulWidget {
  const _HostCreateClubMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostCreateClubMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostCreateClubMutationCapture> createState() =>
      _HostCreateClubMutationCaptureState();
}

class _HostCreateClubMutationCaptureState
    extends ConsumerState<_HostCreateClubMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      CreateClubController.submitMutation.reset(ref);
      CreateClubDraftController.saveDraftMutation.reset(ref);
      switch (widget.mode) {
        case _HostCreateClubMutationCaptureMode.saveDraftPending:
          _runPending(CreateClubDraftController.saveDraftMutation);
          break;
        case _HostCreateClubMutationCaptureMode.saveDraftError:
          _runError(
            CreateClubDraftController.saveDraftMutation,
            StateError('Capture club draft save failed'),
          );
          break;
        case _HostCreateClubMutationCaptureMode.submitPending:
          _runPending(CreateClubController.submitMutation);
          break;
        case _HostCreateClubMutationCaptureMode.submitError:
          _runError(
            CreateClubController.submitMutation,
            StateError('Capture club submit failed'),
          );
          break;
        case _HostCreateClubMutationCaptureMode.submitOffline:
          _runError(
            CreateClubController.submitMutation,
            obviousOfflineException(),
          );
          break;
      }
    });
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum _HostCreateEventMutationCaptureMode {
  saveDraftPending,
  saveDraftError,
  saveDraftOffline,
  submitPending,
  submitError,
  submitOffline,
}

class _HostCreateEventMutationCapture extends ConsumerStatefulWidget {
  const _HostCreateEventMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostCreateEventMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostCreateEventMutationCapture> createState() =>
      _HostCreateEventMutationCaptureState();
}

class _HostCreateEventMutationCaptureState
    extends ConsumerState<_HostCreateEventMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      CreateEventController.submitMutation.reset(ref);
      CreateEventDraftController.saveDraftMutation.reset(ref);
      switch (widget.mode) {
        case _HostCreateEventMutationCaptureMode.saveDraftPending:
          _runPending(CreateEventDraftController.saveDraftMutation);
          break;
        case _HostCreateEventMutationCaptureMode.saveDraftError:
          _runError(
            CreateEventDraftController.saveDraftMutation,
            StateError('Capture event draft save failed'),
          );
          break;
        case _HostCreateEventMutationCaptureMode.saveDraftOffline:
          _runError(
            CreateEventDraftController.saveDraftMutation,
            obviousOfflineException(),
          );
          break;
        case _HostCreateEventMutationCaptureMode.submitPending:
          _runPending(CreateEventController.submitMutation);
          break;
        case _HostCreateEventMutationCaptureMode.submitError:
          _runError(
            CreateEventController.submitMutation,
            StateError('Capture event submit failed'),
          );
          break;
        case _HostCreateEventMutationCaptureMode.submitOffline:
          _runError(
            CreateEventController.submitMutation,
            obviousOfflineException(),
          );
          break;
      }
    });
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _InlineDialogCapture extends StatelessWidget {
  const _InlineDialogCapture({required this.child, required this.dialog});

  final Widget child;
  final Widget dialog;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Stack(
      children: [
        child,
        Positioned.fill(
          child: ColoredBox(
            color: t.ink.withValues(alpha: CatchOpacity.confirmDialogScrim),
          ),
        ),
        Center(child: dialog),
      ],
    );
  }
}

List<Object> _hostCreateEventProviderOverrides({
  Club? club,
  AsyncValue<Club?>? clubValue,
  List<EventDraft> drafts = const <EventDraft>[],
  String? uid = _captureViewerUid,
}) {
  final resolvedClub = club ?? _dashboardHostClub;
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(_captureViewer),
    ),
    fetchClubProvider(
      resolvedClub.id,
    ).overrideWithValue(clubValue ?? AsyncData<Club?>(resolvedClub)),
    deviceLocationProvider.overrideWith(_CaptureDeviceLocation.new),
    watchOrganizerEventVenuesProvider(
      resolvedClub.id,
    ).overrideWith((ref) => Stream.value(const <OrganizerEventVenue>[])),
    watchOrganizerEventSuccessLayoutsProvider(
      resolvedClub.id,
    ).overrideWith((ref) => Stream.value(const <EventSuccessLayout>[])),
    eventDraftRepositoryProvider.overrideWithValue(
      HostFixtureEventDraftRepository(drafts: drafts),
    ),
    eventRepositoryProvider.overrideWith((ref) => FakeEventRepository()),
    // Saved-event photo recovery restores before the wizard renders; captures
    // start from an empty in-memory journal instead of device storage.
    commandJournalStorageProvider.overrideWith((ref) {
      final storage = MemoryCommandJournalStorage();
      return () async => storage;
    }),
  ];
}

final class _CaptureLoadingAnalyticsRepository
    implements HostAnalyticsRepository {
  const _CaptureLoadingAnalyticsRepository();

  @override
  Future<HostAnalyticsReport> getHostAnalytics(HostAnalyticsQuery query) {
    return Completer<HostAnalyticsReport>().future;
  }
}

List<Object> _hostEditEventProviderOverrides({
  String? uid,
  AsyncValue<Club?>? clubValue,
  AsyncValue<Event?>? eventValue,
  AsyncValue<EventPrivateAccess?>? privateAccessValue,
  Event? event,
}) {
  final effectiveEvent = event ?? _dashboardEditableHostEvent;
  final effectiveUid =
      uid ??
      _dashboardHostClub.ownerOrPrimaryHostUserId ??
      HostOperationsFixtures.hostUid;
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(effectiveUid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(
        effectiveUid == HostOperationsFixtures.hostUid
            ? HostOperationsFixtures.owner
            : _captureViewer,
      ),
    ),
    fetchClubProvider(
      _dashboardHostClub.id,
    ).overrideWithValue(clubValue ?? AsyncData<Club?>(_dashboardHostClub)),
    watchEventProvider(
      effectiveEvent.id,
    ).overrideWithValue(eventValue ?? AsyncData<Event?>(effectiveEvent)),
    watchEventPrivateAccessProvider(effectiveEvent.id).overrideWithValue(
      privateAccessValue ?? const AsyncData<EventPrivateAccess?>(null),
    ),
    deviceLocationProvider.overrideWith(_CaptureDeviceLocation.new),
    eventRepositoryProvider.overrideWith((ref) => FakeEventRepository()),
  ];
}

enum _HostProfileMutationCaptureMode {
  createPending,
  createError,
  createOffline,
  savePending,
  saveError,
  saveOffline,
  signOutError,
  signOutOffline,
}

class _HostProfileMutationCapture extends ConsumerStatefulWidget {
  const _HostProfileMutationCapture({required this.mode, required this.child});

  final _HostProfileMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostProfileMutationCapture> createState() =>
      _HostProfileMutationCaptureState();
}

class _HostProfileMutationCaptureState
    extends ConsumerState<_HostProfileMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      _resetMutations();
      _seed();
    });
  }

  void _resetMutations() {
    HostProfileController.ensureProfileMutation.reset(ref);
    HostProfileController.saveProfileMutation.reset(ref);
    AuthSessionController.signOutMutation.reset(ref);
  }

  void _seed() {
    switch (widget.mode) {
      case _HostProfileMutationCaptureMode.createPending:
        _runPending(HostProfileController.ensureProfileMutation);
        break;
      case _HostProfileMutationCaptureMode.createError:
        _runError(
          HostProfileController.ensureProfileMutation,
          StateError('Capture host profile create failed'),
        );
        break;
      case _HostProfileMutationCaptureMode.createOffline:
        _runError(
          HostProfileController.ensureProfileMutation,
          obviousOfflineException(),
        );
        break;
      case _HostProfileMutationCaptureMode.savePending:
        _runPending(HostProfileController.saveProfileMutation);
        break;
      case _HostProfileMutationCaptureMode.saveError:
        _runError(
          HostProfileController.saveProfileMutation,
          StateError('Capture host profile save failed'),
        );
        break;
      case _HostProfileMutationCaptureMode.saveOffline:
        _runError(
          HostProfileController.saveProfileMutation,
          obviousOfflineException(),
        );
        break;
      case _HostProfileMutationCaptureMode.signOutError:
        _runError(
          AuthSessionController.signOutMutation,
          StateError('Capture host sign out failed'),
        );
        break;
      case _HostProfileMutationCaptureMode.signOutOffline:
        _runError(
          AuthSessionController.signOutMutation,
          obviousOfflineException(),
        );
        break;
    }
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(mutation.run(ref, (_) async => throw error).catchError((_) {}));
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum _HostEditEventMutationCaptureMode { submitPending, submitError }

class _HostEditEventMutationCapture extends ConsumerStatefulWidget {
  const _HostEditEventMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostEditEventMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostEditEventMutationCapture> createState() =>
      _HostEditEventMutationCaptureState();
}

class _HostEditEventMutationCaptureState
    extends ConsumerState<_HostEditEventMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      HostEventBookingController.updateHostedEventMutation.reset(ref);
      switch (widget.mode) {
        case _HostEditEventMutationCaptureMode.submitPending:
          _runPending(HostEventBookingController.updateHostedEventMutation);
          break;
        case _HostEditEventMutationCaptureMode.submitError:
          _runError(
            HostEventBookingController.updateHostedEventMutation,
            StateError('Capture host event update failed'),
          );
          break;
      }
    });
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(mutation.run(ref, (_) async => throw error).catchError((_) {}));
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

List<Object> _hostClubDetailProviderOverrides({
  String? uid = HostOperationsFixtures.hostUid,
  Club? club,
  ClubMembership? membership,
  AsyncValue<ClubDetailViewModel?>? viewModel,
}) {
  final effectiveClub = club ?? _hostClubDetailReferenceClub;
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(uid == null ? null : HostOperationsFixtures.owner),
    ),
    if (uid != null)
      watchClubMembershipProvider(
        effectiveClub.id,
        uid,
      ).overrideWith((ref) => Stream<ClubMembership?>.value(membership)),
    clubDetailViewModelProvider(effectiveClub.id).overrideWith(
      (ref) =>
          viewModel ??
          AsyncData<ClubDetailViewModel?>(
            _hostClubDetailViewModel(club: effectiveClub, uid: uid),
          ),
    ),
  ];
}

ClubDetailViewModel _hostClubDetailViewModel({
  Club? club,
  String? uid = HostOperationsFixtures.hostUid,
  bool? isHost,
  List<Event>? upcomingEvents,
  List<Review> reviews = const <Review>[],
}) {
  final effectiveClub = club ?? _hostClubDetailReferenceClub;
  final defaultEvents = effectiveClub.id == _hostClubDetailReferenceClub.id
      ? _hostClubDetailReferenceEvents
      : HostOperationsFixtures.eventsByClub[effectiveClub.id] ??
            const <Event>[];
  return ClubDetailViewModel(
    club: effectiveClub,
    isHost: isHost ?? (uid != null && effectiveClub.isHostedBy(uid)),
    isMember: false,
    upcomingEvents: upcomingEvents ?? defaultEvents,
    reviews: reviews,
    userProfile: uid == null ? null : HostOperationsFixtures.owner,
    uid: uid,
    isAuthenticated: uid != null,
  );
}

List<Object> _hostManageRouteProviderOverrides({
  String? uid,
  Club? club,
  Event? event,
  AsyncValue<Club?>? clubValue,
  AsyncValue<Event?>? eventValue,
  AsyncValue<AttendanceSheetViewModel?>? attendanceValue,
  AsyncValue<Map<String, (String, String?)>>? attendeeProfilesValue,
  AsyncValue<EventPrivateAccess?>? privateAccessValue,
  AsyncValue<List<EventInviteLink>>? inviteLinksValue,
  AsyncValue<EventSuccessPlan?>? planValue,
  AsyncValue<EventSuccessScorecard?>? scorecardValue,
  List<EventSuccessAssignment> assignments = const <EventSuccessAssignment>[],
  List<EventSuccessAssignment> rotationAssignments =
      const <EventSuccessAssignment>[],
  List<EventSuccessPreference> preferences = const <EventSuccessPreference>[],
  List<EventSuccessWingmanRequest> wingmanRequests =
      const <EventSuccessWingmanRequest>[],
  List<PublicProfile> assignmentPeerProfiles = const <PublicProfile>[],
  List<PublicProfile> rotationPeerProfiles = const <PublicProfile>[],
  List<PublicProfile> wingmanProfiles = const <PublicProfile>[],
  List<EventParticipation>? participations,
}) {
  final effectiveClub = club ?? HostOperationsFixtures.primaryClub;
  final effectiveUid =
      uid ??
      effectiveClub.ownerOrPrimaryHostUserId ??
      HostOperationsFixtures.hostUid;
  final effectiveEvent = event ?? HostOperationsFixtures.privateEvent;
  final effectiveParticipations =
      participations ?? HostOperationsFixtures.participations;
  final roster = EventParticipationRoster.fromParticipations(
    effectiveParticipations,
  );
  final effectiveAttendanceValue =
      attendanceValue ??
      buildAttendanceSheetViewModel(
        eventAsync: AsyncData<Event?>(effectiveEvent),
        participationsAsync: AsyncData<List<EventParticipation>>(
          effectiveParticipations,
        ),
      );
  final profileIds = switch (effectiveAttendanceValue) {
    AsyncData(:final value) => value?.profileIds ?? const <String>[],
    _ => const <String>[],
  };
  const defaultProfiles = <String, (String, String?)>{
    HostOperationsFixtures.guestUid: ('Aarav Mehta', null),
    HostOperationsFixtures.secondGuestUid: ('Rhea Kapoor', null),
    HostOperationsFixtures.waitlistUid: ('Kabir Jain', null),
  };
  final profiles = <String, (String, String?)>{
    for (final profileId in profileIds)
      if (defaultProfiles.containsKey(profileId))
        profileId: defaultProfiles[profileId]!,
  };
  final firestore = FakeFirebaseFirestore();
  final functions = _CaptureFirebaseFunctions({
    'listEventStaff': <String, Object?>{
      'eventId': effectiveEvent.id,
      'members': const <Object?>[],
    },
    'getEventRosterInsights': <String, Object?>{
      'eventId': effectiveEvent.id,
      'organizerId': effectiveClub.id,
      'cutoffAtMillis': effectiveEvent.startTime.millisecondsSinceEpoch,
      'sourceCoverage': 'exact',
      'spendCoverage': 'catchPaymentsOnly',
      'rows': const <Object?>[],
      'computedAtMillis': _captureNow.millisecondsSinceEpoch,
    },
  });
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(effectiveUid)),
    firebaseFirestoreProvider.overrideWithValue(firestore),
    firebaseFunctionsProvider.overrideWithValue(functions),
    appConnectivityProvider.overrideWith(
      (ref) =>
          Stream.value(const <ConnectivityResult>[ConnectivityResult.wifi]),
    ),
    hostAttendanceOutboxStoreProvider.overrideWithValue(
      _CaptureHostAttendanceOutboxStore(),
    ),
    fetchClubProvider(
      effectiveClub.id,
    ).overrideWithValue(clubValue ?? AsyncData<Club?>(effectiveClub)),
    watchEventProvider(
      effectiveEvent.id,
    ).overrideWithValue(eventValue ?? AsyncData<Event?>(effectiveEvent)),
    watchEventParticipationRosterProvider(
      effectiveEvent.id,
    ).overrideWith((ref) => Stream.value(roster)),
    watchEventParticipationsForEventProvider(
      effectiveEvent.id,
    ).overrideWith((ref) => Stream.value(effectiveParticipations)),
    attendanceSheetViewModelProvider(
      effectiveEvent.id,
    ).overrideWithValue(effectiveAttendanceValue),
    attendeeProfilesProvider(profileIds).overrideWithValue(
      attendeeProfilesValue ??
          AsyncData<Map<String, (String, String?)>>(profiles),
    ),
    watchEventPrivateAccessProvider(effectiveEvent.id).overrideWithValue(
      privateAccessValue ??
          AsyncData<EventPrivateAccess?>(HostOperationsFixtures.privateAccess),
    ),
    watchEventInviteLinksProvider(effectiveEvent.id).overrideWithValue(
      inviteLinksValue ??
          AsyncData<List<EventInviteLink>>(HostOperationsFixtures.inviteLinks),
    ),
    watchEventSuccessPlanProvider(
      effectiveEvent.id,
    ).overrideWithValue(planValue ?? const AsyncData<EventSuccessPlan?>(null)),
    watchEventSuccessScorecardProvider(effectiveEvent.id).overrideWithValue(
      scorecardValue ?? const AsyncData<EventSuccessScorecard?>(null),
    ),
    watchEventSuccessAssignmentsProvider(
      effectiveEvent.id,
    ).overrideWith((ref) => Stream.value(assignments)),
    watchEventSuccessRotationAssignmentsProvider(
      effectiveEvent.id,
    ).overrideWith((ref) => Stream.value(rotationAssignments)),
    watchEventSuccessPreferencesProvider(
      effectiveEvent.id,
    ).overrideWith((ref) => Stream.value(preferences)),
    watchEventSuccessWingmanRequestsProvider(
      effectiveEvent.id,
    ).overrideWith((ref) => Stream.value(wingmanRequests)),
    if (assignments.isNotEmpty)
      eventSuccessAssignmentPeerProfilesProvider(
        eventSuccessPeerUidsKey(
          _hostManageAssignmentParticipantUids(assignments),
        ),
      ).overrideWith((ref) async => assignmentPeerProfiles),
    if (rotationAssignments.isNotEmpty)
      eventSuccessAssignmentPeerProfilesProvider(
        eventSuccessPeerUidsKey(
          _hostManageAssignmentParticipantUids(rotationAssignments),
        ),
      ).overrideWith((ref) async => rotationPeerProfiles),
    if (wingmanRequests.isNotEmpty)
      eventSuccessAssignmentPeerProfilesProvider(
        eventSuccessPeerUidsKey(_hostManageWingmanProfileUids(wingmanRequests)),
      ).overrideWith((ref) async => wingmanProfiles),
  ];
}

class _CaptureHostAttendanceOutboxStore extends Fake
    implements HostAttendanceOutboxStore {
  List<HostAttendanceOutboxEntry> entries = [];
  @override
  Future<List<HostAttendanceOutboxEntry>> load(
    String accountId, {
    String? scope,
    DateTime? now,
  }) async => List.of(entries);

  @override
  Future<void> flush(
    String accountId,
    String scope,
    Future<void> Function(HostAttendanceOutboxEntry) execute,
  ) async {
    if (entries.isNotEmpty) {
      throw StateError(
        'Seed an explicit replay result for pending attendance.',
      );
    }
  }
}

final class _CaptureFirebaseFunctions extends Fake
    implements FirebaseFunctions {
  _CaptureFirebaseFunctions(this.responses);

  final Map<String, Object?> responses;

  @override
  HttpsCallable httpsCallable(String name, {HttpsCallableOptions? options}) =>
      _CaptureHttpsCallable(responses[name]);
}

final class _CaptureHttpsCallable extends Fake implements HttpsCallable {
  _CaptureHttpsCallable(this.response);

  final Object? response;

  @override
  Future<HttpsCallableResult<T>> call<T>([dynamic parameters]) async =>
      _CaptureHttpsCallableResult<T>(response as T);
}

final class _CaptureHttpsCallableResult<T> extends Fake
    implements HttpsCallableResult<T> {
  _CaptureHttpsCallableResult(this.data);

  @override
  final T data;
}

List<EventSuccessAssignment> _hostManageMicroPodAssignments({
  required Event event,
  required DateTime now,
  String source = 'capture_fixture',
}) {
  return [
    _hostManageAssignment(
      event: event,
      uid: HostOperationsFixtures.guestUid,
      label: 'Pod A',
      title: 'Pace Pod A',
      peerUids: const [
        HostOperationsFixtures.secondGuestUid,
        HostOperationsFixtures.waitlistUid,
      ],
      now: now,
      source: source,
    ),
    _hostManageAssignment(
      event: event,
      uid: HostOperationsFixtures.secondGuestUid,
      label: 'Pod A',
      title: 'Pace Pod A',
      peerUids: const [
        HostOperationsFixtures.guestUid,
        HostOperationsFixtures.waitlistUid,
      ],
      now: now,
      source: source,
    ),
    _hostManageAssignment(
      event: event,
      uid: HostOperationsFixtures.waitlistUid,
      label: 'Pod B',
      title: 'Pace Pod B',
      peerUids: const [HostOperationsFixtures.guestUid],
      now: now,
      source: source,
    ),
  ];
}

EventSuccessAssignment _hostManageAssignment({
  required Event event,
  required String uid,
  required String label,
  required String title,
  required List<String> peerUids,
  required DateTime now,
  String source = 'capture_fixture',
}) {
  return EventSuccessAssignment(
    id: eventSuccessAssignmentId(
      eventId: event.id,
      moduleId: EventSuccessModuleCatalog.microPods.id,
      uid: uid,
    ),
    eventId: event.id,
    clubId: event.clubId,
    uid: uid,
    moduleId: EventSuccessModuleCatalog.microPods.id,
    label: label,
    displayTitle: title,
    displaySubtitle: 'Start here, then follow the host cue.',
    peerUids: peerUids,
    unitKind: 'pods',
    unitLabel: label,
    source: source,
    createdAt: now.subtract(const Duration(minutes: 12)),
    updatedAt: now,
  );
}

List<EventSuccessAssignment> _hostManageRotationAssignments({
  required Event event,
  required DateTime now,
}) {
  final round0 = event.startTime.add(const Duration(minutes: 15));
  final round1 = round0.add(const Duration(minutes: 15));
  return [
    _hostManageRotationAssignment(
      event: event,
      uid: HostOperationsFixtures.guestUid,
      peerUids: const [
        HostOperationsFixtures.secondGuestUid,
        HostOperationsFixtures.waitlistUid,
      ],
      slots: [
        _hostManageRotationSlot(
          index: 0,
          startsAt: round0,
          peerUid: HostOperationsFixtures.secondGuestUid,
          compatibility: 'mutual_interest',
        ),
        _hostManageRotationSlot(
          index: 1,
          startsAt: round1,
          peerUid: HostOperationsFixtures.waitlistUid,
          compatibility: 'questionnaire_match',
        ),
      ],
      now: now,
    ),
    _hostManageRotationAssignment(
      event: event,
      uid: HostOperationsFixtures.secondGuestUid,
      peerUids: const [HostOperationsFixtures.guestUid],
      slots: [
        _hostManageRotationSlot(
          index: 0,
          startsAt: round0,
          peerUid: HostOperationsFixtures.guestUid,
          compatibility: 'mutual_interest',
        ),
      ],
      now: now,
    ),
  ];
}

EventSuccessAssignment _hostManageRotationAssignment({
  required Event event,
  required String uid,
  required List<String> peerUids,
  required List<EventSuccessRotationSlot> slots,
  required DateTime now,
}) {
  return EventSuccessAssignment(
    id: eventSuccessAssignmentId(
      eventId: event.id,
      moduleId: EventSuccessModuleCatalog.guidedRotations.id,
      uid: uid,
    ),
    eventId: event.id,
    clubId: event.clubId,
    uid: uid,
    moduleId: EventSuccessModuleCatalog.guidedRotations.id,
    label: 'Rotation schedule',
    displayTitle: 'Guided rotation schedule',
    displaySubtitle: 'Host-edited preview schedule.',
    peerUids: peerUids,
    rotationSlots: slots,
    source: 'host_override_v1',
    createdAt: now.subtract(const Duration(minutes: 12)),
    updatedAt: now,
  );
}

EventSuccessRotationSlot _hostManageRotationSlot({
  required int index,
  required DateTime startsAt,
  required String peerUid,
  required String compatibility,
}) {
  return EventSuccessRotationSlot(
    roundIndex: index,
    label: 'Round ${index + 1}',
    startsAt: startsAt,
    endsAt: startsAt.add(const Duration(minutes: 15)),
    peerUid: peerUid,
    compatibility: compatibility,
  );
}

List<EventSuccessPreference> _hostManagePreferences({
  required Event event,
  required DateTime now,
}) {
  return [
    EventSuccessPreference(
      id: eventSuccessPreferenceId(
        eventId: event.id,
        uid: HostOperationsFixtures.waitlistUid,
      ),
      eventId: event.id,
      clubId: event.clubId,
      uid: HostOperationsFixtures.waitlistUid,
      microPodsOptedOut: false,
      guidedRotationsOptedOut: false,
      createdAt: now.subtract(const Duration(minutes: 20)),
      updatedAt: now.subtract(const Duration(minutes: 3)),
    ),
  ];
}

List<EventSuccessWingmanRequest> _hostManageWingmanRequests({
  required Event event,
  required DateTime now,
}) {
  return [
    EventSuccessWingmanRequest(
      id: eventSuccessWingmanRequestId(
        eventId: event.id,
        uid: HostOperationsFixtures.guestUid,
      ),
      eventId: event.id,
      clubId: event.clubId,
      requesterUid: HostOperationsFixtures.guestUid,
      targetUid: HostOperationsFixtures.secondGuestUid,
      status: EventSuccessWingmanRequestStatus.active,
      hostVisibleConsent: true,
      note: 'Pair me if it feels natural.',
      createdAt: now.subtract(const Duration(minutes: 8)),
      updatedAt: now.subtract(const Duration(minutes: 2)),
    ),
    EventSuccessWingmanRequest(
      id: eventSuccessWingmanRequestId(
        eventId: event.id,
        uid: HostOperationsFixtures.waitlistUid,
      ),
      eventId: event.id,
      clubId: event.clubId,
      requesterUid: HostOperationsFixtures.waitlistUid,
      targetUid: HostOperationsFixtures.guestUid,
      status: EventSuccessWingmanRequestStatus.active,
      hostVisibleConsent: true,
      note: 'I would like a quick intro near the host table.',
      createdAt: now.subtract(const Duration(minutes: 5)),
      updatedAt: now.subtract(const Duration(minutes: 1)),
    ),
  ];
}

List<String> _hostManageAssignmentParticipantUids(
  List<EventSuccessAssignment> assignments,
) {
  final uids = <String>{
    for (final assignment in assignments) ...[
      assignment.uid,
      ...assignment.allPeerUids,
    ],
  }.toList()..sort();
  return uids;
}

List<String> _hostManageWingmanProfileUids(
  List<EventSuccessWingmanRequest> requests,
) {
  final uids = <String>{
    for (final request in requests) ...[
      request.requesterUid,
      request.targetUid,
    ],
  }.toList()..sort();
  return uids;
}

List<PublicProfile> _hostManageProfilesFor(List<String> uids) {
  const names = <String, String>{
    HostOperationsFixtures.guestUid: 'Aarav Mehta',
    HostOperationsFixtures.secondGuestUid: 'Rhea Kapoor',
    HostOperationsFixtures.waitlistUid: 'Kabir Jain',
  };
  return [
    for (final uid in uids.toSet())
      buildPublicProfile(uid: uid, name: names[uid] ?? 'Guest'),
  ];
}

Widget _hostManageRouteCapture({
  Club? club,
  Event? event,
  bool includeInitialEvent = true,
  HostEventManageSection initialSection = HostEventManageSection.setup,
  String initialParticipantSearchQuery = '',
}) {
  final effectiveClub = club ?? HostOperationsFixtures.primaryClub;
  final effectiveEvent = event ?? HostOperationsFixtures.privateEvent;
  final referenceNow = switch (initialSection) {
    HostEventManageSection.setup || HostEventManageSection.guests =>
      effectiveEvent.startTime.subtract(const Duration(hours: 1)),
    HostEventManageSection.live => effectiveEvent.startTime,
    HostEventManageSection.report => effectiveEvent.endTime.add(
      const Duration(minutes: 1),
    ),
  };
  return _AppRoleCapture(
    role: AppRole.host,
    child: HostEventManageRouteScreen(
      clubId: effectiveClub.id,
      eventId: effectiveEvent.id,
      initialEvent: includeInitialEvent ? effectiveEvent : null,
      initialSection: initialSection,
      initialParticipantSearchQuery: initialParticipantSearchQuery,
      referenceNow: referenceNow,
    ),
  );
}

Widget _hostManageLiveSectionCapture({Event? event}) {
  final effectiveEvent = event ?? HostOperationsFixtures.privateEvent;
  return _AppRoleCapture(
    role: AppRole.host,
    child: SingleChildScrollView(
      key: const ValueKey<String>('host_manage_live_section_capture_scroll'),
      padding: CatchInsets.contentRelaxed,
      child: EventSuccessHostSection(
        event: effectiveEvent,
        initialTab: EventSuccessHostTab.live,
        showTabs: false,
      ),
    ),
  );
}

Future<void> _scrollHostManageLiveSectionTo(
  WidgetTester tester,
  Finder target,
) async {
  await tester.scrollUntilVisible(
    target,
    320,
    scrollable: find
        .descendant(
          of: find.byKey(
            const ValueKey<String>('host_manage_live_section_capture_scroll'),
          ),
          matching: find.byType(Scrollable),
        )
        .first,
  );
  await pumpFeatureUi(tester);
}

Future<void> _openHostManageCheckInQr(WidgetTester tester) async {
  final scrollable = find
      .descendant(
        of: find.byKey(const Key('host_event_manage_scroll_view')),
        matching: find.byType(Scrollable),
      )
      .first;
  final disclosure = find.text('Check-in QR');
  await tester.scrollUntilVisible(disclosure, 320, scrollable: scrollable);
  await tester.tap(disclosure);
  await pumpFeatureUi(tester);
  await tester.scrollUntilVisible(
    find.text('Share attendee link'),
    320,
    scrollable: scrollable,
  );
  await pumpFeatureUi(tester);
}

Future<void> _verifyScheduleLockedCapture(WidgetTester tester) async {
  expect(find.text('Schedule locked'), findsOneWidget);
  expect(
    find.byType(HostedEventScheduleSection, skipOffstage: false),
    findsOneWidget,
  );
}

Event _hostManageLiveRevealEvent(Event event) {
  return event.copyWith(
    eventFormat: EventFormatSnapshot.custom(
      label: 'trivia night',
      interactionModel: EventInteractionModel.teamRotations,
    ),
    distanceKm: 0,
    capacityLimit: 30,
    bookedCount: 24,
    checkedInCount: 18,
  );
}

EventSuccessPlan _hostManageLivePlanForModule({
  required Event event,
  required DateTime now,
  required String moduleId,
  String? playbookId,
}) {
  final defaultPlan = EventSuccessPlan.defaultForEvent(event, now: now);
  final basePlan = defaultPlan.copyWith(
    playbookId: playbookId ?? defaultPlan.playbookId,
    selectedModuleIds: <String>{
      ...defaultPlan.selectedModuleIds,
      moduleId,
    }.toList(growable: false),
    status: EventSuccessPlanStatus.live,
    frozenAt: now,
  );
  final runtime = EventSuccessRuntime(plan: basePlan, event: event, now: now);
  final steps = runtime.runOfShowSteps;
  final activeIndex = steps.indexWhere(
    (step) => step.moduleIds.contains(moduleId),
  );
  return basePlan.copyWith(activeStepIndex: activeIndex < 0 ? 0 : activeIndex);
}

List<Object> _hostManageLiveWindowProviderOverrides() => [
  uidProvider.overrideWith((ref) => Stream.value(_captureViewerUid)),
  appConnectivityProvider.overrideWith(
    (ref) => Stream.value(const <ConnectivityResult>[ConnectivityResult.wifi]),
  ),
  watchUserProfileProvider.overrideWith((ref) => Stream.value(_captureViewer)),
  watchEventProvider(
    _hostLiveWindowEvent.id,
  ).overrideWith((ref) => Stream.value(_hostLiveWindowEvent)),
  eventParticipationRepositoryProvider.overrideWithValue(
    _hostParticipationRepository,
  ),
  publicProfileRepositoryProvider.overrideWithValue(
    _hostPublicProfileRepository,
  ),
  watchEventSuccessPlanProvider(
    _hostLiveWindowEvent.id,
  ).overrideWith((ref) => Stream.value(_hostLiveWindowPlan)),
  watchEventSuccessScorecardProvider(
    _hostLiveWindowEvent.id,
  ).overrideWith((ref) => Stream.value(null)),
  ..._hostEventSuccessProviderOverrides,
];

enum _HostManageAttendanceMutationCaptureMode { pending, error }

class _HostManageAttendanceMutationCapture extends ConsumerStatefulWidget {
  const _HostManageAttendanceMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostManageAttendanceMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostManageAttendanceMutationCapture> createState() =>
      _HostManageAttendanceMutationCaptureState();
}

class _HostManageAttendanceMutationCaptureState
    extends ConsumerState<_HostManageAttendanceMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    unawaited(
      Future<void>(() {
        if (mounted) _start();
      }),
    );
  }

  void _start() {
    if (_started) return;
    _started = true;
    _resetMutations();
    switch (widget.mode) {
      case _HostManageAttendanceMutationCaptureMode.pending:
        _runPending(_bulkWaitlistOfferMutation);
        break;
      case _HostManageAttendanceMutationCaptureMode.error:
        _runError(
          _guestAttendanceMutation,
          StateError('Capture Host Manage attendance mutation failed'),
        );
        break;
    }
  }

  void _resetMutations() {
    _guestAttendanceMutation.reset(ref);
    _guestApproveMutation.reset(ref);
    _guestDeclineMutation.reset(ref);
    _waitlistOfferMutation.reset(ref);
    _bulkWaitlistOfferMutation.reset(ref);
  }

  Mutation<void> get _guestAttendanceMutation =>
      HostEventBookingController.markAttendanceMutation(
        HostEventBookingController.markAttendanceMutationKey(
          eventId: HostOperationsFixtures.fullEvent.id,
          userId: HostOperationsFixtures.guestUid,
        ),
      );

  Mutation<void> get _guestApproveMutation =>
      HostEventBookingController.approveJoinRequestMutation(
        HostEventBookingController.approveJoinRequestMutationKey(
          eventId: HostOperationsFixtures.fullEvent.id,
          userId: HostOperationsFixtures.waitlistUid,
        ),
      );

  Mutation<void> get _guestDeclineMutation =>
      HostEventBookingController.declineJoinRequestMutation(
        HostEventBookingController.declineJoinRequestMutationKey(
          eventId: HostOperationsFixtures.fullEvent.id,
          userId: HostOperationsFixtures.waitlistUid,
        ),
      );

  Mutation<void> get _waitlistOfferMutation =>
      HostEventBookingController.createWaitlistOfferMutation(
        HostEventBookingController.waitlistOfferMutationKey(
          eventId: HostOperationsFixtures.fullEvent.id,
          userId: HostOperationsFixtures.waitlistUid,
        ),
      );

  Mutation<void> get _bulkWaitlistOfferMutation =>
      HostEventBookingController.createWaitlistOfferMutation(
        HostEventBookingController.bulkWaitlistOfferMutationKey(
          eventId: HostOperationsFixtures.fullEvent.id,
        ),
      );

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum _HostManageInviteLinkMutationCaptureMode { pending, error }

class _HostManageInviteLinkMutationCapture extends ConsumerStatefulWidget {
  const _HostManageInviteLinkMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostManageInviteLinkMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostManageInviteLinkMutationCapture> createState() =>
      _HostManageInviteLinkMutationCaptureState();
}

class _HostManageInviteLinkMutationCaptureState
    extends ConsumerState<_HostManageInviteLinkMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    unawaited(
      Future<void>(() {
        if (mounted) _start();
      }),
    );
  }

  void _start() {
    if (_started) return;
    _started = true;
    _resetMutations();
    switch (widget.mode) {
      case _HostManageInviteLinkMutationCaptureMode.pending:
        _runPending(HostEventManageController.createInviteLinkMutation);
        break;
      case _HostManageInviteLinkMutationCaptureMode.error:
        _runError(
          HostEventManageController.disableInviteLinkMutation,
          StateError('Capture Host Manage invite link mutation failed'),
        );
        break;
    }
  }

  void _resetMutations() {
    HostEventManageController.createInviteLinkMutation.reset(ref);
    HostEventManageController.copyInviteLinkMutation.reset(ref);
    HostEventManageController.disableInviteLinkMutation.reset(ref);
    HostEventManageController.sharePrivateLinkMutation.reset(ref);
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum _HostManagePrivateLinkShareMutationCaptureMode { pending, error }

class _HostManagePrivateLinkShareMutationCapture
    extends ConsumerStatefulWidget {
  const _HostManagePrivateLinkShareMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostManagePrivateLinkShareMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostManagePrivateLinkShareMutationCapture> createState() =>
      _HostManagePrivateLinkShareMutationCaptureState();
}

class _HostManagePrivateLinkShareMutationCaptureState
    extends ConsumerState<_HostManagePrivateLinkShareMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    unawaited(
      Future<void>(() {
        if (mounted) _start();
      }),
    );
  }

  void _start() {
    if (_started) return;
    _started = true;
    HostEventManageController.sharePrivateLinkMutation.reset(ref);
    switch (widget.mode) {
      case _HostManagePrivateLinkShareMutationCaptureMode.pending:
        _runPending(HostEventManageController.sharePrivateLinkMutation);
        break;
      case _HostManagePrivateLinkShareMutationCaptureMode.error:
        _runError(
          HostEventManageController.sharePrivateLinkMutation,
          StateError('Capture Host Manage private link share failed'),
        );
        break;
    }
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum _HostManageReportExportMutationCaptureMode { pending, error }

class _HostManageReportExportMutationCapture extends ConsumerStatefulWidget {
  const _HostManageReportExportMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostManageReportExportMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostManageReportExportMutationCapture> createState() =>
      _HostManageReportExportMutationCaptureState();
}

class _HostManageReportExportMutationCaptureState
    extends ConsumerState<_HostManageReportExportMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    unawaited(
      Future<void>(() {
        if (mounted) _start();
      }),
    );
  }

  void _start() {
    if (_started) return;
    _started = true;
    HostEventManageController.shareOpsReportMutation.reset(ref);
    HostEventManageController.shareRevenueReportMutation.reset(ref);
    switch (widget.mode) {
      case _HostManageReportExportMutationCaptureMode.pending:
        _runPending(HostEventManageController.shareRevenueReportMutation);
        break;
      case _HostManageReportExportMutationCaptureMode.error:
        _runError(
          HostEventManageController.shareOpsReportMutation,
          StateError('Capture Host Manage report export failed'),
        );
        break;
    }
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum _HostManageActionMutationCaptureMode {
  cancelPending,
  cancelError,
  deletePending,
  deleteError,
}

class _HostManageActionMutationCapture extends ConsumerStatefulWidget {
  const _HostManageActionMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostManageActionMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostManageActionMutationCapture> createState() =>
      _HostManageActionMutationCaptureState();
}

class _HostManageActionMutationCaptureState
    extends ConsumerState<_HostManageActionMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    unawaited(
      Future<void>(() {
        if (mounted) _start();
      }),
    );
  }

  void _start() {
    if (_started) return;
    _started = true;
    _resetMutations();
    switch (widget.mode) {
      case _HostManageActionMutationCaptureMode.cancelPending:
        _runPending(HostEventBookingController.hostCancelEventMutation);
        break;
      case _HostManageActionMutationCaptureMode.cancelError:
        _runError(
          HostEventBookingController.hostCancelEventMutation,
          StateError('Capture Host Manage cancel event failed'),
        );
        break;
      case _HostManageActionMutationCaptureMode.deletePending:
        _runPending(HostEventBookingController.deleteEventMutation);
        break;
      case _HostManageActionMutationCaptureMode.deleteError:
        _runError(
          HostEventBookingController.deleteEventMutation,
          StateError('Capture Host Manage delete event failed'),
        );
        break;
    }
  }

  void _resetMutations() {
    HostEventBookingController.hostCancelEventMutation.reset(ref);
    HostEventBookingController.deleteEventMutation.reset(ref);
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError<T>(Mutation<T> mutation, Object error) {
    unawaited(
      mutation
          .run(ref, (_) async => throw error)
          .then<void>((_) {}, onError: (_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

final _hostInquiryMatch = MatchesChatSurfaceFixtures.hostInquiryMatches.first;
final _hostInquiryMessages = <ChatMessage>[
  MatchesChatSurfaceFixtures.message(
    id: 'host-inquiry-message-1',
    senderId: MatchesChatSurfaceFixtures.guestUid,
    text: 'Is there parking near the start?',
    sentAt: MatchesChatSurfaceFixtures.now.subtract(
      const Duration(minutes: 18),
    ),
  ),
  MatchesChatSurfaceFixtures.message(
    id: 'host-inquiry-message-2',
    senderId: MatchesChatSurfaceFixtures.hostUid,
    text: 'Yes. Park near the jetty and meet us by the sea-facing steps.',
    sentAt: MatchesChatSurfaceFixtures.now.subtract(
      const Duration(minutes: 12),
    ),
  ),
];
final _hostInquiryImageDayMessages = <ChatMessage>[
  MatchesChatSurfaceFixtures.message(
    id: 'host-inquiry-yesterday-1',
    senderId: MatchesChatSurfaceFixtures.guestUid,
    text: 'Sharing this before I book - is the route beginner friendly?',
    sentAt: MatchesChatSurfaceFixtures.now.subtract(const Duration(days: 1)),
  ),
  MatchesChatSurfaceFixtures.message(
    id: 'host-inquiry-yesterday-2',
    senderId: MatchesChatSurfaceFixtures.hostUid,
    text: 'Yes. We keep it conversational and regroup at each turn.',
    sentAt: MatchesChatSurfaceFixtures.now
        .subtract(const Duration(days: 1))
        .add(const Duration(minutes: 8)),
  ),
  MatchesChatSurfaceFixtures.message(
    id: 'host-inquiry-image-1',
    senderId: MatchesChatSurfaceFixtures.hostUid,
    text: 'This is the meeting landmark at the jetty.',
    imageUrl: _clubHeroPortraitAssetPath,
    sentAt: MatchesChatSurfaceFixtures.now.subtract(
      const Duration(minutes: 34),
    ),
  ),
  MatchesChatSurfaceFixtures.message(
    id: 'host-inquiry-today-1',
    senderId: MatchesChatSurfaceFixtures.guestUid,
    text: 'Perfect. I will arrive ten minutes early for check-in.',
    sentAt: MatchesChatSurfaceFixtures.now.subtract(
      const Duration(minutes: 18),
    ),
  ),
];

List<Object> _hostCustomersProviderOverrides() {
  const preview = bool.fromEnvironment('AUDIENCE_VALUES_FIXTURE');
  final club = HostOperationsFixtures.primaryClub;
  final request = HostCustomersDirectoryRequest(organizerId: club.id);
  final audienceEditorRequest = HostCustomersDirectoryRequest(
    organizerId: club.id,
    sort: HostCustomerSort.name,
  );
  return [
    uidProvider.overrideWithValue(
      const AsyncData<String?>(HostOperationsFixtures.hostUid),
    ),
    hostOperableClubsProvider(
      HostOperationsFixtures.hostUid,
    ).overrideWithValue(AsyncData<List<Club>>([club])),
    if (preview)
      hostCustomerSegmentCountProvider(
        HostCustomerSegmentCountRequest(
          organizerId: club.id,
          filter: HostCustomerFilter.newToOrganizer,
        ),
      ).overrideWith(
        (ref) async => const HostCustomerSegmentCount(
          count: 2,
          coverage: HostCustomerMatchCountCoverage.exact,
        ),
      ),
    hostCrmSummaryProvider(club.id).overrideWithValue(
      AsyncData(
        HostCrmSummary(
          organizerId: club.id,
          contactCount: preview ? 8 : 214,
          pastAttendeeCount: preview ? 8 : 148,
          repeatAttendeeCount: preview ? 6 : 37,
          linkedAccountCount: preview ? 4 : 92,
          importedContactCount: preview ? 4 : 61,
          whatsappOptInCount: preview ? 4 : 74,
          smsOptInCount: preview ? 2 : 29,
          truncated: false,
          inAppReadiness: HostCrmChannelReadiness.currentEventOnly,
          whatsappReadiness: HostCrmChannelReadiness.providerSetupRequired,
          smsReadiness: HostCrmChannelReadiness.providerAndDltSetupRequired,
        ),
      ),
    ),
    hostCustomersDirectoryControllerProvider(request).overrideWithBuild(
      (ref, notifier) async => HostCustomersDirectoryState(
        contacts: [
          HostCustomerDirectoryContact(
            contactId: 'capture-customer-ananya',
            displayName: 'Ananya Rao',
            attendedEventCount: 8,
            lastAttendedAt: DateTime(2026, 6, 18, 18, 30),
            tags: const {HostCustomerTag.repeat, HostCustomerTag.regular},
            hasAmbiguousIdentity: false,
            whatsappOptedIn: true,
            whatsappAdminSuppressed: false,
          ),
          HostCustomerDirectoryContact(
            contactId: 'capture-customer-kabir',
            displayName: 'Kabir Mehta',
            attendedEventCount: 2,
            lastAttendedAt: DateTime(2026, 5, 30, 19),
            tags: const {HostCustomerTag.newToOrganizer},
            hasAmbiguousIdentity: false,
            whatsappOptedIn: false,
            whatsappAdminSuppressed: false,
          ),
          if (preview) ..._audienceValuesPreviewExtraContacts(),
        ],
        nextCursor: null,
        matchCount: preview ? 8 : 2,
        matchCountCoverage: HostCustomerMatchCountCoverage.exact,
        sourceCoverage: HostCustomerDirectoryCoverage.exact,
        projectionVersion: 1,
      ),
    ),
    hostCustomersDirectoryControllerProvider(
      audienceEditorRequest,
    ).overrideWithBuild(
      (ref, notifier) async => const HostCustomersDirectoryState(
        contacts: [],
        nextCursor: null,
        matchCount: 0,
        matchCountCoverage: HostCustomerMatchCountCoverage.exact,
        sourceCoverage: HostCustomerDirectoryCoverage.exact,
        projectionVersion: 1,
        manualTagVocabulary: [
          HostCustomerManualTag(tagId: 'tag-runners', label: 'Runners'),
          HostCustomerManualTag(tagId: 'tag-regulars', label: 'Regulars'),
        ],
      ),
    ),
    hostGroupDirectoryControllerProvider(club.id).overrideWithBuild(
      (ref, notifier) async => HostGroupDirectoryState(
        page: HostSavedAudienceSummaryPage(
          audiences: [
            HostSavedAudienceSummary.fromAudience(_hostSavedAudienceCapture()),
          ],
          nextCursor: null,
        ),
      ),
    ),
  ];
}

// Expanded deterministic data for the explicitly requested before/after preview.
// The canonical capture remains unchanged unless AUDIENCE_VALUES_FIXTURE is set.
List<HostCustomerDirectoryContact> _audienceValuesPreviewExtraContacts() => [
  for (final row in <(String, int, int, Set<HostCustomerTag>)>[
    ('Rohan Iyer', 12, 28, {HostCustomerTag.repeat, HostCustomerTag.regular}),
    ('Priya Sharma', 5, 27, {HostCustomerTag.repeat}),
    ('Arjun Singh', 3, 25, {HostCustomerTag.repeat}),
    ('Meera Nair', 9, 23, {HostCustomerTag.repeat, HostCustomerTag.regular}),
    ('Dev Patel', 1, 21, {HostCustomerTag.newToOrganizer}),
    ('Karan Malhotra', 7, 19, {HostCustomerTag.repeat, HostCustomerTag.atRisk}),
  ])
    HostCustomerDirectoryContact(
      contactId: 'preview-${row.$1.toLowerCase().replaceAll(' ', '-')}',
      displayName: row.$1,
      attendedEventCount: row.$2,
      lastAttendedAt: DateTime(2026, 5, row.$3, 18),
      tags: row.$4,
      hasAmbiguousIdentity: false,
      whatsappOptedIn: row.$2 > 7,
      whatsappAdminSuppressed: false,
    ),
];

HostSavedAudience _hostSavedAudienceCapture() {
  final organizerId = HostOperationsFixtures.primaryClub.id;
  return HostSavedAudience(
    organizerId: organizerId,
    audienceId: 'capture-repeat-runners',
    name: 'Repeat runners',
    status: 'active',
    definition: const HostSavedAudienceDefinition(
      join: HostSavedAudienceJoin.all,
      predicates: [
        HostSavedAudienceComputedSegment(HostAudienceSegment.repeatAttendee),
        HostSavedAudienceAttendanceCount(
          operator: HostSavedAudienceAttendanceOperator.atLeast,
          eventCount: 3,
        ),
      ],
    ),
    definitionHash: 'capture-repeat-runners-hash',
    definitionVersion: 1,
    revision: 2,
    lastPreviewMatchCount: 24,
    lastPreviewReachSummary: const HostAudienceReachSummary(
      inCatch: 14,
      automatic: 0,
      byHand: 8,
      unavailable: 2,
    ),
    lastPreviewAt: DateTime(2026, 8, 30, 10),
    createdAt: DateTime(2026, 8, 28, 10),
    updatedAt: DateTime(2026, 8, 30, 10),
  );
}

class _CaptureHostFormsDirectoryController
    extends HostFormsDirectoryController {
  @override
  Future<HostFormsDirectoryState> build(HostFormListRequest request) async {
    return HostFormsDirectoryState(
      forms: _hostFormsAuditForms,
      nextCursor: null,
    );
  }
}

class _CaptureHostFormResponsesController extends HostFormResponsesController {
  @override
  Future<HostFormResponsesState> build(
    HostFormResponseListRequest request,
  ) async {
    return const HostFormResponsesState(responses: [], nextCursor: null);
  }
}

class _CaptureHostFormEditorController extends HostFormEditorController {
  @override
  bool editorBoundTo(String? accountId) => true;

  @override
  Future<HostFormEditorState> build(String organizerId, String formId) async =>
      HostFormEditorState(
        editor: HostFormEditor(
          form: _hostFormBuilderAuditSummary(organizerId, formId),
          definition: HostFormDefinition.fromMap(
            _hostFormBuilderAuditDefinition(),
          ),
          validationIssues: const [],
        ),
        canUndo: true,
      );
}

HostFormSummary _hostFormBuilderAuditSummary(
  String organizerId,
  String formId,
) => HostFormSummary(
  organizerId: organizerId,
  formId: formId,
  title: 'Saturday Social application',
  description: 'A concise application for the next Saturday Social.',
  purpose: HostFormPurpose.application,
  status: HostFormLifecycleStatus.draft,
  templateId: 'event_application',
  publicFormId: 'public-$formId',
  defaultTargetKind: HostFormTargetKind.organizer,
  defaultTargetId: organizerId,
  activeVersionId: null,
  draftRevision: 4,
  publishedVersion: 0,
  submittedResponseCount: 0,
  consequences: const HostFormConsequences(
    coverage: HostFormConsequenceCoverage.exact,
    identityPolicy: HostFormIdentityPolicy.emailOrPhoneVerified,
    enabledAutomationActionKinds: {
      HostFormAutomationActionKind.createCrmContact,
    },
  ),
  updatedAt: DateTime(2026, 8, 31, 8, 45),
  publishedAt: null,
  lastResponseAt: null,
);

Map<String, Object?> _hostFormBuilderAuditDefinition() => {
  'schemaVersion': 1,
  'title': 'Saturday Social application',
  'description': 'A concise application for the next Saturday Social.',
  'purpose': 'application',
  'identityPolicy': 'emailOrPhoneVerified',
  'sections': [
    {
      'sectionId': 'about_you',
      'title': 'About you',
      'description': 'The essentials we need to review your application.',
      'pageBreak': false,
      'questions': [
        _hostFormBuilderAuditQuestion(
          id: 'full_name',
          label: 'Full name',
          kind: 'shortText',
          canonicalFieldId: 'fullName',
        ),
        _hostFormBuilderAuditQuestion(
          id: 'phone_number',
          label: 'Phone number',
          kind: 'phone',
          canonicalFieldId: 'phoneNumber',
        ),
      ],
    },
    {
      'sectionId': 'intent',
      'title': 'What brings you here?',
      'description': null,
      'pageBreak': false,
      'questions': [
        _hostFormBuilderAuditQuestion(
          id: 'looking_for',
          label: 'What are you hoping to find?',
          kind: 'longText',
          required: false,
        ),
      ],
    },
  ],
  'logicRules': <Object?>[],
  'appearance': {
    'preset': 'editorial',
    'logoAssetId': null,
    'coverAssetId': null,
    'activityKind': null,
  },
  'availability': {
    'opensAt': null,
    'closesAt': null,
    'responseLimit': null,
    'closedMessage': null,
  },
  'consent': {
    'consentCopy':
        'I consent to this information being used for this application.',
    'consentVersion': 'v1',
    'retentionCopy':
        'Responses are retained for the application review period.',
  },
  'completion': {
    'title': 'Application received',
    'message': 'We will be in touch after the review.',
    'actionKind': 'none',
    'actionLabel': null,
    'actionUrl': null,
  },
};

Map<String, Object?> _hostFormBuilderAuditQuestion({
  required String id,
  required String label,
  required String kind,
  String? canonicalFieldId,
  bool required = true,
}) => {
  'questionId': id,
  'key': id,
  'label': label,
  'helpText': null,
  'kind': kind,
  'required': required,
  'options': <Object?>[],
  'canonicalFieldId': canonicalFieldId,
  'privacyClass': canonicalFieldId == null ? 'organizerCustom' : 'contact',
  'prefillPolicy': 'never',
  'hostPresentation': 'detailOnly',
  'validation': {
    'minLength': null,
    'maxLength': null,
    'minNumber': null,
    'maxNumber': null,
    'earliestDate': null,
    'latestDate': null,
    'minSelections': null,
    'maxSelections': null,
    'maxFileCount': null,
    'maxFileSizeBytes': null,
    'allowedMimeTypes': <Object?>[],
    'patternPreset': null,
    'customError': null,
  },
};

final List<HostFormSummary> _hostFormsAuditForms = [
  _hostFormsAuditSummary(
    id: 'guest-preferences',
    title: 'Guest preferences',
    status: HostFormLifecycleStatus.published,
    submittedResponseCount: 48,
  ),
  _hostFormsAuditSummary(
    id: 'event-waiver',
    title: 'Event waiver',
    status: HostFormLifecycleStatus.paused,
    submittedResponseCount: 126,
  ),
  _hostFormsAuditSummary(
    id: 'host-application',
    title: 'Volunteer host application',
    status: HostFormLifecycleStatus.draft,
    submittedResponseCount: 0,
  ),
];

HostFormSummary _hostFormsAuditSummary({
  required String id,
  required String title,
  required HostFormLifecycleStatus status,
  required int submittedResponseCount,
}) {
  final organizerId = HostOperationsFixtures.primaryClub.id;
  return HostFormSummary(
    organizerId: organizerId,
    formId: id,
    title: title,
    description: null,
    purpose: HostFormPurpose.application,
    status: status,
    templateId: null,
    publicFormId: 'public-$id',
    defaultTargetKind: HostFormTargetKind.organizer,
    defaultTargetId: organizerId,
    activeVersionId: 'version-$id',
    draftRevision: 1,
    publishedVersion: 1,
    submittedResponseCount: submittedResponseCount,
    consequences: const HostFormConsequences(
      coverage: HostFormConsequenceCoverage.exact,
      identityPolicy: HostFormIdentityPolicy.emailOrPhoneVerified,
      enabledAutomationActionKinds: {
        HostFormAutomationActionKind.createCrmContact,
      },
    ),
    updatedAt: DateTime(2026, 8, 28, 18, 30),
    publishedAt: status == HostFormLifecycleStatus.draft
        ? null
        : DateTime(2026, 8, 20, 19),
    lastResponseAt: submittedResponseCount == 0
        ? null
        : DateTime(2026, 8, 28, 17, 45),
  );
}

HostAudienceContactDetail _hostCustomerMemoryDetail() {
  final organizerId = HostOperationsFixtures.primaryClub.id;
  return HostAudienceContactDetail(
    organizerId: organizerId,
    contactId: 'capture-customer-ananya',
    displayName: 'Ananya Rao',
    sourceDisplayName: 'Ananya Rao',
    displayNameOverride: null,
    phoneE164: '+919876543210',
    email: 'ananya@example.com',
    linkedAccount: true,
    identityState: HostAudienceIdentityState.verified,
    identityConfidence: 'verified',
    ambiguousCandidateCount: 0,
    whatsappAdminSuppressed: false,
    whatsappPermission: HostCustomerWhatsappPermission(
      status: HostAudiencePermissionStatus.optedIn,
      evidenceStatus: HostCustomerPermissionEvidenceStatus.complete,
      receiptId: 'capture-receipt-1',
      source: 'hostFormResponse',
      sourceFormId: 'capture-form-1',
      sourceFormTitle: 'Sunday Run sign-up',
      decisionAt: DateTime(2026, 5, 20),
      identityStrength: 'catchAccount',
    ),
    origins: [
      HostCustomerOrigin(
        originId: 'capture-origin-1',
        sourceKind: HostCustomerOriginSourceKind.hostForm,
        sourceEntityKind: 'hostFormResponse',
        formId: 'capture-form-1',
        formTitle: 'Sunday Run sign-up',
        eventId: 'capture-event-1',
        eventTitle: 'Sunday Run Club',
        observedAt: DateTime(2026, 5, 20),
      ),
    ],
    originsTruncated: false,
    traits: const HostCustomerTraits(
      expectedEventCount: 9,
      attendedEventCount: 8,
      cancelledEventCount: 1,
      noShowCount: 0,
      importedEventCount: 0,
      attendanceRate: 8 / 9,
      segments: {HostAudienceSegment.regular},
      whatsappStatus: HostAudiencePermissionStatus.optedIn,
      sourceCoverage: HostAudienceSourceCoverage.exact,
    ),
    revenue: const HostCustomerRevenue(
      coverage: HostCustomerRevenueCoverage.exact,
      amounts: [
        HostCustomerRevenueAmount(
          currency: 'INR',
          amountMinor: 184500,
          paidOrderCount: 7,
        ),
      ],
    ),
    events: [
      HostAudienceEventFact(
        eventId: 'capture-event-1',
        displayName: 'Sunday Run Club',
        source: 'catchBooking',
        status: 'checkedIn',
        checkedIn: true,
        eventStartAt: DateTime(2026, 6, 18, 18, 30),
      ),
    ],
    eventsTruncated: false,
    manualTags: const [
      HostManualTag(
        tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Brings friends',
      ),
    ],
    manualTagVocabulary: const [
      HostManualTag(
        tagId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        label: 'Brings friends',
      ),
      HostManualTag(
        tagId: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        label: 'Prefers weekends',
      ),
    ],
    notes: [
      HostCustomerNote(
        noteId: 'capture-note-1',
        body: 'Introduced three friends and prefers smaller weekend events.',
        authorUid: HostOperationsFixtures.hostUid,
        createdAt: DateTime(2026, 8, 15, 11),
        updatedAt: DateTime(2026, 8, 15, 11),
        revision: 1,
      ),
    ],
    sends: [
      HostCustomerSend(
        campaignId: 'capture-campaign-1',
        name: 'August member invite',
        messageClass: 'organizerPromotion',
        deliveryStatus: HostCustomerSendDeliveryStatus.delivered,
        createdAt: DateTime(2026, 8, 14, 9),
        sentAt: DateTime(2026, 8, 14, 9, 5),
        updatedAt: DateTime(2026, 8, 14, 9, 6),
      ),
    ],
    timeline: [
      HostCustomerReplyTimelineEntry(
        timelineId: 'capture-reply-1',
        occurredAt: DateTime(2026, 8, 16, 12),
        transport: HostCustomerReplyTransport.catchChat,
        direction: HostWhatsappMessageDirection.inbound,
        bodyPreview: 'I’ll bring two friends next week.',
        threadId: 'capture-match-1',
      ),
      HostCustomerEventTimelineEntry(
        timelineId: 'capture-event-1',
        occurredAt: DateTime(2026, 6, 18, 18, 30),
        eventId: 'capture-event-1',
        eventName: 'Sunday Run Club',
        status: 'checkedIn',
        checkedIn: true,
        eventOrigin: HostCustomerEventOrigin.catchNative,
        eventProvider: 'catch',
      ),
      HostCustomerFormTimelineEntry(
        timelineId: 'capture-form-1',
        occurredAt: DateTime(2026, 5, 20),
        responseId: 'capture-response-1',
        formId: 'capture-form-1',
        formTitle: 'Sunday Run sign-up',
        action: HostCustomerFormTimelineAction.submitted,
        answeredQuestionCount: 5,
      ),
    ],
    timelineTruncated: false,
    timelineCoverage: const HostCustomerTimelineCoverage(
      forms: HostCustomerTimelineCoverageValue.exact,
      events: HostCustomerTimelineCoverageValue.exact,
      sends: HostCustomerTimelineCoverageValue.exact,
      replies: HostCustomerTimelineCoverageValue.partial,
      outreach: HostCustomerTimelineCoverageValue.exact,
    ),
    revision: 3,
  );
}

HostCommunicationPlan _hostCustomerMemoryCommunicationPlan() =>
    HostCommunicationPlan(
      organizerId: HostOperationsFixtures.primaryClub.id,
      intent: HostCommunicationIntent.individualConversation,
      capabilityVersion: 1,
      resolvedAt: DateTime(2026, 8, 29),
      recipients: const [
        HostCommunicationRecipientPlan(
          contactId: 'capture-customer-ananya',
          displayName: 'Ananya Rao',
          outcome: HostCommunicationOutcome.inCatch,
          recommendedRouteId: HostCommunicationRouteId.catchChat,
          routes: [
            HostCommunicationRouteOption(
              routeId: HostCommunicationRouteId.catchChat,
              executionMode: HostCommunicationExecutionMode.managedDelivery,
              availability: HostCommunicationRouteAvailability.available,
              blocker: null,
            ),
            HostCommunicationRouteOption(
              routeId: HostCommunicationRouteId.personalWhatsappHandoff,
              executionMode: HostCommunicationExecutionMode.externalHandoff,
              availability: HostCommunicationRouteAvailability.available,
              blocker: null,
            ),
          ],
        ),
      ],
    );

HostMessagingSetup _hostMessagingCaptureSetup(String organizerId) =>
    HostMessagingSetup(
      organizerId: organizerId,
      providerConfigured: true,
      embeddedSignup: const HostWhatsappEmbeddedSignupConfig(
        appId: 'capture-app',
        configId: 'capture-config',
        graphVersion: 'v24.0',
      ),
      connection: const HostWhatsappConnection(
        connectionId: 'capture-whatsapp',
        status: 'active',
        displayPhoneNumber: '+91 98765 43210',
        verifiedName: 'Sea Face Social',
        qualityRating: 'GREEN',
        messagingLimitTier: 'TIER_1K',
        templateSyncStatus: 'ready',
        webhookStatus: 'healthy',
        testStatus: 'verified',
        revision: 2,
      ),
      templates: const [
        HostWhatsappTemplate(
          templateId: 'capture-invitation',
          name: 'event_invitation',
          language: 'en_US',
          category: 'MARKETING',
          status: 'APPROVED',
          variableNames: ['first_name', 'invite_url'],
          hasMediaHeader: false,
          buttonKinds: ['URL'],
        ),
      ],
    );

List<Object> _hostInboxProviderOverrides({
  AsyncValue<String?> uid = const AsyncData<String?>(
    HostInboxSurfaceFixtures.hostUid,
  ),
  bool includeUid = true,
  AsyncValue<ChatsListViewModel>? viewModel,
  AsyncValue<List<Club>>? clubs,
  AsyncValue<List<Event>>? events,
  AsyncValue<List<EventParticipation>>? participations,
}) {
  return [
    if (includeUid) uidProvider.overrideWithValue(uid),
    hostOperableClubsProvider(
      HostInboxSurfaceFixtures.hostUid,
    ).overrideWithValue(
      clubs ?? AsyncData<List<Club>>([HostInboxSurfaceFixtures.club]),
    ),
    watchEventsForClubProvider(
      HostInboxSurfaceFixtures.club.id,
    ).overrideWithValue(
      events ?? AsyncData<List<Event>>([HostInboxSurfaceFixtures.event]),
    ),
    chatsListViewModelProvider.overrideWithValue(
      viewModel ?? AsyncData(HostInboxSurfaceFixtures.allThreads),
    ),
    hostMessagingSetupProvider(
      HostInboxSurfaceFixtures.club.id,
    ).overrideWithValue(
      AsyncData(_hostMessagingCaptureSetup(HostInboxSurfaceFixtures.club.id)),
    ),
    hostSendsProvider(HostInboxSurfaceFixtures.club.id).overrideWithValue(
      AsyncData(
        HostSendsPage(
          organizerId: HostInboxSurfaceFixtures.club.id,
          sends: const [],
          nextCursor: null,
        ),
      ),
    ),
    hostManualSendTasksProvider(
      HostInboxSurfaceFixtures.club.id,
    ).overrideWithValue(
      AsyncData(
        HostManualSendTaskPage(
          organizerId: HostInboxSurfaceFixtures.club.id,
          tasks: const [],
          nextCursor: null,
        ),
      ),
    ),
    hostWhatsappThreadsProvider(
      HostInboxSurfaceFixtures.club.id,
    ).overrideWithValue(
      AsyncData(
        HostWhatsappThreadPage(
          organizerId: HostInboxSurfaceFixtures.club.id,
          threads: const [],
          nextCursor: null,
        ),
      ),
    ),
    watchEventParticipationsForEventProvider(
      HostInboxSurfaceFixtures.eventId,
    ).overrideWithValue(
      participations ??
          AsyncData<List<EventParticipation>>(
            HostInboxSurfaceFixtures.participations,
          ),
    ),
  ];
}

final _hostInboxSelectedPreview =
    HostInboxSurfaceFixtures.allThreads.conversations.first;
final _hostInboxSelectedMessages = <ChatMessage>[
  MatchesChatSurfaceFixtures.message(
    id: 'host-inbox-selected-message-1',
    senderId: HostInboxSurfaceFixtures.bookedOneUid,
    text: 'See you tonight! Is the entrance beside the blue team board?',
    sentAt: HostInboxSurfaceFixtures.now.subtract(const Duration(minutes: 24)),
  ),
  MatchesChatSurfaceFixtures.message(
    id: 'host-inbox-selected-message-2',
    senderId: HostInboxSurfaceFixtures.hostUid,
    text: 'Yes. Head upstairs and we will meet you by the board.',
    sentAt: HostInboxSurfaceFixtures.now.subtract(const Duration(minutes: 18)),
  ),
];

List<Object> _hostInboxSelectedThreadOverrides() => [
  ..._hostInboxProviderOverrides(includeUid: false),
  ..._hostChatProviderOverrides(
    uid: HostInboxSurfaceFixtures.hostUid,
    match: _hostInboxSelectedPreview.match,
    matchId: _hostInboxSelectedPreview.matchId,
    messages: _hostInboxSelectedMessages,
    includeEvent: false,
    includeClub: false,
  ),
  watchClubProvider(
    HostInboxSurfaceFixtures.club.id,
  ).overrideWith((ref) => Stream<Club?>.value(HostInboxSurfaceFixtures.club)),
  watchEventProvider(
    HostInboxSurfaceFixtures.event.id,
  ).overrideWith((ref) => Stream<Event?>.value(HostInboxSurfaceFixtures.event)),
  watchPublicProfileProvider(
    HostInboxSurfaceFixtures.bookedOneUid,
  ).overrideWith(
    (ref) => Stream<PublicProfile?>.value(
      const PublicProfile(
        uid: HostInboxSurfaceFixtures.bookedOneUid,
        name: 'Dev Patel',
        age: 30,
        gender: Gender.man,
        city: 'Mumbai',
      ),
    ),
  ),
];

List<Object> _hostChatProviderOverrides({
  String? uid = MatchesChatSurfaceFixtures.hostUid,
  Match? match,
  String? matchId,
  List<ChatMessage>? messages,
  bool matchLoading = false,
  Object? matchError,
  bool messagesLoading = false,
  Object? messagesError,
  bool includeEvent = true,
  bool includeClub = true,
}) {
  final effectiveMatch = match ?? _hostInquiryMatch;
  final id = matchId ?? effectiveMatch.id;
  final hasMatch = matchId == null || match != null;
  final effectiveMessages = messages ?? _hostInquiryMessages;
  final matchRepository = MatchesChatFixtureMatchRepository(
    matches: [if (hasMatch) effectiveMatch],
    matchById: {id: hasMatch ? effectiveMatch : null},
    matchError: matchError,
  );
  final conversationRepository = MatchesChatFixtureConversationRepository(
    messagesByConversationId: {id: effectiveMessages},
    loading: messagesLoading,
    messagesError: messagesError,
    failSends: true,
  );
  final effectiveEvent = includeEvent ? MatchesChatSurfaceFixtures.event : null;
  final effectiveClub = includeClub ? MatchesChatSurfaceFixtures.club : null;

  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    matchRepositoryProvider.overrideWithValue(matchRepository),
    conversationRepositoryProvider.overrideWithValue(conversationRepository),
    safetyRepositoryProvider.overrideWithValue(
      const MatchesChatFixtureSafetyRepository(),
    ),
    externalShareControllerProvider.overrideWithValue(
      ExternalShareController((_) async {}),
    ),
    matchStreamProvider(id).overrideWith((ref) {
      if (matchLoading) return MatchesChatSurfaceFixtures.loadingStream();
      if (matchError != null) {
        return Stream<Match?>.error(matchError, StackTrace.empty);
      }
      return Stream<Match?>.value(hasMatch ? effectiveMatch : null);
    }),
    watchConversationMessagesProvider(id).overrideWith(
      (ref) => conversationRepository.watchMessages(conversationId: id),
    ),
    watchClubProvider(
      MatchesChatSurfaceFixtures.club.id,
    ).overrideWith((ref) => Stream<Club?>.value(effectiveClub)),
    watchEventProvider(
      MatchesChatSurfaceFixtures.event.id,
    ).overrideWith((ref) => Stream<Event?>.value(effectiveEvent)),
    for (final profile in MatchesChatSurfaceFixtures.profiles.values)
      watchPublicProfileProvider(
        profile.uid,
      ).overrideWith((ref) => Stream.value(profile)),
  ];
}

Widget _hostChatCapture({
  Match? match,
  String? matchId,
  String? initialDraftText,
}) {
  final effectiveMatch = match ?? _hostInquiryMatch;
  final id = matchId ?? effectiveMatch.id;
  return _AppRoleCapture(
    role: AppRole.host,
    child: ChatScreen(matchId: id, initialDraftText: initialDraftText),
  );
}

Widget _hostChatKeyboardCapture() {
  return _HostChatKeyboardInset(
    child: _hostChatCapture(
      initialDraftText:
          'Thanks, Aarav. We will hold the check-in desk near the sea-facing '
          'steps, then move as a group once everyone has arrived.',
    ),
  );
}

class _HostChatKeyboardInset extends StatelessWidget {
  const _HostChatKeyboardInset({required this.child});

  static const _keyboardInset = EdgeInsets.only(bottom: 318);

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    return MediaQuery(
      data: media.copyWith(
        padding: media.padding.copyWith(bottom: 0),
        viewInsets: _keyboardInset,
      ),
      child: child,
    );
  }
}

class _HostChatBlockDialogCapture extends StatefulWidget {
  const _HostChatBlockDialogCapture({required this.child});

  final Widget child;

  @override
  State<_HostChatBlockDialogCapture> createState() =>
      _HostChatBlockDialogCaptureState();
}

class _HostChatBlockDialogCaptureState
    extends State<_HostChatBlockDialogCapture> {
  bool _shown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _shown) return;
      _shown = true;
      unawaited(showBlockUserDialog(context: context, name: 'Aarav'));
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _HostChatReportFailureNoticeCapture extends StatelessWidget {
  const _HostChatReportFailureNoticeCapture();

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Stack(
      children: [
        _hostChatCapture(),
        Align(
          alignment: Alignment.bottomCenter,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(CatchSpacing.s3),
              child: CatchSurface(
                emphasis: CatchSurfaceEmphasis.floating,
                radius: CatchRadius.md,
                backgroundColor: t.ink,
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchSpacing.s4,
                  vertical: CatchSpacing.micro14,
                ),
                child: CatchText(
                  'Unable to submit report. Please try again.',
                  variant: CatchTextVariant.titleS,
                  color: t.bg,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _HostChatSafetyPendingMenuCapture extends StatelessWidget {
  const _HostChatSafetyPendingMenuCapture();

  @override
  Widget build(BuildContext context) {
    return _AppRoleCapture(
      role: AppRole.host,
      child: Scaffold(
        body: SafeArea(
          child: Align(
            alignment: Alignment.topRight,
            child: Padding(
              padding: CatchInsets.pageBodyTight,
              child: CatchMenu<String>(
                width: CatchLayout.actionMenuWidth,
                items: [
                  CatchMenuItem<String>(
                    value: 'report',
                    label: 'Report',
                    sublabel: 'Submitting...',
                    icon: CatchIcons.flag,
                    enabled: false,
                  ),
                  CatchMenuItem<String>(
                    value: 'block',
                    label: 'Block',
                    sublabel: 'Blocking...',
                    icon: CatchIcons.block,
                    danger: true,
                    enabled: false,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

final _matchesCaptureConsumerMatches =
    MatchesChatSurfaceFixtures.populatedMatches;
final _matchesCaptureDuplicateMatches = <Match>[
  MatchesChatSurfaceFixtures.activeConversationMatch(
    id: 'design-match-taylor-older',
    preview: 'Earlier thread from the same event.',
    lastMessageAt: MatchesChatSurfaceFixtures.now.subtract(
      const Duration(hours: 5),
    ),
  ),
  MatchesChatSurfaceFixtures.activeConversationMatch(
    id: 'design-match-taylor-latest',
    preview: 'This row should win after duplicate collapse.',
    lastMessageAt: MatchesChatSurfaceFixtures.now.subtract(
      const Duration(minutes: 14),
    ),
  ),
  MatchesChatSurfaceFixtures.newMatch(),
];

NetworkException _matchesOfflineException({required String action}) {
  return MatchesChatSurfaceFixtures.offlineException(action: action);
}

List<Object> _matchesListProviderOverrides({
  String? uid = MatchesChatSurfaceFixtures.viewerUid,
  AsyncValue<ChatsListViewModel>? viewModel,
  List<Match>? matches,
  Object? matchesError,
}) {
  final effectiveMatches = matches ?? _matchesCaptureConsumerMatches;
  final effectiveViewModel =
      viewModel ??
      AsyncData<ChatsListViewModel>(
        _matchesListViewModelFor(
          uid: uid ?? MatchesChatSurfaceFixtures.viewerUid,
          matches: effectiveMatches,
        ),
      );
  final matchRepository = MatchesChatFixtureMatchRepository(
    matches: effectiveMatches,
    matchesError: matchesError,
  );

  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    chatsListViewModelProvider.overrideWithValue(effectiveViewModel),
    matchRepositoryProvider.overrideWithValue(matchRepository),
    if (uid != null)
      watchMatchesForUserProvider(uid).overrideWith((ref) {
        if (matchesError != null) {
          return Stream<List<Match>>.error(matchesError, StackTrace.empty);
        }
        return Stream<List<Match>>.value(effectiveMatches);
      }),
    watchEventProvider(MatchesChatSurfaceFixtures.eventId).overrideWith(
      (ref) => Stream<Event?>.value(MatchesChatSurfaceFixtures.event),
    ),
    watchClubProvider(MatchesChatSurfaceFixtures.clubId).overrideWith(
      (ref) => Stream<Club?>.value(MatchesChatSurfaceFixtures.club),
    ),
    ..._matchesPublicProfileOverrides,
  ];
}

ChatsListViewModel _matchesListViewModelFor({
  required String uid,
  required List<Match> matches,
  bool hostMode = false,
}) {
  final roleMatches = hostMode || AppConfig.appRole.isHost
      ? matches.where((match) => match.isClubHostInquiry).toList()
      : matches;
  final collapsed = collapseMatchesByOtherUser(roleMatches, uid);
  final newMatches = <ChatThreadPreview>[];
  final conversations = <ChatThreadPreview>[];

  for (final match in collapsed) {
    final preview = _matchesThreadPreviewFor(match: match, uid: uid);
    if (preview.hasConversation) {
      conversations.add(preview);
    } else {
      newMatches.add(preview);
    }
  }

  newMatches.sort((a, b) => b.timestamp.compareTo(a.timestamp));
  conversations.sort((a, b) => b.timestamp.compareTo(a.timestamp));

  return ChatsListViewModel(
    newMatches: List.unmodifiable(newMatches),
    conversations: List.unmodifiable(conversations),
    totalThreadCount: collapsed.length,
  );
}

ChatThreadPreview _matchesThreadPreviewFor({
  required Match match,
  required String uid,
}) {
  final otherUid = match.otherId(uid);
  final profile = MatchesChatSurfaceFixtures.profileFor(otherUid);
  ClubHostProfile? hostProfile;
  if (match.isClubHostInquiry) {
    for (final host in MatchesChatSurfaceFixtures.club.displayHostProfiles) {
      if (host.uid == otherUid) {
        hostProfile = host;
        break;
      }
    }
  }

  final displayName = hostProfile?.displayName ?? profile.name;
  final hasConversation = match.lastMessagePreview != null;
  final previewText = !hasConversation
      ? match.isClubHostInquiry
            ? 'Ask the host'
            : 'You matched!'
      : match.lastMessageSenderId == uid
      ? 'You: ${match.lastMessagePreview}'
      : match.lastMessagePreview!;

  return ChatThreadPreview(
    match: match,
    matchId: match.id,
    otherUid: otherUid,
    displayName: displayName,
    photoUrl: hostProfile?.avatarUrl ?? profile.primaryPhotoThumbnailUrl,
    previewText: previewText,
    timestamp: match.lastMessageAt ?? match.createdAt,
    unreadCount: match.unreadConversationCountFor(uid),
    hasConversation: hasConversation,
    eventIds: match.eventIds,
  );
}

List<Object> get _matchesPublicProfileOverrides {
  const uids = [
    MatchesChatSurfaceFixtures.taylorUid,
    MatchesChatSurfaceFixtures.morganUid,
    MatchesChatSurfaceFixtures.guestUid,
    'design-chat-guest-2',
    'design-chat-isha',
  ];

  return [
    for (final uid in uids)
      watchPublicProfileProvider(uid).overrideWith(
        (ref) => Stream<PublicProfile?>.value(
          MatchesChatSurfaceFixtures.profileFor(uid),
        ),
      ),
  ];
}

Widget _matchesListCapture({
  String searchQuery = '',
  AppRole role = AppRole.consumer,
  Widget child = const ChatsListScreen(
    initialScope: ConsumerChatScope.messages,
  ),
}) {
  return _AppRoleCapture(
    role: role,
    child: _ChatSearchQuerySeed(query: searchQuery, child: child),
  );
}

Widget _hostInboxCapture({
  HostInboxScope initialScope = const HostInboxScope.event(
    HostInboxSurfaceFixtures.eventId,
  ),
  HostInboxAudienceSegment initialSegment = HostInboxAudienceSegment.booked,
  HostMessagingWorkspace initialWorkspace = HostMessagingWorkspace.inbox,
  String searchQuery = '',
  bool broadcastEnabled = true,
}) {
  return _AppRoleCapture(
    role: AppRole.host,
    child: _ChatSearchQuerySeed(
      query: searchQuery,
      child: HostInboxScreen(
        initialScope: initialScope,
        initialSegment: initialSegment,
        initialWorkspace: initialWorkspace,
        broadcastEnabled: broadcastEnabled,
        syncSelectionToRoute: false,
        now: HostInboxSurfaceFixtures.now,
      ),
    ),
  );
}

class _ChatSearchQuerySeed extends ConsumerStatefulWidget {
  const _ChatSearchQuerySeed({required this.query, required this.child});

  final String query;
  final Widget child;

  @override
  ConsumerState<_ChatSearchQuerySeed> createState() =>
      _ChatSearchQuerySeedState();
}

class _ChatSearchQuerySeedState extends ConsumerState<_ChatSearchQuerySeed> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final notifier = ref.read(chatSearchQueryProvider.notifier);
      if (widget.query.isEmpty) {
        notifier.clear();
      } else {
        notifier.setQuery(widget.query);
      }
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

enum _HostBroadcastCaptureState { ready, pending, error }

class _HostBroadcastComposerCapture extends ConsumerStatefulWidget {
  const _HostBroadcastComposerCapture({
    this.state = _HostBroadcastCaptureState.ready,
  });

  final _HostBroadcastCaptureState state;

  @override
  ConsumerState<_HostBroadcastComposerCapture> createState() =>
      _HostBroadcastComposerCaptureState();
}

class _HostBroadcastComposerCaptureState
    extends ConsumerState<_HostBroadcastComposerCapture> {
  Completer<SendEventBroadcastCallableResponse>? _pending;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || widget.state == _HostBroadcastCaptureState.ready) return;
      if (widget.state == _HostBroadcastCaptureState.pending) {
        _pending = Completer<SendEventBroadcastCallableResponse>();
        _ignoreMutationResult(
          HostInboxBroadcastController.sendMutation.run(
            ref,
            (_) => _pending!.future,
          ),
        );
      } else {
        _ignoreMutationResult(
          HostInboxBroadcastController.sendMutation.run(
            ref,
            (_) async => throw StateError('Broadcast delivery unavailable'),
          ),
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return _AppRoleCapture(
      role: AppRole.host,
      child: Scaffold(
        body: Align(
          alignment: Alignment.bottomCenter,
          child: host_inbox.HostBroadcastComposerSheet(
            event: HostInboxSurfaceFixtures.event,
            bookedCount: 24,
            prospectiveCount: 9,
            initialSegment: HostInboxAudienceSegment.booked,
            initialTemplate: host_inbox.HostBroadcastTemplate.reminder,
            sendingEnabled: true,
            requestIdFactory: () => 'capture-broadcast-request',
            sendAction: _captureBroadcastSend,
          ),
        ),
      ),
    );
  }
}

void _ignoreMutationResult(Future<SendEventBroadcastCallableResponse> result) {
  unawaited(result.then<void>((_) {}, onError: (Object _, StackTrace _) {}));
}

Future<SendEventBroadcastCallableResponse> _captureBroadcastSend({
  required String requestId,
  required String eventId,
  required EventBroadcastAudience audience,
  required String body,
}) async => const SendEventBroadcastCallableResponse(
  broadcastId: 'capture-broadcast',
  status: EventBroadcastDeliveryStatus.completed,
  recipientCount: 24,
  excludedCount: 0,
  activityAvailableCount: 24,
  pushAttemptedCount: 0,
  pushAcceptedCount: 0,
  pushFailedCount: 0,
  pushUnknownCount: 0,
  idempotentReplay: false,
);

class _MatchCelebrationCapture extends StatelessWidget {
  const _MatchCelebrationCapture();

  @override
  Widget build(BuildContext context) {
    final match = MatchesChatSurfaceFixtures.activeConversationMatch();
    return MatchCelebrationDialog(
      match: match,
      otherUid: match.otherId(MatchesChatSurfaceFixtures.viewerUid),
      onSendMessage: () {},
      onKeepSwiping: () {},
    );
  }
}

List<Object> _matchChatProviderOverrides({
  String? uid = MatchesChatSurfaceFixtures.viewerUid,
  Match? match,
  String? matchId,
  List<ChatMessage>? messages,
  bool messagesLoading = false,
  Object? messagesError,
  Object? matchError,
  Event? event,
  bool includeEvent = true,
  Iterable<PublicProfile> publicProfiles = const <PublicProfile>[],
  SuvbotRepository suvbotRepository =
      const MatchesChatFixtureSuvbotRepository(),
}) {
  final effectiveMatch =
      match ?? MatchesChatSurfaceFixtures.activeConversationMatch();
  final id = matchId ?? effectiveMatch.id;
  final effectiveMessages =
      messages ?? MatchesChatSurfaceFixtures.conversationMessages;
  final matchRepository = MatchesChatFixtureMatchRepository(
    matches: [if (matchId == null || match != null) effectiveMatch],
    matchById: {id: matchId == null || match != null ? effectiveMatch : null},
    matchError: matchError,
  );
  final conversationRepository = MatchesChatFixtureConversationRepository(
    messagesByConversationId: {id: effectiveMessages},
    loading: messagesLoading,
    messagesError: messagesError,
    failSends: true,
  );
  final effectiveEvent = includeEvent
      ? event ?? MatchesChatSurfaceFixtures.event
      : null;
  final effectiveEventId = effectiveMatch.eventIds.isEmpty
      ? MatchesChatSurfaceFixtures.eventId
      : effectiveMatch.eventIds.first;
  final effectiveClubId =
      effectiveEvent?.clubId ?? MatchesChatSurfaceFixtures.clubId;

  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    matchRepositoryProvider.overrideWithValue(matchRepository),
    conversationRepositoryProvider.overrideWithValue(conversationRepository),
    suvbotRepositoryProvider.overrideWithValue(suvbotRepository),
    safetyRepositoryProvider.overrideWithValue(
      const MatchesChatFixtureSafetyRepository(),
    ),
    externalShareControllerProvider.overrideWithValue(
      ExternalShareController((_) async {}),
    ),
    matchStreamProvider(id).overrideWith((ref) {
      if (matchError != null) {
        return Stream<Match?>.error(matchError, StackTrace.empty);
      }
      return Stream<Match?>.value(
        matchId == null || match != null ? effectiveMatch : null,
      );
    }),
    watchConversationMessagesProvider(id).overrideWith(
      (ref) => conversationRepository.watchMessages(conversationId: id),
    ),
    watchEventProvider(
      effectiveEventId,
    ).overrideWith((ref) => Stream<Event?>.value(effectiveEvent)),
    watchClubProvider(effectiveClubId).overrideWith(
      (ref) => Stream<Club?>.value(MatchesChatSurfaceFixtures.club),
    ),
    ..._matchesPublicProfileOverrides,
    for (final profile in publicProfiles)
      watchPublicProfileProvider(
        profile.uid,
      ).overrideWith((ref) => Stream<PublicProfile?>.value(profile)),
  ];
}

Widget _matchChatCapture({
  Match? match,
  String? matchId,
  PublicProfile? initialProfile,
  String? initialDraftText,
  AppRole role = AppRole.consumer,
  bool includeInitialProfile = true,
}) {
  final effectiveMatch =
      match ?? MatchesChatSurfaceFixtures.activeConversationMatch();
  final id = matchId ?? effectiveMatch.id;
  return _AppRoleCapture(
    role: role,
    child: ChatScreen(
      matchId: id,
      initialDraftText: initialDraftText,
      otherProfile: !includeInitialProfile || role == AppRole.host
          ? null
          : initialProfile ??
                MatchesChatSurfaceFixtures.profileFor(
                  effectiveMatch.otherId(MatchesChatSurfaceFixtures.viewerUid),
                ),
    ),
  );
}

Widget _matchChatKeyboardCapture() {
  return _MatchChatKeyboardInset(
    child: _matchChatCapture(
      initialDraftText:
          'Gallery shortlist first, then coffee near Carter Road after the '
          'Thursday evening run if the weather holds.',
    ),
  );
}

class _MatchChatKeyboardInset extends StatelessWidget {
  const _MatchChatKeyboardInset({required this.child});

  static const _keyboardInset = EdgeInsets.only(bottom: 318);

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    return MediaQuery(
      data: media.copyWith(
        padding: media.padding.copyWith(bottom: 0),
        viewInsets: _keyboardInset,
      ),
      child: child,
    );
  }
}

class _MatchChatFeedbackNoticeCapture extends StatelessWidget {
  const _MatchChatFeedbackNoticeCapture({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return Stack(
      children: [
        _matchChatCapture(
          initialDraftText: 'Gallery shortlist first, then coffee after.',
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(CatchSpacing.s3),
              child: CatchSurface(
                emphasis: CatchSurfaceEmphasis.floating,
                radius: CatchRadius.md,
                backgroundColor: t.ink,
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchSpacing.s4,
                  vertical: CatchSpacing.micro14,
                ),
                child: CatchText(
                  message,
                  variant: CatchTextVariant.titleS,
                  color: t.bg,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _MatchChatBlockDialogCapture extends StatefulWidget {
  const _MatchChatBlockDialogCapture({required this.child});

  final Widget child;

  @override
  State<_MatchChatBlockDialogCapture> createState() =>
      _MatchChatBlockDialogCaptureState();
}

class _MatchChatBlockDialogCaptureState
    extends State<_MatchChatBlockDialogCapture> {
  bool _shown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _shown) return;
      _shown = true;
      unawaited(showBlockUserDialog(context: context, name: 'Taylor'));
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _ChatShareCardCapture extends StatelessWidget {
  const _ChatShareCardCapture();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Align(
          alignment: Alignment.bottomCenter,
          child: CatchExternalShareSheet(
            media: ChatShareCard(
              messages: MatchesChatSurfaceFixtures.conversationMessages,
              currentUid: MatchesChatSurfaceFixtures.viewerUid,
              event: MatchesChatSurfaceFixtures.event,
            ),
            share: ExternalShareController((_) async {}),
            fileName: 'catch-chat-card.png',
            buttonLabel: 'Share card',
            footnote: 'Names, photos, and timestamps are hidden.',
            subject: 'Catch chat card',
            text: 'Shared from Catch.',
          ),
        ),
      ),
    );
  }
}

class _ChatComposerStatesCapture extends StatefulWidget {
  const _ChatComposerStatesCapture({this.role = AppRole.consumer});

  final AppRole role;

  @override
  State<_ChatComposerStatesCapture> createState() =>
      _ChatComposerStatesCaptureState();
}

class _ChatComposerStatesCaptureState
    extends State<_ChatComposerStatesCapture> {
  late final TextEditingController _readyController;
  late final TextEditingController _sendingController;
  late final TextEditingController _imagePendingController;
  late final TextEditingController _disabledController;

  @override
  void initState() {
    super.initState();
    _readyController = TextEditingController(text: 'That last loop was fun.');
    _sendingController = TextEditingController(text: 'Sending this now...');
    _imagePendingController = TextEditingController(
      text: 'Uploading a photo...',
    );
    _disabledController = TextEditingController();
  }

  @override
  void dispose() {
    _readyController.dispose();
    _sendingController.dispose();
    _imagePendingController.dispose();
    _disabledController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _AppRoleCapture(
      role: widget.role,
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              const Spacer(),
              ChatInput(
                controller: _readyController,
                sending: false,
                onSend: () {},
                onSendImage: () {},
              ),
              const SizedBox(height: 12),
              ChatInput(
                controller: _sendingController,
                sending: true,
                onSend: () {},
                onSendImage: () {},
              ),
              const SizedBox(height: 12),
              ChatInput(
                controller: _imagePendingController,
                sending: false,
                sendingImage: true,
                onSend: () {},
                onSendImage: () {},
              ),
              const SizedBox(height: 12),
              ChatInput(
                controller: _disabledController,
                sending: false,
                disabledReason: 'This chat is closed.',
                onSend: null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

final _hostEvent = _captureFixtures.hostDemoEvent(
  role: 'hostLiveConsole',
  club: _dashboardHostClub,
);
final _hostLiveWindowNow = DateTime.now();
final _hostLiveWindowEvent = _hostEvent.copyWith(
  startTime: _hostLiveWindowNow.subtract(const Duration(minutes: 45)),
  endTime: _hostLiveWindowNow.add(const Duration(minutes: 45)),
);

final _marketingHostClub = hostMarketingIndiaScenario.club(_captureFixtures);
final _marketingHostSetupDraft = hostMarketingIndiaScenario.setupDraft(
  _captureFixtures,
);
final _marketingHostTodayEvent = hostMarketingIndiaScenario.event(
  _captureFixtures,
  'hostToday',
);
final _marketingHostLiveEvent = hostMarketingIndiaScenario.event(
  _captureFixtures,
  'hostLiveConsole',
);
final _marketingHostReportEvent = hostMarketingIndiaScenario.event(
  _captureFixtures,
  'hostPostEventReport',
);
final _marketingHostParticipationRepository = FakeEventParticipationRepository()
  ..eventParticipations[_marketingHostLiveEvent.id] = const [];
final _marketingHostPublicProfileRepository = FakePublicProfileRepository();
final _marketingHostLiveAttendees = [
  for (final (index, guest)
      in hostMarketingIndiaScenario.guestsAt('live').indexed)
    EventAttendee(
      id: 'marketing-india-attendee-$index',
      eventId: _marketingHostLiveEvent.id,
      clubId: _marketingHostClub.id,
      organizerId: _captureViewerUid,
      displayName: _captureFixtures.publicProfile(guest.personaId).name,
      searchName: _captureFixtures
          .publicProfile(guest.personaId)
          .name
          .toLowerCase(),
      source: EventAttendeeSource.catchBooking,
      status: guest.checkedInAt != null
          ? EventAttendeeStatus.checkedIn
          : EventAttendeeStatus.registered,
      createdAt: guest.bookedAt,
      updatedAt: guest.checkedInAt ?? guest.bookedAt,
      checkedInAt: guest.checkedInAt,
    ),
];
EventSuccessPlan _marketingHostPlan(Event event, {bool complete = false}) =>
    EventSuccessPlan.fromDraft(
      id: event.id,
      eventId: event.id,
      clubId: event.clubId,
      draft: hostMarketingIndiaScenario.guideDefaults.toDraft(
        targetAttendeeCount: event.capacityLimit,
      ),
      createdAt: hostMarketingIndiaScenario.clock('planning'),
      updatedAt: hostMarketingIndiaScenario.clock(
        complete ? 'followUp' : 'live',
      ),
      activeStepIndex: 1,
      status: complete
          ? EventSuccessPlanStatus.complete
          : EventSuccessPlanStatus.live,
      frozenAt: hostMarketingIndiaScenario.clock('live'),
      completedAt: complete ? event.endTime : null,
    );
List<Object> _marketingHostManageOverrides(
  Event event, {
  bool complete = false,
}) => [
  uidProvider.overrideWith((ref) => Stream.value(_captureViewerUid)),
  watchUserProfileProvider.overrideWith((ref) => Stream.value(_captureViewer)),
  watchEventProvider(event.id).overrideWith((ref) => Stream.value(event)),
  watchReviewsForEventProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <Review>[])),
  eventParticipationRepositoryProvider.overrideWithValue(
    _marketingHostParticipationRepository,
  ),
  watchEventAttendeesProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(_marketingHostLiveAttendees)),
  publicProfileRepositoryProvider.overrideWithValue(
    _marketingHostPublicProfileRepository,
  ),
  watchEventSuccessPlanProvider(event.id).overrideWith(
    (ref) => Stream.value(_marketingHostPlan(event, complete: complete)),
  ),
  watchEventSuccessScorecardProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(null)),
  watchEventSuccessAssignmentsProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessAssignment>[])),
  watchEventSuccessRotationAssignmentsProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessAssignment>[])),
  watchEventSuccessPreferencesProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessPreference>[])),
  watchEventSuccessWingmanRequestsProvider(
    event.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessWingmanRequest>[])),
];

final _hostEventSetupDraft = _captureFixtures.hostSetupDraft(
  id: 'host-event-setup-capture-draft',
  club: _dashboardHostClub,
  savedAt: _captureNow,
);
final _hostRuntimeSetupDraft = _hostEventSetupDraft.copyWith(
  id: 'runtime-create-capture',
  name: 'Friday supper club',
  externalBookingMode: true,
  capacity: '24',
  description: null,
  externalBookingProvider: 'generic',
  runtimeWalkInPolicy: 'hostApproval',
  admissionPreset: 'openCapacity',
  minAge: null,
  maxAge: null,
  selectedDateMillis: _captureNow
      .add(const Duration(days: 7))
      .millisecondsSinceEpoch,
  selectedStartHour: 19,
  selectedStartMinute: 0,
);
final _hostEventGuideDefaults = EventSuccessDefaults.recommendedForActivity(
  ActivityKind.dinner,
  enabled: true,
);
final _hostEventGuideDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-guide-capture-draft',
  eventSuccessDefaults: _hostEventGuideDefaults.copyWith(
    moduleSelectionConfigured: true,
    selectedModuleIds: [
      ..._hostEventGuideDefaults.selectedModuleIds,
      EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
    ],
  ),
);
final _hostEventPastScheduleDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-past-schedule-capture-draft',
  selectedDateMillis: DateTime(
    _captureNow.year,
    _captureNow.month,
    _captureNow.day,
  ).millisecondsSinceEpoch,
  selectedStartHour: _captureNow.hour - 1,
  selectedStartMinute: 30,
);
final _hostEventPolicyAgeValidationDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-policy-age-validation-capture-draft',
  admissionPreset: 'requestToJoin',
  minAge: '40',
  maxAge: '30',
  maxMen: null,
  maxWomen: null,
  dynamicPricingEnabled: false,
  dynamicPricingStep: null,
  dynamicPricingMax: null,
);
final _hostEventInviteOnlyDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-invite-only-capture-draft',
  admissionPreset: 'inviteOnly',
  inviteCode: 'CATCH-DELHI',
  maxMen: null,
  maxWomen: null,
  dynamicPricingEnabled: false,
  dynamicPricingStep: null,
  dynamicPricingMax: null,
);
final _hostEventCohortCapsDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-cohort-caps-capture-draft',
  admissionPreset: 'fixedCohortCaps',
  maxMen: '8',
  maxWomen: '8',
  dynamicPricingEnabled: false,
  dynamicPricingStep: null,
  dynamicPricingMax: null,
);
final _hostEventDynamicPricingDisabledDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-dynamic-pricing-disabled-capture-draft',
  admissionPreset: 'balancedSingles',
  dynamicPricingEnabled: false,
  dynamicPricingStep: null,
  dynamicPricingMax: null,
);
final _hostEventDynamicPricingValidationDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-dynamic-pricing-validation-capture-draft',
  admissionPreset: 'balancedSingles',
  dynamicPricingEnabled: true,
  dynamicPricingStep: '0',
  dynamicPricingMax: '0',
);
final _hostEventCustomActivityDraft = _hostEventSetupDraft.copyWith(
  id: 'host-event-custom-activity-capture-draft',
  activityKind: 'openActivity',
  customActivityLabel: 'Salsa mixer',
  interactionModel: 'hostLedProgram',
  distance: null,
  paceName: null,
);
final _hostGuestProfiles = _captureFixtures.rosterProfiles(
  count: (_hostEvent.bookedCount ?? 0) + (_hostEvent.waitlistedCount ?? 0),
);
final _hostParticipations = _captureFixtures.participationsForProfiles(
  event: _hostEvent,
  profiles: _hostGuestProfiles,
  attendedCount:
      _hostEvent.checkedInCount ?? salesDemoHostScenario.defaultCheckedInCount,
  waitlistedCount:
      _hostEvent.waitlistedCount ??
      salesDemoHostScenario.defaultWaitlistedCount,
  createdAt: DateTime(2026, 5, 28, 10),
);
final _hostParticipationRepository = FakeEventParticipationRepository()
  ..eventParticipations[_hostEvent.id] = _hostParticipations;
final _hostPublicProfileRepository = FakePublicProfileRepository()
  ..profiles = _hostGuestProfiles;
final _hostOperationalAttendees = [
  for (final indexed in _hostParticipations.indexed)
    if (indexed.$2.status != EventParticipationStatus.cancelled &&
        indexed.$2.status != EventParticipationStatus.deleted)
      EventAttendee(
        id: 'host-attendee-${indexed.$1}',
        eventId: _hostEvent.id,
        clubId: _hostEvent.clubId,
        organizerId: _captureViewerUid,
        displayName: _hostGuestProfiles[indexed.$1].name,
        searchName: _hostGuestProfiles[indexed.$1].name.toLowerCase(),
        source: EventAttendeeSource.catchBooking,
        status: switch (indexed.$2.status) {
          EventParticipationStatus.waitlisted => EventAttendeeStatus.waitlisted,
          EventParticipationStatus.attended => EventAttendeeStatus.checkedIn,
          _ => EventAttendeeStatus.registered,
        },
        linkedUid: indexed.$2.uid,
        createdAt: indexed.$2.createdAt,
        updatedAt: indexed.$2.updatedAt,
        checkedInAt: indexed.$2.attendedAt,
      ),
];
final _hostAttendeeIds = [
  for (final participation in _hostParticipations)
    if (participation.status != EventParticipationStatus.waitlisted)
      participation.uid,
];
final _hostWaitlistedIds = [
  for (final participation in _hostParticipations)
    if (participation.status == EventParticipationStatus.waitlisted)
      participation.uid,
];
final _hostProfileIds = [
  for (final participation in _hostParticipations) participation.uid,
];
final _hostProfileRows = <String, (String, String?)>{
  for (final profile in _hostGuestProfiles)
    profile.uid: (profile.name, profile.primaryPhotoThumbnailUrl),
};
final _hostAttendanceViewModel = AttendanceSheetViewModel(
  event: _hostEvent,
  attendeeIds: _hostAttendeeIds,
  attendedIds: {
    for (final participation in _hostParticipations)
      if (participation.status == EventParticipationStatus.attended)
        participation.uid,
  },
  waitlistedIds: _hostWaitlistedIds,
  profileIds: _hostProfileIds,
  participationsByUid: {
    for (final participation in _hostParticipations)
      participation.uid: participation,
  },
);
final _hostLivePlan =
    EventSuccessPlan.defaultForEvent(_hostEvent, now: _captureNow).copyWith(
      activeStepIndex: 1,
      status: EventSuccessPlanStatus.live,
      frozenAt: _captureNow,
    );
final _hostManageCheckInEvent = _hostEvent.copyWith(
  eventOrigin: const EventOrigin(
    mode: EventOriginMode.externalCompanion,
    bookingAuthority: EventBookingAuthority.external,
    rosterAuthority: EventRosterAuthority.hostImport,
    provider: ExternalBookingProvider.luma,
    externalEventId: 'capture-host-check-in-event',
    adapterVersion: 'luma-v1',
  ),
  runtimeAccess: const EventRuntimeAccess(
    enabled: true,
    publicRuntimeId: 'runtime_capturehostcheckin',
    walkInPolicy: EventRuntimeWalkInPolicy.hostApproval,
    termsVersion: 'event-runtime-v1',
  ),
);
final _hostManageOverrideEvent = HostOperationsFixtures.privateEvent.copyWith(
  startTime: DateTime(2026, 6, 9, 20),
  endTime: DateTime(2026, 6, 9, 22),
  bookedCount: 17,
  checkedInCount: 7,
  waitlistedCount: 3,
);
final _hostManageCheckInPlan = _hostManageLivePlanForModule(
  event: _hostManageCheckInEvent,
  now: _captureNow,
  moduleId: EventSuccessModuleCatalog.checkIn.id,
);
final _hostManageWingmanPlan = _hostManageLivePlanForModule(
  event: _hostEvent,
  now: _captureNow,
  moduleId: EventSuccessModuleCatalog.wingmanRequests.id,
  playbookId: 'social_run_light',
);
final _hostManageMicroPodsPlan = _hostManageLivePlanForModule(
  event: _hostEvent,
  now: _captureNow,
  moduleId: EventSuccessModuleCatalog.microPods.id,
  playbookId: 'social_run_light',
);
final _hostManageRotationsPlan = _hostManageLivePlanForModule(
  event: _hostEvent,
  now: _captureNow,
  moduleId: EventSuccessModuleCatalog.guidedRotations.id,
  playbookId: 'pickleball_rotations',
);
final _hostManageCuePlan = _hostManageLivePlanForModule(
  event: _hostEvent,
  now: _captureNow,
  moduleId: EventSuccessModuleCatalog.socialMissions.id,
);
final _hostManageOverridePlan = _hostManageLivePlanForModule(
  event: _hostManageOverrideEvent,
  now: _captureNow,
  moduleId: EventSuccessModuleCatalog.microPods.id,
);
final _hostManageRevealEvent = _hostManageLiveRevealEvent(
  _hostManageOverrideEvent,
);
final _hostManageRevealPlan =
    _hostManageLivePlanForModule(
      event: _hostManageRevealEvent,
      now: _captureNow,
      moduleId: EventSuccessModuleCatalog.liveReveal.id,
    ).copyWith(
      revealStatus: EventSuccessRevealStatus.revealed,
      activeRevealRoundIndex: 0,
      revealStartedAt: _captureNow.subtract(const Duration(minutes: 2)),
    );
final _hostManageRevealAssignments = _hostManageMicroPodAssignments(
  event: _hostManageRevealEvent,
  now: _captureNow,
);
final _hostManageOverrideAssignments = _hostManageMicroPodAssignments(
  event: _hostManageOverrideEvent,
  now: _captureNow,
  source: 'host_override_v1',
);
final _hostManageDisabledInviteLinks = <EventInviteLink>[
  HostOperationsFixtures.inviteLinks.first.copyWith(
    id: 'capture-host-link-disabled-edge',
    label: 'Alumni WhatsApp paused',
    source: 'whatsapp alumni',
    openCount: 88,
    requestCount: 14,
    confirmedCount: 6,
    checkedInCount: 3,
    catcherCount: 2,
    chatStartedCount: 2,
    disabledAt: _captureNow.subtract(const Duration(hours: 3)),
    updatedAt: _captureNow.subtract(const Duration(hours: 3)),
  ),
];
final _hostManageLongLabelInviteLinks = <EventInviteLink>[
  HostOperationsFixtures.inviteLinks.first.copyWith(
    id: 'capture-host-link-long-label-source',
    label: 'Partner newsletter referral with venue concierge follow-up',
    source: 'partner newsletter / co-working founders circle / June RSVP push',
    openCount: 214,
    requestCount: 43,
    confirmedCount: 18,
    checkedInCount: 9,
    catcherCount: 5,
    chatStartedCount: 7,
    disabledAt: null,
    updatedAt: _captureNow.subtract(const Duration(minutes: 25)),
  ),
];
final _hostLiveReferenceClub = _dashboardHostClub.copyWith(
  name: 'Bandra Social',
);
final _hostManageReferenceClub = _hostLiveReferenceClub.copyWith(
  ownerUserId: _captureViewerUid,
  hostUserId: _captureViewerUid,
  hostUserIds: const [_captureViewerUid],
  hostProfiles: const [
    ClubHostProfile(
      uid: _captureViewerUid,
      displayName: 'Mira Shah',
      role: ClubHostRole.owner,
    ),
  ],
);
final _hostManageReferenceEvent = _hostEvent.copyWith(
  id: 'host-manage-reference-trivia',
  clubId: _hostManageReferenceClub.id,
  startTime: DateTime(2026, 6, 9, 20),
  endTime: DateTime(2026, 6, 9, 22),
  meetingPoint: 'The Daily Bar',
  meetingLocation: const EventMeetingLocation(
    name: 'The Daily Bar',
    address: 'Bandra West, Mumbai',
    latitude: 19.0607,
    longitude: 72.8362,
  ),
  startingPointLat: 19.0607,
  startingPointLng: 72.8362,
  locationDetails: 'The Daily Bar',
  eventFormat: EventFormatSnapshot.custom(
    label: 'trivia night',
    interactionModel: EventInteractionModel.teamRotations,
  ),
  distanceKm: 0,
  bookedCount: 24,
  checkedInCount: 0,
  waitlistedCount: 6,
  capacityLimit: 30,
  priceInPaise: 0,
  eventPolicy: EventPolicyBundle.inviteOnlyEvent(
    capacityLimit: 30,
    basePriceInPaise: 0,
    inviteCodeHint: 'BANDRA',
  ),
);
final _hostEventsReferenceClub = _hostManageReferenceClub.copyWith(
  id: 'host-home-reference-bandra-social',
  name: 'Bandra Social',
  area: 'Khar',
  location: 'Mumbai',
  ownerUserId: HostOperationsFixtures.hostUid,
  hostUserId: HostOperationsFixtures.hostUid,
  hostUserIds: const [HostOperationsFixtures.hostUid],
  hostProfiles: const [
    ClubHostProfile(
      uid: HostOperationsFixtures.hostUid,
      displayName: 'Aanya Rao',
      role: ClubHostRole.owner,
    ),
  ],
  hostDefaults: const ClubHostDefaults(
    primaryActivityKind: ActivityKind.pubQuiz,
    supportedActivityKinds: [ActivityKind.pubQuiz],
  ),
);
final _hostEventsSpotlightEvent = _hostManageReferenceEvent.copyWith(
  id: 'host-home-reference-trivia',
  clubId: _hostEventsReferenceClub.id,
  eventFormat: const EventFormatSnapshot(
    activityKind: ActivityKind.pubQuiz,
    interactionModel: EventInteractionModel.teamRotations,
    customActivityLabel: 'Trivia Night',
  ),
);
final _hostEventsReferenceNow = DateTime(2026, 6, 17, 17);
final _hostEventsReferenceEvents = <Event>[
  _hostEventsSpotlightEvent.copyWith(
    id: 'host-events-reference-trivia',
    startTime: DateTime(2026, 6, 17, 20),
    endTime: DateTime(2026, 6, 17, 22),
    bookedCount: 24,
    waitlistedCount: 2,
    capacityLimit: 30,
  ),
  HostOperationsFixtures.upcomingEvent.copyWith(
    id: 'host-events-reference-run',
    clubId: _hostEventsReferenceClub.id,
    startTime: DateTime(2026, 6, 21, 6, 30),
    endTime: DateTime(2026, 6, 21, 8),
    bookedCount: 6,
    capacityLimit: 10,
  ),
  HostOperationsFixtures.fullEvent.copyWith(
    id: 'host-events-reference-dinner',
    clubId: _hostEventsReferenceClub.id,
    startTime: DateTime(2026, 6, 27, 20),
    endTime: DateTime(2026, 6, 27, 22),
    bookedCount: 10,
    checkedInCount: 0,
    waitlistedCount: 0,
    capacityLimit: 15,
  ),
  HostOperationsFixtures.upcomingEvent.copyWith(
    id: 'host-events-reference-padel',
    clubId: _hostEventsReferenceClub.id,
    startTime: DateTime(2026, 7, 6, 9),
    endTime: DateTime(2026, 7, 6, 10, 30),
    eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.padel),
    bookedCount: 5,
    waitlistedCount: 0,
    capacityLimit: 16,
  ),
  _hostEventsSpotlightEvent.copyWith(
    id: 'host-events-reference-past-trivia',
    startTime: DateTime(2026, 6, 10, 20),
    endTime: DateTime(2026, 6, 10, 22),
    bookedCount: 26,
    checkedInCount: 26,
    waitlistedCount: 0,
    capacityLimit: 26,
  ),
];
final _hostHomeLongNameOwnerClub = HostOperationsFixtures.primaryClub.copyWith(
  id: 'host-home-long-owner-club',
  name: 'Bandra Sea Face Morning Run Club for New Members',
  area: 'Bandra West Promenade',
);
final _hostHomeLongNameCoHostedClub = HostOperationsFixtures.coHostedClub
    .copyWith(
      id: 'host-home-long-cohost-club',
      name: 'South Mumbai Rooftop Dinner Collective With Guest Hosts',
      area: 'Fort and Kala Ghoda',
    );
final _hostHomeLongNameEvent = HostOperationsFixtures.upcomingEvent.copyWith(
  id: 'host-home-long-name-event',
  clubId: _hostHomeLongNameOwnerClub.id,
  meetingPoint: 'Bandra West Promenade amphitheatre',
  meetingLocation: HostOperationsFixtures.upcomingEvent.meetingLocation!
      .copyWith(name: 'Bandra West Promenade amphitheatre'),
);
final _hostManageFullReferenceEvent = _hostManageReferenceEvent.copyWith(
  id: 'host-manage-reference-trivia-full',
  waitlistedCohortCounts: const {EventCohortIds.womenInterestedInMen: 6},
);
final _hostManageReferenceProfiles = _captureFixtures.rosterProfiles(count: 30);
final _hostManageReferenceParticipations = _captureFixtures
    .participationsForProfiles(
      event: _hostManageReferenceEvent,
      profiles: _hostManageReferenceProfiles,
      waitlistedCount: 6,
      createdAt: DateTime(2026, 6, 8, 16),
    );
final _hostManageFullReferenceParticipations = [
  for (final participation in _hostManageReferenceParticipations)
    participation.copyWith(eventId: _hostManageFullReferenceEvent.id),
];
final _hostClubDetailReferenceClub = HostOperationsFixtures.primaryClub.copyWith(
  name: 'Sunday sea-face crew',
  description:
      'The standing Saturday run - an easy 5K along the Bandra seafront as the light goes gold, coffee and bun maska after. No medals, no Strava pressure. Just show up, move, linger.',
  location: 'in-mh-mumbai',
  locationCityId: 'in-mh-mumbai',
  locationMarketId: 'in-mh-mumbai',
  area: 'Bandra',
  imageUrl: _clubHeroPortraitAssetPath,
  profileImageUrl: _clubHeroPortraitAssetPath,
  clubPhotos: [
    _hostClubDetailPhoto('club-detail-run-1', 0),
    _hostClubDetailPhoto('club-detail-run-2', 1),
    _hostClubDetailPhoto('club-detail-run-3', 2),
  ],
  tags: const ['Beginners ok', 'Coffee after'],
  memberCount: 124,
  rating: 4.7,
  reviewCount: 23,
  createdAt: DateTime(2025, 1, 12),
  nextEventAt: DateTime(2025, 6, 14, 6, 30),
  nextEventLabel: 'Sat 6:30 AM',
  instagramHandle: '@sundayseaface',
  phoneNumber: '+91 98200 11223',
  email: 'hello@seafacecrew.in',
  hostProfiles: const [
    ClubHostProfile(
      uid: HostOperationsFixtures.hostUid,
      displayName: 'Priya Kapoor',
      avatarUrl: _clubHeroPortraitAssetPath,
      role: ClubHostRole.owner,
    ),
    ClubHostProfile(
      uid: HostOperationsFixtures.coHostUid,
      displayName: 'Arjun Mehta',
    ),
    ClubHostProfile(uid: 'design-host-sana', displayName: 'Sana Iyer'),
  ],
  hostDefaults: const ClubHostDefaults(
    supportedActivityKinds: [ActivityKind.running, ActivityKind.walking],
  ),
);
final _hostClubDetailReferenceEvents = [
  _hostEvent.copyWith(
    id: 'host-club-detail-run-14',
    clubId: _hostClubDetailReferenceClub.id,
    startTime: DateTime(2025, 6, 14, 6, 30),
    endTime: DateTime(2025, 6, 14, 8),
    meetingPoint: 'Carter Road jetty',
    meetingLocation: const EventMeetingLocation(
      name: 'Carter Road jetty',
      address: 'Carter Road, Bandra West',
      latitude: 19.0702,
      longitude: 72.8228,
    ),
    startingPointLat: 19.0702,
    startingPointLng: 72.8228,
    locationDetails: 'Meet by the jetty',
    eventFormat: const EventFormatSnapshot.socialRun(),
    distanceKm: 5,
    pace: PaceLevel.easy,
    bookedCount: 12,
    capacityLimit: 16,
    priceInPaise: 0,
    description: 'An easy 5K along the Bandra seafront with coffee after.',
  ),
  _hostEvent.copyWith(
    id: 'host-club-detail-run-15',
    clubId: _hostClubDetailReferenceClub.id,
    startTime: DateTime(2025, 6, 21, 6, 30),
    endTime: DateTime(2025, 6, 21, 8),
    meetingPoint: 'Carter Road jetty',
    meetingLocation: const EventMeetingLocation(
      name: 'Carter Road jetty',
      address: 'Carter Road, Bandra West',
      latitude: 19.0702,
      longitude: 72.8228,
    ),
    startingPointLat: 19.0702,
    startingPointLng: 72.8228,
    eventFormat: const EventFormatSnapshot.socialRun(),
    distanceKm: 5,
    pace: PaceLevel.easy,
    bookedCount: 8,
    capacityLimit: 16,
    priceInPaise: 0,
  ),
  _hostEvent.copyWith(
    id: 'host-club-detail-run-16',
    clubId: _hostClubDetailReferenceClub.id,
    startTime: DateTime(2025, 6, 28, 6, 30),
    endTime: DateTime(2025, 6, 28, 8),
    meetingPoint: 'Carter Road jetty',
    meetingLocation: const EventMeetingLocation(
      name: 'Carter Road jetty',
      address: 'Carter Road, Bandra West',
      latitude: 19.0702,
      longitude: 72.8228,
    ),
    startingPointLat: 19.0702,
    startingPointLng: 72.8228,
    eventFormat: const EventFormatSnapshot.socialRun(),
    distanceKm: 5,
    pace: PaceLevel.easy,
    bookedCount: 0,
    capacityLimit: 16,
    priceInPaise: 0,
  ),
];

UploadedPhoto _hostClubDetailPhoto(String id, int position) {
  return UploadedPhoto(
    id: id,
    url: _clubHeroPortraitAssetPath,
    storagePath: 'fixtures/$id.jpg',
    thumbnailUrl: _clubHeroPortraitAssetPath,
    thumbnailStoragePath: 'fixtures/$id-thumb.jpg',
    position: position,
    createdAt: DateTime(2025, 1, 12),
    updatedAt: DateTime(2025, 1, 12),
  );
}

final _hostMediaReviewClub = HostOperationsFixtures.dinnerClub.copyWith(
  imageUrl: _clubHeroPortraitAssetPath,
  profileImageUrl: _profilePortraitAssetPath,
  clubPhotos: [
    _hostMediaReviewPhoto('host-media-cover', 0, _clubHeroPortraitAssetPath),
    _hostMediaReviewPhoto(
      'host-media-gallery-one',
      1,
      _profilePortraitAssetPath,
    ),
    _hostMediaReviewPhoto(
      'host-media-gallery-two',
      2,
      _clubHeroPortraitAssetPath,
    ),
  ],
);

UploadedPhoto _hostMediaReviewPhoto(String id, int position, String assetPath) {
  return UploadedPhoto(
    id: id,
    url: assetPath,
    storagePath: 'fixtures/$id.jpg',
    thumbnailUrl: assetPath,
    thumbnailStoragePath: 'fixtures/$id-thumb.jpg',
    position: position,
    createdAt: DateTime(2025, 11, 3),
    updatedAt: DateTime(2025, 11, 3),
  );
}

final _hostCreateSuccessReferenceClub = _dashboardHostClub.copyWith(
  name: 'Sunday sea-face crew',
);
final _hostCreateSuccessReferenceEvent = _hostEvent.copyWith(
  clubId: _hostCreateSuccessReferenceClub.id,
  startTime: DateTime(2025, 6, 22, 6, 30),
  endTime: DateTime(2025, 6, 22, 8),
  meetingPoint: 'Carter Road jetty, Bandra West',
  meetingLocation: const EventMeetingLocation(
    name: 'Carter Road jetty, Bandra West',
    address: 'Carter Road, Bandra West',
    latitude: 19.0702,
    longitude: 72.8228,
  ),
  startingPointLat: 19.0702,
  startingPointLng: 72.8228,
  locationDetails: 'Meet by the jetty',
  eventFormat: const EventFormatSnapshot.socialRun(),
  distanceKm: 5,
  pace: PaceLevel.easy,
  capacityLimit: 10,
  bookedCount: 0,
  checkedInCount: 0,
  waitlistedCount: 0,
);
final _hostLiveReferenceEvent = _hostEvent.copyWith(
  startTime: DateTime(2026, 6, 9, 20),
  endTime: DateTime(2026, 6, 9, 22),
  meetingPoint: 'The Daily Bar',
  meetingLocation: const EventMeetingLocation(
    name: 'The Daily Bar',
    address: 'Bandra West, Mumbai',
    latitude: 19.0607,
    longitude: 72.8362,
  ),
  startingPointLat: 19.0607,
  startingPointLng: 72.8362,
  locationDetails: 'The Daily Bar',
  eventFormat: const EventFormatSnapshot(
    activityKind: ActivityKind.pubQuiz,
    interactionModel: EventInteractionModel.hostLedProgram,
    customActivityLabel: 'trivia night',
    defaultPlaybookId: 'host_led_social',
  ),
  distanceKm: 0,
  bookedCount: 24,
  checkedInCount: 18,
  waitlistedCount: 0,
  capacityLimit: 30,
);
final _hostLiveReferenceProfiles = _captureFixtures.rosterProfiles(count: 24);
final _hostLiveReferenceOperationalAttendees = List<EventAttendee>.generate(
  24,
  (index) => EventAttendee(
    id: 'host-live-attendee-$index',
    eventId: _hostLiveReferenceEvent.id,
    clubId: _hostLiveReferenceEvent.clubId,
    organizerId: _captureViewerUid,
    displayName: 'Guest ${index + 1}',
    searchName: 'guest ${index + 1}',
    source: EventAttendeeSource.hostImport,
    status: index < 18
        ? EventAttendeeStatus.checkedIn
        : EventAttendeeStatus.registered,
    createdAt: DateTime(2026, 6, 9, 18),
    updatedAt: DateTime(2026, 6, 9, 19),
    checkedInAt: index < 18 ? DateTime(2026, 6, 9, 19) : null,
  ),
);
final _hostLiveReferenceParticipationRepository =
    FakeEventParticipationRepository()
      ..eventParticipations[_hostLiveReferenceEvent.id] = const [];
final _hostLiveReferencePublicProfileRepository = FakePublicProfileRepository()
  ..profiles = _hostLiveReferenceProfiles;
final _hostLiveReferencePlan =
    EventSuccessPlan.defaultForEvent(
      _hostLiveReferenceEvent,
      now: _captureNow,
    ).copyWith(
      activeStepIndex: 1,
      status: EventSuccessPlanStatus.live,
      frozenAt: _captureNow,
    );
final _hostLiveRoomReferenceEvent = _hostLiveReferenceEvent.copyWith(
  eventFormat: EventFormatSnapshot.custom(
    label: 'Singles table mixer',
    interactionModel: EventInteractionModel.pairedRotations,
  ),
);
final _hostLiveRoomReferenceLayout = EventSuccessLayout(
  layoutId: 'host-live-room-six-rounds',
  label: 'Six round tables',
  units: [
    for (var index = 0; index < 6; index += 1)
      EventSuccessLayoutUnit(
        id: 'round-${index + 1}',
        label: 'Table ${index + 1}',
        shape: EventSuccessLayoutShape.round,
        capacity: 4,
        gridX: index % 2,
        gridY: index ~/ 2,
        order: index + 1,
      ),
  ],
);
final _hostLiveRoomReferencePlan =
    EventSuccessPlan.defaultForEvent(
      _hostLiveRoomReferenceEvent,
      now: _captureNow,
    ).copyWith(
      activeStepIndex: 1,
      status: EventSuccessPlanStatus.live,
      frozenAt: _captureNow,
      layoutId: _hostLiveRoomReferenceLayout.layoutId,
    );
const _hostLiveRoomAssignmentUnitIds = <String>[
  'round-1',
  'round-1',
  'round-1',
  'round-1',
  'round-2',
  'round-2',
  'round-2',
  'round-2',
  'round-3',
  'round-3',
  'round-3',
  'round-3',
  'round-4',
  'round-4',
  'round-4',
  'round-5',
  'round-5',
  'round-5',
  'round-6',
  'round-6',
];
const _hostLiveRoomUnconfirmedIndexes = <int>{0, 8, 15};
final _hostLiveRoomAssignments = <EventSuccessAssignment>[
  for (final indexed in _hostLiveReferenceProfiles.take(20).indexed)
    EventSuccessAssignment(
      id: '${_hostLiveRoomReferenceEvent.id}_micro_pods_${indexed.$2.uid}',
      eventId: _hostLiveRoomReferenceEvent.id,
      clubId: _hostLiveRoomReferenceEvent.clubId,
      uid: indexed.$2.uid,
      moduleId: EventSuccessModuleCatalog.microPods.id,
      label:
          'Table ${(_hostLiveRoomAssignmentUnitIds[indexed.$1].split('-').last)}',
      displayTitle: indexed.$2.name,
      displaySubtitle: indexed.$1 == 0 ? 'Late arrival' : null,
      peerUids: indexed.$1 == 0
          ? const []
          : [
              _hostLiveReferenceProfiles[indexed.$1 == 19 ? 1 : indexed.$1 + 1]
                  .uid,
            ],
      unitKind: 'pods',
      unitIndex: indexed.$1,
      unitLabel:
          'Table ${_hostLiveRoomAssignmentUnitIds[indexed.$1].split('-').last}',
      layoutUnitId: _hostLiveRoomAssignmentUnitIds[indexed.$1],
      confirmedLayoutUnitId:
          _hostLiveRoomUnconfirmedIndexes.contains(indexed.$1)
          ? null
          : _hostLiveRoomAssignmentUnitIds[indexed.$1],
      source: 'capture_room_runtime_v1',
      createdAt: _hostLiveRoomReferenceEvent.startTime,
      updatedAt: _hostLiveRoomReferenceEvent.startTime,
    ),
];
final _hostLiveRoomRoster = EventParticipationRoster(
  bookedIds: [for (final profile in _hostLiveReferenceProfiles) profile.uid],
  checkedInIds: [
    for (final profile in _hostLiveReferenceProfiles.take(20)) profile.uid,
  ],
  waitlistedIds: const [],
  checkedInAtByUid: {
    for (final profile in _hostLiveReferenceProfiles.take(20))
      profile.uid: _hostLiveRoomReferenceEvent.startTime,
  },
);
final _hostLiveWindowPlan =
    EventSuccessPlan.defaultForEvent(
      _hostLiveWindowEvent,
      now: _hostLiveWindowNow,
    ).copyWith(
      activeStepIndex: 1,
      status: EventSuccessPlanStatus.live,
      frozenAt: _hostLiveWindowNow,
    );
final _hostReportPlan = _hostLivePlan.copyWith(
  status: EventSuccessPlanStatus.complete,
  activeStepIndex: 3,
  completedAt: _captureNow.add(const Duration(hours: 2)),
);
final _hostEventSuccessProviderOverrides = [
  watchEventSuccessAssignmentsProvider(
    _hostEvent.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessAssignment>[])),
  watchEventSuccessRotationAssignmentsProvider(
    _hostEvent.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessAssignment>[])),
  watchEventSuccessPreferencesProvider(
    _hostEvent.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessPreference>[])),
  watchEventSuccessWingmanRequestsProvider(
    _hostEvent.id,
  ).overrideWith((ref) => Stream.value(const <EventSuccessWingmanRequest>[])),
  attendanceSheetViewModelProvider(
    _hostEvent.id,
  ).overrideWithValue(AsyncData(_hostAttendanceViewModel)),
  attendeeProfilesProvider(
    _hostProfileIds,
  ).overrideWith((ref) async => _hostProfileRows),
];

final _matchesListProfiles = [
  _matchChatOtherProfile,
  _captureFixtures.publicProfile('nyc_sofia_martinez_003'),
  _captureFixtures.publicProfile('nyc_priya_desai_007'),
];
final _matchesListMatches = [
  _matchChatMatch,
  Match(
    id: 'match-list-new-sofia',
    user1Id: _matchChatViewerUid,
    user2Id: _matchesListProfiles[1].uid,
    eventIds: ['event-discovery-pickle-open'],
    createdAt: DateTime(2026, 5, 30, 19, 12),
    unreadCounts: const {_matchChatViewerUid: 0},
  ),
  Match(
    id: 'match-list-priya',
    user1Id: _matchesListProfiles[2].uid,
    user2Id: _matchChatViewerUid,
    eventIds: ['event-dashboard-next'],
    createdAt: DateTime(2026, 5, 30, 8, 55),
    lastMessageAt: DateTime(2026, 5, 30, 10, 8),
    lastMessagePreview: 'Next dawn loop, same coffee place?',
    lastMessageSenderId: _matchesListProfiles[2].uid,
    unreadCounts: const {_matchChatViewerUid: 2},
  ),
];
final _matchesListMatchRepository = _CaptureMatchRepository(
  matches: _matchesListMatches,
);

final _eventSuccessCompanionEvent = buildEvent(
  id: 'event-success-companion-capture',
  clubId: _dashboardJoinedClub.id,
  startTime: DateTime(2026, 5, 31, 9, 20),
  endTime: DateTime(2026, 5, 31, 10, 30),
  meetingPoint: 'Bandra Fort gate',
  bookedCount: 18,
  checkedInCount: 0,
  capacityLimit: 22,
  description:
      'A live event guide for arrivals, prompts, and post-run openers.',
);
final _eventSuccessCompanionPlan = EventSuccessPlan.defaultForEvent(
  _eventSuccessCompanionEvent,
  now: _captureNow,
);
final _eventSuccessCompanionParticipation = buildEventParticipation(
  event: _eventSuccessCompanionEvent,
  uid: _captureViewerUid,
  createdAt: DateTime(2026, 5, 29, 9),
);

List<Object> _eventSuccessCompanionRouteProviderOverrides({
  AsyncValue<String?> uidValue = const AsyncData<String?>(_captureViewerUid),
  AsyncValue<Event?>? eventValue,
  AsyncValue<UserProfile?>? profileValue,
  AsyncValue<EventParticipation?>? participationValue,
  AsyncValue<EventSuccessPlan?>? planValue,
}) {
  return [
    uidProvider.overrideWithValue(uidValue),
    watchEventProvider(_eventSuccessCompanionEvent.id).overrideWithValue(
      eventValue ?? AsyncData<Event?>(_eventSuccessCompanionEvent),
    ),
    watchUserProfileProvider.overrideWithValue(
      profileValue ?? AsyncData<UserProfile?>(_captureViewer),
    ),
    watchEventParticipationProvider(
      _eventSuccessCompanionEvent.id,
      _captureViewerUid,
    ).overrideWithValue(
      participationValue ??
          AsyncData<EventParticipation?>(_eventSuccessCompanionParticipation),
    ),
    watchEventSuccessPlanProvider(
      _eventSuccessCompanionEvent.id,
    ).overrideWithValue(
      planValue ?? AsyncData<EventSuccessPlan?>(_eventSuccessCompanionPlan),
    ),
    eventSuccessCompanionClockProvider.overrideWithValue(
      AsyncData<DateTime>(_captureNow),
    ),
    eventSuccessLiveEffectsControllerProvider.overrideWith(
      (ref) => _NoopEventSuccessLiveEffectsController(),
    ),
  ];
}

List<Object> _eventSuccessCompanionProviderOverrides() => [
  uidProvider.overrideWithValue(
    const AsyncData<String?>(EventSuccessCompanionFixtures.viewerUid),
  ),
  eventSuccessLiveEffectsControllerProvider.overrideWith(
    (ref) => _NoopEventSuccessLiveEffectsController(),
  ),
];

enum _EventSuccessCompanionMutationCaptureMode {
  selfCheckInPending,
  firstHelloStartPending,
  firstHelloCompletePending,
  compatibilityPending,
  microPodsOptOutPending,
  guidedRotationsOptOutPending,
  wingmanRequestPending,
  feedbackPending,
}

Widget _eventSuccessCompanionCapture({
  Event? event,
  EventSuccessPlan? plan,
  EventParticipation? participation,
  List<PublicProfile> wingmanRequestCandidates = const [],
  EventSuccessWingmanRequest? wingmanRequest,
  EventSuccessCompatibilityResponse? compatibilityResponse,
  EventSuccessFeedback? existingFeedback,
  EventSuccessAssignment? assignment,
  List<PublicProfile> assignmentPeerProfiles = const [],
  bool assignmentPeersLoading = false,
  bool microPodsOptedOut = false,
  EventSuccessAssignment? rotationAssignment,
  List<PublicProfile> rotationPeerProfiles = const [],
  bool rotationPeersLoading = false,
  bool guidedRotationsOptedOut = false,
  EventSuccessArrivalMission? arrivalMission,
  DateTime? now,
  Future<void> Function(List<String> answerIds)? onSaveCompatibilityAnswers,
  Future<void> Function()? onStartArrivalMission,
  Future<void> Function(EventSuccessArrivalMission mission, String answerId)?
  onCompleteArrivalMission,
  VoidCallback? onSkipArrivalMission,
  _EventSuccessCompanionMutationCaptureMode? mutationMode,
}) {
  final resolvedEvent = event ?? EventSuccessCompanionFixtures.socialEvent;
  final screen = EventSuccessCompanionScreen(
    event: resolvedEvent,
    plan: plan ?? EventSuccessCompanionFixtures.basePlan,
    userProfile: EventSuccessCompanionFixtures.viewer,
    participation:
        participation ??
        EventSuccessCompanionFixtures.signedUpParticipation(
          event: resolvedEvent,
        ),
    wingmanRequestCandidates: wingmanRequestCandidates,
    wingmanRequest: wingmanRequest,
    compatibilityResponse: compatibilityResponse,
    existingFeedback: existingFeedback,
    assignment: assignment,
    assignmentPeerProfiles: assignmentPeerProfiles,
    assignmentPeersLoading: assignmentPeersLoading,
    microPodsOptedOut: microPodsOptedOut,
    rotationAssignment: rotationAssignment,
    rotationPeerProfiles: rotationPeerProfiles,
    rotationPeersLoading: rotationPeersLoading,
    guidedRotationsOptedOut: guidedRotationsOptedOut,
    arrivalMission: arrivalMission,
    now: now,
    onSaveCompatibilityAnswers: onSaveCompatibilityAnswers,
    onStartArrivalMission: onStartArrivalMission,
    onCompleteArrivalMission: onCompleteArrivalMission,
    onSkipArrivalMission: onSkipArrivalMission,
  );
  if (mutationMode == null) return screen;
  return _EventSuccessCompanionMutationCapture(
    mode: mutationMode,
    child: screen,
  );
}

final _eventSuccessMotionParityAnchor = DateTime.fromMillisecondsSinceEpoch(
  1786703400000,
);
final _eventSuccessMotionParityEvent = EventSuccessCompanionFixtures.racketEvent
    .copyWith(
      id: 'event-parity-2026',
      checkedInCount: 24,
      startTime: _eventSuccessMotionParityAnchor.subtract(
        const Duration(hours: 1),
      ),
      endTime: _eventSuccessMotionParityAnchor.add(const Duration(hours: 1)),
    );
final _eventSuccessMotionParityPlan = EventSuccessCompanionFixtures
    .revealCountingDownPlan
    .copyWith(
      id: 'event-parity-2026',
      eventId: 'event-parity-2026',
      activeRevealRoundIndex: 2,
      revealStartedAt: _eventSuccessMotionParityAnchor,
    );

class _EventSuccessCompanionMutationCapture extends ConsumerStatefulWidget {
  const _EventSuccessCompanionMutationCapture({
    required this.mode,
    required this.child,
  });

  final _EventSuccessCompanionMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_EventSuccessCompanionMutationCapture> createState() =>
      _EventSuccessCompanionMutationCaptureState();
}

class _EventSuccessCompanionMutationCaptureState
    extends ConsumerState<_EventSuccessCompanionMutationCapture> {
  @override
  void initState() {
    super.initState();
    _resetMutations();
    _seed();
  }

  @override
  void dispose() {
    _resetMutations();
    super.dispose();
  }

  void _resetMutations() {
    EventBookingController.selfCheckInMutation.reset(ref);
    EventSuccessController.firstHelloStartMutation.reset(ref);
    EventSuccessController.firstHelloCompleteMutation.reset(ref);
    EventSuccessController.compatibilityResponseMutation.reset(ref);
    EventSuccessController.microPodsOptOutMutation.reset(ref);
    EventSuccessController.guidedRotationsOptOutMutation.reset(ref);
    EventSuccessController.wingmanRequestMutation.reset(ref);
    EventSuccessController.feedbackMutation.reset(ref);
  }

  void _seed() {
    switch (widget.mode) {
      case _EventSuccessCompanionMutationCaptureMode.selfCheckInPending:
        _runPending(EventBookingController.selfCheckInMutation);
        break;
      case _EventSuccessCompanionMutationCaptureMode.firstHelloStartPending:
        _runPending(EventSuccessController.firstHelloStartMutation);
        break;
      case _EventSuccessCompanionMutationCaptureMode.firstHelloCompletePending:
        _runPending(EventSuccessController.firstHelloCompleteMutation);
        break;
      case _EventSuccessCompanionMutationCaptureMode.compatibilityPending:
        _runPending(EventSuccessController.compatibilityResponseMutation);
        break;
      case _EventSuccessCompanionMutationCaptureMode.microPodsOptOutPending:
        _runPending(EventSuccessController.microPodsOptOutMutation);
        break;
      case _EventSuccessCompanionMutationCaptureMode
          .guidedRotationsOptOutPending:
        _runPending(EventSuccessController.guidedRotationsOptOutMutation);
        break;
      case _EventSuccessCompanionMutationCaptureMode.wingmanRequestPending:
        _runPending(EventSuccessController.wingmanRequestMutation);
        break;
      case _EventSuccessCompanionMutationCaptureMode.feedbackPending:
        _runPending(EventSuccessController.feedbackMutation);
        break;
    }
  }

  void _runPending<T>(Mutation<T> mutation) {
    final completer = Completer<T>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

NetworkException _eventSuccessCompanionOfflineException({
  required String action,
}) {
  return obviousOfflineException(
    context: BackendErrorContext(
      service: BackendService.firestore,
      action: action,
      resource: 'eventSuccessCompanion',
    ),
  );
}

final _reviewHistoryEvents = [
  _captureFixtures.captureEvent(
    id: 'event-review-history-dawn',
    club: _dashboardJoinedClub,
    startTime: DateTime(2026, 5, 24, 7),
    endTime: DateTime(2026, 5, 24, 8, 10),
    meetingPoint: 'Carter Road Amphitheatre',
    bookedCount: 18,
    checkedInCount: 16,
    capacityLimit: 22,
    description: 'A completed social run with a warm review.',
  ),
  _captureFixtures.captureEvent(
    id: 'event-review-history-table',
    club: _dashboardHostClub,
    startTime: DateTime(2026, 5, 18, 20),
    endTime: DateTime(2026, 5, 18, 22),
    meetingPoint: 'Pali Village Cafe',
    activityKind: ActivityKind.dinner,
    distanceKm: 0,
    checkedInCount: 12,
    capacityLimit: 16,
    priceInPaise: 120000,
    description: 'A hosted table with structured prompts and warm exits.',
  ),
  _captureFixtures.captureEvent(
    id: 'event-review-history-walk',
    club: _dashboardJoinedClub,
    startTime: DateTime(2026, 5, 11, 8),
    endTime: DateTime(2026, 5, 11, 9),
    meetingPoint: 'Bandra Fort gate',
    activityKind: ActivityKind.walking,
    distanceKm: 3,
    bookedCount: 20,
    checkedInCount: 18,
    capacityLimit: 28,
    description: 'A low-pressure walk with a coffee handoff after.',
  ),
];
final _reviewHistoryReviews = _captureFixtures.reviewsByViewer(
  events: _reviewHistoryEvents,
  reviewerUserId: _captureViewerUid,
  reviewerName: _captureViewer.name,
  firstCreatedAt: DateTime(2026, 5, 25),
);
final _reviewHistoryMissingContextReviews = [
  Review(
    id: 'review-history-missing-event',
    organizerId: _dashboardJoinedClub.id,
    eventId: 'event-review-history-missing',
    reviewerUserId: _captureViewerUid,
    reviewerName: _captureViewer.name,
    rating: 4,
    comment: 'Still worth remembering, even without event context.',
    createdAt: DateTime(2026, 5, 12),
  ),
  Review(
    id: 'review-history-legacy-club',
    organizerId: _dashboardJoinedClub.id,
    reviewerUserId: _captureViewerUid,
    reviewerName: _captureViewer.name,
    rating: 5,
    comment: 'A legacy club review with no event attached.',
    createdAt: DateTime(2026, 5, 5),
  ),
];

List<Object> _reviewsHistoryProviderOverrides({
  AsyncValue<String?> uid = const AsyncData(_captureViewerUid),
  Stream<UserProfile?>? profileStream,
  AsyncValue<List<Review>>? reviews,
  AsyncValue<List<Event>>? events,
}) {
  final effectiveReviews = reviews ?? AsyncData(_reviewHistoryReviews);
  final overrides = <Object>[
    uidProvider.overrideWithValue(uid),
    watchUserProfileProvider.overrideWith(
      (ref) => profileStream ?? Stream.value(_captureViewer),
    ),
  ];
  final viewerUid = switch (uid) {
    AsyncData(:final value) => value,
    _ => null,
  };
  if (viewerUid == null) return overrides;

  overrides.add(
    watchReviewsByUserProvider(viewerUid).overrideWithValue(effectiveReviews),
  );

  final reviewValues = switch (effectiveReviews) {
    AsyncData(:final value) => value,
    _ => null,
  };
  if (reviewValues == null || reviewValues.isEmpty) return overrides;

  final eventIds = ReviewsHistoryState.eventIdsFor(reviewValues);
  if (eventIds.isEmpty) return overrides;

  final effectiveEvents =
      events ??
      AsyncData([
        for (final event in _reviewHistoryEvents)
          if (eventIds.contains(event.id)) event,
      ]);
  overrides.add(
    watchEventsByIdsProvider(
      EventsByIdQuery(eventIds),
    ).overrideWithValue(effectiveEvents),
  );

  return overrides;
}

final _eventRecapEvent = _captureFixtures.captureEvent(
  id: 'event-recap-capture',
  club: _dashboardJoinedClub,
  startTime: DateTime.now().subtract(const Duration(hours: 11)),
  endTime: DateTime.now().subtract(const Duration(hours: 10)),
  meetingPoint: 'Carter Road Amphitheatre',
  bookedCount: 12,
  checkedInCount: 10,
  capacityLimit: 18,
  description: 'A completed run with enough remembered people for recap.',
);
final _eventRecapProfiles = [
  ..._matchesListProfiles,
  ..._captureFixtures.publicProfiles(const [
    'nyc_aisha_williams_005',
    'nyc_marcus_chen_008',
  ]),
];
final _eventRecapParticipations = [
  buildEventParticipation(
    event: _eventRecapEvent,
    uid: _captureViewerUid,
    status: EventParticipationStatus.attended,
    createdAt: DateTime(2026, 5, 30, 7),
  ),
  for (final profile in _eventRecapProfiles)
    buildEventParticipation(
      event: _eventRecapEvent,
      uid: profile.uid,
      status: EventParticipationStatus.attended,
      createdAt: DateTime(2026, 5, 30, 7, 5),
    ),
];
EventRecapViewModel _eventRecapViewModel({
  List<String>? attendeeIds,
  int? checkedInCount,
}) {
  return EventRecapViewModel(
    event: _eventRecapEvent,
    attendeeIds:
        attendeeIds ?? [for (final profile in _eventRecapProfiles) profile.uid],
    checkedInCount: checkedInCount ?? _eventRecapParticipations.length,
  );
}

Map<String, PublicProfile> _eventRecapRosterProfiles({
  Set<String> missingProfileIds = const <String>{},
}) {
  return {
    for (final profile in _eventRecapProfiles)
      if (!missingProfileIds.contains(profile.uid)) profile.uid: profile,
  };
}

List<Object> _eventRecapProviderOverrides({
  AsyncValue<EventRecapViewModel?>? recapValue,
  Map<String, PublicProfile>? rosterProfiles,
  AsyncValue<Map<String, PublicProfile>>? rosterProfilesValue,
}) {
  final resolvedRecapValue =
      recapValue ?? AsyncData<EventRecapViewModel?>(_eventRecapViewModel());
  final attendeeIds = switch (resolvedRecapValue) {
    AsyncData<EventRecapViewModel?>(:final value) =>
      value?.attendeeIds ?? const <String>[],
    _ => const <String>[],
  };

  return <Object>[
    eventRecapViewModelProvider(
      _eventRecapEvent.id,
    ).overrideWith((ref) => resolvedRecapValue),
    publicProfilesByIdsProvider(
      PublicProfilesQuery(attendeeIds),
    ).overrideWithValue(
      rosterProfilesValue ??
          AsyncData(rosterProfiles ?? _eventRecapRosterProfiles()),
    ),
  ];
}

final _activityScreenNotifications = UtilitySurfaceFixtures.notifications;

enum _ActivityMarkAllReadCaptureMode { pending, error }

class _ActivityMarkAllReadCapture extends ConsumerStatefulWidget {
  const _ActivityMarkAllReadCapture({required this.mode});

  final _ActivityMarkAllReadCaptureMode mode;

  @override
  ConsumerState<_ActivityMarkAllReadCapture> createState() =>
      _ActivityMarkAllReadCaptureState();
}

class _ActivityMarkAllReadCaptureState
    extends ConsumerState<_ActivityMarkAllReadCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      ActivityController.markAllReadMutation.reset(ref);
      switch (widget.mode) {
        case _ActivityMarkAllReadCaptureMode.pending:
          _runPending(ActivityController.markAllReadMutation);
          break;
        case _ActivityMarkAllReadCaptureMode.error:
          _runError(ActivityController.markAllReadMutation);
          break;
      }
    });
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation) {
    final error = StateError('Capture mark all read failed');
    unawaited(
      mutation.run(ref, (_) async => throw error).catchError((_) {
        if (!mounted) return;
        showCatchNoticeError(context, error);
      }),
    );
  }

  @override
  Widget build(BuildContext context) => const ActivityScreen();
}

class _ActivityDeepLinkErrorCapture extends StatefulWidget {
  const _ActivityDeepLinkErrorCapture();

  @override
  State<_ActivityDeepLinkErrorCapture> createState() =>
      _ActivityDeepLinkErrorCaptureState();
}

class _ActivityDeepLinkErrorCaptureState
    extends State<_ActivityDeepLinkErrorCapture> {
  bool _shown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _shown) return;
      _shown = true;
      showCatchNoticeError(
        context,
        const ExternalActionException('Could not open this activity update.'),
      );
    });
  }

  @override
  Widget build(BuildContext context) => const ActivityScreen();
}

final _paymentHistoryPayments = UtilitySurfaceFixtures.payments;
final _paymentHistoryEvents = [
  for (var index = 0; index < _paymentHistoryPayments.length; index += 1)
    _paymentHistoryEventFor(_paymentHistoryPayments[index], index),
];

Event _paymentHistoryEventFor(Payment payment, int index) {
  final start = UtilitySurfaceFixtures.now.add(
    Duration(days: index + 2, hours: index),
  );
  return UtilitySurfaceFixtures.event.copyWith(
    id: payment.eventId,
    startTime: start,
    endTime: start.add(const Duration(hours: 1, minutes: 30)),
    priceInPaise: payment.amount,
  );
}

List<Object> _paymentHistoryProviderOverrides({
  AsyncValue<String?> uid = const AsyncData(UtilitySurfaceFixtures.viewerUid),
  AsyncValue<List<Payment>>? payments,
  AsyncValue<List<Event>>? events,
}) {
  final effectivePayments = payments ?? AsyncData(_paymentHistoryPayments);
  final overrides = <Object>[uidProvider.overrideWithValue(uid)];
  final viewerUid = switch (uid) {
    AsyncData(:final value) => value,
    _ => null,
  };
  if (viewerUid == null) return overrides;

  overrides.add(
    watchPaymentsForUserProvider(
      viewerUid,
    ).overrideWithValue(effectivePayments),
  );

  final paymentValues = switch (effectivePayments) {
    AsyncData(:final value) => value,
    _ => null,
  };
  if (paymentValues == null || paymentValues.isEmpty) return overrides;

  final eventIds = {for (final payment in paymentValues) payment.eventId};
  final effectiveEvents =
      events ??
      AsyncData([
        for (final event in _paymentHistoryEvents)
          if (eventIds.contains(event.id)) event,
      ]);
  overrides.add(
    watchEventsByIdsProvider(
      EventsByIdQuery(eventIds),
    ).overrideWithValue(effectiveEvents),
  );

  return overrides;
}

class _PaymentReceiptSheetCapture extends StatelessWidget {
  const _PaymentReceiptSheetCapture({required this.payment});

  final Payment payment;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Align(
        alignment: Alignment.bottomCenter,
        child: PaymentReceiptSheet(
          payment: payment,
          eventTitle: UtilitySurfaceFixtures.eventTitleForPayment(payment),
          onHelp: payment.signUpFailed ? () {} : null,
        ),
      ),
    );
  }
}

class _PaymentSupportNoticeCapture extends StatefulWidget {
  const _PaymentSupportNoticeCapture({required this.payment});

  final Payment payment;

  @override
  State<_PaymentSupportNoticeCapture> createState() =>
      _PaymentSupportNoticeCaptureState();
}

class _PaymentSupportNoticeCaptureState
    extends State<_PaymentSupportNoticeCapture> {
  bool _shown = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _shown) return;
      _shown = true;
      showCatchNotice(
        context,
        'Please contact Catch support for assistance with this booking.',
        tone: CatchNoticeTone.warning,
      );
    });
  }

  @override
  Widget build(BuildContext context) =>
      _PaymentReceiptSheetCapture(payment: widget.payment);
}

final _settingsBlockedUsers = UtilitySurfaceFixtures.blockedUsers;

List<Object> _settingsAccountProviderOverrides({
  Stream<UserProfile?>? profileStream,
  Stream<List<BlockedUser>>? blockedUsersStream,
  List<BlockedUser> blockedUsers = const <BlockedUser>[],
  Map<String, PublicProfile> publicProfiles = const <String, PublicProfile>{},
}) {
  final profileQuery = PublicProfilesQuery(
    blockedUsers.map((blocked) => blocked.uid),
  );
  return <Object>[
    uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
    watchMyHostMembershipsProvider(
      _captureViewerUid,
    ).overrideWith((ref) => Stream.value(const [])),
    watchUserProfileProvider.overrideWith(
      (ref) => profileStream ?? Stream.value(_captureViewer),
    ),
    watchBlockedUsersProvider.overrideWith(
      (ref) => blockedUsersStream ?? Stream.value(blockedUsers),
    ),
    publicProfilesByIdsProvider(
      profileQuery,
    ).overrideWith((ref) async => publicProfiles),
  ];
}

Future<bool> _capturePendingExternalLauncher(Uri uri, {Object? mode}) =>
    Completer<bool>().future;

Future<bool> _captureFailedExternalLauncher(Uri uri, {Object? mode}) async =>
    false;

Future<void> _driveEventLocationDirections(WidgetTester tester) async {
  await tester.tap(find.text('Get directions'));
  await tester.pump();
}

Future<void> _driveSettingsHostApp(WidgetTester tester) async {
  await tester.tap(find.byKey(SettingsKeys.hostAppRow));
  await tester.pump();
}

enum _SettingsMutationCaptureMode {
  preferencePending,
  preferenceError,
  preferenceOffline,
  deletePending,
  deleteError,
  deleteOffline,
  signOutPending,
  signOutError,
  signOutOffline,
  unblockPending,
  unblockError,
  unblockOffline,
}

class _SettingsMutationCapture extends ConsumerStatefulWidget {
  const _SettingsMutationCapture({required this.mode});

  final _SettingsMutationCaptureMode mode;

  @override
  ConsumerState<_SettingsMutationCapture> createState() =>
      _SettingsMutationCaptureState();
}

class _SettingsMutationCaptureState
    extends ConsumerState<_SettingsMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      _resetMutations();
      _seed();
    });
  }

  void _resetMutations() {
    SettingsController.savePreferenceMutation.reset(ref);
    SettingsController.requestAccountDeletionMutation.reset(ref);
    SettingsController.unblockUserMutation.reset(ref);
    AuthSessionController.signOutMutation.reset(ref);
  }

  void _seed() {
    switch (widget.mode) {
      case _SettingsMutationCaptureMode.preferencePending:
        _runPending(SettingsController.savePreferenceMutation);
        break;
      case _SettingsMutationCaptureMode.preferenceError:
        _runError(
          SettingsController.savePreferenceMutation,
          StateError('Capture preference save failed'),
        );
        break;
      case _SettingsMutationCaptureMode.preferenceOffline:
        _runError(
          SettingsController.savePreferenceMutation,
          obviousOfflineException(),
        );
        break;
      case _SettingsMutationCaptureMode.deletePending:
        _runPending(SettingsController.requestAccountDeletionMutation);
        break;
      case _SettingsMutationCaptureMode.deleteError:
        _runError(
          SettingsController.requestAccountDeletionMutation,
          StateError('Capture delete account failed'),
        );
        break;
      case _SettingsMutationCaptureMode.deleteOffline:
        _runError(
          SettingsController.requestAccountDeletionMutation,
          obviousOfflineException(),
        );
        break;
      case _SettingsMutationCaptureMode.signOutPending:
        _runPending(AuthSessionController.signOutMutation);
        break;
      case _SettingsMutationCaptureMode.signOutError:
        _runError(
          AuthSessionController.signOutMutation,
          StateError('Capture sign out failed'),
        );
        break;
      case _SettingsMutationCaptureMode.signOutOffline:
        _runError(
          AuthSessionController.signOutMutation,
          obviousOfflineException(),
        );
        break;
      case _SettingsMutationCaptureMode.unblockPending:
        _runPending(SettingsController.unblockUserMutation);
        break;
      case _SettingsMutationCaptureMode.unblockError:
        _runError(
          SettingsController.unblockUserMutation,
          StateError('Capture unblock failed'),
        );
        break;
      case _SettingsMutationCaptureMode.unblockOffline:
        _runError(
          SettingsController.unblockUserMutation,
          obviousOfflineException(),
        );
        break;
    }
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(mutation.run(ref, (_) async => throw error).catchError((_) {}));
  }

  @override
  Widget build(BuildContext context) => const SettingsScreen();
}

enum _AuthCaptureMode {
  phoneEntry,
  phoneValid,
  otpEntry,
  otpPartial,
  resendReady,
  countryCodeAustralia,
  sendCodePending,
  sendCodeError,
  verifyCodePending,
  verifyCodeError,
  resendPending,
  resendError,
}

class _AuthCapture extends StatelessWidget {
  const _AuthCapture({this.mode = _AuthCaptureMode.phoneEntry});

  final _AuthCaptureMode mode;

  @override
  Widget build(BuildContext context) {
    final initialCode = switch (mode) {
      _AuthCaptureMode.otpPartial => '137',
      _AuthCaptureMode.verifyCodePending ||
      _AuthCaptureMode.verifyCodeError => '137289',
      _ => '',
    };
    final initialPhoneNumber = switch (mode) {
      _AuthCaptureMode.phoneValid ||
      _AuthCaptureMode.sendCodePending ||
      _AuthCaptureMode.sendCodeError => '9876543210',
      _ => '',
    };
    return _AuthCaptureSeeder(
      mode: mode,
      child: AuthScreen(
        appRole: AppRole.host,
        initialPhoneNumber: initialPhoneNumber,
        initialOtpCode: initialCode,
        initialResendSeconds: mode == _AuthCaptureMode.resendReady ? 0 : null,
      ),
    );
  }
}

final _authProviderOverrides = <Object>[
  authRepositoryProvider.overrideWithValue(const _CaptureAuthRepository()),
  authInitialCountryDialCodeProvider.overrideWithValue('+91'),
];

final _authAustraliaProviderOverrides = <Object>[
  authRepositoryProvider.overrideWithValue(const _CaptureAuthRepository()),
  authInitialCountryDialCodeProvider.overrideWithValue('+61'),
];

const _authHostBrandImages = <ImageProvider<Object>>[
  AssetImage(SplashScreen.hostLightIconAsset),
  AssetImage(SplashScreen.hostDarkIconAsset),
  AssetImage('flags/in.png', package: 'country_code_picker'),
  AssetImage('flags/au.png', package: 'country_code_picker'),
];

final _onboardingCaptureProfileNoPhotos = ProfileSurfaceFixtures.viewer
    .copyWith(profileComplete: false, profilePhotos: const []);
final _onboardingCaptureProfileOnePhoto = ProfileSurfaceFixtures.viewer
    .copyWith(
      profileComplete: false,
      profilePhotos: ProfileSurfaceFixtures.viewer.profilePhotos
          .take(1)
          .toList(growable: false),
    );
final _onboardingCaptureProfileReadyPhotos = ProfileSurfaceFixtures.viewer
    .copyWith(
      profileComplete: false,
      profilePhotos: ProfileSurfaceFixtures.viewer.profilePhotos
          .take(2)
          .toList(growable: false),
    );
final _onboardingCaptureProfileNoPrompts = ProfileSurfaceFixtures.viewer
    .copyWith(profileComplete: false, profilePrompts: const []);
final _onboardingCaptureProfilePartialPrompts = ProfileSurfaceFixtures.viewer
    .copyWith(
      profileComplete: false,
      profilePrompts: _onboardingPromptAnswers(
        'A low-pressure loop that ends with a table everyone can hear.',
      ),
    );
final _onboardingCaptureProfileCompletePrompts = ProfileSurfaceFixtures.viewer
    .copyWith(
      profileComplete: false,
      profilePrompts: _onboardingPromptAnswers(
        'A golden-hour 5K, filter coffee, and no rushed exits.',
        'Saturday starts outside, detours through a bookshop, and ends with chaat.',
        'Tell me your favourite route and I will remember the coffee stop.',
      ),
    );
final _onboardingCaptureProfileLongPrompts = ProfileSurfaceFixtures.viewer.copyWith(
  profileComplete: false,
  profilePrompts: _onboardingPromptAnswers(
    'A small group run where everyone knows the route, nobody sprints the '
        'first kilometer, and the table afterward has enough time for real '
        'conversation.',
    'I am happiest when Saturday starts outside, detours through a bookshop, '
        'and ends with friends arguing over where the best chaat actually is.',
    'The green flag is someone who can make an ordinary weekday plan feel '
        'specific, calm, and worth showing up for.',
  ),
);
final _onboardingCaptureDraft = OnboardingDraft(
  step: OnboardingStep.genderInterest.index,
  draftVersion: 2,
  firstName: ProfileSurfaceFixtures.viewer.firstName,
  lastName: ProfileSurfaceFixtures.viewer.lastName,
  dateOfBirth: ProfileSurfaceFixtures.viewer.dateOfBirth,
  phoneNumber: '9876543210',
  gender: ProfileSurfaceFixtures.viewer.gender,
  interestedInGenders: ProfileSurfaceFixtures.viewer.interestedInGenders,
  instagramHandle: ProfileSurfaceFixtures.viewer.instagramHandle,
  profilePrompts: ProfileSurfaceFixtures.viewer.profilePrompts,
);

List<ProfilePromptAnswer> _onboardingPromptAnswers(
  String first, [
  String? second,
  String? third,
]) {
  final answers = <String>[first, ?second, ?third];
  return [
    for (final entry in answers.indexed)
      profilePromptAnswerFor(
        definition: profilePromptDefinition(defaultProfilePromptIds[entry.$1]),
        answer: entry.$2,
      ),
  ];
}

enum _OnboardingCaptureMode {
  routeDefault,
  genderInterest,
  instagram,
  instagramFilled,
  instagramSkipped,
  photos,
  photosUploadFailure,
  saveProfilePending,
  saveProfileError,
  completeRunPrefsPending,
  completeRunPrefsError,
}

class _OnboardingCapture extends StatelessWidget {
  const _OnboardingCapture({
    this.mode = _OnboardingCaptureMode.routeDefault,
    this.profileCompletionOnly = false,
    this.runPreferencesOnly = false,
  });

  final _OnboardingCaptureMode mode;
  final bool profileCompletionOnly;
  final bool runPreferencesOnly;

  @override
  Widget build(BuildContext context) {
    return _OnboardingCaptureSeeder(
      mode: mode,
      child: OnboardingScreen(
        profileCompletionOnly: profileCompletionOnly,
        runPreferencesOnly: runPreferencesOnly,
      ),
    );
  }
}

List<Object> _onboardingProviderOverrides({
  String? uid = ProfileSurfaceFixtures.viewerUid,
  UserProfile? profile,
  OnboardingDraft? draft,
  Set<int> uploadLoadingIndices = const <int>{},
  bool useRealPhotoUploadController = false,
}) {
  final effectiveProfile = uid == null ? null : profile;
  return [
    _captureAnalyticsOverride,
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(effectiveProfile),
    ),
    userProfileRepositoryProvider.overrideWithValue(
      ProfileFixtureUserProfileRepository(profile: effectiveProfile),
    ),
    authRepositoryProvider.overrideWithValue(
      _CaptureAuthRepository(
        currentUser: uid == null
            ? null
            : _CaptureAuthUser(uid: uid, phoneNumber: '+919876543210'),
      ),
    ),
    onboardingDraftRepositoryProvider.overrideWithValue(
      _CaptureOnboardingDraftRepository(draft),
    ),
    if (!useRealPhotoUploadController)
      photoUploadControllerProvider.overrideWithValue(
        PhotoUploadState.fromLegacy(loadingIndices: uploadLoadingIndices),
      ),
  ];
}

List<Object> _onboardingUploadFailureProviderOverrides() {
  return [
    ..._onboardingProviderOverrides(
      profile: _onboardingCaptureProfileOnePhoto,
      useRealPhotoUploadController: true,
    ),
    imageUploadRepositoryProvider.overrideWithValue(
      _CaptureFailingImageUploadRepository(),
    ),
    errorLoggerProvider.overrideWithValue(_CaptureSilentErrorLogger()),
  ];
}

class _OnboardingCaptureSeeder extends ConsumerStatefulWidget {
  const _OnboardingCaptureSeeder({required this.mode, required this.child});

  final _OnboardingCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_OnboardingCaptureSeeder> createState() =>
      _OnboardingCaptureSeederState();
}

class _OnboardingCaptureSeederState
    extends ConsumerState<_OnboardingCaptureSeeder> {
  var _seeded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _seed());
    });
  }

  void _seed() {
    if (!mounted || _seeded) return;
    _seeded = true;
    OnboardingController.saveProfileMutation.reset(ref);
    OnboardingController.completeMutation.reset(ref);
    PhotoUploadController.uploadPhotoMutation.reset(ref);

    final controller = ref.read(onboardingControllerProvider.notifier);
    switch (widget.mode) {
      case _OnboardingCaptureMode.routeDefault:
        break;
      case _OnboardingCaptureMode.genderInterest:
        _seedBookingIdentity(controller);
        controller.goToStep(OnboardingStep.genderInterest);
        break;
      case _OnboardingCaptureMode.instagram:
        _seedBookingIdentity(controller);
        controller.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        controller.goToStep(OnboardingStep.instagram);
        break;
      case _OnboardingCaptureMode.instagramFilled:
        _seedBookingIdentity(controller);
        controller.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        controller.setInstagramHandle('neharuns');
        controller.goToStep(OnboardingStep.instagram);
        break;
      case _OnboardingCaptureMode.instagramSkipped:
        _seedBookingIdentity(controller);
        controller.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        controller.setInstagramHandle(null);
        controller.goToStep(OnboardingStep.instagram);
        break;
      case _OnboardingCaptureMode.photos:
        _seedBookingIdentity(controller);
        controller.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        controller.goToStep(OnboardingStep.photos);
        break;
      case _OnboardingCaptureMode.photosUploadFailure:
        _seedBookingIdentity(controller);
        controller.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        controller.goToStep(OnboardingStep.photos);
        _runAfterNextFrame(_runPhotoUploadFailure);
        break;
      case _OnboardingCaptureMode.saveProfilePending:
        _seedBookingIdentity(controller);
        controller.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        controller.goToStep(OnboardingStep.genderInterest);
        _runAfterNextFrame(
          () => _runPending(OnboardingController.saveProfileMutation),
        );
        break;
      case _OnboardingCaptureMode.saveProfileError:
        _seedBookingIdentity(controller);
        controller.setGenderInterest(
          gender: Gender.woman,
          interestedInGenders: const [Gender.man],
        );
        controller.goToStep(OnboardingStep.genderInterest);
        _runAfterNextFrame(
          () => _runError(
            OnboardingController.saveProfileMutation,
            const NetworkException(
              'capture-onboarding-save-failed',
              'We could not save your profile. Please try again.',
              context: BackendErrorContext(
                service: BackendService.firestore,
                action: 'save onboarding profile',
                resource: 'users',
              ),
            ),
          ),
        );
        break;
      case _OnboardingCaptureMode.completeRunPrefsPending:
        controller.goToStep(OnboardingStep.runningPrefs);
        _runAfterNextFrame(
          () => _runPending(OnboardingController.completeMutation),
        );
        break;
      case _OnboardingCaptureMode.completeRunPrefsError:
        controller.goToStep(OnboardingStep.runningPrefs);
        _runAfterNextFrame(
          () => _runError(
            OnboardingController.completeMutation,
            const NetworkException(
              'capture-onboarding-complete-failed',
              'We could not finish onboarding. Please try again.',
              context: BackendErrorContext(
                service: BackendService.firestore,
                action: 'complete onboarding',
                resource: 'users',
              ),
            ),
          ),
        );
        break;
    }
  }

  void _seedBookingIdentity(OnboardingController controller) {
    controller.setNameDob(
      firstName: 'Neha',
      lastName: 'Kapoor',
      dateOfBirth: DateTime(1996, 4, 12),
      phoneNumber: '9876543210',
      countryCode: '+91',
    );
  }

  void _runAfterNextFrame(VoidCallback callback) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) callback();
    });
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(mutation.run(ref, (_) async => throw error).catchError((_) {}));
  }

  void _runPhotoUploadFailure() {
    unawaited(
      PhotoUploadController.uploadPhotoMutation
          .run(ref, (tx) async {
            await tx
                .get(photoUploadControllerProvider.notifier)
                .pickAndUpload(1);
          })
          .catchError((_) {}),
    );
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

Future<void> _driveOnboardingContinueValidation(WidgetTester tester) async {
  await tester.tap(find.widgetWithText(CatchButton, 'Continue'));
  await tester.pump();
}

Future<void> _driveOnboardingRevealError(WidgetTester tester) async {
  await tester.drag(
    find.byKey(OnboardingStepLayout.scrollBodyKey),
    const Offset(0, -360),
  );
  await pumpFeatureUi(tester);
}

class _AuthCaptureSeeder extends ConsumerStatefulWidget {
  const _AuthCaptureSeeder({required this.mode, required this.child});

  final _AuthCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_AuthCaptureSeeder> createState() => _AuthCaptureSeederState();
}

class _AuthCaptureSeederState extends ConsumerState<_AuthCaptureSeeder> {
  static const _phoneNumber = '9876543210';
  static const _countryCode = '+91';

  var _seeded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => unawaited(_seed()));
  }

  Future<void> _seed() async {
    if (!mounted || _seeded) return;
    _seeded = true;
    AuthController.sendOtpMutation.reset(ref);
    AuthController.verifyOtpMutation.reset(ref);

    switch (widget.mode) {
      case _AuthCaptureMode.phoneEntry:
      case _AuthCaptureMode.phoneValid:
      case _AuthCaptureMode.countryCodeAustralia:
        ref.read(authControllerProvider.notifier).goToStep(AuthStep.phone);
        break;
      case _AuthCaptureMode.otpEntry:
      case _AuthCaptureMode.otpPartial:
      case _AuthCaptureMode.resendReady:
        await _seedOtpStep();
        break;
      case _AuthCaptureMode.sendCodePending:
        ref.read(authControllerProvider.notifier).goToStep(AuthStep.phone);
        _runPending(AuthController.sendOtpMutation);
        break;
      case _AuthCaptureMode.sendCodeError:
        ref.read(authControllerProvider.notifier).goToStep(AuthStep.phone);
        _runError(
          AuthController.sendOtpMutation,
          const NetworkException(
            'capture-send-code-failed',
            'We could not send the code. Check your connection and try again.',
            context: BackendErrorContext(
              service: BackendService.auth,
              action: 'send verification code',
              resource: 'phone_auth',
            ),
          ),
        );
        break;
      case _AuthCaptureMode.verifyCodePending:
        await _seedOtpStep();
        _runPending(AuthController.verifyOtpMutation);
        break;
      case _AuthCaptureMode.verifyCodeError:
        await _seedOtpStep();
        _runError(
          AuthController.verifyOtpMutation,
          const ValidationException(
            'That code is invalid. Please try again.',
            code: 'invalid-verification-code',
            context: BackendErrorContext(
              service: BackendService.auth,
              action: 'verify sms code',
              resource: 'phone_auth',
            ),
          ),
        );
        break;
      case _AuthCaptureMode.resendPending:
        await _seedOtpStep();
        _runPending(AuthController.sendOtpMutation);
        break;
      case _AuthCaptureMode.resendError:
        await _seedOtpStep();
        _runError(
          AuthController.sendOtpMutation,
          const NetworkException(
            'capture-resend-code-failed',
            'We could not resend the code. Please try again.',
            context: BackendErrorContext(
              service: BackendService.auth,
              action: 'resend verification code',
              resource: 'phone_auth',
            ),
          ),
        );
        break;
    }
  }

  Future<void> _seedOtpStep() {
    return ref
        .read(authControllerProvider.notifier)
        .sendOtp(_phoneNumber, _countryCode);
  }

  void _runPending(Mutation<void> mutation) {
    final completer = Completer<void>();
    unawaited(mutation.run(ref, (_) => completer.future));
  }

  void _runError(Mutation<void> mutation, Object error) {
    unawaited(mutation.run(ref, (_) async => throw error).catchError((_) {}));
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

Future<void> _driveAuthPhoneValidationError(WidgetTester tester) async {
  await tester.enterText(
    find.descendant(
      of: find.byKey(AuthFormKeys.phoneField),
      matching: find.byType(EditableText),
    ),
    '123',
  );
  await tester.tap(find.byKey(AuthFormKeys.sendCode));
  await tester.pump();
}

Future<void> _driveAuthCountryPickerOpen(WidgetTester tester) async {
  await tester.tap(find.byKey(AuthFormKeys.countryCode));
  await tester.pump();
  await pumpFeatureUiFor(tester, const Duration(milliseconds: 300));
  expect(find.text('Select Country'), findsOneWidget);
}

Future<void> _cleanupAuthCountryPickerOpen(WidgetTester tester) async {
  final dialogs = find.byType(Dialog).evaluate();
  if (dialogs.isEmpty) return;
  Navigator.of(dialogs.first, rootNavigator: true).pop();
  await pumpFeatureUi(tester);
}

class _CaptureAuthRepository implements AuthRepository {
  const _CaptureAuthRepository({this.currentUser});

  @override
  final User? currentUser;

  @override
  Stream<User?> authStateChanges() => Stream<User?>.value(currentUser);

  @override
  Future<void> verifyPhoneNumber({
    required String phoneNumber,
    int? forceResendingToken,
    required void Function(String verificationId, int? resendToken) codeSent,
    required void Function(AppException e) verificationFailed,
    required void Function(PhoneAuthCredential credential)
    verificationCompleted,
  }) async {
    codeSent('capture-verification-id', null);
  }

  @override
  Future<void> signInWithOtp({
    required String verificationId,
    required String smsCode,
  }) async {}

  @override
  Future<void> signInWithCredential(AuthCredential credential) async {}

  @override
  Future<void> signOut() async {}
}

class _CaptureFirebaseAuth extends Fake implements FirebaseAuth {
  _CaptureFirebaseAuth({required this.currentUser});

  @override
  final User? currentUser;
}

class _CaptureAuthUser extends Fake implements User {
  _CaptureAuthUser({required this.uid, required this.phoneNumber});

  @override
  final String uid;

  @override
  final String? phoneNumber;
}

class _CaptureOnboardingDraftRepository implements OnboardingDraftRepository {
  _CaptureOnboardingDraftRepository([this._draft]);

  OnboardingDraft? _draft;

  @override
  Future<OnboardingDraft?> fetchDraft({required String uid}) async => _draft;

  @override
  Future<void> saveDraft({
    required String uid,
    required OnboardingDraft draft,
  }) async {
    _draft = draft;
  }

  @override
  Future<void> deleteDraft({required String uid}) async {
    _draft = null;
  }
}

class _LaunchAccessSubmitPendingCapture extends ConsumerStatefulWidget {
  const _LaunchAccessSubmitPendingCapture({required this.child});

  final Widget child;

  @override
  ConsumerState<_LaunchAccessSubmitPendingCapture> createState() =>
      _LaunchAccessSubmitPendingCaptureState();
}

class _LaunchAccessSubmitPendingCaptureState
    extends ConsumerState<_LaunchAccessSubmitPendingCapture> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      LaunchAccessController.submitMutation.reset(ref);
      final completer = Completer<void>();
      unawaited(
        LaunchAccessController.submitMutation.run(ref, (_) => completer.future),
      );
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

EventRehearsalBootstrap _eventRehearsalRuntimeCaptureBootstrap() {
  const names = <String>[
    'Jordan Ellis',
    'Sofia Martinez',
    'Ethan Brooks',
    'Aisha Williams',
    'Daniel Kim',
    'Priya Nair',
    'Noah Wilson',
    'Zara Khan',
    'Lucas Chen',
    'Emma Davis',
    'Arjun Mehta',
    'Olivia Moore',
    'Liam Brown',
    'Ananya Rao',
    'Mateo Garcia',
    'Isla Taylor',
    'Kabir Singh',
    'Ava Johnson',
    'Leo Martin',
    'Mia Thompson',
    'Maya Shah',
    'Aarav Patel',
    'Nina Clark',
    'Sam Rivera',
  ];
  final virtualNow = DateTime(2026, 8, 21, 19, 42);
  return EventRehearsalBootstrap(
    session: EventRehearsalSession(
      id: 'capture-rehearsal',
      organizerId: 'capture-club',
      sourceEventId: 'capture-source-event',
      scenario: EventRehearsalScenario.lateAndNoShow,
      seed: 42,
      actorCount: names.length,
      actionCount: 3,
      status: EventRehearsalStatus.running,
      setup: const EventRehearsalSetup(
        title: 'Sunday Morning Singles Mixer',
        locationName: 'Courtyard Room',
        durationMinutes: 120,
        hostGoal: 'Learn the real Host runtime before event day',
        attendeePrompt: 'Meet someone new at your table',
        modules: [
          EventRehearsalModule.arrival,
          EventRehearsalModule.firstHello,
          EventRehearsalModule.pods,
          EventRehearsalModule.rotations,
          EventRehearsalModule.conversationCues,
          EventRehearsalModule.reveal,
        ],
      ),
      setupRevision: 2,
      runtimeRevision: 4,
      activeStepIndex: 1,
      virtualNow: virtualNow,
      fault: EventRehearsalFault.none,
      expiresAt: virtualNow.add(const Duration(hours: 20)),
    ),
    actors: [
      for (final indexed in names.indexed)
        EventRehearsalActor(
          actorId: 'capture-actor-${indexed.$1 + 1}',
          displayName: indexed.$2,
          persona: indexed.$1 == 20 ? 'placementPractice' : 'socialRegular',
          status: switch (indexed.$1) {
            <= 20 => EventRehearsalActorStatus.present,
            21 || 22 => EventRehearsalActorStatus.expected,
            _ => EventRehearsalActorStatus.noShow,
          },
          guestMoment: EventRehearsalGuestMoment.assignment,
          optedOut: false,
          keepApartActorIds: const [],
          helpRequested: false,
          promptCompleted: indexed.$1 < 16,
          layoutUnitId: switch (indexed.$1) {
            12 => 'table-6',
            15 => 'table-5',
            19 => 'table-6',
            20 => 'table-1',
            < 23 => 'table-${(indexed.$1 ~/ 4) + 1}',
            _ => null,
          },
          confirmedLayoutUnitId: indexed.$1 < 20
              ? switch (indexed.$1) {
                  12 => 'table-6',
                  15 => 'table-5',
                  19 => 'table-6',
                  _ => 'table-${(indexed.$1 ~/ 4) + 1}',
                }
              : null,
        ),
    ],
    actions: [
      EventRehearsalActionRecord(
        clientActionId: 'capture-action-1',
        actorId: 'capture-actor-21',
        kind: 'behavior',
        name: 'placementAssigned',
        runtimeRevision: 4,
        virtualNow: virtualNow,
      ),
    ],
    guestUrl: 'https://catchdates.com/rehearse/capture-companion',
    canUseInternalFaults: true,
  );
}

final screenCaptureCatalog = <ScreenCaptureEntry>[
  ScreenCaptureEntry(
    id: 'program_create_draft',
    routeIds: const ['hostCreateProgramScreen'],
    device: CaptureDevice.claudePhone390,
    disableAnimations: true,
    builder: (_) => const _ProgramCreateCaptureFixture(state: 'draft'),
  ),
  ScreenCaptureEntry(
    id: 'program_create_validation',
    routeIds: const ['hostCreateProgramScreen'],
    device: CaptureDevice.claudePhone390,
    disableAnimations: true,
    builder: (_) => const _ProgramCreateCaptureFixture(state: 'validation'),
  ),
  ScreenCaptureEntry(
    id: 'program_create_pending',
    routeIds: const ['hostCreateProgramScreen'],
    device: CaptureDevice.claudePhone390,
    disableAnimations: true,
    builder: (_) => const _ProgramCreateCaptureFixture(state: 'pending'),
  ),
  ScreenCaptureEntry(
    id: 'program_create_failure',
    routeIds: const ['hostCreateProgramScreen'],
    device: CaptureDevice.claudePhone390,
    disableAnimations: true,
    builder: (_) => const _ProgramCreateCaptureFixture(state: 'failure'),
  ),
  ScreenCaptureEntry(
    id: 'program_create_large_text',
    routeIds: const ['hostCreateProgramScreen'],
    device: CaptureDevice.claudePhone390,
    textScale: 2,
    disableAnimations: true,
    builder: (_) => const _ProgramCreateCaptureFixture(state: 'validation'),
  ),
  ScreenCaptureEntry(
    id: 'profile_self',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    precache: <ImageProvider<Object>>[_profileHeroImage],
    builder: (context) =>
        ProfileBody(data: _profileFixture, onReact: (target, comment) {}),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_loading',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileProviderOverrides(
      profileStream: _captureLoadingStream<UserProfile?>(),
    ),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_error',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileProviderOverrides(
      profileStream: _captureErrorStream<UserProfile?>(
        'Capture profile failed',
      ),
    ),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_offline',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileProviderOverrides(
      profileStream: Stream<UserProfile?>.error(
        ProfileSurfaceFixtures.offlineException(action: 'load profile'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_unavailable',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileProviderOverrides(
      profileStream: Stream<UserProfile?>.value(null),
    ),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_edit_tab',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_profilePortraitAssetImage],
    providerOverrides: _selfProfileProviderOverrides(
      profile: _profileSelfReferenceProfile,
    ),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_preview_tab',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_profilePortraitAssetImage],
    providerOverrides: _selfProfileProviderOverrides(
      profile: _profileSelfReferenceProfile,
    ),
    builder: (context) =>
        _selfProfileCapture(initialTab: SelfProfileTab.preview),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_insights_tab',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileProviderOverrides(),
    builder: (context) =>
        _selfProfileCapture(initialTab: SelfProfileTab.insights),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_photo_upload_pending',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileProviderOverrides(
      uploadLoadingIndices: const <int>{1},
    ),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_photo_upload_error',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileUploadFailureProviderOverrides(),
    builder: (context) => const _SelfProfileUploadFailureCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_inline_save_pending',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _editableSelfProfileProviderOverrides(
      _profileInlineSavePendingRepository,
    ),
    builder: (context) => _editableSelfProfileCapture(),
    drive: _driveProfileInlineSavePending,
    cleanup: _cleanupProfileInlineSavePending,
  ),
  ScreenCaptureEntry(
    id: 'profile_self_inline_save_error',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _editableSelfProfileProviderOverrides(
      _profileInlineSaveErrorRepository,
    ),
    builder: (context) => _editableSelfProfileCapture(),
    drive: _driveProfileInlineSaveError,
  ),
  ScreenCaptureEntry(
    id: 'profile_self_text_scale_2',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _selfProfileProviderOverrides(),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_reduced_motion',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _selfProfileProviderOverrides(),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'profile_self_light_dark',
    routeIds: const <String>['profileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _selfProfileProviderOverrides(),
    builder: (context) => _selfProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'start_welcome',
    routeIds: const <String>['startScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [_captureAnalyticsOverride],
    builder: (context) => const OnboardingWelcomeBody(playIntro: false),
  ),
  ScreenCaptureEntry(
    id: 'start_welcome_animated_reel',
    routeIds: const <String>['startScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [_captureAnalyticsOverride],
    builder: (context) => const OnboardingWelcomeBody(),
  ),
  ScreenCaptureEntry(
    id: 'start_welcome_reduced_motion',
    routeIds: const <String>['startScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: [_captureAnalyticsOverride],
    builder: (context) => const OnboardingWelcomeBody(),
  ),
  ScreenCaptureEntry(
    id: 'start_welcome_text_scale_2',
    routeIds: const <String>['startScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: [_captureAnalyticsOverride],
    builder: (context) => const OnboardingWelcomeBody(playIntro: false),
  ),
  ScreenCaptureEntry(
    id: 'auth_phone_entry',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(),
  ),
  ScreenCaptureEntry(
    id: 'auth_phone_valid',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(mode: _AuthCaptureMode.phoneValid),
  ),
  ScreenCaptureEntry(
    id: 'auth_otp_entry',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(mode: _AuthCaptureMode.otpEntry),
  ),
  ScreenCaptureEntry(
    id: 'auth_otp_partial',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(mode: _AuthCaptureMode.otpPartial),
  ),
  ScreenCaptureEntry(
    id: 'auth_resend_ready',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.resendReady),
  ),
  ScreenCaptureEntry(
    id: 'auth_phone_validation_error',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(),
    drive: _driveAuthPhoneValidationError,
  ),
  ScreenCaptureEntry(
    id: 'auth_country_picker_open',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(),
    includeOverlays: true,
    drive: _driveAuthCountryPickerOpen,
    cleanup: _cleanupAuthCountryPickerOpen,
  ),
  ScreenCaptureEntry(
    id: 'auth_country_code_australia',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authAustraliaProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.countryCodeAustralia),
  ),
  ScreenCaptureEntry(
    id: 'auth_send_code_pending',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.sendCodePending),
  ),
  ScreenCaptureEntry(
    id: 'auth_send_code_error',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.sendCodeError),
  ),
  ScreenCaptureEntry(
    id: 'auth_verify_code_pending',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.verifyCodePending),
  ),
  ScreenCaptureEntry(
    id: 'auth_verify_code_error',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.verifyCodeError),
  ),
  ScreenCaptureEntry(
    id: 'auth_resend_pending',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.resendPending),
  ),
  ScreenCaptureEntry(
    id: 'auth_resend_error',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) =>
        const _AuthCapture(mode: _AuthCaptureMode.resendError),
  ),
  ScreenCaptureEntry(
    id: 'auth_phone_text_scale_2',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(),
  ),
  ScreenCaptureEntry(
    id: 'auth_otp_text_scale_2',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(mode: _AuthCaptureMode.otpEntry),
  ),
  ScreenCaptureEntry(
    id: 'auth_otp_reduced_motion',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: _authProviderOverrides,
    precache: _authHostBrandImages,
    builder: (context) => const _AuthCapture(mode: _AuthCaptureMode.otpEntry),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_welcome',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(uid: null),
    builder: (context) => const OnboardingScreen(),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_name_dob',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) => const _OnboardingCapture(),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_name_dob_validation_error',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) => const _OnboardingCapture(),
    drive: _driveOnboardingContinueValidation,
  ),
  ScreenCaptureEntry(
    id: 'onboarding_gender_interest',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) =>
        const _OnboardingCapture(mode: _OnboardingCaptureMode.genderInterest),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_gender_interest_validation_error',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) =>
        const _OnboardingCapture(mode: _OnboardingCaptureMode.genderInterest),
    drive: _driveOnboardingContinueValidation,
  ),
  ScreenCaptureEntry(
    id: 'onboarding_instagram',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) =>
        const _OnboardingCapture(mode: _OnboardingCaptureMode.instagram),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_instagram_filled',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) =>
        const _OnboardingCapture(mode: _OnboardingCaptureMode.instagramFilled),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_instagram_skipped',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) =>
        const _OnboardingCapture(mode: _OnboardingCaptureMode.instagramSkipped),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_photos_gate',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileNoPhotos,
    ),
    builder: (context) => const _OnboardingCapture(profileCompletionOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_photos_one_photo_disabled',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileOnePhoto,
    ),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.photos,
      profileCompletionOnly: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_photos_count_met',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileReadyPhotos,
    ),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.photos,
      profileCompletionOnly: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_photos_upload_pending',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileOnePhoto,
      uploadLoadingIndices: <int>{1},
    ),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.photos,
      profileCompletionOnly: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_photos_upload_failure',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingUploadFailureProviderOverrides(),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.photosUploadFailure,
      profileCompletionOnly: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_prompts_empty',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileNoPrompts,
    ),
    builder: (context) => const _OnboardingCapture(profileCompletionOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_prompts_partial',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfilePartialPrompts,
    ),
    builder: (context) => const _OnboardingCapture(profileCompletionOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_prompts_complete',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileCompletePrompts,
    ),
    builder: (context) => const _OnboardingCapture(profileCompletionOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_prompts_long_answer',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileLongPrompts,
    ),
    builder: (context) => const _OnboardingCapture(profileCompletionOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_running_prefs',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: ProfileSurfaceFixtures.viewer,
    ),
    builder: (context) => const _OnboardingCapture(runPreferencesOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_save_profile_pending',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.saveProfilePending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_save_profile_error',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) =>
        const _OnboardingCapture(mode: _OnboardingCaptureMode.saveProfileError),
    drive: _driveOnboardingRevealError,
  ),
  ScreenCaptureEntry(
    id: 'onboarding_complete_run_prefs_pending',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: ProfileSurfaceFixtures.viewer,
    ),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.completeRunPrefsPending,
      runPreferencesOnly: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_complete_run_prefs_error',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      profile: ProfileSurfaceFixtures.viewer,
    ),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.completeRunPrefsError,
      runPreferencesOnly: true,
    ),
    drive: _driveOnboardingRevealError,
  ),
  ScreenCaptureEntry(
    id: 'onboarding_saved_draft',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _onboardingProviderOverrides(
      draft: _onboardingCaptureDraft,
    ),
    builder: (context) => const _OnboardingCapture(),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_name_dob_text_scale_2',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) => const _OnboardingCapture(),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_photos_text_scale_2',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileOnePhoto,
    ),
    builder: (context) => const _OnboardingCapture(
      mode: _OnboardingCaptureMode.photos,
      profileCompletionOnly: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_prompts_text_scale_2',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _onboardingProviderOverrides(
      profile: _onboardingCaptureProfileLongPrompts,
    ),
    builder: (context) => const _OnboardingCapture(profileCompletionOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_running_prefs_text_scale_2',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _onboardingProviderOverrides(
      profile: ProfileSurfaceFixtures.viewer,
    ),
    builder: (context) => const _OnboardingCapture(runPreferencesOnly: true),
  ),
  ScreenCaptureEntry(
    id: 'onboarding_gender_interest_reduced_motion',
    routeIds: const <String>['onboardingScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: _onboardingProviderOverrides(),
    builder: (context) =>
        const _OnboardingCapture(mode: _OnboardingCaptureMode.genderInterest),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_member',
    routeIds: const <String>[
      'eventDetailScreen',
      'calendarEventDetailScreen',
      'savedEventDetailScreen',
      'dashboardEventDetailScreen',
    ],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_member_ticket',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
      presentationMode: EventDetailPresentationMode.ticket,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_member_spotlight',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
      presentationMode: EventDetailPresentationMode.spotlightDark,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_loading',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: const AsyncLoading<EventDetailViewModel?>(),
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_not_found',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: const AsyncData<EventDetailViewModel?>(null),
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_error',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: AsyncError<EventDetailViewModel?>(
        StateError('Capture event detail load failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_guest',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: AsyncData(
        _eventDetailCaptureViewModel(isAuthenticated: false, isSaved: false),
      ),
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_host_app',
    routeIds: const <String>['hostAppEventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: AsyncData(
        _eventDetailCaptureViewModel(
          userProfile: _eventDetailHostUser,
          isHost: true,
          isSaved: false,
        ),
      ),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: EventDetailScreen(
        enableMapNetworkTiles: false,
        clubId: _eventDetailEvent.clubId,
        eventId: _eventDetailEvent.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_offline',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: AsyncError<EventDetailViewModel?>(
        StateError('No network connection for Event Detail'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_text_scale_2',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_reduced_motion',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_signed_up',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewerParticipation: _eventDetailSignedUpParticipation,
      includeCompanionPlan: true,
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailEvent.clubId,
      eventId: _eventDetailEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_pending',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => const _EventDetailBookingMutationCapture(
      mode: _EventDetailBookingMutationCaptureMode.bookPending,
    ),
    cleanup: _cleanupEventDetailBookingMutationPending,
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_success_snackbar',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => const _EventDetailBookingMutationCapture(
      mode: _EventDetailBookingMutationCaptureMode.bookSuccess,
    ),
    cleanup: _cleanupEventDetailBookingMutationState,
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_failure',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => const _EventDetailBookingMutationCapture(
      mode: _EventDetailBookingMutationCaptureMode.bookError,
    ),
    cleanup: _cleanupEventDetailBookingMutationState,
  ),
  ScreenCaptureEntry(
    id: 'event_detail_cancel_pending',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewerParticipation: _eventDetailSignedUpParticipation,
    ),
    builder: (context) => const _EventDetailBookingMutationCapture(
      mode: _EventDetailBookingMutationCaptureMode.cancelPending,
    ),
    cleanup: _cleanupEventDetailBookingMutationPending,
  ),
  ScreenCaptureEntry(
    id: 'event_detail_cancel_success_snackbar',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewerParticipation: _eventDetailSignedUpParticipation,
    ),
    builder: (context) => const _EventDetailBookingMutationCapture(
      mode: _EventDetailBookingMutationCaptureMode.cancelSuccess,
    ),
    cleanup: _cleanupEventDetailBookingMutationState,
  ),
  ScreenCaptureEntry(
    id: 'event_detail_cancel_failure',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewerParticipation: _eventDetailSignedUpParticipation,
    ),
    builder: (context) => const _EventDetailBookingMutationCapture(
      mode: _EventDetailBookingMutationCaptureMode.cancelError,
    ),
    cleanup: _cleanupEventDetailBookingMutationState,
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_waitlist',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      event: _eventDetailWaitlistEvent,
      viewerParticipation: _eventDetailWaitlistedParticipation,
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailWaitlistEvent.clubId,
      eventId: _eventDetailWaitlistEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_waitlist_offer',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      event: _eventDetailWaitlistOfferEvent,
      viewerParticipation: _eventDetailWaitlistOfferParticipation,
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailWaitlistOfferEvent.clubId,
      eventId: _eventDetailWaitlistOfferEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_full',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      event: _eventDetailFullEvent,
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailFullEvent.clubId,
      eventId: _eventDetailFullEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_attended',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      event: _eventDetailAttendedEvent,
      viewerParticipation: _eventDetailAttendedParticipation,
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailAttendedEvent.clubId,
      eventId: _eventDetailAttendedEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_past',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      event: _eventDetailPastEvent,
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailPastEvent.clubId,
      eventId: _eventDetailPastEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_detail_booking_cancelled',
    routeIds: const <String>['eventDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      event: _eventDetailCancelledEvent,
    ),
    builder: (context) => EventDetailScreen(
      enableMapNetworkTiles: false,
      clubId: _eventDetailCancelledEvent.clubId,
      eventId: _eventDetailCancelledEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_loading',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      signedUpEventsStream: _captureLoadingStream<List<Event>>(),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_profile_error',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      profileStream: _captureErrorStream<UserProfile?>(
        'Capture dashboard profile failed',
      ),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_offline',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      profileStream: Stream<UserProfile?>.error(
        _dashboardOfflineException(action: 'load dashboard'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_memberships_error',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      membershipsStream: _captureErrorStream<List<ClubMembership>>(
        'Capture dashboard memberships failed',
      ),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_booked_events_error',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      signedUpEventsStream: _captureErrorStream<List<Event>>(
        'Capture dashboard booked events failed',
      ),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_empty_start',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      memberships: const [],
      signedUpEvents: const [],
      recommendations:
          const AsyncData<List<ExploreEventRecommendationCandidate>>([]),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_recommendations_loading',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      recommendations:
          const AsyncLoading<List<ExploreEventRecommendationCandidate>>(),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_recommendations_error',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      recommendations: AsyncError<List<ExploreEventRecommendationCandidate>>(
        StateError('Capture dashboard recommendations failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_self_check_in',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      signedUpEvents: [_dashboardCheckInEvent],
      attendedEvents: const AsyncData<List<Event>>([]),
      recommendations:
          const AsyncData<List<ExploreEventRecommendationCandidate>>([]),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_self_check_in_pending',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      signedUpEvents: [_dashboardCheckInEvent],
      attendedEvents: const AsyncData<List<Event>>([]),
      recommendations:
          const AsyncData<List<ExploreEventRecommendationCandidate>>([]),
    ),
    builder: (context) => const _DashboardCheckInMutationCapture(
      mode: _DashboardCheckInMutationMode.pending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_self_check_in_error',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      signedUpEvents: [_dashboardCheckInEvent],
      attendedEvents: const AsyncData<List<Event>>([]),
      recommendations:
          const AsyncData<List<ExploreEventRecommendationCandidate>>([]),
    ),
    builder: (context) => const _DashboardCheckInMutationCapture(
      mode: _DashboardCheckInMutationMode.error,
    ),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_after_event_focus',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _dashboardProviderOverrides(
      attendedEvents: AsyncData([_dashboardAfterEventFocusEvent]),
      reviews: const AsyncData<List<Review>>([]),
      recommendations:
          const AsyncData<List<ExploreEventRecommendationCandidate>>([]),
    ),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_text_scale_2',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _dashboardProviderOverrides(),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'dashboard_home_reduced_motion',
    routeIds: const <String>['dashboardScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _dashboardProviderOverrides(),
    builder: (context) => const DashboardScreen(),
  ),
  ScreenCaptureEntry(
    id: 'host_home_dashboard',
    routeIds: const <String>['hostHomeScreen', 'hostTodayScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>[
      'hostMarketingIndia.host.todayDashboard',
    ],
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostOperationsProviderOverrides(
        hostedClubs: [_marketingHostClub],
        ownedClubs: [_marketingHostClub],
        clubEvents: {
          _marketingHostClub.id: AsyncData<List<Event>>([
            _marketingHostTodayEvent,
          ]),
        },
      ),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/today',
      activeIndex: 0,
      child: HostTodayScreen(
        initialOrganizerId: _marketingHostClub.id,
        now: hostMarketingIndiaScenario.clock('today'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_today_focus',
    routeIds: const <String>['hostTodayFocusScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      uidProvider.overrideWithValue(
        const AsyncData<String?>(HostOperationsFixtures.hostUid),
      ),
      hostOperableClubsProvider(
        HostOperationsFixtures.hostUid,
      ).overrideWithValue(AsyncData([_hostEventsReferenceClub])),
      hostTodayFeedControllerProvider.overrideWith2(
        (_) => _CaptureHostTodayFeedController(const {}),
      ),
      hostTodayPreferenceProvider.overrideWith(
        (ref, scope) async => const HostTodayPreference.unanswered(),
      ),
    ],
    builder: (context) =>
        HostTodayFocusScreen(organizerId: _hostEventsReferenceClub.id),
    drive: (tester) async {
      expect(find.byType(HostTodayFocusScreen), findsOneWidget);
      for (final focus in HostTodayFocus.values) {
        expect(
          find.byKey(ValueKey('host-today-focus-${focus.name}')),
          findsOneWidget,
        );
      }
    },
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_list',
    routeIds: const <String>['hostEventsScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostOperationsProviderOverrides(
        programRows: [
          OrganizerProgramListRow(
            programId: 'reference-program',
            title: 'Wedding weekend',
            kind: 'wedding',
            status: 'draft',
            timezone: 'Asia/Kolkata',
            revision: 1,
            startsAt: _hostEventsReferenceNow,
            endsAt: _hostEventsReferenceNow.add(const Duration(days: 3)),
            functionCount: 3,
          ),
        ],
        hostedClubs: [_hostEventsReferenceClub],
        ownedClubs: [_hostEventsReferenceClub],
        clubEvents: {
          _hostEventsReferenceClub.id: AsyncData<List<Event>>(
            _hostEventsReferenceEvents,
          ),
        },
      ),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/events',
      activeIndex: 1,
      child: HostEventsScreen(
        initialOrganizerId: _hostEventsReferenceClub.id,
        now: _hostEventsReferenceNow,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_past',
    routeIds: const <String>['hostEventsScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostOperationsProviderOverrides(
        programRows: [
          OrganizerProgramListRow(
            programId: 'reference-program',
            title: 'Wedding weekend',
            kind: 'wedding',
            status: 'draft',
            timezone: 'Asia/Kolkata',
            revision: 1,
            startsAt: _hostEventsReferenceNow,
            endsAt: _hostEventsReferenceNow.add(const Duration(days: 3)),
            functionCount: 3,
          ),
        ],
        hostedClubs: [_hostEventsReferenceClub],
        ownedClubs: [_hostEventsReferenceClub],
        clubEvents: {
          _hostEventsReferenceClub.id: AsyncData<List<Event>>(
            _hostEventsReferenceEvents,
          ),
        },
      ),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/events',
      activeIndex: 1,
      child: HostEventsScreen(
        initialOrganizerId: _hostEventsReferenceClub.id,
        now: _hostEventsReferenceNow,
      ),
    ),
    drive: (tester) async {
      await tester.tap(find.text('Past'));
      await pumpFeatureUi(tester);
    },
  ),
  ScreenCaptureEntry(
    id: 'host_home_switcher_cohost',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubs: HostOperationsFixtures.clubs,
      ownedClubs: [
        HostOperationsFixtures.primaryClub,
        HostOperationsFixtures.dinnerClub,
      ],
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(initialOrganizerId: 'design-host-cohost-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_long_club_names',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubs: [_hostHomeLongNameOwnerClub, _hostHomeLongNameCoHostedClub],
      ownedClubs: [_hostHomeLongNameOwnerClub],
      clubEvents: {
        _hostHomeLongNameOwnerClub.id: AsyncData<List<Event>>([
          _hostHomeLongNameEvent,
        ]),
        _hostHomeLongNameCoHostedClub.id: const AsyncData<List<Event>>([]),
      },
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(initialOrganizerId: _hostHomeLongNameOwnerClub.id),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_signed_out',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData<String?>(null)),
    ],
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_clubs_loading',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubsAsync: const AsyncLoading<List<Club>>(),
      ownedClubsAsync: const AsyncLoading<List<Club>>(),
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_clubs_error',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubsAsync: AsyncError<List<Club>>(
        StateError('Capture host home clubs failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_clubs_offline',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubsAsync: AsyncError<List<Club>>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_empty_clubs',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubs: const <Club>[],
      ownedClubs: const <Club>[],
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_loading',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      clubEvents: {
        HostOperationsFixtures.primaryClub.id:
            const AsyncLoading<List<Event>>(),
      },
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_error',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      clubEvents: {
        HostOperationsFixtures.primaryClub.id: AsyncError<List<Event>>(
          StateError('Capture host home events failed'),
          StackTrace.empty,
        ),
      },
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_offline',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      clubEvents: {
        HostOperationsFixtures.dinnerClub.id: AsyncError<List<Event>>(
          obviousOfflineException(),
          StackTrace.empty,
        ),
      },
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(initialOrganizerId: 'design-host-table-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_cohost_empty_events',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubs: [HostOperationsFixtures.coHostedClub],
      ownedClubs: const <Club>[],
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(initialOrganizerId: 'design-host-cohost-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_text_scale_2',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_reduced_motion',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_light_dark',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_management',
    routeIds: const <String>['hostOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    precache: _hostMediaCaptureImages,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostOperationsProviderOverrides(
        hostedClubs: [_hostMediaReviewClub],
        ownedClubs: [_hostMediaReviewClub],
      ),
    ],
    builder: (context) => const _HostRoutedShellCapture(
      initialLocation: '/host/organizer',
      activeIndex: 4,
      child: HostClubsScreen(initialClubId: 'design-host-table-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_organizer_media_summary',
    routeIds: const <String>['hostOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    precache: _hostMediaCaptureImages,
    builder: (context) => Scaffold(
      body: SafeArea(
        child: CatchPageBody(
          child: CatchSection.fieldRows(
            title: context.l10n.hostsHostClubProfileTitleMedia,
            count: context.l10n.coreOrderedPhotoPickerSubtitlePhotoCount(
              count: 4,
            ),
            trailing: CatchButton.text(
              label: context.l10n.hostsHostClubEditTabActionManageImages,
              onPressed: () {},
              padding: EdgeInsets.zero,
            ),
            child: Padding(
              padding: CatchInsets.fieldSectionChildTop,
              child: HostClubMediaRail(
                logoImageBytes: _profilePortraitBytes,
                logoImageUrl: null,
                photos: [
                  OrderedPhotoPreview(
                    id: 'summary-cover',
                    bytes: _clubHeroPortraitBytes,
                  ),
                  OrderedPhotoPreview(
                    id: 'summary-gallery-one',
                    bytes: _profilePortraitBytes,
                  ),
                  OrderedPhotoPreview(
                    id: 'summary-gallery-two',
                    bytes: _clubHeroPortraitBytes,
                  ),
                ],
                logoBadgeLabel: context.l10n.hostsHostClubEditTabBadgeLogo,
                addPhotosLabel: context
                    .l10n
                    .hostsCreateClubPhotosPickerVisiblecopyAddPhotos,
                onManageMedia: () {},
              ),
            ),
          ),
        ),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_signed_out',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData<String?>(null)),
    ],
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_loading',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubsAsync: const AsyncLoading<List<Club>>(),
      ownedClubsAsync: const AsyncLoading<List<Club>>(),
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_error',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      ownedClubsAsync: AsyncError<List<Club>>(
        StateError('Capture host clubs failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_offline',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      ownedClubsAsync: AsyncError<List<Club>>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_empty',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubs: const <Club>[],
      ownedClubs: const <Club>[],
    ),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_cohost_edit',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubs: [HostOperationsFixtures.coHostedClub],
      ownedClubs: const <Club>[],
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubsScreen(initialClubId: 'design-host-cohost-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_inline_edit_pending',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.inlinePending,
      child: _AppRoleCapture(
        role: AppRole.host,
        child: HostClubsScreen(initialExpandedEditField: 'name'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_inline_edit_error',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.inlineError,
      child: _AppRoleCapture(
        role: AppRole.host,
        child: HostClubsScreen(initialExpandedEditField: 'name'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_inline_edit_offline',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.inlineOffline,
      child: _AppRoleCapture(
        role: AppRole.host,
        child: HostClubsScreen(initialExpandedEditField: 'name'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_report',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubsScreen(
        initialClubId: 'design-host-sea-face',
        initialTab: HostClubTab.insights,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_loading',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      analyticsRepository: const _CaptureLoadingAnalyticsRepository(),
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubsScreen(
        initialClubId: 'design-host-sea-face',
        initialTab: HostClubTab.insights,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_error',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      analyticsRepository: HostFixtureAnalyticsRepository(
        error: StateError('Capture host analytics failed'),
      ),
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubsScreen(
        initialClubId: 'design-host-sea-face',
        initialTab: HostClubTab.insights,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_offline',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      analyticsRepository: HostFixtureAnalyticsRepository(
        error: obviousOfflineException(),
      ),
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubsScreen(
        initialClubId: 'design-host-sea-face',
        initialTab: HostClubTab.insights,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_preview_tab',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubsScreen(initialTab: HostClubTab.preview),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_loading',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: const AsyncLoading<HostPaymentAccount?>(),
    ),
    builder: (context) => _hostPayoutCardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_ready',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: const AsyncData<HostPaymentAccount?>(
        HostOperationsFixtures.readyPaymentAccount,
      ),
    ),
    builder: (context) => _hostPayoutCardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_restricted',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: const AsyncData<HostPaymentAccount?>(
        HostOperationsFixtures.restrictedPaymentAccount,
      ),
    ),
    builder: (context) => _hostPayoutCardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_error',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: AsyncError<HostPaymentAccount?>(
        StateError('Capture payout status failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostPayoutCardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_offline',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: AsyncError<HostPaymentAccount?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostPayoutCardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_setup_pending',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.payoutSetupPending,
      child: _hostPayoutCardCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_setup_error',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.payoutSetupError,
      child: _hostPayoutCardCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_setup_offline',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.payoutSetupOffline,
      child: _hostPayoutCardCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_refresh_pending',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: const AsyncData<HostPaymentAccount?>(
        HostOperationsFixtures.readyPaymentAccount,
      ),
    ),
    builder: (context) => _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.payoutRefreshPending,
      child: _hostPayoutCardCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_refresh_error',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: const AsyncData<HostPaymentAccount?>(
        HostOperationsFixtures.readyPaymentAccount,
      ),
    ),
    builder: (context) => _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.payoutRefreshError,
      child: _hostPayoutCardCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_refresh_offline',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(
      paymentAccountValue: const AsyncData<HostPaymentAccount?>(
        HostOperationsFixtures.readyPaymentAccount,
      ),
    ),
    builder: (context) => _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.payoutRefreshOffline,
      child: _hostPayoutCardCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_team_pending',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.teamPending,
      child: _HostTeamSectionCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_team_error',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.teamError,
      child: _HostTeamSectionCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_team_offline',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _HostClubsMutationCapture(
      mode: _HostClubsMutationCaptureMode.teamOffline,
      child: _HostTeamSectionCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_text_scale_2',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_reduced_motion',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_light_dark',
    routeIds: const <String>['hostClubsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) =>
        const _AppRoleCapture(role: AppRole.host, child: HostClubsScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_active_profile',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_text_scale_2',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_reduced_motion',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_fallback_profile',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostProfile: const AsyncData<HostProfile?>(null),
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_clubs_loading',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubsAsync: const AsyncLoading<List<Club>>(),
      ownedClubsAsync: const AsyncLoading<List<Club>>(),
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_clubs_error',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubsAsync: AsyncError<List<Club>>(
        StateError('Capture hosted clubs failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_clubs_offline',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(
      hostedClubsAsync: AsyncError<List<Club>>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_inline_profile_edit',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_save_profile_pending',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: _HostProfileMutationCapture(
        mode: _HostProfileMutationCaptureMode.savePending,
        child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_save_profile_error',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: _HostProfileMutationCapture(
        mode: _HostProfileMutationCaptureMode.saveError,
        child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_save_profile_offline',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: _HostProfileMutationCapture(
        mode: _HostProfileMutationCaptureMode.saveOffline,
        child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_sign_out_error',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: _HostProfileMutationCapture(
        mode: _HostProfileMutationCaptureMode.signOutError,
        child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_sign_out_offline',
    routeIds: const <String>['hostClubTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOperationsProviderOverrides(),
    builder: (context) => const _AppRoleCapture(
      role: AppRole.host,
      child: _HostProfileMutationCapture(
        mode: _HostProfileMutationCaptureMode.signOutOffline,
        child: HostClubTeamScreen(clubId: 'design-host-sea-face'),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_member',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      membership: _captureMembership(
        clubId: _clubDetailClub.id,
        uid: _captureViewerUid,
      ),
      viewModel: AsyncData(_clubDetailViewModel()),
    ),
    builder: (context) => _clubDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_visitor',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      viewModel: AsyncData(_clubDetailViewModel(isMember: false)),
    ),
    builder: (context) => _clubDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_guest',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      uid: null,
      viewModel: AsyncData(
        _clubDetailViewModel(
          uid: null,
          isMember: false,
          isAuthenticated: false,
          includeUserProfile: false,
        ),
      ),
    ),
    builder: (context) => _clubDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_host_public',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      uid: _clubDetailClub.ownerOrPrimaryHostUserId,
      membership: _captureMembership(
        clubId: _clubDetailClub.id,
        uid: _clubDetailClub.ownerOrPrimaryHostUserId ?? 'host-mira',
        role: ClubMembershipRole.owner,
      ),
      viewModel: AsyncData(
        _clubDetailViewModel(
          uid: _clubDetailClub.ownerOrPrimaryHostUserId,
          isHost: true,
        ),
      ),
    ),
    builder: (context) =>
        _AppRoleCapture(role: AppRole.host, child: _clubDetailScreenCapture()),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_loading',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      viewModel: const AsyncLoading<ClubDetailViewModel?>(),
    ),
    builder: (context) => _clubDetailScreenCapture(includeInitialClub: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_initial_loading',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      membership: _captureMembership(
        clubId: _clubDetailClub.id,
        uid: _captureViewerUid,
      ),
      viewModel: const AsyncLoading<ClubDetailViewModel?>(),
    ),
    builder: (context) => _clubDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_empty_schedule',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      membership: _captureMembership(
        clubId: _clubDetailClub.id,
        uid: _captureViewerUid,
      ),
      viewModel: AsyncData(
        _clubDetailViewModel(upcomingEvents: const <Event>[]),
      ),
    ),
    builder: (context) => _clubDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_public',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_initial_loading',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(
      viewModel: const AsyncLoading<ClubDetailViewModel?>(),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_loading',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostClubDetailProviderOverrides(
      viewModel: const AsyncLoading<ClubDetailViewModel?>(),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(clubId: _hostClubDetailReferenceClub.id),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_error',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostClubDetailProviderOverrides(
      viewModel: AsyncError<ClubDetailViewModel?>(
        StateError('Capture host club detail failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(clubId: _hostClubDetailReferenceClub.id),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_offline',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostClubDetailProviderOverrides(
      viewModel: AsyncError<ClubDetailViewModel?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(clubId: _hostClubDetailReferenceClub.id),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_not_found',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostClubDetailProviderOverrides(
      viewModel: const AsyncData<ClubDetailViewModel?>(null),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(clubId: _hostClubDetailReferenceClub.id),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_signed_out',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(
      uid: null,
      viewModel: AsyncData<ClubDetailViewModel?>(
        _hostClubDetailViewModel(uid: null, isHost: false),
      ),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_non_host_preview',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(
      uid: 'design-host-non-team',
      viewModel: AsyncData<ClubDetailViewModel?>(
        _hostClubDetailViewModel(uid: 'design-host-non-team', isHost: false),
      ),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_empty_schedule',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(
      viewModel: AsyncData<ClubDetailViewModel?>(
        _hostClubDetailViewModel(upcomingEvents: const <Event>[]),
      ),
    ),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_text_scale_2',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_reduced_motion',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_light_dark',
    routeIds: const <String>['hostClubDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_clubHeroPortraitAssetImage],
    providerOverrides: _hostClubDetailProviderOverrides(),
    builder: (context) => _AppRoleCapture(
      role: AppRole.host,
      child: ClubDetailScreen(
        clubId: _hostClubDetailReferenceClub.id,
        initialClub: _hostClubDetailReferenceClub,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_missing',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      viewModel: const AsyncData<ClubDetailViewModel?>(null),
    ),
    builder: (context) => _clubDetailScreenCapture(includeInitialClub: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_error',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      viewModel: AsyncError<ClubDetailViewModel?>(
        StateError('Capture club detail load failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _clubDetailScreenCapture(includeInitialClub: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_join_pending',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => _clubDetailMutationCapture(
      isMember: false,
      isAuthenticated: true,
      isMutating: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_mutation_error',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => _clubDetailMutationCapture(
      isMember: false,
      isAuthenticated: true,
      mutationError: StateError('Could not join this club.'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_offline',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _clubDetailProviderOverrides(
      viewModel: AsyncError<ClubDetailViewModel?>(
        StateError('No network connection for Club Detail'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _clubDetailScreenCapture(includeInitialClub: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_text_scale_2',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _clubDetailProviderOverrides(
      membership: _captureMembership(
        clubId: _clubDetailClub.id,
        uid: _captureViewerUid,
      ),
      viewModel: AsyncData(_clubDetailViewModel()),
    ),
    builder: (context) => _clubDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_reduced_motion',
    routeIds: const <String>['clubDetailScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _clubDetailProviderOverrides(
      membership: _captureMembership(
        clubId: _clubDetailClub.id,
        uid: _captureViewerUid,
      ),
      viewModel: AsyncData(_clubDetailViewModel()),
    ),
    builder: (context) => _clubDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'calendar_planned_events',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_uid_missing',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(
      uid: const AsyncData<String?>(null),
    ),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_loading',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(
      signedUpEvents: const AsyncLoading<List<Event>>(),
    ),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_events_error',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(
      signedUpEvents: AsyncError<List<Event>>(
        StateError('Capture Calendar events failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_empty',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(
      signedUpEvents: const AsyncData<List<Event>>([]),
      savedEvents: const AsyncData<List<Event>>([]),
    ),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_club_names_loading',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(
      clubNames: const AsyncLoading<Map<String, String>>(),
    ),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_club_names_error',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(
      clubNames: AsyncError<Map<String, String>>(
        StateError('Capture Calendar club names failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_expanded_month',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(),
    builder: (context) =>
        CalendarScreen(referenceNow: _captureNow, initialExpanded: true),
  ),
  ScreenCaptureEntry(
    id: 'calendar_selected_day',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(),
    builder: (context) => CalendarScreen(
      referenceNow: _captureNow,
      initialSelectedDate: _dashboardSavedEvents.first.startTime,
    ),
  ),
  ScreenCaptureEntry(
    id: 'calendar_text_scale_2',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _calendarProviderOverrides(),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_reduced_motion',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _calendarProviderOverrides(),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_light_dark',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_list',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_uid_missing',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      uid: const AsyncData<String?>(null),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_loading',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      savedEvents: const AsyncLoading<List<Event>>(),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_error',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      savedEvents: AsyncError<List<Event>>(
        StateError('Capture Saved Events stream failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_empty',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      savedEvents: const AsyncData<List<Event>>([]),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_club_names_loading',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      clubNames: const AsyncLoading<Map<String, String>>(),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_club_names_error',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      clubNames: AsyncError<Map<String, String>>(
        StateError('Capture Saved Events club names failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_past_only',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      savedEvents: AsyncData<List<Event>>(_savedEventsPastOnlyEvents),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_text_scale_2',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _savedEventsProviderOverrides(),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_light_dark',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'filters_preferences',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _filtersProviderOverrides(),
    builder: (context) => const FiltersScreen(),
  ),
  ScreenCaptureEntry(
    id: 'filters_loading',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _filtersProviderOverrides(
      profileStream: ProfileSurfaceFixtures.loadingStream<UserProfile?>(),
    ),
    builder: (context) => const FiltersScreen(),
  ),
  ScreenCaptureEntry(
    id: 'filters_profile_error',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _filtersProviderOverrides(
      profileStream: ProfileSurfaceFixtures.errorStream<UserProfile?>(
        'Filters profile failed',
      ),
    ),
    builder: (context) => const FiltersScreen(),
  ),
  ScreenCaptureEntry(
    id: 'filters_missing_profile',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _filtersProviderOverrides(
      profileStream: Stream<UserProfile?>.value(null),
    ),
    builder: (context) => const FiltersScreen(),
  ),
  ScreenCaptureEntry(
    id: 'filters_dirty_edit',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const _FiltersBodyCapture(
      ageRange: RangeValues(20, 60),
      interestedIn: {Gender.woman, Gender.nonBinary},
    ),
  ),
  ScreenCaptureEntry(
    id: 'filters_reset_restored',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => _FiltersBodyCapture(
      ageRange: filtersAgeRangeValues(_filtersCaptureProfile),
      interestedIn: _filtersCaptureProfile.interestedInGenders.toSet(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'filters_save_pending',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const _FiltersBodyCapture(
      ageRange: RangeValues(25, 34),
      interestedIn: {Gender.man, Gender.woman},
      saving: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'filters_save_error',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _filtersProviderOverrides(),
    builder: (context) =>
        const _FiltersSaveErrorCapture(child: FiltersScreen()),
  ),
  ScreenCaptureEntry(
    id: 'filters_text_scale_2',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _filtersProviderOverrides(),
    builder: (context) => const FiltersScreen(),
  ),
  ScreenCaptureEntry(
    id: 'filters_reduced_motion',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: _filtersProviderOverrides(),
    builder: (context) => const FiltersScreen(),
  ),
  ScreenCaptureEntry(
    id: 'filters_light_dark',
    routeIds: const <String>['filtersScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _filtersProviderOverrides(),
    builder: (context) => const FiltersScreen(),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_loading',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: const AsyncLoading<EventDetailViewModel?>(),
    ),
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_error',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: AsyncError<EventDetailViewModel?>(
        StateError('Capture event location map load failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_not_found',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      viewModel: const AsyncData<EventDetailViewModel?>(null),
    ),
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_no_coordinate',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventDetailCaptureProviderOverrides(
      event: _eventDetailNoCoordinateEvent,
    ),
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailNoCoordinateEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_directions_pending',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      ..._eventDetailCaptureProviderOverrides(),
      externalUrlLauncherProvider.overrideWithValue(
        _capturePendingExternalLauncher,
      ),
    ],
    drive: _driveEventLocationDirections,
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_directions_failure',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    includeOverlays: true,
    providerOverrides: [
      ..._eventDetailCaptureProviderOverrides(),
      externalUrlLauncherProvider.overrideWithValue(
        _captureFailedExternalLauncher,
      ),
    ],
    drive: _driveEventLocationDirections,
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_text_scale_2',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_location_map_reduced_motion',
    routeIds: const <String>['eventLocationMapScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: _eventDetailCaptureProviderOverrides(),
    builder: (context) => EventLocationMapRouteScreen(
      eventId: _eventDetailEvent.id,
      enableNetworkTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'member_event_discovery',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    marketingFixtureKeys: const <String>['salesDemo.member.eventDiscovery'],
    providerOverrides: [
      cityListProvider.overrideWith((ref) async => _memberDiscoveryCities),
      selectedExploreCityProvider.overrideWithValue(
        _memberDiscoveryCities.first,
      ),
      deviceLocationProvider.overrideWith(_CaptureDeviceLocation.new),
      exploreDiscoveryReferenceNowProvider.overrideWithValue(
        DateTime(2026, 6, 11, 10),
      ),
      uidProvider.overrideWith((ref) => Stream.value(null)),
      watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
      exploreSourceClubsProvider.overrideWithValue(
        AsyncData(_memberDiscoveryClubs),
      ),
      exploreClubsViewModelProvider.overrideWithValue(
        AsyncData(
          ExploreViewModel.partition(
            clubs: _memberDiscoveryClubs,
            joinedClubIds: const <String>{},
          ),
        ),
      ),
      exploreFeedViewModelProvider.overrideWithValue(
        AsyncData(
          ExploreFeedViewModel(
            items: [_memberDiscoveryItems.first],
            featuredEventId: _memberDiscoveryItems.first.event.id,
            dateSupplyCounts: {
              ExploreTimeFilter.tonight: 1,
              ExploreTimeFilter.tomorrow: 1,
              ExploreTimeFilter.dayTwo: 1,
              ExploreTimeFilter.dayThree: 0,
              ExploreTimeFilter.dayFour: 1,
              ExploreTimeFilter.dayFive: 0,
              ExploreTimeFilter.daySix: 1,
              ExploreTimeFilter.anytime: _memberDiscoveryItems.length,
            },
          ),
        ),
      ),
    ],
    builder: (context) => const ExploreScreen(),
  ),
  ScreenCaptureEntry(
    id: 'explore_cover_contrast_floor',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const Align(
      alignment: Alignment.topCenter,
      child: SizedBox(
        width: double.infinity,
        height: CatchLayout.exploreDiscoveryCoverHeight,
        child: FeaturedEventPoster(
          activityKind: ActivityKind.walking,
          kicker: 'Bright activity backdrop',
          title: 'Thursday Evening Walk',
          body: 'A deliberately pale activity glow behind the complete story.',
          cta: 'View and book',
          data: '7:30 PM · Free',
          data2: '18 going · 4 left',
        ),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'explore_joined_clubs',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      joinedClubIds: {_memberDiscoveryClubs.first.id},
    ),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_cross_paths_person',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      crossPathsSuggestions: [_exploreCrossPathsSuggestion],
    ),
    drive: _driveExploreToCrossPaths,
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_cross_paths_profile_preview',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => Scaffold(
      body: Align(
        alignment: Alignment.bottomCenter,
        child: CrossPathsProfilePreviewSheet(
          suggestion: _exploreCrossPathsSuggestion,
          event: _memberDiscoveryItems[2].event,
          onEventSelected: () {},
        ),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'explore_loading',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      sourceClubs: const AsyncLoading<List<Club>>(),
      viewModel: const AsyncLoading<ExploreViewModel>(),
      feed: const AsyncLoading<ExploreFeedViewModel>(),
    ),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_club_source_error',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      sourceClubs: AsyncError<List<Club>>(
        StateError('Capture Explore clubs failed'),
        StackTrace.empty,
      ),
      viewModel: AsyncError<ExploreViewModel>(
        StateError('Capture Explore clubs failed'),
        StackTrace.empty,
      ),
      feed: const AsyncLoading<ExploreFeedViewModel>(),
    ),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_feed_error',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      feed: AsyncError<ExploreFeedViewModel>(
        StateError('Capture Explore feed failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_empty_city',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      sourceClubs: const AsyncData<List<Club>>([]),
      viewModel: const AsyncData(
        ExploreViewModel(joinedClubs: [], allClubs: []),
      ),
      feed: const AsyncData(ExploreFeedViewModel(items: [])),
    ),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_no_search_results',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      viewModel: const AsyncData(
        ExploreViewModel(joinedClubs: [], allClubs: []),
      ),
      feed: const AsyncData(ExploreFeedViewModel(items: [])),
    ),
    builder: (context) =>
        _exploreCapture(searchQuery: 'supperclub marathoners worli'),
  ),
  ScreenCaptureEntry(
    id: 'explore_no_filter_results',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      viewModel: const AsyncData(
        ExploreViewModel(joinedClubs: [], allClubs: []),
      ),
      feed: const AsyncData(ExploreFeedViewModel(items: [])),
    ),
    builder: (context) => _exploreCapture(
      seedFilters: const _ExploreCaptureFilterSeed(
        time: ExploreTimeFilter.weekend,
        distance: ExploreDistanceFilter.tenKm,
        activity: ActivityKind.padel,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'explore_offline',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      sourceClubs: AsyncError<List<Club>>(
        _exploreOfflineException(action: 'load source clubs'),
        StackTrace.empty,
      ),
      viewModel: AsyncError<ExploreViewModel>(
        _exploreOfflineException(action: 'load Explore'),
        StackTrace.empty,
      ),
      feed: AsyncError<ExploreFeedViewModel>(
        _exploreOfflineException(action: 'load Explore events'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_search_query',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(),
    builder: (context) => _exploreCapture(searchQuery: 'pickleball'),
  ),
  ScreenCaptureEntry(
    id: 'explore_filters_active',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(),
    builder: (context) => _exploreCapture(
      seedFilters: const _ExploreCaptureFilterSeed(
        time: ExploreTimeFilter.weekend,
        distance: ExploreDistanceFilter.threeKm,
        activity: ActivityKind.pickleball,
        highRatedOnly: true,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'explore_unclaimed_host_projection',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _exploreProviderOverrides(
      sourceClubs: AsyncData<List<Club>>([_unclaimedDiscoveryClub]),
      viewModel: AsyncData(
        ExploreViewModel.partition(
          clubs: [_unclaimedDiscoveryClub],
          joinedClubIds: const <String>{},
        ),
      ),
      feed: AsyncData(ExploreFeedViewModel(items: _unclaimedDiscoveryItems)),
    ),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_text_scale_2',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _exploreProviderOverrides(),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_reduced_motion',
    routeIds: const <String>['exploreScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _exploreProviderOverrides(),
    builder: (context) => _exploreCapture(),
  ),
  ScreenCaptureEntry(
    id: 'explore_map',
    routeIds: const <String>['exploreMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      deviceLocationProvider.overrideWith(_CaptureDeviceLocation.new),
      exploreFeedViewModelProvider.overrideWithValue(
        AsyncData(ExploreFeedViewModel(items: _memberDiscoveryItems)),
      ),
    ],
    builder: (context) => const ExploreMapScreen(enableNetworkTiles: false),
  ),
  ScreenCaptureEntry(
    id: 'explore_map_selected_pin',
    routeIds: const <String>['exploreMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _exploreProviderOverrides(),
    builder: (context) => _exploreCapture(
      child: ExploreMapScreen(
        enableNetworkTiles: false,
        initialSelectedEventId: _memberDiscoveryEvents.first.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'explore_map_distance_ring',
    routeIds: const <String>['exploreMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _exploreProviderOverrides(
      deviceLocationBuilder: _CaptureBandraDeviceLocation.new,
    ),
    builder: (context) => _exploreCapture(
      seedFilters: const _ExploreCaptureFilterSeed(
        distance: ExploreDistanceFilter.threeKm,
      ),
      child: const ExploreMapScreen(enableNetworkTiles: false),
    ),
  ),
  ScreenCaptureEntry(
    id: 'explore_map_loading',
    routeIds: const <String>['exploreMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _exploreProviderOverrides(
      feed: const AsyncLoading<ExploreFeedViewModel>(),
    ),
    builder: (context) => _exploreCapture(
      child: const ExploreMapScreen(enableNetworkTiles: false),
    ),
  ),
  ScreenCaptureEntry(
    id: 'explore_map_error',
    routeIds: const <String>['exploreMapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _exploreProviderOverrides(
      feed: AsyncError<ExploreFeedViewModel>(
        StateError('Capture Explore map feed failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _exploreCapture(
      child: const ExploreMapScreen(enableNetworkTiles: false),
    ),
  ),
  ScreenCaptureEntry(
    id: 'create_club_basics',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => const CreateClubScreen(restoreSavedDraft: false),
  ),
  ScreenCaptureEntry(
    id: 'create_club_basics_validation',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(showValidation: true),
  ),
  ScreenCaptureEntry(
    id: 'create_club_picked_media',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    precache: _hostMediaCaptureImages,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) =>
        _createClubCapture(useDraft: true, usePickedMedia: true),
  ),
  ScreenCaptureEntry(
    id: 'host_media_gallery_manager',
    routeIds: const <String>['hostCreateClubScreen', 'hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    precache: _hostMediaCaptureImages,
    builder: (context) => OrderedPhotoManagerScreen(
      photos: _createHostMediaManagerPhotos(),
      onAddPhotos: () {},
      onRemovePhoto: (_) {},
      onReorderPhoto: (_, _) {},
      onRetryPhoto: (_) {},
      canAdd: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'create_club_draft_restored',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(useDraft: true),
  ),
  ScreenCaptureEntry(
    id: 'create_club_details',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(initialStep: 1, useDraft: true),
  ),
  ScreenCaptureEntry(
    id: 'create_club_host_defaults',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(initialStep: 2, useDraft: true),
  ),
  ScreenCaptureEntry(
    id: 'create_club_event_success_defaults',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(initialStep: 3, useDraft: true),
  ),
  ScreenCaptureEntry(
    id: 'create_club_save_draft_pending',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _HostCreateClubMutationCapture(
      mode: _HostCreateClubMutationCaptureMode.saveDraftPending,
      child: _createClubCapture(useDraft: true),
    ),
  ),
  ScreenCaptureEntry(
    id: 'create_club_save_draft_error',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _HostCreateClubMutationCapture(
      mode: _HostCreateClubMutationCaptureMode.saveDraftError,
      child: _createClubCapture(useDraft: true),
    ),
  ),
  ScreenCaptureEntry(
    id: 'create_club_submit_pending',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _HostCreateClubMutationCapture(
      mode: _HostCreateClubMutationCaptureMode.submitPending,
      child: _createClubCapture(initialStep: 3, useDraft: true),
    ),
  ),
  ScreenCaptureEntry(
    id: 'create_club_submit_error',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _HostCreateClubMutationCapture(
      mode: _HostCreateClubMutationCaptureMode.submitError,
      child: _createClubCapture(initialStep: 3, useDraft: true),
    ),
  ),
  ScreenCaptureEntry(
    id: 'create_club_submit_offline',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _HostCreateClubMutationCapture(
      mode: _HostCreateClubMutationCaptureMode.submitOffline,
      child: _createClubCapture(initialStep: 3, useDraft: true),
    ),
  ),
  ScreenCaptureEntry(
    id: 'create_club_text_scale_2',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(initialStep: 1, useDraft: true),
  ),
  ScreenCaptureEntry(
    id: 'create_club_reduced_motion',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(initialStep: 2, useDraft: true),
  ),
  ScreenCaptureEntry(
    id: 'create_club_light_dark',
    routeIds: const <String>['hostCreateClubScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateClubProviderOverrides(),
    builder: (context) => _createClubCapture(initialStep: 3, useDraft: true),
  ),
  ScreenCaptureEntry(
    id: 'host_create_route_loading',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      clubValue: const AsyncLoading<Club?>(),
    ),
    builder: (context) =>
        HostCreateEventRouteScreen(clubId: _dashboardHostClub.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_route_error',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      clubValue: AsyncError<Club?>(
        StateError('Capture Host Create Event club failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        HostCreateEventRouteScreen(clubId: _dashboardHostClub.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_route_offline',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      clubValue: AsyncError<Club?>(obviousOfflineException(), StackTrace.empty),
    ),
    builder: (context) =>
        HostCreateEventRouteScreen(clubId: _dashboardHostClub.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_not_found',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      clubValue: const AsyncData<Club?>(null),
    ),
    builder: (context) =>
        HostCreateEventRouteScreen(clubId: _dashboardHostClub.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_unauthorized',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      uid: HostOperationsFixtures.guestUid,
    ),
    builder: (context) => HostCreateEventRouteScreen(
      clubId: _dashboardHostClub.id,
      initialClub: _dashboardHostClub,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_initial_club_extra',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      uid:
          _dashboardHostClub.ownerOrPrimaryHostUserId ??
          HostOperationsFixtures.hostUid,
      clubValue: const AsyncLoading<Club?>(),
    ),
    builder: (context) => HostCreateEventRouteScreen(
      clubId: _dashboardHostClub.id,
      initialClub: _dashboardHostClub,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_basics_validation',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) =>
        _createEventCapture(useDraft: false, showValidation: true),
  ),
  ScreenCaptureEntry(
    id: 'host_create_custom_activity',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) =>
        _createEventCapture(draft: _hostEventCustomActivityDraft),
  ),
  ScreenCaptureEntry(
    id: 'host_create_event_photos',
    drive: (tester) =>
        _driveCreateDisclosure(tester, 'host.create_event.presentation'),
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    precache: _hostMediaCaptureImages,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _createEventCapture(usePickedMedia: true),
  ),
  ScreenCaptureEntry(
    id: 'host_create_location_selected',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _createEventCapture(initialStep: 1),
  ),
  ScreenCaptureEntry(
    id: 'host_create_draft_picker',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      drafts: [_hostEventSetupDraft],
    ),
    builder: (context) => _createEventCapture(useDraft: false),
  ),
  ScreenCaptureEntry(
    id: 'host_create_draft_restored',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _createEventCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_create_draft_delete_confirmation',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _InlineDialogCapture(
      dialog: CatchDialog<bool>.confirmation(
        title: draftDeleteConfirmationDialogTitle(context.l10n),
        message: draftDeleteConfirmationDialogMessage(
          context.l10n,
          _hostEventSetupDraft,
        ),
        actions: draftDeleteConfirmationDialogActions(context.l10n),
      ),
      child: HostEventEntrySheet(
        state: HostEventEntryState.resolve(
          organizerId: _hostEventSetupDraft.clubId,
          drafts: [_hostEventSetupDraft],
        ),
        onDeleteDraft: (_) async {},
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_unsaved_changes_dialog',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _InlineDialogCapture(
      dialog: CatchDialog<HostDraftExitDecision>.confirmation(
        title: context.l10n.hostsDraftExitTitle,
        message: context.l10n.hostsDraftExitMessage,
        actions: hostDraftExitDialogActions(context.l10n),
      ),
      child: _createEventCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_save_draft_pending',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _HostCreateEventMutationCapture(
      mode: _HostCreateEventMutationCaptureMode.saveDraftPending,
      child: _createEventCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_save_draft_error',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _HostCreateEventMutationCapture(
      mode: _HostCreateEventMutationCaptureMode.saveDraftError,
      child: _createEventCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_save_draft_offline',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _HostCreateEventMutationCapture(
      mode: _HostCreateEventMutationCaptureMode.saveDraftOffline,
      child: _createEventCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_submit_pending',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _HostCreateEventMutationCapture(
      mode: _HostCreateEventMutationCaptureMode.submitPending,
      child: _createEventCapture(initialStep: 2),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_submit_error',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _HostCreateEventMutationCapture(
      mode: _HostCreateEventMutationCaptureMode.submitError,
      child: _createEventCapture(initialStep: 2),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_submit_offline',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _HostCreateEventMutationCapture(
      mode: _HostCreateEventMutationCaptureMode.submitOffline,
      child: _createEventCapture(initialStep: 2),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_photo_upload_offline',
    drive: (tester) =>
        _driveCreateDisclosure(tester, 'host.create_event.presentation'),
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _HostCreateEventMutationCapture(
      mode: _HostCreateEventMutationCaptureMode.submitOffline,
      child: _createEventCapture(usePickedMedia: true),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_success_manage',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ..._hostCreateEventProviderOverrides(),
      celebrationEffectsControllerProvider.overrideWithValue(
        _NoopCelebrationEffectsController(),
      ),
    ],
    builder: (context) => CreateEventSuccessScreen(
      club: _hostCreateSuccessReferenceClub,
      event: _hostCreateSuccessReferenceEvent,
      eventDisplayName: 'Sundowner 5K, Bandra seafront',
      onManageEvent: () {},
      onDone: () {},
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_event_setup',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>['hostMarketingIndia.host.eventSetup'],
    drive: (tester) async {
      await tester.tap(find.widgetWithText(CatchButton, 'Review event'));
      await pumpFeatureUi(tester);
      expect(find.text('Needs information'), findsNothing);
    },
    providerOverrides: _hostCreateEventProviderOverrides(
      club: _marketingHostClub,
    ),
    builder: (context) => CreateEventScreen(
      club: _marketingHostClub,
      initialDraft: _marketingHostSetupDraft,
      initialStep: 2,
      loadMapTiles: false,
      now: () => hostMarketingIndiaScenario.clock('planning'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_runtime_basics',
    routeIds: const ['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _createEventCapture(draft: _hostRuntimeSetupDraft),
  ),
  ScreenCaptureEntry(
    id: 'host_create_runtime_schedule',
    routeIds: const ['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) =>
        _createEventCapture(draft: _hostRuntimeSetupDraft, initialStep: 1),
  ),
  ScreenCaptureEntry(
    id: 'host_create_runtime_guests',
    routeIds: const ['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) =>
        _createEventCapture(draft: _hostRuntimeSetupDraft, initialStep: 2),
  ),
  ScreenCaptureEntry(
    id: 'host_create_runtime_review',
    routeIds: const ['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    drive: (tester) async {
      await tester.tap(find.widgetWithText(CatchButton, 'Review event'));
      await pumpFeatureUi(tester);
    },
    builder: (context) =>
        _createEventCapture(draft: _hostRuntimeSetupDraft, initialStep: 2),
  ),
  ScreenCaptureEntry(
    id: 'host_create_runtime_customize',
    routeIds: const ['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    drive: (tester) =>
        _driveCreateDisclosure(tester, 'host.create_event.customize_guide'),
    builder: (context) =>
        _createEventCapture(draft: _hostRuntimeSetupDraft, initialStep: 2),
  ),
  ScreenCaptureEntry(
    id: 'host_create_basics',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>[
      'hostMarketingIndia.host.createBasics',
    ],
    providerOverrides: _hostCreateEventProviderOverrides(
      club: _marketingHostClub,
    ),
    builder: (context) => CreateEventScreen(
      club: _marketingHostClub,
      initialDraft: _marketingHostSetupDraft,
      loadMapTiles: false,
      now: () => hostMarketingIndiaScenario.clock('planning'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_location',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>[
      'hostMarketingIndia.host.createLocation',
    ],
    drive: (tester) => tester.ensureVisible(find.byType(WhereStep)),
    providerOverrides: _hostCreateEventProviderOverrides(
      club: _marketingHostClub,
    ),
    builder: (context) => CreateEventScreen(
      club: _marketingHostClub,
      initialDraft: _marketingHostSetupDraft,
      initialStep: 1,
      loadMapTiles: false,
      now: () => hostMarketingIndiaScenario.clock('planning'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_map_picker_offline',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => LocationPickerScreen(
      countryIsoCode: 'IN',
      initialCenter: const LocationCoordinate(19.076, 72.8777),
      initialSearchQuery: 'Bandra Social',
      initialSearchError: obviousOfflineException(),
      usePlatformMapView: false,
      loadMapTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_schedule',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>[
      'hostMarketingIndia.host.createSchedule',
    ],
    providerOverrides: _hostCreateEventProviderOverrides(
      club: _marketingHostClub,
    ),
    builder: (context) => CreateEventScreen(
      club: _marketingHostClub,
      initialDraft: _marketingHostSetupDraft,
      initialStep: 1,
      loadMapTiles: false,
      now: () => hostMarketingIndiaScenario.clock('planning'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_schedule_validation',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) =>
        _createEventCapture(draft: _hostEventPastScheduleDraft, initialStep: 1),
  ),
  ScreenCaptureEntry(
    id: 'host_create_policy',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>[
      'hostMarketingIndia.host.createPolicy',
    ],
    providerOverrides: _hostCreateEventProviderOverrides(
      club: _marketingHostClub,
    ),
    builder: (context) => CreateEventScreen(
      club: _marketingHostClub,
      initialDraft: _marketingHostSetupDraft,
      initialStep: 2,
      loadMapTiles: false,
      now: () => hostMarketingIndiaScenario.clock('planning'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_policy_age_validation',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _createEventCapture(
      draft: _hostEventPolicyAgeValidationDraft,
      initialStep: 2,
      showValidation: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_policy_invite_only',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) =>
        _createEventCapture(draft: _hostEventInviteOnlyDraft, initialStep: 2),
  ),
  ScreenCaptureEntry(
    id: 'host_create_policy_cohort_caps',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) =>
        _createEventCapture(draft: _hostEventCohortCapsDraft, initialStep: 2),
  ),
  ScreenCaptureEntry(
    id: 'host_create_policy_dynamic_pricing_disabled',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _createEventCapture(
      draft: _hostEventDynamicPricingDisabledDraft,
      initialStep: 2,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_policy_dynamic_pricing_validation',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => _createEventCapture(
      draft: _hostEventDynamicPricingValidationDraft,
      initialStep: 2,
      showValidation: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_guide',
    drive: (tester) async {
      await _driveCreateDisclosure(tester, 'host.create_event.customize_guide');
      expect(find.text('Trivia social'), findsOneWidget);
      expect(find.textContaining('A team-based format'), findsNothing);
    },
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>['hostMarketingIndia.host.createGuide'],
    providerOverrides: _hostCreateEventProviderOverrides(
      club: _marketingHostClub,
    ),
    builder: (context) => CreateEventScreen(
      club: _marketingHostClub,
      initialDraft: _marketingHostSetupDraft,
      initialStep: 2,
      loadMapTiles: false,
      now: () => hostMarketingIndiaScenario.clock('planning'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_guide_question_pack',
    drive: (tester) =>
        _driveCreateDisclosure(tester, 'host.create_event.customize_guide'),
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => CreateEventScreen(
      club: _dashboardHostClub,
      initialDraft: _hostEventGuideDraft,
      initialStep: 2,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_text_scale_2',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => CreateEventScreen(
      club: _dashboardHostClub,
      initialDraft: _hostEventSetupDraft,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_reduced_motion',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => CreateEventScreen(
      club: _dashboardHostClub,
      initialDraft: _hostEventSetupDraft,
      initialStep: 1,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_light_dark',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(),
    builder: (context) => CreateEventScreen(
      club: _dashboardHostClub,
      initialDraft: _hostEventSetupDraft,
      initialStep: 2,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_route_loading',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      clubValue: const AsyncLoading<Club?>(),
      eventValue: const AsyncLoading<Event?>(),
    ),
    builder: (context) => EditHostedEventRouteScreen(
      clubId: _dashboardHostClub.id,
      eventId: _dashboardEditableHostEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_route_error',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      clubValue: AsyncError<Club?>(
        StateError('Capture Host Edit Event club failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EditHostedEventRouteScreen(
      clubId: _dashboardHostClub.id,
      eventId: _dashboardEditableHostEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_offline',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      clubValue: AsyncError<Club?>(obviousOfflineException(), StackTrace.empty),
    ),
    builder: (context) => EditHostedEventRouteScreen(
      clubId: _dashboardHostClub.id,
      eventId: _dashboardEditableHostEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_not_found',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      eventValue: const AsyncData<Event?>(null),
    ),
    builder: (context) => EditHostedEventRouteScreen(
      clubId: _dashboardHostClub.id,
      eventId: _dashboardEditableHostEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_unauthorized',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      uid: HostOperationsFixtures.guestUid,
    ),
    builder: (context) => EditHostedEventRouteScreen(
      clubId: _dashboardHostClub.id,
      eventId: _dashboardEditableHostEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_schedule_locked',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardScheduleLockedHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardScheduleLockedHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
    drive: _verifyScheduleLockedCapture,
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_cancelled',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardCancelledHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardCancelledHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_private_access_loading',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardPrivateAccessHostEvent,
      privateAccessValue: const AsyncLoading<EventPrivateAccess?>(),
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardPrivateAccessHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_validation_error',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardValidationHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardValidationHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
      formAutovalidateMode: AutovalidateMode.always,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_location_selected',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardPinnedLocationHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardPinnedLocationHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_submit_pending',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardEditableHostEvent,
    ),
    builder: (context) => _HostEditEventMutationCapture(
      mode: _HostEditEventMutationCaptureMode.submitPending,
      child: EditHostedEventScreen(
        club: _dashboardHostClub,
        event: _dashboardEditableHostEvent,
        loadMapTiles: false,
        now: () => _captureNow,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_submit_error',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardEditableHostEvent,
    ),
    builder: (context) => _HostEditEventMutationCapture(
      mode: _HostEditEventMutationCaptureMode.submitError,
      child: EditHostedEventScreen(
        club: _dashboardHostClub,
        event: _dashboardEditableHostEvent,
        loadMapTiles: false,
        now: () => _captureNow,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_text_scale_2',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardEditableHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardEditableHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_reduced_motion',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardEditableHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardEditableHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_light_dark',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardEditableHostEvent,
    ),
    builder: (context) => EditHostedEventScreen(
      club: _dashboardHostClub,
      event: _dashboardEditableHostEvent,
      loadMapTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_event_rehearsal_runtime_room',
    routeIds: const <String>['hostEventRehearsalScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: [
      eventRehearsalProvider('capture-rehearsal').overrideWith(
        (ref) => Stream.value(_eventRehearsalRuntimeCaptureBootstrap()),
      ),
    ],
    builder: (context) => const HostEventRehearsalScreen(
      clubId: 'capture-club',
      sessionId: 'capture-rehearsal',
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_event_rehearsal_practice_tools',
    routeIds: const <String>['hostEventRehearsalScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    includeOverlays: true,
    providerOverrides: [
      eventRehearsalProvider('capture-rehearsal').overrideWith(
        (ref) => Stream.value(_eventRehearsalRuntimeCaptureBootstrap()),
      ),
    ],
    builder: (context) => const HostEventRehearsalScreen(
      clubId: 'capture-club',
      sessionId: 'capture-rehearsal',
    ),
    drive: (tester) async {
      await tester.tap(find.byIcon(CatchIcons.more));
      await pumpFeatureUi(tester);
    },
  ),
  ScreenCaptureEntry(
    id: 'host_manage_route_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      clubValue: const AsyncLoading<Club?>(),
      eventValue: const AsyncLoading<Event?>(),
    ),
    builder: (context) => _hostManageRouteCapture(includeInitialEvent: false),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_initial_event_extra',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      eventValue: const AsyncLoading<Event?>(),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_route_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      clubValue: AsyncError<Club?>(
        StateError('Capture Host Manage club failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(includeInitialEvent: false),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_route_offline',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      clubValue: AsyncError<Club?>(obviousOfflineException(), StackTrace.empty),
    ),
    builder: (context) => _hostManageRouteCapture(includeInitialEvent: false),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_not_found',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      eventValue: const AsyncData<Event?>(null),
    ),
    builder: (context) => _hostManageRouteCapture(includeInitialEvent: false),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_unauthorized',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      uid: HostOperationsFixtures.guestUid,
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendance_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      attendanceValue: const AsyncLoading<AttendanceSheetViewModel?>(),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendance_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      attendanceValue: AsyncError<AttendanceSheetViewModel?>(
        StateError('Capture Host Manage attendance failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendance_empty',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      attendanceValue: const AsyncData<AttendanceSheetViewModel?>(null),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendee_profiles_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      attendeeProfilesValue:
          const AsyncLoading<Map<String, (String, String?)>>(),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendee_profiles_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      attendeeProfilesValue: AsyncError<Map<String, (String, String?)>>(
        StateError('Capture Host Manage profile lookup failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_filtered_roster_empty',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _hostManageRouteCapture(
      initialParticipantSearchQuery: 'no matching guest',
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_private_access_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      privateAccessValue: const AsyncLoading<EventPrivateAccess?>(),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_private_access_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      privateAccessValue: AsyncError<EventPrivateAccess?>(
        StateError('Capture Host Manage private access failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_private_access_offline',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      privateAccessValue: AsyncError<EventPrivateAccess?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_private_access_missing_code',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      privateAccessValue: AsyncData<EventPrivateAccess?>(
        HostOperationsFixtures.privateAccess.copyWith(inviteCode: ''),
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_links_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      inviteLinksValue: const AsyncLoading<List<EventInviteLink>>(),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_links_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      inviteLinksValue: AsyncError<List<EventInviteLink>>(
        StateError('Capture Host Manage invite links failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_links_offline',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      inviteLinksValue: AsyncError<List<EventInviteLink>>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_links_empty',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      inviteLinksValue: const AsyncData<List<EventInviteLink>>(
        <EventInviteLink>[],
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_links_disabled',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      inviteLinksValue: AsyncData<List<EventInviteLink>>(
        _hostManageDisabledInviteLinks,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_links_long_label_source',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      inviteLinksValue: AsyncData<List<EventInviteLink>>(
        _hostManageLongLabelInviteLinks,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_link_mutation_pending',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManageInviteLinkMutationCapture(
      mode: _HostManageInviteLinkMutationCaptureMode.pending,
      child: _hostManageRouteCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_invite_link_mutation_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManageInviteLinkMutationCapture(
      mode: _HostManageInviteLinkMutationCaptureMode.error,
      child: _hostManageRouteCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_private_link_share_pending',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManagePrivateLinkShareMutationCapture(
      mode: _HostManagePrivateLinkShareMutationCaptureMode.pending,
      child: _hostManageRouteCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_private_link_share_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManagePrivateLinkShareMutationCapture(
      mode: _HostManagePrivateLinkShareMutationCaptureMode.error,
      child: _hostManageRouteCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_edit_event_action',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_cancel_event_pending',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManageActionMutationCapture(
      mode: _HostManageActionMutationCaptureMode.cancelPending,
      child: _hostManageRouteCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_cancel_event_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManageActionMutationCapture(
      mode: _HostManageActionMutationCaptureMode.cancelError,
      child: _hostManageRouteCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_delete_event_pending',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      event: HostOperationsFixtures.unusedEvent,
      participations: const <EventParticipation>[],
    ),
    builder: (context) => _HostManageActionMutationCapture(
      mode: _HostManageActionMutationCaptureMode.deletePending,
      child: _hostManageRouteCapture(event: HostOperationsFixtures.unusedEvent),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_delete_event_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      event: HostOperationsFixtures.unusedEvent,
      participations: const <EventParticipation>[],
    ),
    builder: (context) => _HostManageActionMutationCapture(
      mode: _HostManageActionMutationCaptureMode.deleteError,
      child: _hostManageRouteCapture(event: HostOperationsFixtures.unusedEvent),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_cancelled_event',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      event: HostOperationsFixtures.cancelledEvent,
    ),
    builder: (context) =>
        _hostManageRouteCapture(event: HostOperationsFixtures.cancelledEvent),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_text_scale_2',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _hostManageRouteCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_reduced_motion',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) =>
        _hostManageRouteCapture(initialSection: HostEventManageSection.live),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_light_dark',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) =>
        _hostManageRouteCapture(initialSection: HostEventManageSection.report),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_report_export_pending',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManageReportExportMutationCapture(
      mode: _HostManageReportExportMutationCaptureMode.pending,
      child: _hostManageRouteCapture(
        initialSection: HostEventManageSection.report,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_report_export_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(),
    builder: (context) => _HostManageReportExportMutationCapture(
      mode: _HostManageReportExportMutationCaptureMode.error,
      child: _hostManageRouteCapture(
        initialSection: HostEventManageSection.report,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_setup_private_access',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      uid: _captureViewerUid,
      club: _hostManageReferenceClub,
      event: _hostManageReferenceEvent,
      participations: _hostManageReferenceParticipations,
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _hostManageReferenceClub,
      event: _hostManageReferenceEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_full_waitlist_apron',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      uid: _captureViewerUid,
      club: _hostManageReferenceClub,
      event: _hostManageFullReferenceEvent,
      participations: _hostManageFullReferenceParticipations,
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _hostManageReferenceClub,
      event: _hostManageFullReferenceEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendance_mutation_pending',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageLiveWindowProviderOverrides(),
    builder: (context) => _HostManageAttendanceMutationCapture(
      mode: _HostManageAttendanceMutationCaptureMode.pending,
      child: HostEventManageScreen(
        club: _dashboardHostClub,
        event: _hostLiveWindowEvent,
        onBackToSuccess: () {},
        initialSection: HostEventManageSection.live,
        referenceNow: _hostLiveWindowNow,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendance_mutation_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageLiveWindowProviderOverrides(),
    builder: (context) => _HostManageAttendanceMutationCapture(
      mode: _HostManageAttendanceMutationCaptureMode.error,
      child: HostEventManageScreen(
        club: _dashboardHostClub,
        event: _hostLiveWindowEvent,
        onBackToSuccess: () {},
        initialSection: HostEventManageSection.live,
        referenceNow: _hostLiveWindowNow,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_attendance_roster',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      uidProvider.overrideWithValue(
        const AsyncData<String?>(_captureViewerUid),
      ),
      appConnectivityProvider.overrideWith(
        (ref) =>
            Stream.value(const <ConnectivityResult>[ConnectivityResult.wifi]),
      ),
      hostAttendanceOutboxStoreProvider.overrideWithValue(
        _CaptureHostAttendanceOutboxStore(),
      ),
      firebaseFirestoreProvider.overrideWithValue(FakeFirebaseFirestore()),
      firebaseFunctionsProvider.overrideWithValue(
        _CaptureFirebaseFunctions(const <String, Object?>{}),
      ),
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(_captureViewer),
      ),
      watchEventProvider(
        _hostEvent.id,
      ).overrideWith((ref) => Stream.value(_hostEvent)),
      eventParticipationRepositoryProvider.overrideWithValue(
        _hostParticipationRepository,
      ),
      watchEventAttendeesProvider(
        _hostEvent.id,
      ).overrideWith((ref) => Stream.value(_hostOperationalAttendees)),
      watchPendingEventRuntimeClaimsProvider(
        _hostEvent.id,
      ).overrideWith((ref) => Stream.value(const [])),
      hostEventRosterInsightsProvider(_hostEvent.id).overrideWith(
        (ref) async => HostEventRosterInsights(
          eventId: _hostEvent.id,
          organizerId: _captureViewerUid,
          cutoffAt: _hostEvent.startTime,
          sourceCoverage: HostRosterInsightCoverage.exact,
          spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
          rows: const <HostEventRosterInsight>[],
          computedAt: _captureNow,
        ),
      ),
      publicProfileRepositoryProvider.overrideWithValue(
        _hostPublicProfileRepository,
      ),
      watchEventSuccessPlanProvider(
        _hostEvent.id,
      ).overrideWith((ref) => Stream.value(_hostLivePlan)),
      watchEventSuccessScorecardProvider(
        _hostEvent.id,
      ).overrideWith((ref) => Stream.value(null)),
      ..._hostEventSuccessProviderOverrides,
    ],
    builder: (context) => HostEventManageScreen(
      club: _dashboardHostClub,
      event: _hostEvent,
      onBackToSuccess: () {},
      initialSection: HostEventManageSection.guests,
      referenceNow: _hostEvent.startTime.subtract(const Duration(hours: 1)),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_unavailable',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      planValue: const AsyncData<EventSuccessPlan?>(null),
    ),
    builder: (context) =>
        _hostManageRouteCapture(initialSection: HostEventManageSection.live),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_plan_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: const AsyncLoading<EventSuccessPlan?>(),
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _dashboardHostClub,
      event: _hostEvent,
      initialSection: HostEventManageSection.live,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_plan_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncError<EventSuccessPlan?>(
        StateError('Event Success setup failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _dashboardHostClub,
      event: _hostEvent,
      initialSection: HostEventManageSection.live,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_plan_offline',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncError<EventSuccessPlan?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _dashboardHostClub,
      event: _hostEvent,
      initialSection: HostEventManageSection.live,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_wingman_requests',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostManageWingmanPlan),
      wingmanRequests: _hostManageWingmanRequests(
        event: _hostEvent,
        now: _captureNow,
      ),
      wingmanProfiles: _hostManageProfilesFor(
        _hostManageWingmanProfileUids(
          _hostManageWingmanRequests(event: _hostEvent, now: _captureNow),
        ),
      ),
    ),
    builder: (context) => _hostManageLiveSectionCapture(event: _hostEvent),
    drive: (tester) => _scrollHostManageLiveSectionTo(
      tester,
      find.byType(EventSuccessHostHelpSection, skipOffstage: false),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_check_in_qr',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostManageCheckInEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostManageCheckInPlan),
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _dashboardHostClub,
      event: _hostManageCheckInEvent,
      initialSection: HostEventManageSection.guests,
    ),
    drive: _openHostManageCheckInQr,
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_conversation_cues',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostManageCuePlan),
    ),
    builder: (context) => _hostManageLiveSectionCapture(event: _hostEvent),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_micro_pods_assigned',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostManageMicroPodsPlan),
      assignments: _hostManageMicroPodAssignments(
        event: _hostEvent,
        now: _captureNow,
      ),
      assignmentPeerProfiles: _hostManageProfilesFor(
        _hostManageAssignmentParticipantUids(
          _hostManageMicroPodAssignments(event: _hostEvent, now: _captureNow),
        ),
      ),
      preferences: _hostManagePreferences(event: _hostEvent, now: _captureNow),
    ),
    builder: (context) => _hostManageLiveSectionCapture(event: _hostEvent),
    drive: (tester) => _scrollHostManageLiveSectionTo(
      tester,
      find.text('Small starter groups'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_reveal_round_revealed',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostManageRevealEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostManageRevealPlan),
      assignments: _hostManageRevealAssignments,
      assignmentPeerProfiles: _hostManageProfilesFor(
        _hostManageAssignmentParticipantUids(_hostManageRevealAssignments),
      ),
      preferences: _hostManagePreferences(
        event: _hostManageRevealEvent,
        now: _captureNow,
      ),
    ),
    builder: (context) =>
        _hostManageLiveSectionCapture(event: _hostManageRevealEvent),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_host_override_edited',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostManageRouteProviderOverrides(
      event: _hostManageOverrideEvent,
      planValue: AsyncData<EventSuccessPlan?>(_hostManageOverridePlan),
      assignments: _hostManageOverrideAssignments,
      assignmentPeerProfiles: _hostManageProfilesFor(
        _hostManageAssignmentParticipantUids(_hostManageOverrideAssignments),
      ),
      preferences: _hostManagePreferences(
        event: _hostManageOverrideEvent,
        now: _captureNow,
      ),
    ),
    builder: (context) =>
        _hostManageLiveSectionCapture(event: _hostManageOverrideEvent),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_live_guided_rotations_assigned',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostManageRotationsPlan),
      rotationAssignments: _hostManageRotationAssignments(
        event: _hostEvent,
        now: _captureNow,
      ),
      rotationPeerProfiles: _hostManageProfilesFor(
        _hostManageAssignmentParticipantUids(
          _hostManageRotationAssignments(event: _hostEvent, now: _captureNow),
        ),
      ),
      preferences: _hostManagePreferences(event: _hostEvent, now: _captureNow),
    ),
    builder: (context) => _hostManageLiveSectionCapture(event: _hostEvent),
    drive: (tester) => _scrollHostManageLiveSectionTo(
      tester,
      find.text('Timed partner rotations'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_live_console',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>['hostMarketingIndia.host.liveConsole'],
    providerOverrides: _marketingHostManageOverrides(_marketingHostLiveEvent),
    builder: (context) => HostEventManageScreen(
      club: _marketingHostClub,
      event: _marketingHostLiveEvent,
      onBackToSuccess: () {},
      initialSection: HostEventManageSection.live,
      referenceNow: hostMarketingIndiaScenario.clock('live'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_live_console_wide',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.auditTablet,
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(_captureViewerUid)),
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(_captureViewer),
      ),
      watchEventProvider(
        _hostLiveReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(_hostLiveReferenceEvent)),
      eventParticipationRepositoryProvider.overrideWithValue(
        _hostLiveReferenceParticipationRepository,
      ),
      watchEventAttendeesProvider(_hostLiveReferenceEvent.id).overrideWith(
        (ref) => Stream.value(_hostLiveReferenceOperationalAttendees),
      ),
      publicProfileRepositoryProvider.overrideWithValue(
        _hostLiveReferencePublicProfileRepository,
      ),
      watchEventSuccessPlanProvider(
        _hostLiveReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(_hostLiveReferencePlan)),
      watchEventSuccessScorecardProvider(
        _hostLiveReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(null)),
      ..._hostEventSuccessProviderOverrides,
    ],
    builder: (context) => HostEventManageScreen(
      club: _hostLiveReferenceClub,
      event: _hostLiveReferenceEvent,
      onBackToSuccess: () {},
      initialSection: HostEventManageSection.live,
      referenceNow: _hostLiveReferenceEvent.startTime.add(
        const Duration(minutes: 30),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_live_room_workspace',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(_captureViewerUid)),
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(_captureViewer),
      ),
      watchEventProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(_hostLiveRoomReferenceEvent)),
      eventParticipationRepositoryProvider.overrideWithValue(
        _hostLiveReferenceParticipationRepository,
      ),
      watchEventAttendeesProvider(_hostLiveRoomReferenceEvent.id).overrideWith(
        (ref) => Stream.value(_hostLiveReferenceOperationalAttendees),
      ),
      publicProfileRepositoryProvider.overrideWithValue(
        _hostLiveReferencePublicProfileRepository,
      ),
      watchEventSuccessPlanProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(_hostLiveRoomReferencePlan)),
      watchEventSuccessScorecardProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(null)),
      eventSuccessSpatialLayoutProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) async => _hostLiveRoomReferenceLayout),
      watchEventParticipationRosterProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(_hostLiveRoomRoster)),
      watchEventSuccessAssignmentsProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(_hostLiveRoomAssignments)),
      watchEventSuccessRotationAssignmentsProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(const <EventSuccessAssignment>[])),
      watchEventSuccessPreferencesProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith((ref) => Stream.value(const <EventSuccessPreference>[])),
      watchEventSuccessWingmanRequestsProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWith(
        (ref) => Stream.value(const <EventSuccessWingmanRequest>[]),
      ),
      attendanceSheetViewModelProvider(
        _hostLiveRoomReferenceEvent.id,
      ).overrideWithValue(AsyncData(_hostAttendanceViewModel)),
      attendeeProfilesProvider(
        _hostProfileIds,
      ).overrideWith((ref) async => _hostProfileRows),
    ],
    builder: (context) => HostEventManageScreen(
      club: _hostLiveReferenceClub,
      event: _hostLiveRoomReferenceEvent,
      onBackToSuccess: () {},
      initialSection: HostEventManageSection.live,
      initialSpatialSelectionUid: _hostLiveReferenceProfiles.first.uid,
      onPreviewSpatial: (_) async => const [
        EventSuccessSpatialDestination(
          unitId: 'round-1',
          valid: false,
          reason: EventSuccessSpatialDestinationReason.declaredConstraint,
          recommendedScope: null,
        ),
        EventSuccessSpatialDestination(
          unitId: 'round-2',
          valid: false,
          reason: EventSuccessSpatialDestinationReason.capacity,
          recommendedScope: null,
        ),
        EventSuccessSpatialDestination(
          unitId: 'round-3',
          valid: false,
          reason: EventSuccessSpatialDestinationReason.capacity,
          recommendedScope: null,
        ),
        EventSuccessSpatialDestination(
          unitId: 'round-4',
          valid: true,
          reason: null,
          recommendedScope: EventSuccessSpatialScope.thisRound,
        ),
        EventSuccessSpatialDestination(
          unitId: 'round-5',
          valid: true,
          reason: null,
          recommendedScope: EventSuccessSpatialScope.pinned,
        ),
        EventSuccessSpatialDestination(
          unitId: 'round-6',
          valid: true,
          reason: null,
          recommendedScope: EventSuccessSpatialScope.thisRound,
        ),
      ],
      onReassignSpatial: (_, _, _) async {},
      onConfirmSpatial: (_) async {},
      onReleaseSpatial: (_) async {},
      referenceNow: _hostLiveRoomReferenceEvent.startTime.add(
        const Duration(minutes: 55),
      ),
    ),
    drive: (tester) async {
      await tester.tap(find.text('Room'));
      await pumpFeatureUi(tester);
      await tester.tap(
        find.byKey(const ValueKey<String>('event_success.room.unit.round-4')),
      );
      await pumpFeatureUi(tester);
    },
  ),
  ScreenCaptureEntry(
    id: 'host_post_event_report',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>[
      'hostMarketingIndia.host.postEventReport',
    ],
    providerOverrides: _marketingHostManageOverrides(
      _marketingHostReportEvent,
      complete: true,
    ),
    builder: (context) => HostEventManageScreen(
      club: _marketingHostClub,
      event: _marketingHostReportEvent,
      onBackToSuccess: () {},
      initialSection: HostEventManageSection.report,
      referenceNow: hostMarketingIndiaScenario.clock('followUp'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_report_scorecard_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostReportPlan),
      scorecardValue: const AsyncLoading<EventSuccessScorecard?>(),
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _dashboardHostClub,
      event: _hostEvent,
      initialSection: HostEventManageSection.report,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_report_scorecard_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostReportPlan),
      scorecardValue: AsyncError<EventSuccessScorecard?>(
        StateError('Scorecard failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _dashboardHostClub,
      event: _hostEvent,
      initialSection: HostEventManageSection.report,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_report_scorecard_offline',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      club: _dashboardHostClub,
      event: _hostEvent,
      participations: _hostParticipations,
      planValue: AsyncData<EventSuccessPlan?>(_hostReportPlan),
      scorecardValue: AsyncError<EventSuccessScorecard?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostManageRouteCapture(
      club: _dashboardHostClub,
      event: _hostEvent,
      initialSection: HostEventManageSection.report,
    ),
  ),
  ScreenCaptureEntry(
    id: 'post_run_catch_window',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    marketingFixtureKeys: const <String>['salesDemo.member.postRunCatchWindow'],
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(_postRunViewer.uid)),
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(_postRunViewer),
      ),
      watchEventProvider(
        _postRunEvent.id,
      ).overrideWith((ref) => Stream.value(_postRunEvent)),
      watchEventParticipationProvider(
        _postRunEvent.id,
        _postRunViewer.uid,
      ).overrideWith((ref) => Stream.value(_postRunViewerParticipation)),
      swipeQueueProvider(
        _postRunEvent.id,
      ).overrideWithBuild((ref, notifier) async => _postRunProfiles),
    ],
    builder: (context) =>
        SwipeScreen(eventId: _postRunEvent.id, now: _captureNow),
  ),

  ScreenCaptureEntry(
    id: 'swipe_event_queue_loading',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      queue: () => Completer<List<PublicProfile>>().future,
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_queue_error',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      queue: () => Future<List<PublicProfile>>.error(
        StateError('Capture Catches queue failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_offline',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      queue: () => Future<List<PublicProfile>>.error(
        _catchesOfflineException(action: 'load swipe candidates'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_cached_offline',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      appConnectivityProvider.overrideWith(
        (ref) => Stream<List<ConnectivityResult>>.value(
          const <ConnectivityResult>[ConnectivityResult.none],
        ),
      ),
      ..._swipeDeckProviderOverrides(event: _catchesOpenEvent),
    ],
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_empty_queue',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      queue: () async => const <PublicProfile>[],
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_missing',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      eventStream: Stream<Event?>.value(null),
      queue: () async => const <PublicProfile>[],
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_sign_in_required',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      uid: null,
      profileStream: Stream<UserProfile?>.value(null),
      queue: () async => const <PublicProfile>[],
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_in_progress',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesUpcomingEvent,
      participation: CatchesSurfaceFixtures.attendedParticipation(
        event: _catchesUpcomingEvent,
      ),
      queue: () async => const <PublicProfile>[],
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesUpcomingEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_did_not_attend',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      participation: CatchesSurfaceFixtures.signedUpParticipation(
        event: _catchesOpenEvent,
      ),
      queue: () async => const <PublicProfile>[],
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_window_closed',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesClosedEvent,
      participation: CatchesSurfaceFixtures.attendedParticipation(
        event: _catchesClosedEvent,
      ),
      queue: () async => const <PublicProfile>[],
    ),
    builder: (context) => SwipeScreen(
      eventId: _catchesClosedEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_pass_pending',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => _swipeEventPendingActionCapture(
      const CatchesProfileReviewActionState.passPending(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_reaction_pending',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => _swipeEventPendingActionCapture(
      const CatchesProfileReviewActionState.reactionPending(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_write_failure_snackbar',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _swipeDeckProviderOverrides(
      event: _catchesOpenEvent,
      swipeRepository: const _CaptureThrowingSwipeRepository(),
    ),
    builder: (context) => const _SwipeWriteFailureNoticeCapture(),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_text_scale_2',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _swipeDeckProviderOverrides(event: _catchesOpenEvent),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_reduced_motion',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _swipeDeckProviderOverrides(event: _catchesOpenEvent),
    builder: (context) => SwipeScreen(
      eventId: _catchesOpenEvent.id,
      now: CatchesSurfaceFixtures.now,
    ),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_comment_sheet_empty',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => const _CatchesReactionCommentSheetCapture(),
  ),
  ScreenCaptureEntry(
    id: 'swipe_event_comment_sheet_filled',
    routeIds: const <String>['swipeEventScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => const _CatchesReactionCommentSheetCapture(
      initialComment: 'Your sunrise loop sounds like my kind of Sunday.',
    ),
  ),
  ScreenCaptureEntry(
    id: 'notifications_activity',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_dashboardSignedUpEvents)),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_mark_all_read_pending',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_dashboardSignedUpEvents)),
    ],
    builder: (context) => const _ActivityMarkAllReadCapture(
      mode: _ActivityMarkAllReadCaptureMode.pending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'notifications_mark_all_read_error',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_dashboardSignedUpEvents)),
    ],
    builder: (context) => const _ActivityMarkAllReadCapture(
      mode: _ActivityMarkAllReadCaptureMode.error,
    ),
  ),
  ScreenCaptureEntry(
    id: 'notifications_deep_link_error',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_dashboardSignedUpEvents)),
    ],
    builder: (context) => const _ActivityDeepLinkErrorCapture(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_uid_loading',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [uidProvider.overrideWithValue(const AsyncLoading())],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_uid_error',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(
        AsyncError<String?>(
          StateError('Capture notification identity failed'),
          StackTrace.empty,
        ),
      ),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_signed_out',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [uidProvider.overrideWithValue(const AsyncData(null))],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_activity_loading',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(const AsyncLoading()),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_activity_error',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(_captureViewerUid).overrideWithValue(
        AsyncError<List<ActivityNotification>>(
          StateError('Activity unavailable'),
          StackTrace.empty,
        ),
      ),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_empty',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(const AsyncData(<ActivityNotification>[])),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_text_scale_2',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_reduced_motion',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchActivityNotificationsProvider(
        _captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_attendees',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_loading',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      recapValue: const AsyncLoading<EventRecapViewModel?>(),
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_error',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      recapValue: AsyncError<EventRecapViewModel?>(
        StateError('Capture Event Recap failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_missing_event',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      recapValue: const AsyncData<EventRecapViewModel?>(null),
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_empty_roster',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      recapValue: AsyncData<EventRecapViewModel?>(
        _eventRecapViewModel(attendeeIds: const <String>[], checkedInCount: 1),
      ),
      rosterProfiles: const <String, PublicProfile>{},
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_partial_profiles',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      rosterProfiles: _eventRecapRosterProfiles(
        missingProfileIds: {
          _eventRecapProfiles.last.uid,
          _eventRecapProfiles[_eventRecapProfiles.length - 2].uid,
        },
      ),
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_profile_lookup_loading',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      rosterProfilesValue: const AsyncLoading<Map<String, PublicProfile>>(),
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_profile_lookup_error',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      rosterProfilesValue: AsyncError<Map<String, PublicProfile>>(
        StateError('Capture recap profile lookup failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_selected_tiles',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(),
    builder: (context) => EventRecapScreen(
      eventId: _eventRecapEvent.id,
      initialSelectedVibeIds: {
        _eventRecapProfiles.first.uid,
        _eventRecapProfiles[1].uid,
      },
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_text_scale_2',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: _eventRecapProviderOverrides(),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_reduced_motion',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: _eventRecapProviderOverrides(),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_light_dark',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_route_loading',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      eventValue: const AsyncLoading<Event?>(),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_event_load_error',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      eventValue: AsyncError<Event?>(
        StateError('Capture companion event failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_event_not_found',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      eventValue: const AsyncData<Event?>(null),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_sign_in_required',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      uidValue: const AsyncData<String?>(null),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_no_booking',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      participationValue: const AsyncData<EventParticipation?>(null),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_profile_loading',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      profileValue: const AsyncLoading<UserProfile?>(),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_participation_error',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      participationValue: AsyncError<EventParticipation?>(
        StateError('Capture companion participation failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_plan_loading',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      planValue: const AsyncLoading<EventSuccessPlan?>(),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_plan_error',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      planValue: AsyncError<EventSuccessPlan?>(
        StateError('Capture companion plan failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_plan_missing',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      planValue: const AsyncData<EventSuccessPlan?>(null),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_data_error',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      profileValue: AsyncError<UserProfile?>(
        StateError('Capture companion profile failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_offline',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionRouteProviderOverrides(
      planValue: AsyncError<EventSuccessPlan?>(
        _eventSuccessCompanionOfflineException(action: 'load event guide'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EventSuccessCompanionRouteScreen(
      clubId: _eventSuccessCompanionEvent.clubId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(_captureViewerUid)),
      eventSuccessLiveEffectsControllerProvider.overrideWith(
        (ref) => _NoopEventSuccessLiveEffectsController(),
      ),
    ],
    builder: (context) => EventSuccessCompanionScreen(
      event: _eventSuccessCompanionEvent,
      plan: _eventSuccessCompanionPlan,
      userProfile: _captureViewer,
      participation: _eventSuccessCompanionParticipation,
      wingmanRequestCandidates: _matchesListProfiles,
      now: _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_self_check_in',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_self_check_in_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      mutationMode:
          _EventSuccessCompanionMutationCaptureMode.selfCheckInPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_pre_arrival_planning',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
      participation: EventSuccessCompanionFixtures.signedUpParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_first_hello_start',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.firstHelloPlan,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      onStartArrivalMission: () async {},
      onSkipArrivalMission: () {},
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_first_hello_start_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.firstHelloPlan,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      onStartArrivalMission: () async {},
      onSkipArrivalMission: () {},
      mutationMode:
          _EventSuccessCompanionMutationCaptureMode.firstHelloStartPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_first_hello_assigned',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.firstHelloPlan,
      arrivalMission: EventSuccessCompanionFixtures.arrivalMission,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      onCompleteArrivalMission: (_, _) async {},
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_first_hello_complete_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.firstHelloPlan,
      arrivalMission: EventSuccessCompanionFixtures.arrivalMission,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      onCompleteArrivalMission: (_, _) async {},
      mutationMode:
          _EventSuccessCompanionMutationCaptureMode.firstHelloCompletePending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_compatibility_questionnaire',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.questionnairePlan,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(minutes: 30),
      ),
      onSaveCompatibilityAnswers: (_) async {},
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_compatibility_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.questionnairePlan,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(minutes: 30),
      ),
      onSaveCompatibilityAnswers: (_) async {},
      mutationMode:
          _EventSuccessCompanionMutationCaptureMode.compatibilityPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_compatibility_saved',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.questionnairePlan,
      compatibilityResponse:
          EventSuccessCompanionFixtures.compatibilityResponse,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(minutes: 30),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_live_step_context',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.liveStepContextPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      rotationAssignment: EventSuccessCompanionFixtures.rotationAssignment,
      rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
      now: EventSuccessCompanionFixtures.racketStart.add(
        const Duration(minutes: 25),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_social_prompt',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.socialPromptPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(minutes: 12),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_conversation_cues',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.conversationCuesPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(minutes: 50),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_micro_pod_assignment',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      assignment: EventSuccessCompanionFixtures.microPodAssignment,
      assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_micro_pod_loading_peers',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      assignment: EventSuccessCompanionFixtures.microPodAssignment,
      assignmentPeersLoading: true,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_micro_pod_opted_out',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      microPodsOptedOut: true,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_micro_pod_opt_out_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      assignment: EventSuccessCompanionFixtures.microPodAssignment,
      assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
      mutationMode:
          _EventSuccessCompanionMutationCaptureMode.microPodsOptOutPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_table_group_rotations',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      assignment: EventSuccessCompanionFixtures.tableAssignment,
      assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_rotation_schedule',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.rotationSchedulePlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      rotationAssignment: EventSuccessCompanionFixtures.rotationAssignment,
      rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_rotation_loading_peers',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.rotationSchedulePlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      rotationAssignment: EventSuccessCompanionFixtures.rotationAssignment,
      rotationPeersLoading: true,
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_rotation_opted_out',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.rotationSchedulePlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      guidedRotationsOptedOut: true,
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_rotation_opt_out_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.rotationSchedulePlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      rotationAssignment: EventSuccessCompanionFixtures.rotationAssignment,
      rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
      mutationMode: _EventSuccessCompanionMutationCaptureMode
          .guidedRotationsOptOutPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_live_reveal_countdown',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.revealCountingDownPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      rotationAssignment: EventSuccessCompanionFixtures.rotationAssignment,
      rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_motion_parity',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: _eventSuccessMotionParityEvent,
      plan: _eventSuccessMotionParityPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: _eventSuccessMotionParityEvent,
      ),
      now: _eventSuccessMotionParityAnchor.add(const Duration(seconds: 5)),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_live_reveal_unlocked',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      rotationAssignment: EventSuccessCompanionFixtures.rotationAssignment,
      rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_wingman_request',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.wingmanPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      wingmanRequestCandidates: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_wingman_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.wingmanPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      wingmanRequestCandidates: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(hours: 1),
      ),
      mutationMode:
          _EventSuccessCompanionMutationCaptureMode.wingmanRequestPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_wingman_submitted',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.wingmanPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      wingmanRequestCandidates: EventSuccessCompanionFixtures.peers,
      wingmanRequest: EventSuccessCompanionFixtures.wingmanRequest,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_afterglow_feedback',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      existingFeedback: EventSuccessCompanionFixtures.feedback,
      now: EventSuccessCompanionFixtures.socialEvent.endTime.add(
        const Duration(hours: 2),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_feedback_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      existingFeedback: EventSuccessCompanionFixtures.feedback,
      now: EventSuccessCompanionFixtures.socialEvent.endTime.add(
        const Duration(hours: 2),
      ),
      mutationMode: _EventSuccessCompanionMutationCaptureMode.feedbackPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_text_scale_2',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    textScale: 2,
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      assignment: EventSuccessCompanionFixtures.microPodAssignment,
      assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_reduced_motion',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    disableAnimations: true,
    builder: (context) => _eventSuccessCompanionCapture(
      event: EventSuccessCompanionFixtures.racketEvent,
      plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(
        event: EventSuccessCompanionFixtures.racketEvent,
      ),
      rotationAssignment: EventSuccessCompanionFixtures.rotationAssignment,
      rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
      now: EventSuccessCompanionFixtures.racketStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_light_dark',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _eventSuccessCompanionProviderOverrides(),
    builder: (context) => _eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      assignment: EventSuccessCompanionFixtures.microPodAssignment,
      assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_loading',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchesListProviderOverrides(
      viewModel: const AsyncLoading<ChatsListViewModel>(),
    ),
    builder: (context) => _matchesListCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_error',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchesListProviderOverrides(
      viewModel: AsyncError<ChatsListViewModel>(
        StateError('Capture matches failed'),
        StackTrace.empty,
      ),
      matchesError: StateError('Capture matches failed'),
    ),
    builder: (context) => _matchesListCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_offline',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchesListProviderOverrides(
      viewModel: AsyncError<ChatsListViewModel>(
        _matchesOfflineException(action: 'load matches'),
        StackTrace.empty,
      ),
      matchesError: _matchesOfflineException(action: 'load matches'),
    ),
    builder: (context) => _matchesListCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_no_matches_empty',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchesListProviderOverrides(
      matches: const <Match>[],
      viewModel: const AsyncData<ChatsListViewModel>(
        ChatsListViewModel(
          newMatches: <ChatThreadPreview>[],
          conversations: <ChatThreadPreview>[],
          totalThreadCount: 0,
        ),
      ),
    ),
    builder: (context) => _matchesListCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_search_open',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchesListProviderOverrides(),
    builder: (context) => _matchesListCapture(searchQuery: 'Taylor'),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_search_empty',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchesListProviderOverrides(
      viewModel: const AsyncData<ChatsListViewModel>(
        ChatsListViewModel(
          newMatches: <ChatThreadPreview>[],
          conversations: <ChatThreadPreview>[],
          totalThreadCount: 3,
        ),
      ),
    ),
    builder: (context) =>
        _matchesListCapture(searchQuery: 'no dinner runners nearby'),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_duplicate_collapsed',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchesListProviderOverrides(
      matches: _matchesCaptureDuplicateMatches,
    ),
    builder: (context) => _matchesListCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_match_celebration',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ..._matchesListProviderOverrides(),
      celebrationEffectsControllerProvider.overrideWithValue(
        _NoopCelebrationEffectsController(),
      ),
    ],
    builder: (context) => const _MatchCelebrationCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_text_scale_2',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _matchesListProviderOverrides(),
    builder: (context) => _matchesListCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_reduced_motion',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _matchesListProviderOverrides(),
    builder: (context) => _matchesListCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_context',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    marketingFixtureKeys: const <String>['salesDemo.member.matchChatContext'],
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(_matchChatViewerUid)),
      matchRepositoryProvider.overrideWithValue(_matchChatMatchRepository),
      conversationRepositoryProvider.overrideWithValue(
        _matchChatConversationRepository,
      ),
      watchEventProvider(
        _matchChatEvent.id,
      ).overrideWith((ref) => Stream.value(_matchChatEvent)),
      watchPublicProfileProvider(
        _matchChatOtherProfile.uid,
      ).overrideWith((ref) => Stream.value(_matchChatOtherProfile)),
    ],
    builder: (context) => _ReferenceChromeSafeArea(
      child: ChatScreen(
        matchId: _matchChatMatch.id,
        otherProfile: _matchChatOtherProfile,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_messages_loading',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(messagesLoading: true),
    builder: (context) => _matchChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_messages_error',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      messagesError: StateError('Capture messages failed'),
    ),
    builder: (context) => _matchChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_offline',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      messagesError: _matchesOfflineException(
        action: 'load conversation messages',
      ),
    ),
    builder: (context) => _matchChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_empty_thread',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      match: _matchChatEmptyMatch,
      messages: const <ChatMessage>[],
      event: _matchChatEmptyEvent,
      publicProfiles: const <PublicProfile>[_matchChatEmptyOtherProfile],
    ),
    builder: (context) => _ReferenceChromeSafeArea(
      child: _matchChatCapture(
        match: _matchChatEmptyMatch,
        initialProfile: _matchChatEmptyOtherProfile,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_event_context_fallback',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(includeEvent: false),
    builder: (context) => _matchChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_unavailable',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      matchId: 'design-chat-missing',
    ),
    builder: (context) => _matchChatCapture(
      matchId: 'design-chat-missing',
      includeInitialProfile: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_blocked',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      match: MatchesChatSurfaceFixtures.blockedMatch(),
    ),
    builder: (context) =>
        _matchChatCapture(match: MatchesChatSurfaceFixtures.blockedMatch()),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_image_thread',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      messages: MatchesChatSurfaceFixtures.imageMessages,
    ),
    builder: (context) => _matchChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_suvbot_controls',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      match: MatchesChatSurfaceFixtures.suvbotMatch(),
      messages: [
        MatchesChatSurfaceFixtures.message(
          id: 'suvbot-msg-1',
          senderId: suvbotUid,
          text: 'I can refresh your seeded demo state.',
          sentAt: MatchesChatSurfaceFixtures.now.subtract(
            const Duration(minutes: 3),
          ),
        ),
      ],
    ),
    builder: (context) =>
        _matchChatCapture(match: MatchesChatSurfaceFixtures.suvbotMatch()),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_suvbot_action_error',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(
      match: MatchesChatSurfaceFixtures.suvbotMatch(),
      messages: const <ChatMessage>[],
      suvbotRepository: MatchesChatFixtureSuvbotRepository(
        error: StateError('Capture Suvbot failed'),
      ),
    ),
    builder: (context) =>
        _matchChatCapture(match: MatchesChatSurfaceFixtures.suvbotMatch()),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_share_card',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => const _ChatShareCardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_composer_states',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const _ChatComposerStatesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_keyboard_multiline',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(),
    builder: (context) => _matchChatKeyboardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_send_failure_snackbar',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(),
    builder: (context) => const _MatchChatFeedbackNoticeCapture(
      message: 'Unable to send message. Please try again.',
    ),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_report_failure_snackbar',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(),
    builder: (context) => const _MatchChatFeedbackNoticeCapture(
      message: 'Unable to submit report. Please try again.',
    ),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_block_confirm_dialog',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _matchChatProviderOverrides(),
    builder: (context) =>
        _MatchChatBlockDialogCapture(child: _matchChatCapture()),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_text_scale_2',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _matchChatProviderOverrides(),
    builder: (context) => _matchChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'match_chat_reduced_motion',
    routeIds: const <String>['chatScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _matchChatProviderOverrides(),
    builder: (context) => _matchChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'matches_list_context',
    routeIds: const <String>['matchesListScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(_matchChatViewerUid)),
      matchRepositoryProvider.overrideWithValue(_matchesListMatchRepository),
      for (final profile in _matchesListProfiles)
        watchPublicProfileProvider(
          profile.uid,
        ).overrideWith((ref) => Stream.value(profile)),
    ],
    builder: (context) =>
        const ChatsListScreen(initialScope: ConsumerChatScope.messages),
  ),
  ScreenCaptureEntry(
    id: 'host_customer_add',
    routeIds: const <String>['hostAddCustomerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _hostShellCaptureOverrides(
      HostOperationsFixtures.hostUid,
    ),
    builder: (context) => HostAddCustomerScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_customers_populated',
    routeIds: const <String>['hostAudienceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostCustomersProviderOverrides(),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/audience',
      activeIndex: 2,
      child: HostCustomersScreen(
        initialOrganizerId: HostOperationsFixtures.primaryClub.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_customers_audiences_populated',
    routeIds: const <String>['hostAudienceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostCustomersProviderOverrides(),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/audience?view=audiences',
      activeIndex: 2,
      child: HostCustomersScreen(
        initialOrganizerId: HostOperationsFixtures.primaryClub.id,
        initialView: HostAudienceView.audiences,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_saved_audience_create',
    routeIds: const <String>['hostCreateSavedAudienceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostCustomersProviderOverrides(),
    ],
    builder: (context) => HostSavedAudienceEditorScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_saved_audience_detail',
    routeIds: const <String>['hostSavedAudienceDetailScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ..._hostCustomersProviderOverrides(),
    ],
    builder: (context) => HostSavedAudienceEditorScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      initialAudience: _hostSavedAudienceCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_form_overview',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostFormBuilderScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      formId: 'saturday-social-application',
    ),
    providerOverrides: _audienceCaptureFormOverrides(published: true),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_questions_phone',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostFormBuilderScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      formId: 'saturday-social-application',
    ),
    providerOverrides: _audienceCaptureFormOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_settings',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostFormBuilderScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      formId: 'saturday-social-application',
      initialView: HostFormWorkspaceView.settings,
    ),
    providerOverrides: _audienceCaptureFormOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_preview',
    routeIds: const <String>['hostFormPreviewScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostFormPreviewScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      formId: 'saturday-social-application',
    ),
    providerOverrides: _audienceCaptureFormOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_templates',
    routeIds: const <String>['hostFormTemplatesScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormTemplatesScreen(organizerId: 'org_1'),
    providerOverrides: [
      hostFormTemplatesProvider('org_1').overrideWith(
        (_) async => [
          for (final (id, title, purpose, count, description) in [
            (
              'blank_form',
              'Blank form',
              HostFormPurpose.intake,
              0,
              'Start with your own questions.',
            ),
            (
              'event_application',
              'Event application',
              HostFormPurpose.application,
              5,
              'Learn who wants to join your event.',
            ),
            (
              'dinner_guest_intake',
              'Dinner guest intake',
              HostFormPurpose.intake,
              6,
              'Dietary requirements, seating preferences and accessibility.',
            ),
            (
              'post_event_feedback',
              'Post-event feedback',
              HostFormPurpose.feedback,
              4,
              'Learn what went well and what could improve.',
            ),
          ])
            HostFormTemplateSummary(
              templateId: id,
              version: 1,
              title: title,
              description: description,
              purpose: purpose,
              identityPolicy: HostFormIdentityPolicy.emailOrPhoneVerified,
              sectionCount: 1,
              questionCount: count,
            ),
        ],
      ),
    ],
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_share',
    routeIds: const <String>['hostFormShareScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) =>
        const HostFormShareScreen(organizerId: 'org_1', formId: 'form_1'),
    providerOverrides: [
      hostFormEditorControllerProvider(
        'org_1',
        'form_1',
      ).overrideWith(_AudienceCapturePublishedEditor.new),
      hostFormShareAssetsControllerProvider(
        organizerId: 'org_1',
        formId: 'form_1',
      ).overrideWith(
        (_) async => const HostFormShareAssets(
          canonicalUrl: 'https://catch.example/f/saturday-social/',
          embedUrl: 'https://catch.example/f/saturday-social/?embed=1',
          embedSnippet:
              '<iframe src="https://catch.example/f/saturday-social/?embed=1" title="Saturday Social application"></iframe>',
        ),
      ),
    ],
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_results',
    routeIds: const <String>['hostFormAnalyticsScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) =>
        const HostFormAnalyticsScreen(organizerId: 'org_1', formId: 'form_1'),
    providerOverrides: [
      hostFormEditorControllerProvider(
        'org_1',
        'form_1',
      ).overrideWith(_AudienceCapturePublishedEditor.new),
      hostFormAnalyticsProvider(
        organizerId: 'org_1',
        formId: 'form_1',
      ).overrideWith(
        (_) async => const HostFormAnalytics(
          formId: 'form_1',
          versionId: 'v1',
          version: 1,
          opens: 240,
          starts: 120,
          submissions: 84,
          withdrawals: 2,
          completionRate: .7,
          medianCompletionMillis: 82000,
          questions: [
            HostFormQuestionAggregate(
              questionId: 'join',
              label: 'What would you like to join?',
              kind: 'singleChoice',
              privacyClass: 'organizerCustom',
              responseCount: 84,
              choiceCounts: [
                HostFormChoiceCount(
                  value: 'dinners',
                  label: 'Small dinners',
                  count: 48,
                ),
                HostFormChoiceCount(
                  value: 'running',
                  label: 'Running groups',
                  count: 24,
                ),
                HostFormChoiceCount(value: 'both', label: 'Both', count: 12),
              ],
              numericCount: 0,
              numericSum: 0,
              numericMin: null,
              numericMax: null,
            ),
          ],
          sources: [],
          privacyThreshold: 5,
        ),
      ),
    ],
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_response_application',
    routeIds: const <String>['hostFormResponseDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormResponseDetailScreen(
      organizerId: 'org_1',
      responseId: 'response_1',
    ),
    providerOverrides: _audienceCaptureResponseOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_response_intake',
    routeIds: const <String>['hostFormResponseDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormResponseDetailScreen(
      organizerId: 'org_1',
      responseId: 'response_1',
    ),
    providerOverrides: _audienceCaptureResponseOverrides(application: false),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_response_withdrawn',
    routeIds: const <String>['hostFormResponseDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormResponseDetailScreen(
      organizerId: 'org_1',
      responseId: 'response_1',
    ),
    providerOverrides: _audienceCaptureResponseOverrides(withdrawn: true),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_response_large_text',
    routeIds: const <String>['hostFormResponseDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormResponseDetailScreen(
      organizerId: 'org_1',
      responseId: 'response_1',
    ),
    providerOverrides: _audienceCaptureResponseOverrides(),
    includeOverlays: true,
    textScale: 2,
    disableAnimations: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_automations',
    routeIds: const <String>['hostFormAutomationsScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) =>
        const HostFormAutomationsScreen(organizerId: 'org_1', formId: 'form_1'),
    providerOverrides: _audienceCaptureAutomationOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_audience_automations',
    routeIds: const <String>['hostAudienceAutomationsScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormAutomationsScreen(organizerId: 'org_1'),
    providerOverrides: _audienceCaptureAutomationOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_automation_editor',
    routeIds: const <String>['hostFormAutomationsScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) =>
        const HostFormAutomationsScreen(organizerId: 'org_1', formId: 'form_1'),
    providerOverrides: _audienceCaptureAutomationOverrides(),
    includeOverlays: true,
    drive: (tester) async {
      await tester.tap(find.byKey(const ValueKey('automation-create')));
      await pumpFeatureUi(tester);
    },
  ),
  ScreenCaptureEntry(
    id: 'host_application_detail',
    routeIds: const <String>['hostApplicationDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostApplicationDetailScreen(
      organizerId: 'org_1',
      applicationId: 'design-application-1',
    ),
    providerOverrides: [
      hostFormResponseDetailProvider(
        organizerId: 'org_1',
        responseId: _audienceCaptureJourney.responseId,
      ).overrideWith((_) async => _audienceCaptureResponse),
      ..._audienceCaptureSources('org_1'),
      hostApplicationDetailProvider(
        'org_1',
        'design-application-1',
      ).overrideWithValue(AsyncData(_audienceCaptureApplication)),
    ],
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_response_review_submitted',
    routeIds: const <String>['hostFormResponseDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormResponseDetailScreen.application(
      organizerId: 'org_1',
      applicationId: 'design-application-1',
    ),
    providerOverrides: [
      ..._audienceCaptureSources('org_1'),
      hostFormResponseDetailProvider(
        organizerId: 'org_1',
        responseId: _audienceCaptureJourney.responseId,
      ).overrideWith((_) async => _audienceCaptureResponse),
      hostApplicationDetailProvider(
        'org_1',
        'design-application-1',
      ).overrideWithValue(AsyncData(_responseReviewCaptureApplication())),
    ],
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_response_review_imported',
    routeIds: const <String>['hostFormResponseDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormResponseDetailScreen.application(
      organizerId: 'org_1',
      applicationId: 'design-application-1',
    ),
    providerOverrides: [
      ..._audienceCaptureSources('org_1'),
      hostFormResponseDetailProvider(
        organizerId: 'org_1',
        responseId: _audienceCaptureJourney.responseId,
      ).overrideWith((_) async => _audienceCaptureResponse),
      hostApplicationDetailProvider(
        'org_1',
        'design-application-1',
      ).overrideWithValue(
        AsyncData(_responseReviewCaptureApplication(imported: true)),
      ),
    ],
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_response_review_revoked',
    routeIds: const <String>['hostFormResponseDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostFormResponseDetailScreen.application(
      organizerId: 'org_1',
      applicationId: 'design-application-1',
    ),
    providerOverrides: [
      ..._audienceCaptureSources('org_1'),
      hostFormResponseDetailProvider(
        organizerId: 'org_1',
        responseId: _audienceCaptureJourney.responseId,
      ).overrideWith((_) async => _audienceCaptureResponse),
      hostApplicationDetailProvider(
        'org_1',
        'design-application-1',
      ).overrideWithValue(
        AsyncData(_responseReviewCaptureApplication(revoked: true)),
      ),
    ],
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_group_overview',
    routeIds: const <String>['hostSavedAudienceDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) =>
        HostSavedAudienceWorkspace(audience: _audienceCaptureAudience),
    providerOverrides: _audienceCaptureGroupOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_group_edit',
    routeIds: const <String>['hostSavedAudienceDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) =>
        HostSavedAudienceWorkspace(audience: _audienceCaptureAudience),
    providerOverrides: _audienceCaptureGroupOverrides(),
    includeOverlays: true,
    drive: (tester) => _audienceCaptureOpenTab(tester, 'Edit rules'),
  ),
  ScreenCaptureEntry(
    id: 'host_group_create',
    routeIds: const <String>['hostCreateSavedAudienceScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostSavedAudienceEditorScreen(
      organizerId: _audienceCaptureAudience.organizerId,
    ),
    providerOverrides: _audienceCaptureGroupOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_person_overview',
    routeIds: const <String>['hostCustomerDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostCustomerDetailScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      contactId: 'capture-customer-ananya',
    ),
    providerOverrides: _audienceCapturePersonOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_person_details',
    routeIds: const <String>['hostCustomerDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostCustomerDetailScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      contactId: 'capture-customer-ananya',
    ),
    providerOverrides: _audienceCapturePersonOverrides(),
    includeOverlays: true,
    drive: (tester) => _audienceCaptureOpenTab(tester, 'Details'),
  ),
  ScreenCaptureEntry(
    id: 'host_person_notes',
    routeIds: const <String>['hostCustomerDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostCustomerDetailScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      contactId: 'capture-customer-ananya',
    ),
    providerOverrides: _audienceCapturePersonOverrides(),
    includeOverlays: true,
    drive: (tester) => _audienceCaptureOpenTab(tester, 'Notes'),
  ),
  ScreenCaptureEntry(
    id: 'host_person_history',
    routeIds: const <String>['hostCustomerDetailScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostCustomerDetailScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      contactId: 'capture-customer-ananya',
    ),
    providerOverrides: _audienceCapturePersonOverrides(),
    includeOverlays: true,
    drive: (tester) => _audienceCaptureOpenTab(tester, 'History'),
  ),
  ScreenCaptureEntry(
    id: 'host_add_person',
    routeIds: const <String>['hostAddCustomerScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostAddCustomerScreen(organizerId: 'org_1'),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_responses_populated',
    routeIds: const <String>['hostAudienceScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      firebaseAuthProvider.overrideWithValue(
        _CaptureFirebaseAuth(
          currentUser: _CaptureAuthUser(
            uid: HostOperationsFixtures.hostUid,
            phoneNumber: '+919876543210',
          ),
        ),
      ),
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      uidProvider.overrideWithValue(
        const AsyncData<String?>(HostOperationsFixtures.hostUid),
      ),
      hostOperableClubsProvider(
        HostOperationsFixtures.hostUid,
      ).overrideWithValue(
        AsyncData<List<Club>>([HostOperationsFixtures.primaryClub]),
      ),
      hostFormsDirectoryControllerProvider.overrideWith2(
        (_) => _CaptureHostFormsDirectoryController(),
      ),
      hostFormResponsesControllerProvider.overrideWith2(
        (_) => _AudienceCaptureResponses(),
      ),
    ],
    builder: (_) => _HostRoutedShellCapture(
      initialLocation: '/host/audience?view=responses',
      activeIndex: 2,
      child: HostFormsScreen(
        initialOrganizerId: HostOperationsFixtures.primaryClub.id,
        initialResponses: true,
      ),
    ),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_forms_populated',
    routeIds: const <String>['hostAudienceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      firebaseAuthProvider.overrideWithValue(
        _CaptureFirebaseAuth(
          currentUser: _CaptureAuthUser(
            uid: HostOperationsFixtures.hostUid,
            phoneNumber: '+919876543210',
          ),
        ),
      ),
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      uidProvider.overrideWithValue(
        const AsyncData<String?>(HostOperationsFixtures.hostUid),
      ),
      hostOperableClubsProvider(
        HostOperationsFixtures.hostUid,
      ).overrideWithValue(
        AsyncData<List<Club>>([HostOperationsFixtures.primaryClub]),
      ),
      hostFormsDirectoryControllerProvider.overrideWith2(
        (_) => _CaptureHostFormsDirectoryController(),
      ),
      hostFormResponsesControllerProvider.overrideWith2(
        (_) => _CaptureHostFormResponsesController(),
      ),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/audience?view=forms',
      activeIndex: 2,
      child: HostFormsScreen(
        initialOrganizerId: HostOperationsFixtures.primaryClub.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_form_builder_draft',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: [
      hostFormEditorControllerProvider(
        HostOperationsFixtures.primaryClub.id,
        'saturday-social-application',
      ).overrideWith(() => _CaptureHostFormEditorController()),
    ],
    builder: (context) => HostFormBuilderScreen(
      organizerId: HostOperationsFixtures.primaryClub.id,
      formId: 'saturday-social-application',
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_customer_detail_memory',
    routeIds: const <String>['hostCustomerDetailScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      uidProvider.overrideWithValue(
        const AsyncData<String?>(HostOperationsFixtures.hostUid),
      ),
      hostAudienceContactDetailProvider(
        HostOperationsFixtures.primaryClub.id,
        'capture-customer-ananya',
      ).overrideWithValue(AsyncData(_hostCustomerMemoryDetail())),
      hostCommunicationPlanProvider(
        HostOperationsFixtures.primaryClub.id,
        'capture-customer-ananya',
      ).overrideWithValue(AsyncData(_hostCustomerMemoryCommunicationPlan())),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/audience',
      activeIndex: 2,
      child: HostCustomerDetailScreen(
        organizerId: HostOperationsFixtures.primaryClub.id,
        contactId: 'capture-customer-ananya',
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_queries',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(
        HostInboxSurfaceFixtures.hostUid,
        unreadCount: 1,
      ),
      ..._hostInboxProviderOverrides(),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/inbox',
      activeIndex: 3,
      child: HostInboxScreen(
        initialScope: const HostInboxScope.event(
          HostInboxSurfaceFixtures.eventId,
        ),
        broadcastEnabled: true,
        syncSelectionToRoute: false,
        now: HostInboxSurfaceFixtures.now,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_thread_selected',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.auditTablet,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostInboxSurfaceFixtures.hostUid),
      ..._hostInboxSelectedThreadOverrides(),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation:
          '/host/inbox?eventId=${HostInboxSurfaceFixtures.eventId}'
          '&threadId=${_hostInboxSelectedPreview.matchId}',
      activeIndex: 3,
      child: HostInboxScreen(
        initialScope: const HostInboxScope.event(
          HostInboxSurfaceFixtures.eventId,
        ),
        initialThreadId: _hostInboxSelectedPreview.matchId,
        broadcastEnabled: true,
        syncSelectionToRoute: false,
        now: HostInboxSurfaceFixtures.now,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_messaging_campaigns',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ..._hostShellCaptureOverrides(HostInboxSurfaceFixtures.hostUid),
      ..._hostInboxProviderOverrides(),
    ],
    builder: (context) => _HostRoutedShellCapture(
      initialLocation: '/host/inbox',
      activeIndex: 3,
      child: HostInboxScreen(
        initialScope: const HostInboxScope.event(
          HostInboxSurfaceFixtures.eventId,
        ),
        initialWorkspace: HostMessagingWorkspace.campaigns,
        syncSelectionToRoute: false,
        now: HostInboxSurfaceFixtures.now,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_uid_loading',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(
      uid: const AsyncLoading<String?>(),
    ),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_loading',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(
      viewModel: const AsyncLoading<ChatsListViewModel>(),
    ),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_error',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(
      viewModel: AsyncError<ChatsListViewModel>(
        StateError('Capture host inbox failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_offline',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(
      viewModel: AsyncError<ChatsListViewModel>(
        _matchesOfflineException(action: 'load host inbox'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_empty',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(
      viewModel: const AsyncData(HostInboxSurfaceFixtures.noThreads),
      events: const AsyncData<List<Event>>([]),
      participations: const AsyncData<List<EventParticipation>>([]),
    ),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_prospective',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(),
    builder: (context) =>
        _hostInboxCapture(initialSegment: HostInboxAudienceSegment.prospective),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_general',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(),
    builder: (context) =>
        _hostInboxCapture(initialScope: const HostInboxScope.general()),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_roster_no_threads',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(
      viewModel: const AsyncData(HostInboxSurfaceFixtures.noThreads),
    ),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_search_active',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(),
    builder: (context) => _hostInboxCapture(searchQuery: 'Aarav'),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_search_empty',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(),
    builder: (context) =>
        _hostInboxCapture(searchQuery: 'No attendee by this name'),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_new_query',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostInboxProviderOverrides(
      viewModel: AsyncData(HostInboxSurfaceFixtures.newInquiryThread),
    ),
    builder: (context) =>
        _hostInboxCapture(initialSegment: HostInboxAudienceSegment.prospective),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_broadcast_composer',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (context) => const _HostBroadcastComposerCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_broadcast_pending',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (context) => const _HostBroadcastComposerCapture(
      state: _HostBroadcastCaptureState.pending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_broadcast_error',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (context) => const _HostBroadcastComposerCapture(
      state: _HostBroadcastCaptureState.error,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_text_scale_2',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _hostInboxProviderOverrides(),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_reduced_motion',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _hostInboxProviderOverrides(),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_light_dark',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostInboxProviderOverrides(),
    builder: (context) => _hostInboxCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_inquiry',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_match_loading',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(matchLoading: true),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_match_error',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(
      matchError: StateError('Capture host chat failed'),
    ),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_not_found',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(
      matchId: 'design-host-chat-missing',
    ),
    builder: (context) => _hostChatCapture(matchId: 'design-host-chat-missing'),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_messages_loading',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(messagesLoading: true),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_messages_error',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(
      messagesError: StateError('Capture host messages failed'),
    ),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_offline',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(
      messagesError: _matchesOfflineException(
        action: 'load host inquiry messages',
      ),
    ),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_empty_thread',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(
      messages: const <ChatMessage>[],
    ),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_event_context_fallback',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(includeEvent: false),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_blocked',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(
      match: _hostInquiryMatch.copyWith(
        status: MatchStatus.blocked,
        blockedBy: MatchesChatSurfaceFixtures.guestUid,
        blockedAt: MatchesChatSurfaceFixtures.now.subtract(
          const Duration(hours: 2),
        ),
      ),
    ),
    builder: (context) => _hostChatCapture(
      match: _hostInquiryMatch.copyWith(
        status: MatchStatus.blocked,
        blockedBy: MatchesChatSurfaceFixtures.guestUid,
        blockedAt: MatchesChatSurfaceFixtures.now.subtract(
          const Duration(hours: 2),
        ),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_text_scale_2',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: _hostChatProviderOverrides(),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_reduced_motion',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: _hostChatProviderOverrides(),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_light_dark',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostChatProviderOverrides(),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_composer_states',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const _ChatComposerStatesCapture(role: AppRole.host),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_keyboard_multiline',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(),
    builder: (context) => _hostChatKeyboardCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_image_day_separator',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(
      messages: _hostInquiryImageDayMessages,
    ),
    builder: (context) => _hostChatCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_report_failure_snackbar',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(),
    builder: (context) => const _HostChatReportFailureNoticeCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_block_confirm_dialog',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostChatProviderOverrides(),
    builder: (context) =>
        _HostChatBlockDialogCapture(child: _hostChatCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_chat_safety_pending_menu',
    routeIds: const <String>['hostChatScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const _HostChatSafetyPendingMenuCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_member',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_profilePortraitAssetImage],
    providerOverrides: [
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(ProfileSurfaceFixtures.viewer),
      ),
      watchPublicProfileProvider(
        _publicProfileReferenceProfile.uid,
      ).overrideWith((ref) => Stream.value(_publicProfileReferenceProfile)),
    ],
    builder: (context) => _poppableRouteCapture(
      PublicProfileScreen(
        uid: _publicProfileReferenceProfile.uid,
        initialProfile: _publicProfileReferenceProfile,
        sharedRunTitle: 'Sundowner 5K',
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_loading',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(
      profileStream: _captureLoadingStream<PublicProfile?>(),
    ),
    builder: (context) => _publicProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_initial_fallback_loading',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(
      profileStream: _captureLoadingStream<PublicProfile?>(),
    ),
    builder: (context) =>
        _publicProfileCapture(initialProfile: _profileCaptureTargetNoNetwork),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_error',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(
      profileStream: _captureErrorStream<PublicProfile?>(
        'Capture public profile failed',
      ),
    ),
    builder: (context) => _publicProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_offline',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(
      profileStream: Stream<PublicProfile?>.error(
        ProfileSurfaceFixtures.offlineException(action: 'load public profile'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => _publicProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_unavailable',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(
      profileStream: Stream<PublicProfile?>.value(null),
    ),
    builder: (context) => _publicProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_own_profile',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(
      uid: ProfileSurfaceFixtures.ownUid,
      profile: _profileCaptureOwnNoNetwork,
    ),
    builder: (context) =>
        _publicProfileCapture(uid: ProfileSurfaceFixtures.ownUid),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_block_pending',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => const _PublicProfilePendingOverlayCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_report_pending',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(),
    builder: (context) => const _PublicProfileReportMutationCapture(
      mode: _PublicProfileReportMutationMode.pending,
    ),
    cleanup: _cleanupPublicProfileReportPending,
  ),
  ScreenCaptureEntry(
    id: 'public_profile_report_success_snackbar',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(),
    builder: (context) => const _PublicProfileReportMutationCapture(
      mode: _PublicProfileReportMutationMode.success,
    ),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_report_failure_snackbar',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _publicProfileProviderOverrides(),
    builder: (context) => const _PublicProfileReportMutationCapture(
      mode: _PublicProfileReportMutationMode.error,
    ),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_report_sheet',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const _PublicProfileReportSheetCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_block_confirmation',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => const _PublicProfileBlockDialogCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_text_scale_2',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _publicProfileProviderOverrides(),
    builder: (context) => _publicProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'public_profile_reduced_motion',
    routeIds: const <String>['publicProfileScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _publicProfileProviderOverrides(),
    builder: (context) => _publicProfileCapture(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_signed_out',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(
      uid: const AsyncData<String?>(null),
    ),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_profile_loading',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(
      profileStream: _captureLoadingStream<UserProfile?>(),
    ),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_profile_error',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(
      profileStream: _captureErrorStream<UserProfile?>(
        'Capture reviews profile failed',
      ),
    ),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_reviews_loading',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(
      reviews: const AsyncLoading<List<Review>>(),
    ),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_reviews_error',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(
      reviews: AsyncError<List<Review>>(
        StateError('Review history unavailable'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_empty',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(
      reviews: const AsyncData(<Review>[]),
    ),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_list',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_missing_event_context',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _reviewsHistoryProviderOverrides(
      reviews: AsyncData(_reviewHistoryMissingContextReviews),
      events: const AsyncData(<Event>[]),
    ),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_text_scale_2',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _reviewsHistoryProviderOverrides(),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'reviews_history_reduced_motion',
    routeIds: const <String>['reviewsHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: _reviewsHistoryProviderOverrides(),
    builder: (context) => const ReviewsHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_application',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        _captureViewerUid,
      ).overrideWith((ref) => Stream.value(null)),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_loading',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        _captureViewerUid,
      ).overrideWith((ref) => _captureLoadingStream()),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_submit_pending',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        _captureViewerUid,
      ).overrideWith((ref) => Stream.value(null)),
    ],
    builder: (context) => const _LaunchAccessSubmitPendingCapture(
      child: LaunchAccessApplicationScreen(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_signed_out',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [uidProvider.overrideWithValue(const AsyncData(null))],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_error',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(_captureViewerUid).overrideWith(
        (ref) => _captureErrorStream<LaunchAccessApplication?>(
          'Capture launch access application failed',
        ),
      ),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_offline',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(_captureViewerUid).overrideWith(
        (ref) => Stream<LaunchAccessApplication?>.error(
          obviousOfflineException(),
          StackTrace.empty,
        ),
      ),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_approved',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(_captureViewerUid).overrideWith(
        (ref) => Stream.value(
          const LaunchAccessApplication(
            uid: _captureViewerUid,
            status: LaunchAccessApplicationStatus.approvedForProfile,
            city: 'in-mh-mumbai',
          ),
        ),
      ),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_text_scale_2',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        _captureViewerUid,
      ).overrideWith((ref) => Stream.value(null)),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_reduced_motion',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(_captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        _captureViewerUid,
      ).overrideWith((ref) => Stream.value(null)),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_account',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_profile_loading',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      profileStream: _captureLoadingStream<UserProfile?>(),
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_profile_error',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      profileStream: _captureErrorStream<UserProfile?>(
        'Capture settings profile failed',
      ),
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_profile_offline',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      profileStream: Stream<UserProfile?>.error(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_profile_missing',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      profileStream: Stream.value(null),
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_blocked_loading',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsersStream: _captureLoadingStream<List<BlockedUser>>(),
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_blocked_error',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsersStream: _captureErrorStream<List<BlockedUser>>(
        'Capture blocked users failed',
      ),
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_blocked_offline',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsersStream: Stream<List<BlockedUser>>.error(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_blocked_list',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsers: _settingsBlockedUsers,
      publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_text_scale_2',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsers: _settingsBlockedUsers,
      publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_reduced_motion',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsers: _settingsBlockedUsers,
      publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
    ),
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_external_link_pending',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ..._settingsAccountProviderOverrides(),
      externalUrlLauncherProvider.overrideWithValue(
        _capturePendingExternalLauncher,
      ),
    ],
    drive: _driveSettingsHostApp,
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_external_link_failure',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    includeOverlays: true,
    providerOverrides: [
      ..._settingsAccountProviderOverrides(),
      externalUrlLauncherProvider.overrideWithValue(
        _captureFailedExternalLauncher,
      ),
    ],
    drive: _driveSettingsHostApp,
    builder: (context) => const SettingsScreen(),
  ),
  ScreenCaptureEntry(
    id: 'settings_preference_pending',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.preferencePending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_preference_error',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.preferenceError,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_preference_offline',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.preferenceOffline,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_delete_pending',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.deletePending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_delete_error',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.deleteError,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_delete_offline',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.deleteOffline,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_sign_out_pending',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.signOutPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_sign_out_error',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.signOutError,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_sign_out_offline',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.signOutOffline,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_unblock_pending',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsers: _settingsBlockedUsers,
      publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
    ),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.unblockPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_unblock_error',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsers: _settingsBlockedUsers,
      publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
    ),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.unblockError,
    ),
  ),
  ScreenCaptureEntry(
    id: 'settings_unblock_offline',
    routeIds: const <String>['settingsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _settingsAccountProviderOverrides(
      blockedUsers: _settingsBlockedUsers,
      publicProfiles: UtilitySurfaceFixtures.blockedPublicProfiles,
    ),
    builder: (context) => const _SettingsMutationCapture(
      mode: _SettingsMutationCaptureMode.unblockOffline,
    ),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_uid_loading',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      uid: const AsyncLoading<String?>(),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_signed_out',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      uid: const AsyncData<String?>(null),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_uid_error',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      uid: AsyncError<String?>(
        StateError('Payment identity unavailable'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_uid_offline',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      uid: AsyncError<String?>(obviousOfflineException(), StackTrace.empty),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_loading',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      payments: const AsyncLoading<List<Payment>>(),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_error',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      payments: AsyncError<List<Payment>>(
        StateError('Payment history unavailable'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_payments_offline',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      payments: AsyncError<List<Payment>>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_empty',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      payments: const AsyncData(<Payment>[]),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_populated',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_receipt_sheet',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) =>
        _PaymentReceiptSheetCapture(payment: _paymentHistoryPayments.first),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_failed_signup_receipt_sheet',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => _PaymentReceiptSheetCapture(
      payment: _paymentHistoryPayments.firstWhere(
        (payment) => payment.signUpFailed,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_support_snackbar',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    builder: (context) => _PaymentSupportNoticeCapture(
      payment: _paymentHistoryPayments.firstWhere(
        (payment) => payment.signUpFailed,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_missing_event_title',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      events: AsyncData(_paymentHistoryEvents.take(3).toList()),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_event_title_loading',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      events: const AsyncLoading<List<Event>>(),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_event_title_error',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _paymentHistoryProviderOverrides(
      events: AsyncError<List<Event>>(
        StateError('Capture payment event-title lookup failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_text_scale_2',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _paymentHistoryProviderOverrides(),
    builder: (context) => const PaymentHistoryScreen(),
  ),
  ScreenCaptureEntry(
    id: 'payment_history_reduced_motion',
    routeIds: const <String>['paymentHistoryScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: _paymentHistoryProviderOverrides(),
    builder: (context) => const PaymentHistoryScreen(),
  ),
];

ScreenCaptureEntry findScreenCapture(String id) {
  for (final entry in screenCaptureCatalog) {
    if (entry.id == id) return entry;
  }
  throw ArgumentError.value(id, 'id', 'Unknown screen capture id.');
}

class _ExploreCaptureStateSeed extends ConsumerStatefulWidget {
  const _ExploreCaptureStateSeed({
    required this.child,
    this.searchQuery,
    this.seedFilters = const _ExploreCaptureFilterSeed(),
  });

  final Widget child;
  final String? searchQuery;
  final _ExploreCaptureFilterSeed seedFilters;

  @override
  ConsumerState<_ExploreCaptureStateSeed> createState() =>
      _ExploreCaptureStateSeedState();
}

class _ExploreCaptureStateSeedState
    extends ConsumerState<_ExploreCaptureStateSeed> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref
          .read(selectedExploreCityProvider.notifier)
          .setCity(_memberDiscoveryCities.first);
      final query = widget.searchQuery;
      if (query != null) {
        ref.read(exploreSearchQueryProvider.notifier).setQuery(query);
      }
      widget.seedFilters.apply(ref.read(exploreFiltersProvider.notifier));
    });
  }

  @override
  Widget build(BuildContext context) => widget.child;
}

class _ExploreCaptureFilterSeed {
  const _ExploreCaptureFilterSeed({
    this.time,
    this.distance,
    this.activity,
    this.highRatedOnly = false,
  });

  final ExploreTimeFilter? time;
  final ExploreDistanceFilter? distance;
  final ActivityKind? activity;
  final bool highRatedOnly;

  void apply(ExploreFilters notifier) {
    final timeValue = time;
    if (timeValue != null) notifier.setTimeFilter(timeValue);
    final distanceValue = distance;
    if (distanceValue != null) notifier.setDistanceFilter(distanceValue);
    final activityValue = activity;
    if (activityValue != null) notifier.toggleActivityTag(activityValue.name);
    if (highRatedOnly) notifier.toggleHighRatedOnly();
  }
}

final class _NoOpAnalyticsReporter implements AnalyticsReporter {
  @override
  Future<void> logEvent(String name, {Map<String, Object>? parameters}) async {}

  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> setCollectionEnabled(bool enabled) async {}

  @override
  Future<void> setUserId(String? userId) async {}
}

ProfileReactionTarget _target(
  String id,
  SwipeReactionTargetType type,
  String label,
) => ProfileReactionTarget(id: id, type: type, label: label, preview: label);

final _profileFixture = ProfileView(
  name: 'Aanya',
  age: 27,
  heroPhoto: _profileHeroImage,
  heroReaction: _target(
    'hero',
    SwipeReactionTargetType.heroPhoto,
    'Main photo',
  ),
  kicker: 'Was at - Sundowner 5K',
  kickerActivity: ActivityKind.socialRun,
  metaLine: 'Designer - Bandra',
  sections: <ProfileSectionData>[
    ProfileCompatibilitySectionData(
      title: 'Why you might click',
      reasons: const <String>[
        'You both run at dawn around Bandra',
        'Two mutual clubs',
        'Both here for something that starts as a run',
      ],
      confidence: const <String>['Verified photos', 'Active this week'],
      reaction: _target(
        'compatibility',
        SwipeReactionTargetType.compatibility,
        'Why you might click',
      ),
    ),
    ProfilePromptSectionData(
      question: 'A perfect Sunday',
      answer:
          'Long run, longer brunch, and a bookshop I have no business being in.',
      reaction: _target(
        'prompt-1',
        SwipeReactionTargetType.profilePrompt,
        'A perfect Sunday',
      ),
    ),
    ProfileRunningSectionData(
      pace: '5:20-6:00 /km',
      distance: '5K, 10K',
      reasons: const <String>['Headspace miles'],
      times: const <String>['Dawn'],
      tags: const <String>[
        'Morning regular',
        'Social miles',
        'Long-run person',
      ],
      reaction: _target(
        'running',
        SwipeReactionTargetType.running,
        'Running rhythm',
      ),
    ),
    ProfilePhotoSectionData(
      image: _profileHeroImage,
      caption: 'Sunday sea-face crew',
      reaction: _target('photo-2', SwipeReactionTargetType.photo, 'Photo 2'),
    ),
    ProfileFactsSectionData(
      title: 'Details',
      facts: <ProfileFact>[
        ProfileFact(icon: CatchIcons.work, text: 'Product designer'),
        ProfileFact(icon: CatchIcons.measure, text: '168 cm'),
        ProfileFact(icon: CatchIcons.education, text: 'Design school'),
      ],
      reaction: _target('details', SwipeReactionTargetType.details, 'Details'),
    ),
  ],
);

class _ProgramCreateCaptureFixture extends StatefulWidget {
  const _ProgramCreateCaptureFixture({required this.state});
  final String state;
  @override
  State<_ProgramCreateCaptureFixture> createState() =>
      _ProgramCreateCaptureFixtureState();
}

class _ProgramCreateCaptureFixtureState
    extends State<_ProgramCreateCaptureFixture> {
  late final ProgramCreateController controller;
  @override
  void initState() {
    super.initState();
    final valid = widget.state == 'pending' || widget.state == 'failure';
    controller = ProgramCreateController(
      organizerId: 'org',
      requestId: 'preview-only-request',
      isActorCurrent: () => true,
      initialValues: valid
          ? ProgramCreateValues(
              title: 'Kapoor–Shah Wedding',
              kind: ProgramKind.wedding,
              timezone: 'Asia/Kolkata',
              startsAt: DateTime(2026, 10, 5),
              endsAt: DateTime(2026, 10, 8),
            )
          : const ProgramCreateValues(),
      create: (_, _) => widget.state == 'pending'
          ? Completer<ProgramMutationResult>().future
          : Future.error(StateError('Connection interrupted. Please retry.')),
      readSaved: (_) => Future.error(StateError('No persistence in a preview')),
      refreshPrograms: (_) async => [],
    );
    if (widget.state != 'draft') unawaited(controller.submit());
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => CatchScaffold.stepFlow(
    body: ProgramCreatePageBody(
      organizerName: 'Kapoor Family',
      controller: controller,
      onSaved: (_) {},
    ),
  );
}
