import 'package:catch_dating_app/platform/firebase/firestore_converters.dart';

final class EventSuccessPreference {
  const EventSuccessPreference({
    required this.id,
    required this.eventId,
    required this.organizerId,
    required this.uid,
    required this.microPodsOptedOut,
    required this.guidedRotationsOptedOut,
    required this.createdAt,
    required this.updatedAt,
  });

  factory EventSuccessPreference.fromJson(Map<String, dynamic> json) {
    return EventSuccessPreference(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      organizerId: json['organizerId'] as String,
      uid: json['uid'] as String,
      microPodsOptedOut: json['microPodsOptedOut'] as bool? ?? false,
      guidedRotationsOptedOut:
          json['guidedRotationsOptedOut'] as bool? ?? false,
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
  final String organizerId;
  final String uid;
  final bool microPodsOptedOut;
  final bool guidedRotationsOptedOut;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'organizerId': organizerId,
    'uid': uid,
    'microPodsOptedOut': microPodsOptedOut,
    'guidedRotationsOptedOut': guidedRotationsOptedOut,
    'createdAt': firestoreTimestampFromDateTime(createdAt),
    'updatedAt': firestoreTimestampFromDateTime(updatedAt),
  };
}

String eventSuccessPreferenceId({
  required String eventId,
  required String uid,
}) => '${eventId}_$uid';
