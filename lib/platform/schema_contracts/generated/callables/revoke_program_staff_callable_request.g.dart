// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/revoke_program_staff_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revoke a program staff grant with revision fencing. Manager-only.
final class RevokeProgramStaffCallableRequest {
  const RevokeProgramStaffCallableRequest({
    required this.programId,
    required this.uid,
    required this.expectedRevision,
  });

  final String programId;
  final String uid;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'uid': uid,
    'expectedRevision': expectedRevision,
  };
}
