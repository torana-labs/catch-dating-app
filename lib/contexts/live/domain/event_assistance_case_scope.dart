import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

const _liveAssistanceMode = 'live';

enum AssistanceCaseStatus { open, resolved }

final class EventAssistanceCaseScope {
  EventAssistanceCaseScope({
    required this.organizerId,
    required this.eventId,
    required this.caseId,
  }) {
    assistanceId(organizerId);
    assistanceId(eventId);
    assistanceId(caseId);
  }

  final String organizerId;
  final String eventId;
  final String caseId;

  Map<String, Object?> get context => {
    'mode': 'live',
    'organizerId': organizerId,
    'eventId': eventId,
  };

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceCaseScope &&
      organizerId == other.organizerId &&
      eventId == other.eventId &&
      caseId == other.caseId;

  @override
  int get hashCode => Object.hash(organizerId, eventId, caseId);
}

/// One server page, never an event-wide count or a subscription.
final class EventAssistanceCaseQuery {
  EventAssistanceCaseQuery({
    required this.organizerId,
    required this.eventId,
    this.status = AssistanceCaseStatus.open,
    this.cursor,
  }) {
    assistanceId(organizerId);
    assistanceId(eventId);
    if (cursor != null) assistanceId(cursor);
  }

  final String organizerId;
  final String eventId;
  final AssistanceCaseStatus status;
  final String? cursor;

  Map<String, Object?> get context => {
    'mode': 'live',
    'organizerId': organizerId,
    'eventId': eventId,
  };

  EventAssistanceCaseScope scopeFor(String caseId) => EventAssistanceCaseScope(
    organizerId: organizerId,
    eventId: eventId,
    caseId: caseId,
  );

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceCaseQuery &&
      organizerId == other.organizerId &&
      eventId == other.eventId &&
      status == other.status &&
      cursor == other.cursor;

  @override
  int get hashCode => Object.hash(organizerId, eventId, status, cursor);
}

void validateAssistanceCaseContext(
  Object? value, {
  required String organizerId,
  required String eventId,
}) {
  final map = assistanceObject(value, {'mode', 'organizerId', 'eventId'});
  if (map['mode'] != _liveAssistanceMode ||
      map['organizerId'] != organizerId ||
      map['eventId'] != eventId) {
    throw const FormatException('Help request context mismatch.');
  }
}
