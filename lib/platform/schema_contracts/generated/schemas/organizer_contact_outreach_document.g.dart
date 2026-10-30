// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contact_outreach.schema.json.

const schemaOrganizerContactOutreachDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contact_outreach.schema.json',
  'title': 'OrganizerContactOutreachDocument',
  'description': 'Manager-asserted outreach attempt on one organizer contact. Records are append-only through the manager-authorized record callable, appear on the contact timeline, and are excluded from contact exports.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContactOutreach',
  'x-firestore-path': 'organizerContactOutreach/{outreachId}',
  'x-document-id-field': 'outreachId',
  'x-owner': 'manager-only organizer contact outreach callable',
  'required': <Object?>[
    'organizerId',
    'contactId',
    'authorUid',
    'channel',
    'outcome',
    'occurredAt',
    'revision',
    'createdAt',
    'updatedAt',
    'updatedByUid',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'authorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'channel': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'phoneCall',
        'whatsapp',
        'email',
        'sms',
        'inPerson',
        'other',
      ],
      'x-catch-ownership': 'server-only',
    },
    'outcome': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'reached',
        'noAnswer',
        'leftMessage',
        'wrongContact',
        'attempted',
      ],
      'x-catch-ownership': 'server-only',
    },
    'note': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
      'x-catch-ownership': 'server-only',
    },
    'occurredAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
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
      'x-catch-ownership': 'server-only',
    },
    'updatedAt': <String, Object?>{
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
      'x-catch-ownership': 'server-only',
    },
    'updatedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
  },
};
