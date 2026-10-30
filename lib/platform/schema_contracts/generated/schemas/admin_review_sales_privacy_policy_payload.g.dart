// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_review_sales_privacy_policy_payload.schema.json.

const schemaAdminReviewSalesPrivacyPolicyPayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_review_sales_privacy_policy_payload.schema.json',
  'title': 'adminReviewSalesPrivacyPolicyPayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'expectedRevision',
    'sourceReference',
    'sourceHash',
    'financeReason',
    'auditReason',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'sourceReference': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'financeReason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'auditReason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminReviewSalesPrivacyPolicy',
  ],
};
