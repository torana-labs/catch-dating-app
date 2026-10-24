import 'package:catch_dating_app/auth/data/auth_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/presentation/adaptive_tab_scaffold.dart';
import 'package:catch_dating_app/core/presentation/app_shell.dart';
import 'package:catch_dating_app/core/presentation/host_app_shell.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/matches/data/match_repository.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:catch_dating_app/user_profile/data/user_profile_repository.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;
import 'package:widgetbook_workspace/support/contract_preview.dart';

import '../preview_layout_contracts.dart';

@widgetbook.UseCase(name: 'Guest shell', type: AppShell, path: '[App shell]')
Widget appShellGuestState(BuildContext context) {
  return const _ShellCatalog(
    title: 'AppShell',
    contractId: 'app.shell.consumer',
    child: _DeviceFrame(child: _ShellRouteScope()),
  );
}

@widgetbook.UseCase(
  name: 'Bottom navigation',
  type: AdaptiveTabScaffold,
  path: '[App shell]',
)
Widget adaptiveTabScaffoldState(BuildContext context) {
  return _ShellCatalog(
    title: 'AdaptiveTabScaffold',
    contractId: 'app.shell.adaptive_tab_scaffold',
    child: _DeviceFrame(
      child: AdaptiveTabScaffold(
        activeIndex: 0,
        body: Center(
          child: CatchMetadataText(
            'Explore tab body',
            color: CatchTokens.of(context).ink2,
          ),
        ),
        navigationBar: CatchTabBar<String>(
          items: widgetbookContractTabItems,
          active: 'explore',
          onChanged: widgetbookIgnoreString,
        ),
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Host shell · phone',
  type: HostAppShell,
  path: '[App shell]',
)
Widget hostAppShellPhoneState(BuildContext context) {
  return const _ShellCatalog(
    title: 'HostAppShell',
    contractId: 'app.shell.host',
    child: _DeviceFrame(
      width: WidgetbookPreviewLayout.phoneChromeWidth,
      height: WidgetbookPreviewLayout.celebrationViewportHeight,
      child: _ShellRouteScope(host: true),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Host shell · tablet',
  type: HostAppShell,
  path: '[App shell]',
)
Widget hostAppShellTabletState(BuildContext context) {
  return const _ShellCatalog(
    title: 'HostAppShell · tablet rail',
    contractId: 'app.shell.host',
    maxWidth: WidgetbookPreviewLayout.tabletChromeWidth,
    child: _DeviceFrame(
      width: WidgetbookPreviewLayout.tabletChromeWidth,
      height: WidgetbookPreviewLayout.tabletChromeHeight,
      child: _ShellRouteScope(host: true),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Host shell · desktop',
  type: HostAppShell,
  path: '[App shell]',
)
Widget hostAppShellDesktopState(BuildContext context) {
  return const _ShellCatalog(
    title: 'HostAppShell · desktop sidebar',
    contractId: 'app.shell.host',
    maxWidth: WidgetbookPreviewLayout.desktopChromeWidth,
    child: _DeviceFrame(
      width: WidgetbookPreviewLayout.desktopChromeWidth,
      height: WidgetbookPreviewLayout.desktopChromeHeight,
      child: _ShellRouteScope(host: true),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Guest CTA',
  type: GuestAuthCtaBar,
  path: '[App shell]',
)
Widget guestAuthCtaBarState(BuildContext context) {
  return const _ShellCatalog(
    title: 'GuestAuthCtaBar',
    contractId: 'component.app_shell.guest_auth_cta',
    child: GuestAuthCtaBar(),
  );
}

@widgetbook.UseCase(
  name: 'Navigation bar',
  type: AppShellNavigationBar,
  path: '[App shell]',
)
Widget appShellNavigationBarState(BuildContext context) {
  return _ShellCatalog(
    title: 'AppShellNavigationBar',
    contractId: 'component.app_shell.navigation_bar',
    child: AppShellNavigationBar(
      currentIndex: 2,
      unreadCount: 12,
      onDestinationSelected: (_) {},
    ),
  );
}

@widgetbook.UseCase(
  name: 'Labelled rail',
  type: AppShellSideNavigation,
  path: '[App shell]',
)
Widget appShellSideNavigationState(BuildContext context) {
  return _ShellCatalog(
    title: 'AppShellSideNavigation',
    contractId: 'component.app_shell.side_navigation',
    child: SizedBox(
      height: WidgetbookPreviewLayout.routeViewportHeight,
      child: AppShellSideNavigation(
        active: 1,
        items: _hostNavigationPreviewItems,
        onChanged: (_) {},
      ),
    ),
  );
}

@widgetbook.UseCase(
  name: 'Selected destination',
  type: CatchNavigationButton,
  path: '[App shell]',
)
Widget appShellNavigationRailButtonState(BuildContext context) {
  return _ShellCatalog(
    title: 'CatchNavigationButton',
    contractId: 'catch.tab_bar.button',
    child: CatchNavigationButton<int>.rail(
      item: _hostNavigationPreviewItems.first,
      selected: true,
      expanded: true,
      onTap: () {},
    ),
  );
}

final _hostNavigationPreviewItems = <CatchTabBarItem<int>>[
  CatchTabBarItem(
    id: 0,
    icon: CatchIcons.tabEvents,
    activeIcon: CatchIcons.tabEventsFilled,
    label: 'Events',
  ),
  CatchTabBarItem(
    id: 1,
    icon: CatchIcons.tabCustomers,
    activeIcon: CatchIcons.tabCustomersFilled,
    label: 'Customers',
  ),
  CatchTabBarItem(
    id: 2,
    icon: CatchIcons.tabChats,
    activeIcon: CatchIcons.tabChatsFilled,
    label: 'Inbox',
    badgeCount: 7,
  ),
  CatchTabBarItem(
    id: 3,
    icon: CatchIcons.tabOrganizer,
    activeIcon: CatchIcons.tabOrganizerFilled,
    label: 'Organizer',
  ),
];

class _ShellRouteScope extends StatefulWidget {
  const _ShellRouteScope({this.host = false});

  final bool host;

  @override
  State<_ShellRouteScope> createState() => _ShellRouteScopeState();
}

class _ShellRouteScopeState extends State<_ShellRouteScope> {
  static const _hostUid = 'widgetbook-host';

  late final GoRouter _router = GoRouter(
    initialLocation: widget.host ? '/host/events' : Routes.exploreScreen.path,
    routes: [
      GoRoute(
        path: Routes.authScreen.path,
        builder: (_, state) => Scaffold(
          body: Center(
            child: Text(
              'Auth ${state.uri.queryParameters['from'] ?? ''}',
              style: CatchTextStyles.bodyM(context),
            ),
          ),
        ),
      ),
      StatefulShellRoute.indexedStack(
        builder: (_, _, navigationShell) => widget.host
            ? HostAppShell(navigationShell: navigationShell)
            : AppShell(navigationShell: navigationShell),
        branches: widget.host
            ? [
                _branch('/host/events', 'Events'),
                _branch('/host/organizer', 'Organizer'),
                _branch('/host/inbox', 'Inbox'),
                _branch('/host/account', 'Account'),
              ]
            : [
                _branch(Routes.dashboardScreen.path, 'Home'),
                _branch(Routes.exploreScreen.path, 'Explore'),
                _branch(Routes.matchesListScreen.path, 'Chats'),
                _branch(Routes.profileScreen.path, 'Profile'),
              ],
      ),
    ],
  );

  @override
  void dispose() {
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ProviderScope(
      overrides: [
        uidProvider.overrideWith(
          (ref) => Stream<String?>.value(widget.host ? _hostUid : null),
        ),
        if (widget.host) ...[
          totalUnreadCountProvider(_hostUid).overrideWithValue(7),
          appShellFcmInitializationProvider(
            _hostUid,
            _router,
          ).overrideWith((ref) async {}),
        ],
        watchUserProfileProvider.overrideWith((ref) => Stream.value(null)),
        appConnectivityProvider.overrideWith((ref) => Stream.value(const [])),
        appAnalyticsProvider.overrideWithValue(
          AppAnalytics(
            reporter: _NoOpAnalyticsReporter(),
            shouldCollect: false,
          ),
        ),
        errorLoggerProvider.overrideWithValue(
          ErrorLogger(crashReporter: null, shouldReportErrors: false),
        ),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: _router),
    );
  }
}

StatefulShellBranch _branch(String path, String label) {
  return StatefulShellBranch(
    routes: [
      GoRoute(
        path: path,
        builder: (context, _) => Scaffold(
          body: Center(
            child: Text(label, style: CatchTextStyles.titleL(context)),
          ),
        ),
      ),
    ],
  );
}

class _ShellCatalog extends StatelessWidget {
  const _ShellCatalog({
    required this.title,
    required this.contractId,
    required this.child,
    this.maxWidth = 760,
  });

  final String title;
  final String contractId;
  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    final t = CatchTokens.of(context);
    return ColoredBox(
      color: t.bg,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(CatchSpacing.s5),
        child: Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(title, style: CatchTextStyles.headline(context)),
                gapH4,
                Text(
                  contractId,
                  style: CatchTextStyles.supporting(context, color: t.ink3),
                ),
                gapH20,
                CatchSurface(
                  borderRole: CatchBorderRole.separator,
                  child: child,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _DeviceFrame extends StatelessWidget {
  const _DeviceFrame({
    this.width = WidgetbookPreviewLayout.phoneChromeWidth,
    this.height = WidgetbookPreviewLayout.celebrationViewportHeight,
    required this.child,
  });

  final double width;
  final double height;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(CatchRadius.lg),
      child: SizedBox(width: width, height: height, child: child),
    );
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
