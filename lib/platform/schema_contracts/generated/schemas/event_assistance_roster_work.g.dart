// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_roster_work.schema.json.

const schemaEventAssistanceRosterWorkSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/event_assistance_roster_work.schema.json',
  'title': 'EventAssistanceRosterWork',
  'description': 'Private resumable roster enrollment bound to current manager runtime permission. Enrollment never infers attendance or sends messages.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'kind',
    'signalId',
    'source',
    'scope',
    'expiresAt',
    'checkpoint',
    'runtimeBinding',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'type': 'integer',
    },
    'kind': <String, Object?>{
      'const': 'liveRosterEnrollment',
      'type': 'string',
    },
    'signalId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'source': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'eventId',
        'collection',
        'documentId',
        'occurredAt',
      ],
      'properties': <String, Object?>{
        'eventId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'collection': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'eventAttendees',
            'eventAssistanceGuests',
            'eventAssistanceRuntimeConfigs',
          ],
        },
        'documentId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'occurredAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
    'scope': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'context',
        'attendeeId',
      ],
      'properties': <String, Object?>{
        'context': <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'mode',
            'eventId',
            'organizerId',
          ],
          'properties': <String, Object?>{
            'mode': <String, Object?>{
              'type': 'string',
              'const': 'live',
            },
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'organizerId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        'attendeeId': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
      },
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'checkpoint': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'phase',
        'cursor',
        'visited',
        'dueAt',
        'failures',
        'retries',
        'stopReason',
      ],
      'properties': <String, Object?>{
        'phase': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'scan',
            'retry',
            'complete',
            'review',
            'expired',
            'stopped',
          ],
        },
        'cursor': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'visited': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 10000,
        },
        'dueAt': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 9007199254740991,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'failures': <String, Object?>{
          'type': 'array',
          'maxItems': 100,
          'items': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'attendeeId',
              'reason',
            ],
            'properties': <String, Object?>{
              'reason': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'busy',
                  'unavailable',
                ],
              },
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
            },
          },
        },
        'retries': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 5,
        },
        'stopReason': <String, Object?>{
          'enum': <Object?>[
            null,
            'missing',
            'paused',
            'configurationChanged',
            'sourceChanged',
            'expired',
            'eventClosed',
          ],
        },
      },
    },
    'runtimeBinding': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'runtimeId',
        'revision',
      ],
      'properties': <String, Object?>{
        'runtimeId': <String, Object?>{
          'type': 'string',
          'pattern': '^runtime:lateJoin:[a-f0-9]{64}\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
  },
};
