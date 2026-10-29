import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// One live event. Synthetic execution has a separate rehearsal boundary.
final class EventAssistanceRuntimeScope {
  EventAssistanceRuntimeScope({
    required this.organizerId,
    required this.eventId,
  }) {
    assistanceText(organizerId);
    assistanceId(eventId);
    if (organizerId.contains('/')) {
      throw const FormatException('Invalid organizer identity.');
    }
  }
  final String organizerId;
  final String eventId;
  Map<String, Object?> get context => {
    'mode': 'live',
    'organizerId': organizerId,
    'eventId': eventId,
  };
  void requireMatch(Object? value) {
    final map = assistanceObject(value, {'mode', 'organizerId', 'eventId'});
    if (map['mode'] != 'live' ||
        map['organizerId'] != organizerId ||
        map['eventId'] != eventId) {
      throw const FormatException('Event automation scope mismatch.');
    }
  }

  @override
  bool operator ==(Object other) =>
      other is EventAssistanceRuntimeScope &&
      other.organizerId == organizerId &&
      other.eventId == eventId;
  @override
  int get hashCode => Object.hash(organizerId, eventId);
}
