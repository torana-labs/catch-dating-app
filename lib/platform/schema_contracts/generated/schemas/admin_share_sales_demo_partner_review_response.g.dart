// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_share_sales_demo_partner_review_response.schema.json.

const schemaAdminShareSalesDemoPartnerReviewResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_share_sales_demo_partner_review_response.schema.json',
  'title': 'AdminShareSalesDemoPartnerReviewResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'blueprintId',
    'blueprintRevision',
    'sharingRevision',
    'sharingState',
    'previewHash',
    'expiresAt',
    'sendAuthority',
    'capabilityApprovalAuthority',
    'organizerControlAuthority',
  ],
  'properties': <String, Object?>{
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'sharingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'sharingState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'active',
        'withdrawn',
      ],
    },
    'previewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'sendAuthority': <String, Object?>{
      'const': false,
    },
    'capabilityApprovalAuthority': <String, Object?>{
      'const': false,
    },
    'organizerControlAuthority': <String, Object?>{
      'const': false,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminShareSalesDemoPartnerReview',
  ],
};
