// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/unarchive_program_payload.schema.json.

const schemaUnarchiveProgramCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/unarchive_program_payload.schema.json',
  'title': 'UnarchiveProgramCallablePayload',
  'description': 'Restore an archived program to its pre-archive status. Only valid while the grace window is still open; expectedRevision fences concurrent edits.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'unarchiveProgram',
  ],
  'required': <Object?>[
    'programId',
    'expectedRevision',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
  },
};
