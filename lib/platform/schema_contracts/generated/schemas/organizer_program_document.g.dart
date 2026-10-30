// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_programs.schema.json.

const schemaOrganizerProgramDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_programs.schema.json',
  'title': 'OrganizerProgramDocument',
  'description': 'Server-owned private wedding/corporate program root. Holds organizer ownership, lifecycle, enabled capabilities and transport tuning. Never publicly readable; guest logistics live in program-scoped collections.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerPrograms',
  'x-firestore-path': 'organizerPrograms/{programId}',
  'x-document-id-field': 'programId',
  'x-owner': 'program management callables',
  'required': <Object?>[
    'organizerId',
    'kind',
    'title',
    'timezone',
    'startsAt',
    'endsAt',
    'status',
    'capabilities',
    'transportSettings',
    'createdBy',
    'createdAt',
    'updatedAt',
    'revision',
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
      'description': 'IANA timezone identifier used for display and time-band boundaries.',
    },
    'startsAt': <String, Object?>{
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
    'endsAt': <String, Object?>{
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
    'rsvpDeadlineAt': <String, Object?>{
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
      'description': 'RSVP deadline anchor for Moments scheduling; absent until the organizer sets one.',
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
    'entitlement': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'required': <Object?>[
            'sku',
            'limits',
            'capabilitiesAllowed',
            'grantedAtMillis',
            'receiptRef',
          ],
          'description': 'Immutable copy of the organizer entitlement terms captured when the program was created; later plan changes do not rewrite program history.',
          'properties': <String, Object?>{
            'sku': <String, Object?>{
              'type': 'string',
              'pattern': '^[a-z0-9_]{1,60}\$',
              'description': 'Catalog key from contracts/catalogs/organizer_entitlement_skus.json at grant time.',
            },
            'limits': <String, Object?>{
              'type': 'object',
              'additionalProperties': false,
              'required': <Object?>[
                'guests',
                'functions',
                'staffAssignments',
                'momentsPerFunction',
              ],
              'properties': <String, Object?>{
                'guests': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 100000,
                },
                'functions': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 200,
                },
                'staffAssignments': <String, Object?>{
                  'type': 'integer',
                  'minimum': 1,
                  'maximum': 500,
                },
                'momentsPerFunction': <String, Object?>{
                  'type': 'integer',
                  'minimum': 0,
                  'maximum': 50,
                },
              },
            },
            'capabilitiesAllowed': <String, Object?>{
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
              'description': 'Ceiling on organizerPrograms.capabilities; an enabled capability must also appear here.',
            },
            'grantedAtMillis': <String, Object?>{
              'type': 'integer',
              'minimum': 1,
              'maximum': 9007199254740991,
            },
            'receiptRef': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 180,
              'description': 'Manual invoice or checkout reference recorded by the granting admin.',
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Immutable snapshot of the organizer entitlement terms captured at program creation. Absent on programs predating entitlements; owning callables treat absence as the unpaid default ceiling.',
    },
    'householdSideLabels': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'properties': <String, Object?>{
        'partnerA': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 40,
        },
        'partnerB': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 40,
        },
      },
      'description': 'Optional display labels for programHouseholds.side (such as bride/groom or two family names); defaults to generic partner labels.',
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
    'createdBy': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
    'createRequestHash': <String, Object?>{
      'type': 'string',
      'minLength': 64,
      'maxLength': 64,
      'pattern': '^[a-f0-9]{64}\$',
      'description': 'Immutable normalized create-command fingerprint for request-key replay. Absent on legacy programs; never changed by program edits or lifecycle transitions.',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'archivedAt': <String, Object?>{
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
      'description': 'Timestamp of the explicit archive action. Lifecycle: draft/active -> completed -> archived.',
    },
    'archivedFromStatus': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'draft',
            'active',
            'completed',
            'archived',
          ],
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Status the program held before archive; unarchiveProgram restores it during the grace window.',
    },
    'anonymizeAt': <String, Object?>{
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
      'description': 'Retention clock: archivedAt + 14 days. The anonymize sweep processes once this passes.',
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
      'description': 'Set once the retention sweep scrubbed identity/free-text fields. Anonymized programs remain archived and indefinitely retained.',
    },
  },
};
