// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/connect_organizer_luma_provider_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Connect a calendar-scoped Luma API key and map one Catch event after provider verification.
final class ConnectOrganizerLumaProviderCallableRequest {
  const ConnectOrganizerLumaProviderCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.externalEventId,
    required this.apiKey,
  });

  final String organizerId;
  final String eventId;
  final String externalEventId;
  final String apiKey;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'externalEventId': externalEventId,
    'apiKey': apiKey,
  };
}
