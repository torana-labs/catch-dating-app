// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_transport_plan_response.schema.json.

const schemaProgramTransportPlanCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_transport_plan_response.schema.json',
  'title': 'ProgramTransportPlanCallableResponse',
  'description': 'Deterministic grouping suggestions from the transport policy, recomputed per request. Suggestions are not reservations; dispatch is a separate command.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'pickupPointId',
    'generatedAtMillis',
    'groups',
    'unassigned',
    'accessExpiresAtMillis',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'pickupPointId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'generatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'groups': <String, Object?>{
      'type': 'array',
      'maxItems': 200,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'legIds',
          'partyIds',
          'destinationHotelId',
          'destinationLabel',
          'readiness',
          'vehicleClassId',
          'vehicleClassLabel',
          'passengers',
          'luggageUnits',
          'earliestCurbAtMillis',
          'latestCurbAtMillis',
          'dispatchByMillis',
          'waitOverdue',
        ],
        'properties': <String, Object?>{
          'legIds': <String, Object?>{
            'type': 'array',
            'minItems': 1,
            'maxItems': 50,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'partyIds': <String, Object?>{
            'type': 'array',
            'maxItems': 50,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
          },
          'destinationHotelId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'destinationLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'readiness': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'expected',
              'ready',
            ],
          },
          'vehicleClassId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'vehicleClassLabel': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'passengers': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 200,
          },
          'luggageUnits': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 500,
          },
          'earliestCurbAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'latestCurbAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'dispatchByMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'waitOverdue': <String, Object?>{
            'type': 'boolean',
          },
        },
      },
    },
    'unassigned': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'legId',
          'reason',
        ],
        'properties': <String, Object?>{
          'legId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'reason': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'missingTime',
              'noSuitableVehicle',
              'missingScope',
            ],
          },
        },
      },
    },
    'accessExpiresAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 9007199254740991,
      'description': 'Exclusive deadline for retaining this scoped projection. Earliest contributing duty expiry; null only for the program creator. Refresh after expiry even if another narrower duty remains active.',
    },
  },
};
