// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_participant_form_profile_response.schema.json.

const schemaGetParticipantFormProfileCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_participant_form_profile_response.schema.json',
  'title': 'GetParticipantFormProfileCallableResponse',
  'description': 'Participant-only form review, with an optimistic profile revision and no unrelated CRM data.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'responseId',
    'organizerId',
    'formId',
    'formTitle',
    'submittedAtMillis',
    'fields',
    'profileRevision',
    'termsVersion',
    'intakeRevision',
    'organizerName',
    'selectedCardQuestionIds',
    'claimedAtMillis',
    'currentProfile',
    'currentLinkedinUrl',
    'cardRevision',
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
    'formId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'fields': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'description': 'Only explicitly designated applicant-submitted answers.',
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'destination',
          'canonicalFieldId',
          'label',
          'kind',
          'value',
          'options',
          'eventProfileEligible',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'destination': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'catchProfile',
              'organizerCard',
            ],
          },
          'canonicalFieldId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'x-catch-catalog': '../catalogs/person_fields.json',
                'enum': <Object?>[
                  'givenName',
                  'familyName',
                  'displayName',
                  'dateOfBirth',
                  'age',
                  'gender',
                  'phoneNumber',
                  'email',
                  'instagramHandle',
                  'linkedinUrl',
                  'profilePhoto',
                  'city',
                  'heightCm',
                  'occupation',
                  'company',
                  'education',
                  'languages',
                  'relationshipGoal',
                  'interestedInGenders',
                  'drinking',
                  'smoking',
                  'religion',
                  'workout',
                  'diet',
                  'children',
                ],
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'label': <String, Object?>{
            'type': 'string',
            'maxLength': 240,
          },
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'shortText',
              'longText',
              'singleChoice',
              'multiChoice',
              'date',
              'phone',
              'email',
              'url',
              'number',
              'boolean',
              'file',
              'acknowledgement',
              'signature',
            ],
          },
          'value': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'maxLength': 10000,
              },
              <String, Object?>{
                'type': 'number',
                'minimum': -1000000000,
                'maximum': 1000000000,
              },
              <String, Object?>{
                'type': 'boolean',
              },
              <String, Object?>{
                'type': 'null',
              },
              <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'maxLength': 500,
                },
              },
            ],
          },
          'options': <String, Object?>{
            'type': 'array',
            'maxItems': 100,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'optionId',
                'label',
                'value',
              ],
              'properties': <String, Object?>{
                'optionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'label': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
                'value': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
              },
            },
          },
          'eventProfileEligible': <String, Object?>{
            'type': 'boolean',
            'description': 'True only for a published field explicitly proposed for optional event-member sharing; the owner must still grant event-specific consent.',
          },
        },
      },
    },
    'profileRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'termsVersion': <String, Object?>{
      'type': 'string',
      'const': 'form-profile-claim-v1',
    },
    'intakeRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'organizerName': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
    },
    'selectedCardQuestionIds': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
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
    'currentProfile': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'currentLinkedinUrl': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 2048,
    },
    'cardRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
