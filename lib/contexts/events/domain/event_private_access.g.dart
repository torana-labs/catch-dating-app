// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_private_access.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventPrivateAccess _$EventPrivateAccessFromJson(Map<String, dynamic> json) =>
    _EventPrivateAccess(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      clubId: json['clubId'] as String,
      inviteCode: json['inviteCode'] as String,
      createdAt: const TimestampConverter().fromJson(json['createdAt']),
    );

Map<String, dynamic> _$EventPrivateAccessToJson(_EventPrivateAccess instance) =>
    <String, dynamic>{
      'eventId': instance.eventId,
      'clubId': instance.clubId,
      'inviteCode': instance.inviteCode,
      'createdAt': const TimestampConverter().toJson(instance.createdAt),
    };
