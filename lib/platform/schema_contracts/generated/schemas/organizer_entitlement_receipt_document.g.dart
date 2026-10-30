// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_entitlement_receipts.schema.json.

const schemaOrganizerEntitlementReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_entitlement_receipts.schema.json',
  'title': 'OrganizerEntitlementReceiptDocument',
  'description': 'Idempotency receipt at organizerEntitlementReceipts/{receiptId} for admin entitlement mutations. receiptId is organizerId_operationId; a matching contentHash replays the stored result, a different hash fails closed.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerEntitlementReceipts',
  'x-firestore-path': 'organizerEntitlementReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'organizer entitlement admin callables',
  'required': <Object?>[
    'schemaVersion',
    'receiptId',
    'operationId',
    'organizerId',
    'actorUid',
    'action',
    'contentHash',
    'resultRevision',
    'grantId',
    'createdAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'receiptId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'operationId': <String, Object?>{
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
    'actorUid': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'server-only',
    },
    'action': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'grant',
        'revoke',
      ],
      'x-catch-ownership': 'server-only',
    },
    'contentHash': <String, Object?>{
      'type': 'string',
      'minLength': 16,
      'maxLength': 128,
      'x-catch-ownership': 'server-only',
    },
    'resultRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
    'grantId': <String, Object?>{
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
    'expiresAt': <String, Object?>{
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
      'x-firestore-ttl': true,
      'x-catch-ownership': 'server-only',
    },
  },
};
