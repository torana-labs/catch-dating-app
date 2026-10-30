// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_responses.schema.json.

const schemaOrganizerFormResponseDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_responses.schema.json',
  'title': 'OrganizerFormResponseDocument',
  'description': 'Immutable submitted response envelope with withdrawal state.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'publicFormId',
    'draftId',
    'status',
    'identityKind',
    'respondentUid',
    'identity',
    'withdrawalTokenHash',
    'answers',
    'answerSnapshots',
    'consentVersion',
    'sourceLinkId',
    'completionMillis',
    'submittedAt',
    'withdrawnAt',
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
    'versionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'publicFormId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'draftId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'submitted',
        'withdrawn',
      ],
    },
    'identityKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'anonymous',
        'emailVerified',
        'phoneVerified',
        'catchAccount',
      ],
    },
    'respondentUid': <String, Object?>{
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
    'identity': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'displayName',
        'email',
        'phoneE164',
        'searchName',
        'origin',
      ],
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'email': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'format': 'email',
          'maxLength': 320,
        },
        'phoneE164': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'pattern': '^\\+[1-9][0-9]{7,14}\$',
        },
        'searchName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 160,
        },
        'origin': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'anonymous',
            'respondentGranted',
            'organizerAcquired',
          ],
        },
      },
    },
    'withdrawalTokenHash': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[a-f0-9]{64}\$',
    },
    'answers': <String, Object?>{
      'type': 'object',
      'maxProperties': 4000,
      'propertyNames': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
      'additionalProperties': <String, Object?>{
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
    },
    'answerSnapshots': <String, Object?>{
      'type': 'array',
      'maxItems': 4000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'key',
          'label',
          'kind',
          'answer',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'key': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 80,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
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
          'answer': <String, Object?>{
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
        },
      },
    },
    'consentVersion': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'sourceLinkId': <String, Object?>{
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
    'completionMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 604800000,
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
    'withdrawnAt': <String, Object?>{
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
  'x-firestore-collection': 'organizerFormResponses',
  'x-firestore-path': 'organizerFormResponses/{responseId}',
  'x-document-id-field': 'responseId',
  'x-owner': 'organizer form submission callable',
};
