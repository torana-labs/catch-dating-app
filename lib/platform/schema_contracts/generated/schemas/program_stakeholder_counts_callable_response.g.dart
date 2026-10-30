// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_stakeholder_counts_response.schema.json.

const schemaProgramStakeholderCountsCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_stakeholder_counts_response.schema.json',
  'title': 'ProgramStakeholderCountsCallableResponse',
  'description': 'Counts-only program overview for stakeholderViewer staff and organizer managers: guest and household headcounts, per-function RSVP/attendance histograms, and per-hotel occupancy. The contract carries no PII — ids and counts only, never names, contacts, or notes.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'getProgramStakeholderCounts',
  ],
  'required': <Object?>[
    'programId',
    'serverTimeMillis',
    'accessExpiresAtMillis',
    'guestCount',
    'householdCount',
    'functions',
    'hotels',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
    'guestCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'householdCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'functions': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'functionId',
          'status',
          'invitedCount',
          'rsvpPending',
          'rsvpAttending',
          'rsvpDeclined',
          'rsvpMaybe',
          'expectedHeads',
          'checkedInHeads',
          'noShowCount',
        ],
        'properties': <String, Object?>{
          'functionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'status': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'scheduled',
              'completed',
              'cancelled',
            ],
          },
          'invitedCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Guests invited to this function: every program guest for allGuests functions, else invited functionGuests rows.',
          },
          'rsvpPending': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Invited guests with no response (or no join row yet on allGuests functions).',
          },
          'rsvpAttending': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'rsvpDeclined': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'rsvpMaybe': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'expectedHeads': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Sum of attending party sizes (null reads as 1).',
          },
          'checkedInHeads': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Heads marked checkedIn at the door.',
          },
          'noShowCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
        },
      },
    },
    'hotels': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'hotelId',
          'routedGuestCount',
          'arrivedGuestCount',
          'legCount',
        ],
        'properties': <String, Object?>{
          'hotelId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'routedGuestCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Distinct guests with at least one leg routed to this hotel.',
          },
          'arrivedGuestCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Distinct routed guests whose hotel-bound leg already arrived.',
          },
          'legCount': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
        },
      },
    },
  },
};
