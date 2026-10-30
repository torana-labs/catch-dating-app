// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/onboarding_drafts.schema.json.

const schemaOnboardingDraftDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/onboarding_drafts.schema.json',
  'title': 'OnboardingDraftDocument',
  'description': 'Owner-private, intentionally extensible onboarding draft stored at onboarding_drafts/{uid}.',
  'type': 'object',
  'additionalProperties': true,
  'x-firestore-collection': 'onboarding_drafts',
  'x-firestore-path': 'onboarding_drafts/{uid}',
  'x-document-id-field': 'uid',
  'x-owner': 'authenticated draft owner',
  'required': <Object?>[
    'step',
  ],
  'properties': <String, Object?>{
    'step': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'client-writable',
    },
    'draftVersion': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'client-writable',
    },
    'firstName': <String, Object?>{
      'type': 'string',
      'maxLength': 80,
      'x-catch-ownership': 'client-writable',
    },
    'lastName': <String, Object?>{
      'type': 'string',
      'maxLength': 80,
      'x-catch-ownership': 'client-writable',
    },
    'dateOfBirth': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'client-writable',
    },
    'phoneNumber': <String, Object?>{
      'type': 'string',
      'maxLength': 32,
      'x-catch-ownership': 'client-writable',
    },
    'countryCode': <String, Object?>{
      'type': 'string',
      'maxLength': 8,
      'x-catch-ownership': 'client-writable',
    },
    'gender': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'man',
            'woman',
            'nonBinary',
            'other',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'x-catch-ownership': 'client-writable',
    },
    'interestedInGenders': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'man',
          'woman',
          'nonBinary',
          'other',
        ],
      },
      'uniqueItems': true,
      'x-catch-ownership': 'client-writable',
    },
    'instagramHandle': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
      'x-catch-ownership': 'client-writable',
    },
    'profilePrompts': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'title': 'ProfilePromptAnswer',
        'description': 'One structured written profile prompt answer stored on users and publicProfiles.',
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'promptId',
          'prompt',
          'answer',
        ],
        'properties': <String, Object?>{
          'promptId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'prompt': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'answer': <String, Object?>{
            'type': 'string',
            'maxLength': 300,
          },
        },
        'x-catch-catalog': '../catalogs/profile_prompts.json',
      },
      'maxItems': 3,
      'x-catch-ownership': 'client-writable',
    },
  },
};
