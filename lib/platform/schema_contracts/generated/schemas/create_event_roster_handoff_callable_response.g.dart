// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_event_roster_handoff_response.schema.json.

const schemaCreateEventRosterHandoffCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_event_roster_handoff_response.schema.json',
  'title': 'CreateEventRosterHandoffCallableResponse',
  'description': 'Provider-aware forwarding instructions for one event roster.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'expiresAtMillis',
    'emailStatus',
    'emailAlias',
    'whatsappStatus',
    'whatsappNumber',
    'whatsappMessage',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'emailStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'available',
        'providerSetupRequired',
      ],
    },
    'emailAlias': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'format': 'email',
          'maxLength': 320,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'whatsappStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'available',
        'providerSetupRequired',
      ],
    },
    'whatsappNumber': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^\\+[1-9][0-9]{6,14}\$',
    },
    'whatsappMessage': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 20,
      'maxLength': 160,
    },
  },
};
