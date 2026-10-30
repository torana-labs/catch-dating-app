// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_whatsapp_thread_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetOrganizerWhatsappThreadCallableRequest {
  const GetOrganizerWhatsappThreadCallableRequest({
    required this.organizerId,
    required this.threadId,
  });

  final String organizerId;
  final String threadId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'threadId': threadId,
  };
}
