// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_sales_demo_continuation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class CreateSalesDemoContinuationCallableRequest {
  const CreateSalesDemoContinuationCallableRequest({
    required this.sessionId,
    required this.grantToken,
  });

  final String sessionId;
  final String grantToken;

  Map<String, Object?> toJson() => {
    'sessionId': sessionId,
    'grantToken': grantToken,
  };
}
