import 'package:catch_dating_app/contexts/events/events.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_observation.dart';
import 'package:catch_dating_app/contexts/live/domain/event_assistance_parsing.dart';

/// A named option from verified event setup, never an observation of movement.
typedef AssistanceJoiningOption = ({
  String alternativeId,
  AssistanceJoiningTarget target,
  String label,
  EventMeetingLocation location,
});

AssistanceJoiningOption parseAssistanceJoiningOption(
  Object? value, {
  required String expectedGroupId,
}) {
  final item = assistanceObject(value, {
    'alternativeId',
    'target',
    'label',
    'location',
  });
  final alternativeId = assistanceAlternativeId(item['alternativeId']);
  final target = AssistanceJoiningTarget.fromJson(item['target']);
  if (target case AssistanceGroupCheckpoint(
    :final groupId,
  ) when groupId != expectedGroupId) {
    throw const FormatException('Joining option belongs to another group.');
  }
  return (
    alternativeId: alternativeId,
    target: target,
    label: assistanceText(item['label'], 240),
    location: _location(item['location']),
  );
}

EventMeetingLocation _location(Object? value) {
  final map = assistanceObject(value);
  const requiredKeys = {'name', 'latitude', 'longitude'};
  const optional = {'address', 'placeId', 'notes'};
  if (!requiredKeys.every(map.containsKey) ||
      map.keys.any(
        (key) => !requiredKeys.contains(key) && !optional.contains(key),
      )) {
    throw const FormatException('Invalid joining location.');
  }
  String? text(String key, int maxLength, {bool allowEmpty = true}) {
    final value = map[key];
    if (value == null) return null;
    if (allowEmpty && value == '') return '';
    return assistanceText(value, maxLength);
  }

  double coordinate(String key, int max) {
    final value = map[key];
    if (value is! num || !value.isFinite || value < -max || value > max) {
      throw const FormatException('Invalid joining coordinates.');
    }
    return value.toDouble();
  }

  return EventMeetingLocation(
    name: assistanceText(map['name'], 240),
    latitude: coordinate('latitude', 90),
    longitude: coordinate('longitude', 180),
    address: text('address', 500),
    notes: text('notes', 1000),
    placeId: text('placeId', 256, allowEmpty: false),
  );
}
