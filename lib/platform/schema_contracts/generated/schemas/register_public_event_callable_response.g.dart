// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/register_public_event_response.schema.json.

const schemaRegisterPublicEventCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/register_public_event_response.schema.json',
  'title': 'RegisterPublicEventCallableResponse',
  'description': 'Registration receipt returned to the phone-authenticated website visitor.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'attendeeId',
    'status',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'registered',
        'waitlisted',
        'alreadyRegistered',
      ],
    },
  },
};
