// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_pickup_point_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update a program pickup station such as an airport terminal arrivals zone.
final class UpsertProgramPickupPointCallableRequest {
  const UpsertProgramPickupPointCallableRequest({
    required this.programId,
    this.pickupPointId,
    this.expectedRevision,
    required this.kind,
    required this.label,
    this.iataCode,
    this.terminal,
    this.meetingZone,
    this.latitude,
    this.longitude,
    this.instructions,
    this.active,
  });

  final String programId;
  final String? pickupPointId;
  final int? expectedRevision;
  final String kind;
  final String label;
  final String? iataCode;
  final String? terminal;
  final String? meetingZone;
  final double? latitude;
  final double? longitude;
  final String? instructions;
  final bool? active;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'pickupPointId': ?pickupPointId,
    'expectedRevision': ?expectedRevision,
    'kind': kind,
    'label': label,
    'iataCode': ?iataCode,
    'terminal': ?terminal,
    'meetingZone': ?meetingZone,
    'latitude': ?latitude,
    'longitude': ?longitude,
    'instructions': ?instructions,
    'active': ?active,
  };
}
