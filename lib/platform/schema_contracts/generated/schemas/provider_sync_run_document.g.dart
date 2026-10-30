// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/provider_sync_runs.schema.json.

const schemaProviderSyncRunDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/provider_sync_runs.schema.json',
  'title': 'ProviderSyncRunDocument',
  'description': 'Idempotent audit and replay receipt for one external-provider event reconciliation.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'providerSyncRuns',
  'x-firestore-path': 'providerSyncRuns/{runId}',
  'x-document-id-field': 'runId',
  'x-owner': 'organizer provider roster reconciliation callable',
  'required': <Object?>[
    'organizerId',
    'eventId',
    'connectionId',
    'mappingId',
    'provider',
    'clientOperationId',
    'inputHash',
    'status',
    'pageCount',
    'receivedCount',
    'createdCount',
    'updatedCount',
    'skippedCount',
    'truncated',
    'errorCode',
    'startedByUid',
    'startedAt',
    'completedAt',
    'expiresAt',
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
    'mappingId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'provider': <String, Object?>{
      'const': 'luma',
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 120,
    },
    'inputHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'running',
        'completed',
        'partial',
        'failed',
      ],
    },
    'pageCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 10,
    },
    'receivedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'createdCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'updatedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'skippedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 250,
    },
    'truncated': <String, Object?>{
      'type': 'boolean',
    },
    'errorCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
    'startedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'startedAt': <String, Object?>{
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
    'completedAt': <String, Object?>{
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
  },
};
