// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_staff_attention_response.schema.json.

const schemaProgramStaffAttentionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_staff_attention_response.schema.json',
  'title': 'ProgramStaffAttentionCallableResponse',
  'description': 'Program staff attention feed: staffAttention moment sends raised for this program, filtered to the caller\'s active duties. Coordinators and managers receive every duty\'s alerts. Send fanout is deduplicated per run and duty.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'listProgramStaffAttention',
  ],
  'required': <Object?>[
    'programId',
    'items',
    'truncated',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'itemId',
          'runId',
          'momentId',
          'duty',
          'severity',
          'title',
          'createdAtMillis',
        ],
        'properties': <String, Object?>{
          'itemId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'runId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'momentId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'duty': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'severity': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'info',
              'warning',
              'urgent',
            ],
          },
          'title': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 300,
          },
          'createdAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
        },
      },
    },
    'truncated': <String, Object?>{
      'type': 'boolean',
    },
  },
};
