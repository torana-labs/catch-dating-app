// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_rehearsal_milestones.schema.json.

const schemaEventRehearsalMilestoneDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_rehearsal_milestones.schema.json',
  'title': 'EventRehearsalMilestoneDocument',
  'type': 'object',
  'additionalProperties': false,
  'description': 'Durable organizer rehearsal completion, stamped only by a successful completion transaction; not deleted with expiring sessions.',
  'x-firestore-collection': 'eventRehearsalMilestones',
  'x-firestore-path': 'eventRehearsalMilestones/{organizerId}',
  'x-document-id-field': 'organizerId',
  'x-owner': 'event rehearsal completion callable',
  'required': <Object?>[
    'organizerId',
    'completedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'completedAt': <String, Object?>{
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
      'x-catch-ownership': 'callable-owned',
    },
  },
};
