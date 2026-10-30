// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/preview_organizer_saved_audience_payload.schema.json.

const schemaPreviewOrganizerSavedAudienceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/preview_organizer_saved_audience_payload.schema.json',
  'title': 'PreviewOrganizerSavedAudienceCallablePayload',
  'description': 'Resolves an exact bounded preview for one saved CRM audience.',
  'x-callable-aliases': <Object?>[
    'previewOrganizerSavedAudience',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'audienceId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'audienceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'sampleLimit': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 25,
      'default': 10,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 2048,
    },
  },
};
