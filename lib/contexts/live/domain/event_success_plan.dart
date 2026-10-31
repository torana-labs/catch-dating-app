import 'dart:math' as math;

import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/formats/formats.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_assignment.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_preference.dart';
import 'package:catch_dating_app/contexts/live/domain/event_success_wingman_request.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_success_plan.freezed.dart';
part 'event_success_plan.g.dart';

enum EventSuccessPlanStatus { setup, live, complete }

enum EventSuccessRevealStatus { idle, countingDown, revealed }

@freezed
abstract class EventSuccessPlan with _$EventSuccessPlan {
  const EventSuccessPlan._();

  const factory EventSuccessPlan({
    @JsonKey(includeToJson: false) required String id,
    required String eventId,
    required String organizerId,
    String? layoutId,
    required String playbookId,
    required List<String> selectedModuleIds,
    required int targetAttendeeCount,
    @Default(EventSuccessStructureConfig.legacyDefault())
    EventSuccessStructureConfig structureConfig,
    required String hostGoal,
    @Default(true) bool wingmanRequestsEnabled,
    @Default(true) bool contextualOpenersEnabled,
    @Default(false) bool compatibilityAffectsRanking,
    @Default(EventSuccessQuestionnaireConfig.defaultTemplate())
    EventSuccessQuestionnaireConfig questionnaireConfig,
    @Default(EventSuccessConversationGraphConsentMode.optIn)
    EventSuccessConversationGraphConsentMode conversationGraphConsentMode,
    @Default(0) int activeStepIndex,
    @Default(0) int liveControlRevision,
    @Default(0) int assignmentDraftRevision,
    @Default(-1) int publishedRotationRoundIndex,
    @Default(-1) int publishedRevealRoundIndex,
    @Default(EventSuccessPlanStatus.setup) EventSuccessPlanStatus status,
    @Default(EventSuccessRevealStatus.idle)
    EventSuccessRevealStatus revealStatus,
    @Default(0) int activeRevealRoundIndex,
    @NullableTimestampConverter() DateTime? revealStartedAt,
    String? attendeePrompt,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
    @NullableTimestampConverter() DateTime? frozenAt,
    @NullableTimestampConverter() DateTime? completedAt,
  }) = _EventSuccessPlan;

  factory EventSuccessPlan.fromJson(Map<String, dynamic> json) =>
      _$EventSuccessPlanFromJson(json);

  factory EventSuccessPlan.defaultForEvent(
    Event event, {
    required DateTime now,
  }) {
    final draft = EventSuccessHostDraft.fromFormat(
      event.eventFormat,
      targetAttendeeCount: math.max(1, event.capacityLimit),
    );
    return EventSuccessPlan.fromDraft(
      id: event.id,
      eventId: event.id,
      organizerId: event.organizerId,
      draft: draft,
      createdAt: now,
      updatedAt: now,
    );
  }

  /// Builds an event's plan from the format settings chosen for it, sized to
  /// the event's capacity.
  factory EventSuccessPlan.fromDefaults(
    EventSuccessDefaults defaults,
    Event event, {
    required DateTime now,
  }) {
    final targetAttendeeCount = math.max(1, event.capacityLimit);
    final normalized = defaults.normalizedForFormat(
      event.eventFormat,
      targetAttendeeCount: targetAttendeeCount,
    );
    final attendeePrompt = normalized.attendeePrompt?.trim();
    return EventSuccessPlan.fromDraft(
      id: event.id,
      eventId: event.id,
      organizerId: event.organizerId,
      layoutId: normalized.layoutId,
      draft: normalized.toDraft(targetAttendeeCount: targetAttendeeCount),
      createdAt: now,
      updatedAt: now,
      attendeePrompt: attendeePrompt == null || attendeePrompt.isEmpty
          ? null
          : attendeePrompt,
    );
  }

