// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/start_organizer_claim_verification_response.schema.json.

const schemaStartOrganizerClaimVerificationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/start_organizer_claim_verification_response.schema.json',
  'title': 'StartOrganizerClaimVerificationCallableResponse',
  'description': 'Callable response returned by startOrganizerClaimVerification: the live attempt and the code to show. Starting again while an attempt has more than five minutes left returns that attempt.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'attemptId',
    'organizerId',
    'method',
    'code',
    'proofText',
    'proofTarget',
    'catchInstagramHandle',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'attemptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'method': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'instagramMessage',
        'lumaDescription',
      ],
    },
    'code': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{6}\$',
    },
    'proofText': <String, Object?>{
      'description': 'Exactly what the organiser sends or pastes: the code for Instagram, catch-<code> for Luma.',
      'type': 'string',
      'pattern': '^(catch-)?[0-9]{6}\$',
    },
    'proofTarget': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'catchInstagramHandle': <String, Object?>{
      'description': 'Catch\'s Instagram username without @, for instagramMessage attempts.',
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 30,
    },
    'expiresAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
  },
};
