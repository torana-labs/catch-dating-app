// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_success_spatial_layout_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Requests the selected reusable layout for one authorized event participant or manager.
final class GetEventSuccessSpatialLayoutCallableRequest {
  const GetEventSuccessSpatialLayoutCallableRequest({
    required this.eventId,
  });

  final String eventId;

  Map<String, Object?> toJson() => {
    'eventId': eventId,
  };
}
