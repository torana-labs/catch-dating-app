// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/list_event_rcs_preferences_response.schema.json.

const schemaListEventRcsPreferencesCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  'type': 'object',
  'additionalProperties': false,
  '\$id': 'https://catch.app/contracts/callable_responses/list_event_rcs_preferences_response.schema.json',
  'title': 'ListEventRcsPreferencesCallableResponse',
  'required': <Object?>[
    'eventId',
    'attendeeId',
    'serverTime',
    'configuredSenderId',
    'previousSenderIds',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
    },
    'serverTime': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'configuredSenderId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
    },
    'previousSenderIds': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}\$',
      },
    },
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'pattern': '^rcs-permission:[a-f0-9]{64}\$',
    },
  },
};
