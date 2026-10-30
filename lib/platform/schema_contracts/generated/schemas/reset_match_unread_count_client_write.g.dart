// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from client_writes/reset_match_unread_count.schema.json.

const schemaResetMatchUnreadCountClientWriteSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/client_writes/reset_match_unread_count.schema.json',
  'title': 'ResetMatchUnreadCountClientWrite',
  'description': 'Client-owned Firestore update operation for a participant resetting only their own unread counter on matches/{matchId}.',
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
      ],
      'properties': <String, Object?>{
        'matchId': <String, Object?>{
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
        'unreadCounts',
      ],
      'properties': <String, Object?>{
        'unreadCounts': <String, Object?>{
          'type': 'object',
          'additionalProperties': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'minProperties': 1,
          'maxProperties': 1,
        },
      },
    },
  },
  'x-firestore-operation': 'update',
  'x-firestore-path': 'matches/{matchId}',
  'x-owner': 'active match participant direct unread reset',
};
