// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_households.schema.json.

const schemaProgramHouseholdDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_households.schema.json',
  'title': 'ProgramHouseholdDocument',
  'description': 'Server-owned household invitation grouping for program guests. Carries the invited party\'s primary contact and delivery preference; member guest ids are bounded.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programHouseholds',
  'x-firestore-path': 'programHouseholds/{householdId}',
  'x-document-id-field': 'householdId',
  'x-owner': 'program guest management callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'label',
    'primaryContactName',
    'primaryPhoneE164',
    'primaryEmail',
    'memberGuestIds',
    'deliveryPreference',
    'createdAt',
    'updatedAt',
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
    'label': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
      'description': 'Human label such as \'The Sharma family\' used on invitations and rosters.',
    },
    'primaryContactName': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 140,
          'description': 'Null after archive anonymization.',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'primaryPhoneE164': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 20,
    },
    'primaryEmail': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 320,
    },
    'memberGuestIds': <String, Object?>{
      'type': 'array',
      'minItems': 0,
      'maxItems': 50,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'deliveryPreference': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'whatsapp',
        'sms',
        'email',
        'none',
      ],
      'description': 'Invitation delivery preference; does not grant messaging consent by itself.',
    },
    'side': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'partnerA',
            'partnerB',
            'mutual',
          ],
          'description': 'Which side of the couple or family a household belongs to; display labels live on organizerPrograms.householdSideLabels.',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Optional side assignment used for per-side counts and seating; labels are configured on the program.',
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
    'messagingConsent': <String, Object?>{
      'type': <Object?>[
        'object',
        'null',
      ],
      'additionalProperties': false,
      'required': <Object?>[
        'granted',
        'grantedAt',
        'source',
      ],
      'properties': <String, Object?>{
        'granted': <String, Object?>{
          'type': 'boolean',
        },
        'grantedAt': <String, Object?>{
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
        'source': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'enum': <Object?>[
            'householdRsvpLink',
            'staff',
            'import',
            'whatsappStop',
            null,
          ],
          'description': 'Channel that recorded the consent decision; whatsappStop is an inbound STOP reply captured by the messaging webhook.',
        },
      },
      'description': 'Explicit household messaging consent. Absent means never asked; granted:true only ever follows an explicit tick — RSVP acceptance alone is not consent.',
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
    'fieldSelections': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
        'phoneE164': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
        'email': <String, Object?>{
          'type': 'string',
          'pattern': '^wfa_[a-f0-9]{64}\$',
        },
      },
    },
    'fieldConflicts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'properties': <String, Object?>{
        'displayName': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^wfa_[a-f0-9]{64}\$',
          },
        },
        'phoneE164': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^wfa_[a-f0-9]{64}\$',
          },
        },
        'email': <String, Object?>{
          'type': 'array',
          'maxItems': 20,
          'uniqueItems': true,
          'items': <String, Object?>{
            'type': 'string',
            'pattern': '^wfa_[a-f0-9]{64}\$',
          },
        },
      },
    },
  },
};
