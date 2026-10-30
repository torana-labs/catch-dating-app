// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/record_event_invite_link_open_payload.schema.json.

const schemaRecordEventInviteLinkOpenCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/record_event_invite_link_open_payload.schema.json',
  'title': 'RecordEventInviteLinkOpenCallablePayload',
  'description': 'Callable payload accepted by recordEventInviteLinkOpen. inviteLinkId accepts a legacy document id or a versioned opaque bearer token.',
  'x-callable-aliases': <Object?>[
    'recordEventInviteLinkOpen',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'inviteLinkId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteLinkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'surface': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'consumerApp',
        'hostApp',
        'runtimeWeb',
        'marketingWeb',
        'unknown',
      ],
    },
    'sessionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 8,
      'maxLength': 128,
    },
  },
};
