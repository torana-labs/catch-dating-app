// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/claim_program_staff_invite_payload.schema.json.

const schemaClaimProgramStaffInviteCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/claim_program_staff_invite_payload.schema.json',
  'title': 'ClaimProgramStaffInviteCallablePayload',
  'description': 'Redeem a staff invite. The caller must be signed in with a verified phone number matching the invite\'s bound phone; on success a programStaffGrants document is written and the invite is consumed.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'claimProgramStaffInvite',
  ],
  'required': <Object?>[
    'inviteId',
  ],
  'properties': <String, Object?>{
    'inviteId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 180,
    },
  },
};
