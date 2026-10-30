// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/update_sales_partner_assignment_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class UpdateSalesPartnerAssignmentCallableRequest {
  const UpdateSalesPartnerAssignmentCallableRequest({
    required this.requestId,
    required this.organizerId,
    required this.expectedRevision,
    required this.relationshipContext,
    required this.channel,
    required this.nextAction,
    required this.reviewAt,
  });

  final String requestId;
  final String organizerId;
  final int expectedRevision;
  final String? relationshipContext;
  final String channel;
  final String nextAction;
  final String reviewAt;

  Map<String, Object?> toJson() => {
    'requestId': requestId,
    'organizerId': organizerId,
    'expectedRevision': expectedRevision,
    'relationshipContext': relationshipContext,
    'channel': channel,
    'nextAction': nextAction,
    'reviewAt': reviewAt,
  };
}
