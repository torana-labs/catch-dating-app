// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_list_intake_operations_payload.schema.json.

const schemaAdminListIntakeOperationsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_list_intake_operations_payload.schema.json',
  'title': 'AdminListIntakeOperationsCallablePayload',
  'description': 'Read-only filters for the durable Supply Intake operations inventory. This callable never requests or executes a run.',
  'type': 'object',
  'additionalProperties': false,
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'humanReviewRequired',
        ],
        'properties': <String, Object?>{
          'humanReviewRequired': <String, Object?>{
            'const': true,
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'primaryStage': <String, Object?>{
            'type': 'null',
          },
          'entityKind': <String, Object?>{
            'type': 'null',
          },
          'lifecycleStatus': <String, Object?>{
            'type': 'null',
          },
        },
      },
    },
  ],
  'properties': <String, Object?>{
    'workflowId': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'supply-intake',
      ],
    },
    'runId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'primaryStage': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'incoming',
        'verify',
        'resolve',
        'ready',
        null,
      ],
    },
    'entityKind': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'event',
        'organizer',
        'source_result',
        'source_profile',
        null,
      ],
    },
    'lifecycleStatus': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'queued',
        'in_progress',
        'waiting',
        'ready',
        'published',
        'terminal',
        null,
      ],
    },
    'runStatus': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'planned',
        'queued',
        'running',
        'paused',
        'completed',
        'failed',
        'cancelled',
        null,
      ],
    },
    'humanReviewRequired': <String, Object?>{
      'type': 'boolean',
      'description': 'When true, returns only work items carrying the canonical human_review_required task flag.',
    },
    'runLimit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 25,
    },
    'workItemLimit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 200,
    },
    'runCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'workItemCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1500,
    },
  },
};
