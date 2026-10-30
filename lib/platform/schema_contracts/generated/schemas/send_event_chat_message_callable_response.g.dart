// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/send_event_chat_message_response.schema.json.

const schemaSendEventChatMessageCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/send_event_chat_message_response.schema.json',
  'title': 'SendEventChatMessageCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'messageId',
    'sequence',
    'replayed',
  ],
  'properties': <String, Object?>{
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sequence': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
