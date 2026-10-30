// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/verify_razorpay_payment_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by verifyRazorpayPayment.
final class VerifyRazorpayPaymentCallableRequest {
  const VerifyRazorpayPaymentCallableRequest({
    required this.paymentId,
    required this.orderId,
    required this.signature,
  });

  final String paymentId;
  final String orderId;
  final String signature;

  Map<String, Object?> toJson() => {
    'paymentId': paymentId,
    'orderId': orderId,
    'signature': signature,
  };
}
