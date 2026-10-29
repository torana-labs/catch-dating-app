import 'package:catch_dating_app/activity/domain/activity_taxonomy.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_coach.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_models.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';

enum EventSuccessSetupStatus {
  needsWork(StructuredDomainCopy.eventSuccessSetupNeedsWork),
  readyForLaunch(StructuredDomainCopy.eventSuccessSetupReadyForLaunch);

  const EventSuccessSetupStatus(this.label);

  final String label;
}

enum EventSuccessConversationGraphConsentMode { optIn, optOut }

class EventSuccessHostDraft {
  const EventSuccessHostDraft({
    required this.playbook,
    required this.selectedModuleIds,
    required this.targetAttendeeCount,
    required this.structureConfig,
    this.hostGoal = StructuredDomainCopy.eventSuccessDefaultHostGoal,
    this.wingmanRequestsEnabled = true,
    this.contextualOpenersEnabled = true,
    this.compatibilityAffectsRanking = false,
    this.questionnaireConfig =
        const EventSuccessQuestionnaireConfig.defaultTemplate(),
    this.conversationGraphConsentMode =
        EventSuccessConversationGraphConsentMode.optIn,
  }) : assert(targetAttendeeCount > 0);

  factory EventSuccessHostDraft.fromPlaybook(
    EventSuccessPlaybook playbook, {
    int? targetAttendeeCount,
  }) {
    final target =
        targetAttendeeCount ??
        ((playbook.capacity.min + playbook.capacity.max) / 2).round();
    final profile = EventSuccessActivityProfile.forActivity(
      playbook.activityType,
      targetAttendeeCount: target,
    );
    return EventSuccessHostDraft(
      playbook: playbook,
      selectedModuleIds: playbook.effectiveModuleSelection(
        profile.defaultModuleIds,
      ),
      targetAttendeeCount: target,
      structureConfig: profile.structureConfig,
      compatibilityAffectsRanking: profile.compatibilityAffectsRankingByDefault,
    );
  }

  factory EventSuccessHostDraft.fromActivity(
    ActivityKind activityKind, {
    int? targetAttendeeCount,
  }) => EventSuccessHostDraft.fromFormat(
    EventFormatSnapshot.fromActivityKind(activityKind),
    targetAttendeeCount: targetAttendeeCount,
  );

  factory EventSuccessHostDraft.fromFormat(
    EventFormatSnapshot format, {
    int? targetAttendeeCount,
  }) {
    final profile = EventSuccessActivityProfile.forFormat(
      format,
      targetAttendeeCount: targetAttendeeCount,
    );
    return EventSuccessHostDraft(
      playbook: profile.playbook,
      selectedModuleIds: profile.playbook.effectiveModuleSelection(
        profile.defaultModuleIds,
      ),
      targetAttendeeCount:
          targetAttendeeCount ??
          ((profile.playbook.capacity.min + profile.playbook.capacity.max) / 2)
              .round(),
      structureConfig: profile.structureConfig,
      compatibilityAffectsRanking: profile.compatibilityAffectsRankingByDefault,
    );
  }

  final EventSuccessPlaybook playbook;
  final Set<String> selectedModuleIds;
  final int targetAttendeeCount;
  final EventSuccessStructureConfig structureConfig;
  final String hostGoal;
  final bool wingmanRequestsEnabled;
  final bool contextualOpenersEnabled;
  final bool compatibilityAffectsRanking;
  final EventSuccessQuestionnaireConfig questionnaireConfig;
  final EventSuccessConversationGraphConsentMode conversationGraphConsentMode;

  Set<String> get effectiveSelectedModuleIds =>
      playbook.effectiveModuleSelection(selectedModuleIds);

  List<EventSuccessModule> get selectedModules => playbook.modules
      .where((module) => effectiveSelectedModuleIds.contains(module.id))
      .toList(growable: false);

  List<EventSuccessModule> get livePhoneModules => selectedModules
      .where((module) => module.requiresLivePhoneUse)
      .toList(growable: false);

  EventSuccessSetupStatus get status => readinessIssues.isEmpty
      ? EventSuccessSetupStatus.readyForLaunch
      : EventSuccessSetupStatus.needsWork;

  bool isModuleSelected(String moduleId) =>
      effectiveSelectedModuleIds.contains(moduleId);

  EventSuccessHostDraft toggleModule(String moduleId) {
    final nextIds = {...selectedModuleIds};
    if (!nextIds.remove(moduleId)) nextIds.add(moduleId);
    return copyWith(selectedModuleIds: nextIds);
  }

