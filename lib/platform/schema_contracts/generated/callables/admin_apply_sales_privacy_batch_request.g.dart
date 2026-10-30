// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_apply_sales_privacy_batch_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminApplySalesPrivacyBatchRequest {
  const AdminApplySalesPrivacyBatchRequest({
    required this.organizerId,
    required this.planId,
    required this.requestId,
    required this.expectedCursor,
  });

  final String organizerId;
  final String planId;
  final String requestId;
  final int expectedCursor;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'planId': planId,
    'requestId': requestId,
    'expectedCursor': expectedCursor,
  };
}
