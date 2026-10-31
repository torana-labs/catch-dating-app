import 'dart:async';

import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_draft_repository.dart';
import 'package:catch_dating_app/contexts/events/data/event_repository.dart';
import 'package:catch_dating_app/contexts/events/data/private_event_setup_repository.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/programmes/domain/program_models.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_state.dart';
import 'package:catch_dating_app/hosts/events/presentation/host_events_timeline_controller.dart';
import 'package:catch_dating_app/hosts/events/presentation/widgets/host_events_list.dart';
import 'package:catch_dating_app/l10n/l10n.dart';
import 'package:catch_dating_app/platform/firebase/cursor_page.dart';
import 'package:catch_dating_app/platform/firebase/read_limit_policy.dart';
import 'package:catch_dating_app/platform/riverpod_ui/catch_localized_sliver_error_state.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_dating_app/programs/presentation/program_events_controller.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:riverpod/misc.dart' show Override;

import '../organizers/organizers_test_helpers.dart';
import '../test_pump_helpers.dart';

typedef _Page = CursorPage<Event, DocumentSnapshot<Event>>;
final _now = DateTime(2026, 9, 4, 12);

void main() {
  setUpAll(() => initializeDateFormatting('en'));

  testWidgets('Upcoming renders while all four history reads remain pending', (
    tester,
  ) async {
    final reads = _Reads('upcoming');
    final harness = _Harness([reads]);
    await harness.pump(tester);
    expect(harness.repository.reads, 3);
    expect(harness.setups.reads, 3);
    reads.completeUpcoming();
    await _publish(tester);
    expect(
      find.byKey(const ValueKey('host-event-row-upcoming')),
      findsOneWidget,
    );
    final section = tester.widget<HostEventsOrganizerSection>(
      find.byType(HostEventsOrganizerSection),
    );
    expect(section.state.loadingMorePast, isTrue);
    expect(section.state.status, HostEventsWorkspaceStatus.populated);
    await tester.tap(find.text('Past').hitTestable());
    await tester.pump();
    // Advance the tab transition without waiting for the continuously animated
    // history skeleton to settle.
    await pumpFeatureUiFor(tester, const Duration(milliseconds: 400));
    expect(find.text('No past events yet'), findsNothing);
    expect(find.byType(CatchLocalizedSliverErrorState), findsNothing);
    reads.completeHistory();
    await _publish(tester);
    expect(find.text('No past events yet'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  for (final scope in [
    PrivateEventSetupScope.past,
    PrivateEventSetupScope.cancelled,
  ]) {
    for (final beforeUpcoming in [false, true]) {
      testWidgets(
        'private $scope failure is terminal beforeUpcoming=$beforeUpcoming',
        (tester) async {
          final reads = _Reads('upcoming');
          final harness = _Harness([reads]);
          await harness.pump(tester);
          if (beforeUpcoming) reads.completeHistory(failingScope: scope);
          reads.completeUpcoming();
          await _publish(tester);
          if (!beforeUpcoming) {
            expect(
              find.byKey(const ValueKey('host-event-row-upcoming')),
              findsOneWidget,
            );
            reads.completeHistory(failingScope: scope);
            await _publish(tester);
          }
          final section = tester.widget<HostEventsOrganizerSection>(
            find.byType(HostEventsOrganizerSection),
          );
          expect(section.state.status, HostEventsWorkspaceStatus.error);
          expect(section.state.error, same(reads.error));
          expect(
            find.byKey(const ValueKey('host-event-row-upcoming')),
            findsNothing,
          );
          expect(find.byType(CatchLocalizedSliverErrorState), findsWidgets);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }

  for (final signout in [false, true]) {
    testWidgets(
      'session switch hides previous rows immediately; signout=$signout',
      (tester) async {
        final old = _Reads('old');
        final fresh = _Reads('fresh');
        final harness = _Harness([old, fresh]);
        await harness.pump(tester);
        old.completeUpcoming();
        await _publish(tester);
        expect(
          find.byKey(const ValueKey('host-event-row-old')),
          findsOneWidget,
        );
        harness.container.updateOverrides(
          harness.overrides(signout ? null : 'account-b'),
        );
        await _publish(tester);
        expect(find.byKey(const ValueKey('host-event-row-old')), findsNothing);
        if (signout) {
          expect(harness.repository.reads, 3);
          harness.container.updateOverrides(harness.overrides('account-a'));
          await _publish(tester);
        }
        // Old background failure must not turn the new family's loading into
        // an error, including sign-out followed by the same UID signing in.
        old.completeHistory(failingScope: PrivateEventSetupScope.past);
        await _publish(tester);
        expect(find.byType(CatchLocalizedSliverErrorState), findsNothing);
        fresh.completeUpcoming();
        fresh.completeHistory();
        await _publish(tester);
        expect(
          find.byKey(const ValueKey('host-event-row-fresh')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('host-event-row-old')), findsNothing);
        expect(harness.setups.reads, 6);
        expect(tester.takeException(), isNull);
      },
    );
  }
}

Future<void> _publish(WidgetTester tester) async {
  await tester.pump();
  await tester.pump();
}

class _Harness {
  _Harness(List<_Reads> reads)
    : repository = _Repository(reads),
      setups = _Setups(reads) {
    container = ProviderContainer(overrides: overrides('account-a'));
    addTearDown(container.dispose);
  }
  final _Repository repository;
  final _Setups setups;
  late final ProviderContainer container;

  List<Override> overrides(String? uid) => [
    uidProvider.overrideWithValue(AsyncData(uid)),
    eventRepositoryProvider.overrideWithValue(repository),
    privateEventSetupTimelineRepositoryProvider.overrideWithValue(setups),
    organizerEventDraftsProvider.overrideWith((ref, organizerId) async => []),
    programEventsControllerProvider.overrideWith((ref, request) {
      final controller = ProgramEventsController(
        isActorCurrent: () => true,
        fetchPage: ({cursor, programId}) async =>
            const OrganizerProgramInventoryPage(programs: []),
        mutate: (_, _) async => throw UnimplementedError(),
        onMutation: (_) {},
      );
      ref.onDispose(controller.dispose);
      unawaited(controller.refresh());
      return controller;
    }),
  ];

  Future<void> pump(WidgetTester tester) async {
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          theme: AppTheme.light,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          home: HostEventsOrganizerCard(
            organizer: buildOrganizer(),
            now: _now,
            sessionBoundary: _now,
            onEventEntrySelected: (_, _, _) {},
            onManageEvent: (_, _) {},
          ),
        ),
      ),
    );
    await _publish(tester);
  }
}

class _Reads {
  _Reads(this.id);
  final String id;
  final error = StateError('private inventory unavailable');
  final active = Completer<_Page>();
  final past = Completer<_Page>();
  final cancelled = Completer<_Page>();
  final private = {
    for (final scope in PrivateEventSetupScope.values)
      scope: Completer<PrivateEventSetupInventoryPage>(),
  };
  void completeUpcoming() {
    active.complete(
      _Page(
        items: [
          buildEvent(
            id: id,
            startTime: _now.add(const Duration(hours: 1)),
            endTime: _now.add(const Duration(hours: 2)),
          ),
        ],
        hasMore: false,
      ),
    );
    private[PrivateEventSetupScope.upcoming]!.complete(
      const PrivateEventSetupInventoryPage(events: [], nextCursor: null),
    );
  }

  void completeHistory({PrivateEventSetupScope? failingScope}) {
    past.complete(const _Page(items: [], hasMore: false));
    cancelled.complete(const _Page(items: [], hasMore: false));
    for (final scope in [
      PrivateEventSetupScope.past,
      PrivateEventSetupScope.cancelled,
    ]) {
      if (scope == failingScope) {
        private[scope]!.completeError(error, StackTrace.current);
      } else {
        private[scope]!.complete(
          const PrivateEventSetupInventoryPage(events: [], nextCursor: null),
        );
      }
    }
  }
}

class _Repository extends Fake implements EventRepository {
  _Repository(List<_Reads> reads)
    : active = [for (final read in reads) read.active.future],
      past = [for (final read in reads) read.past.future],
      cancelled = [for (final read in reads) read.cancelled.future];
  final List<Future<_Page>> active;
  final List<Future<_Page>> past;
  final List<Future<_Page>> cancelled;
  int reads = 0;
  @override
  Future<_Page> fetchActiveEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    reads++;
    return active.removeAt(0);
  }

  @override
  Future<_Page> fetchPastEventsPage({
    required String organizerId,
    required DateTime sessionBoundary,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    reads++;
    return past.removeAt(0);
  }

  @override
  Future<_Page> fetchCancelledEventsPage({
    required String organizerId,
    DocumentSnapshot<Event>? startAfter,
    int limit = ReadLimitPolicy.directoryPage,
  }) {
    reads++;
    return cancelled.removeAt(0);
  }
}

class _Setups extends Fake implements PrivateEventSetupRepository {
  _Setups(List<_Reads> reads)
    : pages = {
        for (final scope in PrivateEventSetupScope.values)
          scope: [for (final read in reads) read.private[scope]!.future],
      };
  final Map<
    PrivateEventSetupScope,
    List<Future<PrivateEventSetupInventoryPage>>
  >
  pages;
  int reads = 0;
  @override
  Future<PrivateEventSetupInventoryPage> list({
    required String organizerId,
    PrivateEventSetupScope? scope,
    int limit = ReadLimitPolicy.privateEventSetupPage,
    String? cursor,
  }) {
    reads++;
    return pages[scope]!.removeAt(0);
  }
}
