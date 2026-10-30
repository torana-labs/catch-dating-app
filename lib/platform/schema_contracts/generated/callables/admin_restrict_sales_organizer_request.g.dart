// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_restrict_sales_organizer_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminRestrictSalesOrganizerRequest {
  const AdminRestrictSalesOrganizerRequest({
    required this.organizerId,
    required this.requestId,
    required this.reason,
  });

  final String organizerId;
  final String requestId;
  final String reason;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'reason': reason,
  };
}
