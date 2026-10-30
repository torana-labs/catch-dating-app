// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/revoke_program_staff_invite_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revoke a pending program staff invite so the link can no longer be claimed. Manager-only; claimed invites are unaffected (revoke the grant instead).
final class RevokeProgramStaffInviteCallableRequest {
  const RevokeProgramStaffInviteCallableRequest({
    required this.programId,
    required this.inviteId,
  });

  final String programId;
  final String inviteId;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'inviteId': inviteId,
  };
}
