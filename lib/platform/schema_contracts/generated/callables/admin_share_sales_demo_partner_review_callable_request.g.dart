// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/admin_share_sales_demo_partner_review_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class AdminShareSalesDemoPartnerReviewCallableRequest {
  const AdminShareSalesDemoPartnerReviewCallableRequest({
    required this.requestId,
    required this.blueprintId,
    required this.expectedBlueprintRevision,
    required this.expectedSharingRevision,
    required this.partnerUid,
    required this.expectedAssignmentRevision,
    required this.expectedPreviewHash,
    required this.decision,
    required this.expiresAt,
  });

  final String requestId;
  final String blueprintId;
  final int expectedBlueprintRevision;
  final int expectedSharingRevision;
  final String partnerUid;
  final int expectedAssignmentRevision;
  final String expectedPreviewHash;
  final String decision;
  final String? expiresAt;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'blueprintId': blueprintId,
    'expectedBlueprintRevision': expectedBlueprintRevision,
    'expectedSharingRevision': expectedSharingRevision,
    'partnerUid': partnerUid,
    'expectedAssignmentRevision': expectedAssignmentRevision,
    'expectedPreviewHash': expectedPreviewHash,
    'decision': decision,
    'expiresAt': expiresAt,
  };
}
