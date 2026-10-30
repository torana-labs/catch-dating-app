// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_revise_sales_quote_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Strict private Sales commercial request; current role, scope, revision and evidence policy are transactional.
final class AdminReviseSalesQuoteCallableRequest {
  const AdminReviseSalesQuoteCallableRequest({
    required this.organizerId,
    required this.opportunityId,
    required this.requestId,
    required this.expectedRevision,
    required this.terms,
  });

  final String organizerId;
  final String opportunityId;
  final String requestId;
  final int expectedRevision;
  final Map<String, Object?> terms;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'opportunityId': opportunityId,
    'requestId': requestId,
    'expectedRevision': expectedRevision,
    'terms': terms,
  };
}
