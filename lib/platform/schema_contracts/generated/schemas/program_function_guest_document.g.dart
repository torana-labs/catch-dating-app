// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_function_guests.schema.json.

const schemaProgramFunctionGuestDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_function_guests.schema.json',
  'title': 'ProgramFunctionGuestDocument',
  'description': 'Server-owned per-function invitation, RSVP and door-attendance join record. One document per (functionId, guestId) pair; the document id is the deterministic `\${functionId}_\${guestId}` join key so invites and responses upsert idempotently. Per-function truth lives here; programGuests.rsvpStatus is only a derived rollup.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programFunctionGuests',
  'x-firestore-path': 'programFunctionGuests/{functionGuestId}',
  'x-document-id-field': 'functionGuestId',
  'x-owner': 'program guest management, RSVP conversion, and function check-in callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'functionId',
    'guestId',
    'invited',
    'rsvpStatus',
    'attendanceStatus',
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
    'functionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'guestId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'invited': <String, Object?>{
      'type': 'boolean',
      'description': 'Whether this guest is on the function\'s invitation list. Rows exist only for functions with invitationMode=selectedGuests when invited=false; allGuests functions may omit rows entirely.',
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
    'attendanceStatus': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'expected',
        'checkedIn',
        'noShow',
      ],
      'description': 'Door/arrival state for one guest at one function. expected is the default for invited guests; noShow is marked after the function ends.',
    },
    'partySize': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 20,
      'description': 'Attending party size including children when the guest RSVPs for more than themselves; null reads as 1.',
    },
    'respondedAt': <String, Object?>{
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
      'description': 'When the guest\'s current RSVP response was recorded; null while still pending.',
    },
    'responseNote': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
      'description': 'Optional guest note captured with the response, such as dietary or plus-one detail.',
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
    'responseSource': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'enum': <Object?>[
        'staff',
        'householdLink',
        'import',
        null,
      ],
      'description': 'Which channel recorded the current response: staff entry, the signed household RSVP link, or a manifest import. Null while pending.',
    },
    'recordedByUid': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
      'description': 'Staff uid who recorded a staff-sourced response; null for household-link and imported responses.',
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
