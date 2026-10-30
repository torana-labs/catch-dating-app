// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_contact_identity_claims.schema.json.

const schemaOrganizerContactIdentityClaimDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_contact_identity_claims.schema.json',
  'title': 'OrganizerContactIdentityClaimDocument',
  'description': 'Singleton organizer-scoped ownership claim for a person-verified UID or phone identity.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerContactIdentityClaims',
  'x-firestore-path': 'organizerContactIdentityClaims/{identityClaimId}',
  'x-document-id-field': 'identityClaimId',
  'x-owner': 'organizer audience identity resolver and merge operations',
  'required': <Object?>[
    'organizerId',
    'kind',
    'identityHash',
    'hashVersion',
    'verifiedContactId',
    'originVerifiedContactId',
    'state',
    'conflictingContactIds',
    'revision',
    'createdAt',
    'updatedAt',
  ],
  'properties': <String, Object?>{
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'kind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'uid',
        'phone',
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
    'verifiedContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'originVerifiedContactId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
    },
    'state': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'verified',
        'conflicted',
      ],
    },
    'conflictingContactIds': <String, Object?>{
      'type': 'array',
      'maxItems': 20,
      'uniqueItems': true,
      'items': <String, Object?>{
        'type': 'string',
        'minLength': 1,
        'maxLength': 180,
      },
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
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
