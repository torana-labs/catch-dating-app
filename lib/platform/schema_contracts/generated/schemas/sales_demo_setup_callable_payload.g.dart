// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/sales_demo_setup.schema.json.

const schemaSalesDemoSetupCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/sales_demo_setup.schema.json',
  'title': 'SalesDemoSetupCallablePayload',
  'anyOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'grantToken',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'sessionId',
        'grantToken',
        'setupHash',
      ],
      'properties': <String, Object?>{
        'sessionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{3,128}\$',
        },
        'grantToken': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{43}\$',
        },
        'setupHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
  ],
  'x-callables': <Object?>[
    'getSalesDemoSetup',
    'prepareSalesDemoFormDraft',
  ],
};
