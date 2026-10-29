import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/event_success/presentation/assignments/event_success_host_rotation_section.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_surface.dart';
import 'package:catch_dating_app/platform/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../events/events_test_helpers.dart' show buildEvent;
import '../test_pump_helpers.dart';

void main() {
  testWidgets(
    'reveal requires confirmation and published reveal has no reset',
    (tester) async {
      final event = buildEvent();
      final now = event.startTime;
      final plan = EventSuccessPlan.defaultForEvent(event, now: now).copyWith(
        selectedModuleIds: const ['guided_rotations', 'live_reveal'],
        status: EventSuccessPlanStatus.live,
      );
      final assignment = _rotationAssignment(now);
      var revealCalls = 0;

      Future<void> pump(EventSuccessPlan value) => tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light,
          home: Scaffold(
            body: EventSuccessHostRevealSurface(
              event: event,
              plan: value,
              podAssignments: const [],
              rotationAssignments: [assignment],
              preferences: const [],
              now: now,
              onRevealRound: (_) async => revealCalls += 1,
            ),
          ),
        ),
      );

      await pump(plan);
      await tester.tap(find.text('Reveal now'));
      await pumpFeatureUi(tester);

      expect(find.text('Publish this reveal?'), findsOneWidget);
      expect(revealCalls, 0);
      await tester.tap(find.text('Publish reveal'));
      await pumpFeatureUi(tester);
      expect(revealCalls, 1);

      await pump(
        plan.copyWith(
          revealStatus: EventSuccessRevealStatus.revealed,
          activeRevealRoundIndex: 0,
          publishedRevealRoundIndex: 0,
        ),
      );
      expect(find.text('Reset reveal'), findsNothing);
      expect(find.text('Reset'), findsNothing);
    },
  );

  testWidgets('rotation publish requires confirmation', (tester) async {
    final event = buildEvent();
    final assignment = _rotationAssignment(event.startTime);
    var publishedRound = -1;

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light,
        home: Scaffold(
          body: SingleChildScrollView(
            child: EventSuccessHostRotationSection(
              event: event,
              rotationIntervalMinutes: 15,
              assignments: [assignment],
              participantProfiles: const [],
              preferences: const [],
              actionState: const EventSuccessAssignmentGenerationActionState(),
              nextRoundIndex: 0,
              onPublish: (roundIndex) async => publishedRound = roundIndex,
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Publish round 1'));
    await pumpFeatureUi(tester);
    expect(find.text('Publish this rotation?'), findsOneWidget);
    expect(publishedRound, -1);

    await tester.tap(find.text('Publish rotation'));
    await pumpFeatureUi(tester);
    expect(publishedRound, 0);
  });
}

EventSuccessAssignment _rotationAssignment(DateTime startsAt) {
  return EventSuccessAssignment(
    id: 'event-1_guided_rotations_runner-1',
    eventId: 'event-1',
    clubId: 'club-1',
    uid: 'runner-1',
    moduleId: 'guided_rotations',
    label: 'Guided rotations',
    displayTitle: '1 guided rotation',
    peerUids: const ['runner-2'],
    rotationSlots: [
      EventSuccessRotationSlot(
        roundIndex: 0,
        label: 'Round 1',
        startsAt: startsAt,
        endsAt: startsAt.add(const Duration(minutes: 15)),
        peerUid: 'runner-2',
        compatibility: 'social',
      ),
    ],
    source: 'server_v1',
    createdAt: startsAt,
    updatedAt: startsAt,
  );
}
