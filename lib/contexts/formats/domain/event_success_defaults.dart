import 'package:catch_dating_app/contexts/formats/domain/event_success_activity_profile.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_compatibility_response.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_feature_state.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_playbooks.dart';
import 'package:catch_dating_app/contexts/formats/domain/event_success_structure.dart';
import 'package:catch_dating_app/kernel/activity_taxonomy.dart';
import 'package:catch_dating_app/l10n/generated/structured_domain_copy.g.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_success_defaults.freezed.dart';
part 'event_success_defaults.g.dart';

@freezed
abstract class EventSuccessDefaults with _$EventSuccessDefaults {
  const EventSuccessDefaults._();

  const factory EventSuccessDefaults({
    @Default(false) bool enabled,
    String? layoutId,
    @Default('social_run_light') String playbookId,
    @Default(<String>[]) List<String> selectedModuleIds,
    @Default(false) bool moduleSelectionConfigured,
    @Default(EventSuccessStructureConfig.legacyDefault())
    EventSuccessStructureConfig structureConfig,
    @Default(StructuredDomainCopy.eventSuccessDefaultHostGoal) String hostGoal,
    @Deprecated(
      'Platform-owned and always true; retained only for stored-schema compatibility.',
    )
    @Default(true)
    bool wingmanRequestsEnabled,
    @Deprecated(
      'Platform-owned and always true; retained only for stored-schema compatibility.',
    )
    @Default(true)
    bool contextualOpenersEnabled,
    @Default(false) bool compatibilityAffectsRanking,
    @Default(EventSuccessQuestionnaireConfig.defaultTemplate())
    EventSuccessQuestionnaireConfig questionnaireConfig,
    String? attendeePrompt,
  }) = _EventSuccessDefaults;

  factory EventSuccessDefaults.fromJson(Map<String, dynamic> json) =>
      _$EventSuccessDefaultsFromJson(json);

  factory EventSuccessDefaults.fromDraft(
    EventSuccessHostDraft draft, {
    bool enabled = true,
    String? layoutId,
    String? attendeePrompt,
  }) {
    final selectedModuleIds = draft.playbook.effectiveModuleSelection(
      draft.selectedModuleIds,
    );
    return EventSuccessDefaults(
      enabled: enabled,
      layoutId: _trimToNull(layoutId),
      playbookId: draft.playbook.id,
      selectedModuleIds: selectedModuleIds.toList()..sort(),
      moduleSelectionConfigured: true,
      structureConfig: draft.structureConfig,
      hostGoal: draft.hostGoal,
      // Legacy flags intentionally use their hardcoded `true` defaults.
      compatibilityAffectsRanking: draft.compatibilityAffectsRanking,
      questionnaireConfig: draft.questionnaireConfig,
      attendeePrompt: _trimToNull(attendeePrompt),
    );
  }

  factory EventSuccessDefaults.recommendedForActivity(
    ActivityKind activityKind, {
    bool enabled = false,
    int? targetAttendeeCount,
    String? attendeePrompt,
  }) => EventSuccessDefaults.recommendedForFormat(
    EventFormatSnapshot.fromActivityKind(activityKind),
    enabled: enabled,
    targetAttendeeCount: targetAttendeeCount,
    attendeePrompt: attendeePrompt,
  );

  factory EventSuccessDefaults.recommendedForFormat(
    EventFormatSnapshot format, {
    bool enabled = false,
    int? targetAttendeeCount,
    String? attendeePrompt,
  }) {
    return EventSuccessDefaults.fromDraft(
      EventSuccessHostDraft.fromFormat(
        format,
        targetAttendeeCount: targetAttendeeCount,
      ),
      enabled: enabled,
      attendeePrompt: attendeePrompt,
    );
  }

