import 'package:catch_dating_app/contexts/profiles/profiles.dart';
import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'event_participation.freezed.dart';
part 'event_participation.g.dart';

enum EventParticipationStatus {
  signedUp,
  waitlisted,
  attended,
  cancelled,
  deleted,
}

enum EventJoinRequestStatus { pending, approved, declined }

enum EventWaitlistOfferStatus { active, accepted, declined, expired, cancelled }

@freezed
abstract class EventParticipation with _$EventParticipation {
  const EventParticipation._();

  const factory EventParticipation({
    @JsonKey(includeToJson: false) required String id,
    required String eventId,
    required String organizerId,
    required String uid,
    required EventParticipationStatus status,
    @TimestampConverter() required DateTime createdAt,
    @TimestampConverter() required DateTime updatedAt,
    @NullableTimestampConverter() DateTime? signedUpAt,
    @NullableTimestampConverter() DateTime? waitlistedAt,
    @NullableTimestampConverter() DateTime? attendedAt,
    @NullableTimestampConverter() DateTime? cancelledAt,
    @NullableTimestampConverter() DateTime? deletedAt,
    @JsonKey() Gender? genderAtSignup,
    String? cohortAtSignup,
    String? paymentId,
    @JsonKey() EventJoinRequestStatus? hostApprovalStatus,
    @NullableTimestampConverter() DateTime? hostApprovalDecidedAt,
    String? hostApprovalDecidedBy,
    @JsonKey() EventWaitlistOfferStatus? waitlistOfferStatus,
    @NullableTimestampConverter() DateTime? waitlistOfferedAt,
    @NullableTimestampConverter() DateTime? waitlistOfferExpiresAt,
    @NullableTimestampConverter() DateTime? waitlistOfferAcceptedAt,
    String? waitlistOfferId,
    String? inviteLinkId,
    String? inviteSource,
    @NullableTimestampConverter() DateTime? inviteCapturedAt,
  }) = _EventParticipation;

  factory EventParticipation.fromJson(Map<String, dynamic> json) =>
      _$EventParticipationFromJson(json);
}

String eventParticipationId({required String eventId, required String uid}) =>
    '${eventId}_$uid';

/// Participation eligibility booleans for one participation, evaluated against
/// [now], so callers don't need to recompute each rule.
class ParticipationStatusSnapshot {
  final bool hasHostApproval;
  final bool hasOpenWaitlistOffer;
  final bool isWaitlistOfferActive;
  final bool isWaitlistOfferAccepted;

  const ParticipationStatusSnapshot({
    required this.hasHostApproval,
    required this.hasOpenWaitlistOffer,
    required this.isWaitlistOfferActive,
    required this.isWaitlistOfferAccepted,
  });

  factory ParticipationStatusSnapshot.of(
    EventParticipation participation, {
    required DateTime now,
  }) {
    return ParticipationStatusSnapshot(
      hasHostApproval:
          participation.hostApprovalStatus == EventJoinRequestStatus.approved ||
          _isWaitlistOfferAcceptedAt(participation, now),
      hasOpenWaitlistOffer:
          participation.waitlistOfferStatus ==
              EventWaitlistOfferStatus.active ||
          participation.waitlistOfferStatus ==
              EventWaitlistOfferStatus.accepted,
      isWaitlistOfferActive: _isWaitlistOfferActiveAt(participation, now),
      isWaitlistOfferAccepted: _isWaitlistOfferAcceptedAt(participation, now),
    );
  }
}

bool _isWaitlistOfferActiveAt(EventParticipation participation, DateTime now) =>
    participation.status == EventParticipationStatus.waitlisted &&
    participation.waitlistOfferStatus == EventWaitlistOfferStatus.active &&
    _offerExpiresAfter(participation, now);

bool _isWaitlistOfferAcceptedAt(
  EventParticipation participation,
  DateTime now,
) =>
    participation.status == EventParticipationStatus.waitlisted &&
    participation.waitlistOfferStatus == EventWaitlistOfferStatus.accepted &&
    _offerExpiresAfter(participation, now);

bool _offerExpiresAfter(EventParticipation participation, DateTime now) =>
    participation.waitlistOfferExpiresAt != null &&
    participation.waitlistOfferExpiresAt!.isAfter(now);
