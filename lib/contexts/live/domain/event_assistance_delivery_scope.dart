import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

const _liveAssistanceMode = 'live';

String assistanceMessageIdentity(Object? value) {
  if (value is String && RegExp(r'^outbox:[a-f0-9]{64}$').hasMatch(value)) {
    return value;
  }
  throw const FormatException('Invalid delivery message identity.');
}

final class EventAssistanceDeliveryScope {
  EventAssistanceDeliveryScope({
    required this.organizerId,
    required this.eventId,
    required this.messageId,
  }) {
    assistanceId(organizerId);
    assistanceId(eventId);
    assistanceMessageIdentity(messageId);
  }
  final String organizerId;
  final String eventId;
  final String messageId;
  Map<String, Object?> get context => {
    'mode': 'live',
    'organizerId': organizerId,
    'eventId': eventId,
  };
  @override
  bool operator ==(Object other) =>
      other is EventAssistanceDeliveryScope &&
      organizerId == other.organizerId &&
      eventId == other.eventId &&
      messageId == other.messageId;
  @override
  int get hashCode => Object.hash(organizerId, eventId, messageId);
}

/// One bounded page of recorded messages, with no event-wide completeness claim.
final class EventAssistanceDeliveryQuery {
  EventAssistanceDeliveryQuery({
    required this.organizerId,
    required this.eventId,
    this.cursor,
  }) {
    assistanceId(organizerId);
    assistanceId(eventId);
    if (cursor != null) assistanceMessageIdentity(cursor);
  }
  final String organizerId;
  final String eventId;
  final String? cursor;
  Map<String, Object?> get context => {
    'mode': 'live',
    'organizerId': organizerId,
    'eventId': eventId,
  };
  EventAssistanceDeliveryScope scopeFor(String messageId) =>
      EventAssistanceDeliveryScope(
        organizerId: organizerId,
        eventId: eventId,
        messageId: messageId,
      );
  @override
  bool operator ==(Object other) =>
      other is EventAssistanceDeliveryQuery &&
      organizerId == other.organizerId &&
      eventId == other.eventId &&
      cursor == other.cursor;
  @override
  int get hashCode => Object.hash(organizerId, eventId, cursor);
}

void validateAssistanceDeliveryContext(
  Object? value, {
  required String organizerId,
  required String eventId,
}) {
  final map = assistanceObject(value, {'mode', 'organizerId', 'eventId'});
  if (map['mode'] != _liveAssistanceMode ||
      map['organizerId'] != organizerId ||
      map['eventId'] != eventId) {
    throw const FormatException('Delivery context mismatch.');
  }
}
