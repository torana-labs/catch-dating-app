// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_participant_form_profiles_response.schema.json.

const schemaListParticipantFormProfilesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_participant_form_profiles_response.schema.json',
  'title': 'ListParticipantFormProfilesCallableResponse',
  'description': 'Private summary metadata only; invalid or withdrawn response sources are omitted.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'items',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 30,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'responseId',
          'organizerId',
          'organizerName',
          'formTitle',
          'submittedAtMillis',
          'claimedAtMillis',
          'cardFieldCount',
        ],
        'properties': <String, Object?>{
          'responseId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'organizerId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'organizerName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 240,
          },
          'formTitle': <String, Object?>{
            'type': 'string',
            'maxLength': 160,
          },
          'submittedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'claimedAtMillis': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'integer',
                'minimum': 0,
                'maximum': 9007199254740991,
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'cardFieldCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
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
  },
};
