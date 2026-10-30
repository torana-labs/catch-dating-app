// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from callables/commit_organizer_form_admission_payload.schema.json.

const schemaCommitOrganizerFormAdmissionCallablePayloadSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/callables/commit_organizer_form_admission_payload.schema.json',
  'title': 'CommitOrganizerFormAdmissionCallablePayload',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'organizerId',
    'eventId',
    'responseId',
    'contactId',
    'offerId',
    'expectedOfferRevision',
    'expectedOfferGeneration',
    'expectedLedgerRevision',
    'requestId',
  ],
  'properties': <String, Object?>{
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
    'expectedOfferRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'expectedOfferGeneration': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'expectedLedgerRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'minLength': 8,
      'maxLength': 120,
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,119}\$',
    },
  },
};
