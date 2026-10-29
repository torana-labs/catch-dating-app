// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'event_runtime_claim_request.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_EventRuntimeClaimRequest _$EventRuntimeClaimRequestFromJson(
  Map<String, dynamic> json,
) => _EventRuntimeClaimRequest(
  id: json['id'] as String,
  eventId: json['eventId'] as String,
  clubId: json['clubId'] as String,
  organizerId: json['organizerId'] as String,
  uid: json['uid'] as String,
  displayName: json['displayName'] as String,
  phoneLastFour: json['phoneLastFour'] as String,
  candidateAttendeeIds:
      (json['candidateAttendeeIds'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ??
      const <String>[],
  status: $enumDecode(_$EventRuntimeClaimStatusEnumMap, json['status']),
  reviewedBy: json['reviewedBy'] as String?,
  reviewReason: json['reviewReason'] as String?,
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  updatedAt: const TimestampConverter().fromJson(json['updatedAt']),
  reviewedAt: const NullableTimestampConverter().fromJson(json['reviewedAt']),
);

Map<String, dynamic> _$EventRuntimeClaimRequestToJson(
  _EventRuntimeClaimRequest instance,
) => <String, dynamic>{
  'eventId': instance.eventId,
  'clubId': instance.clubId,
  'organizerId': instance.organizerId,
  'uid': instance.uid,
  'displayName': instance.displayName,
  'phoneLastFour': instance.phoneLastFour,
  'candidateAttendeeIds': instance.candidateAttendeeIds,
  'status': _$EventRuntimeClaimStatusEnumMap[instance.status]!,
  'reviewedBy': instance.reviewedBy,
  'reviewReason': instance.reviewReason,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
  'reviewedAt': const NullableTimestampConverter().toJson(instance.reviewedAt),
};

const _$EventRuntimeClaimStatusEnumMap = {
  EventRuntimeClaimStatus.pending: 'pending',
  EventRuntimeClaimStatus.approved: 'approved',
  EventRuntimeClaimStatus.rejected: 'rejected',
  EventRuntimeClaimStatus.cancelled: 'cancelled',
};
