// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_success_plan.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventSuccessPlan _$EventSuccessPlanFromJson(
  Map<String, dynamic> json,
) => _EventSuccessPlan(
  id: json['id'] as String,
  eventId: json['eventId'] as String,
  clubId: json['clubId'] as String,
  layoutId: json['layoutId'] as String?,
  playbookId: json['playbookId'] as String,
  selectedModuleIds: (json['selectedModuleIds'] as List<dynamic>)
      .map((e) => e as String)
      .toList(),
  targetAttendeeCount: (json['targetAttendeeCount'] as num).toInt(),
  structureConfig: json['structureConfig'] == null
      ? const EventSuccessStructureConfig.legacyDefault()
      : EventSuccessStructureConfig.fromJson(
          json['structureConfig'] as Map<String, dynamic>,
        ),
  hostGoal: json['hostGoal'] as String,
  wingmanRequestsEnabled: json['wingmanRequestsEnabled'] as bool? ?? true,
  contextualOpenersEnabled: json['contextualOpenersEnabled'] as bool? ?? true,
  compatibilityAffectsRanking:
      json['compatibilityAffectsRanking'] as bool? ?? false,
  questionnaireConfig: json['questionnaireConfig'] == null
      ? const EventSuccessQuestionnaireConfig.defaultTemplate()
      : EventSuccessQuestionnaireConfig.fromJson(
          json['questionnaireConfig'] as Map<String, dynamic>?,
        ),
  conversationGraphConsentMode:
      $enumDecodeNullable(
        _$EventSuccessConversationGraphConsentModeEnumMap,
        json['conversationGraphConsentMode'],
      ) ??
      EventSuccessConversationGraphConsentMode.optIn,
  activeStepIndex: (json['activeStepIndex'] as num?)?.toInt() ?? 0,
  liveControlRevision: (json['liveControlRevision'] as num?)?.toInt() ?? 0,
  assignmentDraftRevision:
      (json['assignmentDraftRevision'] as num?)?.toInt() ?? 0,
  publishedRotationRoundIndex:
      (json['publishedRotationRoundIndex'] as num?)?.toInt() ?? -1,
  publishedRevealRoundIndex:
      (json['publishedRevealRoundIndex'] as num?)?.toInt() ?? -1,
  status:
      $enumDecodeNullable(_$EventSuccessPlanStatusEnumMap, json['status']) ??
      EventSuccessPlanStatus.setup,
  revealStatus:
      $enumDecodeNullable(
        _$EventSuccessRevealStatusEnumMap,
        json['revealStatus'],
      ) ??
      EventSuccessRevealStatus.idle,
  activeRevealRoundIndex:
      (json['activeRevealRoundIndex'] as num?)?.toInt() ?? 0,
  revealStartedAt: const NullableTimestampConverter().fromJson(
    json['revealStartedAt'],
  ),
  attendeePrompt: json['attendeePrompt'] as String?,
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  updatedAt: const TimestampConverter().fromJson(json['updatedAt']),
  frozenAt: const NullableTimestampConverter().fromJson(json['frozenAt']),
  completedAt: const NullableTimestampConverter().fromJson(json['completedAt']),
);

Map<String, dynamic> _$EventSuccessPlanToJson(_EventSuccessPlan instance) =>
    <String, dynamic>{
      'eventId': instance.eventId,
      'clubId': instance.clubId,
      'layoutId': instance.layoutId,
      'playbookId': instance.playbookId,
      'selectedModuleIds': instance.selectedModuleIds,
      'targetAttendeeCount': instance.targetAttendeeCount,
      'structureConfig': instance.structureConfig.toJson(),
      'hostGoal': instance.hostGoal,
      'wingmanRequestsEnabled': instance.wingmanRequestsEnabled,
      'contextualOpenersEnabled': instance.contextualOpenersEnabled,
      'compatibilityAffectsRanking': instance.compatibilityAffectsRanking,
      'questionnaireConfig': instance.questionnaireConfig.toJson(),
      'conversationGraphConsentMode':
          _$EventSuccessConversationGraphConsentModeEnumMap[instance
              .conversationGraphConsentMode]!,
      'activeStepIndex': instance.activeStepIndex,
      'liveControlRevision': instance.liveControlRevision,
      'assignmentDraftRevision': instance.assignmentDraftRevision,
      'publishedRotationRoundIndex': instance.publishedRotationRoundIndex,
      'publishedRevealRoundIndex': instance.publishedRevealRoundIndex,
      'status': _$EventSuccessPlanStatusEnumMap[instance.status]!,
      'revealStatus': _$EventSuccessRevealStatusEnumMap[instance.revealStatus]!,
      'activeRevealRoundIndex': instance.activeRevealRoundIndex,
      'revealStartedAt': const NullableTimestampConverter().toJson(
        instance.revealStartedAt,
      ),
      'attendeePrompt': instance.attendeePrompt,
      'createdAt': const TimestampConverter().toJson(instance.createdAt),
      'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
      'frozenAt': const NullableTimestampConverter().toJson(instance.frozenAt),
      'completedAt': const NullableTimestampConverter().toJson(
        instance.completedAt,
      ),
    };

const _$EventSuccessConversationGraphConsentModeEnumMap = {
  EventSuccessConversationGraphConsentMode.optIn: 'optIn',
  EventSuccessConversationGraphConsentMode.optOut: 'optOut',
};

const _$EventSuccessPlanStatusEnumMap = {
  EventSuccessPlanStatus.setup: 'setup',
  EventSuccessPlanStatus.live: 'live',
  EventSuccessPlanStatus.complete: 'complete',
};

const _$EventSuccessRevealStatusEnumMap = {
  EventSuccessRevealStatus.idle: 'idle',
  EventSuccessRevealStatus.countingDown: 'countingDown',
  EventSuccessRevealStatus.revealed: 'revealed',
};

_EventSuccessFeedback _$EventSuccessFeedbackFromJson(
  Map<String, dynamic> json,
) => _EventSuccessFeedback(
  id: json['id'] as String,
  eventId: json['eventId'] as String,
  clubId: json['clubId'] as String,
  uid: json['uid'] as String,
  welcomeRating: (json['welcomeRating'] as num).toInt(),
  structureRating: (json['structureRating'] as num).toInt(),
  metNewPeopleCount: (json['metNewPeopleCount'] as num).toInt(),
  safetyConcern: json['safetyConcern'] as bool? ?? false,
  privateNote: json['privateNote'] as String?,
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  updatedAt: const TimestampConverter().fromJson(json['updatedAt']),
);

Map<String, dynamic> _$EventSuccessFeedbackToJson(
  _EventSuccessFeedback instance,
) => <String, dynamic>{
  'eventId': instance.eventId,
  'clubId': instance.clubId,
  'uid': instance.uid,
  'welcomeRating': instance.welcomeRating,
  'structureRating': instance.structureRating,
  'metNewPeopleCount': instance.metNewPeopleCount,
  'safetyConcern': instance.safetyConcern,
  'privateNote': instance.privateNote,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
};