  EventSuccessHostDraft withModuleSelection(String moduleId, bool selected) {
    final nextIds = {...selectedModuleIds};
    if (selected) {
      nextIds.add(moduleId);
    } else {
      nextIds.remove(moduleId);
    }
    final next = copyWith(selectedModuleIds: nextIds);
    return selected && moduleId == EventSuccessModuleCatalog.guidedRotations.id
        ? next.normalizedForSelectedModules()
        : next;
  }

  EventSuccessHostDraft normalizeForActivity(ActivityKind activityKind) {
    return normalizeForFormat(
      EventFormatSnapshot.fromActivityKind(activityKind),
    );
  }

  EventSuccessHostDraft normalizeForFormat(EventFormatSnapshot format) {
    final profile = EventSuccessActivityProfile.forFormat(
      format,
      targetAttendeeCount: targetAttendeeCount,
    );
    final compatibleSelectedIds = selectedModuleIds
        .where(profile.isSelectable)
        .where(profile.playbook.moduleIds.contains)
        .toSet();
    final selectedIds = compatibleSelectedIds;
    return copyWith(
      playbook: profile.playbook,
      selectedModuleIds: selectedIds,
      structureConfig:
          structureConfig.isLegacyDefault ||
              (format.interactionModel == EventInteractionModel.teamRotations &&
                  structureConfig.isDeprecatedTeamRotationDefault)
          ? profile.structureConfig
          : structureConfig,
      compatibilityAffectsRanking:
          selectedIds.contains(
            EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
          ) &&
          (compatibilityAffectsRanking ||
              profile.compatibilityAffectsRankingByDefault),
    ).normalizedForSelectedModules();
  }

  /// Applies invariants shared by the current Flutter editor and assignment
  /// backend. The owner-review people-mix projection is not wired here: the
  /// live guided-rotation engine remains pair-only until that design and its
  /// backend topology are approved together.
  EventSuccessHostDraft normalizedForSelectedModules() {
    if (!selectedModuleIds.contains(
      EventSuccessModuleCatalog.guidedRotations.id,
    )) {
      return this;
    }
    if (structureConfig.unitKind == EventSuccessUnitKind.pairs &&
        structureConfig.unitSize == 2 &&
        structureConfig.rotationIntervalMinutes != null) {
      return this;
    }
    return copyWith(
      structureConfig: structureConfig.copyWith(
        unitKind: EventSuccessUnitKind.pairs,
        unitSize: 2,
        unitCount: null,
        rotationIntervalMinutes: structureConfig.rotationIntervalMinutes ?? 15,
      ),
    );
  }

  EventSuccessHostDraft copyWith({
    EventSuccessPlaybook? playbook,
    Set<String>? selectedModuleIds,
    int? targetAttendeeCount,
    EventSuccessStructureConfig? structureConfig,
    String? hostGoal,
    bool? wingmanRequestsEnabled,
    bool? contextualOpenersEnabled,
    bool? compatibilityAffectsRanking,
    EventSuccessQuestionnaireConfig? questionnaireConfig,
    EventSuccessConversationGraphConsentMode? conversationGraphConsentMode,
  }) {
    final resolvedPlaybook = playbook ?? this.playbook;
    final resolvedIds = selectedModuleIds ?? this.selectedModuleIds;
    final resolvedTargetAttendeeCount =
        targetAttendeeCount ?? this.targetAttendeeCount;
    final resolvedModuleIds = resolvedPlaybook.effectiveModuleSelection(
      resolvedIds,
    );
    final canUseCompatibilityRanking = resolvedModuleIds.contains(
      EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
    );
    final selectionChanged = playbook != null || selectedModuleIds != null;
    return EventSuccessHostDraft(
      playbook: resolvedPlaybook,
      selectedModuleIds: resolvedModuleIds,
      targetAttendeeCount: resolvedTargetAttendeeCount,
      structureConfig:
          structureConfig?.normalizedForTarget(resolvedTargetAttendeeCount) ??
          this.structureConfig.normalizedForTarget(resolvedTargetAttendeeCount),
      hostGoal: hostGoal ?? this.hostGoal,
      wingmanRequestsEnabled: selectionChanged
          ? resolvedModuleIds.contains(
              EventSuccessModuleCatalog.wingmanRequests.id,
            )
          : wingmanRequestsEnabled ?? this.wingmanRequestsEnabled,
      contextualOpenersEnabled: selectionChanged
          ? resolvedModuleIds.contains(
              EventSuccessModuleCatalog.contextualOpeners.id,
            )
          : contextualOpenersEnabled ?? this.contextualOpenersEnabled,
      compatibilityAffectsRanking:
          canUseCompatibilityRanking &&
          (compatibilityAffectsRanking ?? this.compatibilityAffectsRanking),
      questionnaireConfig: questionnaireConfig ?? this.questionnaireConfig,
      conversationGraphConsentMode:
          conversationGraphConsentMode ?? this.conversationGraphConsentMode,
    );
  }

