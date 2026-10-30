// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/host_membership_webhook_receipts.schema.json.

const schemaHostMembershipWebhookReceiptDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/host_membership_webhook_receipts.schema.json',
  'title': 'HostMembershipWebhookReceiptDocument',
  'description': 'Server-only create-once dedupe receipt for one verified membership provider webhook delivery. Stores ids and outcome only, never the raw payload.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'hostMembershipWebhookReceipts',
  'x-firestore-path': 'hostMembershipWebhookReceipts/{receiptId}',
  'x-document-id-field': 'receiptId',
  'x-owner': 'hostMembershipRazorpayWebhook',
  'required': <Object?>[
    'schemaVersion',
    'provider',
    'providerEventId',
    'eventType',
    'subscriptionId',
    'paymentId',
    'outcome',
    'receivedAtMillis',
  ],
  'properties': <String, Object?>{
    'schemaVersion': <String, Object?>{
      'const': 1,
      'x-catch-ownership': 'server-only',
    },
    'provider': <String, Object?>{
      'enum': <Object?>[
        'razorpay',
      ],
      'x-catch-ownership': 'server-only',
    },
    'providerEventId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'x-catch-ownership': 'server-only',
    },
    'eventType': <String, Object?>{
      'type': 'string',
      'maxLength': 80,
      'x-catch-ownership': 'server-only',
    },
    'subscriptionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 60,
      'x-catch-ownership': 'server-only',
    },
    'paymentId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 60,
      'x-catch-ownership': 'server-only',
    },
    'outcome': <String, Object?>{
      'enum': <Object?>[
        'applied',
        'ignored',
        'stale',
      ],
      'x-catch-ownership': 'server-only',
    },
    'receivedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 1,
      'maximum': 9007199254740991,
      'x-catch-ownership': 'server-only',
    },
  },
};
