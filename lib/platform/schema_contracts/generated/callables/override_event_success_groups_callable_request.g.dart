// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/override_event_success_groups_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Callable payload accepted by overrideEventSuccessGroups.
final class OverrideEventSuccessGroupsCallableRequest {
  const OverrideEventSuccessGroupsCallableRequest({
    required this.eventId,
    required this.rounds,
  });

  final String eventId;
  final List<Map<String, Object?>> rounds;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
    'rounds': rounds,
  };
}
