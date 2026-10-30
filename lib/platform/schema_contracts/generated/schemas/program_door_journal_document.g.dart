// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/program_door_journal.schema.json.

const schemaProgramDoorJournalDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/program_door_journal.schema.json',
  'title': 'ProgramDoorJournalDocument',
  'description': 'Server-owned append-only door journal entry for one program function. The document id is the deterministic journalId derived from (scope, functionId, guestId, action, occurredAtMillis, actorUid), so device retries and offline outbox replays collapse to one entry. Attendance truth projects from this journal onto programFunctionGuests.attendanceStatus; clients never write either surface directly.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'programDoorJournal',
  'x-firestore-path': 'programDoorJournal/{journalId}',
  'x-document-id-field': 'journalId',
  'x-owner': 'program door journal callables',
  'required': <Object?>[
    'programId',
    'organizerId',
    'functionId',
    'guestId',
    'actorUid',
    'action',
    'occurredAtMillis',
    'deviceId',
    'partySize',
    'note',
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
      'description': 'programGuests member the entry acts on; walkInCreate entries may name a guest the function never invited.',
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Staff uid who recorded the action at the door.',
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'checkIn',
        'undoCheckIn',
        'markNoShow',
        'walkInCreate',
        'partySizeAdjust',
      ],
    },
    'occurredAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
      'description': 'Client-declared action time folded into the idempotency key and journal ordering.',
    },
    'deviceId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 180,
      'description': 'Door device identifier for audit; null when the device supplies none.',
    },
    'partySize': <String, Object?>{
      'type': <Object?>[
        'integer',
        'null',
      ],
      'minimum': 1,
      'maximum': 20,
      'description': 'Attending party size set by walkInCreate or partySizeAdjust; null on every other action.',
    },
    'note': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 500,
      'description': 'Optional door note such as a late-arrival explanation.',
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
