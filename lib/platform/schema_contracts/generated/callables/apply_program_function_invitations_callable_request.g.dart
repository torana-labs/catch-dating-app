// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/apply_program_function_invitations_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Set one program function's invitation mode and, for selectedGuests functions, the explicit invited guest list. The callable diffs the desired list against current programFunctionGuests rows; unknown guest ids are ignored.
final class ApplyProgramFunctionInvitationsCallableRequest {
  const ApplyProgramFunctionInvitationsCallableRequest({
    required this.programId,
    required this.functionId,
    required this.invitationMode,
    this.selectedGuestIds,
    required this.expectedRevision,
  });

  final String programId;
  final String functionId;
  final String invitationMode;
  final List<String>? selectedGuestIds;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'functionId': functionId,
    'invitationMode': invitationMode,
    'selectedGuestIds': ?selectedGuestIds,
    'expectedRevision': expectedRevision,
  };
}
