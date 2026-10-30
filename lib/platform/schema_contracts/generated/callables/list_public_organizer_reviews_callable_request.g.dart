// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_public_organizer_reviews_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by listPublicOrganizerReviews for public organizer listing review hydration.
final class ListPublicOrganizerReviewsCallableRequest {
  const ListPublicOrganizerReviewsCallableRequest({
    required this.organizerId,
  });

  final String organizerId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
  };
}
