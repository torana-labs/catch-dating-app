import 'package:catch_dating_app/contexts/account/data/auth_repository.dart';
import 'package:catch_dating_app/contexts/bookings/domain/event_participation.dart';
import 'package:catch_dating_app/contexts/events/domain/event.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_arrival_mission.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_plan.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/contexts/profiles/domain/public_profile.dart';
import 'package:catch_dating_app/design_fixtures/event_success_companion_fixtures.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_companion_screen.dart';
import 'package:catch_dating_app/event_success/presentation/event_success_live_effects_controller.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:widgetbook_annotation/widgetbook_annotation.dart' as widgetbook;

import '../../support/page_preview.dart';
import '../../support/widgetbook_harness.dart';
import 'fixtures.dart';
import 'preview.dart';

@widgetbook.UseCase(
  name: 'Screen states',
  type: EventSuccessCompanionScreen,
  path: '[P1 product surfaces]/Event Success companion',
)
Widget eventSuccessCompanionScreenStates(BuildContext context) {
  return WidgetbookPageCatalogFrame(
    title: 'EventSuccessCompanionScreen',
    contractId: 'screen.event_success.companion',
    children: [
      WidgetbookPageStateCard(
        label: 'default live guide',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(now: EventSuccessCompanionFixtures.now),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'self check-in',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            now: EventSuccessCompanionFixtures.socialStart.subtract(
              const Duration(minutes: 5),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'pre-arrival planning',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
            event: EventSuccessCompanionFixtures.racketEvent,
            participation: EventSuccessCompanionFixtures.signedUpParticipation(
              event: EventSuccessCompanionFixtures.racketEvent,
            ),
            now: EventSuccessCompanionFixtures.racketStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'First Hello start',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.firstHelloPlan,
            now: EventSuccessCompanionFixtures.socialStart.subtract(
              const Duration(minutes: 5),
            ),
            onStartArrivalMission: () async {},
            onSkipArrivalMission: () {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'First Hello assigned',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.firstHelloPlan,
            arrivalMission: EventSuccessCompanionFixtures.arrivalMission,
            now: EventSuccessCompanionFixtures.socialStart.subtract(
              const Duration(minutes: 5),
            ),
            onCompleteArrivalMission: (_, _) async {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'compatibility questionnaire',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.questionnairePlan,
            now: EventSuccessCompanionFixtures.socialStart.add(
              const Duration(minutes: 30),
            ),
            onSaveCompatibilityAnswers: (_) async {},
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'compatibility saved',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.questionnairePlan,
            compatibilityResponse:
                EventSuccessCompanionFixtures.compatibilityResponse,
            now: EventSuccessCompanionFixtures.socialStart.add(
              const Duration(minutes: 30),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'live step context',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            event: EventSuccessCompanionFixtures.racketEvent,
            plan: EventSuccessCompanionFixtures.liveStepContextPlan,
            participation: EventSuccessCompanionFixtures.attendedParticipation(
              event: EventSuccessCompanionFixtures.racketEvent,
            ),
            rotationAssignment:
                EventSuccessCompanionFixtures.rotationAssignment,
            rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
            now: EventSuccessCompanionFixtures.racketStart.add(
              const Duration(minutes: 25),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'social prompt',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.socialPromptPlan,
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            now: EventSuccessCompanionFixtures.socialStart.add(
              const Duration(minutes: 12),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'conversation cues',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.conversationCuesPlan,
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            now: EventSuccessCompanionFixtures.socialStart.add(
              const Duration(minutes: 50),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'assigned starter pod',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            assignment: EventSuccessCompanionFixtures.microPodAssignment,
            assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
            now: EventSuccessCompanionFixtures.socialStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'starter pod loading peers',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            assignment: EventSuccessCompanionFixtures.microPodAssignment,
            assignmentPeersLoading: true,
            now: EventSuccessCompanionFixtures.socialStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'starter pod opted out',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            microPodsOptedOut: true,
            now: EventSuccessCompanionFixtures.socialStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'table group rotations',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            assignment: EventSuccessCompanionFixtures.tableAssignment,
            assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
            now: EventSuccessCompanionFixtures.socialStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'rotation schedule',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            event: EventSuccessCompanionFixtures.racketEvent,
            plan: EventSuccessCompanionFixtures.rotationSchedulePlan,
            participation: EventSuccessCompanionFixtures.attendedParticipation(
              event: EventSuccessCompanionFixtures.racketEvent,
            ),
            rotationAssignment:
                EventSuccessCompanionFixtures.rotationAssignment,
            rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
            now: EventSuccessCompanionFixtures.racketStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'rotation loading peers',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            event: EventSuccessCompanionFixtures.racketEvent,
            plan: EventSuccessCompanionFixtures.rotationSchedulePlan,
            participation: EventSuccessCompanionFixtures.attendedParticipation(
              event: EventSuccessCompanionFixtures.racketEvent,
            ),
            rotationAssignment:
                EventSuccessCompanionFixtures.rotationAssignment,
            rotationPeersLoading: true,
            now: EventSuccessCompanionFixtures.racketStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'rotation opted out',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            event: EventSuccessCompanionFixtures.racketEvent,
            plan: EventSuccessCompanionFixtures.rotationSchedulePlan,
            participation: EventSuccessCompanionFixtures.attendedParticipation(
              event: EventSuccessCompanionFixtures.racketEvent,
            ),
            guidedRotationsOptedOut: true,
            now: EventSuccessCompanionFixtures.racketStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'live reveal locked',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            event: EventSuccessCompanionFixtures.racketEvent,
            plan: EventSuccessCompanionFixtures.revealCountingDownPlan,
            participation: EventSuccessCompanionFixtures.attendedParticipation(
              event: EventSuccessCompanionFixtures.racketEvent,
            ),
            rotationAssignment:
                EventSuccessCompanionFixtures.rotationAssignment,
            rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
            now: EventSuccessCompanionFixtures.racketStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'live reveal unlocked',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            event: EventSuccessCompanionFixtures.racketEvent,
            plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
            participation: EventSuccessCompanionFixtures.attendedParticipation(
              event: EventSuccessCompanionFixtures.racketEvent,
            ),
            rotationAssignment:
                EventSuccessCompanionFixtures.rotationAssignment,
            rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
            now: EventSuccessCompanionFixtures.racketStart.subtract(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'wingman request',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.wingmanPlan,
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            wingmanRequestCandidates: EventSuccessCompanionFixtures.peers,
            now: EventSuccessCompanionFixtures.socialStart.add(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'wingman request submitted',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            plan: EventSuccessCompanionFixtures.wingmanPlan,
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            wingmanRequestCandidates: EventSuccessCompanionFixtures.peers,
            wingmanRequest: EventSuccessCompanionFixtures.wingmanRequest,
            now: EventSuccessCompanionFixtures.socialStart.add(
              const Duration(hours: 1),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'afterglow feedback',
        child: WidgetbookCompanionDeviceFrame(
          child: _CompanionScope(
            participation:
                EventSuccessCompanionFixtures.attendedParticipation(),
            existingFeedback: EventSuccessCompanionFixtures.feedback,
            now: EventSuccessCompanionFixtures.socialEvent.endTime.add(
              const Duration(hours: 2),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'text scale 2.0',
        child: WidgetbookCompanionDeviceFrame(
          child: WidgetbookMediaOverride(
            textScaler: const TextScaler.linear(2),
            child: _CompanionScope(
              participation:
                  EventSuccessCompanionFixtures.attendedParticipation(),
              assignment: EventSuccessCompanionFixtures.microPodAssignment,
              assignmentPeerProfiles: EventSuccessCompanionFixtures.peers,
              now: EventSuccessCompanionFixtures.socialStart.subtract(
                const Duration(hours: 1),
              ),
            ),
          ),
        ),
      ),
      WidgetbookPageStateCard(
        label: 'reduced motion',
        child: WidgetbookCompanionDeviceFrame(
          child: WidgetbookMediaOverride(
            disableAnimations: true,
            child: _CompanionScope(
              event: EventSuccessCompanionFixtures.racketEvent,
              plan: EventSuccessCompanionFixtures.revealUnlockedPlan,
              participation:
                  EventSuccessCompanionFixtures.attendedParticipation(
                    event: EventSuccessCompanionFixtures.racketEvent,
                  ),
              rotationAssignment:
                  EventSuccessCompanionFixtures.rotationAssignment,
              rotationPeerProfiles: const [EventSuccessCompanionFixtures.peer],
              now: EventSuccessCompanionFixtures.racketStart.subtract(
                const Duration(hours: 1),
              ),
            ),
          ),
        ),
      ),
    ],
  );
}

class _CompanionScope extends StatelessWidget {
  const _CompanionScope({
    this.event,
    this.plan,
    this.participation,
    this.wingmanRequestCandidates = const [],
    this.wingmanRequest,
    this.compatibilityResponse,
    this.existingFeedback,
    this.assignment,
    this.assignmentPeerProfiles = const [],
    this.assignmentPeersLoading = false,
    this.microPodsOptedOut = false,
    this.rotationAssignment,
    this.rotationPeerProfiles = const [],
    this.rotationPeersLoading = false,
    this.guidedRotationsOptedOut = false,
    this.arrivalMission,
    this.now,
    this.onSaveCompatibilityAnswers,
    this.onStartArrivalMission,
    this.onCompleteArrivalMission,
    this.onSkipArrivalMission,
  });

  final Event? event;
  final EventSuccessPlan? plan;
  final EventParticipation? participation;
  final List<PublicProfile> wingmanRequestCandidates;
  final EventSuccessWingmanRequest? wingmanRequest;
  final EventSuccessCompatibilityResponse? compatibilityResponse;
  final EventSuccessFeedback? existingFeedback;
  final EventSuccessAssignment? assignment;
  final List<PublicProfile> assignmentPeerProfiles;
  final bool assignmentPeersLoading;
  final bool microPodsOptedOut;
  final EventSuccessAssignment? rotationAssignment;
  final List<PublicProfile> rotationPeerProfiles;
  final bool rotationPeersLoading;
  final bool guidedRotationsOptedOut;
  final EventSuccessArrivalMission? arrivalMission;
  final DateTime? now;
  final Future<void> Function(List<String> answerIds)?
  onSaveCompatibilityAnswers;
  final Future<void> Function()? onStartArrivalMission;
  final Future<void> Function(
    EventSuccessArrivalMission mission,
    String answerId,
  )?
  onCompleteArrivalMission;
  final VoidCallback? onSkipArrivalMission;

  @override
  Widget build(BuildContext context) {
    final resolvedEvent = event ?? EventSuccessCompanionFixtures.socialEvent;
    return WidgetbookFixtureScope(
      overrides: [
        uidProvider.overrideWithValue(
          const AsyncData<String?>(EventSuccessCompanionFixtures.viewerUid),
        ),
        eventSuccessLiveEffectsControllerProvider.overrideWith(
          (ref) => WidgetbookCompanionNoopEventSuccessLiveEffectsController(),
        ),
      ],
      child: EventSuccessCompanionScreen(
        event: resolvedEvent,
        plan: plan ?? EventSuccessCompanionFixtures.basePlan,
        userProfile: EventSuccessCompanionFixtures.viewer,
        participation:
            participation ??
            EventSuccessCompanionFixtures.signedUpParticipation(
              event: resolvedEvent,
            ),
        wingmanRequestCandidates: wingmanRequestCandidates,
        wingmanRequest: wingmanRequest,
        compatibilityResponse: compatibilityResponse,
        existingFeedback: existingFeedback,
        assignment: assignment,
        assignmentPeerProfiles: assignmentPeerProfiles,
        assignmentPeersLoading: assignmentPeersLoading,
        microPodsOptedOut: microPodsOptedOut,
        rotationAssignment: rotationAssignment,
        rotationPeerProfiles: rotationPeerProfiles,
        rotationPeersLoading: rotationPeersLoading,
        guidedRotationsOptedOut: guidedRotationsOptedOut,
        arrivalMission: arrivalMission,
        now: now,
        onSaveCompatibilityAnswers: onSaveCompatibilityAnswers,
        onStartArrivalMission: onStartArrivalMission,
        onCompleteArrivalMission: onCompleteArrivalMission,
        onSkipArrivalMission: onSkipArrivalMission,
      ),
    );
  }
}
