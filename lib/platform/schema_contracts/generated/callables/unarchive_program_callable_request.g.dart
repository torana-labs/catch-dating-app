// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/unarchive_program_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Restore an archived program to its pre-archive status. Only valid while the grace window is still open; expectedRevision fences concurrent edits.
final class UnarchiveProgramCallableRequest {
  const UnarchiveProgramCallableRequest({
    required this.programId,
    required this.expectedRevision,
  });

  final String programId;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'expectedRevision': expectedRevision,
  };
}
