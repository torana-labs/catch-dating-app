// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_organizer_form_response_payload.schema.json.

const schemaSubmitOrganizerFormResponseCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_organizer_form_response_payload.schema.json',
  'title': 'SubmitOrganizerFormResponseCallablePayload',
  'description': 'Idempotently submits one completed version-bound draft.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'draftToken',
    'expectedRevision',
    'requestId',
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
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{16,120}\$',
    },
  },
};
