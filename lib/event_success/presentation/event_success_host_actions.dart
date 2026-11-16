part of 'event_success_host_screen.dart';

extension _EventSuccessHostActions on _EventSuccessHostSectionState {
  Future<void> _saveEventSuccessSetup(EventSuccessSetupSaveRequest request) {
    return EventSuccessController.saveSetupMutation.run(ref, (tx) async {
      final basePlan = request.planIsPersisted
          ? request.plan
          : await tx
                .get(eventSuccessControllerProvider.notifier)
                .ensurePlan(request.event);
      await tx
          .get(eventSuccessControllerProvider.notifier)
          .saveSetup(
            plan: basePlan,
            draft: request.draft,
            layoutId: request.layoutId,
            attendeePrompt: request.attendeePrompt,
          );
    });
  }

  Future<EventSuccessSpatialActionResult> _controlEventSuccessSpatial({
    required String eventId,
    required int expectedRevision,
    required EventSuccessSpatialAction action,
    required EventSuccessAssignment assignment,
    String? destinationUnitId,
    EventSuccessSpatialScope? scope,
  }) => EventSuccessController.spatialControlMutation.run(
    ref,
    (tx) => tx
        .get(eventSuccessControllerProvider.notifier)
        .controlSpatialPlacement(
          eventId: eventId,
          expectedRevision: expectedRevision,
          action: action,
          moduleId: assignment.moduleId,
          uid: assignment.uid,
          destinationUnitId: destinationUnitId,
          scope: scope,
        ),
  );