  EventSuccessHostDraft toDraft({int? targetAttendeeCount}) {
    final playbook = EventSuccessPlaybookLibrary.byIdOrDefault(playbookId);
    final defaultDraft = EventSuccessHostDraft.fromPlaybook(
      playbook,
      targetAttendeeCount: targetAttendeeCount,
    );
    final selectedIds = selectedModuleIds
        .where(playbook.moduleIds.contains)
        .toSet();
    final hasExplicitSelection =
        moduleSelectionConfigured || selectedModuleIds.isNotEmpty;
    final configuredSelectedIds = hasExplicitSelection
        ? selectedIds
        : defaultDraft.selectedModuleIds;
    final resolvedSelectedIds = playbook.effectiveModuleSelection(
      configuredSelectedIds,
    );
    return defaultDraft.copyWith(
      selectedModuleIds: resolvedSelectedIds,
      structureConfig: structureConfig.isLegacyDefault
          ? defaultDraft.structureConfig
          : structureConfig,
      hostGoal: hostGoal.trim().isEmpty ? defaultDraft.hostGoal : hostGoal,
      // Legacy flags intentionally use their hardcoded `true` defaults.
      compatibilityAffectsRanking: compatibilityAffectsRanking,
      questionnaireConfig: questionnaireConfig,
    );
  }

  EventSuccessDefaults normalizedForActivity(
    ActivityKind activityKind, {
    int? targetAttendeeCount,
  }) => normalizedForFormat(
    EventFormatSnapshot.fromActivityKind(activityKind),
    targetAttendeeCount: targetAttendeeCount,
  );

  EventSuccessDefaults normalizedForFormat(
    EventFormatSnapshot format, {
    int? targetAttendeeCount,
  }) {
    final recommended = EventSuccessDefaults.recommendedForFormat(
      format,
      enabled: enabled,
      targetAttendeeCount: targetAttendeeCount,
      attendeePrompt: attendeePrompt,
    );
    final recommendedDraft = recommended.toDraft(
      targetAttendeeCount: targetAttendeeCount,
    );
    final profile = EventSuccessActivityProfile.forFormat(
      format,
      targetAttendeeCount: targetAttendeeCount,
    );
    final currentPlaybook = EventSuccessPlaybookLibrary.byIdOrDefault(
      playbookId,
    );
    final currentSelectedIds = selectedModuleIds
        .where(recommendedDraft.playbook.moduleIds.contains)
        .where(profile.isSelectable)
        .toSet();
    final useCurrentSelectedIds =
        (moduleSelectionConfigured || selectedModuleIds.isNotEmpty) &&
        currentPlaybook.id == profile.playbook.id;
    final playbookChanged = currentPlaybook.id != profile.playbook.id;
    final configuredSelectedIds = useCurrentSelectedIds
        ? currentSelectedIds
        : recommendedDraft.selectedModuleIds;
    final selectedIds = profile.playbook.effectiveModuleSelection(
      configuredSelectedIds,
    );
    final compatibilitySelected = selectedIds.contains(
      EventSuccessModuleCatalog.compatibilityQuestionnaire.id,
    );

    return EventSuccessDefaults.fromDraft(
      recommendedDraft.copyWith(
        selectedModuleIds: selectedIds,
        structureConfig:
            _shouldUseRecommendedStructure(
              format,
              structureConfig,
              targetAttendeeCount,
              playbookChanged,
            )
            ? recommendedDraft.structureConfig
            : structureConfig,
        hostGoal: hostGoal.trim().isEmpty
            ? recommendedDraft.hostGoal
            : hostGoal,
        // Legacy flags intentionally use their hardcoded `true` defaults.
        compatibilityAffectsRanking:
            compatibilitySelected &&
            (useCurrentSelectedIds
                ? compatibilityAffectsRanking
                : recommendedDraft.compatibilityAffectsRanking),
        questionnaireConfig: questionnaireConfig,
      ),
      enabled: enabled,
      layoutId: layoutId,
      attendeePrompt: attendeePrompt,
    );
  }
}

String? _trimToNull(String? value) {
  final normalized = value?.trim();
  if (normalized == null || normalized.isEmpty) return null;
  return normalized;
}

bool _shouldUseRecommendedStructure(
  EventFormatSnapshot format,
  EventSuccessStructureConfig structureConfig,
  int? targetAttendeeCount,
  bool playbookChanged,
) {
  if (playbookChanged) return true;
  if (structureConfig.isLegacyDefault) return true;
  return targetAttendeeCount != null &&
      format.interactionModel == EventInteractionModel.teamRotations &&
      structureConfig.isDeprecatedTeamRotationDefault;
}
