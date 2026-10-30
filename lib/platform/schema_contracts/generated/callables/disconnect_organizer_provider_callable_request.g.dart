// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/disconnect_organizer_provider_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager request to revoke one organizer provider connection and stop future synchronization.
final class DisconnectOrganizerProviderCallableRequest {
  const DisconnectOrganizerProviderCallableRequest({
    required this.organizerId,
    required this.eventId,
    required this.connectionId,
  });

  final String organizerId;
  final String eventId;
  final String connectionId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
    'connectionId': connectionId,
  };
}
