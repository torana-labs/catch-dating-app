// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_invite_link.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventInviteLink _$EventInviteLinkFromJson(Map<String, dynamic> json) =>
    _EventInviteLink(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      clubId: json['clubId'] as String,
      hostUid: json['hostUid'] as String,
      label: json['label'] as String,
      source: json['source'] as String?,
      openCount: (json['openCount'] as num?)?.toInt() ?? 0,
      requestCount: (json['requestCount'] as num?)?.toInt() ?? 0,
      confirmedCount: (json['confirmedCount'] as num?)?.toInt() ?? 0,
      paidCount: (json['paidCount'] as num?)?.toInt() ?? 0,
      checkedInCount: (json['checkedInCount'] as num?)?.toInt() ?? 0,
      catcherCount: (json['catcherCount'] as num?)?.toInt() ?? 0,
      matchCount: (json['matchCount'] as num?)?.toInt() ?? 0,
      chatStartedCount: (json['chatStartedCount'] as num?)?.toInt() ?? 0,
      disabledAt: const NullableTimestampConverter().fromJson(
        json['disabledAt'],
      ),
      createdAt: const TimestampConverter().fromJson(json['createdAt']),
      updatedAt: const TimestampConverter().fromJson(json['updatedAt']),
    );

Map<String, dynamic> _$EventInviteLinkToJson(
  _EventInviteLink instance,
) => <String, dynamic>{
  'eventId': instance.eventId,
  'clubId': instance.clubId,
  'hostUid': instance.hostUid,
  'label': instance.label,
  'source': instance.source,
  'openCount': instance.openCount,
  'requestCount': instance.requestCount,
  'confirmedCount': instance.confirmedCount,
  'paidCount': instance.paidCount,
  'checkedInCount': instance.checkedInCount,
  'catcherCount': instance.catcherCount,
  'matchCount': instance.matchCount,
  'chatStartedCount': instance.chatStartedCount,
  'disabledAt': const NullableTimestampConverter().toJson(instance.disabledAt),
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
};
