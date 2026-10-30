// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/submit_event_assistance_guest_choice_response.schema.json.

const schemaSubmitEventAssistanceGuestChoiceCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/submit_event_assistance_guest_choice_response.schema.json',
  'title': 'SubmitEventAssistanceGuestChoiceCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'result',
    'view',
  ],
  'properties': <String, Object?>{
    'result': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'enum': <Object?>[
                'accepted',
                'replayed',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'reason',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'const': 'rejected',
            },
            'reason': <String, Object?>{
              'enum': <Object?>[
                'scopeMismatch',
                'staleIntent',
                'invalidChoice',
                'expired',
                'alreadyResponded',
                'noLongerNeeded',
                'factsStale',
                'guestStateChanged',
              ],
            },
          },
        },
      ],
    },
    'view': <String, Object?>{
      'oneOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'serverTime',
            'reason',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'const': 'unavailable',
            },
            'serverTime': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'reason': <String, Object?>{
              'enum': <Object?>[
                'expired',
                'eventClosed',
                'guestUnavailable',
                'noInstructions',
                'alreadyJoined',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'status',
            'serverTime',
            'eventTitle',
            'guestRevision',
            'intentId',
            'intentRevision',
            'instructionRevision',
            'title',
            'text',
            'expiresAt',
            'response',
            'choices',
          ],
          'properties': <String, Object?>{
            'status': <String, Object?>{
              'const': 'ready',
            },
            'serverTime': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'eventTitle': <String, Object?>{
              'type': 'string',
              'maxLength': 160,
            },
            'guestRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'intentId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'intentRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'instructionRevision': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'title': <String, Object?>{
              'type': 'string',
              'maxLength': 120,
            },
            'text': <String, Object?>{
              'type': 'string',
              'maxLength': 2000,
            },
            'expiresAt': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            'response': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'object',
                  'additionalProperties': false,
                  'required': <Object?>[
                    'label',
                    'receivedAt',
                  ],
                  'properties': <String, Object?>{
                    'label': <String, Object?>{
                      'type': 'string',
                      'maxLength': 80,
                    },
                    'receivedAt': <String, Object?>{
                      'type': 'integer',
                      'minimum': 0,
                      'maximum': 9007199254740991,
                    },
                  },
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'choices': <String, Object?>{
              'type': 'array',
              'maxItems': 20,
              'items': <String, Object?>{
                'type': 'object',
                'additionalProperties': false,
                'required': <Object?>[
                  'choiceId',
                  'label',
                ],
                'properties': <String, Object?>{
                  'choiceId': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 160,
                    'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
                  },
                  'label': <String, Object?>{
                    'type': 'string',
                    'minLength': 1,
                    'maxLength': 80,
                  },
                },
              },
            },
          },
        },
      ],
    },
  },
};
