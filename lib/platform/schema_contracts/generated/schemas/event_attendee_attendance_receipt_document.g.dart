// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_attendee_attendance_receipts.schema.json.

const schemaEventAttendeeAttendanceReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_attendee_attendance_receipts.schema.json',
  'title': 'EventAttendeeAttendanceReceiptDocument',
  'description': 'Short-lived server-only idempotency receipt for one absolute Host attendance operation.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'eventAttendeeAttendanceReceipts',
  'x-firestore-path': 'eventAttendeeAttendanceReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'setEventAttendeeAttendance callable',
  'required': <Object?>[
    'eventId',
    'organizerId',
    'attendeeId',
    'actorUid',
    'clientOperationId',
    'desiredCheckedIn',
    'priorRevision',
    'acceptedRevision',
    'changed',
    'createdAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{16,120}\$',
    },
    'desiredCheckedIn': <String, Object?>{
      'type': 'boolean',
    },
    'priorRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'acceptedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'changed': <String, Object?>{
      'type': 'boolean',
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
    'expiresAt': <String, Object?>{
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
  },
};
