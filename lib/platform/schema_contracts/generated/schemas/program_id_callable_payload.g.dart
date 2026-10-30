// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/program_id_payload.schema.json.

const schemaProgramIdCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/program_id_payload.schema.json',
  'title': 'ProgramIdCallablePayload',
  'description': 'Program-scoped read payload shared by simple program callables.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'getOrganizerProgram',
    'getProgramAttendanceReport',
    'getProgramStakeholderCounts',
    'getProgramWorkAccess',
    'listProgramHouseholds',
  ],
  'required': <Object?>[
    'programId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
