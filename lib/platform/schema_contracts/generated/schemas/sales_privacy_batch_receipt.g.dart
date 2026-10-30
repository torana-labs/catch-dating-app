// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_privacy_batch_receipts.schema.json.

const schemaSalesPrivacyBatchReceiptSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_privacy_batch_receipts.schema.json',
  'title': 'SalesPrivacyBatchReceipt',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'receiptId',
    'organizerId',
    'planId',
    'expectedCursor',
    'requestId',
    'result',
    'createdAt',
    'actorUid',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^privacy-batch-[a-f0-9]{40}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
    },
    'planId': <String, Object?>{
      'type': 'string',
      'pattern': '^privacy-[a-f0-9]{40}\$',
    },
    'expectedCursor': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 240,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'result': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'planId',
        'previousCursor',
        'nextCursor',
        'itemCount',
        'deletedCount',
        'retainedCount',
        'unresolvedCount',
        'status',
        'completeDeletion',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-[a-f0-9]{40}\$',
        },
        'previousCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'nextCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'itemCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'deletedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'retainedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'unresolvedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'processing',
            'internal_processed_with_unresolved',
          ],
        },
        'completeDeletion': <String, Object?>{
          'const': false,
        },
        'receiptId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-batch-[a-f0-9]{40}\$',
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
  },
  'x-firestore-collection': 'salesPrivacyBatchReceipts',
  'x-firestore-path': 'salesPrivacyBatchReceipts/{id}',
  'x-owner': 'Private Sales privacy lifecycle',
};
