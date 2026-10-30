// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/archive_program_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Archive a program: explicit owner/manager action that starts the 14-day anonymization grace window. expectedRevision fences concurrent edits.
final class ArchiveProgramCallableRequest {
  const ArchiveProgramCallableRequest({
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
