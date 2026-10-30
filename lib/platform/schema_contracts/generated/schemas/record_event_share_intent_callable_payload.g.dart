// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/record_event_share_intent_payload.schema.json.

const schemaRecordEventShareIntentCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/record_event_share_intent_payload.schema.json',
  'title': 'RecordEventShareIntentCallablePayload',
  'description': 'Records that a signed-in actor opened a Catch share surface. It never claims a message was sent or forwarded.',
  'x-callable-aliases': <Object?>[
    'recordEventShareIntent',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'inviteLinkId',
    'surface',
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
        'hostApp',
        'consumerApp',
        'runtimeWeb',
      ],
    },
    'creativeId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'channelHint': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'systemShare',
        'copyLink',
        'whatsapp',
        'sms',
        'email',
        null,
      ],
    },
  },
};
