// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/resolve_event_success_late_arrival_response.schema.json.

const schemaResolveEventSuccessLateArrivalCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/resolve_event_success_late_arrival_response.schema.json',
  'title': 'ResolveEventSuccessLateArrivalCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'status',
    'targetRoundIndex',
    'revision',
    'assignmentDraftRevision',
    'reason',
    'replayed',
  ],
  'properties': <String, Object?>{
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'insertedIntoOpenPair',
        'extendedUnit',
        'heldForNextRound',
      ],
    },
    'targetRoundIndex': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100,
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'assignmentDraftRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 2147483647,
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
