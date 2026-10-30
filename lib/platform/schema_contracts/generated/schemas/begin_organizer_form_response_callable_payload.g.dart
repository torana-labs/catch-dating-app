// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/begin_organizer_form_response_payload.schema.json.

const schemaBeginOrganizerFormResponseCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/begin_organizer_form_response_payload.schema.json',
  'title': 'BeginOrganizerFormResponseCallablePayload',
  'description': 'Starts or idempotently resumes a version-bound response draft.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicFormId',
    'sourceToken',
    'requestId',
  ],
  'properties': <String, Object?>{
    'publicFormId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'sourceToken': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{20,160}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{16,120}\$',
    },
    'reuseResponseId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Explicit own submitted source selection for compatible same-form answer suggestions; never a claim or grant.',
    },
  },
};
