import 'package:catch_dating_app/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_test_support/design_fixtures/event_success_companion_fixtures.dart';
import 'package:flutter/material.dart';

class LiveRevealCoverageStates extends StatelessWidget {
  const LiveRevealCoverageStates({super.key});

  @override
  Widget build(BuildContext context) {
    final event = EventSuccessCompanionFixtures.racketEvent;
    final now = EventSuccessCompanionFixtures.racketStart.subtract(
      const Duration(seconds: 1),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EventSuccessAttendeeRevealSurface(
          event: event,
          plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
          kind: EventSuccessRevealAssignmentKind.rotations,
          assignment: EventSuccessCompanionFixtures.rotationAssignment,
          peerProfiles: const [EventSuccessCompanionFixtures.peer],
          peersLoading: false,
          optedOut: false,
          onIncludeChanged: (_) {},
          now: now,
        ),
      ],
    );
  }
}
