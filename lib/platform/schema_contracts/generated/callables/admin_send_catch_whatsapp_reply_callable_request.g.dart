// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_send_catch_whatsapp_reply_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminSendCatchWhatsappReplyCallableRequest {
  const AdminSendCatchWhatsappReplyCallableRequest({
    required this.purpose,
    required this.inboundEventId,
    required this.reviewedInboundTextHash,
    required this.confirmSupportRequest,
    required this.body,
  });

  final String purpose;
  final String inboundEventId;
  final String reviewedInboundTextHash;
  final bool confirmSupportRequest;
  final String body;

  Map<String, Object?> toJson() => {
    'purpose': purpose,
    'inboundEventId': inboundEventId,
    'reviewedInboundTextHash': reviewedInboundTextHash,
    'confirmSupportRequest': confirmSupportRequest,
    'body': body,
  };
}
