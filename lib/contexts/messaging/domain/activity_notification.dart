import 'package:catch_dating_app/core/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'activity_notification.freezed.dart';
part 'activity_notification.g.dart';

enum ActivityNotificationType {
  message,
  match,
  eventReminder,
  eventSignup,
  waitlistPromotion,
  waitlistOffer,
  waitlistOfferExpiring,
  waitlistOfferExpired,
  eventCancelled,
  eventUpdated,
  clubUpdate,
  organizerUpdate,
  crossPathsInvitation,
  crossPathsInvitationAccepted,
  crossPathsInvitationDeclined,
  crossPathsPlanCancelled,
}

@freezed
abstract class ActivityNotification with _$ActivityNotification {
  const ActivityNotification._();

  const factory ActivityNotification({
    @JsonKey(includeToJson: false) required String id,
    required String uid,
    required ActivityNotificationType type,
    required String title,
    required String body,
    @TimestampConverter() required DateTime createdAt,
    @NullableTimestampConverter() DateTime? readAt,
    String? matchId,
    String? eventId,
    String? clubId,
    String? organizerId,
    String? postId,
    String? invitationId,
    String? actorUid,
    String? actorName,
  }) = _ActivityNotification;

  factory ActivityNotification.fromJson(Map<String, dynamic> json) =>
      _$ActivityNotificationFromJson(json);

  bool get isUnread => readAt == null;

  bool get isVisibleInActivity => type != ActivityNotificationType.message;
}
