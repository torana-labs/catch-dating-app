// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/start_organizer_contact_conversation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager-only request to start or reuse an organizer-scoped conversation with one verified linked CRM contact.
final class StartOrganizerContactConversationCallableRequest {
  const StartOrganizerContactConversationCallableRequest({
    required this.organizerId,
    required this.contactId,
  });

  final String organizerId;
  final String contactId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'contactId': contactId,
  };
}
