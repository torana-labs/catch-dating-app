// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_event_chat_participants_response.schema.json.

const schemaListEventChatParticipantsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/list_event_chat_participants_response.schema.json',
  'title': 'ListEventChatParticipantsCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'items',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'items': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'uid',
          'displayName',
          'role',
          'membershipStatus',
          'membershipRevision',
        ],
        'properties': <String, Object?>{
          'uid': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 120,
          },
          'role': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'host',
              'attendee',
            ],
          },
          'membershipStatus': <String, Object?>{
            'enum': <Object?>[
              'joined',
              'removed',
              'banned',
            ],
          },
          'membershipRevision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'nextCursor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'eventId',
            'accountUid',
            'after',
          ],
          'properties': <String, Object?>{
            'eventId': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'accountUid': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'after': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
};
