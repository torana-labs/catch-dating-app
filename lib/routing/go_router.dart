import 'package:catch_dating_app/auth/presentation/auth_controller.dart';
import 'package:catch_dating_app/auth/presentation/auth_screen.dart';
import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_profile_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/audience/domain/crm/host_saved_audience.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/organizer_moment.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/contexts/profiles/domain/profile_readiness.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/contexts/profiles/domain/user_profile.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_invitation_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_screen.dart';
import 'package:catch_dating_app/event_rehearsal/presentation/host_event_rehearsal_start_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen.dart';
import 'package:catch_dating_app/events/presentation/event_detail_screen.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/saved_events_screen.dart';
import 'package:catch_dating_app/events/shared/event_detail_route_transition.dart';
import 'package:catch_dating_app/explore/presentation/explore_map_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/host_memberships/host_memberships.dart';
import 'package:catch_dating_app/hosts/audience/phone_import/presentation/phone_import_screen.dart';
import 'package:catch_dating_app/hosts/events/presentation/moments/organizer_moments_screen.dart';
import 'package:catch_dating_app/hosts/presentation/applications/host_application_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_route_arguments.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customer_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/customers/host_customers_screen.dart';
import 'package:catch_dating_app/hosts/presentation/edit_hosted_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/event_management/host_create_event_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_analytics_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_automations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_builder_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_preview_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_detail_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_response_query_controller.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_share_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_templates_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_form_workspace_state.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_forms_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_preferences_route_screen.dart';
import 'package:catch_dating_app/hosts/presentation/forms/host_response_offer_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_audience_view.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_manage_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_event_operator_screen.dart';
import 'package:catch_dating_app/hosts/presentation/host_operations_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_inbox_view_model.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_messaging_setup_screen.dart';
import 'package:catch_dating_app/hosts/presentation/inbox/host_new_message_screen.dart';
import 'package:catch_dating_app/hosts/presentation/organizer_management/host_create_organizer_screen.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_screen.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_screen.dart';
import 'package:catch_dating_app/hosts/work/presentation/host_work_screen.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_application_screen.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/onboarding/presentation/start_welcome_route_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_screen.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_screen.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/app_config.dart';
import 'package:catch_dating_app/platform/errors/app_error_message.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_async_boundary.dart';
import 'package:catch_dating_app/platform/schema_contracts/generated/profile_requirements.g.dart';
import 'package:catch_dating_app/programs/presentation/program_arrivals_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_attendance_report_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_attention_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_create_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_dispatch_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_door_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_guest_desk_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_guests_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_hotel_desk_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_hotel_rooms_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_import_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_lodging_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_now_next_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_stakeholder_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_team_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_trips_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_work_screen.dart';
import 'package:catch_dating_app/programs/presentation/program_workspace_screen.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_screen.dart';
import 'package:catch_dating_app/routing/host_legacy_redirects.dart';
import 'package:catch_dating_app/routing/host_navigation_workspace.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart';
import 'package:catch_dating_app/routing/shell/host_app_shell.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_screen.dart';
import 'package:catch_dating_app/safety/presentation/settings_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/filters_screen.dart';
import 'package:catch_dating_app/swipes/presentation/swipe_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profile_review_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

export 'route_contract.dart';

part 'detail_route_pages.dart';
part 'go_router.g.dart';
part 'host_inbox_route.dart';
part 'host_response_review_routes.dart';
part 'host_route_extras.dart';
part 'host_workspace_destination.dart';
part 'host_workspace_index_screen.dart';
part 'route_destinations.dart';

@visibleForTesting
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

@visibleForTesting
Widget hostAudienceScreenForUri(Uri uri, {String? initialContactDisplayName}) {
  final view = hostAudienceViewFromName(uri.queryParameters['view']);
  return switch (view) {
    HostAudienceView.forms || HostAudienceView.responses => HostFormsScreen(
      initialOrganizerId: uri.queryParameters['organizerId'],
      initialResponses: view == HostAudienceView.responses,
      initialFormId: uri.queryParameters['formId'],
      initialContactId: uri.queryParameters['contactId'],
    ),
    HostAudienceView.people ||
    HostAudienceView.audiences => HostCustomersScreen(
      initialOrganizerId: uri.queryParameters['organizerId'],
      initialView: view,
      initialContactId: uri.queryParameters['contactId'],
      initialContactDisplayName: initialContactDisplayName,
    ),
  };
}

