// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from embedded/legacy_payment_refund.schema.json.

const schemaLegacyPaymentRefundIntentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/embedded/legacy_payment_refund.schema.json',
  'title': 'LegacyPaymentRefundIntent',
  'description': 'Frozen native cancellation or failed-booking refund authority. Provider success is distinct from submission; guest refund may be upgraded by host cancellation.',
  'type': 'object',
  'additionalProperties': false,
  'required': <Object?>[
    'version',
    'reason',
    'state',
    'targetAmountMinor',
    'confirmedAmountMinor',
    'paymentFingerprint',
    'provider',
    'providerPaymentId',
    'orderId',
    'currency',
    'stripeAccountId',
    'refundApplicationFee',
    'requestedAtMillis',
    'nextAttemptAtMillis',
    'leaseUntilMillis',
    'attempts',
    'lastErrorCode',
  ],
  'properties': <String, Object?>{
    'version': <String, Object?>{
      'const': 1,
      'type': 'integer',
    },
    'reason': <String, Object?>{
      'enum': <Object?>[
        'guestCancelled',
        'eventCancelled',
        'bookingFailed',
      ],
      'type': 'string',
    },
    'state': <String, Object?>{
      'enum': <Object?>[
        'pending',
        'complete',
        'reviewRequired',
      ],
      'type': 'string',
    },
    'targetAmountMinor': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
    },
    'confirmedAmountMinor': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
    },
    'paymentFingerprint': <String, Object?>{
      'type': 'string',
      'pattern': '^[a-f0-9]{64}\$',
    },
    'provider': <String, Object?>{
      'enum': <Object?>[
        'razorpay',
        'stripe',
      ],
      'type': 'string',
    },
    'providerPaymentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'orderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
    },
    'currency': <String, Object?>{
      'type': 'string',
      'pattern': '^[A-Z]{3}\$',
    },
    'stripeAccountId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
    },
    'refundApplicationFee': <String, Object?>{
      'type': 'boolean',
    },
    'requestedAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'nextAttemptAtMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'leaseUntilMillis': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 9007199254740991,
    },
    'attempts': <String, Object?>{
      'type': 'array',
      'maxItems': 2,
      'items': <String, Object?>{
        'type': 'object',
        'additionalProperties': false,
        'required': <Object?>[
          'amountMinor',
          'idempotencyKey',
          'providerRefundId',
          'state',
          'startedAtMillis',
        ],
        'properties': <String, Object?>{
          'amountMinor': <String, Object?>{
            'type': 'integer',
            'minimum': 1,
            'maximum': 100000000,
          },
          'idempotencyKey': <String, Object?>{
            'type': 'string',
            'pattern': '^[A-Za-z0-9_-]{10,100}\$',
          },
          'providerRefundId': <String, Object?>{
            'type': <Object?>[
              'string',
              'null',
            ],
            'maxLength': 240,
          },
          'state': <String, Object?>{
            'enum': <Object?>[
              'pending',
              'processed',
              'failed',
            ],
            'type': 'string',
          },
          'startedAtMillis': <String, Object?>{
            'type': 'integer',
            'minimum': 0,
            'maximum': 9007199254740991,
          },
        },
      },
    },
    'lastErrorCode': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 80,
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
