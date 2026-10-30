// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/archive_program_response.schema.json.

const schemaArchiveProgramCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/archive_program_response.schema.json',
  'title': 'ArchiveProgramCallableResponse',
  'description': 'Archive acknowledgement: committed program revision plus the anonymization deadline the grace window grants for unarchive.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'archiveProgram',
  ],
  'required': <Object?>[
    'entityId',
    'revision',
    'alreadyApplied',
    'anonymizeAtMillis',
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
    'anonymizeAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'description': 'Identity fields are scrubbed at this deadline unless the program is unarchived first.',
    },
  },
};
