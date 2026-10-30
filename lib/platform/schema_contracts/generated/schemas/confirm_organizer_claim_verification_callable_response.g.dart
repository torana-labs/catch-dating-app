// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/confirm_organizer_claim_verification_response.schema.json.

const schemaConfirmOrganizerClaimVerificationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/confirm_organizer_claim_verification_response.schema.json',
  'title': 'ConfirmOrganizerClaimVerificationCallableResponse',
  'description': 'Callable response returned by confirmOrganizerClaimVerification after it reads the listing\'s Luma calendar for the attempt\'s code.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'attemptId',
    'status',
    'claimRequestId',
    'lastRejection',
  ],
  'properties': <String, Object?>{
    'attemptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'description': 'claimUnavailable: the page was claimed or closed meanwhile, so staff review is the way forward.',
      'type': 'string',
      'enum': <Object?>[
        'awaitingProof',
        'verified',
        'expired',
        'claimUnavailable',
      ],
    },
    'claimRequestId': <String, Object?>{
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
    'lastRejection': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'codeNotFound',
            'pageUnavailable',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
