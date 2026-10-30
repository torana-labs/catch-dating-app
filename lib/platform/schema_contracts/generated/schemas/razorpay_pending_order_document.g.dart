// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/razorpay_pending_orders.schema.json.

const schemaRazorpayPendingOrderDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/razorpay_pending_orders.schema.json',
  'title': 'RazorpayPendingOrderDocument',
  'description': 'Server-owned tracking record for a created-but-not-yet-fulfilled Razorpay order, stored at razorpayPendingOrders/{orderId}. Lets the webhook and reconciliation sweep recover bookings when the client verification callback never lands. Deleted once the matching payments/{paymentId} completed record exists.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'razorpayPendingOrders',
  'x-firestore-path': 'razorpayPendingOrders/{orderId}',
  'x-document-id-field': 'orderId',
  'x-owner': 'payments callables and razorpayWebhook',
  'required': <Object?>[
    'provider',
    'orderId',
    'userId',
    'eventId',
    'amountInPaise',
    'currency',
    'status',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'provider': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'razorpay',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'orderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'x-catch-ownership': 'callable-owned',
    },
    'userId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'amountInPaise': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'callable-owned',
    },
    'currency': <String, Object?>{
      'type': 'string',
      'minLength': 3,
      'maxLength': 3,
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'failed',
        'expired',
      ],
      'description': 'pending until fulfilled (then the doc is deleted); failed when Razorpay reported payment.failed; expired when the reconciliation sweep found no captured payment after the grace window.',
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
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
      'x-catch-ownership': 'callable-owned',
    },
    'razorpayOwnership': <String, Object?>{
      'type': 'object',
      'additionalProperties': false,
      'required': <Object?>[
        'projectId',
        'schema',
      ],
      'properties': <String, Object?>{
        'projectId': <String, Object?>{
          'type': 'string',
          'pattern': '^[a-z][a-z0-9-]{4,28}[a-z0-9]\$',
        },
        'schema': <String, Object?>{
          'type': 'string',
          'const': '1',
        },
      },
      'description': 'Frozen server-origin context for a new native Razorpay booking. Missing legacy context is unresolved, never automatic ownership adoption.',
      'x-catch-ownership': 'server-only',
    },
  },
};