  Future<void> _generateEventSuccessMicroPods({required String eventId}) {
    return EventSuccessController.generateMicroPodsMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .generateMicroPods(eventId: eventId),
    );
  }

  Future<void> _generateEventSuccessGuidedRotations({
    required String eventId,
    required int expectedRevision,
  }) {
    return EventSuccessController.generateGuidedRotationsMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .generateGuidedRotations(
            eventId: eventId,
            expectedRevision: expectedRevision,
          ),
    );
  }

  Future<void> _startEventSuccessRevealCountdown({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
  }) {
    return EventSuccessController.startRevealCountdownMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .startRevealCountdown(
            eventId: eventId,
            roundIndex: roundIndex,
            expectedRevision: expectedRevision,
            confirmed: true,
          ),
    );
  }

  Future<void> _revealEventSuccessRound({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
  }) {
    return EventSuccessController.revealRoundMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .revealRound(
            eventId: eventId,
            roundIndex: roundIndex,
            expectedRevision: expectedRevision,
            confirmed: true,
          ),
    );
  }

  Future<void> _cancelEventSuccessRevealCountdown({
    required String eventId,
    required int expectedRevision,
  }) {
    return EventSuccessController.cancelRevealCountdownMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .cancelRevealCountdown(
            eventId: eventId,
            expectedRevision: expectedRevision,
          ),
    );
  }

  Future<void> _recordEventSuccessUnitOutcomes({
    required String eventId,
    required int expectedRevision,
    required int roundIndex,
    required List<EventSuccessUnitOutcomeEntryInput> entries,
  }) {
    return EventSuccessController.recordUnitOutcomesMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .recordUnitOutcomes(
            eventId: eventId,
            expectedRevision: expectedRevision,
            roundIndex: roundIndex,
            entries: entries,
          ),
    );
  }

  Future<void> _publishEventSuccessGuidedRotationRound({
    required String eventId,
    required int roundIndex,
    required int expectedRevision,
  }) {
    return EventSuccessController.publishRotationRoundMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .publishGuidedRotationRound(
            eventId: eventId,
            roundIndex: roundIndex,
            expectedRevision: expectedRevision,
            confirmed: true,
          ),
    );
  }

  Future<void> _overrideEventSuccessGroupAssignments({
    required String eventId,
    required List<EventSuccessGroupOverrideRound> rounds,
  }) {
    return EventSuccessController.overrideGroupAssignmentsMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .overrideGroupAssignments(eventId: eventId, rounds: rounds),
    );
  }

  Future<void> _overrideEventSuccessGuidedRotations({
    required String eventId,
    required int expectedRevision,
    required List<EventSuccessRotationOverrideRound> rounds,
  }) {
    return EventSuccessController.overrideGuidedRotationsMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .overrideGuidedRotations(
            eventId: eventId,
            expectedRevision: expectedRevision,
            rounds: rounds,
          ),
    );
  }

  Future<void> _setEventSuccessLiveStep({
    required String eventId,
    required int index,
    required int expectedRevision,
  }) {
    unawaited(
      ref
          .read(eventSuccessLiveEffectsControllerProvider)
          .play(EventSuccessLiveEffectKind.stepChange),
    );
    return EventSuccessController.updateStepMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .updateActiveStep(
            eventId: eventId,
            activeStepIndex: index,
            expectedRevision: expectedRevision,
          ),
    );
  }

  Future<void> _completeEventSuccessLiveGuide({
    required String eventId,
    required int expectedRevision,
    required bool accountabilityAcknowledged,
  }) {
    unawaited(
      ref
          .read(eventSuccessLiveEffectsControllerProvider)
          .play(EventSuccessLiveEffectKind.guideComplete),
    );
    return EventSuccessController.completePlanMutation.run(
      ref,
      (tx) => tx
          .get(eventSuccessControllerProvider.notifier)
          .completePlan(
            eventId: eventId,
            expectedRevision: expectedRevision,
            accountabilityAcknowledged: accountabilityAcknowledged,
          ),
    );
  }

  void _retryEventSuccessHostSection({
    required String eventId,
    required String organizerId,
    required String? selectedLayoutId,
    required EventSuccessHostRetryIntent retryIntent,
    required String assignmentParticipantUidsKey,
    required String rotationParticipantUidsKey,
    required String wingmanProfilesKey,
  }) {
    switch (retryIntent) {
      case EventSuccessHostRetryIntent.plan:
        ref.invalidate(watchEventSuccessPlanProvider(eventId));
      case EventSuccessHostRetryIntent.roster:
        ref.invalidate(watchEventParticipationRosterProvider(eventId));
      case EventSuccessHostRetryIntent.assignments:
        ref.invalidate(watchEventSuccessAssignmentsProvider(eventId));
      case EventSuccessHostRetryIntent.rotationAssignments:
        ref.invalidate(watchEventSuccessRotationAssignmentsProvider(eventId));
      case EventSuccessHostRetryIntent.rotationDrafts:
        ref.invalidate(watchEventSuccessRotationDraftsProvider(eventId));
      case EventSuccessHostRetryIntent.assignmentParticipantProfiles:
        ref.invalidate(
          eventSuccessAssignmentPeerProfilesProvider(
            assignmentParticipantUidsKey,
          ),
        );
      case EventSuccessHostRetryIntent.rotationParticipantProfiles:
        ref.invalidate(
          eventSuccessAssignmentPeerProfilesProvider(
            rotationParticipantUidsKey,
          ),
        );
      case EventSuccessHostRetryIntent.preferences:
        ref.invalidate(watchEventSuccessPreferencesProvider(eventId));
      case EventSuccessHostRetryIntent.wingmanRequests:
        ref.invalidate(watchEventSuccessWingmanRequestsProvider(eventId));
      case EventSuccessHostRetryIntent.wingmanProfiles:
        ref.invalidate(
          eventSuccessAssignmentPeerProfilesProvider(wingmanProfilesKey),
        );
      case EventSuccessHostRetryIntent.scorecard:
        ref.invalidate(watchEventSuccessScorecardProvider(eventId));
      case EventSuccessHostRetryIntent.spatialLayout:
        if (selectedLayoutId != null) {
          ref.invalidate(
            watchEventSuccessSelectedLayoutProvider(
              organizerId: organizerId,
              layoutId: selectedLayoutId,
            ),
          );
        }
    }
  }
}
