enum CrossPathsInvitationStatus {
  pending,
  accepted,
  declined,
  cancelled,
  expired,
  invalidated;

  bool get isTerminal => this != pending && this != accepted;
}

enum CrossPathsInvitationInvalidationReason {
  eventUnavailable('event_unavailable'),
  participationCancelled('participation_cancelled'),
  consentRevoked('consent_revoked'),
  safetyStateChanged('safety_state_changed'),
  competingPlanAccepted('competing_plan_accepted'),
  planCancelled('plan_cancelled'),
  holdExpired('hold_expired');

  const CrossPathsInvitationInvalidationReason(this.wireValue);
  final String wireValue;
}

class CrossPathsInvitation {
  const CrossPathsInvitation({
    required this.id,
    required this.eventId,
    required this.senderUid,
    required this.recipientUid,
    required this.participantIds,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.expiresAt,
    required this.respondedAt,
    required this.cancelledAt,
    required this.invalidatedAt,
    required this.invalidationReason,
    required this.conversationId,
    this.pairHoldId,
  });

  factory CrossPathsInvitation.fromMap(String id, Map<String, dynamic> json) {
    DateTime timestamp(String key) {
      final value = json[key];
      if (value is! DateTime) {
        throw FormatException('$key must be a date-time.');
      }
      return value;
    }

    DateTime? nullableTimestamp(String key) {
      final value = json[key];
      if (value == null) return null;
      if (value is! DateTime) {
        throw FormatException('$key must be a date-time or null.');
      }
      return value;
    }

    final reasonWire = json['invalidationReason'] as String?;
    return CrossPathsInvitation(
      id: id,
      eventId: json['eventId'] as String,
      senderUid: json['senderUid'] as String,
      recipientUid: json['recipientUid'] as String,
      participantIds: List<String>.from(json['participantIds'] as List),
      status: CrossPathsInvitationStatus.values.byName(
        json['status'] as String,
      ),
      createdAt: timestamp('createdAt'),
      updatedAt: timestamp('updatedAt'),
      expiresAt: timestamp('expiresAt'),
      respondedAt: nullableTimestamp('respondedAt'),
      cancelledAt: nullableTimestamp('cancelledAt'),
      invalidatedAt: nullableTimestamp('invalidatedAt'),
      invalidationReason: reasonWire == null
          ? null
          : CrossPathsInvitationInvalidationReason.values.firstWhere(
              (reason) => reason.wireValue == reasonWire,
            ),
      conversationId: json['conversationId'] as String?,
      pairHoldId: json['pairHoldId'] as String?,
    );
  }

  final String id;
  final String eventId;
  final String senderUid;
  final String recipientUid;
  final List<String> participantIds;
  final CrossPathsInvitationStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime expiresAt;
  final DateTime? respondedAt;
  final DateTime? cancelledAt;
  final DateTime? invalidatedAt;
  final CrossPathsInvitationInvalidationReason? invalidationReason;
  final String? conversationId;
  final String? pairHoldId;
}

class CrossPathsInvitationReceipt {
  const CrossPathsInvitationReceipt({
    required this.invitationId,
    required this.status,
    required this.conversationId,
    this.pairHoldId,
  });

  factory CrossPathsInvitationReceipt.fromCallableData(Object? value) {
    if (value is! Map) {
      throw const FormatException('Invalid invitation receipt.');
    }
    final json = value.map((key, child) => MapEntry(key.toString(), child));
    return CrossPathsInvitationReceipt(
      invitationId: json['invitationId'] as String,
      status: CrossPathsInvitationStatus.values.byName(
        json['status'] as String,
      ),
      conversationId: json['conversationId'] as String?,
      pairHoldId: json['pairHoldId'] as String?,
    );
  }

  final String invitationId;
  final CrossPathsInvitationStatus status;
  final String? conversationId;
  final String? pairHoldId;
}
