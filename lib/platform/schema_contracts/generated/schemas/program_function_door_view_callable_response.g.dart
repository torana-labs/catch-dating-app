// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_function_door_view_response.schema.json.

const schemaProgramFunctionDoorViewCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_function_door_view_response.schema.json',
  'title': 'ProgramFunctionDoorViewCallableResponse',
  'description': 'Function-scoped door roster for check-in staff. Returns the function header, the invited roster (allGuests functions resolve every program guest; selectedGuests functions resolve invited join rows plus checked-in walk-ins), the recent journal tail for the activity rail, and live counts. Guest rows carry display names only — no contact fields.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'getProgramFunctionDoorView',
  ],
  'required': <Object?>[
    'programId',
    'functionId',
    'serverTimeMillis',
    'accessExpiresAtMillis',
    'function',
    'counts',
    'guests',
    'journal',
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
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'description': 'Server clock at read time so the client can render relative check-in times without trusting the device clock.',
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
    'function': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'name',
        'invitationMode',
        'checkInEnabled',
        'status',
        'startsAtMillis',
        'endsAtMillis',
        'venueName',
        'venueNotes',
        'dressCode',
        'instructions',
        'expectedCount',
        'checkedInCount',
      ],
      'properties': <String, Object?>{
        'name': <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 140,
        },
        'invitationMode': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'allGuests',
            'selectedGuests',
          ],
          'description': 'Whether the function invites every program guest or only the programFunctionGuests rows marked invited.',
        },
        'checkInEnabled': <String, Object?>{
          'type': 'boolean',
        },
        'status': <String, Object?>{
          'type': 'string',
          'enum': <Object?>[
            'scheduled',
            'completed',
            'cancelled',
          ],
        },
        'startsAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'endsAtMillis': <String, Object?>{
          'type': 'integer',
          'minimum': 1,
          'maximum': 9007199254740991,
        },
        'venueName': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 140,
        },
        'venueNotes': <String, Object?>{
          'type': <Object?>[
            'string',
            'null',
          ],
          'maxLength': 500,
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
          'maxLength': 500,
        },
        'expectedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'checkedInCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
      },
    },
    'counts': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'listedCount',
        'expectedHeads',
        'checkedInHeads',
        'checkedInParties',
        'noShowCount',
        'walkInCount',
      ],
      'properties': <String, Object?>{
        'listedCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
          'description': 'Guests on this function\'s door roster.',
        },
        'expectedHeads': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
          'description': 'Attending party-size sum across the roster.',
        },
        'checkedInHeads': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
          'description': 'Party-size sum of checked-in rows, including walk-ins.',
        },
        'checkedInParties': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'noShowCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
        },
        'walkInCount': <String, Object?>{
          'type': 'integer',
          'minimum': 0,
          'maximum': 1000000,
          'description': 'Rows created at the door (invited=false).',
        },
      },
    },
    'guests': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'guestId',
          'displayName',
          'invited',
          'rsvpStatus',
          'attendanceStatus',
          'partySize',
          'householdLabel',
          'responseNote',
        ],
        'properties': <String, Object?>{
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 140,
          },
          'invited': <String, Object?>{
            'type': 'boolean',
            'description': 'False for walk-ins created at the door.',
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
          },
          'householdLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
          },
          'responseNote': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
        },
      },
    },
    'journal': <String, Object?>{
      'type': 'array',
      'maxItems': 60,
      'description': 'Most recent journal entries first, for the door activity rail.',
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'journalId',
          'guestId',
          'displayName',
          'action',
          'occurredAtMillis',
          'partySize',
          'note',
          'actorLabel',
        ],
        'properties': <String, Object?>{
          'journalId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'guestId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'displayName': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
            'description': 'Resolved guest name when the guest record is readable; null for deleted guests.',
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
          'partySize': <String, Object?>{
            'type': <Object?>[
              'integer',
              'null',
            ],
            'minimum': 1,
            'maximum': 20,
          },
          'note': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 500,
          },
          'actorLabel': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 140,
            'description': 'Staff display name resolved through programStaffGrants; never a uid.',
          },
        },
      },
    },
  },
};
