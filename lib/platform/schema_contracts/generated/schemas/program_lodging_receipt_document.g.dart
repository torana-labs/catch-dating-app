// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_lodging_receipts.schema.json.

const schemaProgramLodgingReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_lodging_receipts.schema.json',
  'title': 'ProgramLodgingReceiptDocument',
  'description': 'Immutable private operation receipt bound to program, actor and exact request. Replay rechecks current authority and returns current workflow; it never restores a prior approval.',
  'x-firestore-collection': 'programLodgingReceipts',
  'x-firestore-path': 'programLodgingReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'private program lodging server operations',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'organizerId',
    'receipt',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'receipt': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'operationId',
        'requestHash',
        'actorUid',
        'resultingRevision',
      ],
      'properties': <String, Object?>{
        'operationId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{1,100}\$',
        },
        'requestHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'actorUid': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'x-catch-ownership': 'server-only',
        },
        'resultingRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
          'x-catch-ownership': 'server-only',
        },
      },
      'x-catch-ownership': 'server-only',
    },
  },
};
