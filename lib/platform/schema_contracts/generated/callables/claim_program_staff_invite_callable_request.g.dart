// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/claim_program_staff_invite_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Redeem a staff invite. The caller must be signed in with a verified phone number matching the invite's bound phone; on success a programStaffGrants document is written and the invite is consumed.
final class ClaimProgramStaffInviteCallableRequest {
  const ClaimProgramStaffInviteCallableRequest({
    required this.inviteId,
  });

  final String inviteId;

  Map<String, Object?> toJson() => {
    'inviteId': inviteId,
  };
}
