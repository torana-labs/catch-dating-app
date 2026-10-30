// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_luma_events_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager request to verify a calendar-scoped Luma API key and list manageable events without persisting the key.
final class ListOrganizerLumaEventsCallableRequest {
  const ListOrganizerLumaEventsCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.apiKey,
  });

  final String organizerId;
  final String eventId;
  final String apiKey;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'apiKey': apiKey,
  };
}
