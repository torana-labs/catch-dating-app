// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_contacts.schema.json.

const schemaSalesContactDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_contacts.schema.json',
  'title': 'SalesContactDocument',
  'description': 'Shared person identity only; organizer-specific endpoints and contactability live on relationships.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesContacts',
  'x-firestore-path': 'salesContacts/{contactId}',
  'x-owner': 'private Sales contact service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'contactId',
    'displayName',
    'revision',
    'createdAt',
    'updatedAt',
    'createdBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
  'x-document-id-field': 'contactId',
};
