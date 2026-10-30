// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_club_response.schema.json.

const schemaCreateClubCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_club_response.schema.json',
  'title': 'CreateClubCallableResponse',
  'description': 'Callable response returned by createClub.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
