// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_share_sales_demo_partner_review_payload.schema.json.

const schemaAdminShareSalesDemoPartnerReviewCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_share_sales_demo_partner_review_payload.schema.json',
  'title': 'AdminShareSalesDemoPartnerReviewCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'blueprintId',
    'expectedBlueprintRevision',
    'expectedSharingRevision',
    'partnerUid',
    'expectedAssignmentRevision',
    'expectedPreviewHash',
    'decision',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 96,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'expectedBlueprintRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'expectedSharingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'partnerUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'expectedAssignmentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'expectedPreviewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'decision': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'share',
        'withdraw',
      ],
    },
    'expiresAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'x-callable-aliases': <Object?>[
    'adminShareSalesDemoPartnerReview',
  ],
};
