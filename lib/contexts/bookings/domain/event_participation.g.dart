// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_participation.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventParticipation _$EventParticipationFromJson(
  Map<String, dynamic> json,
) => _EventParticipation(
  id: json['id'] as String,
  eventId: json['eventId'] as String,
  clubId: json['clubId'] as String,
  uid: json['uid'] as String,
  status: $enumDecode(_$EventParticipationStatusEnumMap, json['status']),
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  updatedAt: const TimestampConverter().fromJson(json['updatedAt']),
  signedUpAt: const NullableTimestampConverter().fromJson(json['signedUpAt']),
  waitlistedAt: const NullableTimestampConverter().fromJson(
    json['waitlistedAt'],
  ),
  attendedAt: const NullableTimestampConverter().fromJson(json['attendedAt']),
  cancelledAt: const NullableTimestampConverter().fromJson(json['cancelledAt']),
  deletedAt: const NullableTimestampConverter().fromJson(json['deletedAt']),
  genderAtSignup: $enumDecodeNullable(_$GenderEnumMap, json['genderAtSignup']),
  cohortAtSignup: json['cohortAtSignup'] as String?,
  paymentId: json['paymentId'] as String?,
  hostApprovalStatus: $enumDecodeNullable(
    _$EventJoinRequestStatusEnumMap,
    json['hostApprovalStatus'],
  ),
  hostApprovalDecidedAt: const NullableTimestampConverter().fromJson(
    json['hostApprovalDecidedAt'],
  ),
  hostApprovalDecidedBy: json['hostApprovalDecidedBy'] as String?,
  waitlistOfferStatus: $enumDecodeNullable(
    _$EventWaitlistOfferStatusEnumMap,
    json['waitlistOfferStatus'],
  ),
  waitlistOfferedAt: const NullableTimestampConverter().fromJson(
    json['waitlistOfferedAt'],
  ),
  waitlistOfferExpiresAt: const NullableTimestampConverter().fromJson(
    json['waitlistOfferExpiresAt'],
  ),
  waitlistOfferAcceptedAt: const NullableTimestampConverter().fromJson(
    json['waitlistOfferAcceptedAt'],
  ),
  waitlistOfferId: json['waitlistOfferId'] as String?,
  inviteLinkId: json['inviteLinkId'] as String?,
  inviteSource: json['inviteSource'] as String?,
  inviteCapturedAt: const NullableTimestampConverter().fromJson(
    json['inviteCapturedAt'],
  ),
);

Map<String, dynamic> _$EventParticipationToJson(
  _EventParticipation instance,
) => <String, dynamic>{
  'eventId': instance.eventId,
  'clubId': instance.clubId,
  'uid': instance.uid,
  'status': _$EventParticipationStatusEnumMap[instance.status]!,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
  'signedUpAt': const NullableTimestampConverter().toJson(instance.signedUpAt),
  'waitlistedAt': const NullableTimestampConverter().toJson(
    instance.waitlistedAt,
  ),
  'attendedAt': const NullableTimestampConverter().toJson(instance.attendedAt),
  'cancelledAt': const NullableTimestampConverter().toJson(
    instance.cancelledAt,
  ),
  'deletedAt': const NullableTimestampConverter().toJson(instance.deletedAt),
  'genderAtSignup': _$GenderEnumMap[instance.genderAtSignup],
  'cohortAtSignup': instance.cohortAtSignup,
  'paymentId': instance.paymentId,
  'hostApprovalStatus':
      _$EventJoinRequestStatusEnumMap[instance.hostApprovalStatus],
  'hostApprovalDecidedAt': const NullableTimestampConverter().toJson(
    instance.hostApprovalDecidedAt,
  ),
  'hostApprovalDecidedBy': instance.hostApprovalDecidedBy,
  'waitlistOfferStatus':
      _$EventWaitlistOfferStatusEnumMap[instance.waitlistOfferStatus],
  'waitlistOfferedAt': const NullableTimestampConverter().toJson(
    instance.waitlistOfferedAt,
  ),
  'waitlistOfferExpiresAt': const NullableTimestampConverter().toJson(
    instance.waitlistOfferExpiresAt,
  ),
  'waitlistOfferAcceptedAt': const NullableTimestampConverter().toJson(
    instance.waitlistOfferAcceptedAt,
  ),
  'waitlistOfferId': instance.waitlistOfferId,
  'inviteLinkId': instance.inviteLinkId,
  'inviteSource': instance.inviteSource,
  'inviteCapturedAt': const NullableTimestampConverter().toJson(
    instance.inviteCapturedAt,
  ),
};

const _$EventParticipationStatusEnumMap = {
  EventParticipationStatus.signedUp: 'signedUp',
  EventParticipationStatus.waitlisted: 'waitlisted',
  EventParticipationStatus.attended: 'attended',
  EventParticipationStatus.cancelled: 'cancelled',
  EventParticipationStatus.deleted: 'deleted',
};

const _$GenderEnumMap = {
  Gender.man: 'man',
  Gender.woman: 'woman',
  Gender.nonBinary: 'nonBinary',
  Gender.other: 'other',
};

const _$EventJoinRequestStatusEnumMap = {
  EventJoinRequestStatus.pending: 'pending',
  EventJoinRequestStatus.approved: 'approved',
  EventJoinRequestStatus.declined: 'declined',
};

const _$EventWaitlistOfferStatusEnumMap = {
  EventWaitlistOfferStatus.active: 'active',
  EventWaitlistOfferStatus.accepted: 'accepted',
  EventWaitlistOfferStatus.declined: 'declined',
  EventWaitlistOfferStatus.expired: 'expired',
  EventWaitlistOfferStatus.cancelled: 'cancelled',
};
