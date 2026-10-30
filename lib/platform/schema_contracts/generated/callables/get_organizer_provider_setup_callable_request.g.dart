// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_provider_setup_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Manager request for safe provider capabilities and one event mapping.
final class GetOrganizerProviderSetupCallableRequest {
  const GetOrganizerProviderSetupCallableRequest({
    required this.organizerId,
    required this.eventId,
  });

  final String organizerId;
  final String eventId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'eventId': eventId,
  };
}
