// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/withdraw_participant_messaging_permission_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Withdraw exactly one sender’s WhatsApp permission using the reviewed receipt. Never grants consent.
final class WithdrawParticipantMessagingPermissionCallableRequest {
  const WithdrawParticipantMessagingPermissionCallableRequest({
    required this.scope,
    required this.organizerId,
    this.purpose,
    required this.expectedReceiptId,
    required this.requestId,
  });

  final String scope;
  final String? organizerId;
  final String? purpose;
  final String? expectedReceiptId;
  final String requestId;

  Map<String, Object?> toJson() => {
    'scope': scope,
    'organizerId': organizerId,
    'purpose': ?purpose,
    'expectedReceiptId': expectedReceiptId,
    'requestId': requestId,
  };
}
