import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/events/domain/event_draft.dart';
import 'package:catch_dating_app/contexts/organizers/data/organizers_repository.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_event_entry_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_screen.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/events/presentation/widgets/host_events_list.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:catch_dating_app/routing/go_router.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import '../events/events_test_helpers.dart' show buildEvent;
import '../organizers/organizers_test_helpers.dart' show buildOrganizer;
import '../test_pump_helpers.dart';

typedef _EventPage = CursorPage<Event, DocumentSnapshot<Event>>;

const _actor = 'actor-a';
const _organizerId = 'org-a';
final _now = DateTime(2026, 6, 15, 12);
final _organizer = buildOrganizer(id: _organizerId, ownerUserId: _actor);
final _draft = EventDraft(
  id: 'draft-1',
  organizerId: _organizerId,
  savedAt: DateTime(2026, 6, 14, 10),
  customActivityLabel: 'Quiz night',
);

void main() {
  testWidgets('create and Back re-reads the retained list with the new event', (
    tester,
  ) async {
    final fixture = _Fixture();
    await fixture.mount(tester);
    final original = fixture.scaffold(tester);
    expect(find.text('Rooftop supper club'), findsNothing);

    await tester.tap(
      find.byKey(const ValueKey<String>('host-events-create-event')),
    );
    await pumpFeatureUi(tester);
    await tester.tap(
      find.byKey(const ValueKey<String>('host-event-entry-createEvent')),
    );
    await pumpFeatureUi(tester);
    expect(fixture.router.state.name, Routes.hostCreateEventScreen.name);
    expect(find.text('Create destination'), findsOneWidget);
    fixture.setups.upcoming.add(_setup('new-private', 'Rooftop supper club'));

    fixture.router.pop();
    await pumpFeatureUi(tester);
    fixture.expectRetained(tester, original);
    expect(fixture.events.activeReads, 2);
    expect(fixture.setups.upcomingReads, 2);
    expect(
      find.byKey(const ValueKey('host-event-row-new-private')),
      findsOneWidget,
    );
    expect(find.text('Rooftop supper club'), findsOneWidget);
  });

  for (final (label, selection, destination) in [
    (
      'resume draft',
      HostEventEntrySelection.resume(_draft),
      Routes.hostCreateEventScreen,
    ),
    (
      'resume private event',
      const HostEventEntrySelection.saved('saved-private'),
      Routes.hostCreateEventScreen,
    ),
    (
      'repeat last event',
      const HostEventEntrySelection.start(HostEventEntryIntent.repeatLastEvent),
      Routes.hostCreateEventScreen,
    ),
    (
      'create program',
      const HostEventEntrySelection.start(HostEventEntryIntent.createProgram),
      Routes.hostCreateProgramScreen,
    ),
  ]) {
    testWidgets('$label return re-reads the retained list', (tester) async {
      final fixture = _Fixture();
      await fixture.mount(tester);
      final original = fixture.scaffold(tester);
      final section = tester.widget<HostEventsOrganizerSection>(
        find.byType(HostEventsOrganizerSection),
      );
      expect(section.entryState.repeatSource?.id, 'past-event');

      section.onEventEntrySelected(_organizer, section.entryState, selection);
      await pumpFeatureUi(tester);
      expect(fixture.router.state.name, destination.name);
      expect(fixture.events.activeReads, 1);
      fixture.events.active.add(
        buildEvent(
          id: 'new-published',
          organizerId: _organizerId,
          name: 'Harbour sunrise run',
          startTime: _now.add(const Duration(days: 3)),
        ),
      );

      fixture.router.pop();
      await pumpFeatureUi(tester);
      fixture.expectRetained(tester, original);
      expect(fixture.events.activeReads, 2);
      expect(fixture.setups.upcomingReads, 2);
      expect(
        find.byKey(const ValueKey('host-event-row-new-published')),
        findsOneWidget,
      );
    });
  }

  testWidgets('tab return re-reads the retained list', (tester) async {
    final fixture = _Fixture();
    await fixture.mount(tester);
    final original = fixture.scaffold(tester);

    fixture.navigation.goBranch(1);
    await pumpFeatureUi(tester);
    expect(find.text('Other tab'), findsOneWidget);
    fixture.setups.upcoming.add(_setup('elsewhere', 'Created on Today'));
    fixture.navigation.goBranch(0);
    await pumpFeatureUi(tester);
    fixture.expectRetained(tester, original);
    expect(fixture.setups.upcomingReads, 2);
    expect(find.text('Created on Today'), findsOneWidget);
  });

  testWidgets(
    'dismissed entry, clock ticks and same-route updates keep reads',
    (tester) async {
      final fixture = _Fixture();
      await fixture.mount(tester);
      final original = fixture.scaffold(tester);

      await tester.tap(
        find.byKey(const ValueKey<String>('host-events-create-event')),
      );
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey<String>('host-event-entry-sheet')),
        findsOneWidget,
      );
      await tester.tapAt(const Offset(8, 8));
      await pumpFeatureUi(tester);
      expect(
        find.byKey(const ValueKey<String>('host-event-entry-sheet')),
        findsNothing,
      );
      fixture.router.goNamed(
        Routes.hostEventsScreen.name,
        queryParameters: {'organizerId': _organizerId},
      );
      await pumpFeatureUi(tester);
      await pumpFeatureUiFor(tester, const Duration(minutes: 2));
      await pumpFeatureUi(tester);

      fixture.expectRetained(tester, original);
      expect(fixture.events.activeReads, 1);
      expect(fixture.setups.upcomingReads, 1);
    },
  );
}

