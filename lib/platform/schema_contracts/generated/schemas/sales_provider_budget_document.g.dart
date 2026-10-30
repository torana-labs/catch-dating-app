// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_provider_budgets.schema.json.

const schemaSalesProviderBudgetDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_provider_budgets.schema.json',
  'title': 'SalesProviderBudgetDocument',
  'description': 'Private aggregate provider run/month accounting. Limits are immutable for each bucket; unknown attempts retain ceilings. Reserved cost is not actual billed cost. Retained hashes/counters contain no prompt, output, actor/contact/organizer identifiers.',
  'x-firestore-collection': 'salesProviderBudgets',
  'x-firestore-path': 'salesProviderBudgets/{bucketId}',
  'x-document-id-field': 'bucketId',
  'x-owner': 'disabled internal Sales writing preparation accounting',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'bucketId',
    'kind',
    'scopeHash',
    'month',
    'limitsHash',
    'limits',
    'consumed',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'bucketId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'kind': <String, Object?>{
      'enum': <Object?>[
        'run',
        'month',
      ],
    },
    'scopeHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'month': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[0-9]{4}-[0-9]{2}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'limitsHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'limits': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'modelCalls',
        'networkRequests',
        'modelInputTokens',
        'modelOutputTokens',
        'modelCostMicros',
      ],
      'properties': <String, Object?>{
        'modelCalls': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'networkRequests': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelInputTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelOutputTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelCostMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
      },
    },
    'consumed': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'modelCalls',
        'networkRequests',
        'modelInputTokens',
        'modelOutputTokens',
        'modelCostMicros',
      ],
      'properties': <String, Object?>{
        'modelCalls': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'networkRequests': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelInputTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelOutputTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
        'modelCostMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000000000,
        },
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
