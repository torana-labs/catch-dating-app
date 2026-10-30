// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_function_invitations_response.schema.json.

const schemaProgramFunctionInvitationsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_function_invitations_response.schema.json',
  'title': 'ProgramFunctionInvitationsCallableResponse',
  'description': 'Acknowledgement for an invitation-list apply: the committed function revision plus the row diff that landed.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'applyProgramFunctionInvitations',
  ],
  'required': <Object?>[
    'entityId',
    'revision',
    'createdCount',
    'revokedCount',
    'keptCount',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'entityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'The function document id.',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'createdCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'revokedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'keptCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
      'description': 'True when an exact replay returned the original result.',
    },
  },
};
