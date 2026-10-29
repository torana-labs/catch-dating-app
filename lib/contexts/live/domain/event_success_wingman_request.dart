import 'package:catch_dating_app/core/firestore_converters.dart';

enum EventSuccessWingmanRequestStatus {
  active,
  withdrawn;

  static EventSuccessWingmanRequestStatus fromJson(Object? value) {
    final name = value as String? ?? active.name;
    return EventSuccessWingmanRequestStatus.values.firstWhere(
      (status) => status.name == name,
      orElse: () => active,
    );
  }
}

final class EventSuccessWingmanRequest {
  const EventSuccessWingmanRequest({
    required this.id,
    required this.eventId,
    required this.clubId,
    required this.requesterUid,
    required this.targetUid,
    required this.status,
    required this.hostVisibleConsent,
    required this.createdAt,
    required this.updatedAt,
    this.note,
  });

  factory EventSuccessWingmanRequest.fromJson(Map<String, dynamic> json) {
    return EventSuccessWingmanRequest(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      clubId: json['clubId'] as String,
      requesterUid: json['requesterUid'] as String,
      targetUid: json['targetUid'] as String,
      status: EventSuccessWingmanRequestStatus.fromJson(json['status']),
      hostVisibleConsent: json['hostVisibleConsent'] as bool? ?? false,
      note: json['note'] as String?,
      createdAt: dateTimeFromFirestoreValue(
        json['createdAt'],
        field: 'createdAt',
      ),
      updatedAt: dateTimeFromFirestoreValue(
        json['updatedAt'],
        field: 'updatedAt',
      ),
    );
  }

  final String id;
  final String eventId;
  final String clubId;
  final String requesterUid;
  final String targetUid;
  final EventSuccessWingmanRequestStatus status;
  final bool hostVisibleConsent;
  final String? note;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isActive =>
      status == EventSuccessWingmanRequestStatus.active && hostVisibleConsent;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'clubId': clubId,
    'requesterUid': requesterUid,
    'targetUid': targetUid,
    'status': status.name,
    'hostVisibleConsent': hostVisibleConsent,
    'note': note,
    'createdAt': firestoreTimestampFromDateTime(createdAt),
    'updatedAt': firestoreTimestampFromDateTime(updatedAt),
  };
}

String eventSuccessWingmanRequestId({
  required String eventId,
  required String uid,
}) => '${eventId}_$uid';
