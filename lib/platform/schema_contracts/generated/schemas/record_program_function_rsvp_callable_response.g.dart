// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/record_program_function_rsvp_response.schema.json.

const schemaRecordProgramFunctionRsvpCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/record_program_function_rsvp_response.schema.json',
  'title': 'RecordProgramFunctionRsvpCallableResponse',
  'description': 'Acknowledgement for a recorded function RSVP: the join-key row id, its revision, and the guest\'s derived program-level RSVP rollup.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'recordProgramFunctionRsvp',
  ],
  'required': <Object?>[
    'entityId',
    'revision',
    'guestRsvpStatus',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'entityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'The programFunctionGuests join-key document id.',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'guestRsvpStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'attending',
        'declined',
        'maybe',
      ],
      'description': 'Derived programGuests.rsvpStatus rollup after this response.',
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
      'description': 'True when an exact replay returned the original result.',
    },
  },
};
