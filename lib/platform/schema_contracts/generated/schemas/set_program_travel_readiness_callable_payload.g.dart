// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_program_travel_readiness_payload.schema.json.

const schemaSetProgramTravelReadinessCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_program_travel_readiness_payload.schema.json',
  'title': 'SetProgramTravelReadinessCallablePayload',
  'description': 'Greeter/dispatcher leg observation: claim, unclaim, mark ready at curb, or flag disruption. clientOperationId makes offline replays safe.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'legId',
    'action',
    'clientOperationId',
    'expectedRevision',
    'observedAtMillis',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'legId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'markReady',
        'claim',
        'unclaim',
        'markDisrupted',
      ],
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'manualCurbAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 253402300799999,
      'description': 'Reviewed curb estimate set alongside markDisrupted or planner correction.',
    },
    'manualCurbNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 280,
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
    },
    'afterObservation': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'clientOperationId',
        'action',
      ],
      'description': 'A preceding observation by the same actor on the same journey. Its receipt result revision must still equal the current leg revision.',
      'properties': <String, Object?>{
        'clientOperationId': <String, Object?>{
          'type': 'string',
          'minLength': 8,
          'maxLength': 120,
        },
        'action': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'claim',
            'unclaim',
            'markReady',
            'markDisrupted',
          ],
        },
      },
    },
    'observedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 253402300799999,
      'description': 'Immutable device observation time; accepted up to seven days late with five minutes of clock skew.',
    },
  },
};
