// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/organizer_program_response.schema.json.

const schemaOrganizerProgramCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/organizer_program_response.schema.json',
  'title': 'OrganizerProgramCallableResponse',
  'description': 'Manager-facing program detail: settings, resources and coverage counts. No guest rows.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'program',
    'functions',
    'pickupPoints',
    'hotels',
    'counts',
  ],
  'properties': <String, Object?>{
    'program': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'programId',
        'organizerId',
        'kind',
        'title',
        'timezone',
        'status',
        'startsAtMillis',
        'endsAtMillis',
        'capabilities',
        'transportSettings',
        'revision',
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
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'draft',
            'active',
            'completed',
            'archived',
          ],
        },
        'startsAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'endsAtMillis': <String, Object?>{
          'type': 'integer',
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
        'revision': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
        },
        'archivedAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'description': 'Set when the program is archived; null otherwise.',
        },
        'anonymizeAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'description': 'Grace deadline: identity scrub happens after this unless the program is unarchived.',
        },
        'anonymizedAtMillis': <String, Object?>{
          'type': <Object?>[
            'integer',
            'null',
          ],
          'minimum': 0,
          'description': 'Set once identity/free-text fields were scrubbed; program stays archived indefinitely.',
        },
      },
    },
    'functions': <String, Object?>{
      'type': 'array',
      'maxItems': 40,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'functionId',
          'name',
          'startsAtMillis',
          'endsAtMillis',
          'venueName',
          'status',
          'invitationMode',
          'checkInEnabled',
          'dressCode',
          'instructions',
          'expectedCount',
          'checkedInCount',
          'revision',
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
          'startsAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'endsAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
          },
          'venueName': <String, Object?>{
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
          'invitationMode': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'allGuests',
              'selectedGuests',
            ],
            'description': 'Effective mode; absent document field reads as allGuests.',
          },
          'checkInEnabled': <String, Object?>{
            'type': 'boolean',
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
            'maxLength': 2000,
          },
          'expectedCount': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'checkedInCount': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 0,
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
        },
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
          'kind',
          'label',
          'active',
          'revision',
        ],
        'properties': <String, Object?>{
          'pickupPointId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
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
          'label': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
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
          'meetingZone': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'instructions': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'active': <String, Object?>{
            'type': 'boolean',
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
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
          'address',
          'active',
          'revision',
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
          'address': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 300,
          },
          'receptionContact': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
          },
          'active': <String, Object?>{
            'type': 'boolean',
          },
          'revision': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
          },
        },
      },
    },
    'counts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'guests',
        'households',
        'inboundLegs',
        'activeStaff',
      ],
      'properties': <String, Object?>{
        'guests': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'households': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'inboundLegs': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
        'activeStaff': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
        },
      },
    },
  },
};
