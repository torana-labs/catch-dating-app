// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_application_responses.schema.json.

const schemaOrganizerApplicationResponseDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_application_responses.schema.json',
  'title': 'OrganizerApplicationResponseDocument',
  'description': 'Immutable answer snapshot for one native, imported, or connector-originated organizer application response.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerApplicationResponses',
  'x-firestore-path': 'organizerApplicationResponses/{responseId}',
  'x-document-id-field': 'responseId',
  'x-owner': 'organizer application submission and import callables',
  'required': <Object?>[
    'organizerId',
    'applicationId',
    'formId',
    'formVersionId',
    'linkedUid',
    'answers',
    'source',
    'consentVersion',
    'grantId',
    'submittedAt',
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
    'linkedUid': <String, Object?>{
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
    'answers': <String, Object?>{
      'type': 'array',
      'minItems': 1,
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
    'source': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'providerId',
        'externalFormId',
        'externalResponseId',
        'importReceiptId',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'native',
            'tabularImport',
            'connector',
          ],
        },
        'providerId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 80,
        },
        'externalFormId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 240,
        },
        'externalResponseId': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'minLength': 1,
          'maxLength': 240,
        },
        'importReceiptId': <String, Object?>{
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
    },
    'consentVersion': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
    'grantId': <String, Object?>{
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
    'submittedAt': <String, Object?>{
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