PrivateEventSetupInventoryItem _setup(String id, String name) =>
    PrivateEventSetupInventoryItem(
      eventId: id,
      name: name,
      city: const EventSetupCity(
        cityId: 'in-mh-mumbai',
        marketId: 'in-mh-mumbai',
      ),
      localDate: '2026-07-01',
      localStartTime: '19:00',
      timezone: 'Asia/Kolkata',
      startTimeMillis: DateTime(2026, 7, 1, 19).millisecondsSinceEpoch,
      setupRevision: 1,
      detailsConfigured: false,
    );

class _Fixture {
  final events = _Events();
  final setups = _Setups();
  late GoRouter router;
  late StatefulNavigationShell navigation;

  Future<void> mount(WidgetTester tester) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(400, 900);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPhysicalSize);
    // The real Events screen in an indexed-stack branch. Pushed destinations
    // are sentinels that cover the branch, as compact Host destinations do.
    router = GoRouter(
      initialLocation: Routes.hostEventsScreen.path,
      routes: [
        StatefulShellRoute.indexedStack(
          builder: (_, _, shell) {
            navigation = shell;
            return Scaffold(body: shell);
          },
          branches: [
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: Routes.hostEventsScreen.path,
                  name: Routes.hostEventsScreen.name,
                  builder: (_, _) => HostEventsScreen(now: _now),
                ),
              ],
            ),
            StatefulShellBranch(
              routes: [
                GoRoute(
                  path: Routes.hostTodayScreen.path,
                  name: Routes.hostTodayScreen.name,
                  builder: (_, _) => const Material(child: Text('Other tab')),
                ),
              ],
            ),
          ],
        ),
        for (final destination in [
          (Routes.hostCreateEventScreen, 'Create destination'),
          (Routes.hostCreateProgramScreen, 'Program destination'),
        ])
          GoRoute(
            path: destination.$1.path,
            name: destination.$1.name,
            builder: (_, _) => Material(child: Text(destination.$2)),
          ),
      ],
    );
    addTearDown(() async {
      await tester.pumpWidget(const SizedBox.shrink());
      router.dispose();
    });
    await tester.pumpWidget(
      ProviderScope(
        retry: (_, _) => null,
        overrides: [
          uidProvider.overrideWithValue(const AsyncData(_actor)),
          hostOperableOrganizersProvider(
            _actor,
          ).overrideWithValue(AsyncData([_organizer])),
          eventRepositoryProvider.overrideWithValue(events),
          privateEventSetupTimelineRepositoryProvider.overrideWithValue(setups),
          organizerEventDraftsProvider(
            organizerId: _organizerId,
          ).overrideWith((_) async => [_draft]),
          programEventsControllerProvider.overrideWith((ref, _) {
            final controller = ProgramEventsController(
              isActorCurrent: () => true,
              fetchPage: ({cursor, programId}) async =>
                  const OrganizerProgramInventoryPage(programs: []),
              mutate: (_, _) async => throw StateError('Read only'),
              onMutation: (_) {},
            );
            ref.onDispose(controller.dispose);
            unawaited(controller.refresh());
            return controller;
          }),
        ],
        child: MaterialApp.router(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: catchNoticeOverlayBuilder,
          routerConfig: router,
        ),
      ),
    );
    await pumpFeatureUi(tester);
    expect(find.byType(HostEventsOrganizerCard), findsOneWidget);
    expect(events.activeReads, 1);
    expect(setups.upcomingReads, 1);
    expect(tester.takeException(), isNull);
  }

  State scaffold(WidgetTester tester) =>
      tester.state(find.byType(HostEventsRouteScaffold, skipOffstage: false));

  void expectRetained(WidgetTester tester, State original) {
    expect(scaffold(tester), same(original));
    expect(tester.takeException(), isNull);
  }
}

class _Events extends Fake implements EventRepository {
  final active = <Event>[];
  var activeReads = 0;

  @override
  Future<_EventPage> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) async {
    activeReads += 1;
    return _EventPage(items: List.of(active), hasMore: false);
  }

  @override
  Future<_EventPage> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) async => _EventPage(
    items: [
      buildEvent(
        id: 'past-event',
        organizerId: organizerId,
        startTime: _now.subtract(const Duration(days: 5)),
        endTime: _now.subtract(const Duration(days: 5, hours: -2)),
      ),
    ],
    hasMore: false,
  );

  @override
  Future<_EventPage> fetchCancelledEventsPage({
    required String organizerId,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) async => const _EventPage(items: [], hasMore: false);
}

class _Setups extends Fake implements PrivateEventSetupRepository {
  final upcoming = <PrivateEventSetupInventoryItem>[];
  var upcomingReads = 0;

  @override
  Future<PrivateEventSetupInventoryPage> list({
    required String organizerId,
    PrivateEventSetupScope? scope,
    int limit = ReadLimitPolicy.privateEventSetupPage,
    String? cursor,
  }) async {
    if (scope != PrivateEventSetupScope.upcoming) {
      return const PrivateEventSetupInventoryPage(events: [], nextCursor: null);
    }
    upcomingReads += 1;
    return PrivateEventSetupInventoryPage(
      events: List.of(upcoming),
      nextCursor: null,
    );
  }
}
