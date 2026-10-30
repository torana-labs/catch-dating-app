// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_outreach_list_response.schema.json.

const schemaAdminListSalesOutreachDraftsResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_outreach_list_response.schema.json',
  'title': 'AdminListSalesOutreachDraftsResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'rows',
  ],
  'properties': <String, Object?>{
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'draftId',
          'contactId',
          'opportunityId',
          'subject',
          'status',
          'contentHash',
          'createdAt',
          'reviewedAt',
        ],
        'properties': <String, Object?>{
          'draftId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'contactId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'opportunityId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'subject': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 300,
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'pending_review',
              'approved',
            ],
          },
          'contentHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'createdAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'reviewedAt': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'format': 'date-time',
          },
        },
      },
    },
  },
  'definitions': <String, Object?>{
    'id': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
  },
  'x-callable-aliases': <Object?>[
    'adminListSalesOutreachDrafts',
  ],
};
