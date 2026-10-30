// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_event_waitlist_offers_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by createEventWaitlistOffers.
final class CreateEventWaitlistOffersCallableRequest {
  const CreateEventWaitlistOffersCallableRequest({
    required this.eventId,
    required this.userIds,
    this.expiresInMinutes,
  });

  final String eventId;
  final List<String> userIds;
  final int? expiresInMinutes;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'userIds': userIds,
    'expiresInMinutes': ?expiresInMinutes,
  };
}
