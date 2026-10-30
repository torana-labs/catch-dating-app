// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/start_club_host_conversation_payload.schema.json.

const schemaStartClubHostConversationCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/start_club_host_conversation_payload.schema.json',
  'title': 'StartClubHostConversationCallablePayload',
  'description': 'Callable payload accepted by startClubHostConversation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'clubId',
    'hostUid',
  ],
  'properties': <String, Object?>{
    'clubId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'hostUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
