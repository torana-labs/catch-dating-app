// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_runtime_config_receipts.schema.json.

const schemaEventAssistanceRuntimeConfigReceiptDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'runtimeId',
    'requestHash',
    'sourceGeneration',
    'revision',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'pattern': '^runtime-action:[a-f0-9]{64}\$',
    },
    'runtimeId': <String, Object?>{
      'type': 'string',
      'pattern': '^runtime:lateJoin:[a-f0-9]{64}\$',
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
    'createdAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
  'title': 'EventAssistanceRuntimeConfigReceiptDocument',
  'x-firestore-collection': 'eventAssistanceRuntimeConfigReceipts',
  'x-firestore-path': 'eventAssistanceRuntimeConfigReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'event-assistance runtime configuration',
};
