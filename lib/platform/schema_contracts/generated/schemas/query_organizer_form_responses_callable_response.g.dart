// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/query_organizer_form_responses_response.schema.json.

const schemaQueryOrganizerFormResponsesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/query_organizer_form_responses_response.schema.json',
  'title': 'QueryOrganizerFormResponsesCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'form',
    'fieldCatalog',
    'items',
    'total',
    'nextCursor',
    'selectedIds',
    'queryHash',
    'resultHash',
  ],
  'properties': <String, Object?>{
    'form': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'formId',
        'title',
        'versionId',
        'version',
      ],
      'properties': <String, Object?>{
        'formId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{1,128}\$',
        },
        'title': <String, Object?>{
          'type': 'string',
        },
        'versionId': <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Za-z0-9_-]{1,128}\$',
        },
        'version': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
      },
    },
    'fieldCatalog': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'label',
          'kind',
          'operators',
          'sortable',
          'options',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{1,128}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
          },
          'kind': <String, Object?>{
            'type': 'string',
          },
          'operators': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'string',
            },
          },
          'sortable': <String, Object?>{
            'type': 'boolean',
          },
          'options': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'value',
                'label',
              ],
              'properties': <String, Object?>{
                'value': <String, Object?>{
                  'type': 'string',
                },
                'label': <String, Object?>{
                  'type': 'string',
                },
              },
            },
          },
        },
      },
    },
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'responseId',
          'formId',
          'formTitle',
          'versionId',
          'version',
          'status',
          'identityKind',
          'identity',
          'sourceLinkId',
          'submittedAtMillis',
          'withdrawnAtMillis',
        ],
        'properties': <String, Object?>{
          'responseId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{1,128}\$',
          },
          'formId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{1,128}\$',
          },
          'formTitle': <String, Object?>{
            'type': 'string',
          },
          'versionId': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{1,128}\$',
          },
          'version': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
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
          'identity': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'displayName',
              'email',
              'phoneE164',
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
          'sourceLinkId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'submittedAtMillis': <String, Object?>{
            'type': 'integer',
          },
          'withdrawnAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
          },
        },
      },
    },
    'total': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 5000,
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
    'selectedIds': <String, Object?>{
      'type': 'array',
      'maxItems': 5000,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^[A-Za-z0-9_-]{1,128}\$',
      },
    },
    'queryHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'resultHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
  },
};
