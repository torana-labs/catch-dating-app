// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_restrict_sales_organizer_response.schema.json.

const schemaAdminRestrictSalesOrganizerResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_restrict_sales_organizer_response.schema.json',
  'title': 'adminRestrictSalesOrganizerResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'restriction',
  ],
  'properties': <String, Object?>{
    'restriction': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'schemaVersion',
        'classification',
        'organizerId',
        'status',
        'revision',
        'reason',
        'requestId',
        'materialHash',
        'restrictedByUid',
        'restrictedAt',
        'activePlanId',
      ],
      'properties': <String, Object?>{
        'schemaVersion': <String, Object?>{
          'const': 1,
        },
        'classification': <String, Object?>{
          'const': 'sales_private',
        },
        'organizerId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
        },
        'status': <String, Object?>{
          'enum': <Object?>[
            'restricted',
            'processing',
            'internal_processed_with_unresolved',
          ],
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'reason': <String, Object?>{
          'type': 'string',
        },
        'requestId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
        },
        'materialHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'restrictedByUid': <String, Object?>{
          'type': 'string',
        },
        'restrictedAt': <String, Object?>{
          'type': 'string',
          'format': 'date-time',
        },
        'activePlanId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
  },
  'x-callable-aliases': <Object?>[
    'adminRestrictSalesOrganizer',
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
