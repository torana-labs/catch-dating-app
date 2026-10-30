// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_program_guest_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Create or update one program guest. guestId absent creates; expectedRevision fences updates. A shared phone never merges guests.
final class UpsertProgramGuestCallableRequest {
  const UpsertProgramGuestCallableRequest({
    required this.programId,
    this.guestId,
    this.expectedRevision,
    required this.displayName,
    this.householdId,
    this.groupIds,
    this.phoneE164,
    this.email,
    this.externalReference,
    this.rsvpStatus,
    this.fieldChoices,
  });

  final String programId;
  final String? guestId;
  final int? expectedRevision;
  final String displayName;
  final String? householdId;
  final List<String>? groupIds;
  final String? phoneE164;
  final String? email;
  final String? externalReference;
  final String? rsvpStatus;
  final Map<String, Object?>? fieldChoices;

  Map<String, Object?> toJson() => {
    'programId': programId,
    'guestId': ?guestId,
    'expectedRevision': ?expectedRevision,
    'displayName': displayName,
    'householdId': ?householdId,
    'groupIds': ?groupIds,
    'phoneE164': ?phoneE164,
    'email': ?email,
    'externalReference': ?externalReference,
    'rsvpStatus': ?rsvpStatus,
    'fieldChoices': ?fieldChoices,
  };
}
