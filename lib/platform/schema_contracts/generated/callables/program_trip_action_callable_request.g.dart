// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/program_trip_action_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Post-dispatch trip lifecycle payload shared by markProgramTripArrived and voidProgramTrip; the callable name carries the action.
final class ProgramTripActionCallableRequest {
  const ProgramTripActionCallableRequest({
    required this.programId,
    required this.tripId,
    this.reason,
    required this.expectedRevision,
    required this.clientOperationId,
  });

  final String programId;
  final String tripId;
  final String? reason;
  final int expectedRevision;
  final String clientOperationId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'tripId': tripId,
    'reason': ?reason,
    'expectedRevision': expectedRevision,
    'clientOperationId': clientOperationId,
  };
}
