// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_invite_claim_response.schema.json.

const schemaProgramInviteClaimCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_invite_claim_response.schema.json',
  'title': 'ProgramInviteClaimCallableResponse',
  'description': 'Result of redeeming a program staff invite. Carries the program the invite grants access to so the client can navigate into the work shell.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'claimProgramStaffInvite',
  ],
  'required': <Object?>[
    'programId',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
      'description': 'True when this account already consumed the invite.',
    },
  },
};
