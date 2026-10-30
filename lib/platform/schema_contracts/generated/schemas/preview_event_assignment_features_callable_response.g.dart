// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/preview_event_assignment_features_response.schema.json.

const schemaPreviewEventAssignmentFeaturesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/preview_event_assignment_features_response.schema.json',
  'title': 'PreviewEventAssignmentFeaturesCallableResponse',
  'description': 'No answer values or participant identities: current roster coverage for an unsaved mapping.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'revision',
    'rosterCount',
    'coverageBasis',
    'rows',
    'sources',
    'savedRules',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'rosterCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 1000,
    },
    'coverageBasis': <String, Object?>{
      'const': 'currentEventRoster',
    },
    'savedRules': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'featureId',
          'formId',
          'versionId',
          'questionId',
          'transformVersion',
          'kind',
          'mode',
          'weight',
        ],
        'properties': <String, Object?>{
          'featureId': <String, Object?>{
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
          'questionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'transformVersion': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 1000000,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'category',
              'set',
              'number',
              'ordinal',
            ],
          },
          'mode': <String, Object?>{
            'enum': <Object?>[
              'preferSimilar',
              'preferDifferent',
              'balanceAcrossGroups',
            ],
          },
          'weight': <String, Object?>{
            'type': 'number',
            'minimum': 0,
            'maximum': 100,
          },
          'optionIds': <String, Object?>{
            'type': 'array',
            'maxItems': 40,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'scoreByOptionId': <String, Object?>{
            'type': 'object',
            'maxProperties': 40,
            'propertyNames': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'additionalProperties': <String, Object?>{
              'type': 'number',
            },
          },
          'minimum': <String, Object?>{
            'type': 'number',
          },
          'maximum': <String, Object?>{
            'type': 'number',
          },
        },
      },
    },
    'sources': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'formId',
          'formTitle',
          'versionId',
          'isActiveVersion',
          'questions',
        ],
        'properties': <String, Object?>{
          'formId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'formTitle': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
          },
          'versionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'isActiveVersion': <String, Object?>{
            'type': 'boolean',
          },
          'questions': <String, Object?>{
            'type': 'array',
            'maxItems': 100,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'questionId',
                'label',
                'kind',
                'options',
                'minNumber',
                'maxNumber',
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
                  'enum': <Object?>[
                    'singleChoice',
                    'multiChoice',
                    'number',
                  ],
                },
                'minNumber': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                },
                'maxNumber': <String, Object?>{
                  'type': <Object?>[
                    'number',
                    'null',
                  ],
                },
                'options': <String, Object?>{
                  'type': 'array',
                  'maxItems': 40,
                  'items': <String, Object?>{
                    'type': 'object',
                    'additionalProperties': false,
                    'required': <Object?>[
                      'optionId',
                      'label',
                    ],
                    'properties': <String, Object?>{
                      'optionId': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 180,
                      },
                      'label': <String, Object?>{
                        'type': 'string',
                        'minLength': 1,
                        'maxLength': 160,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'featureId',
          'kind',
          'mode',
          'weight',
          'grantedCount',
          'usableCount',
          'missingCount',
        ],
        'properties': <String, Object?>{
          'featureId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'kind': <String, Object?>{
            'enum': <Object?>[
              'category',
              'set',
              'number',
              'ordinal',
            ],
          },
          'mode': <String, Object?>{
            'enum': <Object?>[
              'preferSimilar',
              'preferDifferent',
              'balanceAcrossGroups',
            ],
          },
          'weight': <String, Object?>{
            'type': 'number',
            'minimum': 0,
            'maximum': 100,
          },
          'grantedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000,
          },
          'usableCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000,
          },
          'missingCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000,
          },
        },
      },
    },
  },
};
