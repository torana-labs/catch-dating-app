// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_payment_webhooks.schema.json.

const schemaOrganizerFormPaymentWebhookDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_payment_webhooks.schema.json',
  'title': 'OrganizerFormPaymentWebhookDocument',
  'description': 'Deduplicated, verified merchant webhook receipt. Raw provider payloads and credentials are never stored.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'connectionId',
    'accountId',
    'providerEventId',
    'event',
    'providerOrderId',
    'providerPaymentId',
    'status',
    'createdAt',
    'processedAt',
    'expiresAt',
    'nextAttemptAt',
  ],
  'properties': <String, Object?>{
    'connectionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'accountId': <String, Object?>{
      'type': 'string',
      'pattern': '^acc_[A-Za-z0-9]+\$',
    },
    'providerEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 200,
    },
    'event': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'providerOrderId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^order_[A-Za-z0-9]+\$',
    },
    'providerPaymentId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^pay_[A-Za-z0-9]+\$',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'pending',
        'processed',
        'ignored',
      ],
      'type': 'string',
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'processedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'nextAttemptAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'platformConfigurationVersion': <String, Object?>{
      'type': 'string',
      'pattern': '^projects/[a-z][a-z0-9-]+/secrets/[A-Za-z0-9_-]+/versions/[1-9][0-9]*\$',
      'maxLength': 500,
    },
  },
  'x-firestore-collection': 'organizerFormPaymentWebhooks',
  'x-firestore-path': 'organizerFormPaymentWebhooks/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'organizer form payment server operations',
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'platformConfigurationVersion',
        ],
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'connectionId': <String, Object?>{
            'type': 'null',
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'connectionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
        },
      },
    },
  ],
};
