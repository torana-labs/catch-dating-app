/// An answer belonging to the signed-in respondent, or a prior decision that
/// remains visible so its matching permission can be withdrawn.
final class EventAssignmentFeatureChoice {
  const EventAssignmentFeatureChoice({
    required this.featureId,
    required this.responseId,
    required this.questionLabel,
    required this.answerLabel,
    required this.status,
    required this.revision,
    required this.canGrant,
  });

  final String featureId;
  final String responseId;
  final String? questionLabel;
  final String? answerLabel;
  final EventAssignmentFeatureChoiceStatus status;
  final int revision;
  final bool canGrant;

  bool get isGranted => status == EventAssignmentFeatureChoiceStatus.granted;

  factory EventAssignmentFeatureChoice.fromJson(Object? raw) {
    if (raw is! Map) throw const FormatException('Invalid matching choice.');
    final featureId = raw['featureId'];
    final responseId = raw['responseId'];
    final questionLabel = raw['questionLabel'];
    final answerLabel = raw['answerLabel'];
    final status = raw['status'];
    final revision = raw['revision'];
    final canGrant = raw['canGrant'];
    if (featureId is! String || featureId.isEmpty ||
        responseId is! String || responseId.isEmpty ||
        (questionLabel != null && questionLabel is! String) ||
        (answerLabel != null && answerLabel is! String) ||
        revision is! int || revision < 0 || canGrant is! bool) {
      throw const FormatException('Invalid matching choice.');
    }
    final parsedStatus = switch (status) {
      'notGranted' => EventAssignmentFeatureChoiceStatus.notGranted,
      'granted' => EventAssignmentFeatureChoiceStatus.granted,
      'withdrawn' => EventAssignmentFeatureChoiceStatus.withdrawn,
      _ => throw const FormatException('Invalid matching choice status.'),
    };
    return EventAssignmentFeatureChoice(
      featureId: featureId,
      responseId: responseId,
      questionLabel: questionLabel,
      answerLabel: answerLabel,
      status: parsedStatus,
      revision: revision,
      canGrant: canGrant,
    );
  }
}

enum EventAssignmentFeatureChoiceStatus { notGranted, granted, withdrawn }

final class EventAssignmentFeatureChoices {
  const EventAssignmentFeatureChoices(this.eventId, this.choices);
  final String eventId;
  final List<EventAssignmentFeatureChoice> choices;

  factory EventAssignmentFeatureChoices.fromJson(Object? raw, String eventId) {
    if (raw is! Map || raw['eventId'] != eventId || raw['choices'] is! List) {
      throw const FormatException('Invalid matching choices.');
    }
    final choices = (raw['choices'] as List)
        .map(EventAssignmentFeatureChoice.fromJson)
        .toList(growable: false);
    if (choices.length > 1000) {
      throw const FormatException('Too many matching choices.');
    }
    return EventAssignmentFeatureChoices(eventId, choices);
  }
}
