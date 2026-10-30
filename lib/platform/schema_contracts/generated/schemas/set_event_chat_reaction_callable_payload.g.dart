// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_event_chat_reaction_payload.schema.json.

const schemaSetEventChatReactionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_event_chat_reaction_payload.schema.json',
  'title': 'SetEventChatReactionCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'messageId',
    'requestId',
    'reaction',
    'expectedRevision',
    'expectedUid',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'reaction': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'like',
            'love',
            'laugh',
            'wow',
            'sad',
            'thanks',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'expectedUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
