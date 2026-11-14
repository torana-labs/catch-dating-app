import 'dart:ui' show SemanticsAction, Tristate;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/organizers/domain/organizer.dart';
import 'package:catch_dating_app/contexts/profiles/data/user_profile_repository.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_dating_app/routing/go_router.dart';
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
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../organizers/organizers_test_helpers.dart';
import '../test_pump_helpers.dart';

const _uid = 'host-user';
final _organizer = buildOrganizer(
  id: 'saket-run-club',
  name: 'Saket Run Club',
  ownerUserId: _uid,
);
final _secondOrganizer = buildOrganizer(
  id: 'lodhi-social',
  name: 'Lodhi Social',
  ownerUserId: _uid,
);

ValueKey<Object> _destination(HostShellDestination destination) =>
    ValueKey<Object>('catch_tab_bar.destination.$destination');

void main() {
  test('the navigation destinations follow the workspace branches', () {
    expect(
      HostShellDestination.values.map((destination) => destination.name),
      HostWorkspaceRoot.values.map((root) => root.name),
    );
  });

  testWidgets('real Host shell owns the four destinations and switches them', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    final router = _router();
    await _pumpShell(
      tester,
      router,
      organizers: [_organizer, _secondOrganizer],
      unreadCount: 3,
    );

    final navigation = tester.widget<CatchTabBar<HostShellDestination>>(
      find.byKey(AppShellKeys.navigationBar),
    );
    expect(
      navigation.items.map((item) => item.label),
      orderedEquals(const ['Today', 'Events', 'People', 'Organizer']),
    );
    expect(navigation.items[2].badgeCount, 3);
    expect(navigation.items.last.semanticValue, _organizer.name);
    expect(find.text('TODAY BODY'), findsOneWidget);

    await tester.longPress(
      find.byKey(_destination(HostShellDestination.organizer)),
    );
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey<String>('host-organizer-switcher-sheet')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey<Object?>('lodhi-social')));
    await pumpFeatureUi(tester);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(HostShellScreen)),
    );
    expect(
      container.read(hostOrganizerSelectionProvider(_uid)),
      _secondOrganizer.id,
    );
    expect(
      tester
          .widget<CatchTabBar<HostShellDestination>>(
            find.byKey(AppShellKeys.navigationBar),
          )
          .items
          .last
          .semanticValue,
      _secondOrganizer.name,
    );

    for (final (destination, body) in const [
      (HostShellDestination.events, 'EVENTS BODY'),
      (HostShellDestination.people, 'AUDIENCE BODY'),
      (HostShellDestination.organizer, 'ORGANIZER BODY'),
    ]) {
      await tester.tap(find.byKey(_destination(destination)));
      await pumpFeatureUi(tester);
      expect(find.text(body), findsOneWidget);
    }

    // The inbox belongs to People: its route selects the People tab.
    router.go('/host/inbox');
    await pumpFeatureUi(tester);
    expect(find.text('INBOX BODY'), findsOneWidget);
    expect(
      tester
          .widget<CatchTabBar<HostShellDestination>>(
            find.byKey(AppShellKeys.navigationBar),
          )
          .active,
      HostShellDestination.people,
    );

    // Selecting the current tab again returns to its home, the audience.
    await tester.tap(find.byKey(_destination(HostShellDestination.people)));
    await pumpFeatureUi(tester);
    expect(find.text('AUDIENCE BODY'), findsOneWidget);
  });

  testWidgets('a requested organizer is selected once, then the host may '
      'switch away', (tester) async {
    final router = _router(requestedOrganizerId: _secondOrganizer.id);
    await _pumpShell(
      tester,
      router,
      organizers: [_organizer, _secondOrganizer],
    );
    final container = ProviderScope.containerOf(
      tester.element(find.byType(HostShellScreen)),
    );
    expect(
      container.read(hostOrganizerSelectionProvider(_uid)),
      _secondOrganizer.id,
    );

    container
        .read(hostOrganizerSelectionProvider(_uid).notifier)
        .select(_organizer.id);
    await pumpFeatureUi(tester);
    expect(
      container.read(hostOrganizerSelectionProvider(_uid)),
      _organizer.id,
      reason: 'A consumed request must not pull the selection back.',
    );
  });

  testWidgets(
    'the sidebar shows the organizer, New event and the signed-in person',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(1280, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final router = _router(withCreateRoute: true);
      await _pumpShell(
        tester,
        router,
        organizers: [_organizer, _secondOrganizer],
      );

      expect(
        find.byKey(const ValueKey('catch_tab_bar.sidebar')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey<String>('host-shell-person-identity')),
        findsOneWidget,
      );
      expect(find.text('Asha Rao'), findsOneWidget);

      await tester.tap(
        find.byKey(const ValueKey<String>('host-shell-organizer-identity')),
      );
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey<String>('host-organizer-switcher-sheet')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey<Object?>('lodhi-social')));
      await pumpFeatureUi(tester);

      expect(find.text('Lodhi Social'), findsOneWidget);
      await tester.tap(find.text('New event'));
      await pumpFeatureUi(tester);
      expect(find.text('CREATE BODY'), findsOneWidget);
      expect(
        router.state.uri.path,
        '/host/organizers/lodhi-social/create-event',
      );
    },
  );

  testWidgets(
    'real Host shell publishes adaptive placement through keyboard changes',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      const editorKey = ValueKey('host-shell-focus-continuity-editor');
      final editorController = TextEditingController(text: 'Host draft');
      final editorFocusNode = FocusNode();
      addTearDown(editorController.dispose);
      addTearDown(editorFocusNode.dispose);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetViewInsets);

      final router = _router(
        today: Scaffold(
          body: TextField(
            key: editorKey,
            controller: editorController,
            focusNode: editorFocusNode,
          ),
        ),
      );
      await _pumpShell(
        tester,
        router,
        organizers: [_organizer],
        theme: AppTheme.light.copyWith(platform: defaultTargetPlatform),
      );

      final tabBarFloats = CatchTabBar.floatsFor(
        tester.element(find.byType(HostShellScreen)),
      );
      final expectedPlacement = tabBarFloats
          ? CatchTabViewportScopePlacement.floating
          : CatchTabViewportScopePlacement.anchored;
      CatchTabViewportScope activeTab() => tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );
      expect(activeTab().bottomBarPlacement, expectedPlacement);
      expect(activeTab().bottomOverlayInset, tabBarFloats ? greaterThan(0) : 0);
      expect(
        find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
        tabBarFloats ? findsOneWidget : findsNothing,
      );
      expect(
        find.byKey(const ValueKey('catch_tab_bar.anchored_chrome')),
        tabBarFloats ? findsNothing : findsOneWidget,
      );

      final editor = find.byKey(editorKey);
      await tester.tap(editor);
      await tester.pump();
      editorController
        ..text = 'Host reply draft'
        ..selection = const TextSelection.collapsed(offset: 7);
      final editorElement = tester.element(editor);

      // A focused editor with zero viewInsets models a hardware keyboard.
      expect(tester.view.viewInsets.bottom, 0);
      expect(editorFocusNode.hasFocus, isTrue);
      expect(find.byKey(AppShellKeys.navigationBar), findsOneWidget);
      expect(activeTab().bottomBarPlacement, expectedPlacement);

      tester.view.viewInsets = const FakeViewPadding(bottom: 318);
      await tester.pump();

      expect(find.byKey(AppShellKeys.navigationBar), findsNothing);
      expect(
        activeTab().bottomBarPlacement,
        CatchTabViewportScopePlacement.none,
      );
      expect(activeTab().bottomOverlayInset, 0);
      expect(tester.element(editor), same(editorElement));
      expect(editorFocusNode.hasFocus, isTrue);
      expect(editorController.text, 'Host reply draft');
      expect(
        editorController.selection,
        const TextSelection.collapsed(offset: 7),
      );

      tester.view.resetViewInsets();
      await tester.pump();

      expect(find.byKey(AppShellKeys.navigationBar), findsOneWidget);
      expect(activeTab().bottomBarPlacement, expectedPlacement);
    },
    variant: const TargetPlatformVariant({
      TargetPlatform.android,
      TargetPlatform.iOS,
    }),
  );

  testWidgets(
    'Audience Forms draft survives destination changes and shell reflow',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final router = _router(
        initialLocation: '/host/audience?view=forms',
        audience: const _FormsDraftBody(),
      );
      await _pumpShell(tester, router, organizers: [_organizer]);

      const draftKey = ValueKey<String>('host-shell-forms-draft');
      final draft = find.byKey(draftKey);
      final draftElement = tester.element(draft);
      await tester.enterText(draft, 'Member application');

      await tester.tap(find.byKey(_destination(HostShellDestination.events)));
      await pumpFeatureUi(tester);
      expect(find.text('EVENTS BODY'), findsOneWidget);

      tester.view.physicalSize = const Size(1024, 900);
      await tester.pump();
      expect(
        find.byKey(const ValueKey('catch_tab_bar.sidebar')),
        findsOneWidget,
      );

      await tester.tap(find.byKey(_destination(HostShellDestination.people)));
      await pumpFeatureUi(tester);
      expect(tester.element(draft), same(draftElement));
      expect(find.text('Member application'), findsOneWidget);
    },
  );

  for (final scenario in const [
    (width: 599.0, textScale: 1.0, chromeKey: 'catch_tab_bar.anchored_chrome'),
    (width: 600.0, textScale: 1.0, chromeKey: 'catch_tab_bar.rail'),
    (width: 839.0, textScale: 1.0, chromeKey: 'catch_tab_bar.rail'),
    (width: 840.0, textScale: 1.0, chromeKey: 'catch_tab_bar.sidebar'),
    (width: 840.0, textScale: 2.0, chromeKey: 'catch_tab_bar.sidebar'),
    (width: 700.0, textScale: 2.0, chromeKey: 'catch_tab_bar.rail'),
  ]) {
    testWidgets('Host shell selects chrome at ${scenario.width}px and '
        '${scenario.textScale}x text', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = Size(scenario.width, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final sideNavigation = scenario.width >= 600;
      final sidebar = scenario.width >= 840;

      final router = _router();
      await _pumpShell(
        tester,
        router,
        organizers: [_organizer],
        unreadCount: 7,
        textScale: scenario.textScale,
      );

      expect(find.byKey(ValueKey(scenario.chromeKey)), findsOneWidget);
      expect(
        tester
            .widget<CatchTabViewportScope>(find.byType(CatchTabViewportScope))
            .bottomBarPlacement,
        sideNavigation
            ? CatchTabViewportScopePlacement.none
            : CatchTabViewportScopePlacement.anchored,
      );
      final navigation = tester.widget<CatchTabBar<HostShellDestination>>(
        find.byKey(AppShellKeys.navigationBar),
      );
      // One organizer: nothing to switch to.
      expect(navigation.items.last.onLongPress, isNull);
      expect(navigation.items.last.semanticValue, _organizer.name);
      expect(
        find.byKey(const ValueKey<String>('host-shell-organizer-identity')),
        sideNavigation ? findsOneWidget : findsNothing,
      );
      if (!sideNavigation) {
        for (final label in const ['Today', 'Events', 'People', 'Organizer']) {
          expect(find.bySemanticsLabel(RegExp(label)), findsOneWidget);
        }
        return;
      }
      expect(
        tester.getSize(find.byKey(ValueKey(scenario.chromeKey))).width,
        sidebar
            ? GeneratedCatchLayoutTokens.sidebar
            : GeneratedCatchLayoutTokens.rail,
      );
      for (final (index, label) in const [
        'Today',
        'Events',
        'People',
        'Organizer',
      ].indexed) {
        final semantics = find.semantics
            .byLabel(label)
            .evaluate()
            .where((node) => node.flagsCollection.isButton)
            .single;
        expect(
          semantics.flagsCollection.isSelected,
          index == 0 ? Tristate.isTrue : Tristate.isFalse,
        );
        expect(
          semantics.getSemanticsData().hasAction(SemanticsAction.tap),
          isTrue,
        );
      }
      tester.semantics.tap(find.semantics.byLabel('Events'));
      await pumpFeatureUi(tester);
      expect(router.routeInformationProvider.value.uri.path, '/host/events');
    });
  }
}

