// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/submit_event_runtime_profile_response.schema.json.

const schemaSubmitEventRuntimeProfileCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/submit_event_runtime_profile_response.schema.json',
  'title': 'SubmitEventRuntimeProfileCallableResponse',
  'description': 'Server-recomputed Event Success runtime profile readiness.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'status',
    'requiredFieldIds',
    'completedFieldIds',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'needsInput',
        'ready',
      ],
    },
    'requiredFieldIds': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
      },
      'maxItems': 10,
    },
    'completedFieldIds': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
      },
      'maxItems': 10,
    },
  },
};
