// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/configure_event_registration_response.schema.json.

const schemaConfigureEventRegistrationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/configure_event_registration_response.schema.json',
  'title': 'ConfigureEventRegistrationCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'registrationRevision',
    'mode',
    'replayed',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'registrationRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'mode': <String, Object?>{
      'enum': <Object?>[
        'closed',
        'free',
        'paid',
      ],
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
