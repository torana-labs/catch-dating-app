// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/revoke_program_staff_invite_payload.schema.json.

const schemaRevokeProgramStaffInviteCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/revoke_program_staff_invite_payload.schema.json',
  'title': 'RevokeProgramStaffInviteCallablePayload',
  'description': 'Revoke a pending program staff invite so the link can no longer be claimed. Manager-only; claimed invites are unaffected (revoke the grant instead).',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'revokeProgramStaffInvite',
  ],
  'required': <Object?>[
    'programId',
    'inviteId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 180,
    },
  },
};
