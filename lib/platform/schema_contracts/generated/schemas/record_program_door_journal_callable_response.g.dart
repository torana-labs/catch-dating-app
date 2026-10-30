// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/record_program_door_journal_response.schema.json.

const schemaRecordProgramDoorJournalCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/record_program_door_journal_response.schema.json',
  'title': 'RecordProgramDoorJournalCallableResponse',
  'description': 'Per-operation outcomes for one door journal batch. Duplicates and rule rejections report per operation so a device can reconcile its outbox; a partially rejected batch still reports the appended entries it committed.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'recordProgramDoorJournal',
  ],
  'required': <Object?>[
    'entityId',
    'revision',
    'results',
    'appendedCount',
    'duplicateCount',
    'rejectedCount',
    'alreadyApplied',
  ],
  'properties': <String, Object?>{
    'entityId': <String, Object?>{
      'type': 'string',
      'description': 'The functionId the batch targeted.',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'description': 'Function document revision after the write.',
    },
    'results': <String, Object?>{
      'type': 'array',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'action',
          'outcome',
          'journalId',
          'reason',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
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
          'outcome': <String, Object?>{
            'type': 'string',
            'enum': <Object?>[
              'appended',
              'duplicate',
              'rejected',
            ],
          },
          'journalId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'description': 'Appended entry id, or the colliding id for duplicates; null on rule rejections.',
          },
          'reason': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'enum': <Object?>[
              'alreadyCheckedIn',
              'notCheckedIn',
              'functionCheckInDisabled',
              'duplicateJournalId',
              'invalidTransition',
              null,
            ],
          },
        },
      },
    },
    'appendedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'duplicateCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'rejectedCount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
    },
    'alreadyApplied': <String, Object?>{
      'type': 'boolean',
      'description': 'True when the entire batch replayed as duplicates and nothing new was written.',
    },
  },
};
