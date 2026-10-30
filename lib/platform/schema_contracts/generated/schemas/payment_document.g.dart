// GENERATED CODE - DO NOT MODIFY BY HAND.
// Regenerate with: node tool/contracts/generate_schema_contracts.mjs
// ignore_for_file: constant_identifier_names, use_null_aware_elements

// JSON Schema constant emitted from firestore/payments.schema.json.

const schemaPaymentDocumentSchema = <String, Object?>{
  '\$schema': 'http://json-schema.org/draft-07/schema#',
  '\$id': 'https://catch.app/contracts/firestore/payments.schema.json',
  'title': 'PaymentDocument',
  'description': 'Canonical payment record stored at payments/{paymentId}.',
  'type': 'object',
  'additionalProperties': false,
  'x-firestore-collection': 'payments',
  'x-firestore-path': 'payments/{paymentId}',
  'x-document-id-field': 'id',
  'x-owner': 'payments callables',
  'x-internal-demo-fields': <Object?>[
    'synthetic',
    'seedPrefix',
    'scenario',
    'demoOps',
    'demoOpsId',
    'demoOpsCommand',
  ],
  'required': <Object?>[
    'userId',
    'orderId',
    'paymentId',
    'eventId',
    'amount',
    'currency',
    'status',
    'signUpFailed',
    'createdAt',
  ],
  'properties': <String, Object?>{
    'userId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'orderId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'x-catch-ownership': 'callable-owned',
    },
    'paymentId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 240,
      'x-catch-ownership': 'callable-owned',
    },
    'eventId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'amount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'callable-owned',
    },
    'amountMinor': <String, Object?>{
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
    'provider': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'razorpay',
        'stripe',
      ],
      'x-catch-ownership': 'callable-owned',
    },
    'status': <String, Object?>{
      'type': 'string',
      'enum': <Object?>[
        'pending',
        'completed',
        'failed',
        'refunded',
        'refundFailed',
      ],
      'description': 'refundFailed marks rejected admission with an unresolved refund. New records use cancellationRefund.state for pending versus reviewRequired; historical records without that intent need manual reconciliation. Only an observed full refund becomes refunded.',
      'x-catch-ownership': 'callable-owned',
    },
    'providerPaymentId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
      'x-catch-ownership': 'callable-owned',
    },
    'checkoutSessionId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 240,
      'x-catch-ownership': 'callable-owned',
    },
    'hostUserId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'x-catch-ownership': 'callable-owned',
    },
    'stripeAccountId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'maxLength': 120,
      'x-catch-ownership': 'callable-owned',
    },
    'applicationFeeAmount': <String, Object?>{
      'type': 'integer',
      'minimum': 0,
      'maximum': 100000000,
      'x-catch-ownership': 'callable-owned',
    },
    'inviteLinkId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Named host invite link attributed to this payment, when present.',
      'x-catch-ownership': 'callable-owned',
    },
    'inviteSource': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 80,
      'description': 'Host-facing invite source copied from eventInviteLinks.',
      'x-catch-ownership': 'callable-owned',
    },
    'crossPathsPairHoldId': <String, Object?>{
      'type': <Object?>[
        'string',
        'null',
      ],
      'minLength': 1,
      'maxLength': 180,
      'description': 'Pair hold consumed by this booking, when present.',
      'x-catch-ownership': 'callable-owned',
    },
    'signUpFailed': <String, Object?>{
      'type': 'boolean',
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
    'completedAt': <String, Object?>{
      'type': 'object',
      'description': 'Authoritative completion time for a successful payment. Older completed records may omit it and fall back to createdAt.',
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
    'synthetic': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo seed marker used for cleanup and diagnostics.',
    },
    'seedPrefix': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed prefix used for cleanup and diagnostics.',
    },
    'scenario': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 120,
      'description': 'Internal demo seed scenario name used for cleanup and diagnostics.',
    },
    'demoOps': <String, Object?>{
      'type': 'boolean',
      'description': 'Internal demo-operations marker used for cleanup and diagnostics.',
    },
    'demoOpsId': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 180,
      'description': 'Internal demo-operations id used for cleanup and diagnostics.',
    },
    'demoOpsCommand': <String, Object?>{
      'type': 'string',
      'minLength': 1,
      'maxLength': 80,
      'description': 'Internal demo-operations command name used for cleanup and diagnostics.',
    },
    'cancellationRefund': <String, Object?>{
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
