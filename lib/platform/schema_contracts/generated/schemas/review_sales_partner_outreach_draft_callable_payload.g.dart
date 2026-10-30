// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/review_sales_partner_outreach_draft_payload.schema.json.

const schemaReviewSalesPartnerOutreachDraftCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/review_sales_partner_outreach_draft_payload.schema.json',
  'title': 'ReviewSalesPartnerOutreachDraftCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'organizerId',
    'expectedAssignmentRevision',
    'draftId',
    'expectedContentHash',
    'factualValidity',
    'tone',
    'channelReadiness',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedAssignmentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'expectedContentHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'factualValidity': <String, Object?>{
      'const': 'verified',
      'type': 'string',
    },
    'tone': <String, Object?>{
      'const': 'approved',
      'type': 'string',
    },
    'channelReadiness': <String, Object?>{
      'const': 'manual_copy_only',
      'type': 'string',
    },
  },
  'x-callable-aliases': <Object?>[
    'reviewSalesPartnerOutreachDraft',
  ],
};
