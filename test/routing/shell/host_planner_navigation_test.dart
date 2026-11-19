import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizer_entitlement_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/routing/shell/app_shell.dart';
import 'package:catch_dating_app/routing/shell/app_shell_keys.dart';
import 'package:catch_dating_app/routing/shell/host_shell_navigation.dart';
import 'package:catch_dating_app/routing/shell/host_shell_screen.dart';
import 'package:catch_platform/analytics/app_analytics.dart';
import 'package:catch_platform/device/connectivity_service.dart';
import 'package:catch_platform/errors/error_logger.dart';
import 'package:catch_platform/routing/route_contract.dart';
import 'package:catch_platform/theme/app_theme.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../organizers/organizers_test_helpers.dart';
import '../../test_pump_helpers.dart';

const _uid = 'planner-user';
final _organizer = buildOrganizer(
  id: 'marigold-weddings',
  name: 'Marigold Weddings',
  ownerUserId: _uid,
);

void main() {
  test('weddings destinations open the planner home and the crew', () {
    expect(
      hostPlannerDestinationLocation(
        HostPlannerDestination.weddings,
        'marigold-weddings',
      ),
      '/host/programs?view=home&organizerId=marigold-weddings',
    );
    expect(
      hostPlannerDestinationLocation(
        HostPlannerDestination.crew,
        'marigold-weddings',
      ),
      '/host/organizers/team?organizerId=marigold-weddings',
    );
  });

  test('the weddings navigation needs a plan and room for a rail', () {
    for (final (size, plan, shows) in const [
      (CatchWindowSize.expanded, true, true),
      (CatchWindowSize.medium, true, true),
      (CatchWindowSize.compact, true, false),
      (CatchWindowSize.expanded, false, false),
    ]) {
      expect(
        hostShowsPlannerNavigation(size: size, hasWeddingsPlan: plan),
        shows,
        reason: '$size $plan',
      );
    }
  });

  test('only a Host tab home gives way to the weddings', () {
    for (final path in const [
      '/host/today',
      '/host/events',
      '/host/audience',
      '/host/inbox',
      '/host/organizer',
    ]) {
      expect(hostPlannerOpensWeddingsFrom(Uri.parse(path)), isTrue);
    }
    expect(
      hostPlannerOpensWeddingsFrom(
        Uri.parse('/host/today?organizerId=o&eventId=e'),
      ),
      isFalse,
    );
    expect(
      hostPlannerOpensWeddingsFrom(Uri.parse('/host/work/programs/p')),
      isFalse,
    );
    expect(
      hostPlannerOpensWeddingsFrom(
        Uri.parse('/host/programs?view=home&organizerId=o'),
      ),
      isFalse,
    );
  });

  testWidgets('a weddings company on desktop works from the weddings '
      'navigation', (tester) async {
    _desktop(tester);
    final router = _router();
    await _pumpShell(tester, router, weddingsPlan: true);

    // Today has no place here, so the shell opens the weddings.
    expect(router.state.uri.path, Routes.hostProgramsScreen.path);
    expect(find.text('WEDDINGS ROOT'), findsOneWidget);
    var navigation = tester.widget<CatchTabBar<HostPlannerDestination>>(
      find.byKey(AppShellKeys.navigationBar),
    );
    expect(
      navigation.items.map((item) => item.label),
      orderedEquals(const ['Weddings', 'Crew']),
    );
    expect(navigation.active, HostPlannerDestination.weddings);
    expect(navigation.primaryAction?.label, 'New wedding');

    await tester.tap(
      find.byKey(
        ValueKey<Object>(
          'catch_tab_bar.destination.${HostPlannerDestination.crew}',
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.text('CREW BODY'), findsOneWidget);
    navigation = tester.widget<CatchTabBar<HostPlannerDestination>>(
      find.byKey(AppShellKeys.navigationBar),
    );
    expect(navigation.active, HostPlannerDestination.crew);

    await tester.tap(find.text('New wedding'));
    await pumpFeatureUi(tester);
    expect(find.text('NEW WEDDING BODY'), findsOneWidget);
  });

  testWidgets('a record opened inside a tab stays put', (tester) async {
    _desktop(tester);
    final router = _router(
      initialLocation: '/host/today?organizerId=o&eventId=e',
    );
    await _pumpShell(tester, router, weddingsPlan: true);

    expect(router.state.uri.path, '/host/today');
    expect(find.byType(CatchTabBar<HostPlannerDestination>), findsOneWidget);
  });

  testWidgets('without a weddings plan the Host tabs stay', (tester) async {
    _desktop(tester);
    await _pumpShell(tester, _router(), weddingsPlan: false);
    expect(find.text('TODAY BODY'), findsOneWidget);
    expect(find.byType(CatchTabBar<HostShellDestination>), findsOneWidget);
  });

  testWidgets('a weddings company keeps the Host tabs on a phone', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    await _pumpShell(tester, _router(), weddingsPlan: true);
    expect(find.text('TODAY BODY'), findsOneWidget);
    expect(find.byType(CatchTabBar<HostShellDestination>), findsOneWidget);
  });
}

void _desktop(WidgetTester tester) {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(1440, 900);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPhysicalSize);
}

