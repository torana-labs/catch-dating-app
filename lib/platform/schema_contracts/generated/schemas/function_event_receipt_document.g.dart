// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/function_event_receipts.schema.json.

const schemaFunctionEventReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/function_event_receipts.schema.json',
  'title': 'FunctionEventReceiptDocument',
  'description': 'Server-owned idempotency receipt stored at functionEventReceipts/{receiptId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'functionEventReceipts',
  'x-firestore-path': 'functionEventReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'idempotent Firestore trigger handlers',
  'required': <Object?>[
    'handler',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'handler': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'onMessageCreated',
        'onMatchCreated',
        'moderatePhotoOnUpload',
      ],
      'x-catch-ownership': 'server-only',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'x-catch-ownership': 'server-only',
    },
    'matchId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
  },
};
