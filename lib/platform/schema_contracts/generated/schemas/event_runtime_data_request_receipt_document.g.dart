// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_runtime_data_request_receipts.schema.json.

const schemaEventRuntimeDataRequestReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_runtime_data_request_receipts.schema.json',
  'title': 'EventRuntimeDataRequestReceiptDocument',
  'description': 'Immutable idempotency receipt for one required-data command.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventRuntimeDataRequestReceipts',
  'x-firestore-path': 'eventRuntimeDataRequestReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'server-only Event Runtime required-data coordinator',
  'required': <Object?>[
    'schemaVersion',
    'receiptId',
    'requestId',
    'eventId',
    'organizerId',
    'attendeeId',
    'uid',
    'operationId',
    'requestHash',
    'requestRevision',
    'profileRevision',
    'sourceHash',
    'fieldIds',
    'expiresAt',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operationId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'requestRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'profileRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'fieldIds': <String, Object?>{
      'type': 'array',
      'uniqueItems': true,
      'minItems': 1,
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'displayName',
          'gender',
          'interestedInGenders',
          'relationshipGoal',
          'dateOfBirth',
          'paceBand',
          'skillBand',
          'dietaryAndSeatingNotes',
          'questionnaireAnswerIds',
          'teamName',
        ],
      },
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
  },
};
