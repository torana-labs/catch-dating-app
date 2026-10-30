// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_organizer_form_asset_intent_payload.schema.json.

const schemaCreateOrganizerFormAssetIntentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_organizer_form_asset_intent_payload.schema.json',
  'title': 'CreateOrganizerFormAssetIntentCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'draftToken',
    'questionId',
    'requestId',
    'originalFileName',
    'contentType',
    'sizeBytes',
    'sha256',
  ],
  'properties': <String, Object?>{
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'draftToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{32,160}\$',
    },
    'questionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{8,160}\$',
    },
    'originalFileName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 255,
    },
    'contentType': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ],
    },
    'sizeBytes': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 26214400,
    },
    'sha256': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
};
