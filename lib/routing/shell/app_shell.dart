import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/event_success/event_success_companion_launcher.dart';
import 'package:catch_dating_app/notifications/notifications.dart';
import 'package:catch_dating_app/routing/shell/adaptive_tab_scaffold.dart';
import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_dating_app/routing/shell/shell_chrome.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/push/fcm_service.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

// Transitional: host_planner_navigation_test.dart still reads the provider
// through this file while another task holds it. Remove once that test imports
// shell_chrome.dart (Phase 4, #2373).
export 'package:catch_dating_app/routing/shell/shell_chrome.dart'
    show appShellFcmInitializationProvider;

// Tab indices — kept in sync with branch order in consumer_router.dart
//   0  Home      (DashboardScreen)
//   1  Explore   (ExploreScreen)
//   2  Chats     (MatchesListScreen)
//   3  Profile   (ProfileScreen)

class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final uidAsync = ref.watch(uidProvider);
    final uid = uidAsync.asData?.value ?? '';
    final isAuthenticated = uid.isNotEmpty;
    final showGuestAuthCta =
        !isAuthenticated && !uidAsync.isLoading && !uidAsync.hasError;
    final unreadCount = isAuthenticated
        ? ref.watch(totalUnreadCountProvider(uid))
        : 0;
    final errorLogger = ref.read(errorLoggerProvider);
    final analytics = ref.read(appAnalyticsProvider);

    if (isAuthenticated) {
      final router = GoRouter.of(context);
      final fcmInitialization = appShellFcmInitializationProvider(uid, router);
      // FCM initialization is a background side effect; its value is not part
      // of the shell UI. Listening starts the provider and reports failures
      // without rebuilding the keyed StatefulNavigationShell when the future
      // completes.
      ref.listen(fcmInitialization, (previous, next) {
        if (!next.hasError) return;
        FlutterError.reportError(
          FlutterErrorDetails(
            exception: next.error!,
            stack: next.stackTrace,
            library: 'catch_fcm',
            context: ErrorDescription('while initializing Firebase Messaging'),
          ),
        );
      });
      // Listens only to open bookings; a booking that leaves them is read
      // once by id, and launches the companion when it became attended.
      ref.listen(watchEventParticipationsForUserProvider(uid), (_, next) {
        final openBookings = next.asData?.value;
        if (openBookings == null) return;
        final registry = ref.read(eventSuccessCompanionLaunchRegistryProvider);
        final departed = registry.departedEventIdsForUser(
          uid: uid,
          openBookings: openBookings,
        );
        for (final eventId in departed) {
          unawaited(
            launchEventSuccessCompanionIfAttended(
              context: context,
              ref: ref,
              uid: uid,
              eventId: eventId,
            ),
          );
        }
      });
    }

    // Keep observability user IDs in sync with auth state. Also invalidate the
    // user profile stream on sign-out so the next user starts fresh.
    _syncObservabilityUserId(
      uid.isEmpty ? null : uid,
      errorLogger: errorLogger,
      analytics: analytics,
    );
    ref.listen(uidProvider, (prev, next) {
      final uid = next.asData?.value;
      _syncObservabilityUserId(
        uid,
        errorLogger: errorLogger,
        analytics: analytics,
      );
      if (uid != prev?.asData?.value) {
        // Clears the notice on screen too; the controller's own state ends
        // with the signed-in period.
        ref.read(foregroundNotificationControllerProvider.notifier).reset();
      }
      if (uid == null && prev?.asData?.value != null) {
        unawaited(ref.read(fcmServiceProvider).reset());
        ref.invalidate(watchUserProfileProvider);
      }
    });

    final selectedIndex = navigationShell.currentIndex;
    final authenticatedNavigationBar = isAuthenticated
        ? AppShellNavigationBar(
            currentIndex: selectedIndex,
            unreadCount: unreadCount,
            items: consumerAppShellNavigationItems(),
            onDestinationSelected: (index) => navigationShell.goBranch(
              index,
              initialLocation: index == selectedIndex,
            ),
          )
        : null;
    return AdaptiveTabScaffold(
      activeIndex: navigationShell.currentIndex,
      navigationBar: authenticatedNavigationBar,
      anchoredFallback: showGuestAuthCta ? const GuestAuthCtaBar() : null,
      body: navigationShell,
    );
  }
}

void _syncObservabilityUserId(
  String? uid, {
  required ErrorLogger errorLogger,
  required AppAnalytics analytics,
}) {
  final normalizedUid = uid == null || uid.isEmpty ? null : uid;
  errorLogger.setUserId(normalizedUid);
  analytics.setUserId(normalizedUid);
}

class GuestAuthCtaBar extends StatelessWidget {
  const GuestAuthCtaBar({super.key});

  @override
  Widget build(BuildContext context) {
    return CatchLegacyDock(
      padding: const EdgeInsets.fromLTRB(
        CatchSpacing.s4,
        CatchSpacing.micro10,
        CatchSpacing.s4,
        CatchSpacing.s3,
      ),
      child: CatchButton(
        label: context.l10n.consumerAuthContinueWithPhone,
        onPressed: () => context.go(_authLocation(context)),
        fullWidth: true,
      ),
    );
  }

  String _authLocation(BuildContext context) {
    final from = GoRouterState.of(context).uri.toString();
    return Uri(
      path: Routes.authScreen.path,
      queryParameters: {
        'from': from.isEmpty ? Routes.exploreScreen.path : from,
      },
    ).toString();
  }
}

/// The guest app's four destinations, in branch order.
List<AppShellNavigationItem> consumerAppShellNavigationItems() => [
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.consumerHome,
    branchIndex: appShellHomeTabIndex,
    materialIcon: CatchIcons.home,
    materialSelectedIcon: CatchIcons.home,
    cupertinoIcon: CupertinoIcons.house,
    cupertinoSelectedIcon: CupertinoIcons.house_fill,
  ),
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.consumerExplore,
    branchIndex: appShellOrganizersTabIndex,
    materialIcon: CatchIcons.explore,
    materialSelectedIcon: CatchIcons.explore,
    cupertinoIcon: CupertinoIcons.person_2,
    cupertinoSelectedIcon: CupertinoIcons.person_2_fill,
  ),
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.consumerChats,
    branchIndex: appShellChatsTabIndex,
    materialIcon: CatchIcons.chat,
    materialSelectedIcon: CatchIcons.chat,
    cupertinoIcon: CupertinoIcons.chat_bubble_2,
    cupertinoSelectedIcon: CupertinoIcons.chat_bubble_2_fill,
    showsUnreadBadge: true,
  ),
  AppShellNavigationItem(
    destination: AppShellNavigationDestination.consumerProfile,
    branchIndex: appShellProfileTabIndex,
    materialIcon: CatchIcons.person,
    materialSelectedIcon: CatchIcons.person,
    cupertinoIcon: CupertinoIcons.person,
    cupertinoSelectedIcon: CupertinoIcons.person_fill,
  ),
];
