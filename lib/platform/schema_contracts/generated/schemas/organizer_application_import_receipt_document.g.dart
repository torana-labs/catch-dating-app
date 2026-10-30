// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_application_import_receipts.schema.json.

const schemaOrganizerApplicationImportReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_application_import_receipts.schema.json',
  'title': 'OrganizerApplicationImportReceiptDocument',
  'description': 'Idempotency and result receipt for one bounded application import commit.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerApplicationImportReceipts',
  'x-firestore-path': 'organizerApplicationImportReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'organizer application import callable',
  'required': <Object?>[
    'organizerId',
    'formId',
    'formVersionId',
    'mappingId',
    'uploadedByUid',
    'importKey',
    'fileName',
    'format',
    'payloadHash',
    'status',
    'rowCount',
    'createdCount',
    'skippedCount',
    'errors',
    'createdAt',
    'completedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'mappingId': <String, Object?>{
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
    'uploadedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'importKey': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'fileName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 255,
    },
    'format': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'csv',
        'xlsx',
        'connector',
      ],
    },
    'payloadHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'completed',
        'partial',
        'failed',
      ],
    },
    'rowCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 200,
    },
    'createdCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 200,
    },
    'skippedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 200,
    },
    'errors': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'rowId',
          'code',
          'message',
        ],
        'properties': <String, Object?>{
          'rowId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'code': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'message': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
        },
      },
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
  },
};
