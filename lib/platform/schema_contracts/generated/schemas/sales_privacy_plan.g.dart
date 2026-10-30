// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_privacy_plans.schema.json.

const schemaSalesPrivacyPlanSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_privacy_plans.schema.json',
  'title': 'SalesPrivacyPlan',
  'description': 'Server-inventoried, exact-source cleanup plan. Paths are private and never returned in owner previews.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'planId',
    'requestId',
    'organizerId',
    'restrictionRevision',
    'policyHash',
    'inventoryHash',
    'items',
    'blockers',
    'cursor',
    'status',
    'reviewedByUid',
    'reviewedAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'planId': <String, Object?>{
      'type': 'string',
      'pattern': '^privacy-[a-f0-9]{40}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
    },
    'restrictionRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'policyHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'inventoryHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 240,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'path',
          'contentHash',
          'disposition',
        ],
        'properties': <String, Object?>{
          'path': <String, Object?>{
            'type': 'string',
            'minLength': 3,
            'maxLength': 400,
          },
          'contentHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'disposition': <String, Object?>{
            'enum': <Object?>[
              'delete',
              'retain_finance',
              'retain_audit',
            ],
          },
        },
      },
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
    'cursor': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 240,
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'reviewed',
        'processing',
        'internal_processed_with_unresolved',
      ],
    },
    'reviewedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'reviewedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
  'definitions': <String, Object?>{
    'item': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'path',
        'contentHash',
        'disposition',
      ],
      'properties': <String, Object?>{
        'path': <String, Object?>{
          'type': 'string',
          'minLength': 3,
          'maxLength': 400,
        },
        'contentHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
        'disposition': <String, Object?>{
          'enum': <Object?>[
            'delete',
            'retain_finance',
            'retain_audit',
          ],
        },
      },
    },
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
  },
  'x-firestore-collection': 'salesPrivacyPlans',
  'x-firestore-path': 'salesPrivacyPlans/{id}',
  'x-owner': 'Private Sales privacy lifecycle',
};
