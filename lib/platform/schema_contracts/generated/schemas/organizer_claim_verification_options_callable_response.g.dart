// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_claim_verification_options_response.schema.json.

const schemaOrganizerClaimVerificationOptionsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_claim_verification_options_response.schema.json',
  'title': 'OrganizerClaimVerificationOptionsCallableResponse',
  'description': 'Callable response returned by getOrganizerClaimVerificationOptions: which ways of proving ownership this listing offers the signed-in user. Staff review stays available whatever this says.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'methods',
    'catchInstagramHandle',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'methods': <String, Object?>{
      'type': 'array',
      'maxItems': 2,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'method',
          'available',
          'proofTarget',
          'unavailableReason',
        ],
        'properties': <String, Object?>{
          'method': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'instagramMessage',
              'lumaDescription',
            ],
          },
          'available': <String, Object?>{
            'type': 'boolean',
          },
          'proofTarget': <String, Object?>{
            'description': 'The listing\'s Instagram username without @, or its Luma calendar URL.',
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 240,
          },
          'unavailableReason': <String, Object?>{
            'description': 'turnedOff: Catch has not switched this method on. noSourceOnListing: the listing has no Instagram account or Luma calendar to check.',
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'turnedOff',
                  'noSourceOnListing',
                ],
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'catchInstagramHandle': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 30,
    },
  },
};
