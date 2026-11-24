import 'package:catch_dating_app/pages/frame/notifications/foreground_notification_controller.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_platform/push/fcm_service.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'shell_chrome.g.dart';

// The chrome both apps' shells share: Firebase Messaging start-up for the
// signed-in person and the destination bar and rail. Each app's shell owns its
// own destinations and route frame.

@riverpod
Future<void> appShellFcmInitialization(
  Ref ref,
  String uid,
  GoRouter router,
) async {
  final fcmService = ref.watch(fcmServiceProvider);
  if (!fcmService.isSupportedPlatform) return;

  await fcmService.initialize(
    uid: uid,
    router: router,
    // SDK delivery occurs outside provider construction. Do not use a delayed
    // build-time state mutation to establish the presentation session. The
    // controller lives for one signed-in period, so it is read on delivery,
    // and a delivery after this shell's session has gone is dropped.
    onForegroundMessage: (message) {
      if (!ref.mounted) return;
      ref.read(foregroundNotificationControllerProvider.notifier)
        ..startSession(uid)
        ..receive(uid, message);
    },
  );
}

class AppShellNavigationBar extends StatelessWidget {
  const AppShellNavigationBar({
    super.key,
    required this.currentIndex,
    required this.unreadCount,
    required this.onDestinationSelected,
    required this.items,
    this.layout = AppShellNavigationLayout.bottom,
  });

  final int currentIndex;
  final int unreadCount;
  final ValueChanged<int> onDestinationSelected;
  final List<AppShellNavigationItem> items;
  final AppShellNavigationLayout layout;

  @override
  Widget build(BuildContext context) {
    final selectedIndex = currentIndex;
    final l10n = context.l10n;
    final navigationItems = [
      for (final (fallbackIndex, item) in items.indexed)
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
    // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
    return DecoratedBox(
      key: ValueKey(
        expanded ? 'app_shell.navigation.sidebar' : 'app_shell.navigation.rail',
      ),
      // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
      decoration: BoxDecoration(
        color: t.surface,
        // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
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
          // ignore: catch_ui_lints/catch_no_raw_surface_shell -- D18 drawing debt until this moves onto a library component (CAT-227)
          child: Material(
            color: Colors.transparent,
            child: FocusTraversalGroup(
              policy: OrderedTraversalPolicy(),
              child: title == null
                  ? destinations
                  : CatchWorkspacePaneScaffold(
                      title: CatchLegacyTopBar.brand(title: title!),
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
