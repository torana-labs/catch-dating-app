// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'club_membership.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ClubMembership _$ClubMembershipFromJson(Map<String, dynamic> json) =>
    _ClubMembership(
      id: json['id'] as String,
      clubId: json['clubId'] as String,
      uid: json['uid'] as String,
      role: $enumDecode(_$ClubMembershipRoleEnumMap, json['role']),
      status: $enumDecode(_$ClubMembershipStatusEnumMap, json['status']),
      pushNotificationsEnabled:
          json['pushNotificationsEnabled'] as bool? ?? false,
      joinedAt: const TimestampConverter().fromJson(json['joinedAt']),
      leftAt: const NullableTimestampConverter().fromJson(json['leftAt']),
      deletedAt: const NullableTimestampConverter().fromJson(json['deletedAt']),
    );

Map<String, dynamic> _$ClubMembershipToJson(
  _ClubMembership instance,
) => <String, dynamic>{
  'clubId': instance.clubId,
  'uid': instance.uid,
  'role': _$ClubMembershipRoleEnumMap[instance.role]!,
  'status': _$ClubMembershipStatusEnumMap[instance.status]!,
  'pushNotificationsEnabled': instance.pushNotificationsEnabled,
  'joinedAt': const TimestampConverter().toJson(instance.joinedAt),
  'leftAt': const NullableTimestampConverter().toJson(instance.leftAt),
  'deletedAt': const NullableTimestampConverter().toJson(instance.deletedAt),
};

const _$ClubMembershipRoleEnumMap = {
  ClubMembershipRole.owner: 'owner',
  ClubMembershipRole.host: 'host',
  ClubMembershipRole.member: 'member',
};

const _$ClubMembershipStatusEnumMap = {
  ClubMembershipStatus.active: 'active',
  ClubMembershipStatus.left: 'left',
  ClubMembershipStatus.deleted: 'deleted',
};
