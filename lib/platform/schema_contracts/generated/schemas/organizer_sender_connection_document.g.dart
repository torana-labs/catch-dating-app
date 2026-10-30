// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_sender_connections.schema.json.

const schemaOrganizerSenderConnectionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_sender_connections.schema.json',
  'title': 'OrganizerSenderConnectionDocument',
  'description': 'Safe organizer-owned messaging sender metadata. Provider access tokens live in Secret Manager, never Firestore.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerSenderConnections',
  'x-firestore-path': 'organizerSenderConnections/{connectionId}',
  'x-document-id-field': 'connectionId',
  'x-owner': 'organizer messaging sender onboarding and provider health sync',
  'required': <Object?>[
    'organizerId',
    'channel',
    'provider',
    'status',
    'wabaId',
    'phoneNumberId',
    'businessId',
    'displayPhoneNumber',
    'verifiedName',
    'secretVersionResource',
    'qualityRating',
    'messagingLimitTier',
    'templateSyncStatus',
    'webhookStatus',
    'testStatus',
    'testProviderMessageId',
    'testRecipientHash',
    'connectedByUid',
    'revision',
    'createdAt',
    'updatedAt',
    'disconnectedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'channel': <String, Object?>{
      'const': 'whatsapp',
    },
    'provider': <String, Object?>{
      'const': 'metaCloudApi',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'testing',
        'active',
        'degraded',
        'blocked',
        'tokenRevoked',
        'disconnected',
      ],
    },
    'wabaId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[0-9]{5,40}\$',
    },
    'phoneNumberId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[0-9]{5,40}\$',
    },
    'businessId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[0-9]{5,40}\$',
    },
    'displayPhoneNumber': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 7,
      'maxLength': 32,
    },
    'verifiedName': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 160,
    },
    'secretVersionResource': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^projects/[^/]+/secrets/[^/]+/versions/[0-9]+\$',
    },
    'qualityRating': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'GREEN',
        'YELLOW',
        'RED',
        'UNKNOWN',
      ],
    },
    'messagingLimitTier': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
    },
    'templateSyncStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'notStarted',
        'current',
        'stale',
        'failed',
      ],
    },
    'webhookStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'notSubscribed',
        'subscribed',
        'degraded',
      ],
    },
    'testStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'notSent',
        'pending',
        'delivered',
        'failed',
      ],
    },
    'testProviderMessageId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'testRecipientHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'connectedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
    'updatedAt': <String, Object?>{
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
    'lastHealthSyncAt': <String, Object?>{
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
    'disconnectedAt': <String, Object?>{
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
  },
};
