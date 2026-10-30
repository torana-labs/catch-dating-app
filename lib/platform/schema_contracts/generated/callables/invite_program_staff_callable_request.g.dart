// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/invite_program_staff_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create a single-use, phone-bound staff invite for a program. The invite redeems into a station-scoped grant when a signed-in account with the matching verified phone claims it. Manager-only.
final class InviteProgramStaffCallableRequest {
  const InviteProgramStaffCallableRequest({
    required this.programId,
    required this.phoneNumber,
    required this.displayName,
    required this.duties,
    required this.expiresAtMillis,
  });

  final String programId;
  final String phoneNumber;
  final String displayName;
  final List<Map<String, Object?>> duties;
  final int expiresAtMillis;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'phoneNumber': phoneNumber,
    'displayName': displayName,
    'duties': duties,
    'expiresAtMillis': expiresAtMillis,
  };
}
