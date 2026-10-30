// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/heartbeat_event_success_presence_response.schema.json.

const schemaHeartbeatEventSuccessPresenceCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/heartbeat_event_success_presence_response.schema.json',
  'title': 'HeartbeatEventSuccessPresenceCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'presenceState',
    'serverTimeMillis',
    'heartbeatIntervalSeconds',
    'presentWindowSeconds',
    'likelyDepartedAfterSeconds',
  ],
  'properties': <String, Object?>{
    'presenceState': <String, Object?>{
      'type': 'string',
      'const': 'present',
    },
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'heartbeatIntervalSeconds': <String, Object?>{
      'type': 'integer',
      'minimum': 10,
      'maximum': 300,
    },
    'presentWindowSeconds': <String, Object?>{
      'type': 'integer',
      'minimum': 30,
      'maximum': 900,
    },
    'likelyDepartedAfterSeconds': <String, Object?>{
      'type': 'integer',
      'minimum': 60,
      'maximum': 3600,
    },
  },
};
