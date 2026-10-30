// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_event_offers_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class ListEventOffersCallableRequest {
  const ListEventOffersCallableRequest({
    required this.organizerId,
    required this.eventId,
    this.limit,
    this.afterOfferId,
  });

  final String organizerId;
  final String eventId;
  final int? limit;
  final String? afterOfferId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'limit': ?limit,
    'afterOfferId': ?afterOfferId,
  };
}
