// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_defaults.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventSuccessDefaults _$EventSuccessDefaultsFromJson(
  Map<String, dynamic> json,
) => _EventSuccessDefaults(
  enabled: json['enabled'] as bool? ?? false,
  layoutId: json['layoutId'] as String?,
  playbookId: json['playbookId'] as String? ?? 'social_run_light',
  selectedModuleIds:
      (json['selectedModuleIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  moduleSelectionConfigured:
      json['moduleSelectionConfigured'] as bool? ?? false,
  structureConfig: json['structureConfig'] == null
      ? const EventSuccessStructureConfig.legacyDefault()
      : EventSuccessStructureConfig.fromJson(
          json['structureConfig'] as Map<String, dynamic>,
        ),
  hostGoal:
      json['hostGoal'] as String? ??
      StructuredDomainCopy.eventSuccessDefaultHostGoal,
  wingmanRequestsEnabled: json['wingmanRequestsEnabled'] as bool? ?? true,
  contextualOpenersEnabled: json['contextualOpenersEnabled'] as bool? ?? true,
  compatibilityAffectsRanking:
      json['compatibilityAffectsRanking'] as bool? ?? false,
  questionnaireConfig: json['questionnaireConfig'] == null
      ? const EventSuccessQuestionnaireConfig.defaultTemplate()
      : EventSuccessQuestionnaireConfig.fromJson(
          json['questionnaireConfig'] as Map<String, dynamic>?,
        ),
  attendeePrompt: json['attendeePrompt'] as String?,
);

Map<String, dynamic> _$EventSuccessDefaultsToJson(
  _EventSuccessDefaults instance,
) => <String, dynamic>{
  'enabled': instance.enabled,
  'layoutId': instance.layoutId,
  'playbookId': instance.playbookId,
  'selectedModuleIds': instance.selectedModuleIds,
  'moduleSelectionConfigured': instance.moduleSelectionConfigured,
  'structureConfig': instance.structureConfig.toJson(),
  'hostGoal': instance.hostGoal,
  'wingmanRequestsEnabled': instance.wingmanRequestsEnabled,
  'contextualOpenersEnabled': instance.contextualOpenersEnabled,
  'compatibilityAffectsRanking': instance.compatibilityAffectsRanking,
  'questionnaireConfig': instance.questionnaireConfig.toJson(),
  'attendeePrompt': instance.attendeePrompt,
};
