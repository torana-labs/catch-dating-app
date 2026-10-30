// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/set_event_attendee_attendance_payload.schema.json.

const schemaSetEventAttendeeAttendanceCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/set_event_attendee_attendance_payload.schema.json',
  'title': 'SetEventAttendeeAttendanceCallablePayload',
  'description': 'Absolute, revision-checked Host attendance mutation with an idempotent client operation id.',
  'x-callable-aliases': <Object?>[
    'setEventAttendeeAttendance',
  ],
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'eventId',
    'attendeeId',
    'desiredCheckedIn',
    'expectedRevision',
    'clientOperationId',
  ],
  'properties': <String, Object?>{
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'desiredCheckedIn': <String, Object?>{
      'type': 'boolean',
    },
    'expectedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'clientOperationId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9_-]{16,120}\$',
    },
  },
};
