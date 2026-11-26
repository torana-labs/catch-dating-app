// size-exemption: the Host app's canonical route graph; check_route_inventory.mjs allows GoRoute only here and in consumer_router.dart.
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_screen.dart';
import 'package:catch_dating_app/hosts/door/door_screen.dart';
import 'package:catch_dating_app/hosts/events/event_defaults_screen.dart';
import 'package:catch_dating_app/hosts/events/event_publish_screen.dart';
import 'package:catch_dating_app/hosts/events/event_workspace_controller.dart';
import 'package:catch_dating_app/hosts/events/events_screen.dart';
import 'package:catch_dating_app/hosts/events/presentation/moments/organizer_moments_screen.dart';
import 'package:catch_dating_app/hosts/events/rehearsal_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_new_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_questions_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_screen.dart';
import 'package:catch_dating_app/hosts/forms/form_share_screen.dart';
import 'package:catch_dating_app/hosts/forms/forms_screen.dart';
import 'package:catch_dating_app/hosts/forms/offer_screen.dart';
import 'package:catch_dating_app/hosts/forms/response_screen.dart';
import 'package:catch_dating_app/hosts/forms/responses_screen.dart';
import 'package:catch_dating_app/hosts/forms/responses_state.dart';
import 'package:catch_dating_app/hosts/onboarding/sign_in_screen.dart';
import 'package:catch_dating_app/hosts/organizer/memberships_screen.dart';
import 'package:catch_dating_app/hosts/organizer/organizer_screen.dart';
import 'package:catch_dating_app/hosts/organizer/page_edit_screen.dart';
import 'package:catch_dating_app/hosts/organizer/payments_screen.dart';
import 'package:catch_dating_app/hosts/organizer/settings_screen.dart';
import 'package:catch_dating_app/hosts/organizer/team_screen.dart';
import 'package:catch_dating_app/hosts/people/automations_screen.dart';
import 'package:catch_dating_app/hosts/people/compose_screen.dart';
import 'package:catch_dating_app/hosts/people/conversation/conversation_people.dart';
import 'package:catch_dating_app/hosts/people/duplicates/duplicates_screen.dart';
import 'package:catch_dating_app/hosts/people/messages_screen.dart';
import 'package:catch_dating_app/hosts/people/people_screen.dart';
import 'package:catch_dating_app/hosts/people/person_screen.dart';
import 'package:catch_dating_app/hosts/people/saved_group_screen.dart';
import 'package:catch_dating_app/hosts/people/sends/sends_screen.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_editor.dart';
import 'package:catch_dating_app/hosts/presentation/edit_hosted_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_automations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_builder_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_preview_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_preferences_route_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_route_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_operator_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_messaging_setup_screen.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_create_organizer_screen.dart';
import 'package:catch_dating_app/hosts/programmes/programmes.dart';
import 'package:catch_dating_app/hosts/today/host_today_screen.dart';
import 'package:catch_dating_app/pages/chat/chat_screen.dart';
import 'package:catch_dating_app/pages/chat/event_chat_participants_screen.dart';
import 'package:catch_dating_app/pages/chat/event_chat_screen.dart';
import 'package:catch_dating_app/pages/chat/event_profile_screen.dart';
import 'package:catch_dating_app/pages/event/event_detail_screen.dart';
import 'package:catch_dating_app/pages/organizer/organizer_detail_screen.dart';
import 'package:catch_dating_app/pages/start/start_welcome_route_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_desk_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_hotel_rooms_screen.dart';
import 'package:catch_dating_app/routing/host_legacy_redirects.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_dating_app/routing/router_frame.dart';
import 'package:catch_dating_app/routing/shell/host_shell_screen.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'host_inbox_route.dart';
part 'host_response_review_routes.dart';
part 'host_route_extras.dart';
part 'host_router.g.dart';
part 'host_workspace_destination.dart';
part 'host_workspace_index_screen.dart';

@visibleForTesting
/// The organiser whose planner home `/host/programs?view=home` opens, or
/// null for a legacy Programs link (which redirects to Events).
String? hostProgrammesHomeOrganizer(Uri uri) {
  final organizerId = uri.queryParameters['organizerId'];
  return uri.queryParameters['view'] == 'home' &&
          organizerId != null &&
          organizerId.isNotEmpty
      ? organizerId
      : null;
}

String hostProgramsLegacyRedirect(Uri uri) =>
    uri.replace(path: Routes.hostEventsScreen.path).toString();

