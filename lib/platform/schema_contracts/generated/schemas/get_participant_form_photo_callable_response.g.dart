// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_participant_form_photo_response.schema.json.

const schemaGetParticipantFormPhotoCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'additionalProperties': false,
  '\$id': 'https://catch.app/contracts/callable_responses/get_participant_form_photo_response.schema.json',
  'title': 'GetParticipantFormPhotoCallableResponse',
  'description': 'Bounded metadata-free JPEG bytes for private in-memory review; never an original upload URL.',
  'required': <Object?>[
    'contentType',
    'previewBase64',
    'width',
    'height',
  ],
  'properties': <String, Object?>{
    'contentType': <String, Object?>{
      'type': 'string',
      'const': 'image/jpeg',
    },
    'previewBase64': <String, Object?>{
      'type': 'string',
      'minLength': 4,
      'maxLength': 349528,
      'pattern': '^[A-Za-z0-9+/]+={0,2}\$',
    },
    'width': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 640,
    },
    'height': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 640,
    },
  },
};
