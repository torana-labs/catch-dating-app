// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_get_sales_demo_partner_review_payload.schema.json.

const schemaAdminGetSalesDemoPartnerReviewCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_get_sales_demo_partner_review_payload.schema.json',
  'title': 'AdminGetSalesDemoPartnerReviewCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'blueprintId',
  ],
  'properties': <String, Object?>{
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
  },
  'x-callable-aliases': <Object?>[
    'adminGetSalesDemoPartnerReview',
  ],
};
