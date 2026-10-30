// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/grant_program_staff_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Grant named, station-scoped program duties to a signed-in account. Manager-only.
final class GrantProgramStaffCallableRequest {
  const GrantProgramStaffCallableRequest({
    required this.programId,
    required this.phoneNumber,
    required this.duties,
    required this.expiresAtMillis,
  });

  final String programId;
  final String phoneNumber;
  final List<Map<String, Object?>> duties;
  final int expiresAtMillis;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'phoneNumber': phoneNumber,
    'duties': duties,
    'expiresAtMillis': expiresAtMillis,
  };
}
