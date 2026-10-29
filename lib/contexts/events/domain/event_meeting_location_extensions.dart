import 'package:catch_dating_app/contexts/events/domain/event_meeting_location.dart';

EventMeetingLocation? eventMeetingLocationFromLegacy({
  required String name,
  required double? latitude,
  required double? longitude,
  String? notes,
}) {
  final normalizedName = name.trim();
  if (normalizedName.isEmpty || latitude == null || longitude == null) {
    return null;
  }
  return EventMeetingLocation(
    name: normalizedName,
    latitude: latitude,
    longitude: longitude,
    notes: _trimToNull(notes),
  );
}

extension EventMeetingLocationX on EventMeetingLocation {
  EventMeetingLocation normalized() {
    return EventMeetingLocation(
      name: name.trim(),
      address: _trimToNull(address),
      placeId: _trimToNull(placeId),
      latitude: latitude,
      longitude: longitude,
      notes: _trimToNull(notes),
    );
  }
}

String? _trimToNull(String? value) {
  final normalized = value?.trim();
  if (normalized == null || normalized.isEmpty) return null;
  return normalized;
}
