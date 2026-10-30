// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/record_program_door_journal_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Batch of door actions one function-scoped staff device recorded. The server derives journal ids, so retries and offline outbox replays are idempotent; every operation reports its own outcome.
final class RecordProgramDoorJournalCallableRequest {
  const RecordProgramDoorJournalCallableRequest({
    required this.programId,
    required this.functionId,
    required this.operations,
  });

  final String programId;
  final String functionId;
  final List<Map<String, Object?>> operations;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'functionId': functionId,
    'operations': operations,
  };
}
