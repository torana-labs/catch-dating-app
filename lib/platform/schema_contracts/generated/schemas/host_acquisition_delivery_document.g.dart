// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_acquisition_deliveries.schema.json.

const schemaHostAcquisitionDeliveryDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_acquisition_deliveries.schema.json',
  'title': 'HostAcquisitionDeliveryDocument',
  'description': 'Private, bounded Meta Lead delivery. Current consent and the original Sales intent are rechecked before dispatch. Contact data and form answers are excluded.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostAcquisitionDeliveries',
  'x-firestore-path': 'hostAcquisitionDeliveries/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'joinWaitlist and Host acquisition delivery worker',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'eventId',
    'intentId',
    'consentId',
    'acceptedAt',
    'status',
    'attempts',
    'nextAttemptAt',
    'attemptId',
    'lastAttemptAt',
    'expiresAt',
    'context',
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
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'consentId': <String, Object?>{
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
        'unknown',
        'stopped',
      ],
    },
    'attempts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 5,
    },
    'nextAttemptAt': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'attemptId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9-]{36}\$',
    },
    'lastAttemptAt': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
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
    'context': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'clientId',
            'userAgent',
          ],
          'properties': <String, Object?>{
            'clientId': <String, Object?>{
              'type': 'string',
              'pattern': '^[0-9]{1,10}\\.[0-9]{10}\$',
            },
            'userAgent': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 512,
              'pattern': '^[^\\u0000-\\u001f\\u007f]+\$',
            },
            'fbclid': <String, Object?>{
              'type': 'string',
              'pattern': '^[A-Za-z0-9_-]{10,512}\$',
            },
            'clickCapturedAt': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
