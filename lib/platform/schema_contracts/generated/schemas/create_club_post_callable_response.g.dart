// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_club_post_response.schema.json.

const schemaCreateClubPostCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_club_post_response.schema.json',
  'title': 'CreateClubPostCallableResponse',
  'description': 'Callable response returned by createClubPost.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'postId',
    'remainingWeeklyQuota',
  ],
  'properties': <String, Object?>{
    'postId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'remainingWeeklyQuota': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 3,
    },
  },
};
