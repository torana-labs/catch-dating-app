// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/get_event_chat_access_response.schema.json.

const schemaGetEventChatAccessCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/get_event_chat_access_response.schema.json',
  'title': 'GetEventChatAccessCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'organizerId',
    'title',
    'role',
    'room',
    'membership',
    'canManage',
    'canJoin',
    'canReadMessages',
    'canPostMessages',
    'profileClaimRequired',
    'termsVersion',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'title': <String, Object?>{
      'type': 'string',
      'maxLength': 200,
    },
    'role': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'host',
        'attendee',
      ],
    },
    'room': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'revision',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notCreated',
            'scheduled',
            'open',
            'announcementsOnly',
            'paused',
            'closed',
            'archived',
          ],
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'opensAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
        'closesAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
        },
      },
    },
    'membership': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'status',
        'revision',
      ],
      'properties': <String, Object?>{
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'notJoined',
            'joined',
            'left',
            'removed',
            'banned',
          ],
        },
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 9007199254740991,
        },
        'notificationsMuted': <String, Object?>{
          'type': 'boolean',
        },
      },
    },
    'canManage': <String, Object?>{
      'type': 'boolean',
    },
    'canJoin': <String, Object?>{
      'type': 'boolean',
    },
    'canReadMessages': <String, Object?>{
      'type': 'boolean',
    },
    'canPostMessages': <String, Object?>{
      'type': 'boolean',
    },
    'profileClaimRequired': <String, Object?>{
      'type': 'boolean',
    },
    'termsVersion': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'event-chat-v1',
      ],
    },
  },
};
