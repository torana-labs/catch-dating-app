// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/participant_intake_profiles.schema.json.

const schemaParticipantIntakeProfileDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/participant_intake_profiles.schema.json',
  'title': 'ParticipantIntakeProfileDocument',
  'description': 'Participant-private reusable application values. This is neither a Catch dating profile nor organizer-visible CRM data.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'participantIntakeProfiles',
  'x-firestore-path': 'participantIntakeProfiles/{uid}',
  'x-document-id-field': 'uid',
  'x-owner': 'participant intake profile callables',
  'required': <Object?>[
    'fields',
    'revision',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'fields': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'canonicalFieldId',
          'value',
          'sourceApplicationId',
          'reviewedByParticipantAt',
          'updatedAt',
        ],
        'properties': <String, Object?>{
          'canonicalFieldId': <String, Object?>{
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
          'sourceApplicationId': <String, Object?>{
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
          'reviewedByParticipantAt': <String, Object?>{
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
          'updatedAt': <String, Object?>{
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
        },
      },
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'createdAt': <String, Object?>{
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
    'updatedAt': <String, Object?>{
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
  },
};
