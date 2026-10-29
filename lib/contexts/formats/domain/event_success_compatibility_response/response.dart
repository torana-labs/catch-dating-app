part of '../event_success_compatibility_response.dart';

final class EventSuccessCompatibilityResponse {
  const EventSuccessCompatibilityResponse({
    required this.id,
    required this.eventId,
    required this.clubId,
    required this.uid,
    required this.answerIds,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EventSuccessCompatibilityResponse.fromJson(
    Map<String, dynamic> json,
  ) {
    return EventSuccessCompatibilityResponse(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      clubId: json['clubId'] as String,
      uid: json['uid'] as String,
      answerIds: (json['answerIds'] as List<dynamic>? ?? const [])
          .whereType<String>()
          .toList(growable: false),
      createdAt: _requiredTimestamp(json['createdAt'], 'createdAt'),
      updatedAt: _requiredTimestamp(json['updatedAt'], 'updatedAt'),
    );
  }

  final String id;
  final String eventId;
  final String clubId;
  final String uid;
  final List<String> answerIds;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'clubId': clubId,
    'uid': uid,
    'answerIds': answerIds,
    'createdAt': firestoreTimestampFromDateTime(createdAt),
    'updatedAt': firestoreTimestampFromDateTime(updatedAt),
  };

  String? answerIdFor(String questionId) =>
      EventSuccessCompatibilityQuestionnaire.answerIdForQuestion(
        answerIds,
        questionId,
      );
}
