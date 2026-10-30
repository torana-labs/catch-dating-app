// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/delete_program_guest_group_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Delete a program guest group and scrub its id from member programGuests.groupIds in bounded batches.
final class DeleteProgramGuestGroupCallableRequest {
  const DeleteProgramGuestGroupCallableRequest({
    required this.programId,
    required this.groupId,
    this.expectedRevision,
  });

  final String programId;
  final String groupId;
  final int? expectedRevision;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'groupId': groupId,
    'expectedRevision': ?expectedRevision,
  };
}
