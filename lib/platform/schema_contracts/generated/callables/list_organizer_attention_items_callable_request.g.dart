// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/list_organizer_attention_items_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Requests a complete, read-through-reconciled Host Today attention projection for one managed organizer.
final class ListOrganizerAttentionItemsCallableRequest {
  const ListOrganizerAttentionItemsCallableRequest({
    required this.organizerId,
  });

  final String organizerId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
  };
}
