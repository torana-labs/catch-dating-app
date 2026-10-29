import 'dart:convert';

const eventCheckInQrKind = 'catch:event-check-in';
const eventVenueSessionQrKind = 'catch:event-venue-session';

class EventCheckInQrPayload {
  const EventCheckInQrPayload({required this.eventId});

  factory EventCheckInQrPayload.fromJson(Map<String, Object?> json) {
    final kind = json['kind'];
    final version = json['v'];
    final eventId = json['eventId'];
    if (kind != eventCheckInQrKind || version != 1 || eventId is! String) {
      throw const FormatException('Unsupported event check-in QR code.');
    }
    final normalizedEventId = eventId.trim();
    if (normalizedEventId.isEmpty) {
      throw const FormatException(
        'Event check-in QR code is missing event id.',
      );
    }
    return EventCheckInQrPayload(eventId: normalizedEventId);
  }

  final String eventId;

  String encode() =>
      jsonEncode({'kind': eventCheckInQrKind, 'v': 1, 'eventId': eventId});

  static EventCheckInQrPayload? tryParse(String rawValue) {
    try {
      final decoded = jsonDecode(rawValue);
      if (decoded is! Map<String, Object?>) return null;
      return EventCheckInQrPayload.fromJson(decoded);
    } on FormatException {
      return null;
    } on Object {
      return null;
    }
  }
}

class EventVenueSessionQrPayload {
  const EventVenueSessionQrPayload({
    required this.eventId,
    required this.venueSessionToken,
  });

  final String eventId;
  final String venueSessionToken;

  String encode({Uri? runtimeJoinUri}) {
    if (runtimeJoinUri != null) {
      final fragment = Uri(
        queryParameters: {
          'eventId': eventId,
          'venueSession': venueSessionToken,
        },
      ).query;
      return runtimeJoinUri.replace(fragment: fragment).toString();
    }
    return jsonEncode({
      'kind': eventVenueSessionQrKind,
      'v': 2,
      'eventId': eventId,
      'venueSessionToken': venueSessionToken,
    });
  }

  static EventVenueSessionQrPayload? tryParse(String rawValue) {
    final uri = Uri.tryParse(rawValue);
    if (uri != null && uri.fragment.isNotEmpty) {
      try {
        final fragment = Uri.splitQueryString(uri.fragment);
        final eventId = fragment['eventId']?.trim();
        final token = fragment['venueSession']?.trim();
        if (eventId != null &&
            eventId.isNotEmpty &&
            token != null &&
            token.isNotEmpty) {
          return EventVenueSessionQrPayload(
            eventId: eventId,
            venueSessionToken: token,
          );
        }
      } on FormatException {
        return null;
      }
    }
    try {
      final decoded = jsonDecode(rawValue);
      if (decoded is! Map<String, Object?> ||
          decoded['kind'] != eventVenueSessionQrKind ||
          decoded['v'] != 2) {
        return null;
      }
      final eventId = decoded['eventId'];
      final token = decoded['venueSessionToken'];
      if (eventId is! String ||
          token is! String ||
          eventId.trim().isEmpty ||
          token.trim().isEmpty) {
        return null;
      }
      return EventVenueSessionQrPayload(
        eventId: eventId.trim(),
        venueSessionToken: token.trim(),
      );
    } on Object {
      return null;
    }
  }
}
