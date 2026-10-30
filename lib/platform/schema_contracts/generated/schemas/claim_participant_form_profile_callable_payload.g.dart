// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/claim_participant_form_profile_payload.schema.json.

const schemaClaimParticipantFormProfileCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/claim_participant_form_profile_payload.schema.json',
  'title': 'ClaimParticipantFormProfileCallablePayload',
  'description': 'Claim reviewed form data for the authenticated participant without enabling dating discovery or event admission.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'responseId',
    'expectedProfileRevision',
    'requestId',
    'termsVersion',
    'selectedQuestionIds',
    'profile',
    'expectedIntakeRevision',
  ],
  'properties': <String, Object?>{
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedProfileRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{16,100}\$',
    },
    'termsVersion': <String, Object?>{
      'type': 'string',
      'const': 'form-profile-claim-v1',
    },
    'selectedQuestionIds': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'profile': <String, Object?>{
      'description': 'Explicit participant-reviewed core values. Phone identity comes from verified Auth, never a form answer.',
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'displayName',
        'dateOfBirth',
        'gender',
      ],
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'firstName': <String, Object?>{
          'type': 'string',
          'maxLength': 80,
        },
        'lastName': <String, Object?>{
          'type': 'string',
          'maxLength': 80,
        },
        'displayName': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 80,
          'pattern': '.*\\S.*',
        },
        'gender': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'man',
            'woman',
            'nonBinary',
            'other',
          ],
        },
        'email': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'const': '',
            },
            <String, Object?>{
              'type': 'string',
              'format': 'email',
              'maxLength': 320,
            },
          ],
        },
        'instagramHandle': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 30,
              'pattern': '^[A-Za-z0-9._]{1,30}\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'city': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 120,
              'pattern': '^[a-z]{2}-[a-z0-9]+(?:-[a-z0-9]+)*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'height': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 120,
          'maximum': 220,
        },
        'occupation': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'company': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 120,
        },
        'education': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'highSchool',
            'someCollege',
            'bachelors',
            'masters',
            'phd',
            'tradeSchool',
            'other',
            null,
          ],
        },
        'religion': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'hindu',
            'muslim',
            'christian',
            'sikh',
            'jain',
            'buddhist',
            'other',
            'nonReligious',
            null,
          ],
        },
        'languages': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'english',
              'hindi',
              'marathi',
              'tamil',
              'telugu',
              'kannada',
              'bengali',
              'gujarati',
              'punjabi',
              'malayalam',
              'odia',
              'other',
            ],
          },
        },
        'relationshipGoal': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'relationship',
            'casual',
            'marriage',
            'friendship',
            'unsure',
            null,
          ],
        },
        'drinking': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'never',
            'socially',
            'often',
            null,
          ],
        },
        'smoking': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'never',
            'occasionally',
            'often',
            null,
          ],
        },
        'workout': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'never',
            'sometimes',
            'often',
            'everyday',
            null,
          ],
        },
        'diet': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'omnivore',
            'vegetarian',
            'vegan',
            'jain',
            'other',
            null,
          ],
        },
        'children': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'dontHave',
            'haveWantMore',
            'haveNoMore',
            'wantSomeday',
            'dontWant',
            null,
          ],
        },
        'dateOfBirth': <String, Object?>{
          'type': 'string',
          'format': 'date',
        },
        'interestedInGenders': <String, Object?>{
          'type': 'array',
          'minItems': 0,
          'maxItems': 8,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'man',
              'woman',
              'nonBinary',
              'other',
            ],
          },
          'x-catch-ownership': 'client-writable',
        },
      },
    },
    'expectedIntakeRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'reviewedLinkedinUrl': <String, Object?>{
      'type': 'string',
      'maxLength': 2048,
      'format': 'uri',
      'pattern': '^https://([a-z]{2,3}\\.)?(www\\.)?linkedin\\.com/in/[^\\s]+\$',
    },
  },
};
