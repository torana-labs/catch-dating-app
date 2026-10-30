// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_revoke_sales_partner_access_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminRevokeSalesPartnerAccessCallableRequest {
  const AdminRevokeSalesPartnerAccessCallableRequest({
    required this.requestId,
    required this.organizerId,
    required this.partnerUid,
    required this.expectedRevision,
    required this.reason,
  });

  final String requestId;
  final String? organizerId;
  final String partnerUid;
  final int expectedRevision;
  final String reason;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'organizerId': organizerId,
    'partnerUid': partnerUid,
    'expectedRevision': expectedRevision,
    'reason': reason,
  };
}
