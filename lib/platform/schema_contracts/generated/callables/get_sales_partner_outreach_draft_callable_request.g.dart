// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_sales_partner_outreach_draft_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetSalesPartnerOutreachDraftCallableRequest {
  const GetSalesPartnerOutreachDraftCallableRequest({
    required this.organizerId,
    required this.expectedAssignmentRevision,
    required this.draftId,
  });

  final String organizerId;
  final int expectedAssignmentRevision;
  final String draftId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'expectedAssignmentRevision': expectedAssignmentRevision,
    'draftId': draftId,
  };
}
