// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_manual_send_task_response.schema.json.

const schemaOrganizerManualSendTaskCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_manual_send_task_response.schema.json',
  'title': 'OrganizerManualSendTaskCallableResponse',
  'description': 'Manager-visible manual handoff task. Handoff-opened and host-marked-sent are assertions, never delivery receipts.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'taskId',
    'contactId',
    'displayName',
    'intent',
    'routeId',
    'deliveryMode',
    'status',
    'active',
    'revision',
    'phoneE164',
    'prefillText',
    'openCount',
    'createdAtMillis',
    'updatedAtMillis',
    'openedAtMillis',
    'expiresAtMillis',
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
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'intent': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'individualConversation',
        'savedAudienceCampaign',
      ],
    },
    'routeId': <String, Object?>{
      'const': 'personalWhatsappHandoff',
    },
    'deliveryMode': <String, Object?>{
      'const': 'byHand',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'queued',
        'handoffOpened',
        'hostMarkedSent',
        'skipped',
        'cancelled',
        'superseded',
        'expired',
      ],
    },
    'active': <String, Object?>{
      'type': 'boolean',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'phoneE164': <String, Object?>{
      'type': 'string',
      'pattern': '^\\+[1-9][0-9]{7,14}\$',
    },
    'prefillText': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'openCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
    },
    'createdAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'updatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'openedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
};
