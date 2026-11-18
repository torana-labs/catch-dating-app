import 'package:catch_dating_app/contexts/bookings/domain/event_attendee.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_crawl_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_moving_night.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_run_state.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_body.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_controller.dart';
import 'package:catch_dating_app/hosts/live/formats/formats_sweep_state.dart';
import 'package:catch_kernel/activity_taxonomy.dart';
import 'package:catch_l10n/l10n.dart';
import 'package:catch_tokens/catch_tokens.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../../events/events_test_helpers.dart';
import 'formats_fixtures.dart';

/// Sunday 6:30 AM social run.
final _runStart = DateTime(2026, 11, 8, 6, 30);

final _runEvent = buildEvent(
  id: 'run-1',
  organizerId: 'organizer-1',
  name: 'Carter Road Social Run',
  startTime: _runStart,
  endTime: _runStart.add(const Duration(hours: 2)),
  capacityLimit: 12,
  bookedCount: 12,
  eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.socialRun),
);

const _runners = ['Dev Patel', 'Ira Kapoor', 'Sid Rao', 'Tara Menon'];

/// Everyone checked in; [back] are accounted for, returned.
List<EventAttendee> _runAttendees({Set<int> back = const {}}) => [
  for (final (index, attendee) in formatsAttendees(
    _runEvent,
    names: _runners,
  ).indexed)
    attendee.copyWith(
      checkedInAt: _runStart,
      phoneE164: index == 2 ? '+919800000002' : null,
      accountabilityResolution: back.contains(index)
          ? EventSuccessAccountabilityResolution.returned
          : null,
      accountabilityResolvedForCheckInAt: back.contains(index)
          ? _runStart
          : null,
    ),
];

EventSuccessPlan _runPlan({int step = 0, int revision = 4}) =>
    EventSuccessPlan.defaultForEvent(_runEvent, now: _runStart).copyWith(
      status: EventSuccessPlanStatus.live,
      activeStepIndex: step,
      liveControlRevision: revision,
    );

Future<void> _pump(WidgetTester tester, Widget body) async {
  tester.view.physicalSize = const Size(390, 2400);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      home: CatchRoot(
        theme: CatchThemeMode.night,
        child: CatchScreen(body: body),
      ),
    ),
  );
  await tester.pump();
}

