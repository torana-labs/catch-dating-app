// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/request_organizer_claim_response.schema.json.

const schemaRequestOrganizerClaimCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/request_organizer_claim_response.schema.json',
  'title': 'RequestOrganizerClaimCallableResponse',
  'description': 'Callable response returned by requestOrganizerClaim.',
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
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
      ],
    },
  },
};
