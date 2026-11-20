import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_standings.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_platform/theme/app_theme.dart';
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
}

EventSuccessStandings _standings(DateTime now) => EventSuccessStandings(
  id: 'event-1',
  eventId: 'event-1',
  organizerId: 'club-1',
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
