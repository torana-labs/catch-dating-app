// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_function_payload.schema.json.

const schemaUpsertProgramFunctionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_function_payload.schema.json',
  'title': 'UpsertProgramFunctionCallablePayload',
  'description': 'Create or update a private program function (ceremony, reception, session).',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'name',
    'startsAtMillis',
    'endsAtMillis',
    'venueName',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'functionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'startsAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'endsAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'venueName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'venueNotes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'scheduled',
        'completed',
        'cancelled',
      ],
    },
  },
};
