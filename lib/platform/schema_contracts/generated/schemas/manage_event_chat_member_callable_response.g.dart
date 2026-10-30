// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_event_chat_member_response.schema.json.

const schemaManageEventChatMemberCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_event_chat_member_response.schema.json',
  'title': 'ManageEventChatMemberCallableResponse',
  'description': 'Revisioned manager moderation receipt, not a current access grant.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'revision',
    'replayed',
  ],
  'properties': <String, Object?>{
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
