// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/prepare_sales_demo_continuation_form_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class PrepareSalesDemoContinuationFormCallableRequest {
  const PrepareSalesDemoContinuationFormCallableRequest({
    required this.continuationId,
    required this.setupHash,
  });

  final String continuationId;
  final String setupHash;

  Map<String, Object?> toJson() => {
    'continuationId': continuationId,
    'setupHash': setupHash,
  };
}
