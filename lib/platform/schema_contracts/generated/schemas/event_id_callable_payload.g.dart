// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/event_id_payload.schema.json.

const schemaEventIdCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/event_id_payload.schema.json',
  'title': 'EventIdCallablePayload',
  'description': 'Callable payload accepted by simple event actions that need only an eventId (plus optional inviteCode for invite-gated events).',
  'x-callable-aliases': <Object?>[
    'cancelEventSignUp',
    'deleteEvent',
    'fetchEventSuccessWingmanCandidates',
    'fetchSwipeCandidates',
    'generateEventSuccessPods',
    'generateEventSuccessRotations',
    'acceptEventWaitlistOffer',
    'declineEventWaitlistOffer',
    'joinEventWaitlist',
    'leaveEventWaitlist',
    'withdrawEventSuccessWingmanRequest',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'inviteCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 4,
      'maxLength': 64,
      'pattern': '^[A-Za-z0-9_-]+\$',
    },
    'inviteLinkId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
