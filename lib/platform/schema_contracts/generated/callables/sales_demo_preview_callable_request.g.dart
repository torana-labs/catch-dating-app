// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/sales_demo_preview.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Generic anonymous unfurl; personalized preview requires current invited contact and bearer grant. No session consumption.
final class SalesDemoPreviewCallableRequest {
  const SalesDemoPreviewCallableRequest({
    required this.invitationId,
    this.grantToken,
  });

  final String invitationId;
  final String? grantToken;

  Map<String, Object?> toJson() => {
    'invitationId': invitationId,
    'grantToken': ?grantToken,
  };
}
