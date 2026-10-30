// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contact_origins.schema.json.

const schemaOrganizerContactOriginDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contact_origins.schema.json',
  'title': 'OrganizerContactOriginDocument',
  'description': 'Server-owned provenance for one organizer contact source. Source facts are immutable; only currentContactId moves during a receipt-backed merge or unmerge.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContactOrigins',
  'x-firestore-path': 'organizerContactOrigins/{originId}',
  'x-document-id-field': 'originId',
  'x-owner': 'approved organizer contact creators and organizer contact merge callables',
  'required': <Object?>[
    'organizerId',
    'currentContactId',
    'originContactId',
    'sourceKind',
    'sourceEntityKind',
    'sourceEntityId',
    'eventId',
    'formId',
    'responseId',
    'actorClass',
    'actorUid',
    'observedAt',
    'originVersion',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'currentContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'originContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'sourceKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'catchBooking',
        'hostImport',
        'hostManual',
        'webOtp',
        'providerSync',
        'hostForm',
      ],
    },
    'sourceEntityKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'eventAttendee',
        'manualEntry',
        'hostFormResponse',
        'providerRecord',
        'importBatch',
        'webRegistration',
        'hostApplicationResponse',
      ],
    },
    'sourceEntityId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'eventId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'formId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'responseId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'minLength': 1,
          'maxLength': 180,
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
    'actorClass': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'participant',
        'organizerManager',
        'provider',
        'system',
      ],
    },
    'actorUid': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'observedAt': <String, Object?>{
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
    'originVersion': <String, Object?>{
      'type': 'integer',
      'const': 1,
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
  },
};
