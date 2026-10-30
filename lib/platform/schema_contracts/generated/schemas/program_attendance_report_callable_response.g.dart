// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/program_attendance_report_response.schema.json.

const schemaProgramAttendanceReportCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/program_attendance_report_response.schema.json',
  'title': 'ProgramAttendanceReportCallableResponse',
  'description': 'Per-function attendance report for reconciliationViewer staff, coordinators, and organizer managers. Separates RSVP truth (who promised what) from door truth (who actually arrived) and lists exception guest ids a reconciler chases by hand. Ids and counts only — no names, contacts, or notes.',
  'type': 'object',
  'additionalProperties': false,
  'x-callable-aliases': <Object?>[
    'getProgramAttendanceReport',
  ],
  'required': <Object?>[
    'programId',
    'serverTimeMillis',
    'accessExpiresAtMillis',
    'programGuests',
    'programInvitedGuests',
    'programAttendingGuests',
    'programCheckedInGuests',
    'programNoShowGuests',
    'functions',
  ],
  'properties': <String, Object?>{
    'programId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'serverTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
    'programGuests': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
      'description': 'Distinct guests with any function row in the program.',
    },
    'programInvitedGuests': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'programAttendingGuests': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'programCheckedInGuests': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'programNoShowGuests': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000,
    },
    'functions': <String, Object?>{
      'type': 'array',
      'maxItems': 500,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'functionId',
          'invitedGuests',
          'respondedGuests',
          'attendingGuests',
          'attendingHeads',
          'maybeGuests',
          'declinedGuests',
          'noResponseGuests',
          'checkedInGuests',
          'checkedInHeads',
          'noShowGuests',
          'expectedGuests',
          'walkInGuests',
          'walkInHeads',
          'exceptions',
        ],
        'properties': <String, Object?>{
          'functionId': <String, Object?>{
            'type': 'string',
            'minLength': 1,
            'maxLength': 180,
          },
          'invitedGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'respondedGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'attendingGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'attendingHeads': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Sum of attending party sizes (null reads as 1).',
          },
          'maybeGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'declinedGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'noResponseGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'checkedInGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'checkedInHeads': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'noShowGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'expectedGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'walkInGuests': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
            'description': 'Checked-in guests with no invite row.',
          },
          'walkInHeads': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 100000,
          },
          'exceptions': <String, Object?>{
            'type': 'object',
            'additionalProperties': false,
            'required': <Object?>[
              'invitedNoResponseGuestIds',
              'declinedCheckedInGuestIds',
              'noShowGuestIds',
              'walkInGuestIds',
            ],
            'properties': <String, Object?>{
              'invitedNoResponseGuestIds': <String, Object?>{
                'type': 'array',
                'maxItems': 5000,
                'items': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'description': 'Invited guests who never responded, sorted.',
              },
              'declinedCheckedInGuestIds': <String, Object?>{
                'type': 'array',
                'maxItems': 5000,
                'items': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'description': 'Declined guests who checked in anyway, sorted.',
              },
              'noShowGuestIds': <String, Object?>{
                'type': 'array',
                'maxItems': 5000,
                'items': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'description': 'Guests marked noShow at the door, sorted.',
              },
              'walkInGuestIds': <String, Object?>{
                'type': 'array',
                'maxItems': 5000,
                'items': <String, Object?>{
                  'type': 'string',
                  'minLength': 1,
                  'maxLength': 180,
                },
                'description': 'Checked-in guests with no invite row, sorted.',
              },
            },
          },
        },
      },
    },
  },
};
