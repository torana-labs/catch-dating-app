// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_outreach_generate_response.schema.json.

const schemaAdminGenerateSalesOutreachDraftResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_outreach_generate_response.schema.json',
  'title': 'AdminGenerateSalesOutreachDraftResponse',
  'oneOf': <Object?>[
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'result',
        'idempotentReplay',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'const': 'completed',
        },
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
        'idempotentReplay': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'retryAfterSeconds',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'const': 'running',
        },
        'retryAfterSeconds': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 60,
        },
      },
    },
    <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'failure',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'const': 'failed',
        },
        'failure': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
      },
    },
  ],
  'x-callable-aliases': <Object?>[
    'adminGenerateSalesOutreachDraft',
  ],
};
