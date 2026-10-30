// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_organizer_form_automation_runs_response.schema.json.

const schemaListOrganizerFormAutomationRunsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_organizer_form_automation_runs_response.schema.json',
  'title': 'ListOrganizerFormAutomationRunsCallableResponse',
  'description': 'Form automation definitions and bounded observable run history.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'rules',
    'runs',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'rules': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'ruleId',
          'organizerId',
          'formId',
          'name',
          'enabled',
          'revision',
          'trigger',
          'condition',
          'actions',
          'updatedAtMillis',
        ],
        'properties': <String, Object?>{
          'ruleId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
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
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'enabled': <String, Object?>{
            'type': 'boolean',
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'trigger': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'responseSubmitted',
              'responseWithdrawn',
              'answerMatches',
              'applicationAccepted',
              'eventAttended',
            ],
          },
          'condition': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'questionId',
                  'operator',
                  'expectedValues',
                ],
                'properties': <String, Object?>{
                  'questionId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 180,
                  },
                  'operator': <String, Object?>{
                    'type': 'string',
                    'enum': <Object?>[
                      'equals',
                      'notEquals',
                      'contains',
                      'notContains',
                      'greaterThan',
                      'lessThan',
                      'answered',
                      'notAnswered',
                    ],
                  },
                  'expectedValues': <String, Object?>{
                    'type': 'array',
                    'maxItems': 20,
                    'items': <String, Object?>{
                      'type': <Object?>[
                        'string',
                        'number',
                        'boolean',
                      ],
                    },
                  },
                },
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'actions': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 10,
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'actionId',
                'kind',
                'tagId',
                'eventId',
                'webhookUrl',
                'webhookSecretConfigured',
                'channel',
              ],
              'properties': <String, Object?>{
                'actionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'kind': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'notifyTeam',
                    'addOrganizerTag',
                    'createCrmContact',
                    'addApplicationQueue',
                    'proposeEventAttendee',
                    'signedWebhook',
                    'campaignHandoff',
                  ],
                },
                'tagId': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 80,
                },
                'eventId': <String, Object?>{
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
                'webhookUrl': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'format': 'uri',
                  'maxLength': 2000,
                },
                'webhookSecretConfigured': <String, Object?>{
                  'type': 'boolean',
                },
                'channel': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'enum': <Object?>[
                    null,
                    'whatsapp',
                    'email',
                  ],
                },
                'campaignId': <String, Object?>{
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
                'campaignRevision': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 9007199254740991,
                },
              },
            },
          },
          'updatedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'triggerEventId': <String, Object?>{
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
          'delayMinutes': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 10080,
          },
        },
      },
    },
    'runs': <String, Object?>{
      'type': 'array',
      'maxItems': 100,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'runId',
          'ruleId',
          'ruleRevision',
          'responseId',
          'eventKind',
          'status',
          'attemptCount',
          'actionResults',
          'errorMessage',
          'createdAtMillis',
          'completedAtMillis',
        ],
        'properties': <String, Object?>{
          'runId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'ruleId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'ruleRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'responseId': <String, Object?>{
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
          'eventKind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'submitted',
              'withdrawn',
              'applicationAccepted',
              'eventAttended',
            ],
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'pending',
              'running',
              'succeeded',
              'partiallyFailed',
              'failed',
              'skipped',
            ],
          },
          'attemptCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100,
          },
          'actionResults': <String, Object?>{
            'type': 'array',
            'maxItems': 10,
            'items': <String, Object?>{
              'type': 'object',
            },
          },
          'errorMessage': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
          'createdAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'completedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
          'sourceId': <String, Object?>{
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
          'dueAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 1000,
    },
  },
};
