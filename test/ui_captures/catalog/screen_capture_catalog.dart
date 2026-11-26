import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:catch_dating_app/auth/presentation/auth_form_keys.dart';
import 'package:catch_dating_app/auth/presentation/auth_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/account/data/launch_access_repository.dart';
import 'package:catch_dating_app/contexts/account/domain/launch_access_application.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_contacts_repository.dart';
import 'package:catch_dating_app/contexts/audience/data/crm/host_saved_audience_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_event_roster_insights.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/audience/parts/host_door_guest_row.dart';
import 'package:catch_dating_app/contexts/bookings/actions/event_booking_controller.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_attendee_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/guest_event_cards_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/health_activity_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/host_attendance_outbox.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/contexts/bookings/domain/weekly_activity_summary.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/connections/domain/cross_paths_suggestion.dart';
import 'package:catch_dating_app/contexts/connections/domain/match.dart';
import 'package:catch_dating_app/contexts/connections/domain/swipe.dart';
import 'package:catch_dating_app/contexts/discovery/data/city_repository.dart';
import 'package:catch_dating_app/contexts/discovery/data/explore_recommendations_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_host_photos_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/organizer_event_venue_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_host_photos.dart';
import 'package:catch_dating_app/contexts/events/domain/event_invite_link.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy.dart';
import 'package:catch_dating_app/contexts/events/domain/event_private_access.dart';
import 'package:catch_dating_app/contexts/events/domain/guest_event_card.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_event_venue.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks/modules.dart';
import 'package:catch_dating_app/contexts/forms/data/host_application_repository.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_automation.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_configuration.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_definition.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_editor.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_response.dart';
import 'package:catch_dating_app/contexts/forms/domain/forms/host_form_summary.dart';
import 'package:catch_dating_app/contexts/insights/data/user_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/live/data/event_rehearsal_repository.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_companion_clock.dart';
import 'package:catch_dating_app/contexts/live/data/event_success_repository.dart';
import 'package:catch_dating_app/contexts/live/domain/event_rehearsal.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_layout.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/messaging/data/activity_notification_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/conversation_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/event_chat_repository.dart';
import 'package:catch_dating_app/contexts/messaging/data/suvbot_repository.dart';
import 'package:catch_dating_app/contexts/messaging/domain/activity_notification.dart';
import 'package:catch_dating_app/contexts/messaging/domain/chat_message.dart';
import 'package:catch_dating_app/contexts/messaging/domain/event_chat.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_follow_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_name_lookup.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_follow.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer_host_defaults.dart';
import 'package:catch_dating_app/contexts/payments/data/host_membership_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_history_repository.dart';
import 'package:catch_dating_app/contexts/payments/data/payment_repository.dart';
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
import 'package:catch_dating_app/contexts/profiles/profiles.dart'
    show UpdateUserProfilePatch;
import 'package:catch_dating_app/contexts/reviews/data/reviews_repository.dart';
import 'package:catch_dating_app/contexts/reviews/domain/review.dart';
import 'package:catch_dating_app/contexts/safety/data/safety_repository.dart';
import 'package:catch_dating_app/contexts/safety/parts/block_user_dialog.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_explore_card.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_controller.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_full_view_model.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/location_picker_screen.dart';
import 'package:catch_dating_app/events/presentation/saved_events_screen.dart';
import 'package:catch_dating_app/events/shared/attendance_sheet_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_cross_paths_provider.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_providers.dart';
import 'package:catch_dating_app/explore/presentation/explore_feed_view_model.dart';
import 'package:catch_dating_app/explore/presentation/explore_map_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_view_model.dart';
import 'package:catch_dating_app/explore/presentation/widgets/featured_event_poster.dart';
import 'package:catch_dating_app/hosts/create/create_basics_screen.dart';
import 'package:catch_dating_app/hosts/create/create_editor_screen.dart';
import 'package:catch_dating_app/hosts/create/create_flow_state.dart';
import 'package:catch_dating_app/hosts/create/create_handlers.dart';
import 'package:catch_dating_app/hosts/create/create_plan_body.dart';
import 'package:catch_dating_app/hosts/create/create_plan_screen.dart';
import 'package:catch_dating_app/hosts/create/create_route_screen.dart';
import 'package:catch_dating_app/hosts/create/create_share_screen.dart';
import 'package:catch_dating_app/hosts/create/create_tickets_screen.dart';
import 'package:catch_dating_app/hosts/create/create_when_screen.dart';
import 'package:catch_dating_app/hosts/create/edit_event_screen.dart';
import 'package:catch_dating_app/hosts/create/widgets/create_calendar_sheet.dart';
import 'package:catch_dating_app/hosts/door/door_scan_screen.dart';
import 'package:catch_dating_app/hosts/door/door_state.dart';
import 'package:catch_dating_app/hosts/events/events_controller.dart'
    show HostEventsRequest, hostEventsControllerProvider;
import 'package:catch_dating_app/hosts/events/events_screen.dart'
    show HostEventsTabScreen;
import 'package:catch_dating_app/hosts/events/rehearsal_practice_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_practice_tools_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_automations_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_preview_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_settings_screen.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_controller.dart';
import 'package:catch_dating_app/hosts/insights/host_event_photos_state.dart';
import 'package:catch_dating_app/hosts/insights/host_event_report_screen.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_controller.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_screen.dart';
import 'package:catch_dating_app/hosts/insights/host_insights_state.dart';
import 'package:catch_dating_app/hosts/live/live_screen.dart';
import 'package:catch_dating_app/hosts/onboarding/setup_state.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/messages_state.dart';
import 'package:catch_dating_app/hosts/people/people_state.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_editor.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_controller.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/create/create_event_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_builder_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_operations_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_payment_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_booking_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_route_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_profile_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/create/create_organizer_draft_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_organizer_edit_controller.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_team_management_controller.dart';
import 'package:catch_dating_app/hosts/today/host_today_screen.dart';
import 'package:catch_dating_app/image_uploads/shared/photo_upload_controller.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_application_screen.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_controller.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/onboarding/shared/onboarding_step_layout.dart';
import 'package:catch_dating_app/pages/account/auth_session_controller.dart';
import 'package:catch_dating_app/pages/account/settings_controller.dart';
import 'package:catch_dating_app/pages/celebration/celebration_effects_controller.dart';
import 'package:catch_dating_app/pages/chat/chat_screen.dart';
import 'package:catch_dating_app/pages/chat/widgets/chat_input.dart';
import 'package:catch_dating_app/pages/chat/widgets/chat_share_card.dart';
import 'package:catch_dating_app/pages/event/event_detail_route_transition.dart';
import 'package:catch_dating_app/pages/event/event_detail_screen.dart';
import 'package:catch_dating_app/pages/event/event_detail_view_model.dart';
import 'package:catch_dating_app/pages/event/widgets/who_is_going_section.dart';
import 'package:catch_dating_app/pages/inbox/chats_list_view_model.dart';
import 'package:catch_dating_app/pages/inbox/match_celebration_dialog.dart';
import 'package:catch_dating_app/pages/inbox/widgets/chats_sliver_header.dart';
import 'package:catch_dating_app/pages/onboarding/onboarding_controller.dart';
import 'package:catch_dating_app/pages/onboarding/onboarding_step.dart';
import 'package:catch_dating_app/pages/organizer/organizer_detail_screen.dart';
import 'package:catch_dating_app/pages/organizer/organizer_detail_screen_state.dart';
import 'package:catch_dating_app/pages/organizer/organizer_detail_view_model.dart';
import 'package:catch_dating_app/pages/organizer/widgets/organizer_detail_body.dart';
import 'package:catch_dating_app/pages/organizer/widgets/organizer_detail_dock.dart';
import 'package:catch_dating_app/pages/sign_in/auth_controller.dart';
import 'package:catch_dating_app/pages/start/onboarding_welcome_body.dart';
import 'package:catch_dating_app/pages/startup/splash_screen.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_screen.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_controller.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_screen.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_state.dart';
import 'package:catch_dating_app/safety/presentation/settings_keys.dart';
import 'package:catch_dating_app/safety/presentation/settings_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_host_photo_viewer_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_view_model.dart';
import 'package:catch_dating_app/swipes/presentation/filters_controller.dart';
import 'package:catch_dating_app/swipes/presentation/filters_screen.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_keys.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_body.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_view.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_sliver_header.dart';
import 'package:catch_dating_app/user_profile/presentation/widgets/profile_tab_body.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_kernel/brand.dart';
import 'package:catch_kernel/location_coordinate.dart';
import 'package:catch_l10n/generated/app_localizations_en.dart';
import 'package:catch_platform/app_config.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/device/device_location.dart';
import 'package:catch_platform/device/external_links.dart';
import 'package:catch_platform/device/external_share.dart';
import 'package:catch_platform/errors/app_error_message.dart';
import 'package:catch_platform/errors/app_exception.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/firebase/firebase_providers.dart';
import 'package:catch_platform/media/ordered_photo_picker.dart';
import 'package:catch_platform/media/uploaded_photo.dart';
import 'package:catch_platform/persistence/command_journal_provider.dart';
import 'package:catch_platform/persistence/memory_command_journal_storage.dart';
import 'package:catch_platform/riverpod_ui/catch_external_share_sheet.dart';
import 'package:catch_platform/riverpod_ui/catch_localized_error_banner.dart';
import 'package:catch_platform/riverpod_ui/catch_notice_feedback.dart';
import 'package:catch_test_support/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_test_support/design_fixtures/host_operations_fixtures.dart';
import 'package:catch_test_support/design_fixtures/matches_chat_surface_fixtures.dart';
import 'package:catch_test_support/design_fixtures/profile_surface_fixtures.dart';
import 'package:catch_test_support/design_fixtures/utility_surface_fixtures.dart';
import 'package:catch_test_support/events_test_helpers.dart';
import 'package:catch_test_support/organizers_test_helpers.dart'
    as organizer_test;
import 'package:catch_test_support/profile_readiness_fixtures.dart';
import 'package:catch_test_support/repo_file.dart';
import 'package:catch_test_support/test_pump_helpers.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_firestore/cloud_firestore.dart' show Timestamp;
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
    show Fake, Finder, WidgetTester, expect, find, findsOneWidget;
import 'package:image_picker/image_picker.dart';

import '../../hosts/events/events_fixtures.dart' as events_fixtures;
import '../../hosts/forms/forms_captures.dart';
import '../../hosts/live/formats/formats_captures.dart';
import '../../hosts/live/live_captures.dart';
import '../../hosts/onboarding/onboarding_captures.dart';
import '../../hosts/organizer/organizer_captures.dart';
import '../../hosts/organizer/organizer_fixtures.dart';
import '../../hosts/people/people_captures.dart';
import '../../hosts/people/people_fixtures.dart';
import '../../hosts/programmes/planner/planner_captures.dart';
import '../../hosts/programmes/staff/staff_captures.dart';
import '../fixtures/host_audience_journey_fixture.dart';
import '../fixtures/sales_demo_synthetic_fixtures.dart';
import '../support/capture_device.dart';
import 'entries/event_success_companion_first_hello_assigned.dart';
import 'entries/event_success_companion_micro_pod_assignment.dart';
import 'entries/guest_after_event.dart';
import 'entries/guest_book_sheet.dart';
import 'entries/guest_follow_host.dart';
import 'entries/guest_follow_host_follow_fragment.dart';
import 'entries/guest_follow_host_followers_fragment.dart';
import 'entries/guest_group_chat.dart';
import 'entries/guest_reminder.dart';
import 'entries/host_application_detail.dart';
import 'entries/host_automations_phone.dart';
import 'entries/host_create_colleges.dart';
import 'entries/host_create_communities.dart';
import 'entries/host_create_first_event.dart';
import 'entries/host_create_nightlife.dart';
import 'entries/host_create_racket_sports.dart';
import 'entries/host_create_runs.dart';
import 'entries/host_create_studios.dart';
import 'entries/host_create_suppers.dart';
import 'entries/host_create_teams.dart';
import 'entries/host_create_venues.dart';
import 'entries/host_door_arriving.dart';
import 'entries/host_door_arriving_new_guest_fragment.dart';
import 'entries/host_door_arriving_regular_fragment.dart';
import 'entries/host_door_in.dart';
import 'entries/host_event_share_links.dart';
import 'entries/host_event_share_links_whatsapp_fragment.dart';
import 'entries/host_form_responses_new_fragment.dart';
import 'entries/host_formats_courts_court_fragment.dart';
import 'entries/host_formats_courts_phone.dart';
import 'entries/host_formats_courts_setup_phone.dart';
import 'entries/host_formats_courts_sitting_out_fragment.dart';
import 'entries/host_formats_crawl_move_map_fragment.dart';
import 'entries/host_formats_crawl_move_message_fragment.dart';
import 'entries/host_formats_crawl_move_phone.dart';
import 'entries/host_formats_crawl_phone.dart';
import 'entries/host_formats_mix_phone.dart';
import 'entries/host_formats_pods_chatty_fragment.dart';
import 'entries/host_formats_pods_needs_pod_fragment.dart';
import 'entries/host_formats_pods_phone.dart';
import 'entries/host_formats_rules_consent_fragment.dart';
import 'entries/host_formats_rules_first_time_fragment.dart';
import 'entries/host_formats_rules_phone.dart';
import 'entries/host_home_dashboard.dart';
import 'entries/host_insights_phone.dart';
import 'entries/host_live_console.dart';
import 'entries/host_live_needs_phone.dart';
import 'entries/host_live_now_tablet.dart';
import 'entries/host_live_scores_phone.dart';
import 'entries/host_live_scores_standings_fragment.dart';
import 'entries/host_live_scores_team_fragment.dart';
import 'entries/host_live_scores_third_team_fragment.dart';
import 'entries/host_live_tablet_colleges.dart';
import 'entries/host_live_tablet_communities.dart';
import 'entries/host_live_tablet_creators.dart';
import 'entries/host_live_tablet_facilities.dart';
import 'entries/host_live_tablet_outdoors.dart';
import 'entries/host_live_tablet_racket_sports.dart';
import 'entries/host_live_tablet_runs.dart';
import 'entries/host_live_tablet_studios.dart';
import 'entries/host_live_tablet_suppers.dart';
import 'entries/host_live_tablet_teams.dart';
import 'entries/host_live_tablet_venues.dart';
import 'entries/host_live_tablet_workshops.dart';
import 'entries/host_organizer_memberships.dart';
import 'entries/host_organizer_payments_phone.dart';
import 'entries/host_organizer_team_phone.dart';
import 'entries/host_people_drifting_fragment.dart';
import 'entries/host_people_phone.dart';
import 'entries/host_people_regular_fragment.dart';
import 'entries/host_person_phone.dart';
import 'entries/host_post_event_report.dart';
import 'entries/host_post_event_report_more.dart';
import 'entries/host_programme_guests_desktop.dart';
import 'entries/host_programme_inbox_phone.dart';
import 'entries/host_programme_live_board_desktop.dart';
import 'entries/host_programme_message_phone.dart';
import 'entries/host_programme_reconcile_desktop.dart';
import 'entries/host_programme_rooms_desktop.dart';
import 'entries/host_response_phone.dart';
import 'entries/host_responses_phone.dart';
import 'entries/host_staff_arrivals_phone.dart';
import 'entries/host_staff_departures_phone.dart';
import 'entries/host_staff_door_phone.dart';
import 'entries/match_chat_context.dart';
import 'entries/member_event_discovery.dart';
import 'screen_capture_entry.dart';
import 'shared/app_role_capture.dart';
import 'shared/capture_fixtures.dart';
import 'shared/capture_viewer.dart';
import 'shared/door_capture.dart';
import 'shared/event_success_companion_capture.dart';
import 'shared/host_insights_capture.dart';
import 'shared/host_live_capture.dart';
import 'shared/host_routed_shell_capture.dart';
import 'shared/host_shell_capture_overrides.dart';
import 'shared/match_chat_fixtures.dart';
import 'shared/member_discovery_fixtures.dart';

export 'screen_capture_entry.dart';

part 'host_audience_capture_fixtures.dart';

final _profileHeroImage = FileImage(
  repoFile('test/goldens/fixtures/portrait.jpg'),
);
const _organizerHeroPortraitAssetPath =
    'assets/fixtures/club_hero_portrait.jpg';
const _organizerHeroPortraitAssetImage = AssetImage(
  _organizerHeroPortraitAssetPath,
);
const _profilePortraitAssetPath = 'assets/fixtures/profile_portrait.jpg';
const _profilePortraitAssetImage = AssetImage(_profilePortraitAssetPath);

/// Event scenes (a social run, a rooftop social, a long dinner table, a
/// pickleball doubles game) for photos a host shares after an event.
const _eventScenePhotoAssetPaths = [
  'assets/fixtures/event_social_run.jpg',
  'assets/fixtures/event_rooftop_social.jpg',
  'assets/fixtures/event_dinner_table.jpg',
  'assets/fixtures/event_pickleball.jpg',
];
const _eventScenePhotoAssetImages = [
  AssetImage('assets/fixtures/event_social_run.jpg'),
  AssetImage('assets/fixtures/event_rooftop_social.jpg'),
  AssetImage('assets/fixtures/event_dinner_table.jpg'),
  AssetImage('assets/fixtures/event_pickleball.jpg'),
];
const _eventScenePhotoSizes = [
  (1200, 675),
  (1200, 668),
  (1200, 900),
  (1200, 900),
];
final _organizerHeroPortraitBytes = repoFile(
  _organizerHeroPortraitAssetPath,
).readAsBytesSync();
final _profilePortraitBytes = repoFile(
  _profilePortraitAssetPath,
).readAsBytesSync();
final _hostMediaCaptureImages = <ImageProvider<Object>>[
  MemoryImage(_organizerHeroPortraitBytes),
  MemoryImage(_profilePortraitBytes),
];
final _eventDetailOrganizer = organizer_test.buildOrganizer(
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
  organizerId: _eventDetailOrganizer.id,
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
final _eventDetailOrganizersRepository =
    organizer_test.FakeOrganizersRepository()
      ..organizersById[_eventDetailOrganizer.id] = _eventDetailOrganizer;
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
    organizersRepositoryProvider.overrideWithValue(
      _eventDetailOrganizersRepository,
    ),
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
      organizerId: _eventDetailEvent.organizerId,
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
    eventId: memberDiscoveryEvents[2].id,
    organizerId: memberDiscoveryEvents[2].organizerId,
    startTime: memberDiscoveryEvents[2].startTime,
    endTime: memberDiscoveryEvents[2].endTime,
    meetingPoint: memberDiscoveryEvents[2].meetingPoint,
    activityKind: memberDiscoveryEvents[2].activityKind,
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
final _unclaimedDiscoveryOrganizer = captureFixtures
    .captureOrganizer(
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
      hostProfiles: const <OrganizerHostProfile>[],
    );
final _unclaimedDiscoveryEvent = captureFixtures.captureEvent(
  id: 'event-discovery-unclaimed-supper',
  organizer: _unclaimedDiscoveryOrganizer,
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
    organizer: _unclaimedDiscoveryOrganizer,
    distanceFromUserKm: 1.7,
  ),
];

