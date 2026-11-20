/// A live operational attendee. Rehearsal has a separate execution boundary.
final class EventAssistanceGuestScope {
  EventAssistanceGuestScope({
    required this.organizerId,
    required this.eventId,
    required this.attendeeId,
  }) {
    _text(organizerId, 2000);
    _id(eventId);
    _id(attendeeId);
  }

  final String organizerId;
  final String eventId;
  final String attendeeId;

  Map<String, Object?> get context => {
    'mode': 'live',
    'eventId': eventId,
    'organizerId': organizerId,
  };

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceGuestScope &&
      other.organizerId == organizerId &&
      other.eventId == eventId &&
      other.attendeeId == attendeeId;

  @override
  int get hashCode => Object.hash(organizerId, eventId, attendeeId);
}

String _text(Object? value, int maxLength) {
  if (value is String && value.isNotEmpty && value.length <= maxLength) {
    return value;
  }
  throw const FormatException('Invalid guest scope text.');
}

String _id(Object? value) {
  final text = _text(value, 160);
  if (!RegExp(r'^[A-Za-z0-9][A-Za-z0-9._:-]*$').hasMatch(text)) {
    throw const FormatException('Invalid guest scope identity.');
  }
  return text;
}
