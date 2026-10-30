// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/archive_program_payload.schema.json.

const schemaArchiveProgramCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/archive_program_payload.schema.json',
  'title': 'ArchiveProgramCallablePayload',
  'description': 'Archive a program: explicit owner/manager action that starts the 14-day anonymization grace window. expectedRevision fences concurrent edits.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'archiveProgram',
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
