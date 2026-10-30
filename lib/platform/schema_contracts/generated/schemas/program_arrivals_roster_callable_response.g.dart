// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_arrivals_roster_response.schema.json.

const schemaProgramArrivalsRosterCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_arrivals_roster_response.schema.json',
  'title': 'ProgramArrivalsRosterCallableResponse',
  'description': 'Station-scoped, duty-redacted arrivals roster. Greeter/dispatcher rows carry operational fields only: no phone numbers, emails, RSVP internals or other stations\' legs.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'pickupPointId',
    'generatedAtMillis',
    'rows',
    'vehicleClasses',
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
      'description': 'The station this page covers; null when the duty spans all stations.',
    },
    'generatedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'rows': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'legId',
          'guestId',
          'partyId',
          'guestDisplayName',
          'partyLabel',
          'partyGuestIds',
          'passengers',
          'luggageUnits',
          'flightNumber',
          'originIata',
          'flightStatus',
          'curbAtMillis',
          'curbSource',
          'readiness',
          'claimedByDisplay',
          'destinationHotelId',
          'destinationLabel',
          'requiredCapabilities',
          'dedicatedVehicle',
          'revision',
          'arrivalTerminal',
        ],
        'properties': <String, Object?>{
          'legId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'partyId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
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
          'partyGuestIds': <String, Object?>{
            'type': 'array',
            'maxItems': 50,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'Ride-together membership for dispatcher merge decisions.',
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
          'flightNumber': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 8,
          },
          'originIata': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 3,
          },
          'flightStatus': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'scheduled',
              'enroute',
              'landed',
              'delayed',
              'cancelled',
              'diverted',
              'unknown',
            ],
          },
          'curbAtMillis': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
            'description': 'Resolved curb estimate from arrivalTiming; null means unusable timing (cancelled, diverted or missing).',
          },
          'curbSource': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'ready',
              'manual',
              'actualLanding',
              'estimatedLanding',
              'scheduledLanding',
              null,
            ],
          },
          'unavailableReason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'cancelled',
              'diverted',
              'missingTiming',
              null,
            ],
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
          'claimedByDisplay': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 120,
            'description': 'Claiming staff member\'s display name, never their uid beyond the caller\'s own claim flag.',
          },
          'claimedByMe': <String, Object?>{
            'type': 'boolean',
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
          'requiredCapabilities': <String, Object?>{
            'type': 'array',
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
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
          'arrivalTerminal': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 8,
            'description': 'Provider-reported arrival terminal; null until the leg is enriched or when unannounced.',
          },
        },
      },
    },
    'vehicleClasses': <String, Object?>{
      'type': 'array',
      'maxItems': 16,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'id',
          'label',
          'passengerCapacity',
          'luggageCapacity',
          'capabilities',
          'sortOrder',
        ],
        'properties': <String, Object?>{
          'id': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
            'pattern': '^[a-z0-9][a-z0-9_-]{0,59}\$',
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 60,
          },
          'passengerCapacity': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 200,
          },
          'luggageCapacity': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 500,
          },
          'capabilities': <String, Object?>{
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
          'sortOrder': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000,
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