@visibleForTesting
HostOrganizersScreen hostOrganizerScreenForUri(Uri uri) => HostOrganizersScreen(
  initialOrganizerId: uri.queryParameters['organizerId'],
  initialExpandedEditField: uri.queryParameters['editField'],
  initialTab: HostOrganizerTab.values.firstWhere(
    (tab) => tab.name == uri.queryParameters['tab'],
    orElse: () => HostOrganizerTab.edit,
  ),
);

/// Legacy query links resolve to the same typed record route as user navigation.
@visibleForTesting
String? hostAudienceRecordRedirect(Uri uri) {
  final response = uri.queryParameters['responseId'];
  final application = uri.queryParameters['applicationId'];
  if (response == null && application == null) return null;
  final route = response != null
      ? Routes.hostFormResponseDetailScreen
      : Routes.hostApplicationDetailScreen;
  return uri
      .replace(
        path: route.path.replaceFirst(
          response != null ? ':responseId' : ':applicationId',
          Uri.encodeComponent(response ?? application!),
        ),
        queryParameters:
            {
                ...uri.queryParameters,
                if (uri.queryParameters['contactId'] != null)
                  '_parentContactId': uri.queryParameters['contactId']!,
              }
              ..remove('responseId')
              ..remove('applicationId')
              ..remove('contactId'),
      )
      .toString();
}

/// One form's route: its page, its questions or its answers on the
/// system; its settings and payments on the form workspace.
@visibleForTesting
Widget hostFormScreenForUri(Uri uri, {required String formId}) {
  final organizerId = uri.queryParameters['organizerId'] ?? '';
  return switch (hostFormViewFromQuery(uri.queryParameters['view'])) {
    HostFormWorkspaceView.questions => HostFormQuestionsScreen(
      organizerId: organizerId,
      formId: formId,
    ),
    HostFormWorkspaceView.responses => HostResponsesScreen(
      organizerId: organizerId,
      formId: formId,
    ),
    final view?
        when view == HostFormWorkspaceView.settings ||
            view == HostFormWorkspaceView.payments =>
      HostFormBuilderScreen(
        organizerId: organizerId,
        formId: formId,
        initialView: view,
      ),
    _ => HostFormScreen(organizerId: organizerId, formId: formId),
  };
}

/// The forms and responses views of the People tab. Every other view
/// draws People through [hostPeopleScreenForUri].
@visibleForTesting
Widget hostAudienceScreenForUri(Uri uri) {
  final organizerId = uri.queryParameters['organizerId'];
  return switch (hostAudienceViewFromName(uri.queryParameters['view'])) {
    HostAudienceView.responses when organizerId != null => HostResponsesScreen(
      organizerId: organizerId,
      formId: uri.queryParameters['formId'],
    ),
    _ => HostFormsScreen(initialOrganizerId: organizerId),
  };
}