  factory EventSuccessPlan.fromDraft({
    required String id,
    required String eventId,
    required String organizerId,
    String? layoutId,
    required EventSuccessHostDraft draft,
    required DateTime createdAt,
    required DateTime updatedAt,
    int activeStepIndex = 0,
    EventSuccessPlanStatus status = EventSuccessPlanStatus.setup,
    DateTime? frozenAt,
    DateTime? completedAt,
    String? attendeePrompt,
  }) {
    final selectedModuleIds = draft.playbook.effectiveModuleSelection(
      draft.selectedModuleIds,
    );
    return EventSuccessPlan(
      id: id,
      eventId: eventId,
      organizerId: organizerId,
      layoutId: layoutId,
      playbookId: draft.playbook.id,
      selectedModuleIds: _stableModuleIds(selectedModuleIds),
      targetAttendeeCount: draft.targetAttendeeCount,
      structureConfig: draft.structureConfig,
      hostGoal: _persistedHostGoal(draft),
      // Legacy flags intentionally use their hardcoded `true` defaults.
      compatibilityAffectsRanking: draft.compatibilityAffectsRanking,
      questionnaireConfig: draft.questionnaireConfig.normalized(),
      conversationGraphConsentMode: draft.conversationGraphConsentMode,
      activeStepIndex: activeStepIndex,
      status: status,
      attendeePrompt: attendeePrompt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      frozenAt: frozenAt,
      completedAt: completedAt,
    );
  }

  EventSuccessPlaybook get playbook =>
      EventSuccessPlaybookLibrary.byIdOrDefault(playbookId);

  Set<String> get effectiveSelectedModuleIds =>
      playbook.effectiveModuleSelection(selectedModuleIds);

  EventSuccessHostDraft get hostDraft => EventSuccessHostDraft(
    playbook: playbook,
    selectedModuleIds: effectiveSelectedModuleIds,
    targetAttendeeCount: targetAttendeeCount,
    structureConfig: structureConfig,
    hostGoal: hostGoal,
    compatibilityAffectsRanking: compatibilityAffectsRanking,
    questionnaireConfig: questionnaireConfig,
    conversationGraphConsentMode: conversationGraphConsentMode,
  );

  List<EventSuccessModule> get selectedModules => playbook.modules
      .where((module) => effectiveSelectedModuleIds.contains(module.id))
      .toList(growable: false);

  bool hasModule(String moduleId) =>
      effectiveSelectedModuleIds.contains(moduleId);

  bool get liveRevealConfigured =>
      hasModule(EventSuccessModuleCatalog.liveReveal.id);

  /// Reveal end time derived from the server-anchored [revealStartedAt] plus
  /// the persisted countdown duration. Keeping this derived — rather than a
  /// stored field written from the host device clock — means every device
  /// computes the same end time from one server-authoritative anchor.
  DateTime? get revealEndsAt {
    final startedAt = revealStartedAt;
    if (startedAt == null) return null;
    return startedAt.add(
      Duration(seconds: structureConfig.revealCountdownSeconds),
    );
  }

  bool isRevealCountdownRunning(DateTime now) =>
      revealStatus == EventSuccessRevealStatus.countingDown &&
      revealEndsAt != null &&
      revealEndsAt!.isAfter(now);

  Duration revealRemaining(DateTime now) {
    final endsAt = revealEndsAt;
    if (endsAt == null || !endsAt.isAfter(now)) return Duration.zero;
    return endsAt.difference(now);
  }

  double revealProgress(DateTime now) {
    if (revealStatus == EventSuccessRevealStatus.revealed) return 1;
    final startedAt = revealStartedAt;
    final endsAt = revealEndsAt;
    if (revealStatus != EventSuccessRevealStatus.countingDown ||
        startedAt == null ||
        endsAt == null ||
        !endsAt.isAfter(startedAt)) {
      return 0;
    }
    final totalMs = endsAt.difference(startedAt).inMilliseconds;
    final elapsedMs = now.difference(startedAt).inMilliseconds;
    return (elapsedMs / totalMs).clamp(0, 1).toDouble();
  }

  int revealedThroughRoundIndex(DateTime now) {
    final activeIndex = math.max(0, activeRevealRoundIndex);
    final legacyPublishedIndex =
        revealStatus == EventSuccessRevealStatus.revealed ? activeIndex : -1;
    final persistedPublishedIndex = math.max(
      publishedRevealRoundIndex,
      legacyPublishedIndex,
    );
    if (revealStatus == EventSuccessRevealStatus.countingDown &&
        !isRevealCountdownRunning(now) &&
        revealEndsAt != null) {
      return math.max(persistedPublishedIndex, activeIndex);
    }
    return persistedPublishedIndex;
  }

  bool isRoundRevealed(int roundIndex, DateTime now) =>
      roundIndex <= revealedThroughRoundIndex(now);

  int? nextRevealRoundIndex({required int roundCount, required DateTime now}) {
    if (roundCount <= 0) return null;
    final nextIndex = revealedThroughRoundIndex(now) + 1;
    if (nextIndex >= roundCount) return null;
    return math.max(0, nextIndex);
  }

