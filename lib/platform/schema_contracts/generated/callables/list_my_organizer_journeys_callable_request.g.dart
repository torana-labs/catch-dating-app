// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_my_organizer_journeys_payload.schema.json.
// Re-exported by lib/platform/schema_contracts/generated/callable_request_dtos.g.dart.

/// A host reads how an organizer's page got here. With organizerId, that organizer's journey for its hosts. With null, the journey of each page the caller has asked to claim and is still waiting on.
final class ListMyOrganizerJourneysCallableRequest {
  const ListMyOrganizerJourneysCallableRequest({
    required this.organizerId,
  });

  final String? organizerId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
  };
}
