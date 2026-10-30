// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/create_organizer_form_asset_intent_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

final class CreateOrganizerFormAssetIntentCallableRequest {
  const CreateOrganizerFormAssetIntentCallableRequest({
    required this.draftId,
    required this.draftToken,
    required this.questionId,
    required this.requestId,
    required this.originalFileName,
    required this.contentType,
    required this.sizeBytes,
    required this.sha256,
  });

  final String draftId;
  final String? draftToken;
  final String questionId;
  final String requestId;
  final String originalFileName;
  final String contentType;
  final int sizeBytes;
  final String sha256;

  Map<String, Object?> toJson() => {
    'draftId': draftId,
    'draftToken': draftToken,
    'questionId': questionId,
    'requestId': requestId,
    'originalFileName': originalFileName,
    'contentType': contentType,
    'sizeBytes': sizeBytes,
    'sha256': sha256,
  };
}