  List<String> get readinessIssues {
    final issues = <String>[];
    if (!playbook.capacity.contains(targetAttendeeCount)) {
      issues.add(
        'Target attendance should stay within ${playbook.capacity.min}-${playbook.capacity.max} for this format.',
      );
    }
    if (hostGoal.trim().isEmpty) {
      issues.add('Add a host goal before saving the live guide.');
    }
    if (selectedModuleIds.contains(
          EventSuccessModuleCatalog.guidedRotations.id,
        ) &&
        (structureConfig.unitKind != EventSuccessUnitKind.pairs ||
            structureConfig.unitSize != 2)) {
      issues.add('Guided rotations require two-person pairs.');
    } else if (selectedModuleIds.contains(
          EventSuccessModuleCatalog.guidedRotations.id,
        ) &&
        structureConfig.rotationIntervalMinutes == null) {
      issues.add('Add a rotation cadence before using guided rotations.');
    }
    if (selectedModuleIds.contains(EventSuccessModuleCatalog.liveReveal.id) &&
        !selectedModuleIds.contains(
          EventSuccessModuleCatalog.guidedRotations.id,
        ) &&
        !selectedModuleIds.contains(EventSuccessModuleCatalog.microPods.id)) {
      issues.add('Live reveal needs a pod or rotation tool selected.');
    }
    if (wingmanRequestsEnabled &&
        !selectedModuleIds.contains(
          EventSuccessModuleCatalog.wingmanRequests.id,
        )) {
      issues.add(
        'Wingman requests are enabled, but the host-help tool is not selected.',
      );
    }
    if (contextualOpenersEnabled &&
        !selectedModuleIds.contains(
          EventSuccessModuleCatalog.contextualOpeners.id,
        )) {
      issues.add(
        'Post-match openers are enabled, but the conversation tool is not selected.',
      );
    }
    return issues;
  }
}

extension EventSuccessHostDraftPeopleMix on EventSuccessHostDraft {
  /// Reconciles the legacy grouping module ids with the visible structure.
  ///
  /// This is a presentation projection only: persisted ids and structure
  /// fields keep their existing schema, while the host sees one decision.
  EventSuccessHostDraft normalizedForPeopleMix() =>
      withPeopleMixStructure(structureConfig);

  EventSuccessHostDraft withPeopleMixUnitKind(EventSuccessUnitKind unitKind) {
    final nextStructure = switch (unitKind) {
      EventSuccessUnitKind.wholeGroup => structureConfig.copyWith(
        unitKind: unitKind,
        unitSize: targetAttendeeCount,
        unitCount: 1,
        rotationIntervalMinutes: null,
        balanceActivityAttributes: const [],
        clusterActivityAttributes: const [],
      ),
      EventSuccessUnitKind.pods => structureConfig.copyWith(
        unitKind: unitKind,
        unitSize: structureConfig.unitSize.clamp(3, 8).toInt(),
        unitCount: null,
        rotationIntervalMinutes: null,
      ),
      EventSuccessUnitKind.pairs => structureConfig.copyWith(
        unitKind: unitKind,
        unitSize: 2,
        unitCount: null,
        rotationIntervalMinutes: structureConfig.rotationIntervalMinutes ?? 15,
      ),
      EventSuccessUnitKind.teams => structureConfig.copyWith(
        unitKind: unitKind,
        unitSize: structureConfig.unitSize.clamp(3, 8).toInt(),
        unitCount: null,
        rotationIntervalMinutes: structureConfig.rotationIntervalMinutes ?? 15,
      ),
      EventSuccessUnitKind.tables => structureConfig.copyWith(
        unitKind: unitKind,
        unitSize: structureConfig.unitSize.clamp(3, 8).toInt(),
        rotationIntervalMinutes: structureConfig.rotationIntervalMinutes ?? 30,
      ),
    };
    return withPeopleMixStructure(nextStructure);
  }

