// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_grant_organizer_entitlement_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Admin-authorized grant of one entitlement SKU to an organizer. operationId makes the mutation idempotent across retries; server stamps grantedAt and grantedBy.
final class AdminGrantOrganizerEntitlementCallableRequest {
  const AdminGrantOrganizerEntitlementCallableRequest({
    required this.organizerId,
    required this.operationId,
    required this.sku,
    required this.unit,
    required this.quantityTotal,
    this.validFromMillis,
    this.validUntilMillis,
    required this.source,
    this.receiptRef,
    this.note,
  });

  final String organizerId;
  final String operationId;
  final String sku;
  final String unit;
  final int quantityTotal;
  final int? validFromMillis;
  final int? validUntilMillis;
  final String source;
  final String? receiptRef;
  final String? note;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'operationId': operationId,
    'sku': sku,
    'unit': unit,
    'quantityTotal': quantityTotal,
    'validFromMillis': ?validFromMillis,
    'validUntilMillis': ?validUntilMillis,
    'source': source,
    'receiptRef': ?receiptRef,
    'note': ?note,
  };
}
