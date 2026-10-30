// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_approval_notification_work.schema.json.

const schemaEventApprovalNotificationWorkSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/event_approval_notification_work.schema.json',
  'title': 'EventApprovalNotificationWork',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'kind',
    'messageId',
    'intentHash',
    'dueAt',
    'evaluations',
    'failures',
    'lastMessageRevision',
  ],
  'properties': <String, Object?>{
    'kind': <String, Object?>{
      'const': 'approvalNotification',
      'type': 'string',
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'pattern': '^outbox:[a-f0-9]{64}\$',
    },
    'intentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'dueAt': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'evaluations': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
    },
    'failures': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
    },
    'lastMessageRevision': <String, Object?>{
      'type': 'integer',
      'minimum': -1,
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 100,
    },
  },
};
