import 'package:catch_dating_app/core/firestore_converters.dart';

enum EventSuccessArrivalMissionStatus { active, completed, skipped }

class EventSuccessArrivalMission {
  const EventSuccessArrivalMission({
    required this.id,
    required this.eventId,
    required this.clubId,
    required this.observerUid,
    required this.targetUid,
    required this.targetDisplayName,
    required this.targetContext,
    required this.question,
    required this.answerOptions,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    this.selectedAnswerId,
    this.completedAt,
  });

  factory EventSuccessArrivalMission.fromJson(Map<String, dynamic> json) {
    return EventSuccessArrivalMission(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      clubId: json['clubId'] as String,
      observerUid: json['observerUid'] as String,
      targetUid: json['targetUid'] as String,
      targetDisplayName: json['targetDisplayName'] as String,
      targetContext: json['targetContext'] as String,
      question: json['question'] as String,
      answerOptions:
          (json['answerOptions'] as List<Object?>? ?? const <Object?>[])
              .whereType<Map<String, dynamic>>()
              .map(EventSuccessArrivalMissionAnswerOption.fromJson)
              .toList(growable: false),
      status: EventSuccessArrivalMissionStatus.values.byName(
        json['status'] as String,
      ),
      selectedAnswerId: json['selectedAnswerId'] as String?,
      createdAt: dateTimeFromFirestoreValue(
        json['createdAt'],
        field: 'createdAt',
      ),
      updatedAt: dateTimeFromFirestoreValue(
        json['updatedAt'],
        field: 'updatedAt',
      ),
      completedAt: nullableDateTimeFromFirestoreValue(json['completedAt']),
    );
  }

  final String id;
  final String eventId;
  final String clubId;
  final String observerUid;
  final String targetUid;
  final String targetDisplayName;
  final String targetContext;
  final String question;
  final List<EventSuccessArrivalMissionAnswerOption> answerOptions;
  final EventSuccessArrivalMissionStatus status;
  final String? selectedAnswerId;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;

  bool get isActive => status == EventSuccessArrivalMissionStatus.active;

  Map<String, dynamic> toJson() => {
    'eventId': eventId,
    'clubId': clubId,
    'observerUid': observerUid,
    'targetUid': targetUid,
    'targetDisplayName': targetDisplayName,
    'targetContext': targetContext,
    'question': question,
    'answerOptions': answerOptions
        .map((option) => option.toJson())
        .toList(growable: false),
    'status': status.name,
    if (selectedAnswerId != null) 'selectedAnswerId': selectedAnswerId,
    'createdAt': firestoreTimestampFromDateTime(createdAt),
    'updatedAt': firestoreTimestampFromDateTime(updatedAt),
    if (completedAt != null)
      'completedAt': firestoreTimestampFromDateTime(completedAt!),
  };
}

class EventSuccessArrivalMissionAnswerOption {
  const EventSuccessArrivalMissionAnswerOption({
    required this.id,
    required this.label,
  });

  factory EventSuccessArrivalMissionAnswerOption.fromJson(
    Map<String, dynamic> json,
  ) => EventSuccessArrivalMissionAnswerOption(
    id: json['id'] as String,
    label: json['label'] as String,
  );

  final String id;
  final String label;

  Map<String, dynamic> toJson() => {'id': id, 'label': label};
}

String eventSuccessArrivalMissionId({
  required String eventId,
  required String uid,
}) => '${eventId}_$uid';
