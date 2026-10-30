// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/submit_program_household_rsvp_response.schema.json.

const schemaSubmitProgramHouseholdRsvpCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/submit_program_household_rsvp_response.schema.json',
  'title': 'SubmitProgramHouseholdRsvpCallableResponse',
  'description': 'Acknowledgement for a household RSVP submit: the household id, its committed revision, and how many function responses landed.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'submitProgramHouseholdRsvp',
  ],
  'required': <Object?>[
    'entityId',
    'revision',
    'appliedCount',
    'travelLegAppliedCount',
    'messagingConsentGranted',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'entityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'The household document id.',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'appliedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'travelLegAppliedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'How many programTravelLegs rows this submit wrote from its travel blocks.',
    },
    'messagingConsentGranted': <String, Object?>{
      'type': 'boolean',
      'description': 'The consent state now recorded on the household.',
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
    },
  },
};
