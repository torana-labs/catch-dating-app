// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/admin_sales_fit_queue_list_response.schema.json.

const schemaAdminListSalesFitQueueResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/admin_sales_fit_queue_list_response.schema.json',
  'title': 'AdminListSalesFitQueueResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'rows',
    'nextCursor',
    'generation',
    'policyRevision',
    'qualificationPolicyHash',
    'omittedExpiredInPage',
  ],
  'properties': <String, Object?>{
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 25,
      'items': <String, Object?>{
        'title': 'SalesFitQueueEntryDocument',
        'description': 'Private current-fit projection. Only the source-bound, unexpired row may appear in a queue; this is never send authority.',
        'type': 'object',
        'additionalProperties': false,
        'x-firestore-collection': 'salesFitQueueEntries',
        'x-firestore-path': 'salesFitQueueEntries/{organizerId}',
        'x-document-id-field': 'organizerId',
        'x-owner': 'private Sales fit queue callables and source mutation invalidation hooks',
        'required': <Object?>[
          'schemaVersion',
          'classification',
          'organizerId',
          'policyId',
          'policyRevision',
          'policyVersion',
          'sourceHash',
          'accountRevision',
          'qualificationPolicyHash',
          'status',
          'score',
          'priority',
          'eligibleForOutreachReview',
          'suppressionStatus',
          'duplicateReviewRequired',
          'researchStatus',
          'name',
          'city',
          'assignedOwnerUid',
          'expiresAt',
          'evaluatedAt',
          'qualificationExpiresAt',
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
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'policyId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'policyRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'policyVersion': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'sourceHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'accountRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'qualificationPolicyHash': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'pattern': '^[a-f0-9]{64}\$',
          },
          'status': <String, Object?>{
            'enum': <Object?>[
              'complete',
              'needs_research',
              'review_required',
            ],
          },
          'score': <String, Object?>{
            'type': <Object?>[
              'number',
              'null',
            ],
            'minimum': 0,
            'maximum': 100,
          },
          'priority': <String, Object?>{
            'enum': <Object?>[
              'high',
              'medium',
              'low',
              'unranked',
            ],
          },
          'eligibleForOutreachReview': <String, Object?>{
            'type': 'boolean',
          },
          'suppressionStatus': <String, Object?>{
            'enum': <Object?>[
              'clear',
              'held',
              'suppressed',
            ],
          },
          'duplicateReviewRequired': <String, Object?>{
            'type': 'boolean',
          },
          'researchStatus': <String, Object?>{
            'enum': <Object?>[
              'new',
              'needs_research',
              'ready_for_review',
              'qualified',
              'benchmark_only',
              'no_fit',
              'archived',
            ],
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'city': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 160,
          },
          'assignedOwnerUid': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 96,
          },
          'expiresAt': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'format': 'date-time',
          },
          'evaluatedAt': <String, Object?>{
            'type': 'string',
            'format': 'date-time',
          },
          'qualificationExpiresAt': <String, Object?>{
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
        },
        'definitions': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 96,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
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
    'generation': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'policyRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'qualificationPolicyHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'omittedExpiredInPage': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
    },
  },
  'x-callable-aliases': <Object?>[
    'adminListSalesFitQueue',
  ],
};
