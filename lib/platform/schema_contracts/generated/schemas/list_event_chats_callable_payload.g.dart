// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/list_event_chats_payload.schema.json.

const schemaListEventChatsCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/list_event_chats_payload.schema.json',
  'title': 'ListEventChatsCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'cursor',
    'limit',
  ],
  'properties': <String, Object?>{
    'cursor': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'source',
            'after',
            'accountUid',
          ],
          'properties': <String, Object?>{
            'source': <String, Object?>{
              'type': 'string',
              'enum': <Object?>[
                'memberships',
                'participations',
                'attendees',
              ],
            },
            'after': <String, Object?>{
              'anyOf': <Object?>[
                <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 1500,
                  'pattern': '^[^/]+\$',
                },
                <String, Object?>{
                  'type': 'null',
                },
              ],
            },
            'accountUid': <String, Object?>{
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
    'limit': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 10,
    },
  },
};
