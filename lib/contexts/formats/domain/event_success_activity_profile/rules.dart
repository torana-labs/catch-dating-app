part of '../event_success_activity_profile.dart';

EventSuccessPlaybook _playbookForFormat(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
  EventSuccessCompatibilityPolicy compatibilityPolicy,
) {
  final id = format.defaultPlaybookId;
  if (id != null) return EventSuccessPlaybookLibrary.byIdOrDefault(id);
  return switch (interactionModel) {
    EventInteractionModel.pacePods => EventSuccessPlaybookLibrary.socialRun,
    EventInteractionModel.pairedRotations =>
      EventSuccessPlaybookLibrary.pickleball,
    EventInteractionModel.teamRotations => EventSuccessPlaybookLibrary.pubQuiz,
    EventInteractionModel.seatedTable => EventSuccessPlaybookLibrary.dinner,
    EventInteractionModel.freeFormMixer =>
      compatibilityPolicy == EventSuccessCompatibilityPolicy.mutualInterestOnly
          ? EventSuccessPlaybookLibrary.algorithmicMixer
          : EventSuccessPlaybookLibrary.hostLedSocial,
    EventInteractionModel.hostLedProgram || EventInteractionModel.openFormat =>
      EventSuccessPlaybookLibrary.hostLedSocial,
  };
}

int _targetFor(EventSuccessPlaybook playbook) =>
    ((playbook.capacity.min + playbook.capacity.max) / 2).round();

EventSuccessDurationShape _durationShapeFor(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
) =>
    _primitiveOverride(
      format,
      'durationShape',
      EventSuccessDurationShape.values,
    ) ??
    switch (interactionModel) {
      EventInteractionModel.pacePods => EventSuccessDurationShape.segments,
      EventInteractionModel.pairedRotations ||
      EventInteractionModel.teamRotations ||
      EventInteractionModel.freeFormMixer => EventSuccessDurationShape.rounds,
      EventInteractionModel.seatedTable => EventSuccessDurationShape.courses,
      EventInteractionModel.hostLedProgram ||
      EventInteractionModel.openFormat => EventSuccessDurationShape.continuous,
    };

