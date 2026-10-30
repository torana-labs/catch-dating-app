// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_operator_alerts.schema.json.

const schemaHostOperatorAlertDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_operator_alerts.schema.json',
  'title': 'HostOperatorAlertDocument',
  'description': 'Private operator notice receipt keyed by the original accepted Host lead. No applicant details or contact data.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostOperatorAlerts',
  'x-firestore-path': 'hostOperatorAlerts/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'onHostApplicationAccepted and dispatchHostApplicationAlerts',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'eventId',
    'intentId',
    'acceptedAt',
    'status',
    'attempts',
    'attemptId',
    'providerMessageId',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'pattern': '^host_lead_[0-9]{13}_[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}\$',
    },
    'intentId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'acceptedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'pending',
        'sending',
        'accepted',
        'failed',
        'unknown',
        'stopped',
      ],
    },
    'attempts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 5,
    },
    'attemptId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9-]{36}\$',
    },
    'providerMessageId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9_-]{1,128}\$',
    },
    'nextAttemptAt': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'status': <String, Object?>{
            'enum': <Object?>[
              'pending',
              'sending',
            ],
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'nextAttemptAt',
        ],
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'nextAttemptAt': false,
        },
      },
    },
  ],
};
