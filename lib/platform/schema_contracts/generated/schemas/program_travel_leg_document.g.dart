// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_travel_legs.schema.json.

const schemaProgramTravelLegDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_travel_legs.schema.json',
  'title': 'ProgramTravelLegDocument',
  'description': 'Server-owned per-guest travel leg. Carries itinerary facts, flight status snapshots, readiness/claim state and reviewed manual overrides. Provider facts are linked, never copied over manual observations.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programTravelLegs',
  'x-firestore-path': 'programTravelLegs/{legId}',
  'x-document-id-field': 'legId',
  'x-owner': 'program travel and dispatch callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'guestId',
    'partyId',
    'kind',
    'flightNumber',
    'carrierCode',
    'originIata',
    'destinationIata',
    'scheduledArrivalAt',
    'estimatedArrivalAt',
    'actualArrivalAt',
    'flightStatus',
    'flightInstanceId',
    'pickupPointId',
    'destinationHotelId',
    'destinationLabel',
    'readiness',
    'readyAt',
    'claimedByUid',
    'claimedAt',
    'manualCurbAt',
    'manualCurbNote',
    'passengers',
    'luggageUnits',
    'requiredCapabilities',
    'dedicatedVehicle',
    'source',
    'createdAt',
    'updatedAt',
    'revision',
    'arrivalTerminal',
    'flightRefreshedAt',
    'flightNextRefreshAt',
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
    'guestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Exactly one guest per leg; companions get their own legs sharing a party.',
    },
    'partyId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Server-maintained membership index of the canonical party legIds. Only party membership commands and manifest import may change it.',
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
    'scheduledArrivalAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'estimatedArrivalAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'actualArrivalAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
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
    'flightInstanceId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Resolved flight identity for enrichment: flight number, airports and scheduled arrival instant. Shared across passengers on that flight.',
    },
    'international': <String, Object?>{
      'type': <Object?>[
        'boolean',
        'null',
      ],
      'description': 'True for international sectors; selects the program\'s international exit lag. Null/false uses the domestic lag.',
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
      'description': 'Free-text destination when the drop is not a configured hotel.',
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
    'readyAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Observed curb-ready timestamp; outranks every estimate.',
    },
    'claimedByUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'claimedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'manualCurbAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Reviewed manual curb estimate; outranks flight-derived timing.',
    },
    'manualCurbNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 280,
    },
    'passengers': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 200,
      'description': 'Seats this leg consumes, including children without their own guest record.',
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
      'description': 'VIP/private transfers never share a suggested vehicle.',
    },
    'source': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'manual',
        'import',
        'formResponse',
        'planner',
      ],
    },
    'createdAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'updatedAt': <String, Object?>{
      'type': 'object',
      'description': 'Serialized Firestore Timestamp fixture shape.',
      'x-firestore-type': 'timestamp',
      'additionalProperties': false,
      'required': <Object?>[
        '_seconds',
        '_nanoseconds',
      ],
      'properties': <String, Object?>{
        '_seconds': <String, Object?>{
          'type': 'integer',
        },
        '_nanoseconds': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 999999999,
        },
      },
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'arrivalTerminal': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 8,
      'description': 'Provider-reported arrival terminal (e.g. T3). Staff display only; pickup point authority stays with pickupPointId.',
    },
    'flightRefreshedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Last successful provider refresh; null when the leg has never been enriched.',
    },
    'flightNextRefreshAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Scheduler cursor for flight polling and subscription reconciliation. Null only when no polling or provider cleanup remains.',
    },
    'flightAlertSubscriptionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 128,
      'description': 'Attached provider subscription, retained until deletion is confirmed. A pending create is represented by flightAlertFlightNumber even before its id is known.',
    },
    'flightProviderUpdatedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Latest applied provider observation timestamp; older or replayed observations cannot overwrite current facts.',
    },
    'flightAlertFlightNumber': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 10,
      'description': 'Provider subject for the attached or pending subscription. Retained across failures and rebooking until reconciled.',
    },
    'flightAlertLease': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'null',
        },
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'token',
            'expiresAt',
          ],
          'properties': <String, Object?>{
            'token': <String, Object?>{
              'type': 'string',
              'maxLength': 80,
            },
            'expiresAt': <String, Object?>{
              'type': 'object',
              'description': 'Serialized Firestore Timestamp fixture shape.',
              'x-firestore-type': 'timestamp',
              'additionalProperties': false,
              'required': <Object?>[
                '_seconds',
                '_nanoseconds',
              ],
              'properties': <String, Object?>{
                '_seconds': <String, Object?>{
                  'type': 'integer',
                },
                '_nanoseconds': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 999999999,
                },
              },
            },
          },
        },
      ],
      'description': 'Short server lease for subscription reconciliation. Provider requests run outside transactions; expired leases can be recovered.',
    },
    'anonymizedAt': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'description': 'Serialized Firestore Timestamp fixture shape.',
          'x-firestore-type': 'timestamp',
          'additionalProperties': false,
          'required': <Object?>[
            '_seconds',
            '_nanoseconds',
          ],
          'properties': <String, Object?>{
            '_seconds': <String, Object?>{
              'type': 'integer',
            },
            '_nanoseconds': <String, Object?>{
              'type': 'integer',
              'minimum': 0,
              'maximum': 999999999,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Identity/free-text scrub marker set by the archive retention sweep; null until anonymized.',
    },
  },
};
