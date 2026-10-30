// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/sales_privacy_restrictions.schema.json.

const schemaSalesPrivacyRestrictionSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/sales_privacy_restrictions.schema.json',
  'title': 'SalesPrivacyRestriction',
  'description': 'Permanent organizer-scoped private Sales reintroduction fence. Existence blocks reads, writes and receipt replay.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'schemaVersion',
    'classification',
    'organizerId',
    'status',
    'revision',
    'reason',
    'requestId',
    'materialHash',
    'restrictedByUid',
    'restrictedAt',
    'activePlanId',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
    },
    'classification': <String, Object?>{
      'const': 'sales_private',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{0,179}\$',
    },
    'status': <String, Object?>{
      'enum': <Object?>[
        'restricted',
        'processing',
        'internal_processed_with_unresolved',
      ],
    },
    'revision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
    },
    'reason': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 500,
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9._:-]{7,95}\$',
    },
    'materialHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'restrictedByUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
    },
    'restrictedAt': <String, Object?>{
      'type': 'string',
      'format': 'date-time',
    },
    'activePlanId': <String, Object?>{
      'anyOf': <Object?>[
        <String, Object?>{
          'type': 'string',
          'pattern': '^privacy-[a-f0-9]{40}\$',
        },
        <String, Object?>{
          'type': 'null',
        },
      ],
    },
  },
  'x-firestore-collection': 'salesPrivacyRestrictions',
  'x-firestore-path': 'salesPrivacyRestrictions/{id}',
  'x-owner': 'Private Sales privacy lifecycle',
};
