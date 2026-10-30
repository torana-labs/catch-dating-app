// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_sales_contacts_upsert_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Private bounded Sales callable request. Server authorization and transaction policy are enforced separately.
final class AdminUpsertSalesContactCallableRequest {
  const AdminUpsertSalesContactCallableRequest({
    required this.organizerId,
    required this.requestId,
    required this.expectedRevision,
    this.contactId,
    this.linkExisting,
    required this.contact,
    required this.relationship,
  });

  final String organizerId;
  final String requestId;
  final int expectedRevision;
  final String? contactId;
  final bool? linkExisting;
  final Map<String, Object?> contact;
  final Map<String, Object?> relationship;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'contactId': ?contactId,
    'linkExisting': ?linkExisting,
    'contact': contact,
    'relationship': relationship,
  };
}
