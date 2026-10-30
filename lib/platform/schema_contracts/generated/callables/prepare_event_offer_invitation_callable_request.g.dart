// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/prepare_event_offer_invitation_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class PrepareEventOfferInvitationCallableRequest {
  const PrepareEventOfferInvitationCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.offerId,
    required this.responseId,
    required this.expectedOfferGeneration,
    required this.expectedOfferRevision,
  });

  final String organizerId;
  final String eventId;
  final String offerId;
  final String responseId;
  final int expectedOfferGeneration;
  final int expectedOfferRevision;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'offerId': offerId,
    'responseId': responseId,
    'expectedOfferGeneration': expectedOfferGeneration,
    'expectedOfferRevision': expectedOfferRevision,
  };
}
