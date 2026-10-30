// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_get_sales_demo_partner_review_response.schema.json.

const schemaAdminGetSalesDemoPartnerReviewResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_get_sales_demo_partner_review_response.schema.json',
  'title': 'AdminGetSalesDemoPartnerReviewResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'blueprintId',
    'blueprintRevision',
    'partnerUid',
    'assignmentRevision',
    'preview',
    'previewHash',
    'sharingRevision',
    'proposedWording',
    'proposalRevision',
    'sharingState',
    'expiresAt',
    'sharingCurrent',
    'maximumExpiresAt',
    'evaluatedAt',
    'sendAuthority',
    'capabilityApprovalAuthority',
    'organizerControlAuthority',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'blueprintRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'partnerUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{3,128}\$',
    },
    'assignmentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'preview': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'brandName',
        'headline',
        'scenario',
        'steps',
        'retainedTools',
        'limitations',
        'cta',
      ],
      'properties': <String, Object?>{
        'brandName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'headline': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'scenario': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'steps': <String, Object?>{
          'type': 'array',
          'minItems': 3,
          'maxItems': 3,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
        'retainedTools': <String, Object?>{
          'type': 'array',
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
        'limitations': <String, Object?>{
          'type': 'array',
          'minItems': 1,
          'maxItems': 8,
          'items': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
        },
        'cta': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
      },
    },
    'previewHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'sharingRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'proposedWording': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'headline',
            'scenario',
            'cta',
          ],
          'properties': <String, Object?>{
            'headline': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[^<>\\u0000-\\u001f]+\$',
            },
            'scenario': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[^<>\\u0000-\\u001f]+\$',
            },
            'cta': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[^<>\\u0000-\\u001f]+\$',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'proposalRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'sharingState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'none',
        'active',
        'withdrawn',
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
    'sharingCurrent': <String, Object?>{
      'type': 'boolean',
    },
    'maximumExpiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'evaluatedAt': <String, Object?>{
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
    'adminGetSalesDemoPartnerReview',
  ],
};
