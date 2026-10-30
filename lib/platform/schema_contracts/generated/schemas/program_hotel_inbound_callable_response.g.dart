// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_hotel_inbound_response.schema.json.

const schemaProgramHotelInboundCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_hotel_inbound_response.schema.json',
  'title': 'ProgramHotelInboundCallableResponse',
  'description': 'Hotel-desk projection for one property: en-route trips and guests still expected. No phone numbers, flight internals or other hotels\' data.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'hotelId',
    'hotelName',
    'generatedAtMillis',
    'trips',
    'expectedLegs',
    'accessExpiresAtMillis',
    'nextTripCursor',
    'nextExpectedCursor',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'hotelId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'hotelName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'generatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'trips': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'tripId',
          'plateDisplay',
          'vehicleClassId',
          'vendorName',
          'departedAtMillis',
          'estimatedArriveAtMillis',
          'passengerCount',
          'guestNames',
          'status',
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
          'plateDisplay': <String, Object?>{
            'type': 'string',
            'minLength': 4,
            'maxLength': 16,
          },
          'vehicleClassId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'vendorName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
          },
          'departedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'estimatedArriveAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'description': 'Route ETA once the Maps adapter ships; null until then.',
          },
          'passengerCount': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 200,
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
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'enRoute',
              'arrived',
              'cancelled',
              'voided',
            ],
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
    'expectedLegs': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'legId',
          'guestDisplayName',
          'partyLabel',
          'passengers',
          'curbAtMillis',
          'readiness',
        ],
        'properties': <String, Object?>{
          'legId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'guestDisplayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'partyLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
          },
          'passengers': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 200,
          },
          'curbAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'readiness': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'expected',
              'ready',
              'dispatched',
              'arrived',
              'disrupted',
              'noShow',
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
    'nextTripCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'nextExpectedCursor': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
  },
};
