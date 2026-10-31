// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_host_claims.schema.json.

const schemaOrganizerHostClaimDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/club_host_claims.schema.json',
  'title': 'OrganizerHostClaimDocument',
  'description': 'Server-owned singleton claim stored at organizerHostClaims/{uid} to enforce one hosted club per user.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerHostClaims',
  'x-firestore-path': 'organizerHostClaims/{uid}',
  'x-document-id-field': 'uid',
  'x-owner': 'createOrganizer callable',
  'required': <Object?>[
    'uid',
    'organizerId',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'uid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
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
  },
};
