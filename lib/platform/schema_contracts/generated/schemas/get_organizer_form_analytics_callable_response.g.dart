// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_organizer_form_analytics_response.schema.json.

const schemaGetOrganizerFormAnalyticsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_organizer_form_analytics_response.schema.json',
  'title': 'GetOrganizerFormAnalyticsCallableResponse',
  'description': 'Privacy-aware precomputed form funnel and compatible question aggregates.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'versionId',
    'version',
    'opens',
    'starts',
    'submissions',
    'withdrawals',
    'completionRate',
    'medianCompletionMillis',
    'questions',
    'sources',
    'privacyThreshold',
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
    'version': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
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
    'completionRate': <String, Object?>{
      'type': 'number',
      'minimum': 0,
      'maximum': 1,
    },
    'medianCompletionMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 604800000,
    },
    'questions': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'questionId',
          'label',
          'kind',
          'privacyClass',
          'responseCount',
          'choiceCounts',
          'numericCount',
          'numericSum',
          'numericMin',
          'numericMax',
        ],
        'properties': <String, Object?>{
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
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
          'privacyClass': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'contact',
              'profile',
              'sensitive',
              'organizerCustom',
            ],
          },
          'responseCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000000,
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
        },
      },
    },
    'sources': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'sourceLinkId',
          'label',
          'opens',
          'starts',
          'submissions',
        ],
        'properties': <String, Object?>{
          'sourceLinkId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 128,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
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
        },
      },
    },
    'privacyThreshold': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 100,
    },
  },
};
