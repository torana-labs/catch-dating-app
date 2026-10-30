// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from operations/event_assistance_operational_notice_fanout.schema.json.

const schemaEventAssistanceOperationalNoticeFanoutSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/operations/event_assistance_operational_notice_fanout.schema.json',
  'title': 'EventAssistanceOperationalNoticeFanout',
  'description': 'Private bounded attendee fanout for one trusted plan-change or post-event source. The work binds a reviewed policy revision and grants no provider authority by itself.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'kind',
    'signalId',
    'context',
    'source',
    'policyBinding',
    'expiresAt',
    'checkpoint',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'const': 'operationalNoticeFanout',
    },
    'signalId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
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
    'source': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'kind',
        'sourceId',
        'revision',
        'occurredAt',
        'validUntil',
      ],
      'properties': <String, Object?>{
        'kind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'planChange',
            'followUp',
          ],
        },
        'sourceId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'occurredAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'validUntil': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    'policyBinding': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'groupId',
        'workflowKind',
        'settingId',
        'settingRevision',
      ],
      'properties': <String, Object?>{
        'groupId': <String, Object?>{
          'type': 'string',
          'const': 'event:whole',
        },
        'workflowKind': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'planChangeCommunication',
            'postEventFollowUp',
          ],
        },
        'settingId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
          'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
        },
        'settingRevision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
      },
    },
    'expiresAt': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'checkpoint': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'phase',
        'cursor',
        'visited',
        'published',
        'skipped',
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
        'published': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 10000,
        },
        'skipped': <String, Object?>{
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
              'attendeeId': <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 180,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              'reason': <String, Object?>{
                'type': 'string',
                'enum': <Object?>[
                  'unavailable',
                ],
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
            'policyUnavailable',
            'policyChanged',
            'sourceChanged',
          ],
        },
      },
    },
  },
};
