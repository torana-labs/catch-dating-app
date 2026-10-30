// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/prepare_organizer_manual_send_task_payload.schema.json.

const schemaPrepareOrganizerManualSendTaskCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/prepare_organizer_manual_send_task_payload.schema.json',
  'title': 'PrepareOrganizerManualSendTaskCallablePayload',
  'description': 'Persists one queued individual external handoff before the client attempts to open the external application.',
  'x-callable-aliases': <Object?>[
    'prepareOrganizerManualSendTask',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'contactId',
    'requestId',
    'intent',
    'prefillText',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
      'pattern': '^[A-Za-z0-9._:-]+\$',
    },
    'intent': <String, Object?>{
      'const': 'individualConversation',
    },
    'prefillText': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
