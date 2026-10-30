// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_organizer_form_share_assets_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Returns canonical distribution configuration for one published form.
final class GetOrganizerFormShareAssetsCallableRequest {
  const GetOrganizerFormShareAssetsCallableRequest({
    required this.organizerId,
    required this.formId,
  });

  final String organizerId;
  final String formId;

  Map<String, Object?> toJson() => {
    'organizerId': organizerId,
    'formId': formId,
  };
}
