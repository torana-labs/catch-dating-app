// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/transport_operation_receipts.schema.json.

const schemaTransportOperationReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/transport_operation_receipts.schema.json',
  'title': 'TransportOperationReceiptDocument',
  'description': 'Server-owned idempotency receipt for offline-replayed transport mutations. An exact retry returns the original result; a conflicting reuse of the client operation id fails closed.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'transportOperationReceipts',
  'x-firestore-path': 'transportOperationReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'program transport mutation callables',
  'required': <Object?>[
    'programId',
    'operationKind',
    'clientOperationId',
    'actorUid',
    'requestHash',
    'tripId',
    'legId',
    'resultRevision',
    'createdAt',
    'expiresAt',
    'resultJson',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operationKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'markReady',
        'claim',
        'unclaim',
        'markDisrupted',
        'dispatch',
        'markArrived',
        'voidTrip',
        'manifestImport',
      ],
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'minLength': 32,
      'maxLength': 128,
      'description': 'Stable hash of the mutation payload; a same-id different-payload replay is rejected.',
    },
    'tripId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'legId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'resultRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'description': 'Committed entity revision returned to a replayed caller.',
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
    'expiresAt': <String, Object?>{
      'type': 'object',
      'description': 'Receipt retention horizon for cleanup sweeps.',
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
    'resultJson': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 200000,
      'description': 'Serialized operation response for exact replay of compound results (e.g. manifest import summaries). Null for scalar-result operations.',
    },
    'completedRows': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
      'description': 'For manifestImport only: number of input rows already resolved. With completedRowIndices, rows may finish out of order so a whole travel party fits one transaction; older partial receipts use a contiguous input prefix.',
    },
    'importedGuestIds': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'description': 'Guests already applied by a resumable manifest import; prevents two source rows updating one person across chunks.',
    },
    'completedRowIndices': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
        'maximum': 499,
      },
      'description': 'For manifestImport only: original input indices atomically resolved with their complete travel party. Includes explicitly rejected rows; its length equals completedRows.',
    },
  },
};