Map<String, EventSuccessRecommendationLevel> _levelsForFormat(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
  EventSuccessCompatibilityPolicy compatibilityPolicy,
  EventSuccessAssignmentResolution assignmentResolution,
  EventSuccessUnitOutcome unitOutcome,
) {
  final base = <String, EventSuccessRecommendationLevel>{
    EventSuccessModuleCatalog.crowdBalance.id:
        EventSuccessRecommendationLevel.unsupported,
    EventSuccessModuleCatalog.checkIn.id:
        EventSuccessRecommendationLevel.unsupported,
    EventSuccessModuleCatalog.firstHelloCheckIn.id:
        EventSuccessRecommendationLevel.optional,
    EventSuccessModuleCatalog.hostScript.id:
        EventSuccessRecommendationLevel.defaultOn,
    EventSuccessModuleCatalog.microPods.id:
        EventSuccessRecommendationLevel.optional,
    EventSuccessModuleCatalog.socialMissions.id:
        EventSuccessRecommendationLevel.defaultOn,
    EventSuccessModuleCatalog.guidedRotations.id:
        EventSuccessRecommendationLevel.optional,
    EventSuccessModuleCatalog.liveReveal.id:
        EventSuccessRecommendationLevel.optional,
    EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
        EventSuccessRecommendationLevel.recommended,
    EventSuccessModuleCatalog.wingmanRequests.id:
        EventSuccessRecommendationLevel.defaultOn,
    EventSuccessModuleCatalog.contextualOpeners.id:
        EventSuccessRecommendationLevel.defaultOn,
    EventSuccessModuleCatalog.decomposedFeedback.id:
        EventSuccessRecommendationLevel.defaultOn,
    EventSuccessModuleCatalog.hostAnalytics.id:
        EventSuccessRecommendationLevel.defaultOn,
    EventSuccessModuleCatalog.safetyControls.id:
        EventSuccessRecommendationLevel.unsupported,
  };

  switch (interactionModel) {
    case EventInteractionModel.pacePods:
      base[EventSuccessModuleCatalog.microPods.id] =
          EventSuccessRecommendationLevel.defaultOn;
      base[EventSuccessModuleCatalog.guidedRotations.id] =
          EventSuccessRecommendationLevel.unsupported;
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.discouraged;
    case EventInteractionModel.pairedRotations:
      base[EventSuccessModuleCatalog.firstHelloCheckIn.id] =
          EventSuccessRecommendationLevel.recommended;
      base[EventSuccessModuleCatalog.guidedRotations.id] =
          EventSuccessRecommendationLevel.defaultOn;
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.defaultOn;
      base[EventSuccessModuleCatalog.microPods.id] =
          EventSuccessRecommendationLevel.unsupported;
    case EventInteractionModel.teamRotations:
      base[EventSuccessModuleCatalog.firstHelloCheckIn.id] =
          EventSuccessRecommendationLevel.recommended;
      base[EventSuccessModuleCatalog.microPods.id] =
          EventSuccessRecommendationLevel.defaultOn;
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.defaultOn;
      base[EventSuccessModuleCatalog.guidedRotations.id] =
          EventSuccessRecommendationLevel.discouraged;
    case EventInteractionModel.seatedTable:
      base[EventSuccessModuleCatalog.firstHelloCheckIn.id] =
          EventSuccessRecommendationLevel.recommended;
      base[EventSuccessModuleCatalog.guidedRotations.id] =
          EventSuccessRecommendationLevel.recommended;
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.recommended;
      base[EventSuccessModuleCatalog.microPods.id] =
          EventSuccessRecommendationLevel.discouraged;
    case EventInteractionModel.freeFormMixer:
      base[EventSuccessModuleCatalog.firstHelloCheckIn.id] =
          EventSuccessRecommendationLevel.recommended;
      base[EventSuccessModuleCatalog.guidedRotations.id] =
          EventSuccessRecommendationLevel.defaultOn;
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.defaultOn;
      base[EventSuccessModuleCatalog.compatibilityQuestionnaire.id] =
          compatibilityPolicy ==
              EventSuccessCompatibilityPolicy.mutualInterestOnly
          ? EventSuccessRecommendationLevel.defaultOn
          : EventSuccessRecommendationLevel.recommended;
      base[EventSuccessModuleCatalog.microPods.id] =
          EventSuccessRecommendationLevel.discouraged;
    case EventInteractionModel.hostLedProgram:
      base[EventSuccessModuleCatalog.microPods.id] =
          EventSuccessRecommendationLevel.discouraged;
      base[EventSuccessModuleCatalog.guidedRotations.id] =
          EventSuccessRecommendationLevel.unsupported;
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.unsupported;
      base[EventSuccessModuleCatalog.compatibilityQuestionnaire.id] =
          EventSuccessRecommendationLevel.optional;
    case EventInteractionModel.openFormat:
      base[EventSuccessModuleCatalog.microPods.id] =
          EventSuccessRecommendationLevel.optional;
      base[EventSuccessModuleCatalog.guidedRotations.id] =
          EventSuccessRecommendationLevel.optional;
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.optional;
      base[EventSuccessModuleCatalog.compatibilityQuestionnaire.id] =
          EventSuccessRecommendationLevel.optional;
  }

  if (!assignmentResolution.supported) {
    base[EventSuccessModuleCatalog.microPods.id] =
        EventSuccessRecommendationLevel.unsupported;
    base[EventSuccessModuleCatalog.guidedRotations.id] =
        EventSuccessRecommendationLevel.unsupported;
    if (unitOutcome != EventSuccessUnitOutcome.score) {
      base[EventSuccessModuleCatalog.liveReveal.id] =
          EventSuccessRecommendationLevel.unsupported;
    }
  }

  for (final moduleId in format.defaultModuleIds) {
    final level = base[moduleId];
    if (level != null && level != EventSuccessRecommendationLevel.unsupported) {
      base[moduleId] = EventSuccessRecommendationLevel.defaultOn;
    }
  }

  return base;
}

