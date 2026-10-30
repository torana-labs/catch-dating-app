// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_intelligence_policy_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Admin Owner exact-retry mutation of a private seven-factor runtime policy; no policy values are published in source.
final class AdminSalesIntelligencePolicyCallableRequest {
  const AdminSalesIntelligencePolicyCallableRequest({
    required this.requestId,
    required this.expectedRevision,
    required this.policy,
  });

  final String requestId;
  final int expectedRevision;
  final Map<String, Object?> policy;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'policy': policy,
  };
}
