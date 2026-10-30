// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_revise_sales_quote_payload.schema.json.

const schemaAdminReviseSalesQuoteCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_revise_sales_quote_payload.schema.json',
  'title': 'commercial.quotes.revise request',
  'description': 'Strict private Sales commercial request; current role, scope, revision and evidence policy are transactional.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'opportunityId',
    'requestId',
    'expectedRevision',
    'terms',
  ],
  'properties': <String, Object?>{
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
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
  },
};
