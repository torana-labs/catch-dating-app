// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/send_organizer_whatsapp_reply_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class SendOrganizerWhatsappReplyCallableRequest {
  const SendOrganizerWhatsappReplyCallableRequest({
    required this.organizerId,
    required this.threadId,
    required this.body,
    required this.expectedLastInboundAtMillis,
    required this.idempotencyKey,
  });

  final String organizerId;
  final String threadId;
  final String body;
  final int expectedLastInboundAtMillis;
  final String idempotencyKey;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'threadId': threadId,
    'body': body,
    'expectedLastInboundAtMillis': expectedLastInboundAtMillis,
    'idempotencyKey': idempotencyKey,
  };
}
