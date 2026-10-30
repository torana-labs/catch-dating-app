// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_event_invite_link_payload.schema.json.

const schemaCreateEventInviteLinkCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_event_invite_link_payload.schema.json',
  'title': 'CreateEventInviteLinkCallablePayload',
  'description': 'Callable payload accepted by createEventInviteLink for Host channels, direct recipients, partners, promoters, or eligible attendee referrers.',
  'x-callable-aliases': <Object?>[
    'createEventInviteLink',
    'createAttendeeInviteLink',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'label',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
    'source': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
    },
    'linkKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hostChannel',
        'directRecipient',
        'attendeeReferrer',
        'promoter',
        'partner',
      ],
    },
    'intendedRecipientContactId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'campaignId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchEvent',
        'eventRuntime',
        'externalBooking',
        'marketingLanding',
      ],
    },
    'attributionWindowDays': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 90,
    },
  },
};
