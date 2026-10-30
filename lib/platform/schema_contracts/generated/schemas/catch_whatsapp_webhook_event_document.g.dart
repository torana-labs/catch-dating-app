// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/catch_whatsapp_webhook_events.schema.json.

const schemaCatchWhatsappWebhookEventDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/catch_whatsapp_webhook_events.schema.json',
  'title': 'CatchWhatsappWebhookEventDocument',
  'description': 'Private immutable Catch-owned incoming message and status receipts. Exact configured WABA and sender binding, no organizer authority, no outgoing action. Bounded text expires after 30 days. Status facts remain individual events rather than an arrival-ordered delivery projection.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'catchWhatsappWebhookEvents',
  'x-firestore-path': 'catchWhatsappWebhookEvents/{eventId}',
  'x-document-id-field': 'eventId',
  'x-owner': 'Catch WhatsApp webhook ingress',
  'required': <Object?>[
    'schema',
    'eventId',
    'wabaId',
    'phoneNumberId',
    'payloadHash',
    'eventKind',
    'messageId',
    'providerTimestampSeconds',
    'participantId',
    'messageType',
    'text',
    'textTruncated',
    'deliveryStatus',
    'errorCodes',
    'receivedAtMillis',
    'expiresAt',
  ],
  'properties': <String, Object?>{
    'schema': <String, Object?>{
      'const': 'catch.whatsapp-webhook-event/v1',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'pattern': '^cwhe_[a-f0-9]{64}\$',
    },
    'wabaId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{1,32}\$',
    },
    'phoneNumberId': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{1,32}\$',
    },
    'payloadHash': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'eventKind': <String, Object?>{
      'enum': <Object?>[
        'inbound',
        'status',
      ],
    },
    'messageId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'providerTimestampSeconds': <String, Object?>{
      'type': 'string',
      'pattern': '^[0-9]{1,12}\$',
    },
    'participantId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'messageType': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 240,
    },
    'text': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 4096,
    },
    'textTruncated': <String, Object?>{
      'type': 'boolean',
    },
    'deliveryStatus': <String, Object?>{
      'enum': <Object?>[
        null,
        'sent',
        'delivered',
        'read',
        'failed',
      ],
    },
    'errorCodes': <String, Object?>{
      'type': 'array',
      'maxItems': 10,
      'items': <String, Object?>{
        'type': 'integer',
        'minimum': 0,
        'maximum': 999999999,
      },
    },
    'receivedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
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
    },
  },
  'allOf': <Object?>[
    <String, Object?>{
      'if': <String, Object?>{
        'properties': <String, Object?>{
          'eventKind': <String, Object?>{
            'const': 'inbound',
          },
        },
      },
      'then': <String, Object?>{
        'properties': <String, Object?>{
          'deliveryStatus': <String, Object?>{
            'type': 'null',
          },
          'errorCodes': <String, Object?>{
            'maxItems': 0,
          },
          'messageType': <String, Object?>{
            'type': 'string',
          },
        },
      },
      'else': <String, Object?>{
        'properties': <String, Object?>{
          'deliveryStatus': <String, Object?>{
            'enum': <Object?>[
              'sent',
              'delivered',
              'read',
              'failed',
            ],
          },
          'messageType': <String, Object?>{
            'type': 'null',
          },
          'text': <String, Object?>{
            'type': 'null',
          },
          'textTruncated': <String, Object?>{
            'const': false,
          },
        },
      },
    },
  ],
};
