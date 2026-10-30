// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_demo_capabilities.schema.json.

const schemaSalesDemoCapabilitiesDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_demo_capabilities.schema.json',
  'title': 'SalesDemoCapabilityGateDocument',
  'description': 'Trusted server-owned current eligibility for the synthetic Forms adapter; absence denies demos.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'capability',
    'revision',
    'evidenceRevision',
    'enabled',
    'reviewedByUid',
    'reviewedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'capability': <String, Object?>{
      'const': 'synthetic_forms_v1',
    },
    'revision': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'evidenceRevision': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'enabled': <String, Object?>{
      'type': 'boolean',
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'reviewedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-firestore-collection': 'salesDemoCapabilities',
  'x-firestore-path': 'salesDemoCapabilities/{capability}',
  'x-document-id-field': 'capability',
  'x-owner': 'product capability owner using trusted server administration',
};
