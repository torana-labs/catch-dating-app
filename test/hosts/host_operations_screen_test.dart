import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:catch_dating_app/clubs/presentation/detail/club_detail_view_model.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
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
import 'package:catch_dating_app/contexts/audience/domain/crm/host_messaging_setup.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_definition.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience_filter_options.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_whatsapp_thread.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/manager_event_setup_defaults_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/events/domain/event_policy_defaults.dart';
import 'package:catch_dating_app/contexts/insights/data/host_analytics_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_attention_item.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_profile_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/host_tracking_settings_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club.dart';
import 'package:catch_dating_app/contexts/organizers/domain/club_host_defaults.dart';
import 'package:catch_dating_app/contexts/organizers/domain/host_profile.dart';
import 'package:catch_dating_app/contexts/organizers/domain/update_club_patch.dart';
import 'package:catch_dating_app/contexts/payments/data/host_payment_account_repository.dart';
import 'package:catch_dating_app/contexts/payments/domain/host_payment_account.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/core/app_config.dart';
import 'package:catch_dating_app/core/app_error_message.dart';
import 'package:catch_dating_app/core/data/cursor_page.dart';
import 'package:catch_dating_app/core/data/read_limit_policy.dart';
import 'package:catch_dating_app/core/external_links.dart';
import 'package:catch_dating_app/core/firebase_providers.dart';
import 'package:catch_dating_app/core/media/uploaded_photo.dart';
import 'package:catch_dating_app/core/presentation/catch_async_state.dart';
import 'package:catch_dating_app/core/presentation/catch_ui_copy.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_localized_error_state.dart';
import 'package:catch_dating_app/core/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/core/theme/activity_palette.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/core/widgets/ordered_photo_picker.dart';
import 'package:catch_dating_app/events/shared/event_tiles/event_date_rail_card.dart';
import 'package:catch_dating_app/exceptions/app_exception.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/create/widgets/create_club_photos_picker.dart';
import 'package:catch_dating_app/hosts/presentation/club_management/host_club_edit_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_memory_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_outreach_sheet.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_row.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_timeline_section.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_controller.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen_state.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_no_organizer_empty_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations/host_manager_event_setup_defaults_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/hosts/presentation/host_team_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/host_team_workspace_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_card.dart';
import 'package:catch_dating_app/hosts/presentation/payments/host_payment_account_controller_card.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_loading_skeleton.dart';
import 'package:catch_dating_app/hosts/presentation/widgets/host_tracking_settings_input_section.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_preference_controller.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_roadmap_provider.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_screen.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_body.dart';
import 'package:catch_dating_app/hosts/today/presentation/widgets/host_today_overview.dart';
import 'package:catch_dating_app/l10n/generated/app_localizations_en.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/swipes/shared/profile_surface/profile_surface.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:fake_cloud_firestore/fake_cloud_firestore.dart';
import 'package:firebase_auth_mocks/firebase_auth_mocks.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:url_launcher/url_launcher.dart';

import '../clubs/clubs_test_helpers.dart';
import '../support/catch_test_fonts.dart';
import '../test_pump_helpers.dart';

part 'host_audience_directory_consistency_tests.dart';
part 'host_operations_analytics_team_tests.dart';
part 'host_operations_club_workspace_tests.dart';
part 'host_operations_customer_communications_tests.dart';
part 'host_operations_customer_composition_tests.dart';
part 'host_operations_customer_detail_tests.dart';
part 'host_operations_customer_editor_tests.dart';
part 'host_operations_customer_reach_tests.dart';
part 'host_operations_customer_state_tests.dart';
part 'host_operations_customer_summary_filters_tests.dart';
part 'host_operations_customers_test_support.dart';
part 'host_operations_customers_tests.dart';
part 'host_operations_presence_tests.dart';
part 'host_operations_saved_audience_failure_tests.dart';
part 'host_operations_state_events_tests.dart';
part 'host_operations_team_failures_tests.dart';
part 'support/host_operations_screen_test_support.dart';

const _hostUid = 'host-1';

