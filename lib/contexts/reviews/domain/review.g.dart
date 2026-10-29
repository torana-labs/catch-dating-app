// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'review.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_Review _$ReviewFromJson(Map<String, dynamic> json) => _Review(
  id: json['id'] as String,
  organizerId: json['organizerId'] as String,
  eventId: json['eventId'] as String?,
  reviewerUserId: json['reviewerUserId'] as String?,
  reviewerName: json['reviewerName'] as String,
  rating: (json['rating'] as num).toInt(),
  comment: json['comment'] as String,
  verificationStatus: json['verificationStatus'] as String? ?? 'verified',
  source: json['source'] as String? ?? 'catchEvent',
  moderationStatus: json['moderationStatus'] as String? ?? 'published',
  isAnonymous: json['isAnonymous'] as bool? ?? false,
  submittedFromPath: json['submittedFromPath'] as String?,
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  updatedAt: const NullableTimestampConverter().fromJson(json['updatedAt']),
  ownerResponse: json['ownerResponse'] == null
      ? null
      : ReviewOwnerResponse.fromJson(
          json['ownerResponse'] as Map<String, dynamic>,
        ),
);

Map<String, dynamic> _$ReviewToJson(_Review instance) => <String, dynamic>{
  'organizerId': instance.organizerId,
  'eventId': instance.eventId,
  'reviewerUserId': instance.reviewerUserId,
  'reviewerName': instance.reviewerName,
  'rating': instance.rating,
  'comment': instance.comment,
  'verificationStatus': instance.verificationStatus,
  'source': instance.source,
  'moderationStatus': instance.moderationStatus,
  'isAnonymous': instance.isAnonymous,
  'submittedFromPath': instance.submittedFromPath,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'updatedAt': const NullableTimestampConverter().toJson(instance.updatedAt),
  'ownerResponse': instance.ownerResponse?.toJson(),
};

_ReviewOwnerResponse _$ReviewOwnerResponseFromJson(Map<String, dynamic> json) =>
    _ReviewOwnerResponse(
      hostUserId: json['hostUserId'] as String,
      hostName: json['hostName'] as String,
      hostAvatarUrl: json['hostAvatarUrl'] as String?,
      message: json['message'] as String,
      createdAt: const TimestampConverter().fromJson(json['createdAt']),
      updatedAt: const TimestampConverter().fromJson(json['updatedAt']),
    );

Map<String, dynamic> _$ReviewOwnerResponseToJson(
  _ReviewOwnerResponse instance,
) => <String, dynamic>{
  'hostUserId': instance.hostUserId,
  'hostName': instance.hostName,
  'hostAvatarUrl': instance.hostAvatarUrl,
  'message': instance.message,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
};
