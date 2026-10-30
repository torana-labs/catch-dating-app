// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_trip_list_response.schema.json.

const schemaProgramTripListCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_trip_list_response.schema.json',
  'title': 'ProgramTripListCallableResponse',
  'description': 'Manager/dispatcher/reconciliation trip ledger: the dispatch record that drives vendor reconciliation.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'listProgramTrips',
  ],
  'required': <Object?>[
    'programId',
    'trips',
    'accessExpiresAtMillis',
    'nextCursor',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'trips': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'tripId',
          'pickupPointId',
          'destinationHotelId',
          'destinationLabel',
          'vehicleClassId',
          'plateDisplay',
          'vendorId',
          'kind',
          'status',
          'passengerCount',
          'departedAtMillis',
          'arrivedAtMillis',
          'voidReason',
          'guestNames',
          'revision',
          'manifestSource',
          'vehicleClassLabel',
        ],
        'properties': <String, Object?>{
          'tripId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'pickupPointId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
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
          'vehicleClassId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'plateDisplay': <String, Object?>{
            'type': 'string',
            'minLength': 4,
            'maxLength': 16,
          },
          'vendorId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'vendorName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
          },
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'guestTransfer',
              'repositioning',
            ],
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'enRoute',
              'arrived',
              'cancelled',
              'voided',
            ],
          },
          'passengerCount': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 200,
          },
          'departedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'arrivedAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'voidReason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 280,
          },
          'guestNames': <String, Object?>{
            'type': 'array',
            'maxItems': 50,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 140,
            },
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'manifestSource': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'dispatchSnapshot',
              'currentRecords',
            ],
            'description': 'Whether displayed guest names were captured with dispatch or resolved from current records for a legacy trip.',
          },
          'vehicleClassLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'minLength': 1,
            'maxLength': 60,
            'description': 'Vehicle-class label recorded with dispatch. Null when the legacy trip has no snapshot.',
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
    'nextCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
