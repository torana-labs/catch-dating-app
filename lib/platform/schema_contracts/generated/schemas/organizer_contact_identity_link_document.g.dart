// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contact_identity_links.schema.json.

const schemaOrganizerContactIdentityLinkDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contact_identity_links.schema.json',
  'title': 'OrganizerContactIdentityLinkDocument',
  'description': 'Server-only identity evidence edge used for keyed candidate lookup. Hashes are restricted identifiers, not anonymous data.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContactIdentityLinks',
  'x-firestore-path': 'organizerContactIdentityLinks/{identityLinkId}',
  'x-document-id-field': 'identityLinkId',
  'x-owner': 'organizer audience identity resolver',
  'required': <Object?>[
    'organizerId',
    'contactId',
    'originContactId',
    'attendeeId',
    'kind',
    'identityHash',
    'hashVersion',
    'confidence',
    'source',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'contactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'originContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'attendeeId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Legacy evidence-row key: an attendee id for roster sources or a deterministic form-response key for Host Forms.',
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'uid',
        'phone',
        'email',
        'provider',
      ],
    },
    'identityHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'hashVersion': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'hmac-sha256-v1',
      ],
    },
    'confidence': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'proposed',
        'verified',
      ],
    },
    'source': <String, Object?>{
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
    },
  },
};
