// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_form_payment_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Owner-only payment status or signed checkout callback; success still requires server capture verification.
final class GetOrganizerFormPaymentCallableRequest {
  const GetOrganizerFormPaymentCallableRequest({
    required this.paymentId,
    required this.callback,
  });

  final String paymentId;
  final Map<String, Object?>? callback;

  Map<String, Object?> toJson() => {
    'paymentId': paymentId,
    'callback': callback,
  };
}
