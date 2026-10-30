// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/event_offer_configuration_receipts.schema.json.

const schemaEventOfferConfigurationReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/event_offer_configuration_receipts.schema.json',
  'title': 'EventOfferConfigurationReceiptDocument',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'actorUid',
    'organizerId',
    'requestId',
    'requestHash',
    'appliedPreferencesRevision',
    'createdAt',
    'eventId',
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
    'appliedPreferencesRevision': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 1000000000,
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}\$',
    },
  },
  'x-firestore-collection': 'eventOfferConfigurationReceipts',
  'x-firestore-path': 'eventOfferConfigurationReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'event offer manager operations',
};