GoRouter _router({String initialLocation = '/host/today'}) {
  final router = GoRouter(
    initialLocation: initialLocation,
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            HostShellScreen(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(routes: [_route('/host/today', 'TODAY BODY')]),
          StatefulShellBranch(
            routes: [
              _route('/host/events', 'EVENTS BODY'),
              GoRoute(
                path: Routes.hostProgramsScreen.path,
                builder: (context, state) =>
                    const Scaffold(body: Center(child: Text('WEDDINGS ROOT'))),
              ),
              GoRoute(
                path: Routes.hostCreateProgramScreen.path,
                name: Routes.hostCreateProgramScreen.name,
                builder: (context, state) => const Scaffold(
                  body: Center(child: Text('NEW WEDDING BODY')),
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              _route('/host/audience', 'AUDIENCE BODY'),
              _route('/host/inbox', 'INBOX BODY'),
            ],
          ),
          StatefulShellBranch(
            routes: [
              _route('/host/organizer', 'ORGANIZER BODY'),
              _route(Routes.hostOrganizerTeamScreen.path, 'CREW BODY'),
            ],
          ),
        ],
      ),
    ],
  );
  addTearDown(router.dispose);
  return router;
}

GoRoute _route(String path, String label) => GoRoute(
  path: path,
  builder: (context, state) => Scaffold(body: Center(child: Text(label))),
);

Future<void> _pumpShell(
  WidgetTester tester,
  GoRouter router, {
  required bool weddingsPlan,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_uid)),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(buildUser(uid: _uid, name: 'Meher Shah')),
        ),
        hostOperableOrganizersProvider(
          _uid,
        ).overrideWithValue(AsyncData([_organizer])),
        organizerEntitlementProvider(_organizer.id).overrideWithValue(
          AsyncData(
            OrganizerEntitlement(
              organizerId: _organizer.id,
              hasWeddingsPlan: weddingsPlan,
            ),
          ),
        ),
        totalUnreadCountProvider(_uid).overrideWithValue(0),
        appConnectivityProvider.overrideWith(
          (ref) => Stream.value(const [ConnectivityResult.wifi]),
        ),
        appShellFcmInitializationProvider(
          _uid,
          router,
        ).overrideWith((ref) async {}),
        errorLoggerProvider.overrideWithValue(ErrorLogger()),
        appAnalyticsProvider.overrideWithValue(AppAnalytics()),
      ],
      child: MaterialApp.router(theme: AppTheme.light, routerConfig: router),
    ),
  );
  await pumpFeatureUi(tester);
}
