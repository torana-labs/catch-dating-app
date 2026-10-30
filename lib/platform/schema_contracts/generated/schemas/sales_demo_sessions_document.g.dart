// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_demo_sessions.schema.json.

const schemaSalesDemoSessionsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_demo_sessions.schema.json',
  'title': 'SalesDemoSessionDocument',
  'description': 'Isolated synthetic Forms practice state; no production guest, message, payment or membership references.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'sessionId',
    'invitationId',
    'blueprintId',
    'blueprintRevision',
    'actorUid',
    'createdAt',
    'expiresAt',
    'status',
    'allowedActions',
    'revision',
    'actionCount',
    'step',
    'application',
    'reply',
    'guest',
    'assistanceRequested',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'sessionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'invitationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'active',
        'completed',
      ],
    },
    'allowedActions': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 4,
      'uniqueItems': true,
      'items': <String, Object?>{
        'enum': <Object?>[
          'reviewApplication',
          'prepareReply',
          'admitGuest',
          'requestAssistance',
        ],
      },
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'actionCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 20,
    },
    'step': <String, Object?>{
      'enum': <Object?>[
        'application',
        'reply',
        'admission',
        'complete',
      ],
    },
    'application': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'applicantName',
        'request',
        'review',
      ],
      'properties': <String, Object?>{
        'applicantName': <String, Object?>{
          'const': 'Sample Applicant',
        },
        'request': <String, Object?>{
          'const': 'Sample event application',
        },
        'review': <String, Object?>{
          'enum': <Object?>[
            'pending',
            'approved',
            'needs_info',
          ],
        },
      },
    },
    'reply': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'template',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'enum': <Object?>[
            'none',
            'prepared',
          ],
        },
        'template': <String, Object?>{
          'enum': <Object?>[
            'none',
            'welcome',
            'clarify',
          ],
        },
      },
    },
    'guest': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'displayName',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'enum': <Object?>[
            'not_admitted',
            'admitted',
          ],
        },
        'displayName': <String, Object?>{
          'const': 'Sample Applicant',
        },
      },
    },
    'assistanceRequested': <String, Object?>{
      'type': 'boolean',
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
  },
  'x-firestore-collection': 'salesDemoSessions',
  'x-firestore-path': 'salesDemoSessions/{sessionId}',
  'x-document-id-field': 'sessionId',
  'x-owner': 'sales demo trial callable and bounded expiry worker',
};
