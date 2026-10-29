// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'match.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Match _$MatchFromJson(Map<String, dynamic> json) => _Match(
  id: json['id'] as String,
  user1Id: json['user1Id'] as String,
  user2Id: json['user2Id'] as String,
  eventIds:
      (_readEventIds(json, 'eventIds') as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  lastMessageAt: const NullableTimestampConverter().fromJson(
    json['lastMessageAt'],
  ),
  lastMessagePreview: json['lastMessagePreview'] as String?,
  lastMessageSenderId: json['lastMessageSenderId'] as String?,
  unreadCounts:
      (json['unreadCounts'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, (e as num).toInt()),
      ) ??
      const {},
  status:
      $enumDecodeNullable(_$MatchStatusEnumMap, json['status']) ??
      MatchStatus.active,
  blockedBy: json['blockedBy'] as String?,
  blockedAt: const NullableTimestampConverter().fromJson(json['blockedAt']),
  conversationType:
      $enumDecodeNullable(
        _$MatchConversationTypeEnumMap,
        json['conversationType'],
        unknownValue: MatchConversationType.match,
      ) ??
      MatchConversationType.match,
  clubId: json['clubId'] as String?,
  organizerId: json['organizerId'] as String?,
  crossPathsInvitationId: json['crossPathsInvitationId'] as String?,
  eventPlanExpiresAt: const NullableTimestampConverter().fromJson(
    json['eventPlanExpiresAt'],
  ),
  closedAt: const NullableTimestampConverter().fromJson(json['closedAt']),
);

Map<String, dynamic> _$MatchToJson(_Match instance) => <String, dynamic>{
  'user1Id': instance.user1Id,
  'user2Id': instance.user2Id,
  'eventIds': instance.eventIds,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'lastMessageAt': const NullableTimestampConverter().toJson(
    instance.lastMessageAt,
  ),
  'lastMessagePreview': instance.lastMessagePreview,
  'lastMessageSenderId': instance.lastMessageSenderId,
  'unreadCounts': instance.unreadCounts,
  'status': _$MatchStatusEnumMap[instance.status]!,
  'blockedBy': instance.blockedBy,
  'blockedAt': const NullableTimestampConverter().toJson(instance.blockedAt),
  'conversationType':
      _$MatchConversationTypeEnumMap[instance.conversationType]!,
  'clubId': instance.clubId,
  'organizerId': instance.organizerId,
  'crossPathsInvitationId': instance.crossPathsInvitationId,
  'eventPlanExpiresAt': const NullableTimestampConverter().toJson(
    instance.eventPlanExpiresAt,
  ),
  'closedAt': const NullableTimestampConverter().toJson(instance.closedAt),
};

const _$MatchStatusEnumMap = {
  MatchStatus.active: 'active',
  MatchStatus.blocked: 'blocked',
  MatchStatus.closed: 'closed',
};

const _$MatchConversationTypeEnumMap = {
  MatchConversationType.match: 'match',
  MatchConversationType.clubHostInquiry: 'clubHostInquiry',
  MatchConversationType.crossPathsEventPlan: 'crossPathsEventPlan',
};
