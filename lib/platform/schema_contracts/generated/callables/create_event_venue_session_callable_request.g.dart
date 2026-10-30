// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_event_venue_session_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Requests a short-lived signed venue-presence session for the Host live QR.
final class CreateEventVenueSessionCallableRequest {
  const CreateEventVenueSessionCallableRequest({
    required this.eventId,
  });

  final String eventId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
  };
}
