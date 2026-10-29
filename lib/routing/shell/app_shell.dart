import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/data/event_participation_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/event_success/event_success_companion_launcher.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/notifications/notifications.dart';
import 'package:catch_dating_app/platform/analytics/app_analytics.dart';
import 'package:catch_dating_app/platform/errors/error_logger.dart';
import 'package:catch_dating_app/platform/push/fcm_service.dart';
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_dating_app/routing/shell/adaptive_tab_scaffold.dart';
import 'package:catch_dating_app/routing/shell/app_shell_active_tab.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

// Tab indices — kept in sync with branch order in go_router.dart
//   0  Home      (DashboardScreen)
//   1  Explore   (ExploreScreen)
//   2  Chats     (MatchesListScreen)
//   3  Profile   (ProfileScreen)

part 'app_shell.g.dart';

@riverpod
Future<void> appShellFcmInitialization(
  Ref ref,
  String uid,
  GoRouter router,
) async {
  final fcmService = ref.watch(fcmServiceProvider);
  if (!fcmService.isSupportedPlatform) return;

  final arrivals = ref.read(foregroundNotificationControllerProvider.notifier);
  await fcmService.initialize(
    uid: uid,
    router: router,
    // SDK delivery occurs outside provider construction. Do not use a delayed
    // build-time state mutation to establish the presentation session.
    onForegroundMessage: (message) {
      arrivals.startSession(uid);
      arrivals.receive(uid, message);
    },
  );
}

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
      ref.listen(watchEventParticipationsForUserProvider(uid), (_, next) {
        final participations = next.asData?.value;
        if (participations == null) return;
        final registry = ref.read(eventSuccessCompanionLaunchRegistryProvider);
        final transitions = registry.attendedTransitionsForUser(
          uid: uid,
          participations: participations,
        );
        for (final participation in transitions) {
          unawaited(
            launchEventSuccessCompanionForParticipation(
              context: context,
              ref: ref,
              uid: uid,
              participation: participation,
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
        ref.read(foregroundNotificationControllerProvider.notifier).reset();
        ref.read(eventSuccessCompanionLaunchRegistryProvider).reset();
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
    return CatchDock(
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

class AppShellNavigationBar extends StatelessWidget {
  const AppShellNavigationBar({
    super.key,
    required this.currentIndex,
    required this.unreadCount,
    required this.onDestinationSelected,
    this.items,
    this.layout = AppShellNavigationLayout.bottom,
  });

  final int currentIndex;
  final int unreadCount;
  final ValueChanged<int> onDestinationSelected;
  final List<AppShellNavigationItem>? items;
  final AppShellNavigationLayout layout;

  @override
  Widget build(BuildContext context) {
    final selectedIndex = currentIndex;
    final destinations = items ?? _consumerNavigationItems();
    final l10n = context.l10n;
    final navigationItems = [
      for (final (fallbackIndex, item) in destinations.indexed)
        CatchTabBarItem(
          id: item.branchIndex ?? fallbackIndex,
          icon: prefersCupertinoControls()
              ? item.cupertinoIcon
              : item.materialIcon,
          activeIcon: prefersCupertinoControls()
              ? item.cupertinoSelectedIcon
              : item.materialSelectedIcon,
          iconWidget: item.iconBuilder?.call(context),
          activeIconWidget:
              item.selectedIconBuilder?.call(context) ??
              item.iconBuilder?.call(context),
          label: item.destination.localizedLabel(l10n),
          badgeCount: item.showsUnreadBadge ? unreadCount : 0,
          onLongPress: item.onLongPress,
          semanticValue: item.semanticValue,
          semanticHint: item.semanticHint,
        ),
    ];

    return switch (layout) {
      AppShellNavigationLayout.bottom => CatchTabBar<int>(
        key: AppShellKeys.navigationBar,
        active: selectedIndex,
        onChanged: onDestinationSelected,
        items: navigationItems,
      ),
      AppShellNavigationLayout.rail => AppShellSideNavigation(
        key: AppShellKeys.navigationBar,
        active: selectedIndex,
        items: navigationItems,
        onChanged: onDestinationSelected,
      ),
      AppShellNavigationLayout.sidebar => AppShellSideNavigation(
        key: AppShellKeys.navigationBar,
        active: selectedIndex,
        items: navigationItems,
        onChanged: onDestinationSelected,
        expanded: true,
        title: l10n.appTitleHost,
      ),
    };
  }
}

/// Placement variants supported by the shared shell destination adapter.
enum AppShellNavigationLayout { bottom, rail, sidebar }

/// Labelled vertical destination plane for medium and expanded app shells.
class AppShellSideNavigation extends StatelessWidget {
  const AppShellSideNavigation({
    super.key,
    required this.active,
    required this.items,
    required this.onChanged,
    this.expanded = false,
    this.title,
  });

  final int active;
  final List<CatchTabBarItem<int>> items;
  final ValueChanged<int> onChanged;
  final bool expanded;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    final largeText = MediaQuery.textScalerOf(context).scale(1) >= 1.6;
    final destinations = Padding(
      padding: const EdgeInsets.symmetric(
        horizontal: CatchSpacing.s3,
        vertical: CatchSpacing.s4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final item in items) ...[
            CatchNavigationButton<int>.rail(
              key: ValueKey('app_shell.navigation.destination.${item.id}'),
              item: item,
              selected: item.id == active,
              expanded:
                  expanded || MediaQuery.textScalerOf(context).scale(1) >= 1.6,
              onTap: () => onChanged(item.id),
            ),
            if (item != items.last) const SizedBox(height: CatchSpacing.s2),
          ],
        ],
      ),
    );
    return DecoratedBox(
      key: ValueKey(
        expanded ? 'app_shell.navigation.sidebar' : 'app_shell.navigation.rail',
      ),
      decoration: BoxDecoration(
        color: t.surface,
        border: Border(right: BorderSide(color: t.line)),
      ),
      child: SafeArea(
        right: false,
        child: SizedBox(
          width: expanded
              ? CatchLayout.appShellSidebarWidth
              : largeText
              ? CatchLayout.appShellLargeTextRailWidth
              : CatchLayout.appShellRailWidth,
          child: Material(
            color: Colors.transparent,
            child: FocusTraversalGroup(
              policy: OrderedTraversalPolicy(),
              child: title == null
                  ? destinations
                  : CatchWorkspacePaneScaffold(
                      title: CatchTopBar.brand(title: title!),
                      body: destinations,
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

class AppShellNavigationItem {
  const AppShellNavigationItem({
    required this.destination,
    required this.materialIcon,
    required this.materialSelectedIcon,
    required this.cupertinoIcon,
    required this.cupertinoSelectedIcon,
    this.branchIndex,
    this.showsUnreadBadge = false,
    this.iconBuilder,
    this.selectedIconBuilder,
    this.onLongPress,
    this.semanticValue,
    this.semanticHint,
  });

  final AppShellNavigationDestination destination;
  final int? branchIndex;
  final IconData materialIcon;
  final IconData materialSelectedIcon;
  final IconData cupertinoIcon;
  final IconData cupertinoSelectedIcon;
  final bool showsUnreadBadge;
  final WidgetBuilder? iconBuilder;
  final WidgetBuilder? selectedIconBuilder;
  final VoidCallback? onLongPress;
  final String? semanticValue;
  final String? semanticHint;
}

enum AppShellNavigationDestination {
  consumerHome,
  consumerExplore,
  consumerChats,
  consumerProfile,
  hostToday,
  hostEvents,
  hostAudience,
  hostInbox,
  hostOrganizer;

  String localizedLabel(AppLocalizations l10n) => switch (this) {
    AppShellNavigationDestination.consumerHome => l10n.consumerNavigationHome,
    AppShellNavigationDestination.consumerExplore =>
      l10n.consumerNavigationExplore,
    AppShellNavigationDestination.consumerChats => l10n.consumerNavigationChats,
    AppShellNavigationDestination.consumerProfile =>
      l10n.consumerNavigationProfile,
    AppShellNavigationDestination.hostToday => l10n.hostNavigationToday,
    AppShellNavigationDestination.hostEvents => l10n.hostNavigationEvents,
    AppShellNavigationDestination.hostAudience => l10n.hostNavigationAudience,
    AppShellNavigationDestination.hostInbox => l10n.hostNavigationInbox,
    AppShellNavigationDestination.hostOrganizer => l10n.hostNavigationOrganizer,
  };
}

List<AppShellNavigationItem> _consumerNavigationItems() => [
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
    branchIndex: appShellClubsTabIndex,
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
