// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_approval_notification_intent.schema.json.

const schemaEventApprovalNotificationIntentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'intentId',
    'revision',
    'context',
    'createdAt',
    'expiresAt',
    'lane',
    'permittedRoutes',
    'deliveryPolicy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'intentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'context': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'mode',
        'applicationId',
        'organizerId',
        'eventId',
        'uid',
        'sourceResponseId',
        'approvedAtMillis',
        'approvalRevision',
      ],
      'properties': <String, Object?>{
        'mode': <String, Object?>{
          'type': 'string',
          'const': 'live',
        },
        'applicationId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'uid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'sourceResponseId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'approvedAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'approvalRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'lane': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'phone',
        'email',
      ],
    },
    'permittedRoutes': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'approvalWhatsapp',
          'approvalSms',
          'approvalEmail',
        ],
      },
    },
    'deliveryPolicy': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'maxAttempts',
        'maxAttemptsPerRoute',
        'minimumRetrySeconds',
      ],
      'properties': <String, Object?>{
        'maxAttempts': <String, Object?>{
          'type': 'integer',
          'const': 3,
        },
        'maxAttemptsPerRoute': <String, Object?>{
          'type': 'integer',
          'const': 1,
        },
        'minimumRetrySeconds': <String, Object?>{
          'type': 'integer',
          'const': 60,
        },
      },
    },
  },
  'title': 'EventApprovalNotificationIntent',
};
