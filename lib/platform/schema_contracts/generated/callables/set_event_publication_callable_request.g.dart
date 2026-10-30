// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/set_event_publication_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class SetEventPublicationCallableRequest {
  const SetEventPublicationCallableRequest({
    required this.organizerId,
    required this.requestId,
    required this.eventId,
    required this.expectedSetupRevision,
    required this.publicationState,
  });

  final String organizerId;
  final String requestId;
  final String eventId;
  final int expectedSetupRevision;
  final String publicationState;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'requestId': requestId,
    'eventId': eventId,
    'expectedSetupRevision': expectedSetupRevision,
    'publicationState': publicationState,
  };
}
