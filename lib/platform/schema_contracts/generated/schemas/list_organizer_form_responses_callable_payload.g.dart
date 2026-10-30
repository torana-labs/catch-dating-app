// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_organizer_form_responses_payload.schema.json.

const schemaListOrganizerFormResponsesCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_organizer_form_responses_payload.schema.json',
  'title': 'ListOrganizerFormResponsesCallablePayload',
  'description': 'Manager-authorized bounded response inbox query.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'statuses',
    'identityKinds',
    'sourceLinkId',
    'query',
    'fromMillis',
    'toMillis',
    'cursor',
    'limit',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'formId': <String, Object?>{
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
    'versionId': <String, Object?>{
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
    'statuses': <String, Object?>{
      'type': 'array',
      'maxItems': 2,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'submitted',
          'withdrawn',
        ],
      },
    },
    'identityKinds': <String, Object?>{
      'type': 'array',
      'maxItems': 4,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'anonymous',
          'emailVerified',
          'phoneVerified',
          'catchAccount',
        ],
      },
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
    'query': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 160,
    },
    'fromMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'toMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'cursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'sortDirection': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'asc',
        'desc',
      ],
    },
    'answerFilters': <String, Object?>{
      'type': 'array',
      'maxItems': 5,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'values',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'values': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 20,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 200,
            },
          },
        },
      },
    },
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
    'includeApplications': <String, Object?>{
      'type': 'boolean',
      'description': 'Opt into the unified response and application review inbox.',
    },
    'reviewStatus': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
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
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'contactId': <String, Object?>{
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
};
