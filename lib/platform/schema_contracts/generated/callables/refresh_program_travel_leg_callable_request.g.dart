// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/refresh_program_travel_leg_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manual flight-status refresh for a single travel leg; any active program staff member may request it.
final class RefreshProgramTravelLegCallableRequest {
  const RefreshProgramTravelLegCallableRequest({
    required this.programId,
    required this.legId,
  });

  final String programId;
  final String legId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'legId': legId,
  };
}
