// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/submit_event_success_conversation_graph_response.schema.json.

const schemaSubmitEventSuccessConversationGraphCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/submit_event_success_conversation_graph_response.schema.json',
  'title': 'SubmitEventSuccessConversationGraphCallableResponse',
  'description': 'Receipt for an attendee conversation graph submission.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'saved',
    'status',
    'conversationCount',
  ],
  'properties': <String, Object?>{
    'saved': <String, Object?>{
      'type': 'boolean',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'submitted',
        'skipped',
      ],
    },
    'conversationCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
    },
  },
};
