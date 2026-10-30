// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/mark_organizer_manual_send_task_payload.schema.json.

const schemaMarkOrganizerManualSendTaskCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/mark_organizer_manual_send_task_payload.schema.json',
  'title': 'MarkOrganizerManualSendTaskCallablePayload',
  'description': 'Revision-bound explicit terminal host action for one manual-send task.',
  'x-callable-aliases': <Object?>[
    'markOrganizerManualSendTask',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'taskId',
    'expectedRevision',
    'action',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'taskId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hostMarkedSent',
        'skipped',
        'cancelled',
      ],
    },
  },
};
