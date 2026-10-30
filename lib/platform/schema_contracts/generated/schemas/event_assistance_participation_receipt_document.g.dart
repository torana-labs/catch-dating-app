// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_participation_receipts.schema.json.

const schemaEventAssistanceParticipationReceiptDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'guestId',
    'requestHash',
    'sourceGeneration',
    'revision',
    'episodeId',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^participation-action:[a-f0-9]{64}\$',
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
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'episodeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'title': 'EventAssistanceParticipationReceiptDocument',
  'x-firestore-collection': 'eventAssistanceParticipationReceipts',
  'x-firestore-path': 'eventAssistanceParticipationReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'event-assistance participation command',
};
