enum CrossPathsPairHoldStatus {
  active,
  confirmed,
  expired,
  cancelled,
  invalidated;

  bool get isActive => this == active;
}

class CrossPathsPairHold {
  const CrossPathsPairHold({
    required this.id,
    required this.eventId,
    required this.invitationId,
    required this.requesterUid,
    required this.attendeeUid,
    required this.participantIds,
    required this.status,
    required this.requesterBookingStatus,
    required this.attendeeBookingStatus,
    required this.requesterPriceInPaise,
    required this.currency,
    required this.expiresAt,
    required this.conversationId,
  });

  factory CrossPathsPairHold.fromMap(String id, Map<String, dynamic> json) {
    final expiresAt = json['expiresAt'];
    if (expiresAt is! DateTime) {
      throw const FormatException('expiresAt must be a date-time.');
    }
    return CrossPathsPairHold(
      id: id,
      eventId: json['eventId'] as String,
      invitationId: json['invitationId'] as String,
      requesterUid: json['requesterUid'] as String,
      attendeeUid: json['attendeeUid'] as String,
      participantIds: List<String>.from(json['participantIds'] as List),
      status: CrossPathsPairHoldStatus.values.byName(json['status'] as String),
      requesterBookingStatus: json['requesterBookingStatus'] as String,
      attendeeBookingStatus: json['attendeeBookingStatus'] as String,
      requesterPriceInPaise: json['requesterPriceInPaise'] as int,
      currency: json['currency'] as String,
      expiresAt: expiresAt,
      conversationId: json['conversationId'] as String?,
    );
  }

  final String id;
  final String eventId;
  final String invitationId;
  final String requesterUid;
  final String attendeeUid;
  final List<String> participantIds;
  final CrossPathsPairHoldStatus status;
  final String requesterBookingStatus;
  final String attendeeBookingStatus;
  final int requesterPriceInPaise;
  final String currency;
  final DateTime expiresAt;
  final String? conversationId;
}