  EventSuccessHostDraft withPeopleMixStructure(
    EventSuccessStructureConfig structure,
  ) {
    final selectedIds = {...effectiveSelectedModuleIds}
      ..remove(EventSuccessModuleCatalog.microPods.id)
      ..remove(EventSuccessModuleCatalog.guidedRotations.id);
    switch (structure.unitKind) {
      case EventSuccessUnitKind.wholeGroup:
        break;
      case EventSuccessUnitKind.pods:
        if (playbook.moduleIds.contains(
          EventSuccessModuleCatalog.microPods.id,
        )) {
          selectedIds.add(EventSuccessModuleCatalog.microPods.id);
        }
      case EventSuccessUnitKind.pairs ||
          EventSuccessUnitKind.teams ||
          EventSuccessUnitKind.tables:
        if (structure.rotationIntervalMinutes != null &&
            playbook.moduleIds.contains(
              EventSuccessModuleCatalog.guidedRotations.id,
            )) {
          selectedIds.add(EventSuccessModuleCatalog.guidedRotations.id);
        }
    }
    return copyWith(selectedModuleIds: selectedIds, structureConfig: structure);
  }
}

class EventSuccessLivePlan {
  const EventSuccessLivePlan({
    required this.playbook,
    required this.durationShape,
    required this.steps,
    required this.activeStepIndex,
    required this.checkedInCount,
    required this.bookedCount,
  }) : assert(activeStepIndex >= 0),
       assert(checkedInCount >= 0),
       assert(bookedCount >= 0);

  factory EventSuccessLivePlan.fromDraft(
    EventSuccessHostDraft draft, {
    int activeStepIndex = 1,
    int checkedInCount = 18,
    int bookedCount = 24,
  }) {
    return EventSuccessLivePlan(
      playbook: draft.playbook,
      durationShape: draft.playbook.durationShape,
      steps: draft.playbook.runOfShow,
      activeStepIndex: activeStepIndex.clamp(
        0,
        draft.playbook.runOfShow.length - 1,
      ),
      checkedInCount: checkedInCount,
      bookedCount: bookedCount,
    );
  }

  final EventSuccessPlaybook playbook;
  final EventSuccessDurationShape durationShape;
  final List<EventRunOfShowStep> steps;
  final int activeStepIndex;
  final int checkedInCount;
  final int bookedCount;

  EventRunOfShowStep get activeStep => steps[activeStepIndex];

  double get checkInProgress {
    if (bookedCount == 0) return 0;
    return (checkedInCount / bookedCount).clamp(0, 1);
  }

  double get runOfShowProgress {
    if (steps.isEmpty) return 0;
    return ((activeStepIndex + 1) / steps.length).clamp(0, 1);
  }
}

class EventSuccessAttendeeState {
  const EventSuccessAttendeeState({
    required this.eventTitle,
    required this.attendeeName,
    required this.podLabel,
    required this.prompt,
    required this.wingmanRequestCandidates,
    this.checkedIn = true,
    this.followUpOpen = true,
  });

  final String eventTitle;
  final String attendeeName;
  final String podLabel;
  final String prompt;
  final List<WingmanRequestCandidate> wingmanRequestCandidates;
  final bool checkedIn;
  final bool followUpOpen;
}

class WingmanRequestCandidate {
  const WingmanRequestCandidate({
    required this.displayName,
    required this.context,
    this.marked = false,
  });

  final String displayName;
  final String context;
  final bool marked;
}

abstract final class EventSuccessFeatureSamples {
  static final hostDraft = EventSuccessHostDraft.fromPlaybook(
    EventSuccessPlaybookLibrary.socialRun,
    targetAttendeeCount: 28,
  );

  static final livePlan = EventSuccessLivePlan.fromDraft(
    hostDraft,
    activeStepIndex: 2,
    checkedInCount: 22,
    bookedCount: 28,
  );

  static const attendeeState = EventSuccessAttendeeState(
    eventTitle: 'Saturday Social 5K',
    attendeeName: 'Aarav',
    podLabel: 'Pace pod B · 6:15-6:45/km',
    prompt: StructuredDomainCopy.eventSuccessSampleRaceTrainingPrompt,
    wingmanRequestCandidates: [
      WingmanRequestCandidate(
        displayName: 'Naina',
        context: 'Ran in your pace pod',
        marked: true,
      ),
      WingmanRequestCandidate(
        displayName: 'Rhea',
        context: 'Met during cooldown coffee',
      ),
      WingmanRequestCandidate(
        displayName: 'Meera',
        context: 'Answered the same race prompt',
      ),
    ],
  );

  static final postEventBrief = const EventSuccessCoach().analyze(
    playbook: EventSuccessPlaybookLibrary.socialRun,
    scorecard: EventSuccessSampleScorecards.needsStructure,
  );
}
