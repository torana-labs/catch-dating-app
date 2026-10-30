// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_travel_party_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Server-owned ride-together membership for specific travel legs. This is independent of invitation households and does not apply to a guest's other journeys.
final class UpsertProgramTravelPartyCallableRequest {
  const UpsertProgramTravelPartyCallableRequest({
    required this.programId,
    this.partyId,
    this.expectedRevision,
    this.label,
    required this.dedicatedVehicle,
    required this.legIds,
  });

  final String programId;
  final String? partyId;
  final int? expectedRevision;
  final String? label;
  final bool dedicatedVehicle;
  final List<String> legIds;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'partyId': ?partyId,
    'expectedRevision': ?expectedRevision,
    'label': ?label,
    'dedicatedVehicle': dedicatedVehicle,
    'legIds': legIds,
  };
}
