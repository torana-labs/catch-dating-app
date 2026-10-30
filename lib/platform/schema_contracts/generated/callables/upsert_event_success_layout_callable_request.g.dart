// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/upsert_event_success_layout_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Creates or updates one reusable organizer-owned parametric layout.
final class UpsertEventSuccessLayoutCallableRequest {
  const UpsertEventSuccessLayoutCallableRequest({
    required this.organizerId,
    this.layoutId,
    required this.label,
    required this.units,
  });

  final String organizerId;
  final String? layoutId;
  final String label;
  final List<Map<String, Object?>> units;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'layoutId': ?layoutId,
    'label': label,
    'units': units,
  };
}
