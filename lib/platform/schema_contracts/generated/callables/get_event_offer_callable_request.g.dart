// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_offer_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class GetEventOfferCallableRequest {
  const GetEventOfferCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.contactId,
  });

  final String organizerId;
  final String eventId;
  final String contactId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'contactId': contactId,
  };
}
