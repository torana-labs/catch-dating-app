// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_contact_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-only creation of an organizer CRM contact with a required name, at least one unverified phone or email endpoint, and an optional initial private note. It does not create an attendee, Consumer account, or messaging permission.
final class CreateOrganizerContactCallableRequest {
  const CreateOrganizerContactCallableRequest({
    required this.organizerId,
    required this.displayName,
    this.phoneE164,
    this.email,
    this.initialNote,
  });

  final String organizerId;
  final String displayName;
  final String? phoneE164;
  final String? email;
  final String? initialNote;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'displayName': displayName,
    'phoneE164': ?phoneE164,
    'email': ?email,
    'initialNote': ?initialNote,
  };
}
