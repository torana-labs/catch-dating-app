// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/admin_record_action_execution_payload.schema.json.

const schemaAdminRecordActionExecutionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/admin_record_action_execution_payload.schema.json',
  'title': 'AdminRecordActionExecutionCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'executionId',
    'actionId',
    'callable',
    'status',
    'requestHash',
  ],
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'status': <String, Object?>{
            'const': 'succeeded',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'responseHash',
        ],
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'status': <String, Object?>{
            'enum': <Object?>[
              'failed',
              'indeterminate',
            ],
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'errorCode',
        ],
      },
    },
  ],
  'properties': <String, Object?>{
    'executionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\$',
    },
    'actionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)+\$',
      'maxLength': 120,
    },
    'callable': <String, Object?>{
      'type': 'string',
      'pattern': '^admin[A-Z][A-Za-z0-9]+\$',
      'maxLength': 120,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'started',
        'succeeded',
        'failed',
        'indeterminate',
      ],
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'responseHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'target': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'errorCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 120,
    },
    'errorMessage': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'cliVersion': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 40,
    },
  },
};
