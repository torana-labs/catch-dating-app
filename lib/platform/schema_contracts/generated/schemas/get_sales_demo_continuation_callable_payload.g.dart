// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/get_sales_demo_continuation_payload.schema.json.

const schemaGetSalesDemoContinuationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/get_sales_demo_continuation_payload.schema.json',
  'title': 'GetSalesDemoContinuationCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'continuationId',
  ],
  'properties': <String, Object?>{
    'continuationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
  'x-callable-aliases': <Object?>[
    'getSalesDemoContinuation',
  ],
};
