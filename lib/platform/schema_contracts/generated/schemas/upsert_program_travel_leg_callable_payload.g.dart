// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/upsert_program_travel_leg_payload.schema.json.

const schemaUpsertProgramTravelLegCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/upsert_program_travel_leg_payload.schema.json',
  'title': 'UpsertProgramTravelLegCallablePayload',
  'description': 'Create or update one guest journey. Guest and journey kind are immutable; party membership is owned by upsertProgramTravelParty.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'guestId',
    'kind',
    'passengers',
    'luggageUnits',
    'requiredCapabilities',
    'dedicatedVehicle',
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
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'guestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'inbound',
        'outbound',
        'ground',
      ],
    },
    'flightNumber': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z0-9]{2,3}-?[0-9]{1,4}[A-Z]?\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'carrierCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 3,
    },
    'originIata': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'destinationIata': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^[A-Z]{3}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'scheduledArrivalAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 253402300799999,
    },
    'international': <String, Object?>{
      'type': <Object?>[
        'boolean',
        'null',
      ],
      'description': 'True for international sectors; selects the program\'s international exit lag.',
    },
    'pickupPointId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationHotelId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'destinationLabel': <String, Object?>{
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
    'luggageUnits': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 500,
    },
    'requiredCapabilities': <String, Object?>{
      'type': 'array',
      'maxItems': 12,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'wheelchairAccessible',
          'extraLuggage',
          'childSeat',
        ],
      },
    },
    'dedicatedVehicle': <String, Object?>{
      'type': 'boolean',
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'required': <Object?>[
          'legId',
        ],
      },
      'then': <String, Object?>{
        'required': <Object?>[
          'expectedRevision',
        ],
      },
    },
  ],
};