void main() {
  group('hostMovingNightView', () {
    test('a social run gets the run console', () {
      expect(hostMovingNightView(_runEvent), HostMovingNightView.run);
    });

    test('a crawl gets the crawl board', () {
      expect(hostMovingNightView(crawlEvent), HostMovingNightView.crawl);
    });

    test('a night in one room gets neither', () {
      expect(hostMovingNightView(courtsEvent), isNull);
    });

    test('a saved room layout keeps the old console', () {
      final plan = _runPlan().copyWith(
        layoutId: 'layout-1',
        structureConfig: const EventSuccessStructureConfig(
          unitKind: EventSuccessUnitKind.tables,
          unitSize: 6,
          topology: EventSuccessTopology.sequence,
          resourceCapacity: EventSuccessResourceCapacity(
            concurrentUnits: 4,
            resourceLabelId: EventSuccessResourceLabelId.table,
            seatsPerUnit: 6,
          ),
        ),
      );
      expect(hostMovingNightView(_runEvent, plan: plan), isNull);
    });
  });

  group('hostFormatsSweepState', () {
    test('lists who is checked in and not accounted for, by name', () {
      final state = hostFormatsSweepState(
        event: _runEvent,
        attendees: _runAttendees(back: {0, 1}),
        plan: _runPlan(),
      );
      expect(state.kind, HostFormatsSweepKind.run);
      expect(state.checkedIn, 4);
      expect(state.accounted, 2);
      expect(state.out.map((p) => p.name), ['Sid Rao', 'Tara Menon']);
      expect(state.out.first.phone, '+919800000002');
      expect(state.out.last.phone, isNull);
      expect(state.liveControlRevision, 4);
      expect(state.finished, isFalse);
    });

    test('a guest checked in again is out until marked again', () {
      final attendees = _runAttendees(back: {0})
          .map(
            (a) => a.id == 'attendee-0'
                ? a.copyWith(
                    checkedInAt: _runStart.add(const Duration(minutes: 30)),
                  )
                : a,
          )
          .toList();
      final state = hostFormatsSweepState(
        event: _runEvent,
        attendees: attendees,
      );
      expect(state.out.map((p) => p.name), contains('Dev Patel'));
    });

    test('a crawl goes home and keeps arrival groups', () {
      final state = hostFormatsSweepState(
        event: crawlEvent,
        attendees: crawlAttendees(),
      );
      expect(state.kind, HostFormatsSweepKind.crawl);
      expect(state.checkedIn, 10);
      expect(state.out.first.group, isNotNull);
    });

    test('a complete plan reads as finished', () {
      final state = hostFormatsSweepState(
        event: _runEvent,
        attendees: _runAttendees(),
        plan: _runPlan().copyWith(status: EventSuccessPlanStatus.complete),
      );
      expect(state.finished, isTrue);
    });
  });

  group('hostFormatsRunState', () {
    test('takes the step on now and counts the runners back', () {
      final plan = _runPlan(step: 1);
      final state = hostFormatsRunState(
        event: _runEvent,
        plan: plan,
        sweep: hostFormatsSweepState(
          event: _runEvent,
          attendees: _runAttendees(back: {0}),
          plan: plan,
        ),
        runners: _runAttendees(back: {0}),
        memberships: const {},
      );
      expect(state.status, HostFormatsRunStatus.running);
      expect(state.stepIndex, 1);
      expect(state.stepCount, greaterThan(1));
      expect(state.stepTitle, isNotNull);
      expect(state.sweep.accounted, 1);
      // Memberships not read yet: the pods may still fill.
      expect(state.checking, isTrue);
    });
  });

  group('run console', () {
    HostFormatsRunState run({Set<int> back = const {}, int step = 0}) {
      final plan = _runPlan(step: step);
      final attendees = _runAttendees(back: back);
      return hostFormatsRunState(
        event: _runEvent,
        plan: plan,
        sweep: hostFormatsSweepState(
          event: _runEvent,
          attendees: attendees,
          plan: plan,
        ),
        runners: attendees,
        memberships: const {},
      );
    }

    testWidgets('before anyone is back, says everyone is out', (tester) async {
      await _pump(
        tester,
        HostFormatsRunBody(
          state: run(),
          now: _runStart,
          onAccounted: (_) {},
          onCall: (_) {},
          onClose: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('0 of 4 runners back'), findsOneWidget);
      expect(
        find.text(
          'Everyone is out on the route. Mark runners back as they reach the start.',
        ),
        findsOneWidget,
      );
      expect(find.text('Close the route'), findsOneWidget);
    });

    testWidgets('lists who is still out with Back and Call', (tester) async {
      final marked = <String>[];
      final called = <String>[];
      var closed = 0;
      await _pump(
        tester,
        HostFormatsRunBody(
          state: run(back: {0, 1}),
          now: _runStart,
          onAccounted: (person) => marked.add(person.name),
          onCall: called.add,
          onClose: () => closed++,
          onRetry: () {},
        ),
      );
      expect(find.text('2 of 4 runners back'), findsOneWidget);
      expect(find.text('Still out: 2'), findsOneWidget);
      expect(find.text('Sid Rao'), findsOneWidget);
      await tester.tap(
        find.byKey(const ValueKey('formats-out-mark-attendee-2')),
      );
      await tester.tap(
        find.byKey(const ValueKey('formats-out-call-attendee-2')),
      );
      expect(
        find.byKey(const ValueKey('formats-out-call-attendee-3')),
        findsNothing,
      );
      await tester.tap(find.byKey(const ValueKey('formats-run-close')));
      expect(marked, ['Sid Rao']);
      expect(called, ['+919800000002']);
      expect(closed, 1);
    });

    testWidgets('once everyone is back, offers to close the route', (
      tester,
    ) async {
      await _pump(
        tester,
        HostFormatsRunBody(
          state: run(back: {0, 1, 2, 3}),
          now: _runStart,
          onAccounted: (_) {},
          onCall: (_) {},
          onClose: () {},
          onRetry: () {},
        ),
      );
      expect(find.text('Everyone’s back · close the route'), findsOneWidget);
      expect(find.text('Everyone is accounted for.'), findsOneWidget);
    });
  });

  group('return sweep', () {
    testWidgets('a crawl counts guests home and marks them Home', (
      tester,
    ) async {
      final marked = <String>[];
      await _pump(
        tester,
        HostFormatsSweepBody(
          state: hostFormatsSweepState(
            event: crawlEvent,
            attendees: crawlAttendees(),
          ),
          onAccounted: (person) => marked.add(person.name),
          onCall: (_) {},
          onRetry: () {},
        ),
      );
      expect(find.text('0 home'), findsOneWidget);
      expect(find.text('of 10 · 10 still out'), findsOneWidget);
      expect(find.text('Still out'), findsOneWidget);
      await tester.tap(
        find.byKey(const ValueKey('formats-out-mark-attendee-0')),
      );
      expect(marked, ['Meher Shah']);
      expect(find.text('Home'), findsWidgets);
    });

    testWidgets('a run counts runners back', (tester) async {
      await _pump(
        tester,
        HostFormatsSweepBody(
          state: hostFormatsSweepState(
            event: _runEvent,
            attendees: _runAttendees(back: {0, 1, 2}),
          ),
          onAccounted: (_) {},
          onCall: (_) {},
          onRetry: () {},
        ),
      );
      expect(find.text('3 back'), findsOneWidget);
      expect(find.text('of 4 · 1 still out'), findsOneWidget);
    });
  });

  testWidgets('the crawl board opens the return sweep', (tester) async {
    var swept = 0;
    await _pump(
      tester,
      HostFormatsCrawlBody(
        state: hostFormatsCrawlState(
          event: crawlEvent,
          host: 'Lantern Lane',
          attendees: crawlAttendees(),
        ),
        now: crawlNow,
        onMove: () {},
        onMessage: () {},
        onRetry: () {},
        onSweep: () => swept++,
      ),
    );
    await tester.ensureVisible(
      find.byKey(const ValueKey('formats-crawl-sweep')),
    );
    await tester.tap(find.byKey(const ValueKey('formats-crawl-sweep')));
    expect(swept, 1);
  });

  testWidgets('a run without a plan still opens the door and the sweep', (
    tester,
  ) async {
    var guests = 0;
    var closed = 0;
    await _pump(
      tester,
      HostFormatsRunBody(
        state: const HostFormatsRunState(status: HostFormatsRunStatus.noPlan),
        now: _runStart,
        onAccounted: (_) {},
        onCall: (_) {},
        onClose: () => closed++,
        onRetry: () {},
        onGuests: () => guests++,
      ),
    );

    await tester.tap(find.byKey(const ValueKey('formats-run-guests')));
    await tester.tap(find.byKey(const ValueKey('formats-run-close')));
    expect(guests, 1);
    expect(closed, 1);
  });
}
