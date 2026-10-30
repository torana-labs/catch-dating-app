// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/manage_event_chat_member_payload.schema.json.

const schemaManageEventChatMemberCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/manage_event_chat_member_payload.schema.json',
  'title': 'ManageEventChatMemberCallablePayload',
  'description': 'Organizer manager removes, bans or explicitly reinstates a room member. Reinstatement never joins on the participant\'s behalf.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'targetUid',
    'action',
    'expectedRevision',
    'requestId',
    'expectedUid',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'targetUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'action': <String, Object?>{
      'enum': <Object?>[
        'remove',
        'ban',
        'reinstate',
      ],
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expectedUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
