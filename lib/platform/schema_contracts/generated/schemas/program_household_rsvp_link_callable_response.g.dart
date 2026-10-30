// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_household_rsvp_link_response.schema.json.

const schemaProgramHouseholdRsvpLinkCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_household_rsvp_link_response.schema.json',
  'title': 'ProgramHouseholdRsvpLinkCallableResponse',
  'description': 'A freshly minted household RSVP token with its exclusive expiry. The client composes the share URL.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'issueProgramHouseholdRsvpLink',
  ],
  'required': <Object?>[
    'entityId',
    'token',
    'expiresAtMillis',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'entityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'The household document id.',
    },
    'token': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 1024,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
    },
  },
};
