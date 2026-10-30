// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/apply_program_function_invitations_payload.schema.json.

const schemaApplyProgramFunctionInvitationsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/apply_program_function_invitations_payload.schema.json',
  'title': 'ApplyProgramFunctionInvitationsCallablePayload',
  'description': 'Set one program function\'s invitation mode and, for selectedGuests functions, the explicit invited guest list. The callable diffs the desired list against current programFunctionGuests rows; unknown guest ids are ignored.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'functionId',
    'invitationMode',
    'expectedRevision',
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
    'invitationMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'allGuests',
        'selectedGuests',
      ],
      'description': 'Whether the function invites every program guest or only the programFunctionGuests rows marked invited.',
    },
    'selectedGuestIds': <String, Object?>{
      'type': 'array',
      'maxItems': 2000,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'description': 'Desired invited guests for selectedGuests mode; ignored when invitationMode is allGuests.',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'description': 'Fences the function document read-modify-write.',
    },
  },
};