void main() {
  setUpAll(() => initializeDateFormatting('en'));
  setUpAll(() async {
    if (const String.fromEnvironment('HOST_PRESENCE_PREVIEW_DIR').isNotEmpty) {
      await loadCatchTestFonts();
    }
  });
  setUp(() {
    AppConfig.configureEntrypointRole(AppRole.host);
  });

  tearDown(AppConfig.resetEntrypointRoleOverrideForTesting);

  _registerHostOperationsStateEventsTests();
  _registerHostOperationsClubWorkspaceTests();
  _registerHostOperationsCustomersTests();
  _registerAudienceDirectoryConsistencyTests();
  _registerHostOperationsCustomerDetailTests();
  _registerHostOperationsCustomerCompositionTests();
  _registerHostOperationsCustomerReachTests();
  _registerHostOperationsCustomerSummaryFiltersTests();
  _registerHostOperationsSavedAudienceFailureTests();
  _registerHostOperationsCustomerEditorTests();
  _registerHostOperationsCustomerCommunicationsTests();
  _registerHostOperationsCustomerStateTests();
  _registerHostOperationsAnalyticsTeamTests();
  _registerHostOperationsPresenceTests();
  _registerHostOperationsTeamFailuresTests();
}

Future<void> _editHostTeamProfileField(
  WidgetTester tester, {
  required String title,
  required String value,
}) async {
  final field = find.byWidgetPredicate(
    (widget) => widget is CatchField && widget.title == title,
  );
  await tester.ensureVisible(field);
  await tester.tap(field);
  await pumpFeatureUi(tester);
  final input = find.descendant(of: field, matching: find.byType(TextField));
  expect(input, findsOneWidget);
  await tester.enterText(input, value);
  await tester.tap(find.byKey(const ValueKey('catch-field-done')));
  await pumpFeatureUi(tester);
}

Club _hostTeamClub() => buildClub(
  id: 'owned-club',
  name: 'Saket Run Club',
  ownerUserId: _hostUid,
  hostProfiles: const [
    ClubHostProfile(
      uid: _hostUid,
      displayName: 'Catch Host',
      role: ClubHostRole.owner,
    ),
  ],
);

ClubDetailViewModel _previewViewModel(
  Club club, {
  List<Event> events = const [],
}) {
  return ClubDetailViewModel(
    club: club,
    isHost: true,
    isMember: true,
    upcomingEvents: events,
    reviews: const [],
    userProfile: buildUser(uid: _hostUid),
    uid: _hostUid,
    isAuthenticated: true,
  );
}

