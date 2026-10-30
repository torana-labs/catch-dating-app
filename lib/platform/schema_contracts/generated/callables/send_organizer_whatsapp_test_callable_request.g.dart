// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/send_organizer_whatsapp_test_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Sends one manager-authorized template message to verify an organizer-owned WhatsApp sender.
final class SendOrganizerWhatsappTestCallableRequest {
  const SendOrganizerWhatsappTestCallableRequest({
    required this.organizerId,
    required this.connectionId,
    required this.templateId,
    required this.toE164,
    required this.templateVariables,
  });

  final String organizerId;
  final String connectionId;
  final String templateId;
  final String toE164;
  final Map<String, Object?> templateVariables;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'connectionId': connectionId,
    'templateId': templateId,
    'toE164': toE164,
    'templateVariables': templateVariables,
  };
}
