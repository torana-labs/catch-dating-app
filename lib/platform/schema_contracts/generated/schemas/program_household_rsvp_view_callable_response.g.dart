// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_household_rsvp_view_response.schema.json.

const schemaProgramHouseholdRsvpViewCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_household_rsvp_view_response.schema.json',
  'title': 'ProgramHouseholdRsvpViewCallableResponse',
  'description': 'The household\'s RSVP page model: program display facts, consent state, and each member\'s invited functions with current responses. Contains no data outside the token\'s household.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'getProgramHouseholdRsvpView',
  ],
  'required': <Object?>[
    'programId',
    'programTitle',
    'timezone',
    'householdId',
    'householdLabel',
    'messagingConsentGranted',
    'members',
    'hotels',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'programTitle': <String, Object?>{
      'type': 'string',
      'maxLength': 140,
    },
    'timezone': <String, Object?>{
      'type': 'string',
      'maxLength': 64,
    },
    'householdId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'householdLabel': <String, Object?>{
      'type': 'string',
      'maxLength': 140,
    },
    'messagingConsentGranted': <String, Object?>{
      'type': 'boolean',
      'description': 'Current consent state so the page can pre-tick.',
    },
    'members': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'displayName',
          'functions',
          'travel',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'maxLength': 140,
          },
          'functions': <String, Object?>{
            'type': 'array',
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'functionId',
                'name',
                'startsAtMillis',
                'endsAtMillis',
                'rsvpStatus',
                'partySize',
                'responseNote',
              ],
              'properties': <String, Object?>{
                'functionId': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'name': <String, Object?>{
                  'type': 'string',
                  'maxLength': 140,
                },
                'startsAtMillis': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'endsAtMillis': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 9007199254740991,
                },
                'venueName': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 140,
                },
                'dressCode': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 140,
                },
                'instructions': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 1000,
                },
                'rsvpStatus': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'pending',
                    'attending',
                    'declined',
                    'maybe',
                  ],
                },
                'partySize': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 1,
                  'maximum': 20,
                },
                'responseNote': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 500,
                },
              },
            },
          },
          'travel': <String, Object?>{
            'type': 'array',
            'maxItems': 6,
            'description': 'This member\'s previously captured travel blocks, one per journey kind, echoed so the form can pre-fill. Only household-submitted (formResponse) legs appear.',
            'items': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'kind',
                'flightNumber',
                'carrierCode',
                'originIata',
                'destinationIata',
                'scheduledArrivalAtMillis',
                'destinationHotelId',
                'destinationLabel',
                'passengers',
                'luggageUnits',
              ],
              'properties': <String, Object?>{
                'kind': <String, Object?>{
                  'type': 'string',
                  'enum': <Object?>[
                    'inbound',
                    'outbound',
                    'ground',
                  ],
                },
                'flightNumber': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 16,
                },
                'carrierCode': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 3,
                },
                'originIata': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 3,
                },
                'destinationIata': <String, Object?>{
                  'type': <Object?>[
                    'string',
                    'null',
                  ],
                  'maxLength': 3,
                },
                'scheduledArrivalAtMillis': <String, Object?>{
                  'type': <Object?>[
                    'integer',
                    'null',
                  ],
                  'minimum': 0,
                  'maximum': 253402300799999,
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
              },
            },
          },
        },
      },
    },
    'hotels': <String, Object?>{
      'type': 'array',
      'maxItems': 50,
      'description': 'The program\'s configured hotels for the travel destination picker; names only.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'hotelId',
          'name',
        ],
        'properties': <String, Object?>{
          'hotelId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': 'string',
            'maxLength': 140,
          },
        },
      },
    },
  },
};
