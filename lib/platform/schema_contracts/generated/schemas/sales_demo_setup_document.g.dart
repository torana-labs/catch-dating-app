// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_demo_setups.schema.json.

const schemaSalesDemoSetupDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_demo_setups.schema.json',
  'title': 'SalesDemoSetupDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'setupId',
    'organizerId',
    'blueprintId',
    'blueprintRevision',
    'setupHash',
    'formId',
    'createdByUid',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'setupId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'setupHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'formId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'createdByUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-firestore-collection': 'salesDemoSetups',
  'x-firestore-path': 'salesDemoSetups/{setupId}',
  'x-document-id-field': 'setupId',
  'x-owner': 'verified organizer demo setup boundary',
};
