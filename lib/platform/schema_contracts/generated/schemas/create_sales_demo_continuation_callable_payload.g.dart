// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_sales_demo_continuation_payload.schema.json.

const schemaCreateSalesDemoContinuationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_sales_demo_continuation_payload.schema.json',
  'title': 'CreateSalesDemoContinuationCallablePayload',
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
  'x-callable-aliases': <Object?>[
    'createSalesDemoContinuation',
  ],
};
