// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_organizer_tracking_settings_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class SetOrganizerTrackingSettingsCallableRequest {
  const SetOrganizerTrackingSettingsCallableRequest({
    required this.organizerId,
    required this.expectedRevision,
    required this.metaPixelId,
    required this.googleMeasurementId,
    required this.enabled,
  });

  final String organizerId;
  final int expectedRevision;
  final String? metaPixelId;
  final String? googleMeasurementId;
  final bool enabled;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'expectedRevision': expectedRevision,
    'metaPixelId': metaPixelId,
    'googleMeasurementId': googleMeasurementId,
    'enabled': enabled,
  };
}
