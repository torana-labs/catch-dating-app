// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_functions.schema.json.

const schemaProgramFunctionDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_functions.schema.json',
  'title': 'ProgramFunctionDocument',
  'description': 'Server-owned private function (ceremony, reception, offsite session) inside a program. Separate from public events documents; no public read surface exists.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programFunctions',
  'x-firestore-path': 'programFunctions/{functionId}',
  'x-document-id-field': 'functionId',
  'x-owner': 'program management callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'name',
    'startsAt',
    'endsAt',
    'venueName',
    'status',
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
    'name': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 140,
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
    'venueName': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'venueNotes': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
    },
    'venueLocation': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'object',
          'additionalProperties': false,
          'description': 'Canonical meeting location selected from Google Places or a manually pinned map coordinate.',
          'required': <Object?>[
            'name',
            'latitude',
            'longitude',
          ],
          'properties': <String, Object?>{
            'name': <String, Object?>{
              'type': 'string',
              'minLength': 1,
              'maxLength': 240,
            },
            'address': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 500,
            },
            'placeId': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'minLength': 1,
              'maxLength': 256,
            },
            'latitude': <String, Object?>{
              'type': 'number',
              'minimum': -90,
              'maximum': 90,
            },
            'longitude': <String, Object?>{
              'type': 'number',
              'minimum': -180,
              'maximum': 180,
            },
            'notes': <String, Object?>{
              'type': <Object?>[
                'string',
                'null',
              ],
              'maxLength': 1000,
            },
          },
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Optional precise venue pin selected from Places or dropped manually; venueName remains the display string.',
    },
    'dressCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 140,
      'description': 'Short wardrobe guidance shown on invitations and reminders, such as \'Pastel formal\' or \'Poolside casual\'.',
    },
    'instructions': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 2000,
      'description': 'Guest-facing instructions for this function (entry gate, shuttle note, what to bring). Never carries staff-only detail.',
    },
    'invitationMode': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'allGuests',
        'selectedGuests',
      ],
      'description': 'Absent on functions written before per-function invitations; reads as allGuests.',
    },
    'checkInEnabled': <String, Object?>{
      'type': 'boolean',
      'description': 'When true, functionCheckIn/functionLead duties may mark programFunctionGuests attendanceStatus at the door.',
    },
    'expectedCount': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 1000000,
      'description': 'Server-maintained rollup of attending party sizes for catering and venue counts.',
    },
    'checkedInCount': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 0,
      'maximum': 1000000,
      'description': 'Server-maintained rollup of programFunctionGuests attendanceStatus=checkedIn.',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'scheduled',
        'completed',
        'cancelled',
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
