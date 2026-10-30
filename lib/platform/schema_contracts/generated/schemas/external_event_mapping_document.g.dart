// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/external_event_mappings.schema.json.

const schemaExternalEventMappingDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/external_event_mappings.schema.json',
  'title': 'ExternalEventMappingDocument',
  'description': 'Stable mapping and field-level authority between one Catch event and one organizer-authorized booking-provider event.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'externalEventMappings',
  'x-firestore-path': 'externalEventMappings/{mappingId}',
  'x-document-id-field': 'mappingId',
  'x-owner': 'organizer provider mapping and roster reconciliation callables',
  'required': <Object?>[
    'organizerId',
    'eventId',
    'connectionId',
    'provider',
    'externalEventId',
    'status',
    'fieldAuthority',
    'revision',
    'createdByUid',
    'createdAt',
    'updatedAt',
    'lastSyncAt',
    'lastSuccessfulSyncAt',
    'lastSyncStatus',
    'lastSyncRunId',
    'disconnectedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'connectionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'provider': <String, Object?>{
      'const': 'luma',
    },
    'externalEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'paused',
        'disconnected',
      ],
    },
    'fieldAuthority': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'rosterIdentity',
        'registrationStatus',
        'checkIn',
        'orderAmount',
        'refundStatus',
        'referralCode',
      ],
      'properties': <String, Object?>{
        'rosterIdentity': <String, Object?>{
          'const': 'provider',
        },
        'registrationStatus': <String, Object?>{
          'const': 'provider',
        },
        'checkIn': <String, Object?>{
          'const': 'providerWhenPresent',
        },
        'orderAmount': <String, Object?>{
          'const': 'unavailable',
        },
        'refundStatus': <String, Object?>{
          'const': 'unavailable',
        },
        'referralCode': <String, Object?>{
          'const': 'unavailable',
        },
      },
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'createdByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'lastSyncAt': <String, Object?>{
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
    'lastSyncStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'never',
        'running',
        'completed',
        'partial',
        'failed',
      ],
    },
    'lastSyncRunId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
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
