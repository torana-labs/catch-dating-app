// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_fit_queue_refresh_batch_response.schema.json.

const schemaAdminRefreshSalesFitQueueBatchResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_fit_queue_refresh_batch_response.schema.json',
  'title': 'AdminRefreshSalesFitQueueBatchResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'rows',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'organizerId',
          'result',
          'sourceHash',
          'reason',
        ],
        'properties': <String, Object?>{
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
          },
          'result': <String, Object?>{
            'enum': <Object?>[
              'refreshed',
              'needs_review',
            ],
          },
          'sourceHash': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'pattern': '^[a-f0-9]{64}\$',
          },
          'reason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 600,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminRefreshSalesFitQueueBatch',
  ],
};
