// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_organizer_form_automation_payload.schema.json.

const schemaCreateOrganizerFormAutomationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_organizer_form_automation_payload.schema.json',
  'title': 'CreateOrganizerFormAutomationCallablePayload',
  'description': 'Creates or replaces an explicit form automation under an optimistic revision guard.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'formId',
    'ruleId',
    'requestId',
    'expectedRevision',
    'name',
    'enabled',
    'trigger',
    'condition',
    'actions',
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
    'ruleId': <String, Object?>{
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 128,
    },
    'expectedRevision': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
    },
    'enabled': <String, Object?>{
      'type': 'boolean',
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
          'webhookSecret',
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
          'webhookSecret': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 32,
            'maxLength': 128,
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
};
