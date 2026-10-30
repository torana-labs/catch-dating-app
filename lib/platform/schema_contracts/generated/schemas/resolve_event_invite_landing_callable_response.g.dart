// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/resolve_event_invite_landing_response.schema.json.

const schemaResolveEventInviteLandingCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/resolve_event_invite_landing_response.schema.json',
  'title': 'ResolveEventInviteLandingCallableResponse',
  'description': 'Bounded details and handoff for a valid opaque event invitation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'title',
    'startTimeMillis',
    'endTimeMillis',
    'locationName',
    'destinationKind',
    'destinationUrl',
    'sourceLabel',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'startTimeMillis': <String, Object?>{
      'type': 'integer',
    },
    'endTimeMillis': <String, Object?>{
      'type': 'integer',
    },
    'locationName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
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
    'destinationUrl': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 2048,
    },
    'paidBookingAvailable': <String, Object?>{
      'type': 'boolean',
    },
    'registrationMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'closed',
        'free',
        'paid',
      ],
    },
    'sourceLabel': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
    },
  },
};
