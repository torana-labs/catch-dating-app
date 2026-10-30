// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from client_writes/create_chat_message.schema.json.

const schemaCreateChatMessageClientWriteSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/client_writes/create_chat_message.schema.json',
  'title': 'CreateChatMessageClientWrite',
  'description': 'Client-owned Firestore create operation for matches/{matchId}/messages/{messageId}.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'path',
    'data',
  ],
  'properties': <String, Object?>{
    'path': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'matchId',
        'messageId',
      ],
      'properties': <String, Object?>{
        'matchId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'messageId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
      },
    },
    'data': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'senderId',
        'text',
        'sentAt',
      ],
      'properties': <String, Object?>{
        'senderId': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        'text': <String, Object?>{
          'type': 'string',
          'maxLength': 2000,
        },
        'imageUrl': <String, Object?>{
          'anyOf': <Object?>[
            <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
            <String, Object?>{
              'type': 'null',
            },
          ],
        },
        'sentAt': <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
      },
      'anyOf': <Object?>[
        <String, Object?>{
          'properties': <String, Object?>{
            'text': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 2000,
            },
          },
        },
        <String, Object?>{
          'required': <Object?>[
            'imageUrl',
          ],
          'properties': <String, Object?>{
            'imageUrl': <String, Object?>{
              'type': 'string',
              'format': 'uri',
              'maxLength': 2048,
            },
          },
        },
      ],
    },
  },
  'x-firestore-operation': 'create',
  'x-firestore-path': 'matches/{matchId}/messages/{messageId}',
  'x-owner': 'active match participant direct create; moderation and preview fan-out are trigger-owned',
};
