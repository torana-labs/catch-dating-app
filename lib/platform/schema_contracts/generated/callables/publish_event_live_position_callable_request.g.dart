// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/publish_event_live_position_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class PublishEventLivePositionCallableRequest {
  const PublishEventLivePositionCallableRequest({
    required this.eventId,
    required this.sharing,
    required this.latitude,
    required this.longitude,
    required this.accuracyMeters,
    required this.headingDegrees,
  });

  final String eventId;
  final bool sharing;
  final double? latitude;
  final double? longitude;
  final double? accuracyMeters;
  final double? headingDegrees;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'sharing': sharing,
    'latitude': latitude,
    'longitude': longitude,
    'accuracyMeters': accuracyMeters,
    'headingDegrees': headingDegrees,
  };
}