// keepalive: account-free: Host navigation is the app-wide route graph for the
// Host root.
@Riverpod(keepAlive: true)
GoRouter hostGoRouter(Ref ref) {
  final analytics = ref.read(appAnalyticsProvider);
  final keys = _HostNavigatorKeys();
  final refresh = appRouterRefresh(ref, isHostApp: true);

  final router = GoRouter(
    navigatorKey: keys.root,
    initialLocation: ref.watch(initialAppLocationProvider),
    refreshListenable: refresh,
    observers: [AnalyticsRouteObserver(analytics)],
    redirect: (context, state) => appRedirectFor(ref, state, isHostApp: true),
    routes: [
      GoRoute(
        path: Routes.loadingScreen.path,
        name: Routes.loadingScreen.name,
        builder: (context, state) => const RouteLoadingScreen(isHostApp: true),
      ),
      GoRoute(
        path: Routes.startScreen.path,
        name: Routes.startScreen.name,
        builder: (context, state) => const StartWelcomeRouteScreen(),
      ),
      GoRoute(
        path: Routes.authScreen.path,
        name: Routes.authScreen.name,
        builder: (context, state) => const HostSignInScreen(),
      ),
      _hostShellRoute(analytics, keys),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
}

List<HostWorkspaceDestination> _hostWorkspaceDestinationRoutes() => [
  // The event's location map and chat pages; consumer_router.dart declares
  // the same pages for the guest app.
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    contextualParent: (state) => _routeOrganizerQueryId(state) == null
        ? null
        : Routes.hostAppEventManageScreen,
    path: Routes.eventLocationMapScreen.path,
    name: Routes.eventLocationMapScreen.name,
    builder: (context, state) =>
        EventLocationMapRouteScreen(eventId: state.pathParameters['eventId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    contextualParent: (state) => _routeOrganizerQueryId(state) == null
        ? null
        : Routes.hostAppEventManageScreen,
    path: Routes.eventChatScreen.path,
    name: Routes.eventChatScreen.name,
    builder: (context, state) =>
        EventChatScreen(eventId: state.pathParameters['eventId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.eventChatParticipantsScreen,
    path: Routes.eventParticipantProfileScreen.path,
    name: Routes.eventParticipantProfileScreen.name,
    builder: (context, state) => EventProfileScreen(
      eventId: state.pathParameters['eventId']!,
      participantUid: state.pathParameters['participantUid']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.eventChatScreen,
    path: Routes.eventChatParticipantsScreen.path,
    name: Routes.eventChatParticipantsScreen.name,
    builder: (context, state) =>
        EventChatParticipantsScreen(eventId: state.pathParameters['eventId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.eventChatScreen,
    path: Routes.eventProfileSharingScreen.path,
    name: Routes.eventProfileSharingScreen.name,
    builder: (context, state) =>
        EventProfileScreen(eventId: state.pathParameters['eventId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: Routes.hostNewMessageScreen.path,
    name: Routes.hostNewMessageScreen.name,
    builder: (context, state) => HostComposeScreen(
      organizerId: state.uri.queryParameters['organizerId'],
      eventId: state.uri.queryParameters['eventId'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostEventRosterScreen.path,
    name: Routes.hostEventRosterScreen.name,
    builder: (context, state) => DoorScreen(
      organizerId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: routeEventExtra(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostEventPublicationScreen.path,
    name: Routes.hostEventPublicationScreen.name,
    builder: (context, state) => HostEventPublishScreen(
      request: HostEventRequest(
        organizerId: state.pathParameters['organizerId']!,
        eventId: state.pathParameters['eventId']!,
      ),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostFormResponseDetailScreen,
    audienceView: HostAudienceView.responses,
    path: Routes.hostResponseOfferScreen.path,
    name: Routes.hostResponseOfferScreen.name,
    builder: (context, state) => HostOfferScreen(
      organizerId: _routeOrganizerQueryId(state)!,
      responseId: state.pathParameters['responseId']!,
      recipientLabel: state.uri.queryParameters['recipientLabel'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    contextualParent: (state) =>
        state.uri.queryParameters['_parentQueryFormId'] == null
        ? Routes.hostResponseOfferScreen
        : Routes.hostResponseQueryOfferScreen,
    audienceView: HostAudienceView.responses,
    path: Routes.hostResponseOfferReviewScreen.path,
    name: Routes.hostResponseOfferReviewScreen.name,
    builder: (context, state) => HostResponseScreen(
      organizerId: _routeOrganizerQueryId(state)!,
      responseId: state.pathParameters['responseId']!,
      returnToOffer: true,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostResponseOfferScreen,
    audienceView: HostAudienceView.responses,
    path: Routes.hostResponseOfferPreferencesScreen.path,
    name: Routes.hostResponseOfferPreferencesScreen.name,
    builder: (context, state) => HostResponseOfferPreferencesRouteScreen(
      organizerId: _routeOrganizerQueryId(state)!,
      eventId: state.pathParameters['eventId']!,
      onBack: () => hostWorkspaceBack(
        context,
        fallback: state.uri
            .replace(
              path: Routes.hostResponseOfferScreen.path.replaceAll(
                ':responseId',
                Uri.encodeComponent(state.pathParameters['responseId']!),
              ),
            )
            .toString(),
      ),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostResponseQueryOfferScreen,
    audienceView: HostAudienceView.forms,
    path: Routes.hostResponseQueryOfferPreferencesScreen.path,
    name: Routes.hostResponseQueryOfferPreferencesScreen.name,
    builder: (context, state) => HostResponseOfferPreferencesRouteScreen(
      organizerId: _routeOrganizerQueryId(state)!,
      eventId: state.pathParameters['eventId']!,
      onBack: () => hostWorkspaceBack(
        context,
        fallback: state.uri
            .replace(
              path: Routes.hostResponseQueryOfferScreen.path.replaceAll(
                ':formId',
                Uri.encodeComponent(state.pathParameters['formId']!),
              ),
            )
            .toString(),
      ),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostFormBuilderScreen,
    audienceView: HostAudienceView.forms,
    path: Routes.hostResponseQueryOfferScreen.path,
    name: Routes.hostResponseQueryOfferScreen.name,
    builder: (context, state) => HostResponseOfferScreen.query(
      organizerId: _routeOrganizerQueryId(state)!,
      queryController: state.extra is HostResponseQueryController
          ? state.extra! as HostResponseQueryController
          : null,
    ),
  ),

  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    path: Routes.hostHomeScreen.path,
    name: Routes.hostHomeScreen.name,
    redirect: (context, state) => hostHomeLegacyRedirect(),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    path: Routes.hostOperatorEventScreen.path,
    name: Routes.hostOperatorEventScreen.name,
    redirect: _operatorEventUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    path: Routes.hostWorkScreen.path,
    name: Routes.hostWorkScreen.name,
    builder: (context, state) => const StaffAssignmentsScreen(),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkScreen,
    path: Routes.hostWorkEventScreen.path,
    name: Routes.hostWorkEventScreen.name,
    builder: (context, state) =>
        HostEventOperatorScreen(eventId: state.pathParameters['eventId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkScreen,
    path: Routes.hostWorkProgramScreen.path,
    name: Routes.hostWorkProgramScreen.name,
    builder: (context, state) => StaffJobsScreen(
      programId: state.pathParameters['programId']!,
      inviteId: state.uri.queryParameters['invite'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkArrivalsScreen.path,
    name: Routes.hostWorkArrivalsScreen.name,
    builder: (context, state) => StaffArrivalsScreen(
      programId: state.pathParameters['programId']!,
      pickupPointId: state.pathParameters['pickupPointId'],
      stationLabel: state.uri.queryParameters['station'] ?? 'Arrivals',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkDispatchScreen.path,
    name: Routes.hostWorkDispatchScreen.name,
    builder: (context, state) => StaffDispatchScreen(
      programId: state.pathParameters['programId']!,
      pickupPointId: state.pathParameters['pickupPointId']!,
      stationLabel: state.uri.queryParameters['station'] ?? 'Dispatch',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkHotelScreen.path,
    name: Routes.hostWorkHotelScreen.name,
    builder: (context, state) => staffHotelScreenForUri(
      state.pathParameters['programId']!,
      state.pathParameters['hotelId']!,
      state.uri,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkHotelScreen,
    path: Routes.hostWorkHotelRoomsScreen.path,
    name: Routes.hostWorkHotelRoomsScreen.name,
    builder: (context, state) => ProgramHotelRoomsScreen(
      programId: state.pathParameters['programId']!,
      hotelId: state.pathParameters['hotelId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkDoorScreen.path,
    name: Routes.hostWorkDoorScreen.name,
    builder: (context, state) => StaffDoorScreen(
      programId: state.pathParameters['programId']!,
      functionId: state.pathParameters['functionId']!,
      functionName: state.uri.queryParameters['function'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkNowScreen.path,
    name: Routes.hostWorkNowScreen.name,
    builder: (context, state) =>
        StaffLeadScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkAttentionScreen.path,
    name: Routes.hostWorkAttentionScreen.name,
    builder: (context, state) =>
        StaffAlertsScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkTripsScreen.path,
    name: Routes.hostWorkTripsScreen.name,
    builder: (context, state) =>
        HostProgrammeTripsScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkGuestsScreen.path,
    name: Routes.hostWorkGuestsScreen.name,
    builder: (context, state) =>
        ProgramGuestDeskScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkPhoneImportScreen.path,
    name: Routes.hostWorkPhoneImportScreen.name,
    builder: (context, state) =>
        PhoneImportScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkImportScreen.path,
    name: Routes.hostWorkImportScreen.name,
    builder: (context, state) => HostProgrammeImportScreen(
      programId: state.pathParameters['programId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkAttendanceReportScreen.path,
    name: Routes.hostWorkAttendanceReportScreen.name,
    builder: (context, state) => HostProgrammeAttendanceScreen(
      programId: state.pathParameters['programId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkCountsScreen.path,
    name: Routes.hostWorkCountsScreen.name,
    builder: (context, state) =>
        HostProgrammeShareScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostProgramsScreen.path,
    name: Routes.hostProgramsScreen.name,
    redirect: (context, state) => hostProgrammesHomeOrganizer(state.uri) == null
        ? hostProgramsLegacyRedirect(state.uri)
        : null,
    builder: (context, state) => HostProgrammesHomeScreen(
      organizerId: hostProgrammesHomeOrganizer(state.uri)!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostCreateProgramScreen.path,
    name: Routes.hostCreateProgramScreen.name,
    builder: (context, state) => HostProgrammeCreateScreen(
      organizerId: state.pathParameters['organizerId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramLodgingScreen.path,
    name: Routes.hostProgramLodgingScreen.name,
    builder: (context, state) =>
        HostProgrammeRoomsScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostProgramWorkspaceScreen.path,
    name: Routes.hostProgramWorkspaceScreen.name,
    builder: (context, state) => hostProgrammeScreenForUri(
      state.pathParameters['programId']!,
      state.uri,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramGuestsScreen.path,
    name: Routes.hostProgramGuestsScreen.name,
    builder: (context, state) => hostProgrammeGuestsScreenForUri(
      state.pathParameters['programId']!,
      state.uri,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramTeamScreen.path,
    name: Routes.hostProgramTeamScreen.name,
    builder: (context, state) =>
        HostProgrammeTeamScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramImportScreen.path,
    name: Routes.hostProgramImportScreen.name,
    builder: (context, state) => HostProgrammeImportScreen(
      programId: state.pathParameters['programId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramMomentsScreen.path,
    name: Routes.hostProgramMomentsScreen.name,
    builder: (context, state) => OrganizerMomentsScreen(
      scope: _programMomentScope(state),
      scopeTitle: state.uri.queryParameters['title'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerMessagingScreen.path,
    name: Routes.hostOrganizerMessagingScreen.name,
    builder: (context, state) => HostMessagingSetupScreen(
      organizerId: state.pathParameters['organizerId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerEventDefaultsScreen.path,
    name: Routes.hostOrganizerEventDefaultsScreen.name,
    builder: (context, state) => HostEventDefaultsScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerLiveGuideScreen.path,
    name: Routes.hostOrganizerLiveGuideScreen.name,
    builder: (context, state) => HostOrganizerLiveGuideScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerTeamScreen.path,
    name: Routes.hostOrganizerTeamScreen.name,
    builder: (context, state) => OrganizerTeamScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerPaymentsScreen.path,
    name: Routes.hostOrganizerPaymentsScreen.name,
    builder: (context, state) => OrganizerPaymentsScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerMembershipsScreen.path,
    name: Routes.hostOrganizerMembershipsScreen.name,
    builder: (context, state) => OrganizerMembershipsScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizersScreen.path,
    name: Routes.hostOrganizersScreen.name,
    redirect: (context, state) => hostOrganizerIndexRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostCreateOrganizerScreen.path,
    name: Routes.hostCreateOrganizerScreen.name,
    builder: (context, state) => const HostCreateOrganizerScreen(),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerDetailScreen.path,
    name: Routes.hostOrganizerDetailScreen.name,
    builder: (context, state) => OrganizerDetailScreen(
      organizerId: state.pathParameters['organizerId']!,
      initialOrganizer: routeOrganizerExtra(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostCreateEventScreen.path,
    name: Routes.hostCreateEventScreen.name,
    builder: (context, state) {
      final extra = state.extra;
      return HostCreateEventRouteScreen(
        organizerId: state.pathParameters['organizerId']!,
        initialOrganizer: switch (extra) {
          final HostCreateEventRouteArguments arguments =>
            arguments.initialOrganizer,
          final Organizer organizer => organizer,
          _ => null,
        },
        initialPrefill: switch (extra) {
          final HostCreateEventRouteArguments arguments =>
            arguments.initialPrefill,
          _ => null,
        },
        initialDraft: extra is HostCreateEventRouteArguments
            ? extra.initialDraft
            : null,

        initialSavedEventId: extra is HostCreateEventRouteArguments
            ? extra.initialSavedEventId
            : null,
        externalBookingMode: switch (extra) {
          final HostCreateEventRouteArguments arguments =>
            arguments.externalBookingMode,
          _ => false,
        },
        promptForDrafts: extra is HostCreateEventRouteArguments
            ? extra.promptForDrafts
            : true,
        returnToResponsesOnSave: extra is HostCreateEventRouteArguments
            ? extra.returnToResponsesOnSave
            : false,
      );
    },
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    path: Routes.hostEventRehearsalStartScreen.path,
    name: Routes.hostEventRehearsalStartScreen.name,
    builder: (context, state) => HostEventRehearsalStartScreen(
      organizerId: state.pathParameters['organizerId']!,
      sourceEventId: state.uri.queryParameters['eventId'],
      startFromOrganizerDefaults:
          state.uri.queryParameters['source'] == 'custom',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostEventRehearsalStartScreen,
    path: Routes.hostEventRehearsalScreen.path,
    name: Routes.hostEventRehearsalScreen.name,
    builder: (context, state) => HostRehearsalScreen(
      organizerId: state.pathParameters['organizerId']!,
      sessionId: state.pathParameters['sessionId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostAppEventDetailScreen.path,
    name: Routes.hostAppEventDetailScreen.name,
    builder: (context, state) => _eventDetailScreen(state),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostAppEventManageScreen.path,
    name: Routes.hostAppEventManageScreen.name,
    // Every section resolves through hostEventRouteDestination: the rebuilt
    // workspace, guest lists, live console or report.
    builder: (context, state) => HostEventManageRouteScreen(
      organizerId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: routeEventExtra(state),
      initialSection: _hostManageSectionFromState(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostAppEditEventScreen.path,
    name: Routes.hostAppEditEventScreen.name,
    builder: (context, state) => EditHostedEventRouteScreen(
      organizerId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: routeEventExtra(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostAppAttendanceSheet.path,
    name: Routes.hostAppAttendanceSheet.name,
    builder: (context, state) => HostEventManageRouteScreen(
      organizerId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: routeEventExtra(state),
      initialSection: HostEventManageSection.live,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostAppEventSuccessScreen.path,
    name: Routes.hostAppEventSuccessScreen.name,
    builder: (context, state) => HostEventManageRouteScreen(
      organizerId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: routeEventExtra(state),
      initialSection: _hostManageSectionFromState(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostAppEventMomentsScreen.path,
    name: Routes.hostAppEventMomentsScreen.name,
    builder: (context, state) => OrganizerMomentsScreen(
      scope: _eventMomentScope(state),
      scopeTitle: routeEventExtra(state)?.title,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: Routes.hostApplicationsScreen.path,
    name: Routes.hostApplicationsScreen.name,
    redirect: (context, state) => hostApplicationsLegacyRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.responses,
    contextualParent: (state) =>
        state.uri.queryParameters.containsKey('_parentContactId')
        ? Routes.hostCustomerDetailScreen
        : null,
    path: Routes.hostApplicationDetailScreen.path,
    name: Routes.hostApplicationDetailScreen.name,
    builder: (context, state) => HostApplicationDetailScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      applicationId: state.pathParameters['applicationId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.people,
    path: Routes.hostAddCustomerScreen.path,
    name: Routes.hostAddCustomerScreen.name,
    builder: (context, state) => HostAddCustomerScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.audiences,
    path: Routes.hostCreateSavedAudienceScreen.path,
    name: Routes.hostCreateSavedAudienceScreen.name,
    builder: (context, state) => HostSavedGroupScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.audiences,
    path: Routes.hostSavedAudienceDetailScreen.path,
    name: Routes.hostSavedAudienceDetailScreen.name,
    builder: (context, state) => HostSavedGroupScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      audienceId: state.pathParameters['audienceId'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormTemplatesScreen.path,
    name: Routes.hostFormTemplatesScreen.name,
    builder: (context, state) => HostFormNewScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.responses,
    contextualParent: (state) =>
        state.uri.queryParameters.containsKey('_parentContactId')
        ? Routes.hostCustomerDetailScreen
        : null,
    path: Routes.hostFormResponseDetailScreen.path,
    name: Routes.hostFormResponseDetailScreen.name,
    builder: (context, state) => HostResponseScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      responseId: state.pathParameters['responseId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostFormBuilderScreen,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormPreviewScreen.path,
    name: Routes.hostFormPreviewScreen.name,
    builder: (context, state) => HostFormPreviewScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      formId: state.pathParameters['formId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostFormBuilderScreen,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormShareScreen.path,
    name: Routes.hostFormShareScreen.name,
    builder: (context, state) => HostFormShareScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      formId: state.pathParameters['formId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostFormBuilderScreen,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormAnalyticsScreen.path,
    name: Routes.hostFormAnalyticsScreen.name,
    builder: (context, state) => HostResponsesScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      formId: state.pathParameters['formId']!,
      initialView: HostResponsesView.results,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.people,
    path: Routes.hostAudienceAutomationsScreen.path,
    name: Routes.hostAudienceAutomationsScreen.name,
    builder: (context, state) => HostAutomationsScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    parent: Routes.hostFormBuilderScreen,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormAutomationsScreen.path,
    name: Routes.hostFormAutomationsScreen.name,
    builder: (context, state) => HostFormAutomationsScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      formId: state.pathParameters['formId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormBuilderScreen.path,
    name: Routes.hostFormBuilderScreen.name,
    builder: (context, state) => hostFormScreenForUri(
      state.uri,
      formId: state.pathParameters['formId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.people,
    path: Routes.hostPeopleDuplicatesScreen.path,
    name: Routes.hostPeopleDuplicatesScreen.name,
    builder: (context, state) => HostPeopleDuplicatesScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.people,
    contextualParent: (state) =>
        state.uri.queryParameters.containsKey('_parentAudienceId')
        ? Routes.hostSavedAudienceDetailScreen
        : null,
    path: Routes.hostCustomerDetailScreen.path,
    name: Routes.hostCustomerDetailScreen.name,
    builder: (context, state) => HostPersonScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      contactId: state.pathParameters['contactId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.people,
    path: Routes.hostCustomersLegacyScreen.path,
    name: Routes.hostCustomersLegacyScreen.name,
    redirect: (context, state) => hostCustomersLegacyRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostCustomersLegacyScreen.path}/new',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostCustomersLegacyScreen.path}/audiences/new',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostCustomersLegacyScreen.path}/audiences/:audienceId',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostCustomersLegacyScreen.path}/applications',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path:
        '${Routes.hostCustomersLegacyScreen.path}/applications/:applicationId',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostCustomersLegacyScreen.path}/:contactId',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormsLegacyScreen.path,
    name: Routes.hostFormsLegacyScreen.name,
    redirect: (context, state) => hostFormsLegacyRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/new',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/responses/:responseId',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/applications',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/applications/:applicationId',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/preview',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/share',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/analytics',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/automations',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    path: Routes.hostTodayFocusScreen.path,
    name: Routes.hostTodayFocusScreen.name,
    // Today has no focus page any more; old links land on Today.
    redirect: (context, state) =>
        state.uri.replace(path: Routes.hostTodayScreen.path).toString(),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.people,
    path: Routes.hostChatScreen.path,
    name: Routes.hostChatScreen.name,
    builder: (context, state) => ChatScreen(
      matchId: state.pathParameters['matchId']!,
      otherProfile: _routePublicProfileExtra(state),
    ),
  ),
];

String _hostWorkspaceRouteLocation(GoRoute route, GoRouterState state) => state
    .uri
    .replace(
      path: route.path.replaceAllMapped(
        RegExp(r':([A-Za-z][A-Za-z0-9]*)'),
        (match) => Uri.encodeComponent(state.pathParameters[match[1]]!),
      ),
    )
    .toString();

@visibleForTesting
StatefulShellRoute hostWorkspaceRouteGraph(AppAnalytics analytics) =>
    _hostShellRoute(analytics, _HostNavigatorKeys());

Uri _hostWorkspaceUri(Routes root, GoRouterState state) {
  return state.uri.replace(
    path: root.path,
    queryParameters: {
      ...state.uri.queryParameters,
      if (_routeOrganizerQueryId(state) == null &&
          state.pathParameters['organizerId'] != null)
        'organizerId': state.pathParameters['organizerId']!,
      if (root == Routes.hostAudienceScreen && state.uri.path != root.path)
        'view': state.uri.queryParameters.containsKey('_parentAudienceId')
            ? HostAudienceView.audiences.name
            : state.uri.queryParameters.containsKey('_parentContactId')
            ? HostAudienceView.people.name
            : (_hostWorkspaceDestinationRoutes()
                          // ShellRoute states have no leaf name. Resolve the
                          // same matched path used by workspace ancestry.
                          .where((route) => route.path == state.fullPath)
                          .firstOrNull
                          ?.audienceView ??
                      HostAudienceView.people)
                  .name,
    },
  );
}

List<GoRoute> _hostWorkspaceRootRecipes() => [
  GoRoute(
    path: Routes.hostTodayScreen.path,
    name: Routes.hostTodayScreen.name,
    builder: (context, state) => HostWorkspaceIndexScreen.route(
      root: Routes.hostTodayScreen,
      state: state,
    ),
  ),
  GoRoute(
    path: Routes.hostEventsScreen.path,
    name: Routes.hostEventsScreen.name,
    builder: (context, state) => HostWorkspaceIndexScreen.route(
      root: Routes.hostEventsScreen,
      state: state,
    ),
  ),
  GoRoute(
    path: Routes.hostAudienceScreen.path,
    name: Routes.hostAudienceScreen.name,
    redirect: (context, state) => hostAudienceRecordRedirect(state.uri),
    builder: (context, state) => HostWorkspaceIndexScreen.route(
      root: Routes.hostAudienceScreen,
      state: state,
    ),
  ),
  GoRoute(
    path: Routes.hostInboxScreen.path,
    name: Routes.hostInboxScreen.name,
    builder: (context, state) => HostWorkspaceIndexScreen.route(
      root: Routes.hostInboxScreen,
      state: state,
    ),
  ),
  GoRoute(
    path: Routes.hostOrganizerScreen.path,
    name: Routes.hostOrganizerScreen.name,
    redirect: _organizerAudienceUriRedirect,
    builder: (context, state) => HostWorkspaceIndexScreen.route(
      root: Routes.hostOrganizerScreen,
      state: state,
    ),
  ),
];

StatefulShellRoute _hostShellRoute(
  AppAnalytics analytics,
  _HostNavigatorKeys keys,
) {
  final roots = _hostWorkspaceRootRecipes();
  final routes = _hostWorkspaceDestinationRoutes();

  ShellRoute workspaceRoute(Routes root, GoRoute rootRoute) => ShellRoute(
    builder: (context, state, child) {
      final selected = routes
          .where((route) => route.path == state.fullPath)
          .firstOrNull;
      final lineage = hostWorkspaceAncestors(routes, selected, state);
      final parent = lineage.lastOrNull;
      final uri = _hostWorkspaceUri(root, state);
      final index = rootRoute.builder!(context, state);
      return HostWorkspaceRouteFrame(
        index: index,
        navigator: child,
        selectedRoute: selected?.name,
        selectedContentId: selected == null
            ? null
            : hostWorkspaceContentId(
                selected.name!,
                selected.path,
                state.pathParameters,
              ),
        ancestors: [
          for (final ancestor in lineage)
            CatchWorkspacePane(
              id: ancestor.name!,
              child: CatchWorkspaceBackScope(
                onBack: () => context.go(
                  hostWorkspaceParentLocation(routes, ancestor, state, uri),
                ),
                child: ancestor.builder!(
                  context,
                  hostWorkspaceAncestorState(context, ancestor, state),
                ),
              ),
            ),
        ],
        onBack: () {
          if (context.canPop()) {
            context.pop();
          } else {
            context.go(
              parent == null
                  ? hostWorkspaceIndexUri(uri).toString()
                  : _hostWorkspaceRouteLocation(
                      parent,
                      hostWorkspaceAncestorState(context, parent, state),
                    ),
            );
          }
        },
      );
    },
    routes: [rootRoute, ...routes.where((route) => route.index == root)],
  );
  List<ShellRoute> indexRoutes(HostWorkspaceRoot root) => [
    for (final index in root.indexes)
      workspaceRoute(
        index,
        roots.where((route) => route.name == index.name).single,
      ),
  ];
  return StatefulShellRoute.indexedStack(
    builder: (context, state, navigationShell) => HostShellScreen(
      navigationShell: navigationShell,
      requestedOrganizerId:
          _routeOrganizerQueryId(state) ?? state.pathParameters['organizerId'],
    ),
    // One branch per HostWorkspaceRoot, in its order; each mounts one
    // workspace per index route.
    branches: [
      StatefulShellBranch(
        navigatorKey: keys.hostToday,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: indexRoutes(HostWorkspaceRoot.today),
      ),
      StatefulShellBranch(
        navigatorKey: keys.hostEvents,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: indexRoutes(HostWorkspaceRoot.events),
      ),
      StatefulShellBranch(
        navigatorKey: keys.hostPeople,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: indexRoutes(HostWorkspaceRoot.people),
      ),
      StatefulShellBranch(
        navigatorKey: keys.hostOrganizer,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: indexRoutes(HostWorkspaceRoot.organizer),
      ),
    ],
  );
}

EventDetailScreen _eventDetailScreen(GoRouterState state) {
  final extra = eventDetailRouteExtra(state);
  return EventDetailScreen(
    organizerId: state.pathParameters['organizerId']!,
    eventId: state.pathParameters['eventId']!,
    inviteCode: state.uri.queryParameters['invite'],
    inviteLinkId:
        state.uri.queryParameters['il'] ??
        state.uri.queryParameters['inviteLinkId'],
    initialEvent: extra.initialEvent,
    presentationMode: extra.presentationMode,
    heroTag: extra.heroTag,
    attribution: extra.attribution,
  );
}
