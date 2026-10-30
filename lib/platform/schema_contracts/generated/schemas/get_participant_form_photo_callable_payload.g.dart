// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_participant_form_photo_payload.schema.json.

const schemaGetParticipantFormPhotoCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'additionalProperties': false,
  '\$id': 'https://catch.app/contracts/callables/get_participant_form_photo_payload.schema.json',
  'title': 'GetParticipantFormPhotoCallablePayload',
  'description': 'Preview one image from the verified participant’s designated form-profile question.',
  'required': <Object?>[
    'responseId',
    'questionId',
    'assetId',
  ],
  'properties': <String, Object?>{
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'questionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'assetId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
