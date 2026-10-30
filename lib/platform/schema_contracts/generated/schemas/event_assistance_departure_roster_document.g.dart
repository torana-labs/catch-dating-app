// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_assistance_departure_rosters.schema.json.

const schemaEventAssistanceDepartureRosterDocumentSchema = <String, Object?>{
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'rosterId',
    'context',
    'groupId',
    'progressId',
    'progressRevision',
    'sourceHash',
    'confirmedBy',
    'confirmedAt',
    'members',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'rosterId': <String, Object?>{
      'type': 'string',
      'pattern': '^departure-roster:[a-f0-9]{64}\$',
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
    'groupId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 160,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
    },
    'progressId': <String, Object?>{
      'type': 'string',
      'pattern': '^progress:[a-f0-9]{64}\$',
    },
    'progressRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'sourceHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'confirmedBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 2000,
    },
    'confirmedAt': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'members': <String, Object?>{
      'type': 'array',
      'maxItems': 1000,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'attendeeId',
          'sourceGeneration',
          'attendeeGeneration',
          'checkInHash',
          'episodeId',
          'membershipHash',
        ],
        'properties': <String, Object?>{
          'attendeeId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 160,
            'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
          },
          'sourceGeneration': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'attendeeGeneration': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'checkInHash': <String, Object?>{
            'type': 'string',
            'pattern': '^[a-f0-9]{64}\$',
          },
          'episodeId': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'minLength': 1,
                'maxLength': 160,
                'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
          'membershipHash': <String, Object?>{
            'anyOf': <Object?>[
              <String, Object?>{
                'type': 'string',
                'pattern': '^[a-f0-9]{64}\$',
              },
              <String, Object?>{
                'type': 'null',
              },
            ],
          },
        },
      },
    },
    'destination': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'placeId',
            'lateEntry',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'fixedPlace',
            },
            'placeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'lateEntry': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'allowed',
                'hostDecision',
                'closed',
              ],
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'itineraryId',
            'stopId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'itineraryStop',
            },
            'itineraryId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'stopId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'kind',
            'routeId',
            'groupId',
            'checkpointId',
          ],
          'properties': <String, Object?>{
            'kind': <String, Object?>{
              'type': 'string',
              'const': 'groupCheckpoint',
            },
            'routeId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
            'groupId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 160,
              'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]*\$',
            },
            'checkpointId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
      ],
    },
    'checkpointRequest': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'responsibleOperatorId',
        'dueAt',
      ],
      'properties': <String, Object?>{
        'responsibleOperatorId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 128,
          'pattern': '^[^/]+\$',
        },
        'dueAt': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
      },
    },
  },
  'title': 'EventAssistanceDepartureRosterDocument',
  'x-firestore-collection': 'eventAssistanceDepartureRosters',
  'x-firestore-path': 'eventAssistanceDepartureRosters/{rosterId}',
  'x-document-id-field': 'rosterId',
  'x-owner': 'event-assistance departure command',
};