EventSuccessPhoneAvailability _phoneAvailabilityFor(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
) {
  final override = _primitiveOverride(
    format,
    'phoneAvailability',
    EventSuccessPhoneAvailability.values,
  );
  if (override != null) return override;
  return switch (interactionModel) {
    EventInteractionModel.pacePods =>
      EventSuccessPhoneAvailability.arrivalAndPostEventOnly,
    EventInteractionModel.pairedRotations ||
    EventInteractionModel.teamRotations ||
    EventInteractionModel.seatedTable ||
    EventInteractionModel.freeFormMixer =>
      EventSuccessPhoneAvailability.plannedPauses,
    EventInteractionModel.hostLedProgram =>
      format.activityKind.isMovementHeavy
          ? EventSuccessPhoneAvailability.hostOnlyLive
          : EventSuccessPhoneAvailability.plannedPauses,
    EventInteractionModel.openFormat =>
      EventSuccessPhoneAvailability.hostOnlyLive,
  };
}

EventSuccessRotationSuitability _rotationSuitabilityFor(
  EventFormatSnapshot format,
) {
  final override = _primitiveOverride(
    format,
    'rotationSuitability',
    EventSuccessRotationSuitability.values,
  );
  if (override != null) return override;
  final interactionModel = format.interactionModel;
  return switch (interactionModel) {
    EventInteractionModel.pacePods ||
    EventInteractionModel.hostLedProgram ||
    EventInteractionModel.openFormat => EventSuccessRotationSuitability.none,
    EventInteractionModel.pairedRotations ||
    EventInteractionModel.freeFormMixer =>
      EventSuccessRotationSuitability.continuousRounds,
    EventInteractionModel.teamRotations || EventInteractionModel.seatedTable =>
      EventSuccessRotationSuitability.plannedBreaks,
  };
}

EventSuccessAssignmentAlgorithm _assignmentAlgorithmFor(
  EventFormatSnapshot format,
) {
  final override = _primitiveOverride(
    format,
    'assignmentAlgorithm',
    EventSuccessAssignmentAlgorithm.values,
  );
  if (override != null) return override;
  final interactionModel = format.interactionModel;
  return switch (interactionModel) {
    EventInteractionModel.pacePods => EventSuccessAssignmentAlgorithm.pacePods,
    EventInteractionModel.pairedRotations =>
      EventSuccessAssignmentAlgorithm.pairRotations,
    EventInteractionModel.teamRotations =>
      EventSuccessAssignmentAlgorithm.teamBalancer,
    EventInteractionModel.seatedTable =>
      EventSuccessAssignmentAlgorithm.tableSeating,
    EventInteractionModel.freeFormMixer =>
      EventSuccessAssignmentAlgorithm.socialPods,
    EventInteractionModel.hostLedProgram ||
    EventInteractionModel.openFormat => EventSuccessAssignmentAlgorithm.none,
  };
}

EventSuccessCompatibilityPolicy _compatibilityPolicyFor(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
) {
  final override = _primitiveOverride(
    format,
    'compatibilityPolicy',
    EventSuccessCompatibilityPolicy.values,
  );
  if (override != null) return override;
  return switch (interactionModel) {
    EventInteractionModel.freeFormMixer =>
      format.activityKind == ActivityKind.singlesMixer
          ? EventSuccessCompatibilityPolicy.mutualInterestOnly
          : EventSuccessCompatibilityPolicy.questionnaireClueOnly,
    EventInteractionModel.teamRotations ||
    EventInteractionModel.seatedTable ||
    EventInteractionModel.pairedRotations =>
      EventSuccessCompatibilityPolicy.questionnaireClueOnly,
    EventInteractionModel.pacePods =>
      EventSuccessCompatibilityPolicy.socialCohortBalance,
    EventInteractionModel.hostLedProgram ||
    EventInteractionModel.openFormat => EventSuccessCompatibilityPolicy.none,
  };
}