GoRouter _buildGoRouter(Ref ref, {required bool isHostApp}) {
  final notifier = _RouterRefreshNotifier();
  final analytics = ref.read(appAnalyticsProvider);
  final keys = _RouterNavigatorKeys();

  _wireRouterRefresh(ref, notifier, isHostApp: isHostApp);

  final router = GoRouter(
    navigatorKey: keys.root,
    initialLocation: ref.watch(initialAppLocationProvider),
    refreshListenable: notifier,
    observers: [AnalyticsRouteObserver(analytics)],
    redirect: (context, state) =>
        _appRedirectFor(ref, state, isHostApp: isHostApp),
    routes: [
      GoRoute(
        path: Routes.loadingScreen.path,
        name: Routes.loadingScreen.name,
        builder: (context, state) => _RouteLoadingScreen(isHostApp: isHostApp),
      ),
      GoRoute(
        path: Routes.startScreen.path,
        name: Routes.startScreen.name,
        builder: (context, state) => const StartWelcomeRouteScreen(),
      ),
      GoRoute(
        path: Routes.authScreen.path,
        name: Routes.authScreen.name,
        builder: (context, state) => const AuthScreen(),
      ),
      if (!isHostApp) ...[
        GoRoute(
          path: Routes.crossPathsInvitationScreen.path,
          name: Routes.crossPathsInvitationScreen.name,
          builder: (context, state) => CrossPathsInvitationScreen(
            invitationId: state.pathParameters['invitationId']!,
          ),
        ),
        GoRoute(
          path: Routes.onboardingScreen.path,
          name: Routes.onboardingScreen.name,
          builder: (context, state) => OnboardingScreen(
            eventRequirements:
                state.uri.queryParameters[_onboardingIntentQueryParam] ==
                    _completeProfileIntent
                ? _eventRequirementsFromUri(state.uri)
                : null,
            profileCompletionOnly:
                state.uri.queryParameters[_onboardingIntentQueryParam] ==
                _completeProfileIntent,
            runPreferencesOnly:
                state.uri.queryParameters[_onboardingIntentQueryParam] ==
                _completeRunPreferencesIntent,
          ),
        ),
        GoRoute(
          path: Routes.calendarScreen.path,
          name: Routes.calendarScreen.name,
          builder: (context, state) => const CalendarScreen(),
        ),
        GoRoute(
          path: Routes.calendarEventDetailScreen.path,
          name: Routes.calendarEventDetailScreen.name,
          builder: (context, state) => _eventDetailScreen(state),
        ),
        GoRoute(
          path: Routes.savedEventsScreen.path,
          name: Routes.savedEventsScreen.name,
          builder: (context, state) => const SavedEventsScreen(),
        ),
        GoRoute(
          path: Routes.savedEventDetailScreen.path,
          name: Routes.savedEventDetailScreen.name,
          builder: (context, state) => _eventDetailScreen(state),
        ),
        GoRoute(
          path: Routes.filtersScreen.path,
          name: Routes.filtersScreen.name,
          builder: (context, state) => const FiltersScreen(),
        ),
        GoRoute(
          path: Routes.swipeHubScreen.path,
          name: Routes.swipeHubScreen.name,
          redirect: (context, state) => Routes.dashboardScreen.path,
        ),
        GoRoute(
          path: Routes.dashboardEventDetailScreen.path,
          name: Routes.dashboardEventDetailScreen.name,
          builder: (context, state) => _eventDetailScreen(state),
        ),
        GoRoute(
          path: Routes.paymentHistoryScreen.path,
          name: Routes.paymentHistoryScreen.name,
          builder: (context, state) => const PaymentHistoryScreen(),
        ),
        GoRoute(
          path: Routes.myMembershipsScreen.path,
          name: Routes.myMembershipsScreen.name,
          builder: (context, state) => const MyMembershipsScreen(),
        ),
        GoRoute(
          path: Routes.reviewsHistoryScreen.path,
          name: Routes.reviewsHistoryScreen.name,
          builder: (context, state) => const ReviewsHistoryScreen(),
        ),
        GoRoute(
          path: Routes.paymentConfirmationScreen.path,
          name: Routes.paymentConfirmationScreen.name,
          builder: (context, state) => PaymentConfirmationScreen(
            data: state.extra! as PaymentConfirmationData,
          ),
        ),
      ],
      if (!isHostApp) ..._sharedEventWorkspaceRoutes(),
      if (!isHostApp) ...[
        GoRoute(
          path: Routes.settingsScreen.path,
          name: Routes.settingsScreen.name,
          builder: (context, state) => const SettingsScreen(),
        ),
        GoRoute(
          path: Routes.messagingPermissionsScreen.path,
          name: Routes.messagingPermissionsScreen.name,
          builder: (context, state) => const MessagingPermissionsScreen(),
        ),
        GoRoute(
          path: Routes.launchAccessScreen.path,
          name: Routes.launchAccessScreen.name,
          builder: (context, state) => const LaunchAccessApplicationScreen(),
        ),
        GoRoute(
          path: Routes.publicProfileScreen.path,
          name: Routes.publicProfileScreen.name,
          builder: (context, state) => PublicProfileScreen(
            uid: state.pathParameters['uid']!,
            initialProfile: switch (state.extra) {
              final PublicProfile p => p,
              _ => null,
            },
          ),
        ),
      ],
      if (isHostApp)
        _hostShellRoute(analytics, keys)
      else
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) =>
              AppShell(navigationShell: navigationShell),
          branches: [
            // ── Branch 0: Home / Dashboard ───────────────────────────────
            StatefulShellBranch(
              navigatorKey: keys.dashboard,
              observers: [AnalyticsRouteObserver(analytics)],
              routes: [
                GoRoute(
                  path: Routes.dashboardScreen.path,
                  name: Routes.dashboardScreen.name,
                  builder: (context, state) => const DashboardScreen(),
                  routes: [
                    GoRoute(
                      path: 'notifications',
                      name: Routes.notificationsScreen.name,
                      parentNavigatorKey: keys.root,
                      builder: (context, state) => const ActivityScreen(),
                    ),
                    GoRoute(
                      path: 'catches/:eventId/recap',
                      name: Routes.eventRecapScreen.name,
                      parentNavigatorKey: keys.root,
                      builder: (context, state) => EventRecapScreen(
                        eventId: state.pathParameters['eventId']!,
                      ),
                    ),
                    GoRoute(
                      path: 'catches/:eventId',
                      name: Routes.swipeEventScreen.name,
                      parentNavigatorKey: keys.root,
                      builder: (context, state) => SwipeScreen(
                        eventId: state.pathParameters['eventId']!,
                        vibeIds: switch (state.extra) {
                          final Set<String> ids => ids,
                          _ => const {},
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),

            // ── Branch 1: Explore ────────────────────────────────────────
            StatefulShellBranch(
              navigatorKey: keys.explore,
              observers: [AnalyticsRouteObserver(analytics)],
              routes: [
                GoRoute(
                  path: Routes.exploreScreen.path,
                  name: Routes.exploreScreen.name,
                  builder: (context, state) => const ExploreScreen(),
                  routes: [
                    GoRoute(
                      path: 'map',
                      name: Routes.exploreMapScreen.name,
                      parentNavigatorKey: keys.root,
                      pageBuilder: _exploreMapPage,
                    ),
                    GoRoute(
                      path: ':organizerId',
                      name: Routes.organizerDetailScreen.name,
                      parentNavigatorKey: keys.root,
                      pageBuilder: _organizerDetailPage,
                      routes: [
                        GoRoute(
                          path: 'events/:eventId',
                          name: Routes.eventDetailScreen.name,
                          parentNavigatorKey: keys.root,
                          pageBuilder: _eventDetailPage,
                          routes: [
                            GoRoute(
                              path: 'companion',
                              name: Routes.eventSuccessCompanionScreen.name,
                              parentNavigatorKey: keys.root,
                              builder: (context, state) =>
                                  EventSuccessCompanionRouteScreen(
                                    clubId: state.pathParameters['organizerId']!,
                                    eventId: state.pathParameters['eventId']!,
                                    initialEvent: _routeEventExtra(state),
                                  ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),

            // ── Branch 2: Chats ──────────────────────────────────────────
            StatefulShellBranch(
              navigatorKey: keys.chats,
              observers: [AnalyticsRouteObserver(analytics)],
              routes: [
                GoRoute(
                  path: Routes.matchesListScreen.path,
                  name: Routes.matchesListScreen.name,
                  builder: (context, state) => const ChatsListScreen(),
                  routes: [
                    GoRoute(
                      path: ':matchId',
                      name: Routes.chatScreen.name,
                      parentNavigatorKey: keys.root,
                      builder: (context, state) => ChatScreen(
                        matchId: state.pathParameters['matchId']!,
                        otherProfile: switch (state.extra) {
                          final PublicProfile p => p,
                          _ => null,
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),

            // ── Branch 3: Profile ────────────────────────────────────────
            StatefulShellBranch(
              navigatorKey: keys.profile,
              observers: [AnalyticsRouteObserver(analytics)],
              routes: [
                GoRoute(
                  path: Routes.profileScreen.path,
                  name: Routes.profileScreen.name,
                  builder: (context, state) => const ProfileScreen(),
                  routes: [
                    GoRoute(
                      path: 'forms',
                      name: Routes.formProfilesScreen.name,
                      builder: (context, state) => const FormProfilesScreen(),
                      routes: [
                        GoRoute(
                          path: ':responseId',
                          name: Routes.formProfileReviewScreen.name,
                          builder: (context, state) => FormProfileReviewScreen(
                            responseId: state.pathParameters['responseId']!,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
}

List<HostWorkspaceDestination> _sharedEventWorkspaceRoutes() => [
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
];

List<HostWorkspaceDestination> _hostWorkspaceDestinationRoutes() => [
  ..._sharedEventWorkspaceRoutes(),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.inbox,
    path: Routes.hostNewMessageScreen.path,
    name: Routes.hostNewMessageScreen.name,
    builder: (context, state) => HostNewMessageScreen(
      organizerId: state.uri.queryParameters['organizerId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostEventRosterScreen.path,
    name: Routes.hostEventRosterScreen.name,
    builder: (context, state) => HostEventManageRouteScreen(
      clubId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: _routeEventExtra(state),
      initialSection: HostEventManageSection.guests,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostEventPublicationScreen.path,
    name: Routes.hostEventPublicationScreen.name,
    builder: (context, state) => HostEventPublicationRouteScreen(
      clubId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    parent: Routes.hostFormResponseDetailScreen,
    audienceView: HostAudienceView.responses,
    path: Routes.hostResponseOfferScreen.path,
    name: Routes.hostResponseOfferScreen.name,
    builder: (context, state) => HostResponseOfferScreen(
      organizerId: _routeOrganizerQueryId(state)!,
      responseId: state.pathParameters['responseId']!,
      recipientLabel: state.uri.queryParameters['recipientLabel'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    contextualParent: (state) =>
        state.uri.queryParameters['_parentQueryFormId'] == null
        ? Routes.hostResponseOfferScreen
        : Routes.hostResponseQueryOfferScreen,
    audienceView: HostAudienceView.responses,
    path: Routes.hostResponseOfferReviewScreen.path,
    name: Routes.hostResponseOfferReviewScreen.name,
    builder: (context, state) => HostFormResponseDetailScreen(
      organizerId: _routeOrganizerQueryId(state)!,
      responseId: state.pathParameters['responseId']!,
      returnToOffer: true,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
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
    root: HostWorkspaceRoot.audience,
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
    root: HostWorkspaceRoot.audience,
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
    builder: (context, state) => const HostWorkScreen(),
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
    builder: (context, state) => ProgramWorkScreen(
      programId: state.pathParameters['programId']!,
      inviteId: state.uri.queryParameters['invite'],
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkArrivalsScreen.path,
    name: Routes.hostWorkArrivalsScreen.name,
    builder: (context, state) => ProgramArrivalsScreen(
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
    builder: (context, state) => ProgramDispatchScreen(
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
    builder: (context, state) => ProgramHotelDeskScreen(
      programId: state.pathParameters['programId']!,
      hotelId: state.pathParameters['hotelId']!,
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
    builder: (context, state) => ProgramFunctionDoorScreen(
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
        ProgramNowNextScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkAttentionScreen.path,
    name: Routes.hostWorkAttentionScreen.name,
    builder: (context, state) =>
        ProgramAttentionScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkTripsScreen.path,
    name: Routes.hostWorkTripsScreen.name,
    builder: (context, state) =>
        ProgramTripsScreen(programId: state.pathParameters['programId']!),
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
    builder: (context, state) =>
        ProgramImportScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkAttendanceReportScreen.path,
    name: Routes.hostWorkAttendanceReportScreen.name,
    builder: (context, state) => ProgramAttendanceReportScreen(
      programId: state.pathParameters['programId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    parent: Routes.hostWorkProgramScreen,
    path: Routes.hostWorkCountsScreen.path,
    name: Routes.hostWorkCountsScreen.name,
    builder: (context, state) =>
        ProgramStakeholderScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostProgramsScreen.path,
    name: Routes.hostProgramsScreen.name,
    redirect: (context, state) => hostProgramsLegacyRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostCreateProgramScreen.path,
    name: Routes.hostCreateProgramScreen.name,
    builder: (context, state) =>
        ProgramCreateScreen(organizerId: state.pathParameters['organizerId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramLodgingScreen.path,
    name: Routes.hostProgramLodgingScreen.name,
    builder: (context, state) =>
        ProgramLodgingScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostProgramWorkspaceScreen.path,
    name: Routes.hostProgramWorkspaceScreen.name,
    builder: (context, state) =>
        ProgramWorkspaceScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramGuestsScreen.path,
    name: Routes.hostProgramGuestsScreen.name,
    builder: (context, state) =>
        ProgramGuestsScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramTeamScreen.path,
    name: Routes.hostProgramTeamScreen.name,
    builder: (context, state) =>
        ProgramTeamScreen(programId: state.pathParameters['programId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostProgramWorkspaceScreen,
    path: Routes.hostProgramImportScreen.path,
    name: Routes.hostProgramImportScreen.name,
    builder: (context, state) =>
        ProgramImportScreen(programId: state.pathParameters['programId']!),
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
    builder: (context, state) =>
        HostMessagingSetupScreen(clubId: state.pathParameters['organizerId']!),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerEventDefaultsScreen.path,
    name: Routes.hostOrganizerEventDefaultsScreen.name,
    builder: (context, state) => HostOrganizerEventDefaultsScreen(
      clubId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerLiveGuideScreen.path,
    name: Routes.hostOrganizerLiveGuideScreen.name,
    builder: (context, state) => HostOrganizerLiveGuideScreen(
      clubId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerTeamScreen.path,
    name: Routes.hostOrganizerTeamScreen.name,
    builder: (context, state) => HostOrganizerTeamScreen(
      clubId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerPaymentsScreen.path,
    name: Routes.hostOrganizerPaymentsScreen.name,
    builder: (context, state) => HostOrganizerPaymentsScreen(
      clubId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.organizer,
    path: Routes.hostOrganizerMembershipsScreen.path,
    name: Routes.hostOrganizerMembershipsScreen.name,
    builder: (context, state) => HostOrganizerMembershipsScreen(
      clubId: state.uri.queryParameters['organizerId'] ?? '',
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
      clubId: state.pathParameters['organizerId']!,
      initialOrganizer: _organizerDetailInitialOrganizer(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostCreateEventScreen.path,
    name: Routes.hostCreateEventScreen.name,
    builder: (context, state) {
      final extra = state.extra;
      return HostCreateEventRouteScreen(
        clubId: state.pathParameters['organizerId']!,
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
        initialRosterImportPlan: switch (extra) {
          final HostCreateEventRouteArguments arguments =>
            arguments.initialRosterImportPlan,
          _ => null,
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
      clubId: state.pathParameters['organizerId']!,
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
    builder: (context, state) => HostEventRehearsalScreen(
      clubId: state.pathParameters['organizerId']!,
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
    builder: (context, state) => HostEventManageRouteScreen(
      clubId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: _routeEventExtra(state),
      initialSection: _hostManageSectionFromState(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    parent: Routes.hostAppEventManageScreen,
    path: Routes.hostAppEditEventScreen.path,
    name: Routes.hostAppEditEventScreen.name,
    builder: (context, state) => EditHostedEventRouteScreen(
      clubId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: _routeEventExtra(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostAppAttendanceSheet.path,
    name: Routes.hostAppAttendanceSheet.name,
    builder: (context, state) => HostEventManageRouteScreen(
      clubId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: _routeEventExtra(state),
      initialSection: HostEventManageSection.live,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.events,
    path: Routes.hostAppEventSuccessScreen.path,
    name: Routes.hostAppEventSuccessScreen.name,
    builder: (context, state) => HostEventManageRouteScreen(
      clubId: state.pathParameters['organizerId']!,
      eventId: state.pathParameters['eventId']!,
      initialEvent: _routeEventExtra(state),
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
      scopeTitle: _routeEventExtra(state)?.title,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: Routes.hostApplicationsScreen.path,
    name: Routes.hostApplicationsScreen.name,
    redirect: (context, state) => hostApplicationsLegacyRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
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
      queue: _responseReviewQueue(state.extra),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.people,
    path: Routes.hostAddCustomerScreen.path,
    name: Routes.hostAddCustomerScreen.name,
    builder: (context, state) => HostAddCustomerScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.audiences,
    path: Routes.hostCreateSavedAudienceScreen.path,
    name: Routes.hostCreateSavedAudienceScreen.name,
    builder: (context, state) => HostSavedAudienceEditorScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.audiences,
    path: Routes.hostSavedAudienceDetailScreen.path,
    name: Routes.hostSavedAudienceDetailScreen.name,
    builder: (context, state) => HostSavedAudienceEditorScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      audienceId: state.pathParameters['audienceId'],
      initialAudience: _routeAudienceExtra(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormTemplatesScreen.path,
    name: Routes.hostFormTemplatesScreen.name,
    builder: (context, state) => HostFormTemplatesScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.responses,
    contextualParent: (state) =>
        state.uri.queryParameters.containsKey('_parentContactId')
        ? Routes.hostCustomerDetailScreen
        : null,
    path: Routes.hostFormResponseDetailScreen.path,
    name: Routes.hostFormResponseDetailScreen.name,
    builder: (context, state) => HostFormResponseDetailScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      responseId: state.pathParameters['responseId']!,
      queue: _responseReviewQueue(state.extra),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
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
    root: HostWorkspaceRoot.audience,
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
    root: HostWorkspaceRoot.audience,
    parent: Routes.hostFormBuilderScreen,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormAnalyticsScreen.path,
    name: Routes.hostFormAnalyticsScreen.name,
    builder: (context, state) => HostFormAnalyticsScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      formId: state.pathParameters['formId']!,
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.people,
    path: Routes.hostAudienceAutomationsScreen.path,
    name: Routes.hostAudienceAutomationsScreen.name,
    builder: (context, state) => HostFormAutomationsScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
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
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormBuilderScreen.path,
    name: Routes.hostFormBuilderScreen.name,
    builder: (context, state) => HostFormBuilderScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      formId: state.pathParameters['formId']!,
      initialView: hostFormViewFromQuery(state.uri.queryParameters['view']),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.people,
    contextualParent: (state) =>
        state.uri.queryParameters.containsKey('_parentAudienceId')
        ? Routes.hostSavedAudienceDetailScreen
        : null,
    path: Routes.hostCustomerDetailScreen.path,
    name: Routes.hostCustomerDetailScreen.name,
    builder: (context, state) => HostCustomerDetailScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
      contactId: state.pathParameters['contactId']!,
      initialDisplayName: _routeContactNameExtra(state),
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.people,
    path: Routes.hostCustomersLegacyScreen.path,
    name: Routes.hostCustomersLegacyScreen.name,
    redirect: (context, state) => hostCustomersLegacyRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostCustomersLegacyScreen.path}/new',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostCustomersLegacyScreen.path}/audiences/new',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostCustomersLegacyScreen.path}/audiences/:audienceId',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostCustomersLegacyScreen.path}/applications',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path:
        '${Routes.hostCustomersLegacyScreen.path}/applications/:applicationId',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostCustomersLegacyScreen.path}/:contactId',
    redirect: _customersUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    audienceView: HostAudienceView.forms,
    path: Routes.hostFormsLegacyScreen.path,
    name: Routes.hostFormsLegacyScreen.name,
    redirect: (context, state) => hostFormsLegacyRedirect(state.uri),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/new',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/responses/:responseId',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/applications',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/applications/:applicationId',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/preview',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/share',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/analytics',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId/automations',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.audience,
    path: '${Routes.hostFormsLegacyScreen.path}/:formId',
    redirect: _formsUriRedirect,
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.today,
    path: Routes.hostTodayFocusScreen.path,
    name: Routes.hostTodayFocusScreen.name,
    builder: (context, state) => HostTodayFocusScreen(
      organizerId: state.uri.queryParameters['organizerId'] ?? '',
    ),
  ),
  HostWorkspaceDestination(
    root: HostWorkspaceRoot.inbox,
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
    _hostShellRoute(analytics, _RouterNavigatorKeys());

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
  _RouterNavigatorKeys keys,
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
    routes: [rootRoute, ...routes.where((route) => route.root.route == root)],
  );
  return StatefulShellRoute.indexedStack(
    builder: (context, state, navigationShell) => HostAppShell(
      navigationShell: navigationShell,
      requestedOrganizerId:
          _routeOrganizerQueryId(state) ?? state.pathParameters['organizerId'],
    ),
    branches: [
      StatefulShellBranch(
        navigatorKey: keys.hostToday,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: [workspaceRoute(Routes.hostTodayScreen, roots[0])],
      ),
      StatefulShellBranch(
        navigatorKey: keys.hostEvents,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: [workspaceRoute(Routes.hostEventsScreen, roots[1])],
      ),
      StatefulShellBranch(
        navigatorKey: keys.hostAudience,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: [workspaceRoute(Routes.hostAudienceScreen, roots[2])],
      ),
      StatefulShellBranch(
        navigatorKey: keys.hostInbox,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: [workspaceRoute(Routes.hostInboxScreen, roots[3])],
      ),
      StatefulShellBranch(
        navigatorKey: keys.hostOrganizer,
        observers: [AnalyticsRouteObserver(analytics)],
        routes: [workspaceRoute(Routes.hostOrganizerScreen, roots[4])],
      ),
    ],
  );
}

EventDetailScreen _eventDetailScreen(GoRouterState state) => EventDetailScreen(
  clubId: state.pathParameters['organizerId']!,
  eventId: state.pathParameters['eventId']!,
  inviteCode: state.uri.queryParameters['invite'],
  inviteLinkId:
      state.uri.queryParameters['il'] ??
      state.uri.queryParameters['inviteLinkId'],
  initialEvent: _eventDetailInitialEvent(state),
  presentationMode: _eventDetailPresentationMode(state),
  heroTag: _eventDetailHeroTag(state),
  attribution: _eventDetailAttribution(state),
);

class _RouteLoadingScreen extends StatelessWidget {
  const _RouteLoadingScreen({required this.isHostApp});

  final bool isHostApp;

  @override
  Widget build(BuildContext context) {
    return CatchScaffold.standalone(
      backgroundColor: CatchTokens.of(context).bg,
      body: Consumer(
        builder: (context, ref, _) {
          const loading = CatchStateViewport.loading(
            accountForBottomOverlay: false,
          );
          final uidAsync = ref.watch(uidProvider);
          final needsProfile =
              !isHostApp && !uidAsync.isLoading && uidAsync.value != null;
          return needsProfile
              ? CatchStateViewport(
                  accountForBottomOverlay: false,
                  child: CatchAsyncBoundary<UserProfile?>(
                    value: ref.watch(watchUserProfileProvider),
                    errorContext: AppErrorContext.profile,
                    retainDataOn: const {},
                    onRetry: () => ref.invalidate(watchUserProfileProvider),
                    loadingBuilder: (_) => loading,
                    // The router refresh resumes the destination once resolved.
                    builder: (_, _) => loading,
                  ),
                )
              : loading;
        },
      ),
    );
  }
}
