class EventVenueSession {
  const EventVenueSession({
    required this.eventId,
    required this.venueSessionToken,
    required this.expiresAtMillis,
    required this.refreshAfterMillis,
  });

  factory EventVenueSession.fromCallableData(Object? data) {
    if (data is! Map<Object?, Object?>) {
      throw const FormatException('Invalid venue session response.');
    }
    final eventId = data['eventId'];
    final token = data['venueSessionToken'];
    final expiresAtMillis = data['expiresAtMillis'];
    final refreshAfterMillis = data['refreshAfterMillis'];
    if (eventId is! String ||
        token is! String ||
        expiresAtMillis is! num ||
        refreshAfterMillis is! num) {
      throw const FormatException('Invalid venue session response.');
    }
    return EventVenueSession(
      eventId: eventId,
      venueSessionToken: token,
      expiresAtMillis: expiresAtMillis.toInt(),
      refreshAfterMillis: refreshAfterMillis.toInt(),
    );
  }

  final String eventId;
  final String venueSessionToken;
  final int expiresAtMillis;
  final int refreshAfterMillis;
}
