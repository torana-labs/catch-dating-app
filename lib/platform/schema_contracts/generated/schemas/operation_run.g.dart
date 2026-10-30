// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/run.schema.json.

const schemaOperationRunSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/run.schema.json',
  'title': 'OperationRun',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'runId',
    'workflowId',
    'revision',
    'mode',
    'status',
    'scope',
    'rulesetVersion',
    'policyVersion',
    'inputHash',
    'budgets',
    'counters',
    'checkpoint',
    'createdAt',
    'updatedAt',
    'startedAt',
    'finishedAt',
    'failure',
    'metadata',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'runId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'workflowId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'pattern': '^[a-z][a-z0-9_-]*\$',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'mode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'shadow',
        'assisted',
        'autonomous',
      ],
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'planned',
        'queued',
        'running',
        'paused',
        'completed',
        'failed',
        'cancelled',
      ],
    },
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': true,
      'maxProperties': 40,
    },
    'rulesetVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'policyVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'inputHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'budgets': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'maxWorkItems',
        'maxModelCalls',
        'maxModelTokens',
        'maxCostMicros',
        'deadlineAt',
      ],
      'properties': <String, Object?>{
        'maxWorkItems': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 10000,
        },
        'maxModelCalls': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'maxModelTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'maxCostMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'deadlineAt': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'date-time',
        },
      },
    },
    'counters': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'discovered',
        'processed',
        'modelCalls',
        'modelTokens',
        'costMicros',
        'escalated',
        'published',
        'failed',
      ],
      'properties': <String, Object?>{
        'discovered': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'processed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'modelCalls': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'modelTokens': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'costMicros': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'escalated': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'published': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'failed': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
    'checkpoint': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'lastSequence',
        'cursor',
      ],
      'properties': <String, Object?>{
        'lastSequence': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'cursor': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 1000,
        },
      },
    },
    'createdAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'updatedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'startedAt': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'date-time',
    },
    'finishedAt': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'format': 'date-time',
    },
    'failure': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'code',
            'message',
            'retryable',
          ],
          'properties': <String, Object?>{
            'code': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
              'pattern': '^[a-z][a-z0-9_.:-]*\$',
            },
            'message': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'retryable': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'metadata': <String, Object?>{
      'type': 'object',
      'additionalProperties': true,
      'maxProperties': 40,
    },
  },
};
