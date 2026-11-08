import 'dart:convert';

const eventCheckInQrKind = 'catch:event-check-in';
const eventVenueSessionQrKind = 'catch:event-venue-session';
const eventTicketQrKind = 'catch:event-ticket';

/// Every Catch event code a camera can read: the event's printable door
/// code, the live venue session the host screen shows, or one guest's
/// ticket.
sealed class EventCheckInQrCode {
  const EventCheckInQrCode();

  /// The event the code belongs to.
  String get eventId;

  /// The code [rawValue] carries, or null when it is not a Catch event code.
  /// A ticket is tried first, then the live venue session, then the door
  /// code.
  static EventCheckInQrCode? tryParse(String rawValue) =>
      EventTicketQrPayload.tryParse(rawValue) ??
      EventVenueSessionQrPayload.tryParse(rawValue) ??
      EventCheckInQrPayload.tryParse(rawValue);
}

/// The event's printable door code. It names the event and proves nothing.
class EventCheckInQrPayload extends EventCheckInQrCode {
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

  @override
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

/// The live venue session the host screen shows; guests scan it to check
/// themselves in.
class EventVenueSessionQrPayload extends EventCheckInQrCode {
  const EventVenueSessionQrPayload({
    required this.eventId,
    required this.venueSessionToken,
  });

  @override
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

/// One guest's ticket: the signed code `getEventTicketCode` returns. The door
/// turns it into the attendee with `resolveEventTicketCode`.
class EventTicketQrPayload extends EventCheckInQrCode {
  const EventTicketQrPayload({required this.eventId, required this.ticketCode});

  @override
  final String eventId;
  final String ticketCode;

  String encode() => jsonEncode({
    'kind': eventTicketQrKind,
    'v': 1,
    'eventId': eventId,
    'ticketCode': ticketCode,
  });

  static EventTicketQrPayload? tryParse(String rawValue) {
    try {
      final decoded = jsonDecode(rawValue);
      if (decoded is! Map<String, Object?> ||
          decoded['kind'] != eventTicketQrKind ||
          decoded['v'] != 1) {
        return null;
      }
      final eventId = decoded['eventId'];
      final ticketCode = decoded['ticketCode'];
      if (eventId is! String ||
          ticketCode is! String ||
          eventId.trim().isEmpty ||
          !_ticketCodePattern.hasMatch(ticketCode.trim())) {
        return null;
      }
      return EventTicketQrPayload(
        eventId: eventId.trim(),
        ticketCode: ticketCode.trim(),
      );
    } on Object {
      return null;
    }
  }
}

final _ticketCodePattern = RegExp(r'^[A-Za-z0-9_-]{8,596}\.[A-Za-z0-9_-]{43}$');
