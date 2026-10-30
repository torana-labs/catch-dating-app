// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_provider_connections.schema.json.

const schemaOrganizerProviderConnectionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_provider_connections.schema.json',
  'title': 'OrganizerProviderConnectionDocument',
  'description': 'Safe organizer-owned booking-provider connection metadata. Provider credentials live in Secret Manager, never Firestore.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerProviderConnections',
  'x-firestore-path': 'organizerProviderConnections/{connectionId}',
  'x-document-id-field': 'connectionId',
  'x-owner': 'organizer provider connection and health callables',
  'required': <Object?>[
    'organizerId',
    'provider',
    'adapterClass',
    'status',
    'externalAccountId',
    'externalAccountName',
    'secretVersionResource',
    'syncMode',
    'capabilities',
    'connectedByUid',
    'revision',
    'createdAt',
    'updatedAt',
    'lastHealthSyncAt',
    'lastSuccessfulSyncAt',
    'lastErrorCode',
    'disconnectedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'provider': <String, Object?>{
      'const': 'luma',
    },
    'adapterClass': <String, Object?>{
      'const': 'A',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'degraded',
        'credentialRevoked',
        'disconnected',
      ],
    },
    'externalAccountId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'externalAccountName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'secretVersionResource': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^projects/[^/]+/secrets/[^/]+/versions/[0-9]+\$',
    },
    'syncMode': <String, Object?>{
      'const': 'manualPoll',
    },
    'capabilities': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventList',
        'rosterIdentity',
        'registrationStatus',
        'providerCheckIn',
        'orderAmount',
        'refundStatus',
        'referralCode',
        'webhooks',
        'writeBookings',
      ],
      'properties': <String, Object?>{
        'eventList': <String, Object?>{
          'type': 'boolean',
        },
        'rosterIdentity': <String, Object?>{
          'type': 'boolean',
        },
        'registrationStatus': <String, Object?>{
          'type': 'boolean',
        },
        'providerCheckIn': <String, Object?>{
          'type': 'boolean',
        },
        'orderAmount': <String, Object?>{
          'type': 'boolean',
        },
        'refundStatus': <String, Object?>{
          'type': 'boolean',
        },
        'referralCode': <String, Object?>{
          'type': 'boolean',
        },
        'webhooks': <String, Object?>{
          'type': 'boolean',
        },
        'writeBookings': <String, Object?>{
          'type': 'boolean',
        },
      },
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
    'lastSuccessfulSyncAt': <String, Object?>{
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
    'lastErrorCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
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
