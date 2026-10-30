// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/unarchive_program_response.schema.json.

const schemaUnarchiveProgramCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/unarchive_program_response.schema.json',
  'title': 'UnarchiveProgramCallableResponse',
  'description': 'Unarchive acknowledgement: committed program revision plus the status restored from the pre-archive record.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'unarchiveProgram',
  ],
  'required': <Object?>[
    'entityId',
    'revision',
    'alreadyApplied',
    'restoredStatus',
  ],
  'properties': <String, Object?>{
    'entityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
      'description': 'True when an exact clientOperationId replay returned the original result.',
    },
    'restoredStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'active',
        'completed',
        'archived',
      ],
    },
  },
};
