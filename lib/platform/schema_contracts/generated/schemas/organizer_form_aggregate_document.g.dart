// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_form_aggregates.schema.json.

const schemaOrganizerFormAggregateDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_form_aggregates.schema.json',
  'title': 'OrganizerFormAggregateDocument',
  'description': 'Precomputed form/version funnel or privacy-aware question aggregate.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'scope',
    'questionId',
    'questionLabel',
    'questionKind',
    'privacyClass',
    'opens',
    'starts',
    'submissions',
    'withdrawals',
    'completionMillisTotal',
    'completionBuckets',
    'choiceCounts',
    'numericCount',
    'numericSum',
    'numericMin',
    'numericMax',
    'updatedAt',
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
    'scope': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'version',
        'question',
      ],
    },
    'questionId': <String, Object?>{
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
    'questionLabel': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
    },
    'questionKind': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'privacyClass': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        null,
        'contact',
        'profile',
        'sensitive',
        'organizerCustom',
      ],
    },
    'opens': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'starts': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'submissions': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'withdrawals': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'completionMillisTotal': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'completionBuckets': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'upperBoundMillis',
          'count',
        ],
        'properties': <String, Object?>{
          'upperBoundMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 1000,
            'maximum': 604800000,
          },
          'count': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000000,
          },
        },
      },
    },
    'choiceCounts': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'value',
          'label',
          'count',
        ],
        'properties': <String, Object?>{
          'value': <String, Object?>{
            'type': <Object?>[
              'string',
              'boolean',
            ],
            'maxLength': 160,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'count': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000000,
          },
        },
      },
    },
    'numericCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000000000,
    },
    'numericSum': <String, Object?>{
      'type': 'number',
      'minimum': -1000000000000000000,
      'maximum': 1000000000000000000,
    },
    'numericMin': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
    },
    'numericMax': <String, Object?>{
      'type': <Object?>[
        'number',
        'null',
      ],
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
  'x-firestore-collection': 'organizerFormAggregates',
  'x-firestore-path': 'organizerFormAggregates/{aggregateId}',
  'x-document-id-field': 'aggregateId',
  'x-owner': 'organizer form aggregate projection',
};
