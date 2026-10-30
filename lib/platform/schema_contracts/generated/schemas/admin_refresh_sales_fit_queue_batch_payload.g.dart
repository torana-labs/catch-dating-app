// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_sales_fit_queue_refresh_batch_request.schema.json.

const schemaAdminRefreshSalesFitQueueBatchPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_sales_fit_queue_refresh_batch_request.schema.json',
  'title': 'AdminRefreshSalesFitQueueBatchPayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10,
    },
    'cursor': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 600,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminRefreshSalesFitQueueBatch',
  ],
};
