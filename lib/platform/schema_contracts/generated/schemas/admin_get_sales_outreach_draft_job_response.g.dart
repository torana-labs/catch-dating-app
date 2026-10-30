// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_outreach_job_response.schema.json.

const schemaAdminGetSalesOutreachDraftJobResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_outreach_job_response.schema.json',
  'title': 'AdminGetSalesOutreachDraftJobResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'status',
    'result',
    'failure',
    'retryAfterSeconds',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'enum': <Object?>[
        'running',
        'completed',
        'failed',
      ],
    },
    'result': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'draftId',
            'contentHash',
          ],
          'properties': <String, Object?>{
            'draftId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
            },
            'contentHash': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-f0-9]{64}\$',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'failure': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 160,
    },
    'retryAfterSeconds': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 60,
    },
  },
  'definitions': <String, Object?>{
    'result': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'draftId',
        'contentHash',
      ],
      'properties': <String, Object?>{
        'draftId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 160,
        },
        'contentHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminGetSalesOutreachDraftJob',
  ],
};
