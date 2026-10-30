// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/finalize_organizer_form_asset_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class FinalizeOrganizerFormAssetCallableRequest {
  const FinalizeOrganizerFormAssetCallableRequest({
    required this.draftId,
    required this.draftToken,
    required this.assetId,
    required this.uploadToken,
  });

  final String draftId;
  final String? draftToken;
  final String assetId;
  final String uploadToken;

  Map<String, Object?> toJson() => {
    'draftId': draftId,
    'draftToken': draftToken,
    'assetId': assetId,
    'uploadToken': uploadToken,
  };
}
