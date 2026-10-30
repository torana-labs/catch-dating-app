// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_schedule_locks.schema.json.

const schemaOrganizerScheduleLockDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_schedule_locks.schema.json',
  'title': 'OrganizerScheduleLockDocument',
  'description': 'Server-owned time-slot claim stored at organizerScheduleLocks/{organizerId_slot}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerScheduleLocks',
  'x-firestore-path': 'organizerScheduleLocks/{lockId}',
  'x-document-id-field': 'lockId',
  'x-owner': 'event schedule conflict callables',
  'required': <Object?>[
    'ownerType',
    'ownerId',
    'slot',
    'eventId',
    'organizerId',
    'startTimeMillis',
    'endTimeMillis',
  ],
  'properties': <String, Object?>{
    'ownerType': <String, Object?>{
      'type': 'string',
      'const': 'organizer',
      'x-catch-ownership': 'callable-owned',
    },
    'ownerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'slot': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'startTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
    'endTimeMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'x-catch-ownership': 'callable-owned',
    },
  },
};
