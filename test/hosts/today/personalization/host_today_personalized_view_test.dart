import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/insights/data/host_today_preference_repository.dart';
import 'package:catch_dating_app/contexts/insights/domain/host_today_preference.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_focus_screen.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalization_state.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_personalized_layout.dart';
import 'package:catch_dating_app/hosts/today/personalization/presentation/host_today_roadmap_provider.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_feed_controller.dart';
import 'package:catch_dating_app/hosts/today/presentation/host_today_state.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_notice_overlay.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/routing/go_router.dart'
    show hostOrganizerScreenForUri;
import 'package:catch_dating_app/routing/route_contract.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../../../events/events_test_helpers.dart' show buildEvent;
import '../../../organizers/organizers_test_helpers.dart' show buildOrganizer;
import '../../../test_pump_helpers.dart';

void main() {
  final scope = HostTodayPreferenceScope(
    accountId: 'owner',
    organizerId: 'org',
  );
  late _MemoryPreferences preferences;
  setUp(() => preferences = _MemoryPreferences());

  Future<GoRouter> mount(
    WidgetTester tester, {
    HostTodayStatus status = HostTodayStatus.empty,
    ValueNotifier<HostTodayStatus>? statusChanges,
    String initialLocation = '/host/today',
  }) async {
    final statuses = statusChanges ?? ValueNotifier(status);
    if (statusChanges == null) addTearDown(statuses.dispose);
    final router = GoRouter(
      initialLocation: initialLocation,
      routes: [
        GoRoute(
          path: '/host/today',
          name: Routes.hostTodayScreen.name,
          builder: (_, _) => ValueListenableBuilder<HostTodayStatus>(
            valueListenable: statuses,
            builder: (_, currentStatus, _) => CatchRootScreenScaffold.sections(
              title: const Text('Today'),
              children: [
                HostTodayPersonalizedLayout(
                  scope: scope,
                  today: HostTodayState(status: currentStatus),
                  now: DateTime(2026, 9, 21),
                  operationalSurface: const SliverToBoxAdapter(
                    child: Text('Operational work'),
                  ),
                ),
              ],
            ),
          ),
          routes: [
            GoRoute(
              path: 'focus',
              name: Routes.hostTodayFocusScreen.name,
              builder: (_, _) => const HostTodayFocusScreen(organizerId: 'org'),
            ),
          ],
        ),
        GoRoute(
          path: '/host/organizer',
          name: Routes.hostOrganizerScreen.name,
          builder: (_, state) => Scaffold(
            body: Text(
              'Organizer ${hostOrganizerScreenForUri(state.uri).initialOrganizerId}',
            ),
          ),
        ),
        GoRoute(
          path: '/host/events',
          name: Routes.hostEventsScreen.name,
          builder: (_, _) => const Scaffold(body: Text('Events')),
        ),
      ],
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      ProviderScope(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData('owner')),
          hostOperableOrganizersProvider('owner').overrideWithValue(
            AsyncData([buildOrganizer(id: 'org', ownerUserId: 'owner')]),
          ),
          hostTodayPreferenceRepositoryProvider.overrideWithValue(preferences),
          hostTodayFeedControllerProvider.overrideWith2(
            (_) => _TestTodayFeed(statuses),
          ),
          hostTodayRoadmapProvider(
            scope,
          ).overrideWithValue(const HostTodayRoadmapEvidence()),
        ],
        child: MaterialApp.router(
          theme: AppTheme.light,
          routerConfig: router,
          builder: (context, child) =>
              CatchNoticeOverlay(child: child ?? const SizedBox.shrink()),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
        ),
      ),
    );
    if (statuses.value == HostTodayStatus.loading &&
        initialLocation.startsWith('/host/today/focus')) {
      await pumpUntilFound(tester, find.byType(CatchLoadingIndicator));
    } else {
      await pumpFeatureUi(tester);
    }
    return router;
  }

  testWidgets(
    'first quiet visit opens full-screen focus and close persists skip',
    (tester) async {
      final router = await mount(tester);
      expect(router.state.uri.path, '/host/today/focus');
      expect(find.byType(HostTodayFocusScreen), findsOneWidget);
      await tester.ensureVisible(
        find.byKey(const ValueKey('host-today-focus-skip')),
      );
      await tester.tap(find.byKey(const ValueKey('host-today-focus-skip')));
      await pumpFeatureUi(tester);
      expect(preferences.values[scope], const HostTodayPreference.skipped());
      expect(router.state.uri.path, '/host/today');
      await tester.tap(find.byKey(const ValueKey('host-today-change-focus')));
      await pumpFeatureUi(tester);
      expect(find.byType(HostTodayFocusScreen), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('selection returns to personalized quiet Today', (tester) async {
    final router = await mount(tester);
    await tester.tap(find.byKey(const ValueKey('host-today-focus-audience')));
    await pumpFeatureUi(tester);
    await tester.ensureVisible(
      find.byKey(const ValueKey('host-today-focus-continue')),
    );
    await tester.tap(find.byKey(const ValueKey('host-today-focus-continue')));
    await pumpFeatureUi(tester);
    expect(
      preferences.values[scope],
      const HostTodayPreference.selected(HostTodayFocus.audience),
    );
    expect(router.state.uri.path, '/host/today');
    expect(
      find.byKey(const ValueKey('host-today-suggested-action')),
      findsOneWidget,
    );
    expect(find.text('Not yet verified'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'failed focus save shows one error and leaves the choice retryable',
    (tester) async {
      preferences.failWrite = true;
      final router = await mount(tester);
      final choice = find.byKey(const ValueKey('host-today-focus-audience'));
      final continueButton = find.byKey(
        const ValueKey('host-today-focus-continue'),
      );
      await tester.tap(choice);
      await pumpFeatureUi(tester);
      await tester.ensureVisible(continueButton);
      await tester.tap(continueButton);
      await pumpFeatureUi(tester);
      expect(find.byType(CatchNotice), findsOneWidget);
      expect(router.state.uri.path, '/host/today/focus');
      expect(preferences.values, isEmpty);
      expect(tester.widget<CatchChoiceTile>(choice).selected, isTrue);
      expect(tester.widget<CatchButton>(continueButton).onPressed, isNotNull);
      preferences.failWrite = false;
      await tester.tap(continueButton);
      await pumpFeatureUi(tester);
      expect(
        preferences.values[scope],
        const HostTodayPreference.selected(HostTodayFocus.audience),
      );
      expect(router.state.uri.path, '/host/today');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('organizer presence action retains the selected organizer', (
    tester,
  ) async {
    preferences.values[scope] = const HostTodayPreference.selected(
      HostTodayFocus.organizerPresence,
    );
    final router = await mount(tester);
    await tester.tap(find.byKey(const ValueKey('host-today-suggested-action')));
    await pumpFeatureUi(tester);
    expect(router.state.uri.queryParameters['clubId'], scope.organizerId);
    expect(find.text('Organizer ${scope.organizerId}'), findsOneWidget);
  });

  testWidgets('operational uncertainty does not read or offer optional focus', (
    tester,
  ) async {
    final router = await mount(tester, status: HostTodayStatus.loading);
    expect(router.state.uri.path, '/host/today');
    expect(find.text('Operational work'), findsOneWidget);
    expect(preferences.loads, 0);
  });

  testWidgets(
    'operational work appearing closes optional focus without recording skip',
    (tester) async {
      final status = ValueNotifier(HostTodayStatus.empty);
      addTearDown(status.dispose);
      final router = await mount(tester, statusChanges: status);
      expect(find.byType(HostTodayFocusScreen), findsOneWidget);
      status.value = HostTodayStatus.loading;
      await pumpFeatureUi(tester);
      expect(router.state.uri.path, '/host/today');
      expect(find.text('Operational work'), findsOneWidget);
      expect(preferences.values, isEmpty);
    },
  );

  testWidgets('direct focus route yields to operational work', (tester) async {
    final router = await mount(
      tester,
      status: HostTodayStatus.content,
      initialLocation: '/host/today/focus?organizerId=org',
    );
    expect(router.state.uri.path, '/host/today');
    expect(find.text('Operational work'), findsOneWidget);
    expect(preferences.values, isEmpty);
  });

  testWidgets(
    'direct focus route waits for known quiet without reading preferences',
    (tester) async {
      final status = ValueNotifier(HostTodayStatus.loading);
      addTearDown(status.dispose);
      final router = await mount(
        tester,
        statusChanges: status,
        initialLocation: '/host/today/focus?organizerId=org',
      );
      expect(router.state.uri.path, '/host/today/focus');
      expect(find.byType(CatchLoadingIndicator), findsOneWidget);
      expect(preferences.loads, 0);
      expect(preferences.values, isEmpty);
      status.value = HostTodayStatus.empty;
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey('host-today-focus-skip')),
        findsOneWidget,
      );
      expect(preferences.values, isEmpty);
    },
  );

  testWidgets('direct focus route yields to a failed operational feed', (
    tester,
  ) async {
    final router = await mount(
      tester,
      status: HostTodayStatus.error,
      initialLocation: '/host/today/focus?organizerId=org',
    );
    expect(router.state.uri.path, '/host/today');
    expect(find.text('Operational work'), findsOneWidget);
    expect(preferences.loads, 0);
    expect(preferences.values, isEmpty);
  });

  testWidgets('system back persists the first-run skip', (tester) async {
    final router = await mount(tester);
    await tester.binding.handlePopRoute();
    await pumpFeatureUi(tester);
    expect(preferences.values[scope], const HostTodayPreference.skipped());
    expect(router.state.uri.path, '/host/today');
  });

  testWidgets('saved skip does not reopen focus on a later visit', (
    tester,
  ) async {
    preferences.values[scope] = const HostTodayPreference.skipped();
    final router = await mount(tester);
    expect(router.state.uri.path, '/host/today');
    expect(find.byType(HostTodayFocusScreen), findsNothing);
    expect(
      find.byKey(const ValueKey('host-today-suggested-action')),
      findsOneWidget,
    );
  });
}

class _MemoryPreferences implements HostTodayPreferenceRepository {
  final values = <HostTodayPreferenceScope, HostTodayPreference>{};
  int loads = 0;
  bool failWrite = false;
  @override
  Future<HostTodayPreference> load(HostTodayPreferenceScope scope) async {
    loads++;
    return values[scope] ?? const HostTodayPreference.unanswered();
  }

  @override
  Future<void> save(
    HostTodayPreferenceScope scope,
    HostTodayPreference preference,
  ) async {
    if (failWrite) throw StateError('Storage unavailable');
    values[scope] = preference;
  }
}

class _TestTodayFeed extends HostTodayFeedController {
  _TestTodayFeed(this.statuses);

  final ValueNotifier<HostTodayStatus> statuses;

  @override
  Future<HostTodayFeedData> build(HostTodayFeedRequest request) {
    void update() {
      state = switch (statuses.value) {
        HostTodayStatus.loading => const AsyncLoading(),
        HostTodayStatus.error => AsyncError(
          StateError('Feed unavailable'),
          StackTrace.current,
        ),
        _ => AsyncData(_data()),
      };
    }

    statuses.addListener(update);
    ref.onDispose(() => statuses.removeListener(update));
    return switch (statuses.value) {
      HostTodayStatus.loading => Completer<HostTodayFeedData>().future,
      HostTodayStatus.error => Future.error(StateError('Feed unavailable')),
      _ => Future.value(_data()),
    };
  }

  HostTodayFeedData _data() => HostTodayFeedData(
    activeEvents: [
      if (statuses.value == HostTodayStatus.content) buildEvent(clubId: 'org'),
    ],
    pastEvents: const [],
  );
}
