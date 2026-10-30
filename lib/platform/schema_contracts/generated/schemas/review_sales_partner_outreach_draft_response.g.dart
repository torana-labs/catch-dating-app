// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/review_sales_partner_outreach_draft_response.schema.json.

const schemaReviewSalesPartnerOutreachDraftResponseSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'draftId',
    'exactContentHash',
    'compositionReviewed',
    'capabilityApprovalAuthority',
    'sendAuthority',
    'providerConfirmed',
  ],
  'properties': <String, Object?>{
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'exactContentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'compositionReviewed': <String, Object?>{
      'const': true,
    },
    'capabilityApprovalAuthority': <String, Object?>{
      'const': false,
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
    'providerConfirmed': <String, Object?>{
      'const': false,
    },
  },
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/review_sales_partner_outreach_draft_response.schema.json',
  'title': 'ReviewSalesPartnerOutreachDraftResponse',
  'x-callable-aliases': <Object?>[
    'reviewSalesPartnerOutreachDraft',
  ],
};
