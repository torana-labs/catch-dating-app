// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_staff_receipts.schema.json.

const schemaEventAssistanceStaffReceiptDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'staffGrantId',
    'sourceHash',
    'requestHash',
    'revision',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^staff-action:[a-f0-9]{64}\$',
    },
    'staffGrantId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
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
  },
  'title': 'EventAssistanceStaffReceiptDocument',
  'x-firestore-collection': 'eventAssistanceStaffReceipts',
  'x-firestore-path': 'eventAssistanceStaffReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'event staff group duties',
};
