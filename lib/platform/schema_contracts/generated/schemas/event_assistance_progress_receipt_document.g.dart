// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_progress_receipts.schema.json.

const schemaEventAssistanceProgressReceiptDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'progressId',
    'requestHash',
    'revision',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^progress-action:[a-f0-9]{64}\$',
    },
    'progressId': <String, Object?>{
      'type': 'string',
      'pattern': '^progress:[a-f0-9]{64}\$',
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'commandKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'confirmDeparture',
        'changeRoute',
      ],
    },
    'decisionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
  'title': 'EventAssistanceProgressReceiptDocument',
  'x-firestore-collection': 'eventAssistanceProgressReceipts',
  'x-firestore-path': 'eventAssistanceProgressReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'event-assistance group progress commands',
};
