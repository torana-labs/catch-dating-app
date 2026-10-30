// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_event_runtime_bootstrap_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Opaque public Event Success runtime lookup.
final class GetEventRuntimeBootstrapCallableRequest {
  const GetEventRuntimeBootstrapCallableRequest({
    required this.publicRuntimeId,
  });

  final String publicRuntimeId;

  Map<String, Object?> toJson() => {
    'publicRuntimeId': publicRuntimeId,
  };
}
