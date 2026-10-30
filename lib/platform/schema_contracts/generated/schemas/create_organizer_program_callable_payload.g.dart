// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/create_organizer_program_payload.schema.json.

const schemaCreateOrganizerProgramCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/create_organizer_program_payload.schema.json',
  'title': 'CreateOrganizerProgramCallablePayload',
  'description': 'Create a private wedding/corporate program. Manager-only.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'kind',
    'title',
    'timezone',
    'startsAtMillis',
    'endsAtMillis',
    'capabilities',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'title': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
    },
    'timezone': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 60,
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
    'rsvpDeadlineAtMillis': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'Optional RSVP deadline anchor for Moments scheduling.',
    },
    'capabilities': <String, Object?>{
      'type': 'array',
      'maxItems': 8,
      'uniqueItems': true,
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
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 128,
      'pattern': '^[A-Za-z0-9_-]+\$',
      'description': 'Optional create-command identity. Same actor, organizer, key and normalized body replay the saved program; changed-body reuse is rejected. Omission preserves legacy random-ID creation.',
    },
    'transportSettings': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'bandWindowMillis',
        'maxReadyWaitMillis',
        'domesticExitLagMillis',
        'internationalExitLagMillis',
        'vehicleClasses',
      ],
      'properties': <String, Object?>{
        'bandWindowMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 300000,
          'maximum': 7200000,
          'description': 'Anchored curb-time window used by grouping suggestions. Default 30 minutes.',
        },
        'maxReadyWaitMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 60000,
          'maximum': 3600000,
          'description': 'Ceiling on how long a physically ready party waits before a group is flagged overdue. Default 10 minutes for premium events.',
        },
        'domesticExitLagMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 7200000,
          'description': 'Default landing-to-curb lag for domestic arrivals.',
        },
        'internationalExitLagMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 14400000,
          'description': 'Default landing-to-curb lag for international arrivals.',
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
          'description': 'Program-scoped vehicle catalog consumed by grouping suggestions; ids are unique per program.',
        },
      },
    },
  },
};
