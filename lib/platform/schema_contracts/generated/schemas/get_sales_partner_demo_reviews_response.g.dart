// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_sales_partner_demo_reviews_response.schema.json.

const schemaGetSalesPartnerDemoReviewsResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_sales_partner_demo_reviews_response.schema.json',
  'title': 'GetSalesPartnerDemoReviewsResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'assignmentRevision',
    'rows',
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
    'assignmentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'organizerId',
          'assignmentRevision',
          'blueprintId',
          'blueprintRevision',
          'preview',
          'previewHash',
          'validUntil',
          'evaluatedAt',
          'synthetic',
          'interactiveAvailable',
          'sendAuthority',
          'capabilityApprovalAuthority',
          'organizerControlAuthority',
          'proposalRevision',
          'proposedWording',
        ],
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{3,128}\$',
          },
          'assignmentRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'blueprintId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{3,128}\$',
          },
          'blueprintRevision': <String, Object?>{
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
          'validUntil': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'evaluatedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'synthetic': <String, Object?>{
            'const': true,
          },
          'interactiveAvailable': <String, Object?>{
            'const': false,
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
          'proposalRevision': <String, Object?>{
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
        },
      },
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
    'getSalesPartnerDemoReviews',
  ],
};
