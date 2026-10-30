// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_mutation_response.schema.json.

const schemaProgramMutationCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_mutation_response.schema.json',
  'title': 'ProgramMutationCallableResponse',
  'description': 'Generic program mutation acknowledgement carrying the committed entity id and revision.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'createOrganizerProgram',
    'updateOrganizerProgram',
    'upsertProgramGuest',
    'upsertProgramHousehold',
    'upsertProgramFunction',
    'upsertProgramPickupPoint',
    'upsertProgramHotel',
    'upsertTransportVendor',
    'upsertProgramTravelLeg',
    'upsertProgramTravelParty',
    'setProgramTravelReadiness',
    'markProgramTripArrived',
    'voidProgramTrip',
    'refreshProgramTravelLeg',
    'grantProgramStaff',
    'revokeProgramStaff',
  ],
  'required': <Object?>[
    'entityId',
    'revision',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'entityId': <String, Object?>{
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
      'description': 'True when an exact clientOperationId replay returned the original result.',
    },
  },
};
