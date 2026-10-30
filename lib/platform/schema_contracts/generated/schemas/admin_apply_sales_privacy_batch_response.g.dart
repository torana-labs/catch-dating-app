// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_apply_sales_privacy_batch_response.schema.json.

const schemaAdminApplySalesPrivacyBatchResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_apply_sales_privacy_batch_response.schema.json',
  'title': 'adminApplySalesPrivacyBatchResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'batch',
  ],
  'properties': <String, Object?>{
    'batch': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'planId',
        'previousCursor',
        'nextCursor',
        'itemCount',
        'deletedCount',
        'retainedCount',
        'unresolvedCount',
        'status',
        'completeDeletion',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-[a-f0-9]{40}\$',
        },
        'previousCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'nextCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'itemCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'deletedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'retainedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'unresolvedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'processing',
            'internal_processed_with_unresolved',
          ],
        },
        'completeDeletion': <String, Object?>{
          'const': false,
        },
        'receiptId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-batch-[a-f0-9]{40}\$',
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminApplySalesPrivacyBatch',
  ],
  'definitions': <String, Object?>{
    'blocker': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'code',
        'fingerprint',
      ],
      'properties': <String, Object?>{
        'code': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-z_]{3,80}\$',
        },
        'fingerprint': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{16}\$',
        },
      },
    },
    'plan': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'planId',
        'organizerId',
        'policyHash',
        'inventoryHash',
        'cursor',
        'itemCount',
        'retainedCount',
        'unresolvedCount',
        'blockers',
        'status',
      ],
      'properties': <String, Object?>{
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-[a-f0-9]{40}\$',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'policyHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'inventoryHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'cursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'itemCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'retainedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'unresolvedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'blockers': <String, Object?>{
          'type': 'array',
          'maxItems': 240,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'code',
              'fingerprint',
            ],
            'properties': <String, Object?>{
              'code': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-z_]{3,80}\$',
              },
              'fingerprint': <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{16}\$',
              },
            },
          },
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'reviewed',
            'processing',
            'internal_processed_with_unresolved',
          ],
        },
      },
    },
    'batch': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'organizerId',
        'planId',
        'previousCursor',
        'nextCursor',
        'itemCount',
        'deletedCount',
        'retainedCount',
        'unresolvedCount',
        'status',
        'completeDeletion',
        'receiptId',
      ],
      'properties': <String, Object?>{
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'planId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-[a-f0-9]{40}\$',
        },
        'previousCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'nextCursor': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'itemCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'deletedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'retainedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'unresolvedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'processing',
            'internal_processed_with_unresolved',
          ],
        },
        'completeDeletion': <String, Object?>{
          'const': false,
        },
        'receiptId': <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-batch-[a-f0-9]{40}\$',
        },
      },
    },
  },
};
