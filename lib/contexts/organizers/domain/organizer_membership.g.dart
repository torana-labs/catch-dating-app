// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'organizer_membership.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OrganizerMembership _$OrganizerMembershipFromJson(Map<String, dynamic> json) =>
    _OrganizerMembership(
      id: json['id'] as String,
      clubId: json['clubId'] as String,
      uid: json['uid'] as String,
      role: $enumDecode(_$OrganizerMembershipRoleEnumMap, json['role']),
      status: $enumDecode(_$OrganizerMembershipStatusEnumMap, json['status']),
      pushNotificationsEnabled:
          json['pushNotificationsEnabled'] as bool? ?? false,
      joinedAt: const TimestampConverter().fromJson(json['joinedAt']),
      leftAt: const NullableTimestampConverter().fromJson(json['leftAt']),
      deletedAt: const NullableTimestampConverter().fromJson(json['deletedAt']),
    );

Map<String, dynamic> _$OrganizerMembershipToJson(
  _OrganizerMembership instance,
) => <String, dynamic>{
  'clubId': instance.clubId,
  'uid': instance.uid,
  'role': _$OrganizerMembershipRoleEnumMap[instance.role]!,
  'status': _$OrganizerMembershipStatusEnumMap[instance.status]!,
  'pushNotificationsEnabled': instance.pushNotificationsEnabled,
  'joinedAt': const TimestampConverter().toJson(instance.joinedAt),
  'leftAt': const NullableTimestampConverter().toJson(instance.leftAt),
  'deletedAt': const NullableTimestampConverter().toJson(instance.deletedAt),
};

const _$OrganizerMembershipRoleEnumMap = {
  OrganizerMembershipRole.owner: 'owner',
  OrganizerMembershipRole.host: 'host',
  OrganizerMembershipRole.member: 'member',
};

const _$OrganizerMembershipStatusEnumMap = {
  OrganizerMembershipStatus.active: 'active',
  OrganizerMembershipStatus.left: 'left',
  OrganizerMembershipStatus.deleted: 'deleted',
};
