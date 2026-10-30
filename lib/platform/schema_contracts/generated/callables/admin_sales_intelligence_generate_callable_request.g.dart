// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_intelligence_generate_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Exact-retry zero-model Operations generation from approved private Sales source IDs. No prose, provider or send parameters.
final class AdminSalesIntelligenceGenerateCallableRequest {
  const AdminSalesIntelligenceGenerateCallableRequest({
    required this.requestId,
    required this.sourceRequest,
  });

  final String requestId;
  final Map<String, Object?> sourceRequest;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'sourceRequest': sourceRequest,
  };
}