Future<void> _pumpHostScreen(
  WidgetTester tester,
  Widget child, {
  List overrides = const [],
  bool settle = true,
  bool resetProviderScope = false,
}) async {
  final router = GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(path: '/', builder: (_, _) => child),
      GoRoute(
        path: Routes.hostOrganizerScreen.path,
        name: Routes.hostOrganizerScreen.name,
        builder: (_, state) => state.uri.queryParameters['setting'] == null
            ? const Text('Organizer route')
            : hostOrganizerScreenForUri(state.uri),
      ),
      GoRoute(
        path: Routes.hostTodayScreen.path,
        name: Routes.hostTodayScreen.name,
        builder: (_, state) => Column(
          children: [
            Text('Manage ${state.uri.queryParameters['eventId']}'),
            Text('Section ${state.uri.queryParameters['section'] ?? 'setup'}'),
          ],
        ),
      ),
      GoRoute(
        path: Routes.hostCreateClubScreen.path,
        name: Routes.hostCreateClubScreen.name,
        builder: (_, _) => const Text('Create club route'),
      ),
      GoRoute(
        path: Routes.hostCreateEventScreen.path,
        name: Routes.hostCreateEventScreen.name,
        builder: (_, state) => switch (state.extra) {
          final HostCreateEventRouteArguments arguments
              when arguments.initialPrefill != null =>
            Text('Repeat ${arguments.initialPrefill!.sourceEventId}'),
          final HostCreateEventRouteArguments arguments
              when arguments.initialDraft != null =>
            Text('Draft ${arguments.initialDraft!.id}'),
          _ => Text('Create ${state.pathParameters['clubId']}'),
        },
      ),
      GoRoute(
        path: Routes.hostEventRehearsalStartScreen.path,
        name: Routes.hostEventRehearsalStartScreen.name,
        builder: (_, state) =>
            Text('Rehearse ${state.pathParameters['clubId']}'),
      ),
      GoRoute(
        path: Routes.hostClubTeamScreen.path,
        name: Routes.hostClubTeamScreen.name,
        builder: (_, state) => HostClubTeamScreen(
          clubId: state.uri.queryParameters['clubId'] ?? '',
        ),
      ),
      GoRoute(
        path: Routes.hostInboxScreen.path,
        name: Routes.hostInboxScreen.name,
        builder: (_, state) => Text(
          'Messaging ${state.uri.queryParameters['workspace']} '
          '${state.uri.queryParameters['segment']}',
        ),
      ),
      GoRoute(
        path: Routes.hostOrganizerMessagingScreen.path,
        name: Routes.hostOrganizerMessagingScreen.name,
        builder: (_, state) =>
            Text('Messaging setup ${state.pathParameters['clubId']}'),
      ),
      GoRoute(
        path: Routes.hostClubDetailScreen.path,
        name: Routes.hostClubDetailScreen.name,
        builder: (_, state) => Text('Club ${state.pathParameters['clubId']}'),
      ),
      GoRoute(
        path: Routes.hostClubEventDefaultsScreen.path,
        name: Routes.hostClubEventDefaultsScreen.name,
        builder: (_, state) => HostClubEventDefaultsScreen(
          clubId: state.uri.queryParameters['clubId'] ?? '',
        ),
      ),
      GoRoute(
        path: Routes.hostClubLiveGuideScreen.path,
        name: Routes.hostClubLiveGuideScreen.name,
        builder: (_, state) => HostClubLiveGuideScreen(
          clubId: state.uri.queryParameters['clubId'] ?? '',
        ),
      ),
      GoRoute(
        path: Routes.hostClubPaymentsScreen.path,
        name: Routes.hostClubPaymentsScreen.name,
        builder: (_, state) => HostClubPaymentsScreen(
          clubId: state.uri.queryParameters['clubId'] ?? '',
        ),
      ),
      GoRoute(
        path: Routes.hostAppEventManageScreen.path,
        name: Routes.hostAppEventManageScreen.name,
        builder: (_, state) => Column(
          children: [
            Text('Manage ${state.pathParameters['eventId']}'),
            Text('Section ${state.uri.queryParameters['section'] ?? 'setup'}'),
          ],
        ),
      ),
      GoRoute(
        path: Routes.hostAppEventDetailScreen.path,
        name: Routes.hostAppEventDetailScreen.name,
        builder: (_, state) => Text(
          'Event ${state.pathParameters['clubId']} '
          '${state.pathParameters['eventId']}',
        ),
      ),
    ],
  );

  await tester.pumpWidget(
    ProviderScope(
      key: resetProviderScope ? UniqueKey() : null,
      overrides: [
        firebaseFirestoreProvider.overrideWithValue(FakeFirebaseFirestore()),
        hostTodayPreferenceProvider.overrideWith(
          (ref, scope) async => const HostTodayPreference.skipped(),
        ),
        hostTodayRoadmapProvider.overrideWith(
          (ref, scope) => const HostTodayRoadmapEvidence(),
        ),
        hostTrackingSettingsProvider.overrideWith(
          (ref, organizerId) async => HostTrackingSettings(
            organizerId: organizerId,
            revision: 0,
            metaPixelId: null,
            googleMeasurementId: null,
            enabled: false,
            publicationAllowed: false,
            canEdit: true,
            editBlockedReason: 'none',
          ),
        ),
        ...overrides,
      ].cast(),
      child: MaterialApp.router(
        theme: AppTheme.light,
        routerConfig: router,
        builder: (context, child) =>
            CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
      ),
    ),
  );
  if (settle) {
    await pumpFeatureUi(tester);
  } else {
    await tester.pump();
    await tester.pump();
  }
}
