// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/submit_event_rehearsal_guest_action_payload.schema.json.

const schemaSubmitEventRehearsalGuestActionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/submit_event_rehearsal_guest_action_payload.schema.json',
  'title': 'SubmitEventRehearsalGuestActionCallablePayload',
  'description': 'Applies a bounded action from an anonymous rehearsal guest slot.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'publicRehearsalId',
    'slotToken',
    'clientActionId',
    'action',
  ],
  'properties': <String, Object?>{
    'publicRehearsalId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,80}\$',
    },
    'slotToken': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{20,180}\$',
    },
    'clientActionId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{8,120}\$',
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'checkIn',
        'confirmArrival',
        'optOut',
        'optIn',
        'askForHelp',
        'completePrompt',
        'submitRequiredData',
        'respondToAssistance',
      ],
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'pattern': '^outbox:[a-f0-9]{64}\$',
    },
    'intentRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000,
    },
    'choiceId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
    },
    'requiredData': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'fieldIds',
        'expectedProfileRevision',
        'expectedRequestRevision',
        'expectedSourceHash',
      ],
      'properties': <String, Object?>{
        'fieldIds': <String, Object?>{
          'type': 'array',
          'uniqueItems': true,
          'minItems': 1,
          'maxItems': 10,
          'items': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'displayName',
              'gender',
              'interestedInGenders',
              'relationshipGoal',
              'dateOfBirth',
              'paceBand',
              'skillBand',
              'dietaryAndSeatingNotes',
              'questionnaireAnswerIds',
              'teamName',
            ],
          },
        },
        'expectedProfileRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'expectedRequestRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'expectedSourceHash': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-f0-9]{64}\$',
        },
      },
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'respondToAssistance',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'messageId',
          'intentRevision',
          'choiceId',
        ],
        'not': <String, Object?>{
          'required': <Object?>[
            'requiredData',
          ],
        },
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'required': <Object?>[
                'messageId',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'intentRevision',
              ],
            },
            <String, Object?>{
              'required': <Object?>[
                'choiceId',
              ],
            },
          ],
        },
      },
    },
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'action': <String, Object?>{
            'const': 'submitRequiredData',
          },
        },
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'requiredData',
        ],
      },
      'else': <String, Object?>{
        'not': <String, Object?>{
          'required': <Object?>[
            'requiredData',
          ],
        },
      },
    },
  ],
};
