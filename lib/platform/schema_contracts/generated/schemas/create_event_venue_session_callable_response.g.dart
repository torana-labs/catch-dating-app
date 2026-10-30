// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/create_event_venue_session_response.schema.json.

const schemaCreateEventVenueSessionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/create_event_venue_session_response.schema.json',
  'title': 'CreateEventVenueSessionCallableResponse',
  'description': 'Short-lived signed venue session returned only to an authorized Host manager.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'venueSessionToken',
    'expiresAtMillis',
    'refreshAfterMillis',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'venueSessionToken': <String, Object?>{
      'type': 'string',
      'minLength': 64,
      'maxLength': 2048,
    },
    'expiresAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'refreshAfterMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
  },
};
