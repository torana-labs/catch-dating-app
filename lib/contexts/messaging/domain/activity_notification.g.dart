// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'activity_notification.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ActivityNotification _$ActivityNotificationFromJson(
  Map<String, dynamic> json,
) => _ActivityNotification(
  id: json['id'] as String,
  uid: json['uid'] as String,
  type: $enumDecode(_$ActivityNotificationTypeEnumMap, json['type']),
  title: json['title'] as String,
  body: json['body'] as String,
  createdAt: const TimestampConverter().fromJson(json['createdAt']),
  readAt: const NullableTimestampConverter().fromJson(json['readAt']),
  matchId: json['matchId'] as String?,
  eventId: json['eventId'] as String?,
  clubId: json['clubId'] as String?,
  organizerId: json['organizerId'] as String?,
  postId: json['postId'] as String?,
  invitationId: json['invitationId'] as String?,
  actorUid: json['actorUid'] as String?,
  actorName: json['actorName'] as String?,
);

Map<String, dynamic> _$ActivityNotificationToJson(
  _ActivityNotification instance,
) => <String, dynamic>{
  'uid': instance.uid,
  'type': _$ActivityNotificationTypeEnumMap[instance.type]!,
  'title': instance.title,
  'body': instance.body,
  'createdAt': const TimestampConverter().toJson(instance.createdAt),
  'readAt': const NullableTimestampConverter().toJson(instance.readAt),
  'matchId': instance.matchId,
  'eventId': instance.eventId,
  'clubId': instance.clubId,
  'organizerId': instance.organizerId,
  'postId': instance.postId,
  'invitationId': instance.invitationId,
  'actorUid': instance.actorUid,
  'actorName': instance.actorName,
};

const _$ActivityNotificationTypeEnumMap = {
  ActivityNotificationType.message: 'message',
  ActivityNotificationType.match: 'match',
  ActivityNotificationType.eventReminder: 'eventReminder',
  ActivityNotificationType.eventSignup: 'eventSignup',
  ActivityNotificationType.waitlistPromotion: 'waitlistPromotion',
  ActivityNotificationType.waitlistOffer: 'waitlistOffer',
  ActivityNotificationType.waitlistOfferExpiring: 'waitlistOfferExpiring',
  ActivityNotificationType.waitlistOfferExpired: 'waitlistOfferExpired',
  ActivityNotificationType.eventCancelled: 'eventCancelled',
  ActivityNotificationType.eventUpdated: 'eventUpdated',
  ActivityNotificationType.clubUpdate: 'clubUpdate',
  ActivityNotificationType.organizerUpdate: 'organizerUpdate',
  ActivityNotificationType.crossPathsInvitation: 'crossPathsInvitation',
  ActivityNotificationType.crossPathsInvitationAccepted:
      'crossPathsInvitationAccepted',
  ActivityNotificationType.crossPathsInvitationDeclined:
      'crossPathsInvitationDeclined',
  ActivityNotificationType.crossPathsPlanCancelled: 'crossPathsPlanCancelled',
};
