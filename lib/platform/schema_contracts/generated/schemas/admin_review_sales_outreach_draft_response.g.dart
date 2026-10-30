// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_outreach_review_response.schema.json.

const schemaAdminReviewSalesOutreachDraftResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_outreach_review_response.schema.json',
  'title': 'AdminReviewSalesOutreachDraftResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'exactContentHash',
    'factualValidity',
    'tone',
    'channelReadiness',
    'sendAuthority',
    'providerConfirmed',
    'reviewedAt',
  ],
  'properties': <String, Object?>{
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'exactContentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'factualValidity': <String, Object?>{
      'const': 'verified',
    },
    'tone': <String, Object?>{
      'const': 'approved',
    },
    'channelReadiness': <String, Object?>{
      'const': 'manual_copy_only',
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
    'providerConfirmed': <String, Object?>{
      'const': false,
    },
    'reviewedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'x-callable-aliases': <Object?>[
    'adminReviewSalesOutreachDraft',
  ],
};
