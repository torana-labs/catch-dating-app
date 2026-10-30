// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/propose_sales_partner_demo_wording_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ProposeSalesPartnerDemoWordingCallableRequest {
  const ProposeSalesPartnerDemoWordingCallableRequest({
    required this.requestId,
    required this.organizerId,
    required this.expectedAssignmentRevision,
    required this.blueprintId,
    required this.expectedPreviewHash,
    required this.expectedProposalRevision,
    required this.wording,
  });

  final String requestId;
  final String organizerId;
  final int expectedAssignmentRevision;
  final String blueprintId;
  final String expectedPreviewHash;
  final int expectedProposalRevision;
  final Map<String, Object?> wording;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'organizerId': organizerId,
    'expectedAssignmentRevision': expectedAssignmentRevision,
    'blueprintId': blueprintId,
    'expectedPreviewHash': expectedPreviewHash,
    'expectedProposalRevision': expectedProposalRevision,
    'wording': wording,
  };
}