GoRouter _router({
  String initialLocation = '/host/today',
  String? requestedOrganizerId,
  Widget? today,
  Widget? audience,
  bool withCreateRoute = false,
}) {
  final router = GoRouter(
    initialLocation: initialLocation,
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) => HostShellScreen(
          navigationShell: navigationShell,
          requestedOrganizerId: requestedOrganizerId,
        ),
        branches: [
          StatefulShellBranch(
            routes: [_route('/host/today', 'TODAY BODY', today)],
          ),
          StatefulShellBranch(
            routes: [
              _route('/host/events', 'EVENTS BODY'),
              if (withCreateRoute)
                GoRoute(
                  path: Routes.hostCreateEventScreen.path,
                  name: Routes.hostCreateEventScreen.name,
                  builder: (context, state) =>
                      const Scaffold(body: Center(child: Text('CREATE BODY'))),
                ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              _route('/host/audience', 'AUDIENCE BODY', audience),
              _route('/host/inbox', 'INBOX BODY'),
            ],
          ),
          StatefulShellBranch(
            routes: [_route('/host/organizer', 'ORGANIZER BODY')],
          ),
        ],
      ),
    ],
  );
  addTearDown(router.dispose);
  return router;
}

GoRoute _route(String path, String label, [Widget? body]) => GoRoute(
  path: path,
  builder: (context, state) =>
      body ?? Scaffold(body: Center(child: Text(label))),
);

Future<void> _pumpShell(
  WidgetTester tester,
  GoRouter router, {
  required List<Organizer> organizers,
  int unreadCount = 0,
  double textScale = 1,
  ThemeData? theme,
}) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        uidProvider.overrideWith((ref) => Stream.value(_uid)),
        watchUserProfileProvider.overrideWith(
          (ref) => Stream.value(buildUser(uid: _uid, name: 'Asha Rao')),
        ),
        hostOperableOrganizersProvider(
          _uid,
        ).overrideWithValue(AsyncData(organizers)),
        totalUnreadCountProvider(_uid).overrideWithValue(unreadCount),
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
      child: MaterialApp.router(
        theme: theme ?? AppTheme.light,
        routerConfig: router,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
      ),
    ),
  );
  await pumpFeatureUi(tester);
}

class _FormsDraftBody extends StatefulWidget {
  const _FormsDraftBody();

  @override
  State<_FormsDraftBody> createState() => _FormsDraftBodyState();
}

class _FormsDraftBodyState extends State<_FormsDraftBody> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: TextField(
      key: const ValueKey<String>('host-shell-forms-draft'),
      controller: _controller,
    ),
  );
}
