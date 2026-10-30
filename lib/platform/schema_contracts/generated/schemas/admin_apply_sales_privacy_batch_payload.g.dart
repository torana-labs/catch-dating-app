// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_apply_sales_privacy_batch_payload.schema.json.

const schemaAdminApplySalesPrivacyBatchPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_apply_sales_privacy_batch_payload.schema.json',
  'title': 'adminApplySalesPrivacyBatchPayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'planId',
    'requestId',
    'expectedCursor',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
    },
    'planId': <String, Object?>{
      'type': 'string',
      'pattern': '^privacy-[a-f0-9]{40}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'expectedCursor': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminApplySalesPrivacyBatch',
  ],
};
