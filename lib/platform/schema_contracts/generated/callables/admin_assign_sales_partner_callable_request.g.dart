// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_assign_sales_partner_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminAssignSalesPartnerCallableRequest {
  const AdminAssignSalesPartnerCallableRequest({
    required this.requestId,
    required this.organizerId,
    required this.partnerUid,
    required this.expectedRevision,
    required this.nextAction,
    required this.reviewAt,
    required this.expiresAt,
    required this.reason,
    required this.originatorUid,
  });

  final String requestId;
  final String organizerId;
  final String partnerUid;
  final int expectedRevision;
  final String nextAction;
  final String reviewAt;
  final String expiresAt;
  final String reason;
  final String? originatorUid;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'organizerId': organizerId,
    'partnerUid': partnerUid,
    'expectedRevision': expectedRevision,
    'nextAction': nextAction,
    'reviewAt': reviewAt,
    'expiresAt': expiresAt,
    'reason': reason,
    'originatorUid': originatorUid,
  };
}
