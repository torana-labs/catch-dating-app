import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' show buildEvent;

void main() {
  testWidgets('standings reuse the assignment reveal visibility gate', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final event = buildEvent();
    final now = event.startTime;
    final basePlan = EventSuccessPlan.defaultForEvent(event, now: now);
    final standings = _standings(now);

    Future<void> pump(EventSuccessPlan plan) => tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: EventSuccessAttendeeRevealSurface(
              event: event,
              plan: plan,
              kind: EventSuccessRevealAssignmentKind.standings,
              assignment: null,
              standings: standings,
              peerProfiles: const [],
              peersLoading: false,
              optedOut: false,
              now: now,
            ),
          ),
        ),
      ),
    );

    await pump(
      basePlan.copyWith(
        revealStatus: EventSuccessRevealStatus.countingDown,
        activeRevealRoundIndex: 0,
        revealStartedAt: now.subtract(const Duration(seconds: 1)),
      ),
    );
    expect(find.text('Team A'), findsNothing);
    expect(find.textContaining('table unlocks'), findsOneWidget);

    await pump(
      basePlan.copyWith(
        revealStatus: EventSuccessRevealStatus.revealed,
        activeRevealRoundIndex: 0,
        publishedRevealRoundIndex: 0,
      ),
    );
    expect(find.text('Team A'), findsOneWidget);
    expect(find.text('9 pts'), findsOneWidget);
    expect(find.text('Skip rotations'), findsNothing);
    expect(find.text('Skip micro-pods'), findsNothing);
  });

  testWidgets('Host records a complete score round inside the reveal card', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(800, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final event = buildEvent(
      eventFormat: EventFormatSnapshot.fromActivityKind(ActivityKind.pubQuiz),
    );
    final plan = EventSuccessPlan.defaultForEvent(event, now: event.startTime);
    List<EventSuccessUnitOutcomeEntryInput>? recorded;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: EventSuccessHostRevealSurface(
              event: event,
              plan: plan,
              podAssignments: const [],
              rotationAssignments: const [],
              preferences: const [],
              outcomeUnits: const [
                EventSuccessOutcomeUnit(id: 'team-a', label: 'Team A'),
                EventSuccessOutcomeUnit(id: 'team-b', label: 'Team B'),
              ],
              now: event.startTime,
              onRecordOutcomes:
                  ({
                    required expectedRevision,
                    required roundIndex,
                    required entries,
                  }) async {
                    expect(expectedRevision, 0);
                    expect(roundIndex, 0);
                    recorded = entries;
                  },
            ),
          ),
        ),
      ),
    );

    for (final value in {'team-a': '9', 'team-b': '7'}.entries) {
      final field = find.descendant(
        of: find.byKey(ValueKey('event_success.outcome.0.${value.key}')),
        matching: find.byType(EditableText),
      );
      await tester.enterText(field, value.value);
      expect(tester.widget<EditableText>(field).controller.text, value.value);
    }
    await tester.pump();
    final saveButton = find.text('Save round for reveal');
    await tester.ensureVisible(saveButton);
    final button = tester.widget<CatchButton>(
      find.widgetWithText(CatchButton, 'Save round for reveal'),
    );
    expect(button.onPressed, isNotNull);
    button.onPressed!();
    await tester.pump();

    expect(recorded, hasLength(2));
    expect(recorded?.first, isA<EventSuccessScoreOutcomeInput>());
    expect(recorded?.map((entry) => entry.toJson()).toList(), [
      {'unitId': 'team-a', 'unitLabel': 'Team A', 'score': 9},
      {'unitId': 'team-b', 'unitLabel': 'Team B', 'score': 7},
    ]);
    expect(find.text('Reveal now'), findsNothing);
  });
}

EventSuccessStandings _standings(DateTime now) => EventSuccessStandings(
  id: 'event-1',
  eventId: 'event-1',
  clubId: 'club-1',
  unitOutcome: EventSuccessUnitOutcome.score,
  revision: 1,
  latestRoundIndex: 0,
  rounds: const [
    EventSuccessStandingRound(
      roundIndex: 0,
      entries: [
        EventSuccessStandingEntry(
          unitId: 'team-a',
          unitLabel: 'Team A',
          position: 1,
          value: 9,
          roundsRecorded: 1,
        ),
      ],
    ),
  ],
  entries: const [
    EventSuccessStandingEntry(
      unitId: 'team-a',
      unitLabel: 'Team A',
      position: 1,
      value: 9,
      roundsRecorded: 1,
    ),
  ],
  createdAt: now,
  updatedAt: now,
);
