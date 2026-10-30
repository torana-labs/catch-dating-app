// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_intelligence_receipts.schema.json.

const schemaSalesIntelligenceReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_intelligence_receipts.schema.json',
  'title': 'SalesIntelligenceReceiptDocument',
  'description': 'Immutable actor-scoped exact-retry receipt for private employee intelligence and assignment-bound partner composition actions. Never proof of sending.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesIntelligenceReceipts',
  'x-firestore-path': 'salesIntelligenceReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'private Sales intelligence mutation service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'receiptId',
    'actorUid',
    'action',
    'requestId',
    'materialHash',
    'result',
    'createdAt',
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
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'action': <String, Object?>{
      'enum': <Object?>[
        'policy.save',
        'assessment.save',
        'clause.save',
        'clause.review',
        'score.snapshot',
        'draft.record',
        'draft.review',
        'draft.copy',
        'partner.draft.record',
        'partner.draft.review',
        'partner.draft.copy',
        'partner.draft.manual_send',
      ],
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'materialHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'result': <String, Object?>{
      'type': 'object',
      'maxProperties': 10,
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
};
