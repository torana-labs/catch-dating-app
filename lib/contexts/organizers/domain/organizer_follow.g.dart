// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_follow.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OrganizerFollow _$OrganizerFollowFromJson(Map<String, dynamic> json) =>
    _OrganizerFollow(
      id: json['id'] as String,
      organizerId: json['organizerId'] as String,
      uid: json['uid'] as String,
      status: $enumDecode(_$OrganizerFollowStatusEnumMap, json['status']),
      pushNotificationsEnabled:
          json['pushNotificationsEnabled'] as bool? ?? false,
      followedAt: const TimestampConverter().fromJson(json['followedAt']),
      unfollowedAt: const NullableTimestampConverter().fromJson(
        json['unfollowedAt'],
      ),
    );

Map<String, dynamic> _$OrganizerFollowToJson(_OrganizerFollow instance) =>
    <String, dynamic>{
      'organizerId': instance.organizerId,
      'uid': instance.uid,
      'status': _$OrganizerFollowStatusEnumMap[instance.status]!,
      'pushNotificationsEnabled': instance.pushNotificationsEnabled,
      'followedAt': const TimestampConverter().toJson(instance.followedAt),
      'unfollowedAt': const NullableTimestampConverter().toJson(
        instance.unfollowedAt,
      ),
    };

const _$OrganizerFollowStatusEnumMap = {
  OrganizerFollowStatus.active: 'active',
  OrganizerFollowStatus.inactive: 'inactive',
};
