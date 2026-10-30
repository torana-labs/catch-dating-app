// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// Typed callable request DTO emitted from callables/get_participant_form_photo_payload.schema.json.
// Re-exported by lib/core/schema_contracts/generated/callable_request_dtos.g.dart.

/// Preview one image from the verified participant’s designated form-profile question.
final class GetParticipantFormPhotoCallableRequest {
  const GetParticipantFormPhotoCallableRequest({
    required this.responseId,
    required this.questionId,
    required this.assetId,
  });

  final String responseId;
  final String questionId;
  final String assetId;

  Map<String, Object?> toJson() => {
    'responseId': responseId,
    'questionId': questionId,
    'assetId': assetId,
  };
}
