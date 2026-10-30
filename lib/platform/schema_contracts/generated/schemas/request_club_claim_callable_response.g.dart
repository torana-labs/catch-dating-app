// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/request_club_claim_response.schema.json.

const schemaRequestClubClaimCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/request_club_claim_response.schema.json',
  'title': 'RequestClubClaimCallableResponse',
  'description': 'Callable response returned by requestClubClaim after a public organizer claim request is accepted for review.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'requestId',
    'status',
  ],
  'properties': <String, Object?>{
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
      ],
    },
  },
};
