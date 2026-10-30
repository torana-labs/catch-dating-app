// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_quotes.schema.json.

const schemaSalesQuotesDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_quotes.schema.json',
  'title': 'salesQuotes document',
  'description': 'Current quote head; accepted terms do not prove collection.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesQuotes',
  'x-firestore-path': 'salesQuotes/{quoteId}',
  'x-owner': 'private Sales commercial service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'organizerId',
    'opportunityId',
    'quoteId',
    'revision',
    'termVersion',
    'status',
    'approvedDecisionId',
    'acceptedDecisionId',
    'updatedAt',
    'updatedBy',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'opportunityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'quoteId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'termVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'draft',
        'approved',
        'accepted_reviewed',
      ],
    },
    'approvedDecisionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'acceptedDecisionId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 96,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'updatedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
  'x-document-id-field': 'quoteId',
};
