// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/revoke_program_staff_payload.schema.json.

const schemaRevokeProgramStaffCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/revoke_program_staff_payload.schema.json',
  'title': 'RevokeProgramStaffCallablePayload',
  'description': 'Revoke a program staff grant with revision fencing. Manager-only.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'uid',
    'expectedRevision',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'uid': <String, Object?>{
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