EventSuccessMatchingObjective _matchingObjectiveFor(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
  EventSuccessCompatibilityPolicy compatibilityPolicy,
) {
  final override = _primitiveOverride(
    format,
    'matchingObjective',
    EventSuccessMatchingObjective.values,
  );
  if (override != null) return override;
  return switch (interactionModel) {
    EventInteractionModel.pacePods => EventSuccessMatchingObjective.affinity,
    EventInteractionModel.pairedRotations =>
      EventSuccessMatchingObjective.balance,
    EventInteractionModel.teamRotations => EventSuccessMatchingObjective.spread,
    EventInteractionModel.seatedTable => EventSuccessMatchingObjective.affinity,
    EventInteractionModel.freeFormMixer =>
      compatibilityPolicy == EventSuccessCompatibilityPolicy.mutualInterestOnly
          ? EventSuccessMatchingObjective.romantic
          : EventSuccessMatchingObjective.coverage,
    EventInteractionModel.hostLedProgram ||
    EventInteractionModel.openFormat => EventSuccessMatchingObjective.coverage,
  };
}

EventSuccessUnitOutcome _unitOutcomeFor(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
) {
  final override = _primitiveOverride(
    format,
    'unitOutcome',
    EventSuccessUnitOutcome.values,
  );
  if (override != null) return override;
  return switch (interactionModel) {
    EventInteractionModel.pacePods => EventSuccessUnitOutcome.completion,
    EventInteractionModel.teamRotations => EventSuccessUnitOutcome.score,
    EventInteractionModel.pairedRotations => EventSuccessUnitOutcome.rank,
    EventInteractionModel.seatedTable ||
    EventInteractionModel.freeFormMixer ||
    EventInteractionModel.hostLedProgram ||
    EventInteractionModel.openFormat => EventSuccessUnitOutcome.none,
  };
}

EventSuccessAccountability _accountabilityFor(
  EventFormatSnapshot format,
  EventInteractionModel interactionModel,
) {
  final override = _primitiveOverride(
    format,
    'accountability',
    EventSuccessAccountability.values,
  );
  if (override != null) return override;
  return interactionModel == EventInteractionModel.pacePods
      ? EventSuccessAccountability.sweep
      : EventSuccessAccountability.none;
}

EventSuccessAssignmentResolution _assignmentResolutionFor(
  EventSuccessAssignmentAlgorithm assignmentAlgorithm,
) {
  return switch (assignmentAlgorithm) {
    EventSuccessAssignmentAlgorithm.pacePods ||
    EventSuccessAssignmentAlgorithm.socialPods ||
    EventSuccessAssignmentAlgorithm.pairRotations =>
      const EventSuccessAssignmentResolution(
        support: EventSuccessAssignmentSupport.supported,
        reason: 'This assignment algorithm is implemented.',
      ),
    EventSuccessAssignmentAlgorithm.none =>
      const EventSuccessAssignmentResolution(
        support: EventSuccessAssignmentSupport.unsupported,
        reason: 'This format does not select an assignment algorithm.',
      ),
    EventSuccessAssignmentAlgorithm.teamBalancer =>
      const EventSuccessAssignmentResolution(
        support: EventSuccessAssignmentSupport.unsupported,
        reason: 'Team balancing is not implemented yet.',
      ),
    EventSuccessAssignmentAlgorithm.tableSeating =>
      const EventSuccessAssignmentResolution(
        support: EventSuccessAssignmentSupport.unsupported,
        reason: 'Table seating and seat adjacency are not implemented yet.',
      ),
  };
}

