// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/record_program_function_rsvp_payload.schema.json.

const schemaRecordProgramFunctionRsvpCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/record_program_function_rsvp_payload.schema.json',
  'title': 'RecordProgramFunctionRsvpCallablePayload',
  'description': 'Staff-recorded RSVP for one guest on one program function. The server derives the program-level guest rollup and function counters; last response wins per join key.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'functionId',
    'guestId',
    'rsvpStatus',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'functionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'guestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'rsvpStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'attending',
        'declined',
        'maybe',
      ],
    },
    'partySize': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 20,
      'description': 'Attending party size; null reads as 1.',
    },
    'responseNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'allowUninvited': <String, Object?>{
      'type': 'boolean',
      'description': 'Record a response for a selectedGuests function the guest was not invited to; the row lands invited:true.',
    },
  },
};
