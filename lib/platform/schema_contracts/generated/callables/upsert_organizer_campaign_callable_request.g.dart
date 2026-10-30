// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_organizer_campaign_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates or revision-updates one draft WhatsApp organizer campaign that consumes a Customers-owned saved audience id.
final class UpsertOrganizerCampaignCallableRequest {
  const UpsertOrganizerCampaignCallableRequest({
    required this.organizerId,
    this.campaignId,
    required this.requestId,
    this.expectedRevision,
    required this.name,
    required this.messageClass,
    required this.savedAudienceId,
    required this.connectionId,
    required this.templateId,
    required this.templateVariables,
    this.eventId,
    this.inviteDestinationKind,
    this.scheduledAtMillis,
    this.recipientSource,
  });

  final String organizerId;
  final String? campaignId;
  final String requestId;
  final int? expectedRevision;
  final String name;
  final String messageClass;
  final String? savedAudienceId;
  final String connectionId;
  final String templateId;
  final Map<String, Object?> templateVariables;
  final String? eventId;
  final String? inviteDestinationKind;
  final int? scheduledAtMillis;
  final Map<String, Object?>? recipientSource;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'campaignId': ?campaignId,
    'requestId': requestId,
    'expectedRevision': ?expectedRevision,
    'name': name,
    'messageClass': messageClass,
    'savedAudienceId': savedAudienceId,
    'connectionId': connectionId,
    'templateId': templateId,
    'templateVariables': templateVariables,
    'eventId': ?eventId,
    'inviteDestinationKind': ?inviteDestinationKind,
    'scheduledAtMillis': ?scheduledAtMillis,
    'recipientSource': ?recipientSource,
  };
}
