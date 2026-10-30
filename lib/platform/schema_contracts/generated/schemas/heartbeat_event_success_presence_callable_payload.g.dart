// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/heartbeat_event_success_presence_payload.schema.json.

const schemaHeartbeatEventSuccessPresenceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/heartbeat_event_success_presence_payload.schema.json',
  'title': 'HeartbeatEventSuccessPresenceCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'surface',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'surface': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'flutter',
        'web',
      ],
    },
  },
};