  bool allRevealRoundsShown({required int roundCount, required DateTime now}) =>
      roundCount > 0 &&
      nextRevealRoundIndex(roundCount: roundCount, now: now) == null;

  EventSuccessPlan copyWithDraft(
    EventSuccessHostDraft draft, {
    required DateTime updatedAt,
  }) {
    final selectedModuleIds = draft.playbook.effectiveModuleSelection(
      draft.selectedModuleIds,
    );
    return copyWith(
      playbookId: draft.playbook.id,
      selectedModuleIds: _stableModuleIds(selectedModuleIds),
      targetAttendeeCount: draft.targetAttendeeCount,
      structureConfig: draft.structureConfig,
      hostGoal: _persistedHostGoal(draft),
      wingmanRequestsEnabled: true,
      contextualOpenersEnabled: true,
      compatibilityAffectsRanking: draft.compatibilityAffectsRanking,
      questionnaireConfig: draft.questionnaireConfig.normalized(),
      conversationGraphConsentMode: draft.conversationGraphConsentMode,
      updatedAt: updatedAt,
    );
  }

  EventSuccessLivePlan livePlan({
    required int bookedCount,
    required int checkedInCount,
  }) {
    return EventSuccessLivePlan.fromDraft(
      hostDraft,
      activeStepIndex: activeStepIndex,
      bookedCount: bookedCount,
      checkedInCount: checkedInCount,
    );
  }

  String attendeePromptFor(Event event) {
    final configured = attendeePrompt?.trim();
    if (configured != null && configured.isNotEmpty) return configured;
    return EventSuccessActivityProfile.forFormat(
      event.eventFormat,
      targetAttendeeCount: targetAttendeeCount,
    ).defaultAttendeePrompt;
  }

  EventSuccessBrief buildBriefFromScorecard({
    required Event event,
    required EventSuccessScorecard scorecard,
    List<EventSuccessAssignment>? assignments,
    List<EventSuccessAssignment>? rotationAssignments,
    List<EventSuccessPreference>? preferences,
    List<EventSuccessWingmanRequest>? wingmanRequests,
  }) {
    final assignedUids = assignments == null && rotationAssignments == null
        ? null
        : _assignmentParticipantUids([
            ...?assignments,
            ...?rotationAssignments,
          ]);
    final optedOutUids = preferences
        ?.where(
          (preference) =>
              preference.microPodsOptedOut ||
              preference.guidedRotationsOptedOut,
        )
        .map((preference) => preference.uid)
        .toSet();
    return const EventSuccessCoach().analyze(
      playbook: playbook,
      scorecard: scorecard.copyWith(
        bookedCount: event.signedUpCount,
        checkedInCount: event.attendedCount,
        assignmentParticipantCount: assignedUids?.length,
        assignmentOptOutCount: optedOutUids?.length,
        wingmanRequestCount: wingmanRequests
            ?.where((request) => request.isActive)
            .length,
      ),
    );
  }
}

String _persistedHostGoal(EventSuccessHostDraft draft) {
  final normalized = draft.hostGoal.trim();
  if (normalized.isNotEmpty) return normalized;
  return EventSuccessHostDraft.fromPlaybook(
    draft.playbook,
    targetAttendeeCount: draft.targetAttendeeCount,
  ).hostGoal;
}

Set<String> _assignmentParticipantUids(
  Iterable<EventSuccessAssignment> assignments,
) {
  final uids = <String>{};
  for (final assignment in assignments) {
    uids.add(assignment.uid);
    uids.addAll(assignment.allPeerUids);
  }
  return uids;
}

@freezed
abstract class EventSuccessFeedback with _$EventSuccessFeedback {
  const factory EventSuccessFeedback({
    @JsonKey(includeToJson: false) required String id,
    required String eventId,
    required String organizerId,
    required String uid,
    required int welcomeRating,
    required int structureRating,
    required int metNewPeopleCount,
    @Default(false) bool safetyConcern,
    String? privateNote,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
  }) = _EventSuccessFeedback;

  factory EventSuccessFeedback.fromJson(Map<String, dynamic> json) =>
      _$EventSuccessFeedbackFromJson(json);
}

String eventSuccessFeedbackId({required String eventId, required String uid}) =>
    '${eventId}_$uid';

List<String> _stableModuleIds(Iterable<String> ids) {
  final values = ids.toSet().toList()..sort();
  return List.unmodifiable(values);
}
