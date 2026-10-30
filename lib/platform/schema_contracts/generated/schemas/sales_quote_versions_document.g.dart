// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_quote_versions.schema.json.

const schemaSalesQuoteVersionsDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_quote_versions.schema.json',
  'title': 'salesQuoteVersions document',
  'description': 'Immutable exact commercial terms with reviewed source fact references.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'salesQuoteVersions',
  'x-firestore-path': 'salesQuoteVersions/{versionId}',
  'x-owner': 'private Sales commercial service',
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'organizerId',
    'opportunityId',
    'quoteId',
    'termVersion',
    'terms',
    'termsHash',
    'createdAt',
    'createdBy',
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
    'termVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'terms': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'currency',
        'amountMinor',
        'billingCadence',
        'scope',
        'validUntil',
        'sourceFactRefs',
      ],
      'properties': <String, Object?>{
        'currency': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        'amountMinor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'billingCadence': <String, Object?>{
          'enum': <Object?>[
            'one_time',
            'monthly',
            'annual',
            'usage_based',
          ],
        },
        'scope': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 2000,
        },
        'validUntil': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
          'maxLength': 48,
        },
        'sourceFactRefs': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
        },
      },
    },
    'termsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
      'maxLength': 48,
    },
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
};
