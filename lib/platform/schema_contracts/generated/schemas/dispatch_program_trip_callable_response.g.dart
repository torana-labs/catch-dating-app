// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/dispatch_program_trip_response.schema.json.

const schemaDispatchProgramTripCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/dispatch_program_trip_response.schema.json',
  'title': 'DispatchProgramTripCallableResponse',
  'description': 'Committed dispatch result; an exact replay returns the original trip id and revision.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'tripId',
    'revision',
    'alreadyApplied',
    'passengerCount',
  ],
  'properties': <String, Object?>{
    'tripId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
    },
    'passengerCount': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 200,
    },
  },
};
