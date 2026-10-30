// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/organizer_campaign_action_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Revision-bound campaign preview, approval, dispatch, cancellation or report request.
final class OrganizerCampaignActionCallableRequest {
  const OrganizerCampaignActionCallableRequest({
    required this.organizerId,
    required this.campaignId,
    this.expectedRevision,
  });

  final String organizerId;
  final String campaignId;
  final int? expectedRevision;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'campaignId': campaignId,
    'expectedRevision': ?expectedRevision,
  };
}
