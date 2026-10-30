// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/withdraw_event_assistance_sms_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class WithdrawEventAssistanceSmsCallableRequest {
  const WithdrawEventAssistanceSmsCallableRequest({
    required this.linkId,
    required this.secret,
    required this.requestId,
    required this.expectedRevision,
  });

  final String linkId;
  final String secret;
  final String requestId;
  final int expectedRevision;

  Map<String, Object?> toJson() => {
    'linkId': linkId,
    'secret': secret,
    'requestId': requestId,
    'expectedRevision': expectedRevision,
  };
}
