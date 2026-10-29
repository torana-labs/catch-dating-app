const currentCrossPathsTermsVersion = 1;

enum CrossPathsConsentSource {
  bookingSuccess('booking_success'),
  eventDetail('event_detail'),
  settings('settings');

  const CrossPathsConsentSource(this.wireValue);
  final String wireValue;
}

final class CrossPathsEventConsent {
  const CrossPathsEventConsent({
    required this.eventId,
    required this.uid,
    required this.enabled,
    required this.termsVersion,
    required this.consentedAt,
    required this.updatedAt,
    required this.revokedAt,
    required this.source,
  });

  final String eventId;
  final String uid;
  final bool enabled;
  final int termsVersion;
  final DateTime? consentedAt;
  final DateTime? updatedAt;
  final DateTime? revokedAt;
  final String source;
}

String crossPathsEventConsentId({
  required String eventId,
  required String uid,
}) => '${eventId}_$uid';
