// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/record_program_door_journal_payload.schema.json.

const schemaRecordProgramDoorJournalCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/record_program_door_journal_payload.schema.json',
  'title': 'RecordProgramDoorJournalCallablePayload',
  'description': 'Batch of door actions one function-scoped staff device recorded. The server derives journal ids, so retries and offline outbox replays are idempotent; every operation reports its own outcome.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'recordProgramDoorJournal',
  ],
  'required': <Object?>[
    'programId',
    'functionId',
    'operations',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'functionId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'operations': <String, Object?>{
      'type': 'array',
      'minItems': 1,
      'maxItems': 50,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'action',
          'occurredAtMillis',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
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
            'minimum': 1,
            'maximum': 9007199254740991,
          },
          'deviceId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 180,
          },
          'partySize': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 20,
            'description': 'Optional initial party size for walkInCreate; required for partySizeAdjust; must be null or omitted on every other action.',
          },
          'note': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
        },
      },
    },
  },
};
