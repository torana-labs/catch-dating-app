// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/send_event_broadcast_payload.schema.json.

const schemaSendEventBroadcastCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/send_event_broadcast_payload.schema.json',
  'title': 'SendEventBroadcastCallablePayload',
  'description': 'Callable payload accepted by sendEventBroadcast.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'eventId',
    'audience',
    'body',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'audience': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'booked',
        'prospective',
        'everyone',
      ],
    },
    'body': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
  },
};
