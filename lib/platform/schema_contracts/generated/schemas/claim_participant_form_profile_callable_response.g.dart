// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/claim_participant_form_profile_response.schema.json.

const schemaClaimParticipantFormProfileCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/claim_participant_form_profile_response.schema.json',
  'title': 'ClaimParticipantFormProfileCallableResponse',
  'description': 'Private claim result. No public or room sharing is inferred.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'profileRevision',
    'organizerCardId',
    'claimedAtMillis',
    'replayed',
  ],
  'properties': <String, Object?>{
    'profileRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'organizerCardId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'claimedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
