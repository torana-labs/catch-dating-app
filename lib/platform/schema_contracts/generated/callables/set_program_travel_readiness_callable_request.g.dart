// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_program_travel_readiness_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Greeter/dispatcher leg observation: claim, unclaim, mark ready at curb, or flag disruption. clientOperationId makes offline replays safe.
final class SetProgramTravelReadinessCallableRequest {
  const SetProgramTravelReadinessCallableRequest({
    required this.programId,
    required this.legId,
    required this.action,
    required this.expectedRevision,
    this.manualCurbAtMillis,
    this.manualCurbNote,
    required this.clientOperationId,
    this.afterObservation,
    required this.observedAtMillis,
  });

  final String programId;
  final String legId;
  final String action;
  final int expectedRevision;
  final int? manualCurbAtMillis;
  final String? manualCurbNote;
  final String clientOperationId;
  final Map<String, Object?>? afterObservation;
  final int observedAtMillis;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'legId': legId,
    'action': action,
    'expectedRevision': expectedRevision,
    'manualCurbAtMillis': ?manualCurbAtMillis,
    'manualCurbNote': ?manualCurbNote,
    'clientOperationId': clientOperationId,
    'afterObservation': ?afterObservation,
    'observedAtMillis': observedAtMillis,
  };
}
