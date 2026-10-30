// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callable_responses/commit_organizer_form_admission_response.schema.json.

const schemaCommitOrganizerFormAdmissionCallableResponseSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callable_responses/commit_organizer_form_admission_response.schema.json',
  'title': 'CommitOrganizerFormAdmissionCallableResponse',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'receiptId',
    'organizerId',
    'eventId',
    'responseId',
    'contactId',
    'offerId',
    'attendeeId',
    'canonicalSeatKey',
    'requestId',
    'requestHash',
    'resultingLedgerRevision',
    'admittedAtMillis',
    'seatAlreadyOccupied',
    'replayed',
  ],
  'properties': <String, Object?>{
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'responseId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'offerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'canonicalSeatKey': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'pattern': '^[A-Za-z0-9_-]{1,180}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'resultingLedgerRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'admittedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'seatAlreadyOccupied': <String, Object?>{
      'type': 'boolean',
    },
    'replayed': <String, Object?>{
      'type': 'boolean',
    },
  },
};
