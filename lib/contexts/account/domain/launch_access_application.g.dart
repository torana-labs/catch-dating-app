// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'launch_access_application.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_LaunchAccessApplication _$LaunchAccessApplicationFromJson(
  Map<String, dynamic> json,
) => _LaunchAccessApplication(
  uid: json['uid'] as String? ?? '',
  applicationVersion: (json['applicationVersion'] as num?)?.toInt() ?? 1,
  status:
      $enumDecodeNullable(
        _$LaunchAccessApplicationStatusEnumMap,
        json['status'],
        unknownValue: LaunchAccessApplicationStatus.pending,
      ) ??
      LaunchAccessApplicationStatus.pending,
  city: json['city'] as String,
  role:
      $enumDecodeNullable(
        _$LaunchAccessRoleEnumMap,
        json['role'],
        unknownValue: LaunchAccessRole.member,
      ) ??
      LaunchAccessRole.member,
  eventTypes:
      (json['eventTypes'] as List<dynamic>?)
          ?.map((e) => $enumDecode(_$LaunchAccessEventTypeEnumMap, e))
          .toList() ??
      const [],
  availabilityWindows:
      (json['availabilityWindows'] as List<dynamic>?)
          ?.map((e) => $enumDecode(_$LaunchAccessAvailabilityWindowEnumMap, e))
          .toList() ??
      const [],
  wantsToHost: json['wantsToHost'] as bool? ?? false,
  inviteCode: json['inviteCode'] as String?,
  instagramHandle: json['instagramHandle'] as String?,
  referralSource: json['referralSource'] as String?,
  whyCatch: json['whyCatch'] as String?,
  cohortId: json['cohortId'] as String?,
  hostUserId: json['hostUserId'] as String?,
  reviewerUid: json['reviewerUid'] as String?,
  reviewNote: json['reviewNote'] as String?,
  submissionCount: (json['submissionCount'] as num?)?.toInt() ?? 1,
  createdAt: const NullableTimestampConverter().fromJson(json['createdAt']),
  submittedAt: const NullableTimestampConverter().fromJson(json['submittedAt']),
  updatedAt: const NullableTimestampConverter().fromJson(json['updatedAt']),
  reviewedAt: const NullableTimestampConverter().fromJson(json['reviewedAt']),
);

Map<String, dynamic> _$LaunchAccessApplicationToJson(
  _LaunchAccessApplication instance,
) => <String, dynamic>{
  'applicationVersion': instance.applicationVersion,
  'status': _$LaunchAccessApplicationStatusEnumMap[instance.status]!,
  'city': instance.city,
  'role': _$LaunchAccessRoleEnumMap[instance.role]!,
  'eventTypes': instance.eventTypes
      .map((e) => _$LaunchAccessEventTypeEnumMap[e]!)
      .toList(),
  'availabilityWindows': instance.availabilityWindows
      .map((e) => _$LaunchAccessAvailabilityWindowEnumMap[e]!)
      .toList(),
  'wantsToHost': instance.wantsToHost,
  'inviteCode': instance.inviteCode,
  'instagramHandle': instance.instagramHandle,
  'referralSource': instance.referralSource,
  'whyCatch': instance.whyCatch,
  'cohortId': instance.cohortId,
  'hostUserId': instance.hostUserId,
  'reviewerUid': instance.reviewerUid,
  'reviewNote': instance.reviewNote,
  'submissionCount': instance.submissionCount,
  'createdAt': const NullableTimestampConverter().toJson(instance.createdAt),
  'submittedAt': const NullableTimestampConverter().toJson(
    instance.submittedAt,
  ),
  'updatedAt': const NullableTimestampConverter().toJson(instance.updatedAt),
  'reviewedAt': const NullableTimestampConverter().toJson(instance.reviewedAt),
};

const _$LaunchAccessApplicationStatusEnumMap = {
  LaunchAccessApplicationStatus.pending: 'pending',
  LaunchAccessApplicationStatus.waitlisted: 'waitlisted',
  LaunchAccessApplicationStatus.invited: 'invited',
  LaunchAccessApplicationStatus.approvedForProfile: 'approvedForProfile',
  LaunchAccessApplicationStatus.activeMember: 'activeMember',
  LaunchAccessApplicationStatus.paused: 'paused',
  LaunchAccessApplicationStatus.notSelectedYet: 'notSelectedYet',
};

const _$LaunchAccessRoleEnumMap = {
  LaunchAccessRole.member: 'member',
  LaunchAccessRole.host: 'host',
  LaunchAccessRole.both: 'both',
};

const _$LaunchAccessEventTypeEnumMap = {
  LaunchAccessEventType.runClub: 'runClub',
  LaunchAccessEventType.walkingSocial: 'walkingSocial',
  LaunchAccessEventType.coffee: 'coffee',
  LaunchAccessEventType.boardGames: 'boardGames',
  LaunchAccessEventType.fitnessClass: 'fitnessClass',
  LaunchAccessEventType.food: 'food',
  LaunchAccessEventType.culture: 'culture',
};

const _$LaunchAccessAvailabilityWindowEnumMap = {
  LaunchAccessAvailabilityWindow.weekdayMornings: 'weekdayMornings',
  LaunchAccessAvailabilityWindow.weekdayEvenings: 'weekdayEvenings',
  LaunchAccessAvailabilityWindow.saturdayMornings: 'saturdayMornings',
  LaunchAccessAvailabilityWindow.saturdayEvenings: 'saturdayEvenings',
  LaunchAccessAvailabilityWindow.sundayMornings: 'sundayMornings',
  LaunchAccessAvailabilityWindow.sundayEvenings: 'sundayEvenings',
};
