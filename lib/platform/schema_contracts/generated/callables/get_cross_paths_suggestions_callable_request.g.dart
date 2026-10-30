// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_cross_paths_suggestions_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Bounded Explore context accepted by getCrossPathsSuggestions. Event ids must come from the caller's current Explore result set; the server revalidates every event.
final class GetCrossPathsSuggestionsCallableRequest {
  const GetCrossPathsSuggestionsCallableRequest({
    required this.eventIds,
    required this.sessionId,
  });

  final List<String> eventIds;
  final String sessionId;

  Map<String, Object?> toJson() => {
    'eventIds': eventIds,
    'sessionId': sessionId,
  };
}
