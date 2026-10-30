// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_organizer_application_detail_response.schema.json.

const schemaGetOrganizerApplicationDetailCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_organizer_application_detail_response.schema.json',
  'title': 'GetOrganizerApplicationDetailCallableResponse',
  'description': 'Manager-only application answers, source context, and validated outreach actions.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'applicationId',
    'formId',
    'formVersionId',
    'targetKind',
    'targetId',
    'applicantDisplayName',
    'reviewStatus',
    'dataAccessState',
    'answers',
    'outreach',
    'reviewNote',
    'assignedReviewerUid',
    'submittedAtMillis',
    'reviewedAtMillis',
    'revision',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'applicationId': <String, Object?>{
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
    'applicantDisplayName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'reviewStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'submitted',
        'inReview',
        'approved',
        'waitlisted',
        'declined',
        'withdrawn',
      ],
    },
    'dataAccessState': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'organizerImported',
        'activeParticipantGrant',
        'revokedParticipantGrant',
        'submittedFormResponse',
      ],
    },
    'answers': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'questionKey',
          'questionLabel',
          'questionKind',
          'canonicalFieldId',
          'privacyClass',
          'hostPresentation',
          'value',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'questionKey': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z][A-Za-z0-9_]{0,79}\$',
          },
          'questionLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'questionKind': <String, Object?>{
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
          'privacyClass': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'contact',
              'profile',
              'sensitive',
              'organizerCustom',
            ],
          },
          'hostPresentation': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'detailOnly',
              'filterable',
              'sortable',
            ],
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
    'outreach': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'phoneE164',
        'email',
        'instagramUrl',
        'linkedinUrl',
      ],
      'properties': <String, Object?>{
        'phoneE164': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'email',
          'maxLength': 320,
        },
        'instagramUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'uri',
          'maxLength': 500,
        },
        'linkedinUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'uri',
          'maxLength': 500,
        },
      },
    },
    'reviewNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 2000,
    },
    'assignedReviewerUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'submittedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'reviewedAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'contactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceResponseId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
  'definitions': <String, Object?>{
    'outreach': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'phoneE164',
        'email',
        'instagramUrl',
        'linkedinUrl',
      ],
      'properties': <String, Object?>{
        'phoneE164': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'email',
          'maxLength': 320,
        },
        'instagramUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'uri',
          'maxLength': 500,
        },
        'linkedinUrl': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'uri',
          'maxLength': 500,
        },
      },
    },
  },
};
