// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/manage_website_account_response.schema.json.

const schemaManageWebsiteAccountCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/manage_website_account_response.schema.json',
  'title': 'ManageWebsiteAccountCallableResponse',
  'description': 'Private account identity and optional own organizer-follow state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'uid',
    'accountReady',
    'displayName',
    'phoneNumber',
    'dateOfBirth',
    'profileRevision',
    'following',
    'eventAge',
  ],
  'properties': <String, Object?>{
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'accountReady': <String, Object?>{
      'type': 'boolean',
    },
    'displayName': <String, Object?>{
      'type': 'string',
      'maxLength': 120,
    },
    'phoneNumber': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 32,
    },
    'dateOfBirth': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'date',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'profileRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'following': <String, Object?>{
      'type': <Object?>[
        'boolean',
        'null',
      ],
      'description': 'Null unless an organizer was requested. Reflects only the authenticated UID relationship.',
    },
    'eventAge': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'minimum',
            'maximum',
            'eligible',
            'needsDateOfBirth',
          ],
          'properties': <String, Object?>{
            'minimum': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 120,
            },
            'maximum': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 120,
            },
            'eligible': <String, Object?>{
              'type': 'boolean',
            },
            'needsDateOfBirth': <String, Object?>{
              'type': 'boolean',
            },
          },
        },
      ],
    },
  },
};
