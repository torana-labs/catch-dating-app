import 'package:catch_dating_app/contexts/bookings/domain/event_participation_roster.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_host_workspace_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/host_components/event_success_host_section_loading_page_body.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_attendee_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_host_reveal_surface.dart';
import 'package:catch_dating_app/event_success/presentation/reveal/event_success_reveal_assignment_kind.dart';
import 'package:catch_ui/catch_ui.dart';
import 'package:flutter/material.dart';

class HostCoverageStates extends StatelessWidget {
  const HostCoverageStates({super.key});

  @override
  Widget build(BuildContext context) {
    final event = EventSuccessCompanionFixtures.socialEvent;
    final plan = EventSuccessCompanionFixtures.revealUnlockedPlan;
    final roster = EventParticipationRoster.fromParticipations([
      EventSuccessCompanionFixtures.attendedParticipation(),
    ]);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EventSuccessHostSectionLoadingPageBody(),
        gapH16,
        for (final tab in EventSuccessHostTab.values) ...[
          EventSuccessHostWorkspacePageBody(
            event: event,
            plan: plan,
            planIsPersisted: true,
            roster: roster,
            assignments: [
              EventSuccessCompanionFixtures.microPodAssignment,
              EventSuccessCompanionFixtures.tableAssignment,
            ],
            assignmentParticipantProfiles: EventSuccessCompanionFixtures.peers,
            rotationAssignments: [
              EventSuccessCompanionFixtures.rotationAssignment,
            ],
            rotationParticipantProfiles: EventSuccessCompanionFixtures.peers,
            wingmanRequests: [EventSuccessCompanionFixtures.wingmanRequest],
            wingmanProfiles: const [EventSuccessCompanionFixtures.peer],
            initialTab: tab,
            showTabs: false,
            onSaveSetup: (_) async {},
            onSetLiveStep: (_) async {},
            onCompleteLiveGuide: (_) async {},
            onGenerateMicroPods: () async {},
            onGenerateGuidedRotations: () async {},
            onOverrideGroupAssignments: (_) async {},
            onOverrideGuidedRotations: (_) async {},
            onStartRevealCountdown: (_, _) async {},
            onRevealRound: (_) async {},
            onResetReveal: () async {},
          ),
          if (tab != EventSuccessHostTab.values.last) gapH16,
        ],
      ],
    );
  }
}

class LiveRevealCoverageStates extends StatelessWidget {
  const LiveRevealCoverageStates({super.key});

  @override
  Widget build(BuildContext context) {
    final event = EventSuccessCompanionFixtures.racketEvent;
    final plan = EventSuccessCompanionFixtures.revealCountingDownPlan;
    final now = EventSuccessCompanionFixtures.racketStart.subtract(
      const Duration(seconds: 1),
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        EventSuccessHostRevealSurface(
          event: event,
          plan: plan,
          podAssignments: const [],
          rotationAssignments: [
            EventSuccessCompanionFixtures.rotationAssignment,
          ],
          preferences: const [],
          participantProfiles: EventSuccessCompanionFixtures.peers,
          now: now,
          onStartCountdown: (_, _) async {},
          onRevealRound: (_) async {},
          onResetReveal: () async {},
        ),
        gapH16,
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
