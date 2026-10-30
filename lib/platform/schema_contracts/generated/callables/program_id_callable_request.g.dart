// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/program_id_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Program-scoped read payload shared by simple program callables.
final class ProgramIdCallableRequest {
  const ProgramIdCallableRequest({
    required this.programId,
  });

  final String programId;

  Map<String, Object?> toJson() => {
    'programId': programId,
  };
}
