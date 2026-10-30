// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_accountability_receipts.schema.json.

const schemaEventAssistanceAccountabilityReceiptDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'guestId',
    'requestHash',
    'sourceGeneration',
    'attendeeGeneration',
    'checkInHash',
    'episodeId',
    'revision',
    'disposition',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^accountability-action:[a-f0-9]{64}\$',
    },
    'guestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sourceGeneration': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'attendeeGeneration': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'checkInHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'episodeId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'disposition': <String, Object?>{
      'enum': <Object?>[
        'returned',
        'departed',
        'unresolved',
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'checkpoint': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'checkpointId',
        'progressRevision',
        'rosterId',
        'rosterHash',
      ],
      'properties': <String, Object?>{
        'checkpointId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'progressRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'rosterId': <String, Object?>{
          'type': 'string',
          'pattern': '^departure-roster:[a-f0-9]{64}\$',
        },
        'rosterHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
  },
  'title': 'EventAssistanceAccountabilityReceiptDocument',
  'x-firestore-collection': 'eventAssistanceAccountabilityReceipts',
  'x-firestore-path': 'eventAssistanceAccountabilityReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'event-assistance accountability command',
};
