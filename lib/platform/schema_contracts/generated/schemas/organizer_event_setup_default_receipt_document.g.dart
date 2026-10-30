// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_event_setup_default_receipts.schema.json.

const schemaOrganizerEventSetupDefaultReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_event_setup_default_receipts.schema.json',
  'title': 'OrganizerEventSetupDefaultReceiptDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'actorUid',
    'organizerId',
    'requestId',
    'requestHash',
    'appliedRevision',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'actorUid': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'organizerId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
    'requestId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{7,127}\$',
    },
    'requestHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'appliedRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
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
  'x-firestore-collection': 'organizerEventSetupDefaultReceipts',
  'x-firestore-path': 'organizerEventSetupDefaultReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'organizer event setup manager operations',
};