EventInteractionModel _effectiveInteractionModel(
  EventInteractionModel interactionModel,
  EventSuccessAssignmentAlgorithm assignmentAlgorithm,
) {
  final mapped = switch (assignmentAlgorithm) {
    EventSuccessAssignmentAlgorithm.pacePods => EventInteractionModel.pacePods,
    EventSuccessAssignmentAlgorithm.pairRotations =>
      EventInteractionModel.pairedRotations,
    EventSuccessAssignmentAlgorithm.teamBalancer =>
      EventInteractionModel.teamRotations,
    EventSuccessAssignmentAlgorithm.tableSeating =>
      EventInteractionModel.seatedTable,
    EventSuccessAssignmentAlgorithm.socialPods =>
      EventInteractionModel.freeFormMixer,
    EventSuccessAssignmentAlgorithm.none => null,
  };
  return mapped ?? interactionModel;
}

T? _primitiveOverride<T extends Enum>(
  EventFormatSnapshot format,
  String key,
  List<T> values,
) {
  final raw = format.eventSuccessPrimitives[key];
  if (raw is! String) return null;
  final normalized = raw.trim();
  for (final value in values) {
    if (value.name == normalized) return value;
  }
  return null;
}

Map<String, String> _reasonsFor(EventInteractionModel interactionModel) {
  final common = <String, String>{
    EventSuccessModuleCatalog.crowdBalance.id:
        'Useful before publishing, but it belongs beside booking and roster decisions.',
    EventSuccessModuleCatalog.checkIn.id:
        'Arrival state is the source of truth for assignments, host help, feedback, and post-event matching.',
    EventSuccessModuleCatalog.firstHelloCheckIn.id:
        'A location-verified first hello turns arrival into permission to start one conversation.',
    EventSuccessModuleCatalog.hostScript.id:
        'A short host script gives attendees permission to talk without making the host improvise.',
    EventSuccessModuleCatalog.socialMissions.id:
        'Prompts create one easy next conversation without adding another feature surface.',
    EventSuccessModuleCatalog.wingmanRequests.id:
        'Explicit host-help requests let shy attendees ask for a natural introduction while the room is live.',
    EventSuccessModuleCatalog.contextualOpeners.id:
        'Post-match openers use event context without exposing private answers.',
    EventSuccessModuleCatalog.decomposedFeedback.id:
        'Feedback should be specific enough to improve the next event without becoming a public score.',
    EventSuccessModuleCatalog.hostAnalytics.id:
        'Hosts need a short coaching summary, not a wall of metrics.',
    EventSuccessModuleCatalog.safetyControls.id:
        'Blocks, reports, visibility, and opt-outs have to apply across every live guide surface.',
  };

  switch (interactionModel) {
    case EventInteractionModel.pacePods:
      return {
        ...common,
        EventSuccessModuleCatalog.microPods.id:
            'For runs and walks this behaves as pace or arrival grouping, not romance scoring.',
        EventSuccessModuleCatalog.guidedRotations.id:
            'Timed pair rotations interrupt a moving group and should not be shown for this format.',
        EventSuccessModuleCatalog.liveReveal.id:
            'Reveal ceremonies are usually too phone-heavy during movement, but can be used at a planned stop.',
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
            'Answers can support clues or follow-up, but should not dominate the event.',
      };
    case EventInteractionModel.pairedRotations:
      return {
        ...common,
        EventSuccessModuleCatalog.guidedRotations.id:
            'Racket formats naturally break into pairs, courts, and timed rounds.',
        EventSuccessModuleCatalog.liveReveal.id:
            'Countdowns and reveals turn the next court or partner into a shared moment.',
        EventSuccessModuleCatalog.microPods.id:
            'A separate pod layer competes with the court-pair structure.',
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
            'Optional answers can add clues or softly guide partner suggestions after safety and interest checks.',
      };
    case EventInteractionModel.teamRotations:
      return {
        ...common,
        EventSuccessModuleCatalog.microPods.id:
            'For quiz formats this is the team setup.',
        EventSuccessModuleCatalog.liveReveal.id:
            'Team reveals give the host a clear start moment without showing every future move.',
        EventSuccessModuleCatalog.guidedRotations.id:
            'Pair rotations are not the main quiz structure; keep this advanced until team reshuffles need it.',
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
            'Answers can help balance teams or generate clues when the host wants a more dating-forward quiz.',
      };
    case EventInteractionModel.seatedTable:
      return {
        ...common,
        EventSuccessModuleCatalog.guidedRotations.id:
            'Table or course changes can work, but only when the host intentionally designs the cadence.',
        EventSuccessModuleCatalog.liveReveal.id:
            'Table reveals are useful for anticipation, but should follow the seating plan.',
        EventSuccessModuleCatalog.microPods.id:
            'Tables already define the room structure; a separate pod toggle adds confusion.',
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
            'Answers are useful for seating clues and soft table placement.',
      };
    case EventInteractionModel.freeFormMixer:
      return {
        ...common,
        EventSuccessModuleCatalog.guidedRotations.id:
            'A mixer benefits from planned rounds when the host wants momentum.',
        EventSuccessModuleCatalog.liveReveal.id:
            'The countdown and reveal are the memorable ceremony for this format.',
        EventSuccessModuleCatalog.microPods.id:
            'Pods can help arrival, but should not replace the main reveal or rotation flow.',
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
            'This is the right format for clue questions and suggested pairings.',
      };
    case EventInteractionModel.hostLedProgram:
      return {
        ...common,
        EventSuccessModuleCatalog.microPods.id:
            'Small groups can help after class, but the activity itself is host-led.',
        EventSuccessModuleCatalog.guidedRotations.id:
            'Timed pair rotations do not fit the core class structure.',
        EventSuccessModuleCatalog.liveReveal.id:
            'Reveal ceremonies need a pod or rotation plan and are not part of the default class flow.',
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
            'Optional answers can support post-event context without changing the class.',
      };
    case EventInteractionModel.openFormat:
      return {
        ...common,
        EventSuccessModuleCatalog.microPods.id:
            'Use only when the host wants small arrival groups.',
        EventSuccessModuleCatalog.guidedRotations.id:
            'Use only when the host turns the open event into a structured assignment flow.',
        EventSuccessModuleCatalog.liveReveal.id:
            'Use only with selected pods or rotations.',
        EventSuccessModuleCatalog.compatibilityQuestionnaire.id:
            'Use when the host wants clues or compatibility context.',
      };
  }
}

String _summaryFor(EventInteractionModel interactionModel) {
  return switch (interactionModel) {
    EventInteractionModel.pacePods =>
      'Keep the moving event primary. Use check-in, light grouping, prompts, and follow-up without turning it into speed dating.',
    EventInteractionModel.pairedRotations =>
      'Use the natural court/pair structure: timed rounds, partner reveals, and optional compatibility clues.',
    EventInteractionModel.teamRotations =>
      'Plan around teams. Balance arrivals, reveal teams, and use prompts between rounds.',
    EventInteractionModel.seatedTable =>
      'Plan around tables. Add rotations only when the host has a clear course or seat-change cadence.',
    EventInteractionModel.freeFormMixer =>
      'Create kinetic reveal moments with countdowns, clues, and structured rounds while keeping interest private.',
    EventInteractionModel.hostLedProgram =>
      'Keep the class or program intact. Add arrival, light prompts, follow-up, and feedback around the edges.',
    EventInteractionModel.openFormat =>
      'Start with basic safety, attendance, prompt, and follow-up tools; let the host opt into structure.',
  };
}
