// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/program_trip_action_payload.schema.json.

const schemaProgramTripActionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/program_trip_action_payload.schema.json',
  'title': 'ProgramTripActionCallablePayload',
  'description': 'Post-dispatch trip lifecycle payload shared by markProgramTripArrived and voidProgramTrip; the callable name carries the action.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'markProgramTripArrived',
    'voidProgramTrip',
  ],
  'required': <Object?>[
    'programId',
    'tripId',
    'expectedRevision',
    'clientOperationId',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'tripId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'reason': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 280,
      'description': 'Required for voidProgramTrip; recorded on the trip for reconciliation review.',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
  },
};
