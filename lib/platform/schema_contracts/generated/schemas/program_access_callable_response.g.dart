// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_access_response.schema.json.

const schemaProgramAccessCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_access_response.schema.json',
  'title': 'ProgramAccessCallableResponse',
  'description': 'Work-shell bootstrap: the caller\'s role, duties, station scopes and labeled program resources. Staff receive only operational fields.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'programId',
    'organizerId',
    'title',
    'kind',
    'timezone',
    'status',
    'actorRole',
    'duties',
    'grantExpiresAtMillis',
    'capabilities',
    'pickupPoints',
    'hotels',
    'vehicleClasses',
    'functions',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'wedding',
        'corporate',
        'social',
        'other',
      ],
    },
    'timezone': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'draft',
        'active',
        'completed',
        'archived',
      ],
    },
    'actorRole': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'manager',
        'staff',
      ],
    },
    'duties': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'duty',
          'pickupPointIds',
          'hotelIds',
          'expiresAtMillis',
        ],
        'properties': <String, Object?>{
          'duty': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'programAdmin',
              'programCoordinator',
              'guestRelations',
              'communications',
              'functionCheckIn',
              'functionLead',
              'airportGreeter',
              'hotelDesk',
              'transportDispatcher',
              'reconciliationViewer',
              'stakeholderViewer',
            ],
          },
          'pickupPointIds': <String, Object?>{
            'type': 'array',
            'maxItems': 32,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'Pickup restriction; empty means all program pickup points. Both resource restrictions must be met by the same assignment.',
          },
          'hotelIds': <String, Object?>{
            'type': 'array',
            'maxItems': 64,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'Destination restriction; empty means all program hotels. Restrictions from different assignments never combine into new routes.',
          },
          'functionIds': <String, Object?>{
            'type': 'array',
            'maxItems': 64,
            'uniqueItems': true,
            'items': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 180,
            },
            'description': 'Function restriction for functionCheckIn and functionLead duties; absent or empty means all program functions. Optional on documents written before function-scoped duties existed.',
          },
          'expiresAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
            'description': 'Exclusive expiry of this exact duty and resource scope. Independent of other assignments.',
          },
        },
      },
      'description': 'Managers receive an empty list meaning unrestricted; staff receive their granted duties.',
    },
    'grantExpiresAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
    },
    'capabilities': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'string',
        'enum': <Object?>[
          'arrivalsTransport',
          'accommodation',
          'forms',
          'messaging',
        ],
      },
    },
    'pickupPoints': <String, Object?>{
      'type': 'array',
      'maxItems': 32,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'pickupPointId',
          'label',
          'kind',
          'iataCode',
          'terminal',
        ],
        'properties': <String, Object?>{
          'pickupPointId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'kind': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'airport',
              'railway',
              'venue',
              'other',
            ],
          },
          'iataCode': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'terminal': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
        },
      },
    },
    'hotels': <String, Object?>{
      'type': 'array',
      'maxItems': 64,
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
            'minLength': 1,
            'maxLength': 140,
          },
        },
      },
    },
    'functions': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'description': 'Function-scoped door, check-in, and guest-desk surfaces for functionCheckIn, functionLead, and guestRelations holders, intersected with each assignment\'s functionIds. Empty for other duties.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'functionId',
          'name',
          'venueName',
          'startsAtMillis',
          'endsAtMillis',
          'checkInEnabled',
          'status',
          'expectedCount',
          'checkedInCount',
        ],
        'properties': <String, Object?>{
          'functionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'name': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'venueName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
          },
          'startsAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'endsAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'checkInEnabled': <String, Object?>{
            'type': 'boolean',
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'scheduled',
              'completed',
              'cancelled',
            ],
          },
          'expectedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
          },
          'checkedInCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 1000000,
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
  },
};
