// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_manual_send_tasks_payload.schema.json.

const schemaListOrganizerManualSendTasksCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_manual_send_tasks_payload.schema.json',
  'title': 'ListOrganizerManualSendTasksCallablePayload',
  'description': 'Lists a bounded organizer manual-send queue or history page.',
  'x-callable-aliases': <Object?>[
    'listOrganizerManualSendTasks',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'activeOnly': <String, Object?>{
      'type': 'boolean',
      'default': true,
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
      'default': 25,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 1000,
    },
  },
};
