// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_application_form_versions.schema.json.

const schemaOrganizerApplicationFormVersionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_application_form_versions.schema.json',
  'title': 'OrganizerApplicationFormVersionDocument',
  'description': 'Immutable published or imported snapshot of one organizer application form.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerApplicationFormVersions',
  'x-firestore-path': 'organizerApplicationFormVersions/{versionId}',
  'x-document-id-field': 'versionId',
  'x-owner': 'organizer application form publish and import callables',
  'required': <Object?>[
    'organizerId',
    'formId',
    'version',
    'state',
    'title',
    'description',
    'questions',
    'consentCopy',
    'consentVersion',
    'retentionCopy',
    'createdByUid',
    'createdAt',
    'publishedAt',
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
    'version': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draftSnapshot',
        'published',
        'retired',
      ],
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'description': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'questions': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'key',
          'label',
          'helpText',
          'kind',
          'required',
          'options',
          'canonicalFieldId',
          'privacyClass',
          'prefillPolicy',
          'hostPresentation',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'key': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z][A-Za-z0-9_]{0,79}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 240,
          },
          'helpText': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
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
            ],
          },
          'required': <String, Object?>{
            'type': 'boolean',
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
                  'maxLength': 80,
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
          'prefillPolicy': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'never',
              'participantReviewRequired',
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
        },
      },
    },
    'consentCopy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'consentVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'retentionCopy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 1000,
    },
    'createdByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'publishedAt': <String, Object?>{
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
    },
  },
};
