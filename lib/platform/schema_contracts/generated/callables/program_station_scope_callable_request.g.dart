// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/program_station_scope_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Pickup-station scoped program read shared by the arrivals roster and transport plan callables.
final class ProgramStationScopeCallableRequest {
  const ProgramStationScopeCallableRequest({
    required this.programId,
    this.pickupPointId,
  });

  final String programId;
  final String? pickupPointId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'pickupPointId': ?pickupPointId,
  };
}