List<Object> _exploreProviderOverrides({
  AsyncValue<List<Organizer>>? sourceOrganizers,
  AsyncValue<ExploreViewModel>? viewModel,
  AsyncValue<ExploreFeedViewModel>? feed,
  String? uid = captureViewerUid,
  Set<String> joinedOrganizerIds = const <String>{},
  List<CrossPathsSuggestion>? crossPathsSuggestions,
  DeviceLocation Function()? deviceLocationBuilder,
}) {
  final effectiveSourceOrganizers =
      sourceOrganizers ?? AsyncData<List<Organizer>>(memberDiscoveryOrganizers);
  final effectiveViewModel =
      viewModel ??
      AsyncData(
        ExploreViewModel.partition(
          organizers: memberDiscoveryOrganizers,
          joinedOrganizerIds: joinedOrganizerIds,
        ),
      );
  final effectiveFeed =
      feed ??
      AsyncData(
        ExploreFeedViewModel(
          items: memberDiscoveryItems,
          featuredEventId: memberDiscoveryItems.first.event.id,
        ),
      );

  return [
    cityListProvider.overrideWith((ref) async => memberDiscoveryCities),
    deviceLocationProvider.overrideWith(
      deviceLocationBuilder ?? CaptureDeviceLocation.new,
    ),
    uidProvider.overrideWith((ref) => Stream.value(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(uid == null ? null : captureViewer),
    ),
    exploreSourceOrganizersProvider.overrideWithValue(
      effectiveSourceOrganizers,
    ),
    exploreOrganizersViewModelProvider.overrideWithValue(effectiveViewModel),
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

class _CaptureBandraDeviceLocation extends DeviceLocation {
  @override
  Future<LocationCoordinate?> build() async =>
      const LocationCoordinate(19.064, 72.835);
}

class _NoopCelebrationEffectsController extends CelebrationEffectsController {
  @override
  Future<void> play(CelebrationMomentKind kind) async {}

  @override
  Future<void> dispose() async {}
}

const _matchChatEmptyOtherProfile = PublicProfile(
  uid: 'nyc_tara_reference_001',
  name: 'Tara',
  age: 28,
  gender: Gender.woman,
  city: 'Mumbai',
  occupation: 'Producer',
  company: 'Saffron Table',
);
final _matchChatEmptyEvent = buildEvent(
  id: 'event-match-chat-empty',
  organizerId: 'club-match-chat-empty',
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
  user1Id: matchChatViewerUid,
  user2Id: _matchChatEmptyOtherProfile.uid,
  eventIds: [_matchChatEmptyEvent.id],
  createdAt: DateTime(2026, 6, 14, 18, 45),
);

final _captureNow = DateTime(2026, 5, 31, 9);
final _filtersCaptureProfile = captureViewer.copyWith(
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
      appBar: CatchLegacyTopBar.route(
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

OrganizerFollow _captureMembership({
  required String organizerId,
  required String uid,
}) => OrganizerFollow(
  id: organizerFollowId(organizerId: organizerId, uid: uid),
  organizerId: organizerId,
  uid: uid,
  status: OrganizerFollowStatus.active,
  pushNotificationsEnabled: true,
  followedAt: DateTime(2026, 1, 12),
);

final _dashboardJoinedOrganizer = captureFixtures.captureOrganizer(
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
final _dashboardHostOrganizer = captureFixtures.hostDemoOrganizer();
final _dashboardSignedUpEvent = captureFixtures.captureEvent(
  id: 'event-dashboard-next',
  organizer: _dashboardJoinedOrganizer,
  startTime: DateTime(2026, 6, 4, 6, 30),
  endTime: DateTime(2026, 6, 4, 7, 40),
  meetingPoint: 'Bandra Fort gate',
  bookedCount: 18,
  capacityLimit: 24,
  description: 'A conversational dawn loop with coffee after.',
);
final _dashboardCheckInEvent = captureFixtures.captureEvent(
  id: 'event-dashboard-check-in',
  organizer: _dashboardJoinedOrganizer,
  startTime: _captureNow.add(const Duration(minutes: 5)),
  endTime: _captureNow.add(const Duration(hours: 1, minutes: 10)),
  meetingPoint: 'Bandra Fort gate',
  bookedCount: 18,
  capacityLimit: 24,
  description: 'A conversational dawn loop with coffee after.',
);
final _dashboardHostEvent = captureFixtures.hostDemoEvent(
  role: 'hostEventSetup',
  organizer: _dashboardHostOrganizer,
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
final _dashboardRecommendedEvent = captureFixtures.captureEvent(
  id: 'event-dashboard-recommended',
  organizer: memberDiscoveryOrganizers[2],
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
  memberDiscoveryEvents[1],
  memberDiscoveryEvents[2],
];
final _savedEventsPastOnlyEvents = [
  _dashboardRecommendedEvent.copyWith(
    id: 'event-saved-past-pickleball',
    startTime: DateTime(2026, 5, 24, 18),
    endTime: DateTime(2026, 5, 24, 19, 30),
  ),
  memberDiscoveryEvents[1].copyWith(
    id: 'event-saved-past-dinner',
    startTime: DateTime(2026, 5, 25, 20),
    endTime: DateTime(2026, 5, 25, 22),
  ),
];
final _dashboardAttendedEvents = [
  captureFixtures.captureEvent(
    id: 'event-dashboard-attended',
    organizer: _dashboardJoinedOrganizer,
    startTime: DateTime(2026, 5, 30, 7),
    endTime: DateTime(2026, 5, 30, 8, 5),
    meetingPoint: 'Carter Road Amphitheatre',
    bookedCount: 20,
    checkedInCount: 18,
    capacityLimit: 24,
    description: 'Easy miles and a coffee line that did not feel awkward.',
  ),
];
final _dashboardAfterEventFocusEvent = captureFixtures.captureEvent(
  id: 'event-dashboard-after-focus',
  organizer: _dashboardJoinedOrganizer,
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
    uid: captureViewerUid,
    type: ActivityNotificationType.match,
    title: 'New connection',
    body: 'Maya picked you too after Sunday Table Club.',
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
    errorLoggerProvider.overrideWithValue(CaptureSilentErrorLogger()),
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
    errorLoggerProvider.overrideWithValue(CaptureSilentErrorLogger()),
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
      _createOrganizerPngBytes(),
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
  Stream<List<OrganizerFollow>>? membershipsStream,
  Stream<List<Event>>? signedUpEventsStream,
  List<OrganizerFollow>? memberships,
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
          organizerId: _dashboardJoinedOrganizer.id,
          uid: captureViewerUid,
        ),
      ];
  final effectiveSignedUpEvents = signedUpEvents ?? _dashboardSignedUpEvents;
  final followedOrganizerIds = effectiveMemberships
      .map((membership) => membership.organizerId)
      .toList(growable: false);
  final recommendationsQuery = ExploreRecommendationsQuery(
    userId: captureViewerUid,
    followedOrganizerIds: followedOrganizerIds,
  );

  return [
    dashboardNowProvider.overrideWithValue(_captureNow),
    uidProvider.overrideWith((ref) => Stream.value(captureViewerUid)),
    watchUserProfileProvider.overrideWith(
      (ref) => profileStream ?? Stream.value(captureViewer),
    ),
    watchActiveOrganizerFollowsForUserProvider(captureViewerUid).overrideWith(
      (ref) =>
          membershipsStream ??
          Stream<List<OrganizerFollow>>.value(effectiveMemberships),
    ),
    watchSignedUpEventCardsProvider(captureViewerUid).overrideWith(
      (ref) =>
          (signedUpEventsStream ??
                  Stream<List<Event>>.value(effectiveSignedUpEvents))
              .map(guestEventCardsOf),
    ),
    watchAttendedEventCardsProvider(captureViewerUid).overrideWithValue(
      _captureCardsAsync(attendedEvents ?? AsyncData(_dashboardAttendedEvents)),
    ),
    watchActivityNotificationsProvider(
      captureViewerUid,
    ).overrideWithValue(notifications ?? AsyncData(_dashboardNotifications)),
    organizersRepositoryProvider.overrideWith(
      (ref) => _captureOrganizersRepository,
    ),
    watchOrganizersHostedByProvider(
      captureViewerUid,
    ).overrideWithValue(AsyncData([_dashboardHostOrganizer])),
    watchOrganizersOwnedByProvider(
      captureViewerUid,
    ).overrideWithValue(const AsyncData([])),
    watchEventsForOrganizerProvider(
      _dashboardHostOrganizer.id,
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
      captureViewerUid,
    ).overrideWithValue(reviews ?? const AsyncData<List<Review>>([])),
    exploreRecommendedEventsProvider(recommendationsQuery).overrideWithValue(
      recommendations ??
          AsyncData([
            ExploreEventRecommendationCandidate(
              event: _dashboardRecommendedEvent,
              organizerName: memberDiscoveryOrganizers[2].name,
              organizerLocation: memberDiscoveryOrganizers[2].location,
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

final _captureOrganizersRepository = organizer_test.FakeOrganizersRepository()
  ..organizersById[_dashboardJoinedOrganizer.id] = _dashboardJoinedOrganizer
  ..organizersById[_dashboardHostOrganizer.id] = _dashboardHostOrganizer
  ..organizersById[memberDiscoveryOrganizers[0].id] =
      memberDiscoveryOrganizers[0]
  ..organizersById[memberDiscoveryOrganizers[1].id] =
      memberDiscoveryOrganizers[1]
  ..organizersById[memberDiscoveryOrganizers[2].id] =
      memberDiscoveryOrganizers[2];

List<Object> _calendarProviderOverrides({
  AsyncValue<String?> uid = const AsyncData<String?>(captureViewerUid),
  AsyncValue<List<Event>>? signedUpEvents,
  AsyncValue<List<Event>>? savedEvents,
  AsyncValue<Map<String, String>>? organizerNames,
}) {
  final effectiveSignedUpEvents =
      signedUpEvents ?? AsyncData<List<Event>>(_dashboardSignedUpEvents);
  final effectiveSavedEvents =
      savedEvents ?? AsyncData<List<Event>>(_dashboardSavedEvents);
  final organizerNameQuery = OrganizerNameLookupQuery([
    for (final event in _asyncDataList(effectiveSignedUpEvents))
      event.organizerId,
    for (final event in _asyncDataList(effectiveSavedEvents)) event.organizerId,
  ]);

  return <Object>[
    uidProvider.overrideWithValue(uid),
    watchSignedUpEventCardsProvider(
      captureViewerUid,
    ).overrideWithValue(_captureCardsAsync(effectiveSignedUpEvents)),
    watchSavedEventCardsProvider(
      captureViewerUid,
    ).overrideWithValue(_captureCardsAsync(effectiveSavedEvents)),
    organizersRepositoryProvider.overrideWith(
      (ref) => _captureOrganizersRepository,
    ),
    if (organizerNames != null)
      organizerNameLookupProvider(
        organizerNameQuery,
      ).overrideWithValue(organizerNames),
  ];
}

List<T> _asyncDataList<T>(AsyncValue<List<T>> value) {
  return switch (value) {
    AsyncData<List<T>>(:final value) => value,
    _ => <T>[],
  };
}

List<Object> _savedEventsProviderOverrides({
  AsyncValue<String?> uid = const AsyncData<String?>(captureViewerUid),
  AsyncValue<List<Event>>? savedEvents,
  AsyncValue<Map<String, String>>? organizerNames,
}) {
  final effectiveSavedEvents =
      savedEvents ?? AsyncData<List<Event>>(_dashboardSavedEvents);
  final events = _asyncDataList(effectiveSavedEvents);
  final organizerNameQuery = OrganizerNameLookupQuery(
    events.map((event) => event.organizerId),
  );

  return <Object>[
    uidProvider.overrideWithValue(uid),
    watchSavedEventCardsProvider(
      captureViewerUid,
    ).overrideWithValue(_captureCardsAsync(effectiveSavedEvents)),
    organizersRepositoryProvider.overrideWith(
      (ref) => _captureOrganizersRepository,
    ),
    if (events.isNotEmpty)
      organizerNameLookupProvider(organizerNameQuery).overrideWithValue(
        organizerNames ??
            AsyncData<Map<String, String>>(_organizerNamesForEvents(events)),
      ),
  ];
}

Map<String, String> _organizerNamesForEvents(List<Event> events) {
  return <String, String>{
    for (final event in events)
      event.organizerId:
          _captureOrganizersRepository
              .organizersById[event.organizerId]
              ?.name ??
          event.organizerId,
  };
}

final _organizerDetailOrganizer = captureFixtures.captureOrganizer(
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
final _organizerDetailEvents = [
  captureFixtures.captureEvent(
    id: 'event-club-detail-sunrise',
    organizer: _organizerDetailOrganizer,
    startTime: DateTime(2026, 6, 2, 6, 45),
    meetingPoint: 'Bandstand promenade',
    distanceKm: 6,
    bookedCount: 16,
    capacityLimit: 22,
    description: 'Morning miles with regroup points and a cafe finish.',
  ),
  captureFixtures.captureEvent(
    id: 'event-club-detail-weekend',
    organizer: _organizerDetailOrganizer,
    startTime: DateTime(2026, 6, 7, 8),
    meetingPoint: 'Bandra Fort gate',
    activityKind: ActivityKind.walking,
    distanceKm: 3,
    bookedCount: 19,
    capacityLimit: 28,
    description: 'A social weekend walk for new members.',
  ),
];
final _organizerDetailReviews = [
  buildReview(
    id: 'review-club-detail-1',
    organizerId: _organizerDetailOrganizer.id,
    reviewerUserId: 'runner-neha',
    reviewerName: 'Neha',
    comment: 'Friendly hosts, clear routes, and zero awkward hovering.',
    createdAt: DateTime(2026, 5, 24),
  ),
];

OrganizerDetailViewModel _organizerDetailViewModel({
  Organizer? organizer,
  String? uid = captureViewerUid,
  bool isHost = false,
  bool isMember = true,
  bool isAuthenticated = true,
  List<Event>? upcomingEvents,
  List<Review>? reviews,
  UserProfile? userProfile,
  bool includeUserProfile = true,
}) {
  return OrganizerDetailViewModel(
    organizer: organizer ?? _organizerDetailOrganizer,
    isHost: isHost,
    isMember: isMember,
    upcomingEvents: upcomingEvents ?? _organizerDetailEvents,
    reviews: reviews ?? _organizerDetailReviews,
    userProfile: includeUserProfile ? userProfile ?? captureViewer : null,
    uid: uid,
    isAuthenticated: isAuthenticated,
  );
}

List<Object> _organizerDetailProviderOverrides({
  String? uid = captureViewerUid,
  OrganizerFollow? membership,
  required AsyncValue<OrganizerDetailViewModel?> viewModel,
}) {
  final effectiveUid = uid;
  return [
    uidProvider.overrideWith((ref) => Stream.value(effectiveUid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(effectiveUid == null ? null : captureViewer),
    ),
    if (effectiveUid != null)
      watchOrganizerFollowProvider(
        _organizerDetailOrganizer.id,
        effectiveUid,
      ).overrideWith((ref) => Stream.value(membership)),
    organizerDetailViewModelProvider(
      _organizerDetailOrganizer.id,
    ).overrideWith((ref) => viewModel),
  ];
}

Widget _organizerDetailScreenCapture({bool includeInitialOrganizer = true}) {
  return OrganizerDetailScreen(
    organizerId: _organizerDetailOrganizer.id,
    initialOrganizer: includeInitialOrganizer
        ? _organizerDetailOrganizer
        : null,
  );
}

Widget _organizerDetailMutationCapture({
  required bool isMember,
  required bool isAuthenticated,
  bool isMutating = false,
  Object? mutationError,
}) {
  final dockState = !isAuthenticated
      ? OrganizerDetailDockRole.guest
      : isMember
      ? OrganizerDetailDockRole.member
      : OrganizerDetailDockRole.visitor;
  final footnote = switch (dockState) {
    OrganizerDetailDockRole.visitor => 'FREE TO JOIN · LEAVE ANYTIME',
    OrganizerDetailDockRole.member => 'MEMBER · MANAGE ANYTIME',
    _ => null,
  };

  return Scaffold(
    body: Column(
      children: [
        if (mutationError != null)
          CatchLocalizedErrorBanner(
            mutationError,
            context: AppErrorContext.organizer,
            onRetry: () {},
          ),
        Expanded(
          child: OrganizerDetailBody(
            state: OrganizerDetailBodyState.fromDomain(
              organizer: _organizerDetailOrganizer,
              upcomingEvents: _organizerDetailEvents,
              reviews: _organizerDetailReviews,
              userProfile: isAuthenticated ? captureViewer : null,
              uid: isAuthenticated ? captureViewerUid : null,
              isMember: isMember,
              isMutating: isMutating,
              organizerPushNotificationsEnabled: isMember,
              isAuthenticated: isAuthenticated,
            ),
          ),
        ),
      ],
    ),
    bottomNavigationBar: OrganizerDetailDock(
      state: dockState,
      activityKind: _organizerDetailOrganizer.hostDefaults.primaryActivityKind,
      members: _organizerDetailOrganizer.memberCount,
      footnote: footnote,
      isJoinLoading: isMutating,
      onSignIn: () {},
      onJoin: () {},
      onManage: () {},
      onBell: () {},
    ),
  );
}

// Today on the system: tonight, what needs the host, the week and the last
// thirty days, on a Tuesday evening before doors.
final _hostTodayNow = DateTime(2026, 10, 27, 17, 40);
final _hostTodayWeek = [
  HostOperationsFixtures.event(
    id: 'design-today-run',
    organizer: hostTodayOrganizer,
    start: DateTime(2026, 11, 1, 6, 30),
    bookedCount: 32,
    capacityLimit: 40,
    meetingPoint: 'Carter Road Promenade',
  ).copyWith(name: 'Salt Air Social Run'),
  HostOperationsFixtures.event(
    id: 'design-today-supper',
    organizer: hostTodayOrganizer,
    start: DateTime(2026, 10, 29, 20),
    bookedCount: 14,
    capacityLimit: 14,
    activityKind: ActivityKind.dinner,
    meetingPoint: 'The Long Table, Khar',
  ).copyWith(name: 'Long Table Supper'),
  HostOperationsFixtures.event(
    id: 'design-today-ladder',
    organizer: hostTodayOrganizer,
    start: DateTime(2026, 11, 2, 7),
    bookedCount: 9,
    capacityLimit: 16,
    activityKind: ActivityKind.pickleball,
    meetingPoint: 'Otters Club Courts',
  ).copyWith(name: 'Pickleball Ladder'),
];

HostAttentionItem _hostTodayAttention(
  String id,
  HostAttentionKind kind,
  HostAttentionUrgency urgency, {
  required int count,
  required DateTime dueAt,
}) => HostAttentionItem(
  id: 'design-today-$id',
  kind: kind,
  scope: HostAttentionScope.event,
  sourceOwner: HostAttentionSourceOwner.events,
  sourceId: hostTodayTonight.id,
  sourceRevision: 'capture-$id',
  eventId: hostTodayTonight.id,
  status: HostAttentionStatus.open,
  consequence: HostAttentionConsequence.risksGuestExperience,
  blocking: false,
  urgency: urgency,
  destination: HostAttentionDestination(
    route: HostAttentionDestinationRoute.hostEventManage,
    section: 'guests',
    eventId: hostTodayTonight.id,
  ),
  context: HostAttentionContext(
    eventName: hostTodayTonight.title,
    count: count,
  ),
  dedupeKey: '${kind.name}:${hostTodayTonight.id}',
  policyVersion: 1,
  resolutionVersion: 1,
  assignedHostUid: null,
  openedAt: _hostTodayNow.subtract(const Duration(hours: 2)),
  dueAt: dueAt,
  expiresAt: hostTodayTonight.endTime,
);

final _hostTodayAttentionItems = [
  _hostTodayAttention(
    'join',
    HostAttentionKind.eventJoinRequestReview,
    HostAttentionUrgency.immediate,
    count: 2,
    dueAt: DateTime(2026, 10, 27, 18),
  ),
  _hostTodayAttention(
    'waitlist',
    HostAttentionKind.eventWaitlistReview,
    HostAttentionUrgency.soon,
    count: 4,
    dueAt: DateTime(2026, 10, 27, 18, 30),
  ),
  _hostTodayAttention(
    'delivery',
    HostAttentionKind.eventAssistanceDeliveryReview,
    HostAttentionUrgency.upcoming,
    count: 26,
    dueAt: DateTime(2026, 10, 27, 19),
  ),
];

final _hostTodayAttendees = [
  for (final (index, name) in const [
    'Aanya Mehta',
    'Ishaan Sen',
    'Kabir Rao',
  ].indexed)
    EventAttendee(
      id: 'design-today-attendee-$index',
      eventId: hostTodayTonight.id,
      organizerId: hostTodayOrganizer.id,
      displayName: name,
      searchName: name.toLowerCase(),
      source: EventAttendeeSource.catchBooking,
      status: EventAttendeeStatus.registered,
      createdAt: _hostTodayNow.subtract(const Duration(days: 3)),
      updatedAt: _hostTodayNow.subtract(const Duration(days: 3)),
    ),
];

final _hostTodayRoster = HostEventRosterInsights(
  eventId: hostTodayTonight.id,
  organizerId: hostTodayOrganizer.id,
  cutoffAt: hostTodayTonight.startTime,
  sourceCoverage: HostRosterInsightCoverage.exact,
  spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
  rows: [
    for (var index = 0; index < 26; index++)
      HostEventRosterInsight(
        attendeeId: 'design-today-roster-$index',
        contactId: null,
        availability: HostRosterInsightAvailability.ready,
        signals: {
          index < 9
              ? HostRosterInsightSignal.firstTime
              : HostRosterInsightSignal.returning,
        },
        priorAttendedEventCount: index < 9 ? 0 : 2,
        priorExpectedEventCount: index < 9 ? 0 : 2,
        priorNoShowCount: 0,
        lastAttendedAt: null,
        attendanceRate: null,
        catchSpend: const [],
      ),
  ],
  computedAt: _hostTodayNow,
);

List<Object> _hostTodayCaptureOverrides() => [
  ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
  ...hostOperationsProviderOverrides(
    hostedOrganizers: [hostTodayOrganizer],
    ownedOrganizers: [hostTodayOrganizer],
    organizerEvents: {
      hostTodayOrganizer.id: AsyncData<List<Event>>([
        hostTodayTonight,
        ..._hostTodayWeek,
      ]),
    },
    attentionByOrganizer: {hostTodayOrganizer.id: _hostTodayAttentionItems},
  ),
  watchEventAttendeesProvider(
    hostTodayTonight.id,
  ).overrideWith((ref) => Stream.value(_hostTodayAttendees)),
  hostEventRosterInsightsProvider(
    hostTodayTonight.id,
  ).overrideWith((ref) => Stream.value(_hostTodayRoster)),
];

// The create flow boards: each step screen with the trivia night from the
// boards, filled as far as that step, and the desktop editor on the basics.
final _createToday = DateTime(2026, 10, 27);
final _createDraft = EventDraft(
  id: 'capture-create-draft',
  organizerId: hostTodayOrganizer.id,
  savedAt: _createToday,
  name: 'Tuesday Trivia Night',
  activityKind: 'pubQuiz',
  interactionModel: 'teamRotations',
  description:
      'Six rounds, teams of four made up on the night. Come alone or bring '
      'friends.',
  eventLocalDate: '2026-10-27',
  eventLocalStartTime: '19:30',
  durationMinutes: 150,
  meetingPoint: 'Harbour Room',
  meetingLocationAddress: 'Chimbai Road, Bandra West',
  locationDetails: 'First floor, ask for Lantern Lane',
  startingPointLat: 19.0596,
  startingPointLng: 72.8295,
  price: '499',
  capacity: '30',
  itinerary: createPlanTemplate(AppLocalizationsEn(), CreateFormat.quiz, 150),
);

CreateFlowState _createState(CreateStep step, {EventDraft? draft}) =>
    CreateFlowState(
      organizer: hostTodayOrganizer,
      draft: draft ?? _createDraft,
      step: step,
      eventId: step.index >= CreateStep.tickets.index ? 'capture-event' : null,
      published: step == CreateStep.share,
    );

void _ignore(Object? _) {}

final _createHandlers = CreateHandlers(
  onBack: () {},
  onNext: () {},
  onSaveDraft: () {},
  onStep: _ignore,
  onName: _ignore,
  onFormat: _ignore,
  onDescription: _ignore,
  onDistance: _ignore,
  onPace: _ignore,
  onAddPhoto: () {},
  onDate: _ignore,
  onPickDate: () {},
  onStart: () {},
  onEnd: () {},
  onPlace: () {},
  onDirections: _ignore,
  onSellElsewhere: _ignore,
  onPrice: _ignore,
  onPlaces: _ignore,
  onAdmission: _ignore,
  onTemplate: () {},
  onBlank: () {},
  onEditStep: _ignore,
  onAddStep: () {},
  onCopyLink: () {},
  onPrint: () {},
  onShareStory: () {},
  onShareWhatsApp: () {},
  onDone: () {},
);

Widget _createCapture(Widget screen) => CatchRoot(child: screen);

// The organiser tab, Your page, Payments, Team and Settings on the fixture
// organizer, live on the web with a bill and Razorpay connected.
List<Object> _organizerCaptureOverrides() => [
  ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
  ...hostOperationsProviderOverrides(
    hostedOrganizers: [organizerCaptureOrganizer],
    ownedOrganizers: [organizerCaptureOrganizer],
  ),
  ...organizerCaptureOverrides(),
];

Widget _hostTodayCapture() => HostRoutedShellCapture(
  initialLocation: '/host/today',
  activeIndex: 0,
  child: HostTodayScreen(
    initialOrganizerId: hostTodayOrganizer.id,
    now: _hostTodayNow,
  ),
);

// The Events tab the afternoon before Tuesday trivia: tonight and three more
// coming nights, a draft, last Sunday's run and a wedding programme, through
// the real Host shell with Events selected.
final _hostEventsOrganizer = HostOperationsFixtures.primaryOrganizer;

List<Object> _hostEventsCaptureOverrides() => [
  ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
  ...hostOperationsProviderOverrides(
    hostedOrganizers: [_hostEventsOrganizer],
    ownedOrganizers: [_hostEventsOrganizer],
  ),
  hostEventsControllerProvider(
    HostEventsRequest(
      organizerId: _hostEventsOrganizer.id,
      now: events_fixtures.eventsNow,
    ),
  ).overrideWithValue(events_fixtures.eventsReady()),
];

Widget _hostEventsCapture() => HostRoutedShellCapture(
  initialLocation: '/host/events',
  activeIndex: 1,
  child: HostEventsTabScreen(
    initialOrganizerId: _hostEventsOrganizer.id,
    now: events_fixtures.eventsNow,
  ),
);

// The camera stands in as a plain night tile; the sheet is the scan that
// just checked Dev Patel in.
Widget _doorScanCapture() => DoorScanScreen(
  eventId: doorEvent.id,
  checkedIn: 20,
  expected: 26,
  camera: const ColoredBox(color: Colors.black),
  onClose: () {},
  onNext: () {},
  onUndo: () {},
  result: const HostDoorGuest(
    attendeeId: 'design-door-dp',
    name: 'Dev Patel',
    status: HostDoorGuestStatus.checkedIn,
    firstTime: true,
    paidMinor: 99800,
    paidCurrency: 'INR',
  ),
);

// Insights on the system: the last thirty days of a busy organizer, with
// this week still filling.
// The event report the night of a trivia event: who came, what guests said
// and the next Tuesday to bring them back to.
final _hostReportNow = DateTime(2026, 10, 27, 23, 10);
final _hostReportEvent =
    HostOperationsFixtures.event(
      id: 'design-report-trivia',
      organizer: hostTodayOrganizer,
      start: DateTime(2026, 10, 27, 19, 30),
      bookedCount: 24,
      capacityLimit: 30,
      activityKind: ActivityKind.pubQuiz,
      meetingPoint: 'Harbour Room, Bandra West',
    ).copyWith(
      name: 'Tuesday Trivia Night',
      endTime: DateTime(2026, 10, 27, 22, 5),
    );
final _hostReportNext = HostOperationsFixtures.event(
  id: 'design-report-next',
  organizer: hostTodayOrganizer,
  start: DateTime(2026, 11, 3, 19, 30),
  bookedCount: 0,
  capacityLimit: 30,
  activityKind: ActivityKind.pubQuiz,
  meetingPoint: 'Harbour Room, Bandra West',
).copyWith(name: 'Tuesday Trivia Night');

final _hostReportReviews = [
  for (final (index, (name, rating, comment)) in const [
    (
      'Rhea K.',
      5,
      'Came alone, left with a team for next week. The food round was '
          'brilliant.',
    ),
    (
      'Sameer S.',
      4,
      'Great host and a good crowd. It got loud by round two, but that '
          'was half the fun.',
    ),
    ('Ana D.', 5, 'Best quiz night in Bandra.'),
    ('Kabir R.', 5, 'Will be back.'),
    ('Ishaan S.', 4, 'Fun rounds.'),
    ('Zoya M.', 5, 'Loved the music round.'),
    ('Aanya M.', 5, 'Great host.'),
    ('Dev P.', 5, 'So much fun.'),
    ('Meera N.', 4, 'Good crowd.'),
    ('Arjun T.', 5, 'Brilliant.'),
    ('Tara B.', 5, 'Lovely evening.'),
    ('Nikhil G.', 5, 'Already booked the next one.'),
    ('Sana Q.', 5, 'Perfect Tuesday.'),
    ('Vikram L.', 5, 'Ten out of ten.'),
  ].indexed)
    Review(
      id: 'design-report-review-$index',
      organizerId: hostTodayOrganizer.id,
      eventId: _hostReportEvent.id,
      reviewerName: name,
      rating: rating,
      comment: comment,
      createdAt: _hostReportNow.subtract(Duration(minutes: index)),
    ),
];

List<Object> _hostReportCaptureOverrides() => [
  ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
  ...hostOperationsProviderOverrides(
    hostedOrganizers: [hostTodayOrganizer],
    ownedOrganizers: [hostTodayOrganizer],
    analyticsRepository: HostFixtureAnalyticsRepository(
      report: hostInsightsReport(
        topEvents: [
          hostInsightsNight(
            _hostReportEvent.id,
            'Tuesday Trivia Night',
            _hostReportEvent.startTime,
            booked: 24,
            fillRate: 80,
            rating: 4.8,
            revenue: 1297400,
            payments: 24,
            matches: 11,
          ),
        ],
      ),
    ),
  ),
  watchEventParticipationRosterProvider(_hostReportEvent.id).overrideWith(
    (ref) => Stream.value(
      EventParticipationRoster(
        bookedIds: [for (var index = 0; index < 24; index++) 'booked-$index'],
        checkedInIds: [for (var index = 0; index < 26; index++) 'came-$index'],
        waitlistedIds: const [],
      ),
    ),
  ),
  hostEventRosterInsightsProvider(_hostReportEvent.id).overrideWith(
    (ref) => Stream.value(
      HostEventRosterInsights(
        eventId: _hostReportEvent.id,
        organizerId: hostTodayOrganizer.id,
        cutoffAt: _hostReportEvent.startTime,
        sourceCoverage: HostRosterInsightCoverage.exact,
        spendCoverage: HostRosterSpendCoverage.catchPaymentsOnly,
        rows: [
          for (var index = 0; index < 26; index++)
            HostEventRosterInsight(
              attendeeId: 'design-report-roster-$index',
              contactId: null,
              availability: HostRosterInsightAvailability.ready,
              signals: {
                index < 9
                    ? HostRosterInsightSignal.firstTime
                    : HostRosterInsightSignal.returning,
              },
              priorAttendedEventCount: index < 9 ? 0 : 2,
              priorExpectedEventCount: index < 9 ? 0 : 2,
              priorNoShowCount: 0,
              lastAttendedAt: null,
              attendanceRate: null,
              catchSpend: const [],
            ),
        ],
        computedAt: _hostReportNow,
      ),
    ),
  ),
  watchEventAttendeesProvider(_hostReportEvent.id).overrideWith(
    (ref) => Stream.value([
      for (final (index, name) in const [
        'Rhea Kapoor',
        'Kabir Rao',
        'Ana Dsouza',
      ].indexed)
        EventAttendee(
          id: 'design-report-attendee-$index',
          eventId: _hostReportEvent.id,
          organizerId: hostTodayOrganizer.id,
          displayName: name,
          searchName: name.toLowerCase(),
          source: EventAttendeeSource.catchBooking,
          status: EventAttendeeStatus.registered,
          createdAt: _hostReportNow,
          updatedAt: _hostReportNow,
        ),
    ]),
  ),
  watchReviewsForEventProvider(
    _hostReportEvent.id,
  ).overrideWith((ref) => Stream.value(_hostReportReviews)),
  watchActiveEventsForOrganizerProvider(
    ActiveOrganizerEventsQuery(
      organizerId: hostTodayOrganizer.id,
      day: _hostReportNow,
    ),
  ).overrideWith((ref) => Stream.value([_hostReportNext])),
  eventHostPhotoAlbumProvider(
    _hostReportEvent.id,
  ).overrideWith((ref) async => _hostReportPhotoAlbum),
];

/// Three shared photos, drawn from the capture fixture portraits.
final _hostReportPhotoAlbum = EventHostPhotoAlbum(
  eventId: _hostReportEvent.id,
  organizerName: hostTodayOrganizer.name,
  access: EventHostPhotoAccess.host,
  maxPhotos: 100,
  photos: [
    for (final (index, path) in _eventScenePhotoAssetPaths.take(3).indexed)
      EventHostPhoto(
        photoId: 'capture-host-photo-$index',
        thumbnailUrl: path,
        displayUrl: path,
        width: _eventScenePhotoSizes[index].$1,
        height: _eventScenePhotoSizes[index].$2,
        uploadedByUid: HostOperationsFixtures.hostUid,
        createdAt: _hostReportNow.subtract(Duration(minutes: index)),
      ),
  ],
  urlsExpireAt: _hostReportNow.add(const Duration(minutes: 15)),
);

/// The report's photos while one picked photo uploads and one failed.
class _HostReportUploadingPhotosController extends HostEventPhotosController {
  @override
  Future<HostEventPhotosState> build(String eventId) async =>
      HostEventPhotosState(
        album: _hostReportPhotoAlbum,
        uploads: const [
          HostEventPhotoUpload(
            photoId: 'capture-upload-1',
            stage: HostEventPhotoUploadStage.uploading,
            progress: 0.64,
          ),
          HostEventPhotoUpload(
            photoId: 'capture-upload-2',
            stage: HostEventPhotoUploadStage.failed,
          ),
        ],
      );
}

Future<void> _driveHostReportToPhotos(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.byKey(const ValueKey('host-event-photos')),
    320,
    scrollable: findVerticalScrollable(
      within: find.byKey(const ValueKey('host-event-report-scroll-view')),
    ),
  );
  await pumpFeatureUi(tester);
}

Widget _hostReportCapture() => AppRoleCapture(
  role: AppRole.host,
  child: HostEventReportScreen(
    organizer: hostTodayOrganizer,
    event: _hostReportEvent,
    now: _hostReportNow,
  ),
);

enum _HostOrganizersMutationCaptureMode {
  inlinePending,
  inlineError,
  inlineOffline,
  teamPending,
  teamError,
  teamOffline,
}

class _HostOrganizersMutationCapture extends ConsumerStatefulWidget {
  const _HostOrganizersMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostOrganizersMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostOrganizersMutationCapture> createState() =>
      _HostOrganizersMutationCaptureState();
}

class _HostOrganizersMutationCaptureState
    extends ConsumerState<_HostOrganizersMutationCapture> {
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
    HostOrganizerEditController.updateOrganizerMutation.reset(ref);
    HostTeamManagementController.addHostMutation.reset(ref);
    HostTeamManagementController.removeHostMutation.reset(ref);
    HostTeamManagementController.transferOwnershipMutation.reset(ref);
  }

  void _seed() {
    switch (widget.mode) {
      case _HostOrganizersMutationCaptureMode.inlinePending:
        _runPending(HostOrganizerEditController.updateOrganizerMutation);
        break;
      case _HostOrganizersMutationCaptureMode.inlineError:
        _runError(
          HostOrganizerEditController.updateOrganizerMutation,
          StateError('Capture club update failed'),
        );
        break;
      case _HostOrganizersMutationCaptureMode.inlineOffline:
        _runError(
          HostOrganizerEditController.updateOrganizerMutation,
          obviousOfflineException(),
        );
        break;
      case _HostOrganizersMutationCaptureMode.teamPending:
        _runPending(HostTeamManagementController.removeHostMutation);
        break;
      case _HostOrganizersMutationCaptureMode.teamError:
        _runError(
          HostTeamManagementController.removeHostMutation,
          StateError('Capture host team update failed'),
        );
        break;
      case _HostOrganizersMutationCaptureMode.teamOffline:
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

List<OrderedPhotoPreview> _createHostMediaManagerPhotos() {
  return [
    for (var index = 0; index < 24; index++)
      OrderedPhotoPreview(
        id: 'host-media-manager-$index',
        bytes: index.isEven
            ? _organizerHeroPortraitBytes
            : _profilePortraitBytes,
        status: index == 3
            ? OrderedPhotoStatus.failed
            : OrderedPhotoStatus.ready,
      ),
  ];
}

Uint8List _createOrganizerPngBytes() {
  return base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAYAAABWdVznAAAAFkl'
    'EQVR42mO4Y+DwnxTMMKphVAN2DAApmUpA0AfJaAAAAABJRU5ErkJggg==',
  );
}

enum _HostCreateOrganizerMutationCaptureMode {
  saveDraftPending,
  saveDraftError,
  submitPending,
  submitError,
  submitOffline,
}

class _HostCreateOrganizerMutationCapture extends ConsumerStatefulWidget {
  const _HostCreateOrganizerMutationCapture({
    required this.mode,
    required this.child,
  });

  final _HostCreateOrganizerMutationCaptureMode mode;
  final Widget child;

  @override
  ConsumerState<_HostCreateOrganizerMutationCapture> createState() =>
      _HostCreateOrganizerMutationCaptureState();
}

class _HostCreateOrganizerMutationCaptureState
    extends ConsumerState<_HostCreateOrganizerMutationCapture> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _started) return;
      _started = true;
      CreateOrganizerController.submitMutation.reset(ref);
      CreateOrganizerDraftController.saveDraftMutation.reset(ref);
      switch (widget.mode) {
        case _HostCreateOrganizerMutationCaptureMode.saveDraftPending:
          _runPending(CreateOrganizerDraftController.saveDraftMutation);
          break;
        case _HostCreateOrganizerMutationCaptureMode.saveDraftError:
          _runError(
            CreateOrganizerDraftController.saveDraftMutation,
            StateError('Capture club draft save failed'),
          );
          break;
        case _HostCreateOrganizerMutationCaptureMode.submitPending:
          _runPending(CreateOrganizerController.submitMutation);
          break;
        case _HostCreateOrganizerMutationCaptureMode.submitError:
          _runError(
            CreateOrganizerController.submitMutation,
            StateError('Capture club submit failed'),
          );
          break;
        case _HostCreateOrganizerMutationCaptureMode.submitOffline:
          _runError(
            CreateOrganizerController.submitMutation,
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

List<Object> _hostCreateEventProviderOverrides({
  Organizer? organizer,
  AsyncValue<Organizer?>? organizerValue,
  List<EventDraft> drafts = const <EventDraft>[],
  String? uid = captureViewerUid,
}) {
  final resolvedOrganizer = organizer ?? _dashboardHostOrganizer;
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith((ref) => Stream.value(captureViewer)),
    fetchOrganizerProvider(resolvedOrganizer.id).overrideWithValue(
      organizerValue ?? AsyncData<Organizer?>(resolvedOrganizer),
    ),
    watchOrganizerProvider(resolvedOrganizer.id).overrideWithValue(
      organizerValue ?? AsyncData<Organizer?>(resolvedOrganizer),
    ),
    deviceLocationProvider.overrideWith(CaptureDeviceLocation.new),
    watchOrganizerEventVenuesProvider(
      resolvedOrganizer.id,
    ).overrideWith((ref) => Stream.value(const <OrganizerEventVenue>[])),
    watchOrganizerEventSuccessLayoutsProvider(
      resolvedOrganizer.id,
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

List<Object> _hostEditEventProviderOverrides({
  String? uid,
  AsyncValue<Organizer?>? organizerValue,
  AsyncValue<Event?>? eventValue,
  AsyncValue<EventPrivateAccess?>? privateAccessValue,
  Event? event,
}) {
  final effectiveEvent = event ?? _dashboardEditableHostEvent;
  final effectiveUid =
      uid ??
      _dashboardHostOrganizer.ownerOrPrimaryHostUserId ??
      HostOperationsFixtures.hostUid;
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(effectiveUid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(
        effectiveUid == HostOperationsFixtures.hostUid
            ? HostOperationsFixtures.owner
            : captureViewer,
      ),
    ),
    fetchOrganizerProvider(_dashboardHostOrganizer.id).overrideWithValue(
      organizerValue ?? AsyncData<Organizer?>(_dashboardHostOrganizer),
    ),
    watchOrganizerProvider(_dashboardHostOrganizer.id).overrideWithValue(
      organizerValue ?? AsyncData<Organizer?>(_dashboardHostOrganizer),
    ),
    watchEventProvider(
      effectiveEvent.id,
    ).overrideWithValue(eventValue ?? AsyncData<Event?>(effectiveEvent)),
    watchEventPrivateAccessProvider(effectiveEvent.id).overrideWithValue(
      privateAccessValue ?? const AsyncData<EventPrivateAccess?>(null),
    ),
    deviceLocationProvider.overrideWith(CaptureDeviceLocation.new),
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

List<Object> _hostOrganizerDetailProviderOverrides({
  String? uid = HostOperationsFixtures.hostUid,
  Organizer? organizer,
  OrganizerFollow? membership,
  AsyncValue<OrganizerDetailViewModel?>? viewModel,
}) {
  final effectiveOrganizer =
      organizer ?? _hostOrganizerDetailReferenceOrganizer;
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(uid)),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream.value(uid == null ? null : HostOperationsFixtures.owner),
    ),
    if (uid != null)
      watchOrganizerFollowProvider(
        effectiveOrganizer.id,
        uid,
      ).overrideWith((ref) => Stream<OrganizerFollow?>.value(membership)),
    organizerDetailViewModelProvider(effectiveOrganizer.id).overrideWith(
      (ref) =>
          viewModel ??
          AsyncData<OrganizerDetailViewModel?>(
            _hostOrganizerDetailViewModel(
              organizer: effectiveOrganizer,
              uid: uid,
            ),
          ),
    ),
  ];
}

OrganizerDetailViewModel _hostOrganizerDetailViewModel({
  Organizer? organizer,
  String? uid = HostOperationsFixtures.hostUid,
  bool? isHost,
  List<Event>? upcomingEvents,
  List<Review> reviews = const <Review>[],
}) {
  final effectiveOrganizer =
      organizer ?? _hostOrganizerDetailReferenceOrganizer;
  final defaultEvents =
      effectiveOrganizer.id == _hostOrganizerDetailReferenceOrganizer.id
      ? _hostOrganizerDetailReferenceEvents
      : HostOperationsFixtures.eventsByOrganizer[effectiveOrganizer.id] ??
            const <Event>[];
  return OrganizerDetailViewModel(
    organizer: effectiveOrganizer,
    isHost: isHost ?? (uid != null && effectiveOrganizer.isHostedBy(uid)),
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
  Organizer? organizer,
  Event? event,
  AsyncValue<Organizer?>? organizerValue,
  AsyncValue<Event?>? eventValue,
  AsyncValue<AttendanceSheetViewModel?>? attendanceValue,
  AsyncValue<Map<String, (String, String?)>>? attendeeProfilesValue,
  AsyncValue<EventPrivateAccess?>? privateAccessValue,
  AsyncValue<List<EventInviteLink>>? inviteLinksValue,
  AsyncValue<EventSuccessPlan?>? planValue,
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
  final effectiveOrganizer =
      organizer ?? HostOperationsFixtures.primaryOrganizer;
  final effectiveUid =
      uid ??
      effectiveOrganizer.ownerOrPrimaryHostUserId ??
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
  // Roster labels listen to the view the server writes ahead of time.
  unawaited(
    firestore
        .collection('hostEventRosterInsightViews')
        .doc(effectiveEvent.id)
        .set({
          'schemaVersion': 1,
          'eventId': effectiveEvent.id,
          'organizerId': effectiveOrganizer.id,
          'cutoffAtMillis': effectiveEvent.startTime.millisecondsSinceEpoch,
          'revision': 1,
          'evaluatedAt': Timestamp.fromDate(_captureNow),
          'sourceCoverage': 'exact',
          'incompleteSource': null,
          'rows': const <Object?>[],
        }),
  );
  final functions = _CaptureFirebaseFunctions(const {});
  return [
    uidProvider.overrideWithValue(AsyncData<String?>(effectiveUid)),
    firebaseFirestoreProvider.overrideWithValue(firestore),
    firebaseFunctionsProvider.overrideWithValue(functions),
    appConnectivityProvider.overrideWith(
      (ref) =>
          Stream.value(const <ConnectivityResult>[ConnectivityResult.wifi]),
    ),
    hostAttendanceOutboxStoreProvider.overrideWithValue(
      CaptureHostAttendanceOutboxStore(),
    ),
    fetchOrganizerProvider(effectiveOrganizer.id).overrideWithValue(
      organizerValue ?? AsyncData<Organizer?>(effectiveOrganizer),
    ),
    watchOrganizerProvider(effectiveOrganizer.id).overrideWithValue(
      organizerValue ?? AsyncData<Organizer?>(effectiveOrganizer),
    ),
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
    organizerId: event.organizerId,
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

/// The event route on its live section, which reads the event itself: the
/// route-owned loading, error, not-found and access states.
Widget _hostManageRouteCapture({
  Organizer? organizer,
  Event? event,
  bool includeInitialEvent = true,
  HostEventManageSection initialSection = HostEventManageSection.live,
}) {
  final effectiveOrganizer =
      organizer ?? HostOperationsFixtures.primaryOrganizer;
  final effectiveEvent = event ?? HostOperationsFixtures.privateEvent;
  final referenceNow = switch (initialSection) {
    HostEventManageSection.setup || HostEventManageSection.guests =>
      effectiveEvent.startTime.subtract(const Duration(hours: 1)),
    HostEventManageSection.live => effectiveEvent.startTime,
    HostEventManageSection.report => effectiveEvent.endTime.add(
      const Duration(minutes: 1),
    ),
  };
  return AppRoleCapture(
    role: AppRole.host,
    child: HostEventManageRouteScreen(
      organizerId: effectiveOrganizer.id,
      eventId: effectiveEvent.id,
      initialEvent: includeInitialEvent ? effectiveEvent : null,
      initialSection: initialSection,
      referenceNow: referenceNow,
    ),
  );
}

Future<void> _verifyScheduleLockedCapture(WidgetTester tester) async {
  expect(find.text('Schedule locked', skipOffstage: false), findsOneWidget);
  expect(
    find.byKey(const ValueKey('create-locked-schedule'), skipOffstage: false),
    findsOneWidget,
  );
}

/// Taps Save changes so the edit shows what it cannot be saved without.
Future<void> _driveEditValidationCapture(WidgetTester tester) async {
  await tester.tap(find.text('Save changes'));
  await tester.pump();
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
    imageUrl: _organizerHeroPortraitAssetPath,
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

// Expanded deterministic data for the explicitly requested before/after preview.
// The canonical capture remains unchanged unless AUDIENCE_VALUES_FIXTURE is set.
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
  bool includeOrganizer = true,
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
  final effectiveOrganizer = includeOrganizer
      ? MatchesChatSurfaceFixtures.organizer
      : null;

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
    watchOrganizerProvider(
      MatchesChatSurfaceFixtures.organizer.id,
    ).overrideWith((ref) => Stream<Organizer?>.value(effectiveOrganizer)),
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
  return AppRoleCapture(
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
              child: CatchLegacySurface(
                emphasis: CatchSurfaceEmphasis.floating,
                radius: CatchRadius.md,
                backgroundColor: t.ink,
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchSpacing.s4,
                  vertical: CatchSpacing.micro14,
                ),
                child: CatchLegacyText(
                  'Unable to submit report. Please try again.',
                  variant: CatchLegacyTextVariant.titleS,
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
    return AppRoleCapture(
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
    watchOrganizerProvider(MatchesChatSurfaceFixtures.organizerId).overrideWith(
      (ref) => Stream<Organizer?>.value(MatchesChatSurfaceFixtures.organizer),
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
      ? matches.where((match) => match.isOrganizerHostInquiry).toList()
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
  OrganizerHostProfile? hostProfile;
  if (match.isOrganizerHostInquiry) {
    for (final host
        in MatchesChatSurfaceFixtures.organizer.displayHostProfiles) {
      if (host.uid == otherUid) {
        hostProfile = host;
        break;
      }
    }
  }

  final displayName = hostProfile?.displayName ?? profile.name;
  final hasConversation = match.lastMessagePreview != null;
  final previewText = !hasConversation
      ? match.isOrganizerHostInquiry
            ? 'Ask the host'
            : 'You picked each other'
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
  return AppRoleCapture(
    role: role,
    child: _ChatSearchQuerySeed(query: searchQuery, child: child),
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
  final effectiveOrganizerId =
      effectiveEvent?.organizerId ?? MatchesChatSurfaceFixtures.organizerId;

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
    watchOrganizerProvider(effectiveOrganizerId).overrideWith(
      (ref) => Stream<Organizer?>.value(MatchesChatSurfaceFixtures.organizer),
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
  return AppRoleCapture(
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
              child: CatchLegacySurface(
                emphasis: CatchSurfaceEmphasis.floating,
                radius: CatchRadius.md,
                backgroundColor: t.ink,
                padding: const EdgeInsets.symmetric(
                  horizontal: CatchSpacing.s4,
                  vertical: CatchSpacing.micro14,
                ),
                child: CatchLegacyText(
                  message,
                  variant: CatchLegacyTextVariant.titleS,
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
    return AppRoleCapture(
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

final _hostEvent = captureFixtures.hostDemoEvent(
  role: 'hostLiveConsole',
  organizer: _dashboardHostOrganizer,
);

final _hostHomeLongNameOwnerOrganizer = HostOperationsFixtures.primaryOrganizer
    .copyWith(
      id: 'host-home-long-owner-club',
      name: 'Bandra Sea Face Morning Run Club for New Members',
      area: 'Bandra West Promenade',
    );
final _hostHomeLongNameCoHostedOrganizer = HostOperationsFixtures
    .coHostedOrganizer
    .copyWith(
      id: 'host-home-long-cohost-club',
      name: 'South Mumbai Rooftop Dinner Collective With Guest Hosts',
      area: 'Fort and Kala Ghoda',
    );
final _hostHomeLongNameEvent = HostOperationsFixtures.upcomingEvent.copyWith(
  id: 'host-home-long-name-event',
  organizerId: _hostHomeLongNameOwnerOrganizer.id,
  meetingPoint: 'Bandra West Promenade amphitheatre',
  meetingLocation: HostOperationsFixtures.upcomingEvent.meetingLocation!
      .copyWith(name: 'Bandra West Promenade amphitheatre'),
);
final _hostOrganizerDetailReferenceOrganizer = HostOperationsFixtures
    .primaryOrganizer
    .copyWith(
      name: 'Sunday sea-face crew',
      description:
          'The standing Saturday run - an easy 5K along the Bandra seafront as the light goes gold, coffee and bun maska after. No medals, no Strava pressure. Just show up, move, linger.',
      location: 'in-mh-mumbai',
      locationCityId: 'in-mh-mumbai',
      locationMarketId: 'in-mh-mumbai',
      area: 'Bandra',
      imageUrl: _organizerHeroPortraitAssetPath,
      profileImageUrl: _organizerHeroPortraitAssetPath,
      organizerPhotos: [
        _hostOrganizerDetailPhoto('club-detail-run-1', 0),
        _hostOrganizerDetailPhoto('club-detail-run-2', 1),
        _hostOrganizerDetailPhoto('club-detail-run-3', 2),
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
        OrganizerHostProfile(
          uid: HostOperationsFixtures.hostUid,
          displayName: 'Priya Kapoor',
          avatarUrl: _organizerHeroPortraitAssetPath,
          role: OrganizerHostRole.owner,
        ),
        OrganizerHostProfile(
          uid: HostOperationsFixtures.coHostUid,
          displayName: 'Arjun Mehta',
        ),
        OrganizerHostProfile(uid: 'design-host-sana', displayName: 'Sana Iyer'),
      ],
      hostDefaults: const OrganizerHostDefaults(
        supportedActivityKinds: [ActivityKind.running, ActivityKind.walking],
      ),
    );
final _hostOrganizerDetailReferenceEvents = [
  _hostEvent.copyWith(
    id: 'host-club-detail-run-14',
    organizerId: _hostOrganizerDetailReferenceOrganizer.id,
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
    organizerId: _hostOrganizerDetailReferenceOrganizer.id,
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
    organizerId: _hostOrganizerDetailReferenceOrganizer.id,
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

UploadedPhoto _hostOrganizerDetailPhoto(String id, int position) {
  return UploadedPhoto(
    id: id,
    url: _organizerHeroPortraitAssetPath,
    storagePath: 'fixtures/$id.jpg',
    thumbnailUrl: _organizerHeroPortraitAssetPath,
    thumbnailStoragePath: 'fixtures/$id-thumb.jpg',
    position: position,
    createdAt: DateTime(2025, 1, 12),
    updatedAt: DateTime(2025, 1, 12),
  );
}

final _matchesListProfiles = [
  matchChatOtherProfile,
  captureFixtures.publicProfile('nyc_sofia_martinez_003'),
  captureFixtures.publicProfile('nyc_priya_desai_007'),
];
final _matchesListMatches = [
  matchChatMatch,
  Match(
    id: 'match-list-new-sofia',
    user1Id: matchChatViewerUid,
    user2Id: _matchesListProfiles[1].uid,
    eventIds: ['event-discovery-pickle-open'],
    createdAt: DateTime(2026, 5, 30, 19, 12),
    unreadCounts: const {matchChatViewerUid: 0},
  ),
  Match(
    id: 'match-list-priya',
    user1Id: _matchesListProfiles[2].uid,
    user2Id: matchChatViewerUid,
    eventIds: ['event-dashboard-next'],
    createdAt: DateTime(2026, 5, 30, 8, 55),
    lastMessageAt: DateTime(2026, 5, 30, 10, 8),
    lastMessagePreview: 'Next dawn loop, same coffee place?',
    lastMessageSenderId: _matchesListProfiles[2].uid,
    unreadCounts: const {matchChatViewerUid: 2},
  ),
];
final _matchesListMatchRepository = CaptureMatchRepository(
  matches: _matchesListMatches,
);

final _eventSuccessCompanionEvent = buildEvent(
  id: 'event-success-companion-capture',
  organizerId: _dashboardJoinedOrganizer.id,
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
  uid: captureViewerUid,
  createdAt: DateTime(2026, 5, 29, 9),
);

List<Object> _eventSuccessCompanionRouteProviderOverrides({
  AsyncValue<String?> uidValue = const AsyncData<String?>(captureViewerUid),
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
      profileValue ?? AsyncData<UserProfile?>(captureViewer),
    ),
    watchEventParticipationProvider(
      _eventSuccessCompanionEvent.id,
      captureViewerUid,
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
      (ref) => NoopEventSuccessLiveEffectsController(),
    ),
  ];
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
  captureFixtures.captureEvent(
    id: 'event-review-history-dawn',
    organizer: _dashboardJoinedOrganizer,
    startTime: DateTime(2026, 5, 24, 7),
    endTime: DateTime(2026, 5, 24, 8, 10),
    meetingPoint: 'Carter Road Amphitheatre',
    bookedCount: 18,
    checkedInCount: 16,
    capacityLimit: 22,
    description: 'A completed social run with a warm review.',
  ),
  captureFixtures.captureEvent(
    id: 'event-review-history-table',
    organizer: _dashboardHostOrganizer,
    startTime: DateTime(2026, 5, 18, 20),
    endTime: DateTime(2026, 5, 18, 22),
    meetingPoint: 'Lantern Lane Cafe',
    activityKind: ActivityKind.dinner,
    distanceKm: 0,
    checkedInCount: 12,
    capacityLimit: 16,
    priceInPaise: 120000,
    description: 'A hosted table with structured prompts and warm exits.',
  ),
  captureFixtures.captureEvent(
    id: 'event-review-history-walk',
    organizer: _dashboardJoinedOrganizer,
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
final _reviewHistoryReviews = captureFixtures.reviewsByViewer(
  events: _reviewHistoryEvents,
  reviewerUserId: captureViewerUid,
  reviewerName: captureViewer.name,
  firstCreatedAt: DateTime(2026, 5, 25),
);
final _reviewHistoryMissingContextReviews = [
  Review(
    id: 'review-history-missing-event',
    organizerId: _dashboardJoinedOrganizer.id,
    eventId: 'event-review-history-missing',
    reviewerUserId: captureViewerUid,
    reviewerName: captureViewer.name,
    rating: 4,
    comment: 'Still worth remembering, even without event context.',
    createdAt: DateTime(2026, 5, 12),
  ),
  Review(
    id: 'review-history-legacy-club',
    organizerId: _dashboardJoinedOrganizer.id,
    reviewerUserId: captureViewerUid,
    reviewerName: captureViewer.name,
    rating: 5,
    comment: 'A legacy club review with no event attached.',
    createdAt: DateTime(2026, 5, 5),
  ),
];

List<Object> _reviewsHistoryProviderOverrides({
  AsyncValue<String?> uid = const AsyncData(captureViewerUid),
  Stream<UserProfile?>? profileStream,
  AsyncValue<List<Review>>? reviews,
  AsyncValue<List<Event>>? events,
}) {
  final effectiveReviews = reviews ?? AsyncData(_reviewHistoryReviews);
  final overrides = <Object>[
    uidProvider.overrideWithValue(uid),
    watchUserProfileProvider.overrideWith(
      (ref) => profileStream ?? Stream.value(captureViewer),
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

  final AsyncValue<List<Event>> effectiveEvents =
      events ??
      AsyncData([
        for (final event in _reviewHistoryEvents)
          if (eventIds.contains(event.id)) event,
      ]);
  overrides.add(
    watchOwnEventCardsForEventsProvider(
      OwnEventCardsQuery(uid: viewerUid, eventIds: eventIds),
    ).overrideWithValue(_captureCardsById(effectiveEvents)),
  );

  return overrides;
}

final _eventRecapEvent = captureFixtures.captureEvent(
  id: 'event-recap-capture',
  organizer: _dashboardJoinedOrganizer,
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
  ...captureFixtures.publicProfiles(const [
    'nyc_aisha_williams_005',
    'nyc_marcus_chen_008',
  ]),
];
final _eventRecapParticipations = [
  buildEventParticipation(
    event: _eventRecapEvent,
    uid: captureViewerUid,
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

final _eventRecapNextEvent = captureFixtures.captureEvent(
  id: 'event-recap-next-capture',
  organizer: _dashboardJoinedOrganizer,
  // Two days out, so its weekday-based title never matches the event just
  // attended (11 hours ago) on the same screen.
  startTime: DateTime.now().add(const Duration(days: 2)),
  endTime: DateTime.now().add(const Duration(days: 2, hours: 1)),
  meetingPoint: 'Carter Road Amphitheatre',
  bookedCount: 9,
  capacityLimit: 18,
  description: 'The next easy loop from the same club.',
);

List<Object> _eventRecapProviderOverrides({
  EventSuccessFeedback? feedback,
  Set<String> followedOrganizerIds = const <String>{},
  AsyncValue<EventRecapViewModel?>? recapValue,
  Map<String, PublicProfile>? rosterProfiles,
  AsyncValue<Map<String, PublicProfile>>? rosterProfilesValue,
  List<EventHostPhoto> hostPhotos = const <EventHostPhoto>[],
}) {
  final resolvedRecapValue =
      recapValue ?? AsyncData<EventRecapViewModel?>(_eventRecapViewModel());
  final attendeeIds = switch (resolvedRecapValue) {
    AsyncData<EventRecapViewModel?>(:final value) =>
      value?.attendeeIds ?? const <String>[],
    _ => const <String>[],
  };

  final eventId = _eventRecapEvent.id;
  final now = DateTime.now();
  return <Object>[
    eventRecapViewModelProvider(
      eventId,
    ).overrideWith((ref) => resolvedRecapValue),
    watchUserProfileProvider.overrideWith(
      (ref) => Stream<UserProfile?>.value(
        buildSocialReadyUser(uid: captureViewerUid, name: 'Rohan Mehta'),
      ),
    ),
    watchOrganizerProvider(
      _dashboardJoinedOrganizer.id,
    ).overrideWith((ref) => Stream.value(_dashboardJoinedOrganizer)),
    watchEventParticipationProvider(
      eventId,
      captureViewerUid,
    ).overrideWith((ref) => Stream.value(_eventRecapParticipations.first)),
    watchUserEventSuccessFeedbackProvider(
      eventId: eventId,
      uid: captureViewerUid,
    ).overrideWith((ref) => Stream<EventSuccessFeedback?>.value(feedback)),
    watchUserEventSuccessAssignmentProvider(
      eventId: eventId,
      uid: captureViewerUid,
    ).overrideWith(
      (ref) => Stream<EventSuccessAssignment?>.value(
        _hostManageAssignment(
          event: _eventRecapEvent,
          uid: captureViewerUid,
          label: 'Pod 3',
          title: 'Pace pod 3',
          peerUids: [
            for (final profile in _eventRecapProfiles.take(2)) profile.uid,
          ],
          now: now,
        ),
      ),
    ),
    eventChatAccessProvider(eventId).overrideWith(
      (ref) async => EventChatAccess(
        eventId: eventId,
        title: _eventRecapEvent.title,
        organizerId: _eventRecapEvent.organizerId,
        roomStatus: 'open',
        roomRevision: 1,
        membershipStatus: 'joined',
        membershipRevision: 1,
        canManage: false,
        canJoin: true,
        canReadMessages: true,
        closesAtMillis: _eventRecapEvent.endTime
            .add(const Duration(days: 7))
            .millisecondsSinceEpoch,
        profileClaimRequired: false,
        termsVersion: 'event-chat-v1',
      ),
    ),
    watchActiveEventsForOrganizerProvider(
      ActiveOrganizerEventsQuery(
        organizerId: _eventRecapEvent.organizerId,
        day: now,
      ),
    ).overrideWith((ref) => Stream.value([_eventRecapNextEvent])),
    currentUserFollowedOrganizerIdsProvider.overrideWithValue(
      AsyncData(followedOrganizerIds),
    ),
    publicProfilesByIdsProvider(
      PublicProfilesQuery(attendeeIds),
    ).overrideWithValue(
      rosterProfilesValue ??
          AsyncData(rosterProfiles ?? _eventRecapRosterProfiles()),
    ),
    eventHostPhotoAlbumProvider(eventId).overrideWith(
      (ref) async => _eventRecapHostPhotoAlbum(eventId, hostPhotos),
    ),
  ];
}

/// The host's photos as a checked-in guest sees them; an empty list is what
/// every guest sees before the host shares any.
EventHostPhotoAlbum _eventRecapHostPhotoAlbum(
  String eventId,
  List<EventHostPhoto> photos,
) => EventHostPhotoAlbum(
  eventId: eventId,
  organizerName: _dashboardJoinedOrganizer.name,
  access: EventHostPhotoAccess.guest,
  maxPhotos: 100,
  photos: photos,
  urlsExpireAt: DateTime(2030),
);

/// Four event scenes the host shared after the run.
final _eventRecapHostPhotos = <EventHostPhoto>[
  for (final (index, path) in _eventScenePhotoAssetPaths.indexed)
    EventHostPhoto(
      photoId: 'capture-guest-photo-$index',
      thumbnailUrl: path,
      displayUrl: path,
      width: _eventScenePhotoSizes[index].$1,
      height: _eventScenePhotoSizes[index].$2,
      uploadedByUid: 'capture-host',
      createdAt: DateTime(2026, 5, 30, 8, index),
    ),
];

Future<void> _driveEventRecapToHostPhotos(WidgetTester tester) async {
  await tester.scrollUntilVisible(
    find.byKey(const ValueKey('after-event-host-photos')),
    320,
    scrollable: findVerticalScrollable(
      within: find.byKey(const ValueKey('after-event-screen')),
    ),
  );
  await pumpFeatureUi(tester);
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
  final AsyncValue<List<Event>> effectiveEvents =
      events ??
      AsyncData([
        for (final event in _paymentHistoryEvents)
          if (eventIds.contains(event.id)) event,
      ]);
  overrides.add(
    watchOwnEventCardsForEventsProvider(
      OwnEventCardsQuery(uid: viewerUid, eventIds: eventIds),
    ).overrideWithValue(_captureCardsById(effectiveEvents)),
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
    uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
    watchMyHostMembershipsProvider(
      captureViewerUid,
    ).overrideWith((ref) => Stream.value(const [])),
    watchUserProfileProvider.overrideWith(
      (ref) => profileStream ?? Stream.value(captureViewer),
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
    captureAnalyticsOverride,
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
    errorLoggerProvider.overrideWithValue(CaptureSilentErrorLogger()),
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
    guestUrl: '${Brand.webOrigin}/rehearse/capture-companion',
    canUseInternalFaults: true,
  );
}

/// Marketing captures by catalog id. Each is built only when requested, so a
/// marketing render never evaluates another capture's fixtures.
final marketingScreenCaptures = <String, ScreenCaptureEntry Function()>{
  'host_programme_guests_desktop': () => hostProgrammeGuestsDesktopCapture,
  'host_programme_rooms_desktop': () => hostProgrammeRoomsDesktopCapture,
  'host_programme_message_phone': () => hostProgrammeMessagePhoneCapture,
  'host_programme_live_board_desktop': () =>
      hostProgrammeLiveBoardDesktopCapture,
  'host_programme_reconcile_desktop': () =>
      hostProgrammeReconcileDesktopCapture,
  'host_programme_inbox_phone': () => hostProgrammeInboxPhoneCapture,
  'host_staff_door_phone': () => hostStaffDoorPhoneCapture,
  'host_staff_departures_phone': () => hostStaffDeparturesPhoneCapture,
  'host_home_dashboard': () => hostHomeDashboardCapture,
  'host_door_arriving': () => hostDoorArrivingCapture,
  'host_door_arriving_new_guest_fragment': () =>
      hostDoorArrivingNewGuestFragmentCapture,
  'host_door_arriving_regular_fragment': () =>
      hostDoorArrivingRegularFragmentCapture,
  'host_door_in': () => hostDoorInCapture,
  'host_live_now_tablet': () => hostLiveNowTabletCapture,
  'host_live_needs_phone': () => hostLiveNeedsPhoneCapture,
  'host_live_scores_phone': () => hostLiveScoresPhoneCapture,
  'host_live_scores_team_fragment': () => hostLiveScoresTeamFragmentCapture,
  'host_live_scores_standings_fragment': () =>
      hostLiveScoresStandingsFragmentCapture,
  'host_live_scores_third_team_fragment': () =>
      hostLiveScoresThirdTeamFragmentCapture,
  'host_formats_courts_setup_phone': () => hostFormatsCourtsSetupPhoneCapture,
  'host_formats_courts_phone': () => hostFormatsCourtsPhoneCapture,
  'host_formats_courts_court_fragment': () =>
      hostFormatsCourtsCourtFragmentCapture,
  'host_formats_courts_sitting_out_fragment': () =>
      hostFormatsCourtsSittingOutFragmentCapture,
  'host_formats_mix_phone': () => hostFormatsMixPhoneCapture,
  'host_formats_crawl_phone': () => hostFormatsCrawlPhoneCapture,
  'host_formats_crawl_move_phone': () => hostFormatsCrawlMovePhoneCapture,
  'host_formats_crawl_move_message_fragment': () =>
      hostFormatsCrawlMoveMessageFragmentCapture,
  'host_formats_crawl_move_map_fragment': () =>
      hostFormatsCrawlMoveMapFragmentCapture,
  'host_formats_pods_phone': () => hostFormatsPodsPhoneCapture,
  'host_formats_pods_chatty_fragment': () =>
      hostFormatsPodsChattyFragmentCapture,
  'host_formats_pods_needs_pod_fragment': () =>
      hostFormatsPodsNeedsPodFragmentCapture,
  'host_formats_rules_phone': () => hostFormatsRulesPhoneCapture,
  'host_formats_rules_consent_fragment': () =>
      hostFormatsRulesConsentFragmentCapture,
  'host_formats_rules_first_time_fragment': () =>
      hostFormatsRulesFirstTimeFragmentCapture,
  'member_event_discovery': () => memberEventDiscoveryCapture,
  'host_live_console': () => hostLiveConsoleCapture,
  'host_post_event_report': () => hostPostEventReportCapture,
  'host_live_tablet_colleges': () => hostLiveTabletCollegesCapture,
  'host_live_tablet_communities': () => hostLiveTabletCommunitiesCapture,
  'host_live_tablet_creators': () => hostLiveTabletCreatorsCapture,
  'host_live_tablet_facilities': () => hostLiveTabletFacilitiesCapture,
  'host_live_tablet_outdoors': () => hostLiveTabletOutdoorsCapture,
  'host_live_tablet_racket_sports': () => hostLiveTabletRacketSportsCapture,
  'host_live_tablet_runs': () => hostLiveTabletRunsCapture,
  'host_live_tablet_studios': () => hostLiveTabletStudiosCapture,
  'host_live_tablet_suppers': () => hostLiveTabletSuppersCapture,
  'host_live_tablet_teams': () => hostLiveTabletTeamsCapture,
  'host_live_tablet_venues': () => hostLiveTabletVenuesCapture,
  'host_live_tablet_workshops': () => hostLiveTabletWorkshopsCapture,
  'host_create_colleges': () => hostCreateCollegesCapture,
  'host_create_communities': () => hostCreateCommunitiesCapture,
  'host_create_nightlife': () => hostCreateNightlifeCapture,
  'host_create_racket_sports': () => hostCreateRacketSportsCapture,
  'host_create_runs': () => hostCreateRunsCapture,
  'host_create_studios': () => hostCreateStudiosCapture,
  'host_create_suppers': () => hostCreateSuppersCapture,
  'host_create_teams': () => hostCreateTeamsCapture,
  'host_create_venues': () => hostCreateVenuesCapture,
  'host_post_event_report_more': () => hostPostEventReportMoreCapture,
  'guest_after_event': () => guestAfterEventCapture,
  'host_insights_phone': () => hostInsightsPhoneCapture,
  'host_application_detail': () => hostApplicationDetailCapture,
  'host_organizer_memberships': () => hostOrganizerMembershipsCapture,
  'host_event_share_links': () => hostEventShareLinksCapture,
  'host_event_share_links_whatsapp_fragment': () =>
      hostEventShareLinksWhatsappFragmentCapture,
  'event_success_companion_first_hello_assigned': () =>
      eventSuccessCompanionFirstHelloAssignedCapture,
  'host_organizer_payments_phone': () => hostOrganizerPaymentsPhoneCapture,
  'host_organizer_team_phone': () => hostOrganizerTeamPhoneCapture,
  'host_staff_arrivals_phone': () => hostStaffArrivalsPhoneCapture,
  'host_automations_phone': () => hostAutomationsPhoneCapture,
  'host_person_phone': () => hostPersonPhoneCapture,
  'host_people_phone': () => hostPeoplePhoneCapture,
  'host_people_regular_fragment': () => hostPeopleRegularFragmentCapture,
  'host_people_drifting_fragment': () => hostPeopleDriftingFragmentCapture,
  'host_response_phone': () => hostResponsePhoneCapture,
  'host_responses_phone': () => hostResponsesPhoneCapture,
  'host_form_responses_new_fragment': () => hostFormResponsesNewFragmentCapture,
  'guest_book_sheet': () => guestBookSheetCapture,
  'guest_follow_host': () => guestFollowHostCapture,
  'guest_follow_host_followers_fragment': () =>
      guestFollowHostFollowersFragmentCapture,
  'guest_follow_host_follow_fragment': () =>
      guestFollowHostFollowFragmentCapture,
  'guest_group_chat': () => guestGroupChatCapture,
  'guest_reminder': () => guestReminderCapture,
  'host_create_first_event': () => hostCreateFirstEventCapture,
  'event_success_companion_micro_pod_assignment': () =>
      eventSuccessCompanionMicroPodAssignmentCapture,
  'match_chat_context': () => matchChatContextCapture,
};

final screenCaptureCatalog = <ScreenCaptureEntry>[
  ScreenCaptureEntry(
    id: 'host_programme_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerProgrammeCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programme_function_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerFunctionCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programme_guests_phone',
    routeIds: const <String>['hostProgramGuestsScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerGuestsCapture(),
  ),
  hostProgrammeGuestsDesktopCapture,
  ScreenCaptureEntry(
    id: 'host_programme_household_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerHouseholdCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programme_travel_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerTravelCapture(),
  ),
  hostProgrammeRoomsDesktopCapture,
  ScreenCaptureEntry(
    id: 'host_programme_trips_desktop',
    routeIds: const <String>['hostWorkTripsScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerTripsCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programme_create_phone',
    routeIds: const <String>['hostCreateProgramScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerCreateCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programme_messages_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerMessagesCapture(),
  ),
  hostProgrammeMessagePhoneCapture,
  ScreenCaptureEntry(
    id: 'host_programme_live_board_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerLiveBoardCapture(),
  ),
  hostProgrammeLiveBoardDesktopCapture,
  ScreenCaptureEntry(
    id: 'host_programme_branding_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerBrandingCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programme_id_tracker_desktop',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerIdTrackerCapture(),
  ),
  hostProgrammeReconcileDesktopCapture,
  ScreenCaptureEntry(
    id: 'host_programme_photos_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerPhotosCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programme_inbox_desktop',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerInboxCapture(),
  ),
  hostProgrammeInboxPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_programme_assistant_phone',
    routeIds: const <String>['hostProgramWorkspaceScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerAssistantCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programmes_home_phone',
    routeIds: const <String>['hostProgramsScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerHomeCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_programmes_home_desktop',
    routeIds: const <String>['hostProgramsScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: plannerCaptureOverrides(),
    builder: (context) => plannerHomeCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_staff_work_phone',
    routeIds: const <String>['hostWorkScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostStaffCaptureOverrides(),
    builder: (context) => hostStaffWorkCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_staff_jobs_phone',
    routeIds: const <String>['hostWorkProgramScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostStaffCaptureOverrides(),
    builder: (context) => hostStaffJobsCapture(),
  ),
  hostStaffArrivalsPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_staff_dispatch_phone',
    routeIds: const <String>['hostWorkDispatchScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostStaffCaptureOverrides(),
    builder: (context) => hostStaffDispatchCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_staff_dispatch_sheet_phone',
    routeIds: const <String>['hostWorkDispatchScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostStaffCaptureOverrides(),
    builder: (context) => hostStaffDispatchCapture(sheet: true),
  ),
  ScreenCaptureEntry(
    id: 'host_staff_hotel_desk_phone',
    routeIds: const <String>['hostWorkHotelScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostStaffCaptureOverrides(),
    builder: (context) => hostStaffHotelDeskCapture(),
  ),
  hostStaffDoorPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_staff_lead_phone',
    routeIds: const <String>['hostWorkNowScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostStaffCaptureOverrides(),
    builder: (context) => hostStaffLeadCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_staff_alerts_phone',
    routeIds: const <String>['hostWorkAttentionScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostStaffCaptureOverrides(),
    builder: (context) => hostStaffAlertsCapture(),
  ),
  hostStaffDeparturesPhoneCapture,
  hostPeoplePhoneCapture,
  ScreenCaptureEntry(
    id: 'host_people_desktop',
    routeIds: const <String>['hostAudienceScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostPeopleDesktopCapture(),
  ),
  hostPersonPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_messages_phone',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_compose_phone',
    routeIds: const <String>['hostNewMessageScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostComposeCapture(),
  ),
  hostAutomationsPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_saved_group_phone',
    routeIds: const <String>['hostSavedAudienceDetailScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostSavedGroupCapture(),
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
    providerOverrides: [captureAnalyticsOverride],
    builder: (context) => const OnboardingWelcomeBody(playIntro: false),
  ),
  ScreenCaptureEntry(
    id: 'start_welcome_animated_reel',
    routeIds: const <String>['startScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [captureAnalyticsOverride],
    builder: (context) => const OnboardingWelcomeBody(),
  ),
  ScreenCaptureEntry(
    id: 'start_welcome_reduced_motion',
    routeIds: const <String>['startScreen'],
    device: CaptureDevice.reviewPhone,
    disableAnimations: true,
    providerOverrides: [captureAnalyticsOverride],
    builder: (context) => const OnboardingWelcomeBody(),
  ),
  ScreenCaptureEntry(
    id: 'start_welcome_text_scale_2',
    routeIds: const <String>['startScreen'],
    device: CaptureDevice.reviewPhone,
    textScale: 2,
    providerOverrides: [captureAnalyticsOverride],
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: EventDetailScreen(
        enableMapNetworkTiles: false,
        organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailEvent.organizerId,
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
      organizerId: _eventDetailWaitlistEvent.organizerId,
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
      organizerId: _eventDetailWaitlistOfferEvent.organizerId,
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
      organizerId: _eventDetailFullEvent.organizerId,
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
      organizerId: _eventDetailAttendedEvent.organizerId,
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
      organizerId: _eventDetailPastEvent.organizerId,
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
      organizerId: _eventDetailCancelledEvent.organizerId,
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
      membershipsStream: _captureErrorStream<List<OrganizerFollow>>(
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
  hostHomeDashboardCapture,
  ScreenCaptureEntry(
    id: 'host_create_step_basics',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (context) => _createCapture(
      CreateBasicsScreen(
        state: _createState(CreateStep.basics),
        handlers: _createHandlers,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_step_when',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (context) => _createCapture(
      CreateWhenScreen(
        state: _createState(CreateStep.when),
        handlers: _createHandlers,
        today: _createToday,
        enableNetworkTiles: false,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_step_when_calendar',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (context) => _createCapture(
      CreateWhenScreen(
        state: _createState(CreateStep.when),
        handlers: _createHandlers,
        today: _createToday,
        enableNetworkTiles: false,
        calendarSheet: CreateCalendarSheet(
          today: _createToday,
          value: DateTime(2026, 11, 3),
          marked: [
            DateTime(2026, 11),
            DateTime(2026, 11, 4),
            DateTime(2026, 11, 7),
          ],
          onChanged: _ignore,
          onUse: () {},
        ),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_step_tickets',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (context) => _createCapture(
      CreateTicketsScreen(
        state: _createState(CreateStep.tickets),
        handlers: _createHandlers,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_step_plan',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (context) => _createCapture(
      CreatePlanScreen(
        state: _createState(CreateStep.plan),
        handlers: _createHandlers,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_step_share',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (context) => _createCapture(
      CreateShareScreen(
        state: _createState(CreateStep.share),
        handlers: _createHandlers,
        link: '${Brand.webOrigin}/lantern-lane/trivia',
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_editor_desktop',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.auditDesktop,
    builder: (context) => _createCapture(
      CreateEditorScreen(
        state: _createState(CreateStep.basics),
        handlers: _createHandlers,
        today: _createToday,
        stillToSet: const ['Date and place', 'Tickets', 'The plan'],
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_today_phone',
    routeIds: const <String>['hostTodayScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _hostTodayCaptureOverrides(),
    builder: (context) => _hostTodayCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_today_medium',
    routeIds: const <String>['hostTodayScreen'],
    device: CaptureDevice.auditMedium,
    providerOverrides: _hostTodayCaptureOverrides(),
    builder: (context) => _hostTodayCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_today_desktop',
    routeIds: const <String>['hostTodayScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: _hostTodayCaptureOverrides(),
    builder: (context) => _hostTodayCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_today_tablet',
    routeIds: const <String>['hostTodayScreen'],
    device: CaptureDevice.auditTablet,
    providerOverrides: _hostTodayCaptureOverrides(),
    builder: (context) => _hostTodayCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_list',
    routeIds: const <String>['hostEventsScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _hostEventsCaptureOverrides(),
    builder: (context) => _hostEventsCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_events_medium',
    routeIds: const <String>['hostEventsScreen'],
    device: CaptureDevice.auditMedium,
    providerOverrides: _hostEventsCaptureOverrides(),
    builder: (context) => _hostEventsCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_events_tablet',
    routeIds: const <String>['hostEventsScreen'],
    device: CaptureDevice.auditTablet,
    providerOverrides: _hostEventsCaptureOverrides(),
    builder: (context) => _hostEventsCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_events_desktop',
    routeIds: const <String>['hostEventsScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: _hostEventsCaptureOverrides(),
    builder: (context) => _hostEventsCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_forms_phone',
    routeIds: const <String>['hostAudienceScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (_) => hostFormsCaptures['host_forms_phone']!(),
  ),
  ScreenCaptureEntry(
    id: 'host_form_new_phone',
    routeIds: const <String>['hostFormTemplatesScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (_) => hostFormsCaptures['host_form_new_phone']!(),
  ),
  ScreenCaptureEntry(
    id: 'host_form_phone',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (_) => hostFormsCaptures['host_form_phone']!(),
  ),
  ScreenCaptureEntry(
    id: 'host_form_builder_phone',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (_) => hostFormsCaptures['host_form_builder_phone']!(),
  ),
  ScreenCaptureEntry(
    id: 'host_form_share_phone',
    routeIds: const <String>['hostFormShareScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (_) => hostFormsCaptures['host_form_share_phone']!(),
  ),
  hostResponsesPhoneCapture,
  hostResponsePhoneCapture,
  ScreenCaptureEntry(
    id: 'host_offer_phone',
    routeIds: const <String>['hostResponseOfferScreen'],
    device: CaptureDevice.claudePhone390,
    builder: (_) => hostFormsCaptures['host_offer_phone']!(),
  ),
  hostDoorArrivingCapture,
  hostDoorInCapture,
  ScreenCaptureEntry(
    id: 'host_door_asked',
    routeIds: const <String>['hostEventRosterScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: doorCaptureOverrides(),
    builder: (context) => doorCapture(filter: DoorFilter.asked),
  ),
  ScreenCaptureEntry(
    id: 'host_door_scan_checked_in',
    routeIds: const <String>['hostEventRosterScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: doorCaptureOverrides(),
    builder: (context) => _doorScanCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_door_tablet_landscape',
    routeIds: const <String>['hostEventRosterScreen'],
    device: CaptureDevice.auditTabletLandscape,
    providerOverrides: doorCaptureOverrides(),
    builder: (context) => doorCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_live_now_phone',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: hostLivePhone,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostLiveCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: hostLiveNowCapture()),
  ),
  hostLiveNowTabletCapture,
  hostLiveNeedsPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_live_needs_tablet',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: hostLiveTablet,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostLiveCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: hostLiveNeedsCapture()),
  ),
  hostLiveScoresPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_live_scores_tablet',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: hostLiveTablet,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostLiveCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: hostLiveScoresCapture()),
  ),
  hostFormatsCourtsSetupPhoneCapture,
  hostFormatsCourtsPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_formats_courts_tablet',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: hostLiveTablet,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostFormatsCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: hostFormatsCourtsCapture()),
  ),
  hostFormatsMixPhoneCapture,
  hostFormatsCrawlPhoneCapture,
  hostFormatsCrawlMovePhoneCapture,
  hostFormatsPodsPhoneCapture,
  hostFormatsRulesPhoneCapture,
  hostInsightsPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_event_report_phone',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.claudePhone390,
    precache: _eventScenePhotoAssetImages,
    providerOverrides: _hostReportCaptureOverrides(),
    builder: (context) => _hostReportCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_event_report_photos_phone',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.claudePhone390,
    precache: _eventScenePhotoAssetImages,
    providerOverrides: [
      ..._hostReportCaptureOverrides(),
      hostEventPhotosControllerProvider.overrideWith2(
        (_) => _HostReportUploadingPhotosController(),
      ),
    ],
    builder: (context) => _hostReportCapture(),
    drive: _driveHostReportToPhotos,
  ),
  ScreenCaptureEntry(
    id: 'host_organizer_tab_phone',
    routeIds: const <String>['hostOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => HostRoutedShellCapture(
      initialLocation: '/host/organizer',
      activeIndex: 4,
      child: organizerTabCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_organizer_page_phone',
    routeIds: const <String>['hostOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => organizerPageEditCapture(),
  ),
  hostOrganizerPaymentsPhoneCapture,
  hostOrganizerTeamPhoneCapture,
  ScreenCaptureEntry(
    id: 'host_organizer_settings_phone',
    routeIds: const <String>['hostOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => organizerSettingsCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_home_switcher_cohost',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      hostedOrganizers: HostOperationsFixtures.organizers,
      ownedOrganizers: [
        HostOperationsFixtures.primaryOrganizer,
        HostOperationsFixtures.dinnerOrganizer,
      ],
    ),
    builder: (context) => const AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(initialOrganizerId: 'design-host-cohost-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_long_club_names',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      hostedOrganizers: [
        _hostHomeLongNameOwnerOrganizer,
        _hostHomeLongNameCoHostedOrganizer,
      ],
      ownedOrganizers: [_hostHomeLongNameOwnerOrganizer],
      organizerEvents: {
        _hostHomeLongNameOwnerOrganizer.id: AsyncData<List<Event>>([
          _hostHomeLongNameEvent,
        ]),
        _hostHomeLongNameCoHostedOrganizer.id: const AsyncData<List<Event>>([]),
      },
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(
        initialOrganizerId: _hostHomeLongNameOwnerOrganizer.id,
      ),
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
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_clubs_loading',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      hostedOrganizersAsync: const AsyncLoading<List<Organizer>>(),
      ownedOrganizersAsync: const AsyncLoading<List<Organizer>>(),
    ),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_clubs_error',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      hostedOrganizersAsync: AsyncError<List<Organizer>>(
        StateError('Capture host home clubs failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_clubs_offline',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      hostedOrganizersAsync: AsyncError<List<Organizer>>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_empty_clubs',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      hostedOrganizers: const <Organizer>[],
      ownedOrganizers: const <Organizer>[],
    ),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_loading',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      organizerEvents: {
        HostOperationsFixtures.primaryOrganizer.id:
            const AsyncLoading<List<Event>>(),
      },
    ),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_error',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      organizerEvents: {
        HostOperationsFixtures.primaryOrganizer.id: AsyncError<List<Event>>(
          StateError('Capture host home events failed'),
          StackTrace.empty,
        ),
      },
    ),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_events_offline',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      organizerEvents: {
        HostOperationsFixtures.dinnerOrganizer.id: AsyncError<List<Event>>(
          obviousOfflineException(),
          StackTrace.empty,
        ),
      },
    ),
    builder: (context) => const AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(initialOrganizerId: 'design-host-table-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_cohost_empty_events',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(
      hostedOrganizers: [HostOperationsFixtures.coHostedOrganizer],
      ownedOrganizers: const <Organizer>[],
    ),
    builder: (context) => const AppRoleCapture(
      role: AppRole.host,
      child: HostTodayScreen(initialOrganizerId: 'design-host-cohost-club'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_home_text_scale_2',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: hostOperationsProviderOverrides(),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_reduced_motion',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: hostOperationsProviderOverrides(),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_home_light_dark',
    routeIds: const <String>['hostHomeScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostOperationsProviderOverrides(),
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: HostTodayScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_management',
    routeIds: const <String>['hostOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => HostRoutedShellCapture(
      initialLocation: '/host/organizer',
      activeIndex: 4,
      child: organizerTabCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_organizer_media_summary',
    routeIds: const <String>['hostOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPageEditCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_signed_out',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData<String?>(null)),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: OrganizerScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_loading',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        hostedOrganizersAsync: const AsyncLoading<List<Organizer>>(),
        ownedOrganizersAsync: const AsyncLoading<List<Organizer>>(),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: OrganizerScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_error',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        ownedOrganizersAsync: AsyncError<List<Organizer>>(
          StateError('Capture host clubs failed'),
          StackTrace.empty,
        ),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: OrganizerScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_offline',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        ownedOrganizersAsync: AsyncError<List<Organizer>>(
          obviousOfflineException(),
          StackTrace.empty,
        ),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: OrganizerScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_empty',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        hostedOrganizers: const <Organizer>[],
        ownedOrganizers: const <Organizer>[],
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        const AppRoleCapture(role: AppRole.host, child: OrganizerScreen()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_cohost_edit',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [HostOperationsFixtures.coHostedOrganizer],
        ownedOrganizers: const <Organizer>[],
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: organizerManagerPageEditCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_inline_edit_pending',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostOrganizersMutationCapture(
      mode: _HostOrganizersMutationCaptureMode.inlinePending,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerPageEditCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_inline_edit_error',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostOrganizersMutationCapture(
      mode: _HostOrganizersMutationCaptureMode.inlineError,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerPageEditCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_inline_edit_offline',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostOrganizersMutationCapture(
      mode: _HostOrganizersMutationCaptureMode.inlineOffline,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerPageEditCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_report',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) => const AppRoleCapture(
      role: AppRole.host,
      child: HostInsightsScreen(initialOrganizerId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_loading',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(),
      ...organizerCaptureOverrides(),
      // The report never answers; the controller is held loading directly.
      hostInsightsControllerProvider.overrideWith(
        (ref, request) => HostInsightsState.loading(request.range),
      ),
    ],
    builder: (context) => const AppRoleCapture(
      role: AppRole.host,
      child: HostInsightsScreen(initialOrganizerId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_error',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        analyticsRepository: HostFixtureAnalyticsRepository(
          error: StateError('Capture host analytics failed'),
        ),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) => const AppRoleCapture(
      role: AppRole.host,
      child: HostInsightsScreen(initialOrganizerId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_insights_offline',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        analyticsRepository: HostFixtureAnalyticsRepository(
          error: obviousOfflineException(),
        ),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) => const AppRoleCapture(
      role: AppRole.host,
      child: HostInsightsScreen(initialOrganizerId: 'design-host-sea-face'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_preview_tab',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      uid: _organizerDetailOrganizer.ownerOrPrimaryHostUserId,
      membership: _captureMembership(
        organizerId: _organizerDetailOrganizer.id,
        uid: _organizerDetailOrganizer.ownerOrPrimaryHostUserId ?? 'host-mira',
      ),
      viewModel: AsyncData(
        _organizerDetailViewModel(
          uid: _organizerDetailOrganizer.ownerOrPrimaryHostUserId,
          isHost: true,
        ),
      ),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: _organizerDetailScreenCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_loading',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: const AsyncLoading<HostFormPaymentSetupState>(),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_ready',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(payment: organizerCapturePaymentReady),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_restricted',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncData(
          HostFormPaymentSetupState(
            setup: razorpaySetup(
              ready: false,
              lastErrorCode: 'account_restricted',
            ),
          ),
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_error',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncError<HostFormPaymentSetupState>(
          StateError('Capture payout status failed'),
          StackTrace.empty,
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_offline',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncError<HostFormPaymentSetupState>(
          obviousOfflineException(),
          StackTrace.empty,
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_setup_pending',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncData(
          HostFormPaymentSetupState(
            setup: razorpaySetup(connected: false),
            pending: true,
          ),
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_setup_error',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncData(
          HostFormPaymentSetupState(
            setup: razorpaySetup(connected: false),
            error: StateError('Capture payout setup failed'),
          ),
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_setup_offline',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncData(
          HostFormPaymentSetupState(
            setup: razorpaySetup(connected: false),
            error: obviousOfflineException(),
          ),
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_refresh_pending',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncData(
          HostFormPaymentSetupState(setup: razorpaySetup(), pending: true),
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_refresh_error',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncData(
          HostFormPaymentSetupState(
            setup: razorpaySetup(),
            error: StateError('Capture payout refresh failed'),
          ),
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_payout_refresh_offline',
    routeIds: const <String>['hostOrganizerPaymentsScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      ...hostShellCaptureOverrides(HostOperationsFixtures.hostUid),
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
      ),
      ...organizerCaptureOverrides(
        payment: AsyncData(
          HostFormPaymentSetupState(
            setup: razorpaySetup(),
            error: obviousOfflineException(),
          ),
        ),
      ),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerPaymentsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_team_pending',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostOrganizersMutationCapture(
      mode: _HostOrganizersMutationCaptureMode.teamPending,
      child: AppRoleCapture(role: AppRole.host, child: organizerTeamCapture()),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_team_error',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostOrganizersMutationCapture(
      mode: _HostOrganizersMutationCaptureMode.teamError,
      child: AppRoleCapture(role: AppRole.host, child: organizerTeamCapture()),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_team_offline',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostOrganizersMutationCapture(
      mode: _HostOrganizersMutationCaptureMode.teamOffline,
      child: AppRoleCapture(role: AppRole.host, child: organizerTeamCapture()),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_text_scale_2',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerTabCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_reduced_motion',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerTabCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_clubs_light_dark',
    routeIds: const <String>['hostOrganizersScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerTabCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_active_profile',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_text_scale_2',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_reduced_motion',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_fallback_profile',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        hostedOrganizers: [organizerCaptureOrganizer],
        ownedOrganizers: [organizerCaptureOrganizer],
        hostProfile: const AsyncData<HostProfile?>(null),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_clubs_loading',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        hostedOrganizersAsync: const AsyncLoading<List<Organizer>>(),
        ownedOrganizersAsync: const AsyncLoading<List<Organizer>>(),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_clubs_error',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        hostedOrganizersAsync: AsyncError<List<Organizer>>(
          StateError('Capture hosted clubs failed'),
          StackTrace.empty,
        ),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_clubs_offline',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      ...hostOperationsProviderOverrides(
        hostedOrganizersAsync: AsyncError<List<Organizer>>(
          obviousOfflineException(),
          StackTrace.empty,
        ),
      ),
      ...organizerCaptureOverrides(),
    ],
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_inline_profile_edit',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) =>
        AppRoleCapture(role: AppRole.host, child: organizerSettingsCapture()),
  ),
  ScreenCaptureEntry(
    id: 'host_team_save_profile_pending',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostProfileMutationCapture(
      mode: _HostProfileMutationCaptureMode.savePending,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerSettingsCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_save_profile_error',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostProfileMutationCapture(
      mode: _HostProfileMutationCaptureMode.saveError,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerSettingsCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_save_profile_offline',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostProfileMutationCapture(
      mode: _HostProfileMutationCaptureMode.saveOffline,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerSettingsCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_sign_out_error',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostProfileMutationCapture(
      mode: _HostProfileMutationCaptureMode.signOutError,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerSettingsCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_team_sign_out_offline',
    routeIds: const <String>['hostOrganizerTeamScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerCaptureOverrides(),
    builder: (context) => _HostProfileMutationCapture(
      mode: _HostProfileMutationCaptureMode.signOutOffline,
      child: AppRoleCapture(
        role: AppRole.host,
        child: organizerSettingsCapture(),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_member',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      membership: _captureMembership(
        organizerId: _organizerDetailOrganizer.id,
        uid: captureViewerUid,
      ),
      viewModel: AsyncData(_organizerDetailViewModel()),
    ),
    builder: (context) => _organizerDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_visitor',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      viewModel: AsyncData(_organizerDetailViewModel(isMember: false)),
    ),
    builder: (context) => _organizerDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_guest',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      uid: null,
      viewModel: AsyncData(
        _organizerDetailViewModel(
          uid: null,
          isMember: false,
          isAuthenticated: false,
          includeUserProfile: false,
        ),
      ),
    ),
    builder: (context) => _organizerDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_host_public',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      uid: _organizerDetailOrganizer.ownerOrPrimaryHostUserId,
      membership: _captureMembership(
        organizerId: _organizerDetailOrganizer.id,
        uid: _organizerDetailOrganizer.ownerOrPrimaryHostUserId ?? 'host-mira',
      ),
      viewModel: AsyncData(
        _organizerDetailViewModel(
          uid: _organizerDetailOrganizer.ownerOrPrimaryHostUserId,
          isHost: true,
        ),
      ),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: _organizerDetailScreenCapture(),
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_loading',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      viewModel: const AsyncLoading<OrganizerDetailViewModel?>(),
    ),
    builder: (context) =>
        _organizerDetailScreenCapture(includeInitialOrganizer: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_initial_loading',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      membership: _captureMembership(
        organizerId: _organizerDetailOrganizer.id,
        uid: captureViewerUid,
      ),
      viewModel: const AsyncLoading<OrganizerDetailViewModel?>(),
    ),
    builder: (context) => _organizerDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_empty_schedule',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      membership: _captureMembership(
        organizerId: _organizerDetailOrganizer.id,
        uid: captureViewerUid,
      ),
      viewModel: AsyncData(
        _organizerDetailViewModel(upcomingEvents: const <Event>[]),
      ),
    ),
    builder: (context) => _organizerDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_public',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_initial_loading',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      viewModel: const AsyncLoading<OrganizerDetailViewModel?>(),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_loading',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      viewModel: const AsyncLoading<OrganizerDetailViewModel?>(),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_error',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      viewModel: AsyncError<OrganizerDetailViewModel?>(
        StateError('Capture host club detail failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_offline',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      viewModel: AsyncError<OrganizerDetailViewModel?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_not_found',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      viewModel: const AsyncData<OrganizerDetailViewModel?>(null),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_signed_out',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      uid: null,
      viewModel: AsyncData<OrganizerDetailViewModel?>(
        _hostOrganizerDetailViewModel(uid: null, isHost: false),
      ),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_non_host_preview',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      uid: 'design-host-non-team',
      viewModel: AsyncData<OrganizerDetailViewModel?>(
        _hostOrganizerDetailViewModel(
          uid: 'design-host-non-team',
          isHost: false,
        ),
      ),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_empty_schedule',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(
      viewModel: AsyncData<OrganizerDetailViewModel?>(
        _hostOrganizerDetailViewModel(upcomingEvents: const <Event>[]),
      ),
    ),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_text_scale_2',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_reduced_motion',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_club_detail_light_dark',
    routeIds: const <String>['hostOrganizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    precache: const <ImageProvider<Object>>[_organizerHeroPortraitAssetImage],
    providerOverrides: _hostOrganizerDetailProviderOverrides(),
    builder: (context) => AppRoleCapture(
      role: AppRole.host,
      child: OrganizerDetailScreen(
        organizerId: _hostOrganizerDetailReferenceOrganizer.id,
        initialOrganizer: _hostOrganizerDetailReferenceOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_missing',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      viewModel: const AsyncData<OrganizerDetailViewModel?>(null),
    ),
    builder: (context) =>
        _organizerDetailScreenCapture(includeInitialOrganizer: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_error',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      viewModel: AsyncError<OrganizerDetailViewModel?>(
        StateError('Capture club detail load failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        _organizerDetailScreenCapture(includeInitialOrganizer: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_join_pending',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => _organizerDetailMutationCapture(
      isMember: false,
      isAuthenticated: true,
      isMutating: true,
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_mutation_error',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    builder: (context) => _organizerDetailMutationCapture(
      isMember: false,
      isAuthenticated: true,
      mutationError: StateError('Could not join this club.'),
    ),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_offline',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _organizerDetailProviderOverrides(
      viewModel: AsyncError<OrganizerDetailViewModel?>(
        StateError('No network connection for Club Detail'),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        _organizerDetailScreenCapture(includeInitialOrganizer: false),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_text_scale_2',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    textScale: 2,
    providerOverrides: _organizerDetailProviderOverrides(
      membership: _captureMembership(
        organizerId: _organizerDetailOrganizer.id,
        uid: captureViewerUid,
      ),
      viewModel: AsyncData(_organizerDetailViewModel()),
    ),
    builder: (context) => _organizerDetailScreenCapture(),
  ),
  ScreenCaptureEntry(
    id: 'club_detail_reduced_motion',
    routeIds: const <String>['organizerDetailScreen'],
    device: CaptureDevice.reviewTall,
    disableAnimations: true,
    providerOverrides: _organizerDetailProviderOverrides(
      membership: _captureMembership(
        organizerId: _organizerDetailOrganizer.id,
        uid: captureViewerUid,
      ),
      viewModel: AsyncData(_organizerDetailViewModel()),
    ),
    builder: (context) => _organizerDetailScreenCapture(),
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
      organizerNames: const AsyncLoading<Map<String, String>>(),
    ),
    builder: (context) => CalendarScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'calendar_club_names_error',
    routeIds: const <String>['calendarScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _calendarProviderOverrides(
      organizerNames: AsyncError<Map<String, String>>(
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
      organizerNames: const AsyncLoading<Map<String, String>>(),
    ),
    builder: (context) => SavedEventsScreen(referenceNow: _captureNow),
  ),
  ScreenCaptureEntry(
    id: 'saved_events_club_names_error',
    routeIds: const <String>['savedEventsScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: _savedEventsProviderOverrides(
      organizerNames: AsyncError<Map<String, String>>(
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
  memberEventDiscoveryCapture,
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
      joinedOrganizerIds: {memberDiscoveryOrganizers.first.id},
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
          event: memberDiscoveryItems[2].event,
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
      sourceOrganizers: const AsyncLoading<List<Organizer>>(),
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
      sourceOrganizers: AsyncError<List<Organizer>>(
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
      sourceOrganizers: const AsyncData<List<Organizer>>([]),
      viewModel: const AsyncData(
        ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
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
        ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
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
        ExploreViewModel(joinedOrganizers: [], allOrganizers: []),
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
      sourceOrganizers: AsyncError<List<Organizer>>(
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
      sourceOrganizers: AsyncData<List<Organizer>>([
        _unclaimedDiscoveryOrganizer,
      ]),
      viewModel: AsyncData(
        ExploreViewModel.partition(
          organizers: [_unclaimedDiscoveryOrganizer],
          joinedOrganizerIds: const <String>{},
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
      deviceLocationProvider.overrideWith(CaptureDeviceLocation.new),
      exploreFeedViewModelProvider.overrideWithValue(
        AsyncData(ExploreFeedViewModel(items: memberDiscoveryItems)),
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
        initialSelectedEventId: memberDiscoveryEvents.first.id,
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
    id: 'host_onboarding_sign_in',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostOnboardingSignInOverrides(),
    builder: (context) => hostOnboardingSignInCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_onboarding_code',
    routeIds: const <String>['authScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostOnboardingCodeOverrides(),
    builder: (context) => hostOnboardingCodeCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_onboarding_start_page',
    routeIds: const <String>['hostCreateOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostOnboardingSetupOverrides(HostSetupStep.start),
    builder: (context) => hostOnboardingSetupCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_onboarding_details',
    routeIds: const <String>['hostCreateOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostOnboardingSetupOverrides(HostSetupStep.details),
    builder: (context) => hostOnboardingSetupCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_onboarding_payments',
    routeIds: const <String>['hostCreateOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostOnboardingSetupOverrides(HostSetupStep.payments),
    builder: (context) => hostOnboardingSetupCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_onboarding_done',
    routeIds: const <String>['hostCreateOrganizerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostOnboardingSetupOverrides(HostSetupStep.done),
    builder: (context) => hostOnboardingSetupCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_media_gallery_manager',
    routeIds: const <String>[
      'hostCreateOrganizerScreen',
      'hostCreateEventScreen',
    ],
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
    id: 'host_create_route_loading',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      organizerValue: const AsyncLoading<Organizer?>(),
    ),
    builder: (context) =>
        CreateRouteScreen(organizerId: _dashboardHostOrganizer.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_route_error',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      organizerValue: AsyncError<Organizer?>(
        StateError('Capture Host Create Event club failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        CreateRouteScreen(organizerId: _dashboardHostOrganizer.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_route_offline',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      organizerValue: AsyncError<Organizer?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) =>
        CreateRouteScreen(organizerId: _dashboardHostOrganizer.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_not_found',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      organizerValue: const AsyncData<Organizer?>(null),
    ),
    builder: (context) =>
        CreateRouteScreen(organizerId: _dashboardHostOrganizer.id),
  ),
  ScreenCaptureEntry(
    id: 'host_create_unauthorized',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      uid: HostOperationsFixtures.guestUid,
    ),
    builder: (context) => CreateRouteScreen(
      organizerId: _dashboardHostOrganizer.id,
      arguments: HostCreateEventRouteArguments(
        initialOrganizer: _dashboardHostOrganizer,
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_create_initial_club_extra',
    routeIds: const <String>['hostCreateEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostCreateEventProviderOverrides(
      uid:
          _dashboardHostOrganizer.ownerOrPrimaryHostUserId ??
          HostOperationsFixtures.hostUid,
      organizerValue: const AsyncLoading<Organizer?>(),
    ),
    builder: (context) => CreateRouteScreen(
      organizerId: _dashboardHostOrganizer.id,
      arguments: HostCreateEventRouteArguments(
        initialOrganizer: _dashboardHostOrganizer,
      ),
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
      initialSearchQuery: 'Harbour Line Social',
      initialSearchError: obviousOfflineException(),
      usePlatformMapView: false,
      loadMapTiles: false,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardHostEvent,
    ),
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardHostEvent,
      enableNetworkTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_route_loading',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      organizerValue: const AsyncLoading<Organizer?>(),
      eventValue: const AsyncLoading<Event?>(),
    ),
    builder: (context) => EditEventRouteScreen(
      organizerId: _dashboardHostOrganizer.id,
      eventId: _dashboardEditableHostEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_route_error',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      organizerValue: AsyncError<Organizer?>(
        StateError('Capture Host Edit Event club failed'),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EditEventRouteScreen(
      organizerId: _dashboardHostOrganizer.id,
      eventId: _dashboardEditableHostEvent.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_offline',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      organizerValue: AsyncError<Organizer?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
    ),
    builder: (context) => EditEventRouteScreen(
      organizerId: _dashboardHostOrganizer.id,
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
    builder: (context) => EditEventRouteScreen(
      organizerId: _dashboardHostOrganizer.id,
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
    builder: (context) => EditEventRouteScreen(
      organizerId: _dashboardHostOrganizer.id,
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
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardScheduleLockedHostEvent,
      enableNetworkTiles: false,
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
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardCancelledHostEvent,
      enableNetworkTiles: false,
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
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardPrivateAccessHostEvent,
      enableNetworkTiles: false,
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
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardValidationHostEvent,
      enableNetworkTiles: false,
      now: () => _captureNow,
    ),
    drive: _driveEditValidationCapture,
  ),
  ScreenCaptureEntry(
    id: 'edit_hosted_event_location_selected',
    routeIds: const <String>['hostAppEditEventScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostEditEventProviderOverrides(
      event: _dashboardPinnedLocationHostEvent,
    ),
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardPinnedLocationHostEvent,
      enableNetworkTiles: false,
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
      child: EditEventScreen(
        organizer: _dashboardHostOrganizer,
        event: _dashboardEditableHostEvent,
        enableNetworkTiles: false,
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
      child: EditEventScreen(
        organizer: _dashboardHostOrganizer,
        event: _dashboardEditableHostEvent,
        enableNetworkTiles: false,
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
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardEditableHostEvent,
      enableNetworkTiles: false,
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
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardEditableHostEvent,
      enableNetworkTiles: false,
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
    builder: (context) => EditEventScreen(
      organizer: _dashboardHostOrganizer,
      event: _dashboardEditableHostEvent,
      enableNetworkTiles: false,
      now: () => _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_event_rehearsal_practice_console',
    routeIds: const <String>['hostEventRehearsalScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: [
      eventRehearsalProvider('capture-rehearsal').overrideWith(
        (ref) => Stream.value(_eventRehearsalRuntimeCaptureBootstrap()),
      ),
    ],
    builder: (context) => const HostRehearsalPracticeScreen(
      organizerId: 'capture-club',
      sessionId: 'capture-rehearsal',
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_event_rehearsal_practice_tools',
    routeIds: const <String>['hostEventRehearsalScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: [
      eventRehearsalProvider('capture-rehearsal').overrideWith(
        (ref) => Stream.value(_eventRehearsalRuntimeCaptureBootstrap()),
      ),
    ],
    builder: (context) => const HostRehearsalPracticeToolsScreen(
      organizerId: 'capture-club',
      sessionId: 'capture-rehearsal',
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_route_loading',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      organizerValue: const AsyncLoading<Organizer?>(),
      eventValue: const AsyncLoading<Event?>(),
    ),
    builder: (context) => _hostManageRouteCapture(includeInitialEvent: false),
  ),
  ScreenCaptureEntry(
    id: 'host_manage_route_error',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: _hostManageRouteProviderOverrides(
      organizerValue: AsyncError<Organizer?>(
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
      organizerValue: AsyncError<Organizer?>(
        obviousOfflineException(),
        StackTrace.empty,
      ),
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
    id: 'host_live_room_workspace',
    routeIds: const <String>['hostAppEventManageScreen'],
    device: CaptureDevice.iphone17Pro,
    // Room is pushed over the console, so the capture includes overlays
    // and holds animations still.
    disableAnimations: true,
    includeOverlays: true,
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(captureViewerUid)),
      watchUserProfileProvider.overrideWith(
        (ref) => Stream.value(captureViewer),
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
      watchEventSuccessSelectedLayoutProvider(
        organizerId: _hostLiveRoomReferenceEvent.organizerId,
        layoutId: _hostLiveRoomReferenceLayout.layoutId,
      ).overrideWith((ref) => Stream.value(_hostLiveRoomReferenceLayout)),
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
    builder: (context) => HostLiveScreen(
      organizer: _hostLiveReferenceOrganizer,
      event: _hostLiveRoomReferenceEvent,
      onBack: () {},
      onOpenGuests: () {},
      now: _hostLiveRoomReferenceEvent.startTime.add(
        const Duration(minutes: 55),
      ),
    ),
    drive: (tester) async {
      await tester.tap(find.text('Room'));
      await pumpFeatureUi(tester);
    },
  ),
  hostLiveConsoleCapture,
  hostPostEventReportCapture,
  hostLiveTabletCollegesCapture,
  hostLiveTabletCommunitiesCapture,
  hostLiveTabletCreatorsCapture,
  hostLiveTabletFacilitiesCapture,
  hostLiveTabletOutdoorsCapture,
  hostLiveTabletRacketSportsCapture,
  hostLiveTabletRunsCapture,
  hostLiveTabletStudiosCapture,
  hostLiveTabletSuppersCapture,
  hostLiveTabletTeamsCapture,
  hostLiveTabletVenuesCapture,
  hostLiveTabletWorkshopsCapture,
  hostCreateCollegesCapture,
  hostCreateCommunitiesCapture,
  hostCreateNightlifeCapture,
  hostCreateRacketSportsCapture,
  hostCreateRunsCapture,
  hostCreateStudiosCapture,
  hostCreateSuppersCapture,
  hostCreateTeamsCapture,
  hostCreateVenuesCapture,
  hostPostEventReportMoreCapture,

  ScreenCaptureEntry(
    id: 'notifications_activity',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventCardsProvider(captureViewerUid).overrideWithValue(
        AsyncData(guestEventCardsOf(_dashboardSignedUpEvents)),
      ),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_mark_all_read_pending',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventCardsProvider(captureViewerUid).overrideWithValue(
        AsyncData(guestEventCardsOf(_dashboardSignedUpEvents)),
      ),
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventCardsProvider(captureViewerUid).overrideWithValue(
        AsyncData(guestEventCardsOf(_dashboardSignedUpEvents)),
      ),
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
      ).overrideWithValue(AsyncData(_activityScreenNotifications)),
      watchSignedUpEventCardsProvider(captureViewerUid).overrideWithValue(
        AsyncData(guestEventCardsOf(_dashboardSignedUpEvents)),
      ),
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
      ).overrideWithValue(const AsyncLoading()),
    ],
    builder: (context) => const ActivityScreen(),
  ),
  ScreenCaptureEntry(
    id: 'notifications_activity_error',
    routeIds: const <String>['notificationsScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(captureViewerUid).overrideWithValue(
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchActivityNotificationsProvider(
        captureViewerUid,
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
    id: 'event_recap_host_photos',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    precache: _eventScenePhotoAssetImages,
    providerOverrides: _eventRecapProviderOverrides(
      hostPhotos: _eventRecapHostPhotos,
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
    drive: _driveEventRecapToHostPhotos,
  ),
  ScreenCaptureEntry(
    id: 'event_recap_host_photos_none',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
  ),
  ScreenCaptureEntry(
    id: 'event_recap_host_photo_viewer',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    precache: _eventScenePhotoAssetImages,
    builder: (context) => EventHostPhotoViewerScreen(
      photos: _eventRecapHostPhotos,
      initialIndex: 1,
    ),
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
  guestAfterEventCapture,
  ScreenCaptureEntry(
    id: 'event_recap_rated_following',
    routeIds: const <String>['eventRecapScreen'],
    device: CaptureDevice.reviewPhone,
    providerOverrides: _eventRecapProviderOverrides(
      feedback: EventSuccessFeedback(
        id: 'event-recap-capture_runner-viewer',
        eventId: _eventRecapEvent.id,
        organizerId: _eventRecapEvent.organizerId,
        uid: captureViewerUid,
        welcomeRating: 4,
        structureRating: 4,
        metNewPeopleCount: 3,
        createdAt: DateTime(2026, 5, 30, 9),
        updatedAt: DateTime(2026, 5, 30, 9),
      ),
      followedOrganizerIds: {_dashboardJoinedOrganizer.id},
    ),
    builder: (context) => EventRecapScreen(eventId: _eventRecapEvent.id),
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
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
      organizerId: _eventSuccessCompanionEvent.organizerId,
      eventId: _eventSuccessCompanionEvent.id,
      initialEvent: _eventSuccessCompanionEvent,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: [
      uidProvider.overrideWith((ref) => Stream.value(captureViewerUid)),
      eventSuccessLiveEffectsControllerProvider.overrideWith(
        (ref) => NoopEventSuccessLiveEffectsController(),
      ),
    ],
    builder: (context) => EventSuccessCompanionScreen(
      event: _eventSuccessCompanionEvent,
      plan: _eventSuccessCompanionPlan,
      userProfile: captureViewer,
      participation: _eventSuccessCompanionParticipation,
      wingmanRequestCandidates: _matchesListProfiles,
      now: _captureNow,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_self_check_in',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_self_check_in_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      mutationMode: EventSuccessCompanionMutationCaptureMode.selfCheckInPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_pre_arrival_planning',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.firstHelloPlan,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      onStartArrivalMission: () async {},
      onSkipArrivalMission: () {},
      mutationMode:
          EventSuccessCompanionMutationCaptureMode.firstHelloStartPending,
    ),
  ),
  eventSuccessCompanionFirstHelloAssignedCapture,
  ScreenCaptureEntry(
    id: 'event_success_companion_first_hello_complete_pending',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.firstHelloPlan,
      arrivalMission: EventSuccessCompanionFixtures.arrivalMission,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(minutes: 5),
      ),
      onCompleteArrivalMission: (_, _) async {},
      mutationMode:
          EventSuccessCompanionMutationCaptureMode.firstHelloCompletePending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_compatibility_questionnaire',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.questionnairePlan,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(minutes: 30),
      ),
      onSaveCompatibilityAnswers: (_) async {},
      mutationMode:
          EventSuccessCompanionMutationCaptureMode.compatibilityPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_compatibility_saved',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.conversationCuesPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(minutes: 50),
      ),
    ),
  ),
  eventSuccessCompanionMicroPodAssignmentCapture,
  ScreenCaptureEntry(
    id: 'event_success_companion_micro_pod_loading_peers',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      assignment: EventSuccessCompanionFixtures.microPodAssignment,
      assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.subtract(
        const Duration(hours: 1),
      ),
      mutationMode:
          EventSuccessCompanionMutationCaptureMode.microPodsOptOutPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_table_group_rotations',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
      mutationMode:
          EventSuccessCompanionMutationCaptureMode.guidedRotationsOptOutPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_live_reveal_countdown',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      plan: EventSuccessCompanionFixtures.wingmanPlan,
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      wingmanRequestCandidates: EventSuccessCompanionFixtures.peers,
      now: EventSuccessCompanionFixtures.socialStart.add(
        const Duration(hours: 1),
      ),
      mutationMode:
          EventSuccessCompanionMutationCaptureMode.wingmanRequestPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_wingman_submitted',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
      participation: EventSuccessCompanionFixtures.attendedParticipation(),
      existingFeedback: EventSuccessCompanionFixtures.feedback,
      now: EventSuccessCompanionFixtures.socialEvent.endTime.add(
        const Duration(hours: 2),
      ),
      mutationMode: EventSuccessCompanionMutationCaptureMode.feedbackPending,
    ),
  ),
  ScreenCaptureEntry(
    id: 'event_success_companion_text_scale_2',
    routeIds: const <String>['eventSuccessCompanionScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    textScale: 2,
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    disableAnimations: true,
    builder: (context) => eventSuccessCompanionCapture(
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
    providerOverrides: eventSuccessCompanionProviderOverrides(),
    builder: (context) => eventSuccessCompanionCapture(
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
  matchChatContextCapture,
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
    builder: (context) => ReferenceChromeSafeArea(
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
      uidProvider.overrideWith((ref) => Stream.value(matchChatViewerUid)),
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
    id: 'host_form_overview',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostFormBuilderScreen(
      organizerId: HostOperationsFixtures.primaryOrganizer.id,
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
      organizerId: HostOperationsFixtures.primaryOrganizer.id,
      formId: 'saturday-social-application',
    ),
    providerOverrides: _audienceCaptureFormOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_settings',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostFormSettingsScreen(
      organizerId: HostOperationsFixtures.primaryOrganizer.id,
      formId: 'saturday-social-application',
    ),
    providerOverrides: _audienceCaptureFormOverrides(),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_preview',
    routeIds: const <String>['hostFormPreviewScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => HostFormPreviewScreen(
      organizerId: HostOperationsFixtures.primaryOrganizer.id,
      formId: 'saturday-social-application',
    ),
    providerOverrides: _audienceCaptureFormOverrides(),
    includeOverlays: true,
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
  hostApplicationDetailCapture,
  ScreenCaptureEntry(
    id: 'host_customer_add',
    routeIds: const <String>['hostAddCustomerScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostShellCaptureOverrides(
      HostOperationsFixtures.hostUid,
    ),
    builder: (context) => HostAddCustomerScreen(
      organizerId: HostOperationsFixtures.primaryOrganizer.id,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_add_person',
    routeIds: const <String>['hostAddCustomerScreen'],
    device: CaptureDevice.iphone17Pro,
    builder: (_) => const HostAddCustomerScreen(organizerId: 'org_1'),
    includeOverlays: true,
  ),
  ScreenCaptureEntry(
    id: 'host_form_builder_draft',
    routeIds: const <String>['hostFormBuilderScreen'],
    device: CaptureDevice.auditDesktop,
    providerOverrides: [
      hostFormEditorControllerProvider(
        HostOperationsFixtures.primaryOrganizer.id,
        'saturday-social-application',
      ).overrideWith(() => _CaptureHostFormEditorController()),
    ],
    builder: (context) => HostFormBuilderScreen(
      organizerId: HostOperationsFixtures.primaryOrganizer.id,
      formId: 'saturday-social-application',
    ),
  ),
  // Host Messages and Sends (the redesigned inbox): the people capture
  // fixtures with Messages in each state.
  ScreenCaptureEntry(
    id: 'host_inbox_queries',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: [
      ...hostShellCaptureOverrides(
        HostOperationsFixtures.hostUid,
        unreadCount: 1,
      ),
      ...hostPeopleCaptureOverrides(
        messages: messagesEventState(),
        messagesScope: messagesEventScope,
      ),
    ],
    builder: (context) => HostRoutedShellCapture(
      initialLocation: '/host/inbox',
      activeIndex: 3,
      child: hostMessagesCapture(scope: messagesEventScope),
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_messaging_campaigns',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.claudePhone390,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostSendsCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_uid_loading',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(
      organizer: const HostPeopleOrganizer(scope: HostPeopleScope.loading),
    ),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_loading',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(
      messages: const HostMessagesState.loading(),
    ),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_error',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(
      messages: messagesErrorState(StateError('Capture host inbox failed')),
    ),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_offline',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(
      messages: messagesErrorState(
        _matchesOfflineException(action: 'load host inbox'),
      ),
    ),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_empty',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(messages: messagesEmptyState),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_prospective',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(
      messages: messagesEventState(
        segment: HostInboxAudienceSegment.prospective,
      ),
      messagesScope: messagesEventScope,
      messagesSegment: HostInboxAudienceSegment.prospective,
    ),
    builder: (context) => hostMessagesCapture(
      scope: messagesEventScope,
      segment: HostInboxAudienceSegment.prospective,
    ),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_general',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(
      messages: messagesGeneralState(),
      messagesScope: const HostInboxScope.general(),
    ),
    builder: (context) =>
        hostMessagesCapture(scope: const HostInboxScope.general()),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_roster_no_threads',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(
      messages: messagesEventState(withThreads: false),
      messagesScope: messagesEventScope,
    ),
    builder: (context) => hostMessagesCapture(scope: messagesEventScope),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_broadcast_composer',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostComposeCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_broadcast_pending',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) =>
        hostComposeSendCapture(HostComposeCaptureSend.pending),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_broadcast_error',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostComposeSendCapture(HostComposeCaptureSend.failed),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_text_scale_2',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    textScale: 2,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_reduced_motion',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.iphone17Pro,
    disableAnimations: true,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostMessagesCapture(),
  ),
  ScreenCaptureEntry(
    id: 'host_inbox_light_dark',
    routeIds: const <String>['hostInboxScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: hostPeopleCaptureOverrides(),
    builder: (context) => hostMessagesCapture(),
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        captureViewerUid,
      ).overrideWith((ref) => Stream.value(null)),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_loading',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        captureViewerUid,
      ).overrideWith((ref) => _captureLoadingStream()),
    ],
    builder: (context) => const LaunchAccessApplicationScreen(),
  ),
  ScreenCaptureEntry(
    id: 'launch_access_submit_pending',
    routeIds: const <String>['launchAccessScreen'],
    device: CaptureDevice.reviewTall,
    providerOverrides: [
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        captureViewerUid,
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(captureViewerUid).overrideWith(
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(captureViewerUid).overrideWith(
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(captureViewerUid).overrideWith(
        (ref) => Stream.value(
          const LaunchAccessApplication(
            uid: captureViewerUid,
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        captureViewerUid,
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
      uidProvider.overrideWithValue(const AsyncData(captureViewerUid)),
      watchLaunchAccessApplicationProvider(
        captureViewerUid,
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
  final marketing = marketingScreenCaptures[id];
  if (marketing != null) return marketing();
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
          .setCity(memberDiscoveryCities.first);
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

/// The guest event cards the history lists read, from capture events.
AsyncValue<Map<String, GuestEventCard>> _captureCardsById(
  AsyncValue<List<Event>> events,
) => switch (events) {
  AsyncData(:final value) => AsyncData({
    for (final event in value) event.id: GuestEventCard.fromEvent(event),
  }),
  AsyncError(:final error, :final stackTrace) => AsyncError(error, stackTrace),
  _ => const AsyncLoading(),
};

/// The guest event cards capture events would carry.
AsyncValue<List<GuestEventCard>> _captureCardsAsync(
  AsyncValue<List<Event>> events,
) => switch (events) {
  AsyncData(:final value) => AsyncData(guestEventCardsOf(value)),
  AsyncError(:final error, :final stackTrace) => AsyncError(error, stackTrace),
  _ => const AsyncLoading(),
};

// The seated night behind `host_live_room_workspace`: a saved room layout,
// its assignments and roster, opened on the rebuilt live console.
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

final _hostLiveReferenceOperationalAttendees = List<EventAttendee>.generate(
  24,
  (index) => EventAttendee(
    id: 'host-live-attendee-$index',
    eventId: _hostLiveReferenceEvent.id,
    organizerId: _hostLiveReferenceEvent.organizerId,
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

final _hostLiveReferenceOrganizer = _dashboardHostOrganizer.copyWith(
  name: 'Harbour Line Social',
);

final _hostLiveReferenceParticipationRepository =
    FakeEventParticipationRepository()
      ..eventParticipations[_hostLiveReferenceEvent.id] = const [];

final _hostLiveReferencePublicProfileRepository = FakePublicProfileRepository()
  ..profiles = _hostLiveReferenceProfiles;

final _hostLiveRoomAssignments = <EventSuccessAssignment>[
  for (final indexed in _hostLiveReferenceProfiles.take(20).indexed)
    EventSuccessAssignment(
      id: '${_hostLiveRoomReferenceEvent.id}_micro_pods_${indexed.$2.uid}',
      eventId: _hostLiveRoomReferenceEvent.id,
      organizerId: _hostLiveRoomReferenceEvent.organizerId,
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

final _hostProfileIds = [
  for (final participation in _hostParticipations) participation.uid,
];

final _hostProfileRows = <String, (String, String?)>{
  for (final profile in _hostGuestProfiles)
    profile.uid: (profile.name, profile.primaryPhotoThumbnailUrl),
};

final _hostAttendeeIds = [
  for (final participation in _hostParticipations)
    if (participation.status != EventParticipationStatus.waitlisted)
      participation.uid,
];

final _hostGuestProfiles = captureFixtures.rosterProfiles(
  count: (_hostEvent.bookedCount ?? 0) + (_hostEvent.waitlistedCount ?? 0),
);

final _hostLiveReferenceEvent = _hostEvent.copyWith(
  startTime: DateTime(2026, 6, 9, 20),
  endTime: DateTime(2026, 6, 9, 22),
  meetingPoint: 'The Salt Air Bar',
  meetingLocation: const EventMeetingLocation(
    name: 'The Salt Air Bar',
    address: 'Bandra West, Mumbai',
    latitude: 19.0607,
    longitude: 72.8362,
  ),
  startingPointLat: 19.0607,
  startingPointLng: 72.8362,
  locationDetails: 'The Salt Air Bar',
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

final _hostLiveReferenceProfiles = captureFixtures.rosterProfiles(count: 24);

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

final _hostParticipations = captureFixtures.participationsForProfiles(
  event: _hostEvent,
  profiles: _hostGuestProfiles,
  attendedCount:
      _hostEvent.checkedInCount ?? salesDemoHostScenario.defaultCheckedInCount,
  waitlistedCount:
      _hostEvent.waitlistedCount ??
      salesDemoHostScenario.defaultWaitlistedCount,
  createdAt: DateTime(2026, 5, 28, 10),
);

final _hostWaitlistedIds = [
  for (final participation in _hostParticipations)
    if (participation.status == EventParticipationStatus.waitlisted)
      participation.uid,
];
