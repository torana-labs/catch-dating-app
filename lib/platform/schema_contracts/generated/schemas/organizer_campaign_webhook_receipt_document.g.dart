// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/organizer_campaign_webhook_receipts.schema.json.

const schemaOrganizerCampaignWebhookReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/organizer_campaign_webhook_receipts.schema.json',
  'title': 'OrganizerCampaignWebhookReceiptDocument',
  'description': 'TTL idempotency receipt for one authenticated provider webhook event.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'organizerCampaignWebhookReceipts',
  'x-firestore-path': 'organizerCampaignWebhookReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'WhatsApp provider webhook',
  'required': <Object?>[
    'provider',
    'providerEventId',
    'organizerId',
    'connectionId',
    'eventKind',
    'payloadHash',
    'createdAt',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'provider': <String, Object?>{
      'const': 'metaCloudApi',
    },
    'providerEventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'organizerId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'connectionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
    },
    'eventKind': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'status',
        'inbound',
        'template',
        'quality',
        'account',
        'unmatched',
      ],
    },
    'payloadHash': <String, Object?>{
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
    },
  },
};
