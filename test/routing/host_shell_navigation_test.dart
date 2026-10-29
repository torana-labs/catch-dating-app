import 'dart:ui' show SemanticsAction, Tristate;

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/connections/data/match_repository.dart';
import 'package:catch_dating_app/contexts/organizers/data/clubs_repository.dart';
import 'package:catch_dating_app/core/analytics/app_analytics.dart';
import 'package:catch_dating_app/core/connectivity_service.dart';
import 'package:catch_dating_app/core/presentation/app_shell.dart';
import 'package:catch_dating_app/core/presentation/app_shell_keys.dart';
import 'package:catch_dating_app/core/presentation/host_app_shell.dart';
import 'package:catch_dating_app/core/theme/app_theme.dart';
import 'package:catch_dating_app/exceptions/error_logger.dart';
import 'package:catch_dating_app/hosts/presentation/host_organizer_selection_controller.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../clubs/clubs_test_helpers.dart';
import '../test_pump_helpers.dart';

const _uid = 'host-user';
final _organizer = buildClub(
  id: 'saket-run-club',
  name: 'Saket Run Club',
  ownerUserId: _uid,
);
final _secondOrganizer = buildClub(
  id: 'lodhi-social',
  name: 'Lodhi Social',
  ownerUserId: _uid,
);

