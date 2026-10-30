// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_program_walk_in_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create a minimal programGuests record for a door walk-in and check it in through the durable door journal in one transaction. The derived guest id is deterministic for the clientOperationId, so retries replay idempotently.
final class CreateProgramWalkInCallableRequest {
  const CreateProgramWalkInCallableRequest({
    required this.programId,
    required this.functionId,
    required this.displayName,
    required this.occurredAtMillis,
    this.partySize,
    this.note,
    this.deviceId,
    required this.clientOperationId,
  });

  final String programId;
  final String functionId;
  final String displayName;
  final int occurredAtMillis;
  final int? partySize;
  final String? note;
  final String? deviceId;
  final String clientOperationId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'functionId': functionId,
    'displayName': displayName,
    'occurredAtMillis': occurredAtMillis,
    'partySize': ?partySize,
    'note': ?note,
    'deviceId': ?deviceId,
    'clientOperationId': clientOperationId,
  };
}
