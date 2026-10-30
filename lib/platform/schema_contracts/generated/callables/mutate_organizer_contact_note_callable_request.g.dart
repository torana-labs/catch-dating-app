// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/mutate_organizer_contact_note_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-authorized optimistic edit of one organizer contact note.
final class MutateOrganizerContactNoteCallableRequest {
  const MutateOrganizerContactNoteCallableRequest({
    required this.organizerId,
    required this.contactId,
    required this.noteId,
    required this.expectedRevision,
    required this.body,
  });

  final String organizerId;
  final String contactId;
  final String noteId;
  final int expectedRevision;
  final String body;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactId': contactId,
    'noteId': noteId,
    'expectedRevision': expectedRevision,
    'body': body,
  };
}
