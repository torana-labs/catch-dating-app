// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/act_on_event_chat_message_response.schema.json.

const schemaActOnEventChatMessageCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/act_on_event_chat_message_response.schema.json',
  'title': 'ActOnEventChatMessageCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'applied',
    'replayed',
  ],
  'properties': <String, Object?>{
    'applied': <String, Object?>{
      'const': true,
      'type': 'boolean',
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
