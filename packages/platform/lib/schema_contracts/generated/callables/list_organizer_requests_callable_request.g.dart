// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_requests_payload.schema.json.
// Re-exported by packages/platform/lib/schema_contracts/generated/callable_request_dtos.g.dart.

/// An organizer's host reads everyone waiting to be let in across that organizer's coming events: join requests and the waitlist.
final class ListOrganizerRequestsCallableRequest {
  const ListOrganizerRequestsCallableRequest({
    required this.organizerId,
  });

  final String organizerId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
  };
}
