// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/set_event_chat_typing_response.schema.json.

const schemaSetEventChatTypingCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/set_event_chat_typing_response.schema.json',
  'title': 'SetEventChatTypingCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'revision',
    'expiresAtMillis',
  ],
  'properties': <String, Object?>{
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
