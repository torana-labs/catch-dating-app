// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/publish_event_live_position_response.schema.json.

const schemaPublishEventLivePositionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/publish_event_live_position_response.schema.json',
  'title': 'PublishEventLivePositionCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'sharing',
    'role',
    'serverTimeMillis',
    'staleAfterSeconds',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'sharing': <String, Object?>{
      'type': 'boolean',
    },
    'role': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'host',
        'operator',
      ],
    },
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'staleAfterSeconds': <String, Object?>{
      'type': 'integer',
      'minimum': 30,
      'maximum': 600,
    },
    'expiresAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
  },
};
