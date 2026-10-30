// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_form_templates_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Lists the versioned organizer form templates available to one manager.
final class ListOrganizerFormTemplatesCallableRequest {
  const ListOrganizerFormTemplatesCallableRequest({
    required this.organizerId,
  });

  final String organizerId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
  };
}
