import 'package:catch_dating_app/auth/presentation/auth_screen.dart';
import 'package:catch_dating_app/chats/presentation/chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_participants_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_chat_screen.dart';
import 'package:catch_dating_app/chats/presentation/event_profile_screen.dart';
import 'package:catch_dating_app/chats/presentation/inbox/chat_inbox_screen.dart';
import 'package:catch_dating_app/contexts/payments/domain/payment_confirmation_data.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/cross_paths/presentation/cross_paths_invitation_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/activity_screen.dart';
import 'package:catch_dating_app/dashboard/presentation/dashboard_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/events/presentation/calendar/calendar_screen.dart';
import 'package:catch_dating_app/events/presentation/event_location_map_screen.dart';
import 'package:catch_dating_app/events/presentation/saved_events_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_map_screen.dart';
import 'package:catch_dating_app/explore/presentation/explore_screen.dart';
import 'package:catch_dating_app/host_memberships/host_memberships.dart';
import 'package:catch_dating_app/launch_access/presentation/launch_access_application_screen.dart';
import 'package:catch_dating_app/onboarding/presentation/onboarding_screen.dart';
import 'package:catch_dating_app/organizers/presentation/detail/organizer_detail_screen.dart';
import 'package:catch_dating_app/pages/event/event_detail_route_transition.dart';
import 'package:catch_dating_app/pages/event/event_detail_screen.dart';
import 'package:catch_dating_app/pages/start/start_welcome_route_screen.dart';
import 'package:catch_dating_app/payments/presentation/payment_confirmation_screen.dart';
import 'package:catch_dating_app/payments/presentation/payment_history_screen.dart';
import 'package:catch_dating_app/public_profile/presentation/public_profile_screen.dart';
import 'package:catch_dating_app/reviews/presentation/reviews_history_screen.dart';
import 'package:catch_dating_app/routing/router_frame.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart';
import 'package:catch_dating_app/safety/presentation/messaging_permissions_screen.dart';
import 'package:catch_dating_app/safety/presentation/settings_screen.dart';
import 'package:catch_dating_app/swipes/presentation/event_recap_screen.dart';
import 'package:catch_dating_app/swipes/presentation/filters_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profile_review_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/form_profiles_screen.dart';
import 'package:catch_dating_app/user_profile/presentation/profile_screen.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/routing/onboarding_completion_location.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'consumer_router.g.dart';
part 'detail_route_pages.dart';

// The guest app's route table. check_route_inventory.mjs allows GoRoute only
// here and in host_router.dart, so a page both apps mount is declared in each.

// keepalive: account-free: GoRouter is the app-wide navigation graph and owns
// route refresh listeners for auth/update state.
@Riverpod(keepAlive: true)
GoRouter consumerGoRouter(Ref ref) {
  final analytics = ref.read(appAnalyticsProvider);
  final keys = _ConsumerNavigatorKeys();
  final refresh = appRouterRefresh(ref, isHostApp: false);

  final router = GoRouter(
    navigatorKey: keys.root,
    initialLocation: ref.watch(initialAppLocationProvider),
    refreshListenable: refresh,
    observers: [AnalyticsRouteObserver(analytics)],
    redirect: (context, state) => appRedirectFor(ref, state, isHostApp: false),
    routes: [
      GoRoute(
        path: Routes.loadingScreen.path,
        name: Routes.loadingScreen.name,
        builder: (context, state) => const RouteLoadingScreen(isHostApp: false),
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
              state.uri.queryParameters[onboardingIntentQueryParam] ==
                  completeProfileIntent
              ? eventRequirementsFromUri(state.uri)
              : null,
          profileCompletionOnly:
              state.uri.queryParameters[onboardingIntentQueryParam] ==
              completeProfileIntent,
          runPreferencesOnly:
              state.uri.queryParameters[onboardingIntentQueryParam] ==
              completeRunPreferencesIntent,
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
      ..._eventChatRoutes(),
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
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          // ── Branch 0: Home / Dashboard ───────────────────────────────────
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
                  // The retired swipe deck's address; older links open
                  // the event's after-event screen instead.
                  GoRoute(
                    path: 'catches/:eventId',
                    name: Routes.swipeEventScreen.name,
                    parentNavigatorKey: keys.root,
                    redirect: (context, state) =>
                        Routes.eventRecapScreen.path.replaceFirst(
                          ':eventId',
                          state.pathParameters['eventId']!,
                        ),
                  ),
                ],
              ),
            ],
          ),

          // ── Branch 1: Explore ────────────────────────────────────────────
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
                                  organizerId:
                                      state.pathParameters['organizerId']!,
                                  eventId: state.pathParameters['eventId']!,
                                  initialEvent: routeEventExtra(state),
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

          // ── Branch 2: Chats ──────────────────────────────────────────────
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

          // ── Branch 3: Profile ────────────────────────────────────────────
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

/// The event's location map and chat pages. host_router.dart declares the
/// same pages as Host workspace destinations.
List<GoRoute> _eventChatRoutes() => [
  GoRoute(
    path: Routes.eventLocationMapScreen.path,
    name: Routes.eventLocationMapScreen.name,
    builder: (context, state) =>
        EventLocationMapRouteScreen(eventId: state.pathParameters['eventId']!),
  ),
  GoRoute(
    path: Routes.eventChatScreen.path,
    name: Routes.eventChatScreen.name,
    builder: (context, state) =>
        EventChatScreen(eventId: state.pathParameters['eventId']!),
  ),
  GoRoute(
    path: Routes.eventParticipantProfileScreen.path,
    name: Routes.eventParticipantProfileScreen.name,
    builder: (context, state) => EventProfileScreen(
      eventId: state.pathParameters['eventId']!,
      participantUid: state.pathParameters['participantUid']!,
    ),
  ),
  GoRoute(
    path: Routes.eventChatParticipantsScreen.path,
    name: Routes.eventChatParticipantsScreen.name,
    builder: (context, state) =>
        EventChatParticipantsScreen(eventId: state.pathParameters['eventId']!),
  ),
  GoRoute(
    path: Routes.eventProfileSharingScreen.path,
    name: Routes.eventProfileSharingScreen.name,
    builder: (context, state) =>
        EventProfileScreen(eventId: state.pathParameters['eventId']!),
  ),
];

/// Navigator identity belongs to one [GoRouter] lifecycle. Keeping these keys
/// beside the provider instance prevents disposed test/app containers from
/// retaining navigators that block a fresh router from mounting.
class _ConsumerNavigatorKeys {
  final root = GlobalKey<NavigatorState>();
  final dashboard = GlobalKey<NavigatorState>();
  final explore = GlobalKey<NavigatorState>();
  final chats = GlobalKey<NavigatorState>();
  final profile = GlobalKey<NavigatorState>();
}
