// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_event_success_conversation_graph_payload.schema.json.

const schemaSubmitEventSuccessConversationGraphCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_event_success_conversation_graph_payload.schema.json',
  'title': 'SubmitEventSuccessConversationGraphCallablePayload',
  'description': 'Authenticated attendee submission for the end-of-event conversation graph.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'selectedUids',
    'skipped',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'selectedUids': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'skipped': <String, Object?>{
      'type': 'boolean',
    },
  },
};
