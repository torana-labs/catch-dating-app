// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_participant_organizer_application_payload.schema.json.

const schemaSubmitParticipantOrganizerApplicationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_participant_organizer_application_payload.schema.json',
  'title': 'SubmitParticipantOrganizerApplicationCallablePayload',
  'description': 'Submits one participant-reviewed native application and an exact organizer field grant.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'formVersionId',
    'targetKind',
    'targetId',
    'submissionKey',
    'answers',
    'reviewedQuestionIds',
    'saveToIntakeCanonicalFieldIds',
    'consentVersion',
    'confirmedConsent',
  ],
  'properties': <String, Object?>{
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
    'formVersionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'targetKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'organizer',
        'event',
        'campaign',
      ],
    },
    'targetId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'submissionKey': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{8,120}\$',
    },
    'answers': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'value',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'value': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'valueKind',
              'textValue',
              'numberValue',
              'booleanValue',
              'dateValue',
              'optionValues',
              'assetIds',
            ],
            'properties': <String, Object?>{
              'valueKind': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'empty',
                  'text',
                  'number',
                  'boolean',
                  'date',
                  'options',
                  'assets',
                ],
              },
              'textValue': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'maxLength': 4000,
              },
              'numberValue': <String, Object?>{
                'type': <Object?>[
                  'number',
                  'null',
                ],
                'minimum': -1000000000,
                'maximum': 1000000000,
              },
              'booleanValue': <String, Object?>{
                'type': <Object?>[
                  'boolean',
                  'null',
                ],
              },
              'dateValue': <String, Object?>{
                'type': <Object?>[
                  'string',
                  'null',
                ],
                'format': 'date',
              },
              'optionValues': <String, Object?>{
                'type': 'array',
                'maxItems': 100,
                'items': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 160,
                },
              },
              'assetIds': <String, Object?>{
                'type': 'array',
                'maxItems': 10,
                'uniqueItems': true,
                'items': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
              },
            },
          },
        },
      },
    },
    'reviewedQuestionIds': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 120,
      },
    },
    'saveToIntakeCanonicalFieldIds': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'uniqueItems': true,
      'items': <String, Object?>{
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
    },
    'consentVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'confirmedConsent': <String, Object?>{
      'type': 'boolean',
      'const': true,
    },
  },
  'definitions': <String, Object?>{
    'answerInput': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'questionId',
        'value',
      ],
      'properties': <String, Object?>{
        'questionId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 120,
        },
        'value': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'valueKind',
            'textValue',
            'numberValue',
            'booleanValue',
            'dateValue',
            'optionValues',
            'assetIds',
          ],
          'properties': <String, Object?>{
            'valueKind': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'empty',
                'text',
                'number',
                'boolean',
                'date',
                'options',
                'assets',
              ],
            },
            'textValue': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 4000,
            },
            'numberValue': <String, Object?>{
              'type': <Object?>[
                'number',
                'null',
              ],
              'minimum': -1000000000,
              'maximum': 1000000000,
            },
            'booleanValue': <String, Object?>{
              'type': <Object?>[
                'boolean',
                'null',
              ],
            },
            'dateValue': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'format': 'date',
            },
            'optionValues': <String, Object?>{
              'type': 'array',
              'maxItems': 100,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
              },
            },
            'assetIds': <String, Object?>{
              'type': 'array',
              'maxItems': 10,
              'uniqueItems': true,
              'items': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
              },
            },
          },
        },
      },
    },
  },
};