void main() {
  testWidgets('real Host shell owns the lifecycle IA and switches branches', (
    tester,
  ) async {
    final router = GoRouter(
      initialLocation: '/host/today',
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) =>
              HostAppShell(navigationShell: navigationShell),
          branches: [
            _branch('/host/today', 'TODAY BODY'),
            _branch('/host/events', 'EVENTS BODY'),
            _branch('/host/audience', 'AUDIENCE BODY'),
            _branch('/host/inbox', 'INBOX BODY'),
            _branch('/host/organizer', 'ORGANIZER BODY'),
          ],
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          uidProvider.overrideWith((ref) => Stream.value(_uid)),
          hostOperableClubsProvider(
            _uid,
          ).overrideWithValue(AsyncData([_organizer, _secondOrganizer])),
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

    final navigationBar = tester.widget<AppShellNavigationBar>(
      find.byType(AppShellNavigationBar),
    );
    expect(
      navigationBar.items!.map((item) => item.destination),
      orderedEquals(const [
        AppShellNavigationDestination.hostToday,
        AppShellNavigationDestination.hostEvents,
        AppShellNavigationDestination.hostAudience,
        AppShellNavigationDestination.hostInbox,
        AppShellNavigationDestination.hostOrganizer,
      ]),
    );
    expect(find.text('TODAY BODY'), findsOneWidget);
    expect(
      find.byKey(const ValueKey<String>('host-organizer-navigation-avatar')),
      findsOneWidget,
    );
    expect(navigationBar.items!.last.semanticValue, _organizer.name);

    await tester.longPress(
      find.byKey(const ValueKey('app_shell.navigation.destination.4')),
    );
    await pumpFeatureUi(tester);
    expect(
      find.byKey(const ValueKey<String>('host-organizer-switcher-sheet')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey<Object?>('lodhi-social')));
    await pumpFeatureUi(tester);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(HostAppShell)),
    );
    expect(
      container.read(hostOrganizerSelectionProvider(_uid)),
      _secondOrganizer.id,
    );
    expect(
      tester
          .widget<AppShellNavigationBar>(find.byType(AppShellNavigationBar))
          .items!
          .last
          .semanticValue,
      _secondOrganizer.name,
    );

    await tester.tap(
      find.byKey(const ValueKey('app_shell.navigation.destination.1')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('EVENTS BODY'), findsOneWidget);

    await tester.tap(
      find.byKey(const ValueKey('app_shell.navigation.destination.2')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('AUDIENCE BODY'), findsOneWidget);

    await tester.tap(
      find.byKey(const ValueKey('app_shell.navigation.destination.3')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('INBOX BODY'), findsOneWidget);

    await tester.tap(
      find.byKey(const ValueKey('app_shell.navigation.destination.4')),
    );
    await pumpFeatureUi(tester);
    expect(find.text('ORGANIZER BODY'), findsOneWidget);
  });

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

      final router = GoRouter(
        initialLocation: '/host/today',
        routes: [
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                HostAppShell(navigationShell: navigationShell),
            branches: [
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/host/today',
                    builder: (context, state) => Scaffold(
                      body: TextField(
                        key: editorKey,
                        controller: editorController,
                        focusNode: editorFocusNode,
                      ),
                    ),
                  ),
                ],
              ),
              _branch('/host/events', 'EVENTS BODY'),
              _branch('/host/audience', 'AUDIENCE BODY'),
              _branch('/host/inbox', 'INBOX BODY'),
              _branch('/host/organizer', 'ORGANIZER BODY'),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(_uid)),
            hostOperableClubsProvider(
              _uid,
            ).overrideWithValue(AsyncData([_organizer])),
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
          child: MaterialApp.router(
            theme: AppTheme.light.copyWith(platform: defaultTargetPlatform),
            routerConfig: router,
          ),
        ),
      );
      await pumpFeatureUi(tester);

      final tabBarFloats = CatchTabBar.floatsFor(
        tester.element(find.byType(HostAppShell)),
      );
      final expectedPlacement = tabBarFloats
          ? CatchTabViewportScopePlacement.floating
          : CatchTabViewportScopePlacement.anchored;
      final shellScaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      final activeTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );
      expect(shellScaffold.extendBody, tabBarFloats);
      expect(
        find.descendant(
          of: find.byWidget(shellScaffold.body!),
          matching: find.byType(CatchTabViewportScope),
          matchRoot: true,
        ),
        findsOneWidget,
      );
      expect(
        shellScaffold.bottomNavigationBar,
        tabBarFloats ? isNull : isNotNull,
      );
      expect(activeTab.bottomBarPlacement, expectedPlacement);
      expect(activeTab.bottomOverlayInset, tabBarFloats ? greaterThan(0) : 0);
      expect(
        find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
        tabBarFloats ? findsOneWidget : findsNothing,
      );
      expect(
        find.byKey(const ValueKey('catch_tab_bar.anchored_chrome')),
        tabBarFloats ? findsNothing : findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
          matching: find.byType(BackdropFilter),
        ),
        tabBarFloats ? findsOneWidget : findsNothing,
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
      expect(find.byType(AppShellNavigationBar), findsOneWidget);
      expect(
        tester
            .widget<CatchTabViewportScope>(find.byType(CatchTabViewportScope))
            .bottomBarPlacement,
        expectedPlacement,
      );

      tester.view.viewInsets = const FakeViewPadding(bottom: 318);
      await tester.pump();

      final keyboardScaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      final keyboardActiveTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );
      expect(find.byType(AppShellNavigationBar), findsNothing);
      expect(keyboardScaffold.extendBody, isFalse);
      expect(keyboardScaffold.bottomNavigationBar, isNull);
      expect(
        find.descendant(
          of: find.byWidget(keyboardScaffold.body!),
          matching: find.byType(CatchTabViewportScope),
          matchRoot: true,
        ),
        findsOneWidget,
      );
      expect(
        keyboardActiveTab.bottomBarPlacement,
        CatchTabViewportScopePlacement.none,
      );
      expect(keyboardActiveTab.bottomOverlayInset, 0);
      expect(tester.element(editor), same(editorElement));
      expect(editorFocusNode.hasFocus, isTrue);
      expect(editorController.text, 'Host reply draft');
      expect(
        editorController.selection,
        const TextSelection.collapsed(offset: 7),
      );

      tester.view.resetViewInsets();
      await tester.pump();

      final restoredScaffold = tester.widget<Scaffold>(
        find.byKey(AppShellKeys.scaffold),
      );
      expect(find.byType(AppShellNavigationBar), findsOneWidget);
      expect(
        restoredScaffold.bottomNavigationBar,
        tabBarFloats ? isNull : isNotNull,
      );
      expect(
        tester
            .widget<CatchTabViewportScope>(find.byType(CatchTabViewportScope))
            .bottomBarPlacement,
        expectedPlacement,
      );
      expect(
        find.byKey(const ValueKey('catch_tab_bar.floating_chrome')),
        tabBarFloats ? findsOneWidget : findsNothing,
      );
      expect(
        find.byKey(const ValueKey('catch_tab_bar.anchored_chrome')),
        tabBarFloats ? findsNothing : findsOneWidget,
      );
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

      final router = GoRouter(
        initialLocation: '/host/audience?view=forms',
        routes: [
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                HostAppShell(navigationShell: navigationShell),
            branches: [
              _branch('/host/today', 'TODAY BODY'),
              _branch('/host/events', 'EVENTS BODY'),
              StatefulShellBranch(
                routes: [
                  GoRoute(
                    path: '/host/audience',
                    builder: (context, state) => const _FormsDraftBody(),
                  ),
                ],
              ),
              _branch('/host/inbox', 'INBOX BODY'),
              _branch('/host/organizer', 'ORGANIZER BODY'),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(_uid)),
            hostOperableClubsProvider(
              _uid,
            ).overrideWithValue(AsyncData([_organizer])),
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
          child: MaterialApp.router(
            theme: AppTheme.light,
            routerConfig: router,
          ),
        ),
      );
      await pumpFeatureUi(tester);

      const draftKey = ValueKey<String>('host-shell-forms-draft');
      final draft = find.byKey(draftKey);
      final draftElement = tester.element(draft);
      await tester.enterText(draft, 'Member application');

      await tester.tap(find.bySemanticsLabel(RegExp('Events')));
      await pumpFeatureUi(tester);
      expect(find.text('EVENTS BODY'), findsOneWidget);

      tester.view.physicalSize = const Size(1024, 900);
      await tester.pump();
      expect(
        find.byKey(const ValueKey('app_shell.navigation.sidebar')),
        findsOneWidget,
      );

      await tester.tap(
        find.byKey(const ValueKey('app_shell.navigation.destination.2')),
      );
      await pumpFeatureUi(tester);
      expect(tester.element(draft), same(draftElement));
      expect(find.text('Member application'), findsOneWidget);
    },
  );

  for (final scenario in const [
    (
      width: 599.0,
      textScale: 1.0,
      chromeKey: 'catch_tab_bar.anchored_chrome',
      sideNavigation: false,
      sidebar: false,
    ),
    (
      width: 600.0,
      textScale: 1.0,
      chromeKey: 'app_shell.navigation.rail',
      sideNavigation: true,
      sidebar: false,
    ),
    (
      width: 839.0,
      textScale: 1.0,
      chromeKey: 'app_shell.navigation.rail',
      sideNavigation: true,
      sidebar: false,
    ),
    (
      width: 840.0,
      textScale: 1.0,
      chromeKey: 'app_shell.navigation.sidebar',
      sideNavigation: true,
      sidebar: true,
    ),
    (
      width: 840.0,
      textScale: 2.0,
      chromeKey: 'app_shell.navigation.sidebar',
      sideNavigation: true,
      sidebar: true,
    ),
    (
      width: 700.0,
      textScale: 2.0,
      chromeKey: 'app_shell.navigation.rail',
      sideNavigation: true,
      sidebar: false,
    ),
  ]) {
    testWidgets('Host shell selects chrome at ${scenario.width}px and '
        '${scenario.textScale}x text', (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = Size(scenario.width, 900);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);

      final router = GoRouter(
        initialLocation: '/host/today',
        routes: [
          StatefulShellRoute.indexedStack(
            builder: (context, state, navigationShell) =>
                HostAppShell(navigationShell: navigationShell),
            branches: [
              _branch('/host/today', 'TODAY BODY'),
              _branch('/host/events', 'EVENTS BODY'),
              _branch('/host/audience', 'AUDIENCE BODY'),
              _branch('/host/inbox', 'INBOX BODY'),
              _branch('/host/organizer', 'ORGANIZER BODY'),
            ],
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            uidProvider.overrideWith((ref) => Stream.value(_uid)),
            hostOperableClubsProvider(
              _uid,
            ).overrideWithValue(AsyncData([_organizer])),
            totalUnreadCountProvider(_uid).overrideWithValue(7),
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
            theme: AppTheme.light,
            routerConfig: router,
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(
                context,
              ).copyWith(textScaler: TextScaler.linear(scenario.textScale)),
              child: child!,
            ),
          ),
        ),
      );
      await pumpFeatureUi(tester);

      expect(find.byKey(ValueKey(scenario.chromeKey)), findsOneWidget);
      expect(
        find.byType(CatchTabBar<int>),
        scenario.sideNavigation ? findsNothing : findsOneWidget,
      );
      final activeTab = tester.widget<CatchTabViewportScope>(
        find.byType(CatchTabViewportScope),
      );
      expect(
        activeTab.bottomBarPlacement,
        scenario.sideNavigation
            ? CatchTabViewportScopePlacement.none
            : CatchTabViewportScopePlacement.anchored,
      );
      expect(
        find.text('Catch Host'),
        scenario.sidebar ? findsOneWidget : findsNothing,
      );
      if (scenario.sidebar) {
        expect(
          tester.widget<Text>(find.text('Catch Host')).maxLines,
          scenario.textScale >= 1.6 ? 2 : 1,
        );
      }
      final navigationBar = tester.widget<AppShellNavigationBar>(
        find.byType(AppShellNavigationBar),
      );
      expect(navigationBar.items!.last.onLongPress, isNull);
      expect(navigationBar.items!.last.semanticValue, _organizer.name);
      if (scenario.sideNavigation) {
        expect(
          tester.getSize(find.byKey(ValueKey(scenario.chromeKey))).width,
          scenario.sidebar
              ? CatchLayout.appShellSidebarWidth
              : scenario.textScale >= 1.6
              ? CatchLayout.appShellLargeTextRailWidth
              : CatchLayout.appShellRailWidth,
        );
        final expectedLabels = [
          'Today',
          'Events',
          'Audience',
          'Inbox',
          'Organizer',
        ];
        for (final (index, label) in expectedLabels.indexed) {
          final destination = find.byKey(
            ValueKey('app_shell.navigation.destination.$index'),
          );
          expect(destination, findsOneWidget);
          final semantics = find.semantics
              .byLabel(label)
              .evaluate()
              .where((node) => node.flagsCollection.isButton)
              .single;
          expect(semantics.label, label);
          expect(semantics.flagsCollection.isButton, isTrue);
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
        expect(
          find.semantics
              .byLabel('Events')
              .evaluate()
              .single
              .flagsCollection
              .isSelected,
          Tristate.isTrue,
        );
      } else {
        expect(find.bySemanticsLabel(RegExp('Today')), findsOneWidget);
        expect(find.bySemanticsLabel(RegExp('Events')), findsOneWidget);
        expect(find.bySemanticsLabel(RegExp('Audience')), findsOneWidget);
        expect(find.bySemanticsLabel(RegExp('Inbox')), findsOneWidget);
        expect(find.bySemanticsLabel(RegExp('Organizer')), findsOneWidget);
      }
    });
  }
}

StatefulShellBranch _branch(String path, String label) {
  return StatefulShellBranch(
    routes: [
      GoRoute(
        path: path,
        builder: (context, state) => Scaffold(body: Center(child: Text(label))),
      ),
    ],
  );
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
