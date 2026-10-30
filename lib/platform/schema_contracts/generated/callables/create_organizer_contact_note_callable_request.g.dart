// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_contact_note_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized request to append an organizer contact note.
final class CreateOrganizerContactNoteCallableRequest {
  const CreateOrganizerContactNoteCallableRequest({
    required this.organizerId,
    required this.contactId,
    required this.body,
  });

  final String organizerId;
  final String contactId;
  final String body;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactId': contactId,
    'body': body,
  };
}
