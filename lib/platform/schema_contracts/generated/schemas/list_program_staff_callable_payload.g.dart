// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_program_staff_payload.schema.json.

const schemaListProgramStaffCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_program_staff_payload.schema.json',
  'title': 'ListProgramStaffCallablePayload',
  'description': 'Manager-only staff inventory in stable staff-identity order.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 50,
    },
    'cursor': <String, Object?>{
      'type': 'string',
      'maxLength': 180,
      'description': 'Staff UID continuation returned by the preceding page. Ordering survives renewal and revocation.',
      'minLength': 1,
      'pattern': '^[^/]+\$',
    },
  },
};
